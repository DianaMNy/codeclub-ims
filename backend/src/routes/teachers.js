// src/routes/teachers.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { validate } = require('../middleware/validate');
const { createTeacherSchema, updateTeacherSchema } = require('../schemas/teacherSchemas');

// GET /api/teachers
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        sc.official_name AS school_name,
        sc.county,
        sc.subcounty_area,
        sc.club_id,
        m.full_name AS mentor_name
      FROM teachers t
      LEFT JOIN schools_and_centres sc ON t.school_id = sc.id
      LEFT JOIN mentors m ON sc.mentor_id = m.id
      ORDER BY sc.county, sc.official_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get teachers error:', err.message);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// POST /api/teachers
router.post('/', requireAuth, requireAdmin, validate(createTeacherSchema), async (req, res) => {
  try {
    const { school_id, full_name, role, phone, email, ict_confidence,
            training_completed, safeguarding_done, survey_done } = req.body;
    const result = await pool.query(`
      INSERT INTO teachers (school_id, full_name, role, phone, email, ict_confidence,
                            training_completed, safeguarding_done, survey_done)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [school_id||null, full_name, role||'club_leader', phone||null, email||null,
        ict_confidence||'beginner', training_completed||false,
        safeguarding_done||false, survey_done||false]);

    // Auto-update school with club leader info
    if ((role === 'club_leader' || role === 'centre_club_leader') && school_id) {
      await pool.query(`
        UPDATE schools_and_centres 
        SET club_leader_name=$1, club_leader_phone=$2, club_leader_email=$3
        WHERE id=$4
      `, [full_name, phone||null, email||null, school_id]);
    }
    await logAudit(req, 'CREATE', 'teachers', result.rows[0].id, `Created teacher: ${result.rows[0].full_name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create teacher error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/teachers/:id
router.put('/:id', requireAuth, requireAdmin, validate(updateTeacherSchema), async (req, res) => {
  try {
    const { school_id, full_name, role, phone, email, ict_confidence,
            training_completed, safeguarding_done, survey_done,
            training_date, safeguarding_date } = req.body;

    const result = await pool.query(`
      UPDATE teachers SET
        school_id=$1, full_name=$2, role=$3, phone=$4, email=$5,
        ict_confidence=$6, training_completed=$7, safeguarding_done=$8,
        survey_done=$9, training_date=$10, safeguarding_date=$11
      WHERE id=$12
      RETURNING *
    `, [school_id||null, full_name, role, phone||null, email||null,
        ict_confidence||'beginner', training_completed, safeguarding_done,
        survey_done||false, training_date||null, safeguarding_date||null,
        req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });

    // Auto-update school with club leader info
    if ((role === 'club_leader' || role === 'centre_club_leader') && school_id) {
      await pool.query(`
        UPDATE schools_and_centres
        SET club_leader_name=$1, club_leader_phone=$2, club_leader_email=$3
        WHERE id=$4
      `, [full_name, phone||null, email||null, school_id]);
    }
    await logAudit(req, 'UPDATE', 'teachers', req.params.id, `Updated record ${req.params.id} in teachers`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update teacher error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/teachers/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM teachers WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    await logAudit(req, 'DELETE', 'teachers', req.params.id, `Deleted record ${req.params.id} from teachers`);
    res.json({ message: 'Teacher deleted successfully' });
  } catch (err) {
    console.error('Delete teacher error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;