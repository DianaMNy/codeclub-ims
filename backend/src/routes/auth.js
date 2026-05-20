// src/routes/auth.js
// Handles login for admins and mentors

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Resend } = require('resend');
const pool = require('../db/index');
const { logAudit } = require('../utils/audit');

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
    req.user = { id: user.id, full_name: user.full_name, email: user.email, role: user.role };
    await logAudit(req, 'LOGIN', 'users', user.id, `${user.full_name || user.email} logged in`);
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

// ── POST /api/auth/forgot-password ──────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );

    // Always return 200 — don't reveal whether email exists
    if (result.rows.length === 0) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Code Club IMS <noreply@empservekenya.org>',
      to: user.email,
      subject: 'Reset your Code Club IMS password',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="background:#1a2332;padding:28px 40px;text-align:center;">
                    <p style="margin:0;font-size:13px;color:#1eb457;font-weight:700;letter-spacing:1px;text-transform:uppercase;">EmpServe Kenya</p>
                    <h1 style="margin:4px 0 0;font-size:22px;font-weight:700;color:#ffffff;">Code Club IMS</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <p style="margin:0 0 16px;font-size:15px;color:#1a2332;">Hi <strong>${user.full_name || user.email}</strong>,</p>
                    <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.6;">
                      We received a request to reset your password for your Code Club IMS account.
                      Click the button below to choose a new password.
                    </p>
                    <div style="text-align:center;margin:0 0 28px;">
                      <a href="${resetUrl}"
                         style="display:inline-block;background:#1eb457;color:#ffffff;text-decoration:none;
                                padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">
                        Reset My Password
                      </a>
                    </div>
                    <p style="margin:0 0 8px;font-size:13px;color:#888;">⏱ This link expires in <strong>1 hour</strong>.</p>
                    <p style="margin:0;font-size:13px;color:#888;">
                      If you did not request a password reset, you can safely ignore this email.
                      Your password will not be changed.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:12px;color:#aaa;">
                      © 2026 EmpServe Kenya · <a href="https://empservekenya.org" style="color:#1eb457;text-decoration:none;">empservekenya.org</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// ── GET /api/auth/reset-password/:token ─────────────────────
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const result = await pool.query(
      `SELECT prt.*, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    res.json({ valid: true, email: result.rows[0].email });
  } catch (err) {
    console.error('Verify token error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/reset-password ───────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  try {
    const result = await pool.query(
      `SELECT prt.*, u.email, u.full_name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const { user_id, email, full_name } = result.rows[0];
    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE token = $1', [token]);

    req.user = { id: user_id, full_name, email, role: null };
    await logAudit(req, 'PASSWORD_RESET', 'users', user_id, `Password reset for ${email}`);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;