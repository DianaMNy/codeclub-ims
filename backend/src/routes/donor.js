// src/routes/donor.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// GET /api/donor — full donor impact summary
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

    // Star clubs showcase (top 5)
    const starClubsData = await pool.query(`
      SELECT 
        se.overall_score,
        se.recognition_level,
        se.evaluation_date,
        se.criteria_met,
        sc.official_name AS school_name,
        sc.county,
        sc.club_id,
        m.full_name AS mentor_name
      FROM star_club_evaluations se
      LEFT JOIN schools_and_centres sc ON se.school_id = sc.id
      LEFT JOIN mentors m ON se.mentor_id = m.id
      WHERE se.recognition_level = 'star_club'
      ORDER BY se.overall_score DESC
      LIMIT 5
    `);

    // Growth timeline — schools enrolled by month (last 12 months)
    const growthData = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
        DATE_TRUNC('month', created_at) as month_date,
        COUNT(*) as schools_added,
        SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) as cumulative_schools
      FROM schools_and_centres
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month_date ASC
    `);

    // Cost per learner (estimated — $15 per learner per year programme cost)
    const totalLearners = parseInt(schools.rows[0].learners || 0);
    const programBudget = 112500; // ~$112,500 estimated annual budget
    const costPerLearner = totalLearners > 0 ? Math.round(programBudget / totalLearners) : 0;

    res.json({
      schools:      schools.rows[0],
      mentors:      mentors.rows[0],
      teachers:     teachers.rows[0],
      observations: obs.rows[0],
      pathways:     pathways.rows[0],
      starclubs:    starclubs.rows[0],
      counties:     countyData.rows,
      starClubsList: starClubsData.rows,
      growth:       growthData.rows,
      costPerLearner,
      programBudget,
    });
  } catch (err) {
    console.error('Donor route error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;