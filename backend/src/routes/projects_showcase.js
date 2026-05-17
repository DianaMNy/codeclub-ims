const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

pool.query(`
  CREATE TABLE IF NOT EXISTS project_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID,
    pathway TEXT NOT NULL,
    project_name TEXT NOT NULL,
    level_reached TEXT,
    photo_url TEXT,
    notes TEXT,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
    mentor_id INTEGER,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    county_snapshot TEXT,
    school_name_snapshot TEXT
  )
`).catch(err => console.error('project_submissions init:', err.message));

router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, mentor_id } = req.user;
    let query, params;
    if (role === 'admin' || role === 'programme_coordinator') {
      query = `
        SELECT ps.*, COALESCE(sc.official_name, ps.school_name_snapshot) AS school_name,
               COALESCE(sc.county, ps.county_snapshot) AS county,
               m.full_name AS mentor_name
        FROM project_submissions ps
        LEFT JOIN schools_and_centres sc ON ps.school_id = sc.id
        LEFT JOIN mentors m ON ps.mentor_id = m.id
        ORDER BY ps.submitted_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT ps.*, COALESCE(sc.official_name, ps.school_name_snapshot) AS school_name,
               COALESCE(sc.county, ps.county_snapshot) AS county,
               m.full_name AS mentor_name
        FROM project_submissions ps
        LEFT JOIN schools_and_centres sc ON ps.school_id = sc.id
        LEFT JOIN mentors m ON ps.mentor_id = m.id
        WHERE ps.mentor_id = $1
        ORDER BY ps.submitted_at DESC
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
    const { school_id, pathway, project_name, level_reached, photo_url, notes, status, county_snapshot, school_name_snapshot } = req.body;
    if (!pathway || !project_name) return res.status(400).json({ error: 'pathway and project_name are required' });
    const result = await pool.query(
      `INSERT INTO project_submissions (school_id, pathway, project_name, level_reached, photo_url, notes, status, mentor_id, county_snapshot, school_name_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [school_id||null, pathway, project_name, level_reached||null, photo_url||null, notes||null, status||'in_progress', mentor_id||null, county_snapshot||null, school_name_snapshot||null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { school_id, pathway, project_name, level_reached, photo_url, notes, status, county_snapshot, school_name_snapshot } = req.body;
    const result = await pool.query(
      `UPDATE project_submissions SET school_id=$1, pathway=$2, project_name=$3, level_reached=$4, photo_url=$5, notes=$6, status=$7, county_snapshot=$8, school_name_snapshot=$9 WHERE id=$10 RETURNING *`,
      [school_id||null, pathway, project_name, level_reached||null, photo_url||null, notes||null, status||'in_progress', county_snapshot||null, school_name_snapshot||null, req.params.id]
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
