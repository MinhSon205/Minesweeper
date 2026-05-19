const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'minesweeper_secret_key_2024';

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || username.trim().length < 3) return res.status(400).json({ error: 'Tên người dùng phải có ít nhất 3 ký tự' });
  if (!email || !email.includes('@'))          return res.status(400).json({ error: 'Email không hợp lệ' });
  if (!password || password.length < 6)        return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
  try {
    const hashed = await bcrypt.hash(password.trim(), 10);
    const info   = db.prepare(`INSERT INTO users (username, email, password) VALUES (?, ?, ?)`).run(username.trim(), email.trim().toLowerCase(), hashed);
    const token  = jwt.sign({ id: info.lastInsertRowid, username: username.trim() }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: info.lastInsertRowid, username: username.trim(), email: email.trim() } });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Tên người dùng hoặc email đã tồn tại' });
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Thiếu email hoặc mật khẩu' });
  try {
    const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.trim().toLowerCase());
    if (!user) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
