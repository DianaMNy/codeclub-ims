// src/routes/reports.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// GET /api/reports/summary — overall programme summary
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const [schools, mentors, teachers, obs, flags, pathways] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='active' THEN 1 END) as active, COUNT(CASE WHEN type='community_centre' THEN 1 END) as centres, SUM(learner_count) as learners FROM schools_and_centres`),
      pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='active' THEN 1 END) as active FROM mentors`),
      pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN training_completed THEN 1 END) as trained, COUNT(CASE WHEN safeguarding_done THEN 1 END) as safeguarded FROM teachers`),
      pool.query(`SELECT COUNT(*) as total FROM session_observations`),
      pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='open' THEN 1 END) as open FROM flags`),
      pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN completed THEN 1 END) as completed FROM pathway_progress`),
    ]);

    res.json({
      schools: schools.rows[0],
      mentors: mentors.rows[0],
      teachers: teachers.rows[0],
      observations: obs.rows[0],
      flags: flags.rows[0],
      pathways: pathways.rows[0],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/county — county breakdown
router.get('/county', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        county,
        COUNT(*) as total_schools,
        COUNT(CASE WHEN status='active' THEN 1 END) as active_clubs,
        COUNT(CASE WHEN status='enrolled' THEN 1 END) as not_started,
        SUM(learner_count) as total_learners,
        COUNT(CASE WHEN type='community_centre' THEN 1 END) as centres
      FROM schools_and_centres
      WHERE county IN ('Kiambu', 'Kajiado', 'Murang''a')
      GROUP BY county
      ORDER BY county
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/mentor-activity — mentor performance
router.get('/mentor-activity', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.full_name AS mentor_name,
        m.subcounty_area,
        m.status,
        COUNT(DISTINCT sc.id) AS schools_assigned,
        COUNT(DISTINCT CASE WHEN sc.status='active' THEN sc.id END) AS active_schools,
        COUNT(DISTINCT so.id) AS observations_made,
        COUNT(DISTINCT f.id) AS flags_raised,
        SUM(sc.learner_count) AS total_learners
      FROM mentors m
      LEFT JOIN schools_and_centres sc ON sc.mentor_id = m.id
      LEFT JOIN session_observations so ON so.mentor_id = m.id
      LEFT JOIN flags f ON f.mentor_id = m.id
      GROUP BY m.id, m.full_name, m.subcounty_area, m.status
      ORDER BY schools_assigned DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/school-progress — per school status
router.get('/school-progress', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sc.club_id,
        sc.official_name,
        sc.county,
        sc.subcounty_area,
        sc.status,
        sc.learner_count,
        m.full_name AS mentor_name,
        COUNT(DISTINCT so.id) AS observations,
        COUNT(DISTINCT f.id) AS open_flags,
        COUNT(DISTINCT pp.id) AS pathways_started
      FROM schools_and_centres sc
      LEFT JOIN mentors m ON sc.mentor_id = m.id
      LEFT JOIN session_observations so ON so.school_id = sc.id
      LEFT JOIN flags f ON f.school_id = sc.id AND f.status = 'open'
      LEFT JOIN pathway_progress pp ON pp.school_id = sc.id
      WHERE sc.type = 'school'
      GROUP BY sc.id, sc.club_id, sc.official_name, sc.county,
               sc.subcounty_area, sc.status, sc.learner_count, m.full_name
      ORDER BY sc.county, sc.official_name
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/safeguarding — safeguarding compliance
router.get('/safeguarding', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sc.county,
        COUNT(DISTINCT t.id) AS total_teachers,
        COUNT(DISTINCT CASE WHEN t.safeguarding_done THEN t.id END) AS safeguarding_done,
        COUNT(DISTINCT CASE WHEN t.training_completed THEN t.id END) AS training_done,
        ROUND(COUNT(DISTINCT CASE WHEN t.safeguarding_done THEN t.id END) * 100.0 / NULLIF(COUNT(DISTINCT t.id), 0), 1) AS safeguarding_pct
      FROM teachers t
      LEFT JOIN schools_and_centres sc ON t.school_id = sc.id
      GROUP BY sc.county
      ORDER BY sc.county
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;