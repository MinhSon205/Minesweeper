const express        = require('express');
const router         = express.Router();
const db             = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', (req, res) => {
  try {
    const { difficulty } = req.query;
    let rows;
    if (difficulty) {
      rows = db.prepare(`
        SELECT s.id, s.player_name, s.difficulty, s.time_seconds, s.created_at, u.username
        FROM scores s JOIN users u ON s.user_id = u.id
        WHERE s.difficulty = ? ORDER BY s.time_seconds ASC LIMIT 10
      `).all(difficulty);
    } else {
      rows = db.prepare(`
        SELECT s.id, s.player_name, s.difficulty, s.time_seconds, s.created_at, u.username
        FROM scores s JOIN users u ON s.user_id = u.id
        ORDER BY s.time_seconds ASC LIMIT 10
      `).all();
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, (req, res) => {
  const { difficulty, timeSeconds } = req.body;
  if (!['easy','medium','hard'].includes(difficulty)) return res.status(400).json({ error: 'Độ khó không hợp lệ' });
  if (typeof timeSeconds !== 'number' || timeSeconds <= 0) return res.status(400).json({ error: 'Thời gian không hợp lệ' });
  try {
    const info = db.prepare(`INSERT INTO scores (user_id, player_name, difficulty, time_seconds) VALUES (?, ?, ?, ?)`).run(req.user.id, req.user.username, difficulty, timeSeconds);
    const row  = db.prepare(`SELECT * FROM scores WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
