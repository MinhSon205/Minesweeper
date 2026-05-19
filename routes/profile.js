const express        = require('express');
const router         = express.Router();
const db             = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { BADGES }     = require('../badges');

function buildProfile(userId, res) {
  try {
    const user = db.prepare(`SELECT id, username, created_at FROM users WHERE id = ?`).get(userId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    const stats = db.prepare(`
      SELECT COUNT(*) AS totalGames,
        COUNT(CASE WHEN result='won'  THEN 1 END) AS totalWins,
        COUNT(CASE WHEN result='lost' THEN 1 END) AS totalLosses,
        ROUND(COUNT(CASE WHEN result='won' THEN 1 END)*100.0/MAX(COUNT(*),1),1) AS winRate,
        MIN(CASE WHEN result='won' AND difficulty='easy'   THEN time_seconds END) AS bestEasy,
        MIN(CASE WHEN result='won' AND difficulty='medium' THEN time_seconds END) AS bestMedium,
        MIN(CASE WHEN result='won' AND difficulty='hard'   THEN time_seconds END) AS bestHard,
        COUNT(CASE WHEN result='won' AND difficulty='easy'   THEN 1 END) AS winsEasy,
        COUNT(CASE WHEN result='won' AND difficulty='medium' THEN 1 END) AS winsMedium,
        COUNT(CASE WHEN result='won' AND difficulty='hard'   THEN 1 END) AS winsHard
      FROM game_history WHERE user_id = ?
    `).get(userId);

    const recent = db.prepare(`
      SELECT difficulty, result, time_seconds, created_at
      FROM game_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(userId);

    const earned    = db.prepare(`SELECT badge_id, earned_at FROM user_achievements WHERE user_id = ? ORDER BY earned_at ASC`).all(userId);
    const earnedMap = {};
    earned.forEach(r => { earnedMap[r.badge_id] = r.earned_at; });

    const rankRow = db.prepare(`
      SELECT COUNT(*) + 1 AS rank FROM scores s2
      WHERE s2.difficulty = 'easy' AND s2.time_seconds < (
        SELECT MIN(time_seconds) FROM scores WHERE user_id = ? AND difficulty = 'easy'
      )
    `).get(userId);

    const badges = BADGES.map(b => ({
      id: b.id, name: b.name, desc: b.desc, icon: b.icon, color: b.color,
      earned: !!earnedMap[b.id], earnedAt: earnedMap[b.id] || null
    }));

    res.json({
      user: { id: user.id, username: user.username, memberSince: user.created_at, rank: rankRow ? rankRow.rank : null },
      stats: {
        totalGames: stats.totalGames||0, totalWins: stats.totalWins||0, totalLosses: stats.totalLosses||0,
        winRate: stats.winRate||0, bestEasy: stats.bestEasy||null, bestMedium: stats.bestMedium||null,
        bestHard: stats.bestHard||null, winsEasy: stats.winsEasy||0, winsMedium: stats.winsMedium||0, winsHard: stats.winsHard||0,
      },
      badges: { total: BADGES.length, earned: earned.length, list: badges },
      recentGames: recent
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.get('/me/summary', authMiddleware, (req, res) => buildProfile(req.user.id, res));
router.get('/:username', (req, res) => {
  try {
    const row = db.prepare(`SELECT id FROM users WHERE username = ? COLLATE NOCASE`).get(req.params.username.trim());
    if (!row) return res.status(404).json({ error: `Không tìm thấy user "${req.params.username}"` });
    buildProfile(row.id, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
