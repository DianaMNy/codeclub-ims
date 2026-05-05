// src/routes/flagalerts.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/flagalerts — all flags
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

// POST /api/flagalerts — raise a flag
router.post('/', requireAuth, async (req, res) => {
  const { school_id, mentor_id, reason, flag_type, flagged_at } = req.body;
  if (!school_id || !reason) {
    return res.status(400).json({ error: 'School and reason are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO flags
        (school_id, mentor_id, flag_type, reason, status, escalation_level, flagged_at)
       VALUES ($1,$2,$3,$4,'open',0,$5)
       RETURNING *`,
      [
        school_id,
        mentor_id || null,
        flag_type || 'mentor_initiated',
        reason,
        flagged_at || new Date(),
      ]
    );

    // TODO: Send email notification to programme coordinator via Resend
    // import { Resend } from 'resend';
    // await resend.emails.send({ from: '...', to: coordinator_email, subject: 'New Flag Raised', html: ... });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/flagalerts/:id — edit a flag
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { school_id, mentor_id, reason, flag_type, flagged_at } = req.body;
  if (!school_id || !reason) {
    return res.status(400).json({ error: 'School and reason are required' });
  }
  try {
    const result = await pool.query(
      `UPDATE flags SET
        school_id  = $1,
        mentor_id  = $2,
        reason     = $3,
        flag_type  = $4,
        flagged_at = $5,
        updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [school_id, mentor_id || null, reason, flag_type || 'mentor_initiated', flagged_at || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Flag not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/flagalerts/:id — delete a flag
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM flags WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Flag not found' });
    res.json({ message: 'Flag deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/flagalerts/:id/resolve — resolve a flag
router.patch('/:id/resolve', requireAuth, async (req, res) => {
  const { resolution_notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE flags SET
        status = 'resolved',
        resolution_notes = $1,
        resolved_at = now()
       WHERE id = $2 RETURNING *`,
      [resolution_notes || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Flag not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/flagalerts/:id/escalate — escalate a flag
router.patch('/:id/escalate', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE flags SET
        status = 'escalated',
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