
// routes/profile.js — Public profile API
// GET /profile/:username  → xem profile của bất kỳ user nào (công khai)
// GET /profile/me/summary → xem profile của chính mình (cần đăng nhập)

const express        = require('express');
const router         = express.Router();
const db             = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { BADGES }     = require('../badges');


// Hàm lấy đầy đủ dữ liệu profile theo userId
// Dùng chung cho cả public và private endpoint
function buildProfile(userId, res) {

  //thông tin user
  db.get(
    `SELECT id, username, created_at FROM users WHERE id = ?`,
    [userId],
    (err, user) => {
      if (err)   return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

      //thống kê tổng + theo độ khó
      db.get(`
        SELECT
          COUNT(*)                                                          AS totalGames,
          COUNT(CASE WHEN result='won'  THEN 1 END)                        AS totalWins,
          COUNT(CASE WHEN result='lost' THEN 1 END)                        AS totalLosses,
          ROUND(COUNT(CASE WHEN result='won' THEN 1 END)*100.0/MAX(COUNT(*),1), 1) AS winRate,
          MIN(CASE WHEN result='won' AND difficulty='easy'   THEN time_seconds END) AS bestEasy,
          MIN(CASE WHEN result='won' AND difficulty='medium' THEN time_seconds END) AS bestMedium,
          MIN(CASE WHEN result='won' AND difficulty='hard'   THEN time_seconds END) AS bestHard,
          COUNT(CASE WHEN result='won' AND difficulty='easy'   THEN 1 END) AS winsEasy,
          COUNT(CASE WHEN result='won' AND difficulty='medium' THEN 1 END) AS winsMedium,
          COUNT(CASE WHEN result='won' AND difficulty='hard'   THEN 1 END) AS winsHard
        FROM game_history WHERE user_id = ?
      `, [userId], (err, stats) => {
        if (err) return res.status(500).json({ error: err.message });

        //10 ván gần nhất
        db.all(`
          SELECT difficulty, result, time_seconds, created_at
          FROM game_history
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 10
        `, [userId], (err, recent) => {
          if (err) return res.status(500).json({ error: err.message });

          //huy hiệu đã đạt
          db.all(`
            SELECT badge_id, earned_at
            FROM user_achievements
            WHERE user_id = ?
            ORDER BY earned_at ASC
          `, [userId], (err, earned) => {
            if (err) return res.status(500).json({ error: err.message });

            const earnedMap = {};
            earned.forEach(r => { earnedMap[r.badge_id] = r.earned_at; });

            //rank — thứ hạng best time easy
            db.get(`
              SELECT COUNT(*) + 1 AS rank
              FROM scores s2
              WHERE s2.difficulty = 'easy'
                AND s2.time_seconds < (
                  SELECT MIN(time_seconds) FROM scores
                  WHERE user_id = ? AND difficulty = 'easy'
                )
            `, [userId], (err, rankRow) => {

              const badges = BADGES.map(b => ({
                id:       b.id,
                name:     b.name,
                desc:     b.desc,
                icon:     b.icon,
                color:    b.color,
                earned:   !!earnedMap[b.id],
                earnedAt: earnedMap[b.id] || null
              }));

              res.json({
                user: {
                  id:          user.id,
                  username:    user.username,
                  memberSince: user.created_at,
                  rank:        rankRow ? rankRow.rank : null
                },
                stats: {
                  totalGames:  stats.totalGames  || 0,
                  totalWins:   stats.totalWins   || 0,
                  totalLosses: stats.totalLosses || 0,
                  winRate:     stats.winRate     || 0,
                  bestEasy:    stats.bestEasy    || null,
                  bestMedium:  stats.bestMedium  || null,
                  bestHard:    stats.bestHard    || null,
                  winsEasy:    stats.winsEasy    || 0,
                  winsMedium:  stats.winsMedium  || 0,
                  winsHard:    stats.winsHard    || 0,
                },
                badges: {
                  total:  BADGES.length,
                  earned: earned.length,
                  list:   badges
                },
                recentGames: recent
              });
            });
          });
        });
      });
    }
  );
}


// GET /profile/me/summary — profile của mình
router.get('/me/summary', authMiddleware, (req, res) => {
  buildProfile(req.user.id, res);
});


// GET /profile/:username — profile công khai theo username
router.get('/:username', (req, res) => {
  const username = req.params.username.trim();

  db.get(
    `SELECT id FROM users WHERE username = ? COLLATE NOCASE`,
    [username],
    (err, row) => {
      if (err)  return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: `Không tìm thấy user "${username}"` });
      buildProfile(row.id, res);
    }
  );
});


module.exports = router;
