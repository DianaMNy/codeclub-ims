const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET all extras
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM ecosystem_extras ORDER BY role, full_name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create extra
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { full_name, role, phone, email, county, subcounty_area, training_completed, safeguarding_done, survey_done } = req.body;
    const result = await pool.query(`
      INSERT INTO ecosystem_extras (full_name, role, phone, email, county, subcounty_area, training_completed, safeguarding_done, survey_done)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [full_name, role, phone, email, county, subcounty_area, training_completed || false, safeguarding_done || false, survey_done || false]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update extra
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { full_name, role, phone, email, county, subcounty_area, training_completed, safeguarding_done, survey_done } = req.body;
    const result = await pool.query(`
      UPDATE ecosystem_extras SET
        full_name=$1, role=$2, phone=$3, email=$4, county=$5,
        subcounty_area=$6, training_completed=$7, safeguarding_done=$8, survey_done=$9
      WHERE id=$10 RETURNING *
    `, [full_name, role, phone, email, county, subcounty_area, training_completed, safeguarding_done, survey_done, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE extra
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ecosystem_extras WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;