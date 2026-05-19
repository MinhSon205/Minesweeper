const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const db = new sqlite3.Database(
  path.join(__dirname, 'minesweeper.db'),
  (err) => {
    if (err) console.error('Lỗi mở database:', err.message);
    else     console.log('✅ Kết nối SQLite thành công');
  }
);

db.serialize(() => {

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email    TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    player_name  TEXT    NOT NULL,
    difficulty   TEXT    NOT NULL,
    time_seconds INTEGER NOT NULL,
    created_at   TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS game_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    difficulty   TEXT    NOT NULL,
    result       TEXT    NOT NULL,
    time_seconds INTEGER,
    created_at   TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // ── Bảng MỚI: user_achievements ──
  // Lưu huy hiệu user đã đạt được.
  // Mỗi huy hiệu chỉ trao 1 lần (UNIQUE user_id + badge_id).
  db.run(`CREATE TABLE IF NOT EXISTS user_achievements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    badge_id   TEXT    NOT NULL,       -- ví dụ: 'first_win', 'speed_demon'
    earned_at  TEXT    DEFAULT (datetime('now')),
    UNIQUE(user_id, badge_id),         -- chống trao trùng
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`, (err) => {
    if (err) console.error('Lỗi tạo bảng:', err.message);
    else     console.log('✅ Tất cả bảng sẵn sàng');
  });

});

module.exports = db;
