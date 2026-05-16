// src/routes/deviceAudits.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

let tableReady = false;

const ensureDeviceAuditTable = async () => {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS device_audits (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools_and_centres(id) ON DELETE CASCADE,
      mentor_id INTEGER REFERENCES mentors(id) ON DELETE SET NULL,
      created_by_user_id INTEGER,
      audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
      coding_club_id TEXT,
      school_type TEXT,
      device_type TEXT NOT NULL,
      total_devices INTEGER NOT NULL DEFAULT 0,
      functioning_devices INTEGER NOT NULL DEFAULT 0,
      faulty_devices INTEGER NOT NULL DEFAULT 0,
      comments TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  tableReady = true;
};

const getSchoolDetails = async (schoolId) => {
  const result = await pool.query(
    `SELECT id, club_id, type FROM schools_and_centres WHERE id = $1`,
    [schoolId]
  );
  return result.rows[0] || {};
};

const auditQuery = `
  SELECT
    da.*,
    sc.official_name AS school_name,
    sc.club_id,
    sc.type AS school_type_current,
    sc.county,
    m.full_name AS mentor_name
  FROM device_audits da
  LEFT JOIN schools_and_centres sc ON da.school_id = sc.id
  LEFT JOIN mentors m ON da.mentor_id = m.id
`;

const applyAccessFilters = ({ req, filters, params }) => {
  const { role, mentor_id, id: user_id } = req.user;
  const canSeeAll = role === 'admin' || role === 'programme_coordinator';
  if (canSeeAll) return;

  if (mentor_id) {
    params.push(mentor_id);
    const mentorParam = `$${params.length}`;
    params.push(user_id || null);
    const userParam = `$${params.length}`;
    filters.push(`(da.mentor_id = ${mentorParam} OR sc.mentor_id = ${mentorParam} OR da.created_by_user_id = ${userParam})`);
  } else {
    params.push(user_id || null);
    filters.push(`da.created_by_user_id = $${params.length}`);
  }
};

router.get('/', requireAuth, async (req, res) => {
  try {
    await ensureDeviceAuditTable();
    const params = [];
    const filters = [];

    if (req.query.school_id) {
      params.push(req.query.school_id);
      filters.push(`da.school_id = $${params.length}`);
    }

    applyAccessFilters({ req, filters, params });

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await pool.query(
      `${auditQuery} ${where} ORDER BY da.audit_date DESC, da.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const {
    school_id, audit_date, device_type,
    total_devices, functioning_devices, faulty_devices, comments
  } = req.body;

  if (!school_id) return res.status(400).json({ error: 'School or centre is required' });
  if (!device_type) return res.status(400).json({ error: 'Device type is required' });

  try {
    await ensureDeviceAuditTable();
    const school = await getSchoolDetails(school_id);
    const result = await pool.query(
      `INSERT INTO device_audits
        (school_id, mentor_id, created_by_user_id, audit_date, coding_club_id,
         school_type, device_type, total_devices, functioning_devices,
         faulty_devices, comments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        school_id,
        req.user.mentor_id || null,
        req.user.id || null,
        audit_date || new Date().toISOString().slice(0, 10),
        school.club_id || null,
        school.type || null,
        device_type,
        parseInt(total_devices, 10) || 0,
        parseInt(functioning_devices, 10) || 0,
        parseInt(faulty_devices, 10) || 0,
        comments || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const {
    school_id, audit_date, device_type,
    total_devices, functioning_devices, faulty_devices, comments
  } = req.body;

  if (!school_id) return res.status(400).json({ error: 'School or centre is required' });
  if (!device_type) return res.status(400).json({ error: 'Device type is required' });

  try {
    await ensureDeviceAuditTable();
    const school = await getSchoolDetails(school_id);
    const result = await pool.query(
      `UPDATE device_audits SET
        school_id            = $1,
        audit_date           = $2,
        coding_club_id       = $3,
        school_type          = $4,
        device_type          = $5,
        total_devices        = $6,
        functioning_devices  = $7,
        faulty_devices       = $8,
        comments             = $9,
        updated_at           = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        school_id,
        audit_date || new Date().toISOString().slice(0, 10),
        school.club_id || null,
        school.type || null,
        device_type,
        parseInt(total_devices, 10) || 0,
        parseInt(functioning_devices, 10) || 0,
        parseInt(faulty_devices, 10) || 0,
        comments || null,
        id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Device audit not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await ensureDeviceAuditTable();
    const result = await pool.query('DELETE FROM device_audits WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Device audit not found' });
    res.json({ message: 'Device audit deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
