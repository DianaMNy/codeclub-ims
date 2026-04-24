// src/routes/mande.js — M&E routes
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// ── SESSION OBSERVATIONS ─────────────────────────────────────
router.get('/observations', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT so.*,
        sc.official_name AS school_name, sc.county,
        m.full_name AS mentor_name
      FROM session_observations so
      LEFT JOIN schools_and_centres sc ON so.school_id = sc.id
      LEFT JOIN mentors m ON so.mentor_id = m.id
      ORDER BY so.observation_date DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


router.post('/observations', requireAuth, async (req, res) => {
  const {
    school_id, observation_date, observed_teacher,
    session_type, learner_count, session_quality,
    student_engagement, safeguarding_noted, safeguarding_category,
    observation_notes, follow_up_required, action_items,
    quality_score, engagement_score, gps_lat, gps_lng, gps_accuracy
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO session_observations
        (school_id, mentor_id, observation_date, observed_teacher,
         session_type, learner_count, session_quality, student_engagement,
         safeguarding_noted, safeguarding_category, observation_notes,
         follow_up_required, action_items, quality_score, engagement_score,
         gps_lat, gps_lng, gps_accuracy)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [school_id, req.user.mentor_id || null, observation_date,
       observed_teacher, session_type, learner_count || 0,
       session_quality, student_engagement, safeguarding_noted || false,
       safeguarding_category || null, observation_notes,
       follow_up_required || false, action_items || null,
       quality_score || null, engagement_score || null,
       gps_lat || null, gps_lng || null, gps_accuracy || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── TEACHER REFLECTIONS ──────────────────────────────────────
router.get('/reflections', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tr.*,
        sc.official_name AS school_name, sc.county,
        m.full_name AS mentor_name
      FROM teacher_reflections tr
      LEFT JOIN schools_and_centres sc ON tr.school_id = sc.id
      LEFT JOIN mentors m ON tr.mentor_id = m.id
      ORDER BY tr.submitted_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/reflections', requireAuth, async (req, res) => {
  const {
    school_id, teacher_name, reflection_title,
    reflection_text, confidence_rating, milestone
  } = req.body;

  if (!school_id || !reflection_text) {
    return res.status(400).json({ error: 'School and reflection text required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO teacher_reflections
        (school_id, mentor_id, teacher_name, reflection_title,
         reflection_text, confidence_rating, milestone, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'submitted')
       RETURNING *`,
      [school_id, req.user.mentor_id || null, teacher_name,
       reflection_title, reflection_text, confidence_rating || null,
       milestone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SURVEYS & COMPLIANCE ─────────────────────────────────────
router.get('/surveys', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sc2.*,
        sc.official_name AS school_name, sc.county,
        m.full_name AS mentor_name
      FROM surveys_compliance sc2
      LEFT JOIN schools_and_centres sc ON sc2.school_id = sc.id
      LEFT JOIN mentors m ON sc2.mentor_id = m.id
      ORDER BY sc2.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/surveys', requireAuth, async (req, res) => {
  const {
    school_id, survey_name, survey_type,
    status, date_completed, survey_score,
    follow_up_required, follow_up_notes
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO surveys_compliance
        (school_id, mentor_id, survey_name, survey_type,
         status, date_completed, survey_score,
         follow_up_required, follow_up_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [school_id, req.user.mentor_id || null, survey_name,
       survey_type, status || 'completed', date_completed || null,
       survey_score || null, follow_up_required || false,
       follow_up_notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── TRAINING & ONBOARDING ────────────────────────────────────
router.get('/training', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM training_onboarding
      ORDER BY date_held DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/training', requireAuth, async (req, res) => {
  const {
    training_name, training_type, date_held,
    school_id, county, teachers_attended,
    mentors_attended, facilitator, notes
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO training_onboarding
        (training_name, training_type, date_held, school_id,
         county, teachers_attended, mentors_attended,
         facilitator, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [training_name, training_type, date_held || null,
       school_id || null, county || null,
       teachers_attended || 0, mentors_attended || 0,
       facilitator || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;