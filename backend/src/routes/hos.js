const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET all HOS
router.get('/', requireAuth, async (req, res) => {
  try {
   const result = await pool.query(`
  SELECT h.*, sc.official_name AS school_name, sc.club_id, sc.type AS school_type
  FROM heads_of_school h
  LEFT JOIN schools_and_centres sc ON h.school_id = sc.id
  ORDER BY h.full_name
`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create HOS
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { full_name, phone, email, school_id, training_completed, safeguarding_done, role } = req.body;
const result = await pool.query(`
  INSERT INTO heads_of_school (full_name, phone, email, school_id, training_completed, safeguarding_done, role)
  VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
`, [full_name, phone, email, school_id || null, training_completed || false, safeguarding_done || false, role || 'head_of_school']);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update HOS
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
   const { full_name, phone, email, school_id, training_completed, safeguarding_done, role } = req.body;
const result = await pool.query(`
  UPDATE heads_of_school SET
    full_name=$1, phone=$2, email=$3, school_id=$4,
    training_completed=$5, safeguarding_done=$6, role=$7
  WHERE id=$8 RETURNING *
`, [full_name, phone, email, school_id || null, training_completed, safeguarding_done, role || 'head_of_school', req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE HOS
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM heads_of_school WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;