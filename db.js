const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, 'minesweeper.db'));

// Bật WAL mode để tăng hiệu suất
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    email      TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scores (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    player_name  TEXT    NOT NULL,
    difficulty   TEXT    NOT NULL,
    time_seconds INTEGER NOT NULL,
    created_at   TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS game_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    difficulty   TEXT    NOT NULL,
    result       TEXT    NOT NULL,
    time_seconds INTEGER,
    created_at   TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_achievements (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL,
    badge_id  TEXT    NOT NULL,
    earned_at TEXT    DEFAULT (datetime('now')),
    UNIQUE(user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

console.log('✅ Kết nối SQLite thành công');

module.exports = db;
