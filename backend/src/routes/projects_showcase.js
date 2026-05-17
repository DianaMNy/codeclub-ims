const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// Drop old table if it has the wrong schema (pathway TEXT column), then create fresh
pool.query(`
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'project_submissions'
        AND column_name = 'pathway'
        AND table_schema = 'public'
    ) THEN
      DROP TABLE project_submissions;
    END IF;
  END $$
`).then(() => pool.query(`
  CREATE TABLE IF NOT EXISTS project_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID,
    pathway_id UUID,
    project_name TEXT NOT NULL,
    scratch_level TEXT,
    photo_url TEXT,
    notes TEXT,
    status TEXT DEFAULT 'in_progress',
    mentor_id UUID,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    county_snapshot TEXT,
    school_name_snapshot TEXT,
    pathway_name_snapshot TEXT
  )
`)).catch(err => console.error('project_submissions init:', err.message));

const AUTO_BRANCH = `
  SELECT
    so.id::text AS id,
    so.school_id::text AS school_id,
    so.project_id AS project_name,
    so.pathway_id::text AS pathway_id,
    so.scratch_level,
    NULL::text AS photo_url,
    so.project_notes AS notes,
    'auto' AS source,
    'completed' AS status,
    so.date_of_visit::timestamptz AS submitted_at,
    sc.official_name AS school_name,
    sc.county,
    COALESCE(sc.club_id, '') AS club_id,
    p.label AS pathway_name,
    COALESCE(p.icon, '📚') AS pathway_icon,
    m.full_name AS mentor_name
  FROM session_observations so
  LEFT JOIN schools_and_centres sc ON so.school_id = sc.id
  LEFT JOIN pathways p ON so.pathway_id = p.id
  LEFT JOIN mentors m ON so.mentor_id = m.id
  WHERE so.creating_projects = true
    AND so.project_id IS NOT NULL
    AND so.project_id != ''
`;

const MANUAL_BRANCH = `
  SELECT
    ps.id::text AS id,
    ps.school_id::text AS school_id,
    ps.project_name,
    ps.pathway_id::text AS pathway_id,
    ps.scratch_level,
    ps.photo_url,
    ps.notes,
    'manual' AS source,
    ps.status,
    ps.submitted_at,
    COALESCE(sc.official_name, ps.school_name_snapshot) AS school_name,
    COALESCE(sc.county, ps.county_snapshot) AS county,
    COALESCE(sc.club_id, '') AS club_id,
    COALESCE(p.label, ps.pathway_name_snapshot) AS pathway_name,
    COALESCE(p.icon, '📚') AS pathway_icon,
    m.full_name AS mentor_name
  FROM project_submissions ps
  LEFT JOIN schools_and_centres sc ON ps.school_id = sc.id
  LEFT JOIN pathways p ON ps.pathway_id = p.id
  LEFT JOIN mentors m ON ps.mentor_id = m.id
`;

router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, mentor_id } = req.user;
    let query, params;

    if (role === 'admin' || role === 'programme_coordinator') {
      query = `${AUTO_BRANCH} UNION ALL ${MANUAL_BRANCH} ORDER BY submitted_at DESC`;
      params = [];
    } else {
      query = `
        ${AUTO_BRANCH} AND so.mentor_id = $1
        UNION ALL
        ${MANUAL_BRANCH} WHERE ps.mentor_id = $1
        ORDER BY submitted_at DESC
      `;
      params = [mentor_id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { mentor_id } = req.user;
    const { school_id, pathway_id, project_name, scratch_level, photo_url, notes, status, county_snapshot, school_name_snapshot, pathway_name_snapshot } = req.body;
    if (!project_name) return res.status(400).json({ error: 'project_name is required' });
    const result = await pool.query(
      `INSERT INTO project_submissions
         (school_id, pathway_id, project_name, scratch_level, photo_url, notes, status, mentor_id, county_snapshot, school_name_snapshot, pathway_name_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        school_id || null,
        pathway_id || null,
        project_name,
        scratch_level || null,
        photo_url || null,
        notes || null,
        status || 'in_progress',
        mentor_id || null,
        county_snapshot || null,
        school_name_snapshot || null,
        pathway_name_snapshot || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { school_id, pathway_id, project_name, scratch_level, photo_url, notes, status, county_snapshot, school_name_snapshot, pathway_name_snapshot } = req.body;
    const result = await pool.query(
      `UPDATE project_submissions
       SET school_id=$1, pathway_id=$2, project_name=$3, scratch_level=$4, photo_url=$5,
           notes=$6, status=$7, county_snapshot=$8, school_name_snapshot=$9, pathway_name_snapshot=$10
       WHERE id=$11
       RETURNING *`,
      [
        school_id || null,
        pathway_id || null,
        project_name,
        scratch_level || null,
        photo_url || null,
        notes || null,
        status || 'in_progress',
        county_snapshot || null,
        school_name_snapshot || null,
        pathway_name_snapshot || null,
        req.params.id,
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM project_submissions WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
