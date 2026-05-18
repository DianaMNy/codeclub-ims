// src/routes/deviceAudits.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

let tableReady = false;

const ensureDeviceAuditTable = async () => {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS device_audits (
      id SERIAL PRIMARY KEY,
      school_id TEXT NOT NULL,
      school_name_snapshot TEXT,
      county_snapshot TEXT,
      mentor_id TEXT,
      created_by_user_id TEXT,
      audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
      coding_club_id TEXT,
      school_type TEXT,
      device_type TEXT NOT NULL,
      total_devices INTEGER NOT NULL DEFAULT 0,
      functioning_devices INTEGER NOT NULL DEFAULT 0,
      faulty_devices INTEGER NOT NULL DEFAULT 0,
      comments TEXT,
      source_file TEXT,
      source_sheet TEXT,
      source_row INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE device_audits DROP CONSTRAINT IF EXISTS device_audits_school_id_fkey`);
  await pool.query(`ALTER TABLE device_audits DROP CONSTRAINT IF EXISTS device_audits_mentor_id_fkey`);
  await pool.query(`ALTER TABLE device_audits ALTER COLUMN school_id TYPE TEXT USING school_id::text`);
  await pool.query(`ALTER TABLE device_audits ALTER COLUMN mentor_id TYPE TEXT USING mentor_id::text`);
  await pool.query(`ALTER TABLE device_audits ALTER COLUMN created_by_user_id TYPE TEXT USING created_by_user_id::text`);
  await pool.query(`ALTER TABLE device_audits ADD COLUMN IF NOT EXISTS school_name_snapshot TEXT`);
  await pool.query(`ALTER TABLE device_audits ADD COLUMN IF NOT EXISTS county_snapshot TEXT`);
  await pool.query(`ALTER TABLE device_audits ADD COLUMN IF NOT EXISTS source_file TEXT`);
  await pool.query(`ALTER TABLE device_audits ADD COLUMN IF NOT EXISTS source_sheet TEXT`);
  await pool.query(`ALTER TABLE device_audits ADD COLUMN IF NOT EXISTS source_row INTEGER`);
  tableReady = true;
};

const getSchoolDetails = async (schoolId) => {
  const result = await pool.query(
    `SELECT id, official_name, club_id, type, county FROM schools_and_centres WHERE id::text = $1`,
    [schoolId]
  );
  return result.rows[0] || {};
};

const auditQuery = `
  SELECT
    da.*,
    COALESCE(sc.official_name, da.school_name_snapshot) AS school_name,
    COALESCE(sc.club_id, da.coding_club_id) AS club_id,
    COALESCE(sc.type, da.school_type) AS school_type_current,
    COALESCE(sc.county, da.county_snapshot) AS county,
    m.full_name AS mentor_name
  FROM device_audits da
  LEFT JOIN schools_and_centres sc ON da.school_id = sc.id::text
  LEFT JOIN mentors m ON da.mentor_id = m.id::text
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
    filters.push(`(da.mentor_id = ${mentorParam} OR sc.mentor_id::text = ${mentorParam} OR da.created_by_user_id = ${userParam})`);
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
        (school_id, school_name_snapshot, county_snapshot, mentor_id, created_by_user_id,
         audit_date, coding_club_id, school_type, device_type, total_devices, functioning_devices,
         faulty_devices, comments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        school_id,
        school.official_name || null,
        school.county || null,
        req.user.mentor_id ? String(req.user.mentor_id) : null,
        req.user.id ? String(req.user.id) : null,
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
    await logAudit(req, 'CREATE', 'device_audits', result.rows[0].id, `Created record in device_audits`);
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
        school_name_snapshot = $2,
        county_snapshot      = $3,
        audit_date           = $4,
        coding_club_id       = $5,
        school_type          = $6,
        device_type          = $7,
        total_devices        = $8,
        functioning_devices  = $9,
        faulty_devices       = $10,
        comments             = $11,
        updated_at           = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        school_id,
        school.official_name || null,
        school.county || null,
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
    await logAudit(req, 'UPDATE', 'device_audits', id, `Updated record ${id} in device_audits`);
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
    await logAudit(req, 'DELETE', 'device_audits', req.params.id, `Deleted record ${req.params.id} from device_audits`);
    res.json({ message: 'Device audit deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
