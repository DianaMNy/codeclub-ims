// src/routes/auth.js
// Handles login for admins and mentors

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/index');

// ── POST /api/auth/login ─────────────────────────────────────
// Body: { email, password }
// Returns: { token, user: { id, full_name, role, mentor_id } }

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // 2. Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // 3. Check password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 4. Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role, mentor_id: user.mentor_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Send back token + safe user info (never send password_hash!)
    res.json({
      token,
      user: {
        id:        user.id,
        full_name: user.full_name,
        email:     user.email,
        role:      user.role,
        mentor_id: user.mentor_id,
      }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;