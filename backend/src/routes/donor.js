// src/routes/donor.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// GET /api/donor — donor impact summary
router.get('/', requireAuth, async (req, res) => {
  try {
    const [schools, mentors, teachers, obs, pathways, starclubs] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status='active' THEN 1 END) as active,
          COUNT(CASE WHEN type='community_centre' THEN 1 END) as centres,
          SUM(learner_count) as learners,
          COUNT(DISTINCT county) as counties
        FROM schools_and_centres
      `),
      pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='active' THEN 1 END) as active FROM mentors`),
      pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN safeguarding_done THEN 1 END) as safeguarded FROM teachers`),
      pool.query(`SELECT COUNT(*) as total FROM session_observations`),
      pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN completed THEN 1 END) as completed FROM pathway_progress`),
      pool.query(`SELECT COUNT(*) as total FROM star_club_evaluations WHERE recognition_level='star_club'`),
    ]);

    // County breakdown
    const countyData = await pool.query(`
      SELECT county,
        COUNT(*) as schools,
        COUNT(CASE WHEN status='active' THEN 1 END) as active,
        SUM(learner_count) as learners
      FROM schools_and_centres
      WHERE county IN ('Kiambu','Kajiado','Murang''a')
      GROUP BY county ORDER BY county
    `);

    res.json({
      schools: schools.rows[0],
      mentors: mentors.rows[0],
      teachers: teachers.rows[0],
      observations: obs.rows[0],
      pathways: pathways.rows[0],
      starclubs: starclubs.rows[0],
      counties: countyData.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;