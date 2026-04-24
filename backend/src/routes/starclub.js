// src/routes/starclub.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireAdmin } = require('../middleware/auth');

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
    school_id, evaluation_name, evaluation_date,
    criteria_met, overall_score, recognition_level,
    evaluator_comments, follow_up_needed, follow_up_notes
  } = req.body;

  if (!school_id) {
    return res.status(400).json({ error: 'School is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO star_club_evaluations
        (school_id, mentor_id, evaluation_name, evaluation_date,
         criteria_met, overall_score, recognition_level,
         evaluator_comments, follow_up_needed, follow_up_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [school_id, req.user.mentor_id || null, evaluation_name,
       evaluation_date || null, criteria_met || 0,
       overall_score || 0, recognition_level || 'nominated',
       evaluator_comments || null, follow_up_needed || false,
       follow_up_notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;