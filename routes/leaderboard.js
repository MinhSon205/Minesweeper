
// routes/leaderboard.js — API bảng xếp hạng

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// POST /leaderboard — Lưu điểm khi thắng
router.post('/', (req, res) => {
  const { playerName, difficulty, timeSeconds } = req.body;

  if (!playerName || playerName.trim() === '')
    return res.status(400).json({ error: 'Thiếu tên người chơi' });

  if (!['easy','medium','hard'].includes(difficulty))
    return res.status(400).json({ error: 'Độ khó không hợp lệ' });

  if (typeof timeSeconds !== 'number' || timeSeconds <= 0)
    return res.status(400).json({ error: 'Thời gian không hợp lệ' });

  // sqlite3 dùng callback thay vì return trực tiếp
  // ? là placeholder tránh SQL Injection
  db.run(
    `INSERT INTO scores (player_name, difficulty, time_seconds) VALUES (?, ?, ?)`,
    [playerName.trim(), difficulty, timeSeconds],
    function(err) {        // dùng function (không phải arrow) để có this.lastID
      if (err) return res.status(500).json({ error: err.message });

      // Lấy bản ghi vừa tạo theo ID
      db.get(
        `SELECT * FROM scores WHERE id = ?`,
        [this.lastID],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json(row);
        }
      );
    }
  );
});

// GET /leaderboard?difficulty=easy — Lấy top 10
router.get('/', (req, res) => {
  const { difficulty } = req.query;

  let sql    = `SELECT * FROM scores ORDER BY time_seconds ASC LIMIT 10`;
  let params = [];

  if (difficulty) {
    sql    = `SELECT * FROM scores WHERE difficulty = ? ORDER BY time_seconds ASC LIMIT 10`;
    params = [difficulty];
  }

  // db.all() lấy tất cả kết quả → trả về mảng
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
