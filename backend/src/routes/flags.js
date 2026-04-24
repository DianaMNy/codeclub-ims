// src/routes/flags.js
// API endpoints for school flags and escalations

const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── GET /api/flags ───────────────────────────────────────────
// Admin sees all flags, mentor sees only their schools' flags
router.get('/', requireAuth, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'admin') {
      query = `
        SELECT f.*,
          sc.official_name AS school_name,
          sc.county,
          m.full_name AS mentor_name
        FROM flags f
        LEFT JOIN schools_and_centres sc ON f.school_id = sc.id
        LEFT JOIN mentors m ON f.mentor_id = m.id
        ORDER BY f.flagged_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT f.*,
          sc.official_name AS school_name,
          sc.county,
          m.full_name AS mentor_name
        FROM flags f
        LEFT JOIN schools_and_centres sc ON f.school_id = sc.id
        LEFT JOIN mentors m ON f.mentor_id = m.id
        WHERE f.mentor_id = $1
        ORDER BY f.flagged_at DESC
      `;
      params = [req.user.mentor_id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get flags error:', err.message);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

// ── POST /api/flags ──────────────────────────────────────────
// Mentor raises a flag on a school
router.post('/', requireAuth, async (req, res) => {
  const { school_id, reason } = req.body;

  if (!school_id || !reason) {
    return res.status(400).json({ error: 'School and reason are required' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO flags
        (school_id, mentor_id, flag_type, reason, status, escalation_level)
      VALUES ($1, $2, 'mentor_initiated', $3, 'open', 0)
      RETURNING *
    `, [school_id, req.user.mentor_id, reason]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create flag error:', err.message);
    res.status(500).json({ error: 'Failed to create flag' });
  }
});

// ── PATCH /api/flags/:id/resolve ─────────────────────────────
// Admin resolves a flag
router.patch('/:id/resolve', requireAuth, requireAdmin, async (req, res) => {
  const { resolution_notes } = req.body;

  try {
    const result = await pool.query(`
      UPDATE flags 
      SET status = 'resolved', 
          resolution_notes = $1,
          resolved_at = now()
      WHERE id = $2
      RETURNING *
    `, [resolution_notes || null, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Resolve flag error:', err.message);
    res.status(500).json({ error: 'Failed to resolve flag' });
  }
});

module.exports = router;