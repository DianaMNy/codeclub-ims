// src/routes/teachers.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// GET /api/teachers — all teachers with school info
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        sc.official_name AS school_name,
        sc.county,
        sc.subcounty_area,
        sc.club_id,
        m.full_name AS mentor_name
      FROM teachers t
      LEFT JOIN schools_and_centres sc ON t.school_id = sc.id
      LEFT JOIN mentors m ON sc.mentor_id = m.id
      ORDER BY sc.county, sc.official_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get teachers error:', err.message);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

module.exports = router;