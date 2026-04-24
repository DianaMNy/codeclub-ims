// src/routes/mentors.js
// API endpoints for mentors

const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── GET /api/mentors ─────────────────────────────────────────
// Returns all mentors — admin only
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.*,
        COUNT(sc.id) AS schools_assigned
      FROM mentors m
      LEFT JOIN schools_and_centres sc ON sc.mentor_id = m.id
      GROUP BY m.id
      ORDER BY m.full_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get mentors error:', err.message);
    res.status(500).json({ error: 'Failed to fetch mentors' });
  }
});

// ── GET /api/mentors/:id ─────────────────────────────────────
// Returns one mentor + their schools
router.get('/:id', requireAuth, async (req, res) => {
  try {
    // Get mentor details
    const mentorResult = await pool.query(
      'SELECT * FROM mentors WHERE id = $1',
      [req.params.id]
    );

    if (mentorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    // Get their assigned schools
    const schoolsResult = await pool.query(`
      SELECT id, club_id, official_name, type, county, 
             subcounty_area, status, learner_count
      FROM schools_and_centres
      WHERE mentor_id = $1
      ORDER BY official_name
    `, [req.params.id]);

    res.json({
      ...mentorResult.rows[0],
      schools: schoolsResult.rows,
    });
  } catch (err) {
    console.error('Get mentor error:', err.message);
    res.status(500).json({ error: 'Failed to fetch mentor' });
  }
});

module.exports = router;