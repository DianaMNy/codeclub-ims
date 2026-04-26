// src/routes/schools.js
// API endpoints for schools and community centres

const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── GET /api/schools ─────────────────────────────────────────
// Returns all schools and community centres
// Protected — must be logged in
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sc.*,
        m.full_name AS mentor_name
      FROM schools_and_centres sc
      LEFT JOIN mentors m ON sc.mentor_id = m.id
      ORDER BY sc.county, sc.official_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get schools error:', err.message);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// ── GET /api/schools/:id ─────────────────────────────────────
// Returns one school by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sc.*,
        m.full_name AS mentor_name
      FROM schools_and_centres sc
      LEFT JOIN mentors m ON sc.mentor_id = m.id
      WHERE sc.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get school error:', err.message);
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

// ── GET /api/schools/mentor/my-schools ───────────────────────
// Returns only schools assigned to the logged-in mentor
router.get('/mentor/my-schools', requireAuth, async (req, res) => {
  try {
    if (!req.user.mentor_id) {
      return res.status(403).json({ error: 'Not a mentor account' });
    }

    const result = await pool.query(`
      SELECT sc.*, m.full_name AS mentor_name
      FROM schools_and_centres sc
      LEFT JOIN mentors m ON sc.mentor_id = m.id
      WHERE sc.mentor_id = $1
      ORDER BY sc.official_name
    `, [req.user.mentor_id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get my schools error:', err.message);
    res.status(500).json({ error: 'Failed to fetch your schools' });
  }
});


// ── POST /api/schools ─────────────────────────────────────────
// Create a new school — Admin only
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
  club_id, official_name, type, county, subcounty_area,
  referral_source, club_leader_name, club_leader_phone, club_leader_email,
  safeguarding_sponsor, sponsor_phone, learner_count, status,
  guidelines_signed, notes, mentor_id, enrollment_date, cohort
} = req.body;

    const result = await pool.query(`
  INSERT INTO schools_and_centres 
    (club_id, official_name, type, county, subcounty_area,
     referral_source, club_leader_name, club_leader_phone, club_leader_email,
     safeguarding_sponsor, sponsor_phone, learner_count, status,
     guidelines_signed, notes, mentor_id, enrollment_date, cohort)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
  RETURNING *
`, [club_id, official_name, type, county, subcounty_area,
 referral_source, club_leader_name, club_leader_phone, club_leader_email,
 safeguarding_sponsor, sponsor_phone, learner_count, status,
 guidelines_signed, notes, mentor_id, enrollment_date || null, cohort]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create school error:', err.message);
   res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/schools/:id ──────────────────────────────────────
// Update a school — Admin only
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
  club_id, official_name, type, county, subcounty_area,
  referral_source, club_leader_name, club_leader_phone, club_leader_email,
  safeguarding_sponsor, sponsor_phone, learner_count, status,
  guidelines_signed, notes, mentor_id, enrollment_date, cohort
} = req.body;

   const result = await pool.query(`
  UPDATE schools_and_centres SET
    club_id=$1, official_name=$2, type=$3, county=$4, subcounty_area=$5,
    referral_source=$6, club_leader_name=$7, club_leader_phone=$8, club_leader_email=$9,
    safeguarding_sponsor=$10, sponsor_phone=$11, learner_count=$12, status=$13,
    guidelines_signed=$14, notes=$15, mentor_id=$16, enrollment_date=$17, cohort=$18
  WHERE id=$19
  RETURNING *
`, [club_id, official_name, type, county, subcounty_area,
    referral_source, club_leader_name, club_leader_phone, club_leader_email,
    safeguarding_sponsor, sponsor_phone, learner_count, status,
    guidelines_signed, notes, mentor_id, enrollment_date || null, cohort, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update school error:', err.message);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

// ── DELETE /api/schools/:id ───────────────────────────────────
// Delete a school — Admin only
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM schools_and_centres WHERE id=$1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json({ message: 'School deleted successfully' });
  } catch (err) {
    console.error('Delete school error:', err.message);
    res.status(500).json({ error: 'Failed to delete school' });
  }
});
module.exports = router;