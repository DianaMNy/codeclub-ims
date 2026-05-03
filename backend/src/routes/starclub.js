// src/routes/starclub.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// GET /api/starclub — all evaluations
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        se.*,
        sc.official_name AS school_name,
        sc.county, sc.club_id,
        m.full_name AS mentor_name
      FROM star_club_evaluations se
      LEFT JOIN schools_and_centres sc ON se.school_id = sc.id
      LEFT JOIN mentors m ON se.mentor_id = m.id
      ORDER BY se.overall_score DESC, se.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/starclub — nominate a school
router.post('/', requireAuth, async (req, res) => {
  const {
    school_id, mentor_id, evaluation_name, evaluation_date,
    criteria_met, overall_score, recognition_level,
    evaluator_comments, follow_up_needed, follow_up_notes
  } = req.body;

  if (!school_id) return res.status(400).json({ error: 'School is required' });

  try {
    const result = await pool.query(
      `INSERT INTO star_club_evaluations
        (school_id, mentor_id, evaluation_name, evaluation_date,
         criteria_met, overall_score, recognition_level,
         evaluator_comments, follow_up_needed, follow_up_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        school_id,
        mentor_id || null,
        evaluation_name || null,
        evaluation_date || null,
        criteria_met || 0,
        overall_score || 0,
        recognition_level || 'nominated',
        evaluator_comments || null,
        follow_up_needed || false,
        follow_up_notes || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/starclub/:id — update evaluation
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const {
    school_id, mentor_id, evaluation_name, evaluation_date,
    criteria_met, overall_score, recognition_level,
    evaluator_comments, follow_up_needed, follow_up_notes
  } = req.body;

  if (!school_id) return res.status(400).json({ error: 'School is required' });

  try {
    const result = await pool.query(
      `UPDATE star_club_evaluations SET
        school_id          = $1,
        mentor_id          = $2,
        evaluation_name    = $3,
        evaluation_date    = $4,
        criteria_met       = $5,
        overall_score      = $6,
        recognition_level  = $7,
        evaluator_comments = $8,
        follow_up_needed   = $9,
        follow_up_notes    = $10,
        updated_at         = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        school_id,
        mentor_id || null,
        evaluation_name || null,
        evaluation_date || null,
        criteria_met || 0,
        overall_score || 0,
        recognition_level || 'nominated',
        evaluator_comments || null,
        follow_up_needed || false,
        follow_up_notes || null,
        id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Evaluation not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/starclub/:id — delete evaluation
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM star_club_evaluations WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Evaluation not found' });
    res.json({ message: 'Evaluation deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;