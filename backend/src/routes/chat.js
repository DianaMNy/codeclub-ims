// backend/src/routes/chat.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');

const SUBCOUNTIES = {
  'Kiambu': ['Githurai','Kahawa West','Wendani','Ruiru','Thika','Juja','Ngoigwa','Kiandutu','Kiambu Town','Limuru','Kikuyu','Tigoni','Mugutha'],
  'Kajiado': ['Ngong','Kitengela','Rongai','Kiserian','Kajiado Town','Isinya','Loitokitok','Namanga','Overall'],
  "Murang'a": ['Muranga East','Kahuro','Kangema','Kigumo','Maragua','Mathioya'],
};

// GET /api/chat/rooms — list all rooms with unread counts
router.get('/rooms', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT room_key, county, subcounty,
        COUNT(*) AS message_count,
        MAX(created_at) AS last_message_at,
        (SELECT message FROM chat_messages cm2 WHERE cm2.room_key = cm.room_key ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT sender_name FROM chat_messages cm3 WHERE cm3.room_key = cm.room_key ORDER BY created_at DESC LIMIT 1) AS last_sender
      FROM chat_messages cm
      GROUP BY room_key, county, subcounty
      ORDER BY MAX(created_at) DESC
    `);
    res.json({ rooms: result.rows, subcounties: SUBCOUNTIES });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// GET /api/chat/:roomKey — get messages for a room
router.get('/:roomKey', requireAuth, async (req, res) => {
  try {
    const { roomKey } = req.params;
    const since = req.query.since; // ISO timestamp for polling
    let query, params;
    if (since) {
      query = `SELECT * FROM chat_messages WHERE room_key=$1 AND created_at > $2 ORDER BY created_at ASC`;
      params = [roomKey, since];
    } else {
      query = `SELECT * FROM chat_messages WHERE room_key=$1 ORDER BY created_at ASC LIMIT 100`;
      params = [roomKey];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// POST /api/chat/:roomKey — send message
router.post('/:roomKey', requireAuth, async (req, res) => {
  try {
    const { roomKey } = req.params;
    const { message, attachment_url, attachment_name, attachment_type } = req.body;
    const { id: sender_id, full_name, role } = req.user;

    if (!message?.trim() && !attachment_url) {
      return res.status(400).json({ error: 'Message or attachment required' });
    }

    // Parse room key to get county/subcounty
    const [county, ...subParts] = roomKey.split('_');
    const subcounty = subParts.join(' ');

    const result = await pool.query(`
      INSERT INTO chat_messages
        (room_key, county, subcounty, sender_id, sender_name, sender_role, message, attachment_url, attachment_name, attachment_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      roomKey,
      county,
      subcounty,
      sender_id,
      full_name || req.user.email || 'User',
      role,
      message?.trim() || '',
      attachment_url || null,
      attachment_name || null,
      attachment_type || null,
    ]);
    res.status(201).json(result.rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/chat/:id — delete own message (admin can delete any)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const msg = await pool.query('SELECT * FROM chat_messages WHERE id=$1', [req.params.id]);
    if (!msg.rows.length) return res.status(404).json({ error: 'Message not found' });
    if (role !== 'admin' && msg.rows[0].sender_id !== userId) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }
    await pool.query('DELETE FROM chat_messages WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.SUBCOUNTIES = SUBCOUNTIES;