
// badges.js — Định nghĩa & Kiểm tra huy hiệu
const db = require('./db');

// DANH SÁCH HUY HIỆU
const BADGES = [
  {
    id:    'first_win',
    name:  'Bước đầu tiên',
    desc:  'Thắng ván đầu tiên',
    icon:  '🎯',
    color: '#1a3d2a',
    check: (s) => s.totalWins >= 1
  },
  {
    id:    'veteran',
    name:  'Cựu chiến binh',
    desc:  'Chơi 10 ván bất kỳ',
    icon:  '🎖️',
    color: '#2a2a1a',
    check: (s) => s.totalGames >= 10
  },
  {
    id:    'dedicated',
    name:  'Kiên trì',
    desc:  'Chơi 50 ván bất kỳ',
    icon:  '💪',
    color: '#1a2a3d',
    check: (s) => s.totalGames >= 50
  },
  {
    id:    'winner10',
    name:  'Chiến thắng vinh quang',
    desc:  'Thắng 10 ván',
    icon:  '🏆',
    color: '#3d2a00',
    check: (s) => s.totalWins >= 10
  },
  {
    id:    'winner50',
    name:  'Huyền thoại',
    desc:  'Thắng 50 ván',
    icon:  '👑',
    color: '#3d1a00',
    check: (s) => s.totalWins >= 50
  },
  {
    id:    'speed_easy',
    name:  'Tốc độ ánh sáng',
    desc:  'Thắng dễ trong dưới 60 giây',
    icon:  '⚡',
    color: '#2a1a3d',
    check: (s) => s.bestEasy !== null && s.bestEasy < 60
  },
  {
    id:    'speed_medium',
    name:  'Siêu tốc',
    desc:  'Thắng vừa trong dưới 120 giây',
    icon:  '🚀',
    color: '#1a2a3d',
    check: (s) => s.bestMedium !== null && s.bestMedium < 120
  },
  {
    id:    'speed_hard',
    name:  'Thần sấm',
    desc:  'Thắng khó trong dưới 200 giây',
    icon:  '⚡🔥',
    color: '#3d1a1a',
    check: (s) => s.bestHard !== null && s.bestHard < 200
  },
  {
    id:    'hard_first',
    name:  'Dũng cảm',
    desc:  'Thắng chế độ Khó lần đầu',
    icon:  '💀',
    color: '#2a1a1a',
    check: (s) => s.winsHard >= 1
  },
  {
    id:    'survivor',
    name:  'Sống sót',
    desc:  'Tỉ lệ thắng đạt 50% (tối thiểu 10 ván)',
    icon:  '🛡️',
    color: '#1a3a2a',
    check: (s) => s.totalGames >= 10 && s.winRate >= 50
  },
  {
    id:    'perfectionist',
    name:  'Cầu toàn',
    desc:  'Tỉ lệ thắng đạt 80% (tối thiểu 20 ván)',
    icon:  '💎',
    color: '#1a2a3d',
    check: (s) => s.totalGames >= 20 && s.winRate >= 80
  },
  {
    id:    'comeback',
    name:  'Không bỏ cuộc',
    desc:  'Thua 10 ván nhưng vẫn tiếp tục chơi',
    icon:  '🔥',
    color: '#3d2a1a',
    check: (s) => s.totalLosses >= 10 && s.totalWins >= 1
  }
];

// Export danh sách để dùng ở nơi khác (API trả về cho frontend)
module.exports.BADGES = BADGES;


// HÀM KIỂM TRA & TRAO HUY HIỆU

module.exports.checkAndAwardBadges = function(userId, callback) {

  //Lấy thống kê hiện tại của user
  db.get(`
    SELECT
      COUNT(*)                                        AS totalGames,
      COUNT(CASE WHEN result = 'won'  THEN 1 END)    AS totalWins,
      COUNT(CASE WHEN result = 'lost' THEN 1 END)    AS totalLosses,
      ROUND(COUNT(CASE WHEN result='won' THEN 1 END)*100.0/COUNT(*),1) AS winRate,
      MIN(CASE WHEN result='won' AND difficulty='easy'   THEN time_seconds END) AS bestEasy,
      MIN(CASE WHEN result='won' AND difficulty='medium' THEN time_seconds END) AS bestMedium,
      MIN(CASE WHEN result='won' AND difficulty='hard'   THEN time_seconds END) AS bestHard,
      COUNT(CASE WHEN result='won' AND difficulty='hard' THEN 1 END) AS winsHard
    FROM game_history
    WHERE user_id = ?
  `, [userId], (err, stats) => {
    if (err) return callback(err, []);

    //Lấy danh sách huy hiệu user ĐÃ CÓ
    db.all(`
      SELECT badge_id FROM user_achievements WHERE user_id = ?
    `, [userId], (err, existing) => {
      if (err) return callback(err, []);

      // Set các badge_id đã có để tra cứu nhanh O(1)
      const alreadyHas = new Set(existing.map(r => r.badge_id));

      //Lọc những huy hiệu đủ điều kiện mà chưa có
      const newBadges = BADGES.filter(badge =>
        !alreadyHas.has(badge.id) && badge.check(stats)
      );

      if (newBadges.length === 0) return callback(null, []);

      //Lưu huy hiệu mới vào DB
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO user_achievements (user_id, badge_id)
        VALUES (?, ?)
      `);

      newBadges.forEach(badge => stmt.run([userId, badge.id]));
      stmt.finalize();

      // Trả về thông tin đầy đủ của các huy hiệu mới
      callback(null, newBadges);
    });
  });
};
