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
// Returns one mentor + schools + community centres separately
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const mentorResult = await pool.query(
      'SELECT * FROM mentors WHERE id = $1',
      [req.params.id]
    );
    if (mentorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    const venuesResult = await pool.query(`
      SELECT id, club_id, official_name, type, county, 
             subcounty_area, status, learner_count
      FROM schools_and_centres
      WHERE mentor_id = $1
      ORDER BY type, official_name
    `, [req.params.id]);

    const schools = venuesResult.rows.filter(v => v.type === 'school');
    const community_centres = venuesResult.rows.filter(v => v.type === 'community_centre');

    res.json({
      ...mentorResult.rows[0],
      schools,
      community_centres,
    });
  } catch (err) {
    console.error('Get mentor error:', err.message);
    res.status(500).json({ error: 'Failed to fetch mentor' });
  }
});

// ── POST, PUT, DELETE routes below...




// ── POST /api/mentors ─────────────────────────────────────────
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { full_name, email, phone, subcounty_area, status, join_date, county } = req.body;
    const result = await pool.query(`
      INSERT INTO mentors (full_name, email, phone, subcounty_area, status, join_date, county)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [full_name, email, phone, subcounty_area, status || 'active', join_date || null, county]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create mentor error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/mentors/:id ──────────────────────────────────────
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { full_name, email, phone, subcounty_area, status, join_date, county } = req.body;
    const result = await pool.query(`
      UPDATE mentors SET
        full_name=$1, email=$2, phone=$3, subcounty_area=$4,
        status=$5, join_date=$6, county=$7
      WHERE id=$8
      RETURNING *
    `, [full_name, email, phone, subcounty_area, status, join_date || null, county, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mentor not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update mentor error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/mentors/:id ───────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM mentors WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mentor not found' });
    res.json({ message: 'Mentor deleted successfully' });
  } catch (err) {
    console.error('Delete mentor error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;