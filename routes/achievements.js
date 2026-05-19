
// routes/achievements.js — API huy hiệu
// GET /achievements/all  → danh sách tất cả huy hiệu (công khai)
// GET /achievements/me   → huy hiệu của mình (cần đăng nhập)

const express        = require('express');
const router         = express.Router();
const db             = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { BADGES }     = require('../badges');


// GET /achievements/all — Tất cả huy hiệu có thể đạt được
router.get('/all', (req, res) => {
  res.json(BADGES.map(b => ({
    id:    b.id,
    name:  b.name,
    desc:  b.desc,
    icon:  b.icon,
    color: b.color
  })));
});


// GET /achievements/me — Huy hiệu của user đang đăng nhập
// Trả về: tất cả huy hiệu + đánh dấu cái nào đã đạt (earned: true/false)
router.get('/me', authMiddleware, (req, res) => {
  db.all(`
    SELECT badge_id, earned_at
    FROM user_achievements
    WHERE user_id = ?
    ORDER BY earned_at ASC
  `, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Set để tra cứu nhanh
    const earnedMap = {};
    rows.forEach(r => { earnedMap[r.badge_id] = r.earned_at; });

    // Gộp định nghĩa huy hiệu với thông tin đã đạt chưa
    const result = BADGES.map(b => ({
      id:        b.id,
      name:      b.name,
      desc:      b.desc,
      icon:      b.icon,
      color:     b.color,
      earned:    !!earnedMap[b.id],          // true nếu đã có
      earnedAt:  earnedMap[b.id] || null     // thời điểm đạt được
    }));

    res.json({
      total:  BADGES.length,
      earned: rows.length,
      badges: result
    });
  });
});

module.exports = router;
