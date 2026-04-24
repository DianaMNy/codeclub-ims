// src/routes/flagalerts.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/flags — all flags
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.*,
        sc.official_name AS school_name,
        sc.county, sc.club_id,
        m.full_name AS mentor_name
      FROM flags f
      LEFT JOIN schools_and_centres sc ON f.school_id = sc.id
      LEFT JOIN mentors m ON f.mentor_id = m.id
      ORDER BY 
        CASE f.status WHEN 'open' THEN 1 WHEN 'escalated' THEN 2 ELSE 3 END,
        f.flagged_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/flags — raise a flag
router.post('/', requireAuth, async (req, res) => {
  const { school_id, reason, flag_type } = req.body;
  if (!school_id || !reason) {
    return res.status(400).json({ error: 'School and reason are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO flags
        (school_id, mentor_id, flag_type, reason, status, escalation_level)
       VALUES ($1,$2,$3,$4,'open',0)
       RETURNING *`,
      [school_id, req.user.mentor_id || null,
       flag_type || 'mentor_initiated', reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/flags/:id/resolve — resolve a flag
router.patch('/:id/resolve', requireAuth, async (req, res) => {
  const { resolution_notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE flags
       SET status = 'resolved',
           resolution_notes = $1,
           resolved_at = now()
       WHERE id = $2 RETURNING *`,
      [resolution_notes || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flag not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/flags/:id/escalate
router.patch('/:id/escalate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE flags
       SET status = 'escalated',
           escalation_level = escalation_level + 1
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;