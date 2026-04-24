// src/routes/schools.js
// API endpoints for schools and community centres

const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── GET /api/schools ─────────────────────────────────────────
// Returns all schools and community centres
// Protected — must be logged in
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sc.*,
        m.full_name AS mentor_name
      FROM schools_and_centres sc
      LEFT JOIN mentors m ON sc.mentor_id = m.id
      ORDER BY sc.county, sc.official_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get schools error:', err.message);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// ── GET /api/schools/:id ─────────────────────────────────────
// Returns one school by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sc.*,
        m.full_name AS mentor_name
      FROM schools_and_centres sc
      LEFT JOIN mentors m ON sc.mentor_id = m.id
      WHERE sc.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get school error:', err.message);
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

// ── GET /api/schools/mentor/my-schools ───────────────────────
// Returns only schools assigned to the logged-in mentor
router.get('/mentor/my-schools', requireAuth, async (req, res) => {
  try {
    if (!req.user.mentor_id) {
      return res.status(403).json({ error: 'Not a mentor account' });
    }

    const result = await pool.query(`
      SELECT sc.*, m.full_name AS mentor_name
      FROM schools_and_centres sc
      LEFT JOIN mentors m ON sc.mentor_id = m.id
      WHERE sc.mentor_id = $1
      ORDER BY sc.official_name
    `, [req.user.mentor_id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get my schools error:', err.message);
    res.status(500).json({ error: 'Failed to fetch your schools' });
  }
});

module.exports = router;