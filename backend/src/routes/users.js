// src/routes/users.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const bcrypt = require('bcryptjs');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Add teacher_id column if it doesn't exist yet
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_id INTEGER`)
  .catch(err => console.error('users teacher_id migration:', err.message));

// GET /api/users — all users (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.role,
             u.is_active, u.created_at, u.mentor_id, u.teacher_id,
             m.full_name AS mentor_name
      FROM users u
      LEFT JOIN mentors m ON u.mentor_id = m.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users — create user (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { full_name, email, password, role, mentor_id, teacher_id } = req.body;
  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, mentor_id, teacher_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, full_name, email, role, teacher_id`,
      [full_name, email.toLowerCase(), hash, role, mentor_id || null, teacher_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id — edit user details (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { full_name, email, role, mentor_id } = req.body;
  if (!full_name || !email || !role) {
    return res.status(400).json({ error: 'Full name, email and role are required' });
  }
  try {
    const result = await pool.query(
      `UPDATE users SET
        full_name = $1,
        email     = $2,
        role      = $3,
        mentor_id = $4
       WHERE id = $5
       RETURNING id, full_name, email, role, is_active`,
      [full_name, email.toLowerCase(), role, mentor_id || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id — delete user (admin only, cannot delete self)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/users/:id/toggle — activate/deactivate
router.patch('/:id/toggle', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, full_name, is_active`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/users/:id/reset-password
router.patch('/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;