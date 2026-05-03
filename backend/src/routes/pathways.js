// src/routes/pathways.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// ─── PATHWAY PROGRESS ────────────────────────────────────────────────────────

// GET /api/pathways — all pathway progress
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pp.*,
        sc.official_name AS school_name,
        sc.county,
        sc.club_id,
        t.full_name AS teacher_name,
        m.full_name AS mentor_name
      FROM pathway_progress pp
      LEFT JOIN schools_and_centres sc ON pp.school_id = sc.id
      LEFT JOIN teachers t ON pp.teacher_id = t.id
      LEFT JOIN mentors m ON sc.mentor_id = m.id
      ORDER BY sc.county, sc.official_name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pathways — record pathway progress
router.post('/', requireAuth, async (req, res) => {
  const { school_id, teacher_id, pathway, level_reached, completed, date_recorded } = req.body;
  if (!school_id || !pathway) return res.status(400).json({ error: 'School and pathway are required' });
  try {
    const result = await pool.query(
      `INSERT INTO pathway_progress
        (school_id, teacher_id, pathway, level_reached, completed, date_recorded)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [school_id, teacher_id || null, pathway, level_reached || 'l1', completed || false, date_recorded || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pathways/:id — update progress record
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { school_id, teacher_id, pathway, level_reached, completed, date_recorded } = req.body;
  if (!school_id || !pathway) return res.status(400).json({ error: 'School and pathway are required' });
  try {
    const result = await pool.query(
      `UPDATE pathway_progress SET
        school_id     = $1,
        teacher_id    = $2,
        pathway       = $3,
        level_reached = $4,
        completed     = $5,
        date_recorded = $6,
        updated_at    = NOW()
       WHERE id = $7
       RETURNING *`,
      [school_id, teacher_id || null, pathway, level_reached || 'l1', completed || false, date_recorded || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pathways/:id — delete progress record
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM pathway_progress WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATHWAY SYLLABUS CRUD ────────────────────────────────────────────────────

// GET /api/pathways/syllabus — all custom pathways from DB
router.get('/syllabus', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pathways ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pathways/syllabus — add a new pathway
router.post('/syllabus', requireAuth, async (req, res) => {
  const { key, label, icon, color, levels, projects } = req.body;
  if (!key || !label) return res.status(400).json({ error: 'Key and label are required' });
  try {
    const result = await pool.query(
      `INSERT INTO pathways (key, label, icon, color, levels, projects)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [key, label, icon || '📚', color || '#888', JSON.stringify(levels || {}), JSON.stringify(projects || [])]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pathways/syllabus/:id — update a pathway
router.put('/syllabus/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { label, icon, color, levels, projects } = req.body;
  try {
    const result = await pool.query(
      `UPDATE pathways SET label=$1, icon=$2, color=$3, levels=$4, projects=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [label, icon || '📚', color || '#888', JSON.stringify(levels || {}), JSON.stringify(projects || []), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pathway not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pathways/syllabus/:id — delete a pathway
router.delete('/syllabus/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM pathways WHERE id=$1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pathway not found' });
    res.json({ message: 'Pathway deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pathways/structure — static fallback structure (kept for compatibility)
router.get('/structure', requireAuth, async (req, res) => {
  const structure = {
    scratch: { label:'Scratch Fundamentals', icon:'🐱', color:'#F7941D',
      levels:{ l1:'Introduction to Scratch', l2:'More Scratch', l3:'Further Scratch', optional_1:'Animation Deep Dive', optional_2:'Game Mechanics', optional_3:'Storytelling with Scratch' },
      projects:['Animation Project','Game Design','Storytelling App'] },
    web_design: { label:'Web Design', icon:'🌐', color:'#69A9C9',
      levels:{ l1:'Introduction to HTML', l2:'CSS Styling', l3:'Responsive Design', optional_1:'JavaScript Basics', optional_2:'Interactive Pages', optional_3:'Publishing Online' },
      projects:['School Website','Personal Portfolio','Community Page'] },
    python: { label:'Python Basics', icon:'🐍', color:'#1eb457',
      levels:{ l1:'Introduction to Python', l2:'Functions & Loops', l3:'Data & Logic', optional_1:'File Handling', optional_2:'APIs & Web', optional_3:'Mini Projects' },
      projects:['Calculator App','Data Dashboard','Simple Game'] },
    physical_computing: { label:'Physical Computing', icon:'🤖', color:'#9b59b6',
      levels:{ l1:'Introduction to Hardware', l2:'Sensors & Inputs', l3:'Building Projects', optional_1:'Advanced Circuits', optional_2:'3D Design', optional_3:'Robotics' },
      projects:['Sensor Project','LED Project','Mini Robot'] },
    digital_citizenship: { label:'Digital Citizenship', icon:'🛡️', color:'#1abc9c',
      levels:{ l1:'Online Safety', l2:'Digital Footprint', l3:'Community & Ethics', optional_1:'Privacy & Security', optional_2:'Media Literacy', optional_3:'Digital Rights' },
      projects:['Digital Safety Poster','Community Blog','Platformer Game'] },
    game_design: { label:'Game Design', icon:'🎮', color:'#e74c3c',
      levels:{ l1:'Game Concepts', l2:'Game Mechanics', l3:'Building & Testing', optional_1:'Level Design', optional_2:'Sound & Graphics', optional_3:'Publishing' },
      projects:['Platformer Game','Puzzle Game','Educational Quiz'] },
    ai_ml: { label:'AI & Machine Learning', icon:'🧠', color:'#f39c12',
      levels:{ l1:'What is AI?', l2:'Training Models', l3:'Building with AI', optional_1:'Image Recognition', optional_2:'Natural Language', optional_3:'AI Ethics' },
      projects:['Image Classifier','Chatbot','Prediction Model'] },
  };
  res.json(structure);
});

module.exports = router;