// src/routes/safeguarding.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// GET /api/safeguarding — all safeguarding sponsors
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id,
        t.full_name,
        t.role,
        t.safeguarding_done,
        t.training_completed,
        sc.official_name AS school_name,
        sc.county,
        sc.subcounty_area,
        sc.club_id,
        m.full_name AS mentor_name,
        'teacher' AS person_type
      FROM teachers t
      LEFT JOIN schools_and_centres sc ON t.school_id = sc.id
      LEFT JOIN mentors m ON sc.mentor_id = m.id
      
      UNION ALL
      
      SELECT
        eb.id,
        eb.full_name,
        eb.role,
        eb.safeguarding_done,
        eb.training_completed,
        sc.official_name AS school_name,
        eb.county,
        NULL AS subcounty_area,
        sc.club_id,
        NULL AS mentor_name,
        'ecosystem' AS person_type
      FROM ecosystem_builders eb
      LEFT JOIN schools_and_centres sc ON eb.school_id = sc.id
      WHERE eb.role = 'centre_manager'
      
      ORDER BY county, school_name, full_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get safeguarding error:', err.message);
    res.status(500).json({ error: 'Failed to fetch safeguarding data' });
  }
});

module.exports = router;