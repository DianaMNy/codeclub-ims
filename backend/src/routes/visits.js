// src/routes/visits.js
// API endpoints for mentor visits

const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── GET /api/visits ──────────────────────────────────────────
// Admin sees all visits, mentor sees only their own
router.get('/', requireAuth, async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'admin') {
      query = `
        SELECT mv.*, 
          m.full_name AS mentor_name,
          sc.official_name AS school_name,
          sc.county
        FROM mentor_visits mv
        LEFT JOIN mentors m ON mv.mentor_id = m.id
        LEFT JOIN schools_and_centres sc ON mv.school_id = sc.id
        ORDER BY mv.visit_date DESC
      `;
      params = [];
    } else {
      query = `
        SELECT mv.*,
          m.full_name AS mentor_name,
          sc.official_name AS school_name,
          sc.county
        FROM mentor_visits mv
        LEFT JOIN mentors m ON mv.mentor_id = m.id
        LEFT JOIN schools_and_centres sc ON mv.school_id = sc.id
        WHERE mv.mentor_id = $1
        ORDER BY mv.visit_date DESC
      `;
      params = [req.user.mentor_id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get visits error:', err.message);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// ── POST /api/visits ─────────────────────────────────────────
// Mentor submits a new visit
router.post('/', requireAuth, async (req, res) => {
  const {
    school_id, visit_date, duration_hrs,
    observation_score, gps_lat, gps_lng,
    support_needed, notes
  } = req.body;

  if (!school_id || !visit_date) {
    return res.status(400).json({ error: 'School and visit date are required' });
  }

  try {
    // Auto-generate visit_id (MV001, MV002 etc)
    const countResult = await pool.query('SELECT COUNT(*) FROM mentor_visits');
    const count = parseInt(countResult.rows[0].count) + 1;
    const visit_id = `MV${String(count).padStart(3, '0')}`;

    const result = await pool.query(`
      INSERT INTO mentor_visits
        (visit_id, mentor_id, school_id, visit_date, duration_hrs,
         observation_score, gps_lat, gps_lng, support_needed, notes, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
      RETURNING *
    `, [
      visit_id,
      req.user.mentor_id,
      school_id,
      visit_date,
      duration_hrs || 2,
      observation_score || null,
      gps_lat || null,
      gps_lng || null,
      support_needed || false,
      notes || null,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create visit error:', err.message);
    res.status(500).json({ error: 'Failed to create visit' });
  }
});

// ── PATCH /api/visits/:id/approve ───────────────────────────
// Admin approves a visit
router.patch('/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE mentor_visits SET status = 'approved' 
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Approve visit error:', err.message);
    res.status(500).json({ error: 'Failed to approve visit' });
  }
});

module.exports = router;