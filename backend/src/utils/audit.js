// Shared audit logging helper — called after every successful mutation
const pool = require('../db/index');

async function logAudit(req, action, tableName = null, recordId = null, details = null) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, table_name, record_id, details, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        req.user?.id || null,
        req.user?.full_name || req.user?.email || 'Unknown',
        req.user?.role || null,
        action,
        tableName,
        recordId ? String(recordId) : null,
        details,
        req.ip || req.headers['x-forwarded-for'] || null,
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logAudit };
