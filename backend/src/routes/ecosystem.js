// src/routes/ecosystem.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// GET /api/ecosystem — all ecosystem builders
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        eb.*,
        sc.official_name AS school_name,
        sc.club_id
      FROM ecosystem_builders eb
      LEFT JOIN schools_and_centres sc ON eb.school_id = sc.id
      ORDER BY eb.role, eb.county, eb.full_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get ecosystem error:', err.message);
    res.status(500).json({ error: 'Failed to fetch ecosystem builders' });
  }
});

module.exports = router;