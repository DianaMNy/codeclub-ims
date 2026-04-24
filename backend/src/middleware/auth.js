// src/middleware/auth.js
// The "bouncer" — checks every request for a valid JWT token

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  // 1. Get the token from the request header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  // 2. No token = not allowed in
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // 3. Verify the token is valid and not expired
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, mentor_id }
    next(); // ✅ Token is valid — let the request through
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Extra middleware — only allows admins through
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };