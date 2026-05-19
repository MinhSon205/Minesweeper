// badges.js — Định nghĩa & Kiểm tra huy hiệu
const db = require('./db');

const BADGES = [
  { id: 'first_win',    name: 'Bước đầu tiên',        desc: 'Thắng ván đầu tiên',                     icon: '🎯',   color: '#1a3d2a', check: s => s.totalWins >= 1 },
  { id: 'veteran',      name: 'Cựu chiến binh',        desc: 'Chơi 10 ván bất kỳ',                     icon: '🎖️',  color: '#2a2a1a', check: s => s.totalGames >= 10 },
  { id: 'dedicated',    name: 'Kiên trì',               desc: 'Chơi 50 ván bất kỳ',                     icon: '💪',   color: '#1a2a3d', check: s => s.totalGames >= 50 },
  { id: 'winner10',     name: 'Chiến thắng vinh quang', desc: 'Thắng 10 ván',                           icon: '🏆',   color: '#3d2a00', check: s => s.totalWins >= 10 },
  { id: 'winner50',     name: 'Huyền thoại',            desc: 'Thắng 50 ván',                           icon: '👑',   color: '#3d1a00', check: s => s.totalWins >= 50 },
  { id: 'speed_easy',   name: 'Tốc độ ánh sáng',       desc: 'Thắng dễ trong dưới 60 giây',             icon: '⚡',   color: '#2a1a3d', check: s => s.bestEasy   !== null && s.bestEasy   < 60 },
  { id: 'speed_medium', name: 'Siêu tốc',               desc: 'Thắng vừa trong dưới 120 giây',           icon: '🚀',   color: '#1a2a3d', check: s => s.bestMedium !== null && s.bestMedium < 120 },
  { id: 'speed_hard',   name: 'Thần sấm',               desc: 'Thắng khó trong dưới 200 giây',           icon: '⚡🔥', color: '#3d1a1a', check: s => s.bestHard   !== null && s.bestHard   < 200 },
  { id: 'hard_first',   name: 'Dũng cảm',               desc: 'Thắng chế độ Khó lần đầu',               icon: '💀',   color: '#2a1a1a', check: s => s.winsHard >= 1 },
  { id: 'survivor',     name: 'Sống sót',               desc: 'Tỉ lệ thắng đạt 50% (tối thiểu 10 ván)', icon: '🛡️',  color: '#1a3a2a', check: s => s.totalGames >= 10 && s.winRate >= 50 },
  { id: 'perfectionist',name: 'Cầu toàn',               desc: 'Tỉ lệ thắng đạt 80% (tối thiểu 20 ván)', icon: '💎',   color: '#1a2a3d', check: s => s.totalGames >= 20 && s.winRate >= 80 },
  { id: 'comeback',     name: 'Không bỏ cuộc',          desc: 'Thua 10 ván nhưng vẫn tiếp tục chơi',    icon: '🔥',   color: '#3d2a1a', check: s => s.totalLosses >= 10 && s.totalWins >= 1 },
];

module.exports.BADGES = BADGES;

module.exports.checkAndAwardBadges = function(userId) {
  const stats = db.prepare(`
    SELECT
      COUNT(*)                                                                AS totalGames,
      COUNT(CASE WHEN result='won'  THEN 1 END)                              AS totalWins,
      COUNT(CASE WHEN result='lost' THEN 1 END)                              AS totalLosses,
      ROUND(COUNT(CASE WHEN result='won' THEN 1 END)*100.0/MAX(COUNT(*),1),1) AS winRate,
      MIN(CASE WHEN result='won' AND difficulty='easy'   THEN time_seconds END) AS bestEasy,
      MIN(CASE WHEN result='won' AND difficulty='medium' THEN time_seconds END) AS bestMedium,
      MIN(CASE WHEN result='won' AND difficulty='hard'   THEN time_seconds END) AS bestHard,
      COUNT(CASE WHEN result='won' AND difficulty='hard' THEN 1 END)         AS winsHard
    FROM game_history WHERE user_id = ?
  `).get(userId);

  const existing   = db.prepare(`SELECT badge_id FROM user_achievements WHERE user_id = ?`).all(userId);
  const alreadyHas = new Set(existing.map(r => r.badge_id));
  const newBadges  = BADGES.filter(b => !alreadyHas.has(b.id) && b.check(stats));

  if (newBadges.length > 0) {
    const insert = db.prepare(`INSERT OR IGNORE INTO user_achievements (user_id, badge_id) VALUES (?, ?)`);
    db.transaction(badges => { for (const b of badges) insert.run(userId, b.id); })(newBadges);
  }

  return newBadges;
};
