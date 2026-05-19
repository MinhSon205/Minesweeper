
// routes/leaderboard.js — Bảng xếp hạng
// GET  /leaderboard?difficulty=easy  → lấy top 10
// POST /leaderboard                  → lưu điểm (cần đăng nhập)

const express        = require('express');
const router         = express.Router();
const db             = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// GET /leaderboard — Công khai, ai cũng xem được
router.get('/', (req, res) => {
  const { difficulty } = req.query;

  let sql    = `
    SELECT s.id, s.player_name, s.difficulty, s.time_seconds, s.created_at,
           u.username
    FROM scores s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.time_seconds ASC
    LIMIT 10
  `;
  let params = [];

  if (difficulty) {
    sql = `
      SELECT s.id, s.player_name, s.difficulty, s.time_seconds, s.created_at,
             u.username
      FROM scores s
      JOIN users u ON s.user_id = u.id
      WHERE s.difficulty = ?
      ORDER BY s.time_seconds ASC
      LIMIT 10
    `;
    params = [difficulty];
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /leaderboard — Phải đăng nhập mới lưu được
// authMiddleware chạy trước, kiểm tra token
// Nếu hợp lệ → req.user có { id, username }
router.post('/', authMiddleware, (req, res) => {
  const { difficulty, timeSeconds } = req.body;
  const userId     = req.user.id;
  const playerName = req.user.username;

  if (!['easy','medium','hard'].includes(difficulty))
    return res.status(400).json({ error: 'Độ khó không hợp lệ' });

  if (typeof timeSeconds !== 'number' || timeSeconds <= 0)
    return res.status(400).json({ error: 'Thời gian không hợp lệ' });

  db.run(
    `INSERT INTO scores (user_id, player_name, difficulty, time_seconds) VALUES (?, ?, ?, ?)`,
    [userId, playerName, difficulty, timeSeconds],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      db.get(`SELECT * FROM scores WHERE id = ?`, [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(row);
      });
    }
  );
});

module.exports = router;
