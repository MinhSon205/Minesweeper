
// routes/stats.js — API thống kê + tích hợp badge
const express              = require('express');
const router               = express.Router();
const db                   = require('../db');
const authMiddleware        = require('../middleware/authMiddleware');
const { checkAndAwardBadges } = require('../badges');


// POST /stats/save — Lưu kết quả ván + kiểm tra huy hiệu
// Trả về: { saved, newBadges } — newBadges để frontend hiện popup
router.post('/save', authMiddleware, (req, res) => {
  const { difficulty, result, timeSeconds } = req.body;
  const userId = req.user.id;

  if (!['easy','medium','hard'].includes(difficulty))
    return res.status(400).json({ error: 'Độ khó không hợp lệ' });
  if (!['won','lost'].includes(result))
    return res.status(400).json({ error: 'Kết quả không hợp lệ' });

  const time = result === 'won' ? timeSeconds : null;

  db.run(
    `INSERT INTO game_history (user_id, difficulty, result, time_seconds) VALUES (?, ?, ?, ?)`,
    [userId, difficulty, result, time],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      // Sau khi lưu ván xong → kiểm tra huy hiệu mới
      checkAndAwardBadges(userId, (err, newBadges) => {
        if (err) console.error('Lỗi check badge:', err.message);
        // Vẫn trả về kể cả khi badge lỗi
        res.status(201).json({
          saved:     true,
          newBadges: newBadges || []   // mảng huy hiệu mới (rỗng nếu không có)
        });
      });
    }
  );
});


// GET /stats/me
router.get('/me', authMiddleware, (req, res) => {
  getStatsForUser(req.user.id, res);
});


// GET /stats/:userId
router.get('/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ error: 'userId không hợp lệ' });
  getStatsForUser(userId, res);
});


function getStatsForUser(userId, res) {
  const overallSQL = `
    SELECT
      COUNT(*)                                                          AS total_games,
      COUNT(CASE WHEN result = 'won'  THEN 1 END)                      AS total_wins,
      COUNT(CASE WHEN result = 'lost' THEN 1 END)                      AS total_losses,
      ROUND(COUNT(CASE WHEN result='won' THEN 1 END)*100.0/COUNT(*),1) AS win_rate
    FROM game_history WHERE user_id = ?`;

  const byDiffSQL = `
    SELECT
      difficulty,
      COUNT(*)                                                          AS total_games,
      COUNT(CASE WHEN result='won'  THEN 1 END)                        AS wins,
      COUNT(CASE WHEN result='lost' THEN 1 END)                        AS losses,
      ROUND(COUNT(CASE WHEN result='won' THEN 1 END)*100.0/COUNT(*),1) AS win_rate,
      MIN(CASE WHEN result='won' THEN time_seconds END)                AS best_time
    FROM game_history WHERE user_id = ? GROUP BY difficulty`;

  const recentSQL = `
    SELECT difficulty, result, time_seconds, created_at
    FROM game_history WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 10`;

  const userSQL = `SELECT id, username, email, created_at FROM users WHERE id = ?`;

  db.get(userSQL, [userId], (err, user) => {
    if (err)   return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });

    db.get(overallSQL, [userId], (err, overall) => {
      if (err) return res.status(500).json({ error: err.message });

      db.all(byDiffSQL, [userId], (err, byDiff) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all(recentSQL, [userId], (err, recent) => {
          if (err) return res.status(500).json({ error: err.message });

          res.json({
            user: { id: user.id, username: user.username, memberSince: user.created_at },
            overall: {
              totalGames:  overall.total_games  || 0,
              totalWins:   overall.total_wins   || 0,
              totalLosses: overall.total_losses || 0,
              winRate:     overall.win_rate     || 0
            },
            byDifficulty: {
              easy:   byDiff.find(d => d.difficulty === 'easy')   || null,
              medium: byDiff.find(d => d.difficulty === 'medium') || null,
              hard:   byDiff.find(d => d.difficulty === 'hard')   || null,
            },
            recentGames: recent
          });
        });
      });
    });
  });
}

module.exports = router;
