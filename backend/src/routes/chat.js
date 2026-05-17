// src/routes/chat.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

// Create table on startup if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id              SERIAL PRIMARY KEY,
    room_key        VARCHAR(100) NOT NULL,
    county          VARCHAR(50),
    subcounty       VARCHAR(50),
    sender_id       INTEGER,
    sender_name     VARCHAR(100),
    sender_role     VARCHAR(50),
    message         TEXT,
    attachment_url  TEXT,
    attachment_name VARCHAR(255),
    attachment_type VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
  )
`).then(() =>
  pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_room_created ON chat_messages(room_key, created_at)`)
).catch(err => console.error('Chat table init error:', err.message));

// GET /rooms — list active rooms with summary
router.get('/rooms', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      WITH latest AS (
        SELECT DISTINCT ON (room_key)
          room_key, county, subcounty,
          sender_name AS last_sender,
          COALESCE(NULLIF(message, ''), '[attachment]') AS last_message,
          created_at AS last_message_at
        FROM chat_messages
        ORDER BY room_key, created_at DESC
      ),
      counts AS (
        SELECT room_key, COUNT(*) AS message_count
        FROM chat_messages
        GROUP BY room_key
      )
      SELECT l.*, c.message_count
      FROM latest l
      JOIN counts c ON l.room_key = c.room_key
      ORDER BY l.last_message_at DESC
    `);
    res.json({ rooms: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:roomKey — messages in a room, optionally since a timestamp
router.get('/:roomKey', requireAuth, async (req, res) => {
  try {
    const { roomKey } = req.params;
    const since = req.query.since;
    const result = since
      ? await pool.query(
          `SELECT * FROM chat_messages WHERE room_key = $1 AND created_at > $2 ORDER BY created_at ASC`,
          [roomKey, since]
        )
      : await pool.query(
          `SELECT * FROM chat_messages WHERE room_key = $1 ORDER BY created_at ASC LIMIT 100`,
          [roomKey]
        );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /:roomKey — send a message
router.post('/:roomKey', requireAuth, async (req, res) => {
  try {
    const { roomKey } = req.params;
    const { message, attachment_url, attachment_name, attachment_type, county, subcounty } = req.body;

    if (!message?.trim() && !attachment_url) {
      return res.status(400).json({ error: 'Message or attachment required' });
    }

    // full_name is not in the JWT — fetch from users table
    const userRow = await pool.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
    const sender_name = userRow.rows[0]?.full_name || 'Unknown';

    const result = await pool.query(
      `INSERT INTO chat_messages
       (room_key, county, subcounty, sender_id, sender_name, sender_role,
        message, attachment_url, attachment_name, attachment_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [roomKey, county || null, subcounty || null,
       req.user.id, sender_name, req.user.role,
       message?.trim() || null, attachment_url || null, attachment_name || null, attachment_type || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id — delete own message, admin can delete any
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const msg = await pool.query('SELECT sender_id FROM chat_messages WHERE id = $1', [req.params.id]);
    if (!msg.rows.length) return res.status(404).json({ error: 'Message not found' });
    if (req.user.role !== 'admin' && msg.rows[0].sender_id !== req.user.id) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }
    await pool.query('DELETE FROM chat_messages WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
