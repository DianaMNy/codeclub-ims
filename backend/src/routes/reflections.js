// src/routes/reflections.js
// API endpoints for teacher reflections

const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── GET /api/reflections ─────────────────────────────────────
// Admin sees all, mentor sees only their schools'
router.get('/', requireAuth, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'admin') {
      query = `
        SELECT r.*,
          sc.official_name AS school_name,
          m.full_name AS mentor_name
        FROM teacher_reflections r
        LEFT JOIN schools_and_centres sc ON r.school_id = sc.id
        LEFT JOIN mentors m ON r.mentor_id = m.id
        ORDER BY r.submitted_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT r.*,
          sc.official_name AS school_name,
          m.full_name AS mentor_name
        FROM teacher_reflections r
        LEFT JOIN schools_and_centres sc ON r.school_id = sc.id
        LEFT JOIN mentors m ON r.mentor_id = m.id
        WHERE r.mentor_id = $1
        ORDER BY r.submitted_at DESC
      `;
      params = [req.user.mentor_id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get reflections error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reflections' });
  }
});

// ── POST /api/reflections ────────────────────────────────────
// Submit a new teacher reflection
router.post('/', requireAuth, async (req, res) => {
  const {
    school_id, session_id, teacher_name,
    reflection_title, reflection_text,
    confidence_rating, milestone
  } = req.body;

  if (!school_id || !reflection_text) {
    return res.status(400).json({ error: 'School and reflection text are required' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO teacher_reflections
        (school_id, mentor_id, session_id, teacher_name, reflection_title,
         reflection_text, confidence_rating, milestone, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'submitted')
      RETURNING *
    `, [
      school_id,
      req.user.mentor_id,
      session_id || null,
      teacher_name || null,
      reflection_title || null,
      reflection_text,
      confidence_rating || null,
      milestone || null,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create reflection error:', err.message);
    res.status(500).json({ error: 'Failed to create reflection' });
  }
});

// ── PATCH /api/reflections/:id/review ───────────────────────
// Mentor adds feedback to a reflection
router.patch('/:id/review', requireAuth, async (req, res) => {
  const { mentor_comments } = req.body;

  try {
    const result = await pool.query(`
      UPDATE teacher_reflections
      SET status = 'reviewed',
          mentor_comments = $1
      WHERE id = $2
      RETURNING *
    `, [mentor_comments || null, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reflection not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Review reflection error:', err.message);
    res.status(500).json({ error: 'Failed to review reflection' });
  }
});

module.exports = router;