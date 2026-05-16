// src/routes/visits.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

const normaliseLevelReached = (level) => {
  const value = String(level || '').toLowerCase().trim().replace(/_/g, ' ');
  const levelMap = {
    l1: 'l1',
    'level 1': 'l1',
    l2: 'l2',
    'level 2': 'l2',
    l3: 'l3',
    'level 3': 'l3',
    'optional 1': 'optional_1',
    'optional module 1': 'optional_1',
    optional_1: 'optional_1',
    'optional 2': 'optional_2',
    'optional module 2': 'optional_2',
    optional_2: 'optional_2',
    'optional 3': 'optional_3',
    'optional module 3': 'optional_3',
    optional_3: 'optional_3',
  };
  return levelMap[value] || level || 'l1';
};

const resolvePathway = async (pathwayId) => {
  if (!pathwayId) return null;
  const result = await pool.query(
    `SELECT id, key, label FROM pathways WHERE id::text = $1 OR key = $1 LIMIT 1`,
    [String(pathwayId)]
  );
  return result.rows[0] || null;
};

const syncSchoolFromVisit = async ({ school_id, club_running, total_learners }) => {
  if (!school_id) return;

  const updates = [];
  const params = [school_id];
  const learnerCount = parseInt(total_learners, 10);

  if (club_running === true) {
    updates.push(`status = 'active'`);
  }

  if (Number.isFinite(learnerCount) && learnerCount > 0) {
    params.push(learnerCount);
    updates.push(`learner_count = GREATEST(COALESCE(learner_count, 0), $${params.length})`);
  }

  if (updates.length === 0) return;
  await pool.query(`UPDATE schools_and_centres SET ${updates.join(', ')} WHERE id = $1`, params);
};

const syncPathwayProgress = async ({ school_id, teacher_id, pathway, pathway_id, scratch_level, date_of_visit }) => {
  if (!school_id || !scratch_level || (!pathway && !pathway_id)) return;

  const resolved = pathway ? null : await resolvePathway(pathway_id);
  const pathwayKey = pathway || resolved?.key || String(pathway_id);
  const levelReached = normaliseLevelReached(scratch_level);

  await pool.query(
    `INSERT INTO pathway_progress
      (school_id, teacher_id, pathway, level_reached, completed, date_recorded)
     VALUES ($1,$2,$3,$4,false,$5)
     ON CONFLICT DO NOTHING`,
    [school_id, teacher_id || null, pathwayKey, levelReached, date_of_visit || null]
  );
};

const syncStarClubNomination = async ({ school_id, mentorId, star_club_reason, date_of_visit }) => {
  if (!school_id) return;
  const comments = star_club_reason || 'Recommended via session observation';
  try {
    await pool.query(
      `INSERT INTO star_club_evaluations
        (school_id, mentor_id, evaluation_name, evaluation_date, criteria_met,
         overall_score, recognition_level, evaluator_comments, follow_up_needed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false)`,
      [
        school_id,
        mentorId || null,
        'M&E Star Club nomination',
        date_of_visit || null,
        0,
        0,
        'nominated',
        comments,
      ]
    );
  } catch (err) {
    await pool.query(
      `INSERT INTO star_club_evaluations
        (school_id, mentor_id, recommended, reason, date_recorded)
       VALUES ($1,$2,true,$3,$4)`,
      [school_id, mentorId || null, comments, date_of_visit || null]
    );
  }
};

