// src/routes/safeguarding.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

// GET /api/safeguarding — all people needing safeguarding tracking
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      -- Club Leaders & Additional Teachers from teachers table
      SELECT
        t.id,
        t.full_name,
        t.role,
        t.safeguarding_done,
        t.training_completed,
        sc.official_name AS school_name,
        sc.county,
        sc.subcounty_area,
        sc.club_id,
        m.full_name AS mentor_name,
        'teacher' AS person_type
      FROM teachers t
      LEFT JOIN schools_and_centres sc ON t.school_id = sc.id
      LEFT JOIN mentors m ON sc.mentor_id = m.id

      UNION ALL

      -- Heads of School & Centre Managers from heads_of_school table
      SELECT
        h.id,
        h.full_name,
        h.role,
        h.safeguarding_done,
        h.training_completed,
        sc.official_name AS school_name,
        COALESCE(h.county, sc.county) AS county,
        sc.subcounty_area,
        sc.club_id,
        NULL AS mentor_name,
        'hos' AS person_type
      FROM heads_of_school h
      LEFT JOIN schools_and_centres sc ON h.school_id = sc.id

      UNION ALL

      -- ICT Interns, Sub-County Directors, Centre Managers from ecosystem_extras
      SELECT
        e.id,
        e.full_name,
        e.role,
        e.safeguarding_done,
        e.training_completed,
        NULL AS school_name,
        e.county,
        e.subcounty_area,
        NULL AS club_id,
        NULL AS mentor_name,
        'ecosystem_extra' AS person_type
      FROM ecosystem_extras e

      UNION ALL

      -- Mentors
      SELECT
        m.id,
        m.full_name,
        'mentor' AS role,
        COALESCE(m.safeguarding_done, false) AS safeguarding_done,
        COALESCE(m.training_completed, false) AS training_completed,
        NULL AS school_name,
        m.county,
        m.subcounty_area,
        NULL AS club_id,
        NULL AS mentor_name,
        'mentor' AS person_type
      FROM mentors m

      ORDER BY county, school_name, full_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get safeguarding error:', err.message);
    res.status(500).json({ error: 'Failed to fetch safeguarding data' });
  }
});

// PATCH /api/safeguarding/:id/toggle
router.patch('/:id/toggle', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { field, person_type } = req.body;

  if (!['safeguarding_done', 'training_completed'].includes(field)) {
    return res.status(400).json({ error: 'Invalid field' });
  }

  try {
    let result;
    if (person_type === 'teacher') {
      result = await pool.query(
        `UPDATE teachers SET ${field} = NOT ${field} WHERE id = $1 RETURNING id, ${field}`,
        [id]
      );
    } else if (person_type === 'hos') {
      result = await pool.query(
        `UPDATE heads_of_school SET ${field} = NOT ${field} WHERE id = $1 RETURNING id, ${field}`,
        [id]
      );
    } else if (person_type === 'ecosystem_extra') {
      result = await pool.query(
        `UPDATE ecosystem_extras SET ${field} = NOT ${field} WHERE id = $1 RETURNING id, ${field}`,
        [id]
      );
    } else if (person_type === 'mentor') {
      result = await pool.query(
        `UPDATE mentors SET ${field} = NOT ${field} WHERE id = $1 RETURNING id, ${field}`,
        [id]
      );
    } else {
      return res.status(400).json({ error: 'Invalid person_type' });
    }

    if (!result.rows.length) return res.status(404).json({ error: 'Record not found' });
    await logAudit(req, 'UPDATE', person_type, id, `Toggled ${field} for ${person_type} ${id}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Toggle safeguarding error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;