const express        = require('express');
const router         = express.Router();
const db             = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { BADGES }     = require('../badges');

router.get('/all', (req, res) => {
  res.json(BADGES.map(b => ({ id: b.id, name: b.name, desc: b.desc, icon: b.icon, color: b.color })));
});

router.get('/me', authMiddleware, (req, res) => {
  try {
    const rows      = db.prepare(`SELECT badge_id, earned_at FROM user_achievements WHERE user_id = ? ORDER BY earned_at ASC`).all(req.user.id);
    const earnedMap = {};
    rows.forEach(r => { earnedMap[r.badge_id] = r.earned_at; });
    const result = BADGES.map(b => ({
      id: b.id, name: b.name, desc: b.desc, icon: b.icon, color: b.color,
      earned: !!earnedMap[b.id], earnedAt: earnedMap[b.id] || null
    }));
    res.json({ total: BADGES.length, earned: rows.length, badges: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
