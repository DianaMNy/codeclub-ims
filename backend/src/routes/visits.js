// src/routes/visits.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { validate } = require('../middleware/validate');
const { createObservationSchema, updateObservationSchema } = require('../schemas/observationSchemas');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, mentor_id } = req.user;
    const isAdmin = role === 'admin' || role === 'programme_coordinator';
    const whereClause = isAdmin ? '' : 'WHERE so.mentor_id = $1';
    const roleParams = isAdmin ? [] : [mentor_id];

    // page defaults to 1, limit defaults to 50 and is clamped to 100 — any
    // missing/non-numeric/out-of-range value just falls back to the default
    // rather than erroring, so existing callers that pass nothing still work.
    let page = parseInt(req.query.page, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isInteger(limit) || limit < 1) limit = 50;
    if (limit > 100) limit = 100;
    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT so.*, sc.official_name AS school_name, sc.club_id, sc.county, sc.type AS school_type,
             m.full_name AS mentor_name, p.label AS pathway_name, p.icon AS pathway_icon
      FROM session_observations so
      LEFT JOIN schools_and_centres sc ON so.school_id = sc.id
      LEFT JOIN mentors m ON so.mentor_id = m.id
      LEFT JOIN pathways p ON so.pathway_id = p.id
      ${whereClause}
      ORDER BY so.date_of_visit DESC
      LIMIT $${roleParams.length + 1} OFFSET $${roleParams.length + 2}
    `;

    // Stats are computed independently of LIMIT/OFFSET (same WHERE scope as
    // the page query) so the M&E dashboard's stat cards stay accurate no
    // matter which page is showing — MandE.jsx used to compute these by
    // filtering the full (unpaginated) array client-side.
    const statsQuery = `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE so.engagement_type = 'Physical Visit') AS physical_visits,
        COUNT(*) FILTER (WHERE so.club_running IS TRUE) AS club_running_count,
        COUNT(*) FILTER (WHERE so.flag_school IS TRUE OR so.club_running IS NOT TRUE) AS flagged_count,
        COALESCE(SUM(so.total_learners), 0) AS total_learners
      FROM session_observations so
      ${whereClause}
    `;

    const [dataResult, statsResult] = await Promise.all([
      pool.query(dataQuery, [...roleParams, limit, offset]),
      pool.query(statsQuery, roleParams),
    ]);

    const total = parseInt(statsResult.rows[0].total, 10);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      data: dataResult.rows,
      page,
      limit,
      total,
      totalPages,
      stats: {
        totalVisits: total,
        physicalVisits: parseInt(statsResult.rows[0].physical_visits, 10),
        clubRunning: parseInt(statsResult.rows[0].club_running_count, 10),
        flagged: parseInt(statsResult.rows[0].flagged_count, 10),
        totalLearners: parseInt(statsResult.rows[0].total_learners, 10),
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/school/:schoolId', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT so.*, m.full_name AS mentor_name, p.label AS pathway_name, p.icon AS pathway_icon FROM session_observations so LEFT JOIN mentors m ON so.mentor_id = m.id LEFT JOIN pathways p ON so.pathway_id = p.id WHERE so.school_id = $1 ORDER BY so.visit_number ASC`, [req.params.schoolId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/my-schools', requireAuth, async (req, res) => {
  try {
    const { mentor_id, role } = req.user;
    let result;
    if (role === 'admin' || role === 'programme_coordinator') {
      result = await pool.query(`SELECT id, official_name, club_id, county, type, status, learner_count FROM schools_and_centres ORDER BY county, official_name`);
    } else {
      result = await pool.query(`SELECT id, official_name, club_id, county, type, status, learner_count FROM schools_and_centres WHERE mentor_id = $1 ORDER BY official_name`, [mentor_id]);
    }
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Pathways with parsed levels and projects from JSON columns
router.get('/pathways-with-projects', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, label AS name, key, icon, color, levels, projects FROM pathways ORDER BY label`);
    const pathways = result.rows.map(p => {
      let levelsArr = [];
      if (p.levels) {
        const lvl = typeof p.levels === 'string' ? JSON.parse(p.levels) : p.levels;
        const labelMap = { l1:'Level 1', l2:'Level 2', l3:'Level 3', optional_1:'Optional Module 1', optional_2:'Optional Module 2', optional_3:'Optional Module 3' };
        levelsArr = Object.entries(lvl).map(([k, v]) => ({ key: k, label: labelMap[k]||k, name: v }));
      }
      let projectsArr = [];
      if (p.projects) {
        const proj = typeof p.projects === 'string' ? JSON.parse(p.projects) : p.projects;
        projectsArr = Array.isArray(proj) ? proj.map((name, i) => ({ id: `${p.key}_${i}`, name })) : [];
      }
      return { ...p, levelsArr, projectsArr };
    });
    res.json(pathways);
  } catch (err) {
    console.error('Pathways error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, validate(createObservationSchema), async (req, res) => {
  const { mentor_id: tokenMentorId, role } = req.user;
  try {
    const { school_id, mentor_id, teacher_id, date_of_visit, is_first_visit, engagement_type, latitude, longitude, gps_raw, club_running, not_running_reason, activation_actions, club_day, time_band, device_count, total_learners, male_learners, female_learners, engagement_rating, pathway_id, scratch_level, creating_projects, project_id, project_notes, showcase_photo, showcase_status, observations, phone_call_notes, challenges, club_leader_confidence, actions_agreed, recommended_star_club, star_club_reason, flag_school, flag_reason, next_visit_date, other_details } = req.body;
    const mentorId = (role === 'admin' || role === 'programme_coordinator') ? req.body.mentor_id || tokenMentorId : tokenMentorId;
    const visitCount = await pool.query('SELECT COUNT(*) FROM session_observations WHERE school_id = $1', [school_id]);
    const visit_number = parseInt(visitCount.rows[0].count) + 1;
    const result = await pool.query(`INSERT INTO session_observations (school_id, mentor_id, teacher_id, visit_number, is_first_visit, date_of_visit, engagement_type, latitude, longitude, gps_raw, club_running, not_running_reason, activation_actions, club_day, time_band, device_count, total_learners, male_learners, female_learners, engagement_rating, pathway_id, scratch_level, creating_projects, project_id, project_notes, observations, phone_call_notes, challenges, club_leader_confidence, actions_agreed, recommended_star_club, star_club_reason, flag_school, flag_reason, next_visit_date, other_details) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36) RETURNING *`,
      [school_id, mentorId, teacher_id||null, visit_number, is_first_visit||false, date_of_visit, engagement_type, latitude||null, longitude||null, gps_raw||null, club_running??true, not_running_reason||null, activation_actions||null, club_day||null, time_band||null, device_count||0, total_learners||0, male_learners||0, female_learners||0, engagement_rating||null, pathway_id||null, scratch_level||null, creating_projects||false, project_id||null, project_notes||null, observations||null, phone_call_notes||null, challenges||null, club_leader_confidence||null, actions_agreed||null, recommended_star_club||false, star_club_reason||null, flag_school||false, flag_reason||null, next_visit_date||null, other_details||null]);
    // STEP A — Auto-populate FLAGS
    if (flag_school === true || flag_school === 'true') {
      try {
        await pool.query(
          `INSERT INTO flags
             (school_id, mentor_id, flag_type, reason, status, escalation_level, flagged_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            school_id,
            mentor_id || null,
            'mentor_initiated',
            flag_reason || 'Flagged during M&E visit',
            'open',
            1,
          ]
        );
        console.log('Flag auto-populate success for school:', school_id);
      } catch (err) {
        console.error('Flag auto-populate error:', err.message);
      }
    }

    // STEP B — Auto-populate STAR CLUB
    if (recommended_star_club) {
      try {
        await pool.query(
          `INSERT INTO star_club_evaluations
             (school_id, mentor_id, evaluation_name, evaluator_comments,
              recognition_level, overall_score, follow_up_needed, evaluation_date)
           VALUES ($1, $2, 'M&E Nomination', $3, 'nominated', 0, false, $4)`,
          [school_id, mentorId, star_club_reason || null, date_of_visit || new Date().toISOString().split('T')[0]]
        );
      } catch (err) { console.error('Star club auto-populate error:', err.message); }
    }

    // STEP C — Auto-populate PATHWAY PROGRESS
    if (pathway_id) {
      try {
        const pathwayResult = await pool.query(
          'SELECT label FROM pathways WHERE id = $1',
          [pathway_id]
        );
        const pathwayLabel = pathwayResult.rows[0]?.label?.trim().toLowerCase();

        // Map pathway labels to allowed constraint values
        const pathwayMap = {
          'scratch fundamentals': 'scratch',
          'scratch': 'scratch',
          'web design': 'web_design',
          'web_design': 'web_design',
          'python basics': 'python',
          'python': 'python',
          'physical computing': 'physical_computing',
          'physical_computing': 'physical_computing',
          'digital citizenship': 'digital_citizenship',
          'digital_citizenship': 'digital_citizenship',
          'game design': 'game_design',
          'game design ': 'game_design',
          'game_design': 'game_design',
          'ai & machine learning': 'ai_ml',
          'ai_ml': 'ai_ml',
        };

        const pathwayCode = pathwayMap[pathwayLabel];

        if (pathwayCode) {
          const isCompleted = showcase_status === 'completed';
          await pool.query(
            `INSERT INTO pathway_progress
               (school_id, teacher_id, pathway, completed, date_recorded, started_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT DO NOTHING`,
            [school_id, teacher_id || null, pathwayCode,
             isCompleted, date_of_visit || new Date().toISOString().split('T')[0]]
          );
          console.log('Pathway progress updated:', pathwayCode, 'completed:', isCompleted);
        } else {
          console.error('Pathway mapping not found for label:', pathwayLabel);
        }
      } catch (err) {
        console.error('Pathway auto-populate error:', err.message);
      }
    }
    if (creating_projects && project_id) {
      try {
        await pool.query(`
          INSERT INTO project_submissions
            (school_id, pathway_id, project_name, scratch_level,
             photo_url, notes, status, mentor_id,
             school_name_snapshot, county_snapshot, pathway_name_snapshot)
          SELECT
            $1, $2, $3, $4, $5, $6, $7, $8,
            sc.official_name, sc.county, p.label
          FROM schools_and_centres sc, pathways p
          WHERE sc.id = $1 AND p.id = $2
        `, [
          school_id,
          pathway_id,
          project_id,
          scratch_level || null,
          showcase_photo || null,
          project_notes || null,
          showcase_status || 'in_progress',
          mentorId,
        ]);
      } catch(e) { console.log('Showcase insert note:', e.message); }
    }
    await logAudit(req, 'CREATE', 'session_observations', result.rows[0].id, `Created visit record in session_observations`);
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error('Create visit:', err.message); res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAuth, validate(updateObservationSchema), async (req, res) => {
  try {
    const { date_of_visit, engagement_type, latitude, longitude, gps_raw, club_running, not_running_reason, activation_actions, club_day, time_band, device_count, total_learners, male_learners, female_learners, engagement_rating, pathway_id, scratch_level, creating_projects, project_id, project_notes, observations, phone_call_notes, challenges, club_leader_confidence, actions_agreed, recommended_star_club, star_club_reason, flag_school, flag_reason, next_visit_date, other_details } = req.body;
    const result = await pool.query(`UPDATE session_observations SET date_of_visit=$1, engagement_type=$2, latitude=$3, longitude=$4, gps_raw=$5, club_running=$6, not_running_reason=$7, activation_actions=$8, club_day=$9, time_band=$10, device_count=$11, total_learners=$12, male_learners=$13, female_learners=$14, engagement_rating=$15, pathway_id=$16, scratch_level=$17, creating_projects=$18, project_id=$19, project_notes=$20, observations=$21, phone_call_notes=$22, challenges=$23, club_leader_confidence=$24, actions_agreed=$25, recommended_star_club=$26, star_club_reason=$27, flag_school=$28, flag_reason=$29, next_visit_date=$30, other_details=$31 WHERE id=$32 RETURNING *`,
      [date_of_visit, engagement_type, latitude||null, longitude||null, gps_raw||null, club_running??true, not_running_reason||null, activation_actions||null, club_day||null, time_band||null, device_count||0, total_learners||0, male_learners||0, female_learners||0, engagement_rating||null, pathway_id||null, scratch_level||null, creating_projects||false, project_id||null, project_notes||null, observations||null, phone_call_notes||null, challenges||null, club_leader_confidence||null, actions_agreed||null, recommended_star_club||false, star_club_reason||null, flag_school||false, flag_reason||null, next_visit_date||null, other_details||null, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    await logAudit(req, 'UPDATE', 'session_observations', req.params.id, `Updated record ${req.params.id} in session_observations`);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM session_observations WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    await logAudit(req, 'DELETE', 'session_observations', req.params.id, `Deleted record ${req.params.id} from session_observations`);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;