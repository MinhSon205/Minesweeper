const express                  = require('express');
const router                   = express.Router();
const db                       = require('../db');
const authMiddleware           = require('../middleware/authMiddleware');
const { checkAndAwardBadges }  = require('../badges');

router.post('/save', authMiddleware, (req, res) => {
  const { difficulty, result, timeSeconds } = req.body;
  const userId = req.user.id;
  if (!['easy','medium','hard'].includes(difficulty)) return res.status(400).json({ error: 'Độ khó không hợp lệ' });
  if (!['won','lost'].includes(result))               return res.status(400).json({ error: 'Kết quả không hợp lệ' });
  try {
    const time = result === 'won' ? timeSeconds : null;
    db.prepare(`INSERT INTO game_history (user_id, difficulty, result, time_seconds) VALUES (?, ?, ?, ?)`).run(userId, difficulty, result, time);
    const newBadges = checkAndAwardBadges(userId);
    res.status(201).json({ saved: true, newBadges: newBadges || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, (req, res) => getStatsForUser(req.user.id, res));
router.get('/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ error: 'userId không hợp lệ' });
  getStatsForUser(userId, res);
});

function getStatsForUser(userId, res) {
  try {
    const user = db.prepare(`SELECT id, username, email, created_at FROM users WHERE id = ?`).get(userId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });

    const overall = db.prepare(`
      SELECT COUNT(*) AS total_games,
        COUNT(CASE WHEN result='won'  THEN 1 END) AS total_wins,
        COUNT(CASE WHEN result='lost' THEN 1 END) AS total_losses,
        ROUND(COUNT(CASE WHEN result='won' THEN 1 END)*100.0/MAX(COUNT(*),1),1) AS win_rate
      FROM game_history WHERE user_id = ?
    `).get(userId);

    const byDiff = db.prepare(`
      SELECT difficulty,
        COUNT(*) AS total_games,
        COUNT(CASE WHEN result='won'  THEN 1 END) AS wins,
        COUNT(CASE WHEN result='lost' THEN 1 END) AS losses,
        ROUND(COUNT(CASE WHEN result='won' THEN 1 END)*100.0/MAX(COUNT(*),1),1) AS win_rate,
        MIN(CASE WHEN result='won' THEN time_seconds END) AS best_time
      FROM game_history WHERE user_id = ? GROUP BY difficulty
    `).all(userId);

    const recent = db.prepare(`
      SELECT difficulty, result, time_seconds, created_at
      FROM game_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(userId);

    res.json({
      user: { id: user.id, username: user.username, memberSince: user.created_at },
      overall: { totalGames: overall.total_games||0, totalWins: overall.total_wins||0, totalLosses: overall.total_losses||0, winRate: overall.win_rate||0 },
      byDifficulty: {
        easy:   byDiff.find(d => d.difficulty === 'easy')   || null,
        medium: byDiff.find(d => d.difficulty === 'medium') || null,
        hard:   byDiff.find(d => d.difficulty === 'hard')   || null,
      },
      recentGames: recent
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = router;