router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, mentor_id } = req.user;
    let query, params;
    if (role === 'admin' || role === 'programme_coordinator') {
      query = `SELECT so.*, sc.official_name AS school_name, sc.club_id, sc.county, sc.type AS school_type, m.full_name AS mentor_name, p.label AS pathway_name, p.icon AS pathway_icon FROM session_observations so LEFT JOIN schools_and_centres sc ON so.school_id = sc.id LEFT JOIN mentors m ON so.mentor_id = m.id LEFT JOIN pathways p ON so.pathway_id::text = p.id::text OR so.pathway_id::text = p.key ORDER BY so.date_of_visit DESC`;
      params = [];
    } else {
      query = `SELECT so.*, sc.official_name AS school_name, sc.club_id, sc.county, sc.type AS school_type, m.full_name AS mentor_name, p.label AS pathway_name, p.icon AS pathway_icon FROM session_observations so LEFT JOIN schools_and_centres sc ON so.school_id = sc.id LEFT JOIN mentors m ON so.mentor_id = m.id LEFT JOIN pathways p ON so.pathway_id::text = p.id::text OR so.pathway_id::text = p.key WHERE so.mentor_id = $1 ORDER BY so.date_of_visit DESC`;
      params = [mentor_id];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/school/:schoolId', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT so.*, m.full_name AS mentor_name, p.label AS pathway_name, p.icon AS pathway_icon FROM session_observations so LEFT JOIN mentors m ON so.mentor_id = m.id LEFT JOIN pathways p ON so.pathway_id::text = p.id::text OR so.pathway_id::text = p.key WHERE so.school_id = $1 ORDER BY so.visit_number ASC`, [req.params.schoolId]);
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
    const result = await pool.query(`SELECT id, label, label AS name, key, icon, color, levels, projects FROM pathways ORDER BY label`);
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

router.post('/', requireAuth, async (req, res) => {
  const { mentor_id: tokenMentorId, role } = req.user;
  try {
    const { school_id, teacher_id, date_of_visit, is_first_visit, engagement_type, latitude, longitude, gps_raw, club_running, not_running_reason, activation_actions, club_day, time_band, device_count, total_learners, male_learners, female_learners, engagement_rating, pathway_id, scratch_level, creating_projects, project_id, project_notes, observations, phone_call_notes, challenges, club_leader_confidence, actions_agreed, recommended_star_club, star_club_reason, flag_school, flag_reason, next_visit_date, other_details } = req.body;
    const mentorId = (role === 'admin' || role === 'programme_coordinator') ? req.body.mentor_id || tokenMentorId : tokenMentorId;
    const resolvedPathway = await resolvePathway(pathway_id);
    const observationPathwayId = resolvedPathway?.id || null;
    const visitCount = await pool.query('SELECT COUNT(*) FROM session_observations WHERE school_id = $1', [school_id]);
    const visit_number = parseInt(visitCount.rows[0].count) + 1;
    const result = await pool.query(`INSERT INTO session_observations (school_id, mentor_id, visit_number, is_first_visit, date_of_visit, engagement_type, latitude, longitude, gps_raw, club_running, not_running_reason, activation_actions, club_day, time_band, device_count, total_learners, male_learners, female_learners, engagement_rating, pathway_id, scratch_level, creating_projects, project_id, project_notes, observations, phone_call_notes, challenges, club_leader_confidence, actions_agreed, recommended_star_club, star_club_reason, flag_school, flag_reason, next_visit_date, other_details) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35) RETURNING *`,
      [school_id, mentorId, visit_number, is_first_visit||false, date_of_visit, engagement_type, latitude||null, longitude||null, gps_raw||null, club_running??true, not_running_reason||null, activation_actions||null, club_day||null, time_band||null, device_count||0, total_learners||0, male_learners||0, female_learners||0, engagement_rating||null, observationPathwayId, scratch_level||null, creating_projects||false, project_id||null, project_notes||null, observations||null, phone_call_notes||null, challenges||null, club_leader_confidence||null, actions_agreed||null, recommended_star_club||false, star_club_reason||null, flag_school||false, flag_reason||null, next_visit_date||null, other_details||null]);
    await syncSchoolFromVisit({ school_id, club_running: club_running??true, total_learners });
    if (flag_school || club_running === false) {
      try { await pool.query(`INSERT INTO flags (school_id, mentor_id, flag_type, reason, status, flagged_at) VALUES ($1,$2,'visit_observation',$3,'open',$4)`, [school_id, mentorId, flag_reason||not_running_reason||'Club not running', date_of_visit]); } catch(e) {}
    }
    if (recommended_star_club) {
      try {
        await syncStarClubNomination({ school_id, mentorId, star_club_reason, date_of_visit });
      } catch(e) {}
    }
    if (pathway_id && scratch_level) {
      try {
        await syncPathwayProgress({
          school_id,
          teacher_id,
          pathway: resolvedPathway?.key,
          pathway_id,
          scratch_level,
          date_of_visit,
        });
      } catch(e) {}
    }
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error('Create visit:', err.message); res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { teacher_id, date_of_visit, engagement_type, latitude, longitude, gps_raw, club_running, not_running_reason, activation_actions, club_day, time_band, device_count, total_learners, male_learners, female_learners, engagement_rating, pathway_id, scratch_level, creating_projects, project_id, project_notes, observations, phone_call_notes, challenges, club_leader_confidence, actions_agreed, recommended_star_club, star_club_reason, flag_school, flag_reason, next_visit_date, other_details } = req.body;
    const resolvedPathway = await resolvePathway(pathway_id);
    const observationPathwayId = resolvedPathway?.id || null;
    const result = await pool.query(`UPDATE session_observations SET date_of_visit=$1, engagement_type=$2, latitude=$3, longitude=$4, gps_raw=$5, club_running=$6, not_running_reason=$7, activation_actions=$8, club_day=$9, time_band=$10, device_count=$11, total_learners=$12, male_learners=$13, female_learners=$14, engagement_rating=$15, pathway_id=$16, scratch_level=$17, creating_projects=$18, project_id=$19, project_notes=$20, observations=$21, phone_call_notes=$22, challenges=$23, club_leader_confidence=$24, actions_agreed=$25, recommended_star_club=$26, star_club_reason=$27, flag_school=$28, flag_reason=$29, next_visit_date=$30, other_details=$31 WHERE id=$32 RETURNING *`,
      [date_of_visit, engagement_type, latitude||null, longitude||null, gps_raw||null, club_running??true, not_running_reason||null, activation_actions||null, club_day||null, time_band||null, device_count||0, total_learners||0, male_learners||0, female_learners||0, engagement_rating||null, observationPathwayId, scratch_level||null, creating_projects||false, project_id||null, project_notes||null, observations||null, phone_call_notes||null, challenges||null, club_leader_confidence||null, actions_agreed||null, recommended_star_club||false, star_club_reason||null, flag_school||false, flag_reason||null, next_visit_date||null, other_details||null, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const school_id = result.rows[0].school_id;
    await syncSchoolFromVisit({ school_id, club_running: club_running??true, total_learners });
    if (pathway_id && scratch_level) {
      try {
        await syncPathwayProgress({
          school_id,
          teacher_id,
          pathway: resolvedPathway?.key,
          pathway_id,
          scratch_level,
          date_of_visit,
        });
      } catch(e) {}
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM session_observations WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
