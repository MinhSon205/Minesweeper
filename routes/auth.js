
// routes/auth.js — Đăng ký & Đăng nhập

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

// Secret key lấy từ biến môi trường (.env)
// Fallback giữ lại để dev chạy được ngay mà không cần .env
const JWT_SECRET = process.env.JWT_SECRET || 'minesweeper_secret_key_2024';



// ENDPOINT 1: POST /auth/register
// Tạo tài khoản mới
// Client gửi: { username, email, password }
// Server trả: { token, user: { id, username, email } }

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // ── Validate ──
  if (!username || username.trim().length < 3)
    return res.status(400).json({ error: 'Tên người dùng phải có ít nhất 3 ký tự' });

  if (!email || !email.includes('@'))
    return res.status(400).json({ error: 'Email không hợp lệ' });

  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });

  // ── Hash mật khẩu ──

  const hashedPassword = await bcrypt.hash(password.trim(), 10);

  db.run(
    `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
    [username.trim(), email.trim().toLowerCase(), hashedPassword],
    function(err) {
      if (err) {
        // UNIQUE constraint: username hoặc email đã tồn tại
        if (err.message.includes('UNIQUE'))
          return res.status(409).json({ error: 'Tên người dùng hoặc email đã tồn tại' });
        return res.status(500).json({ error: 'Lỗi server' });
      }

      const userId = this.lastID;

      // ── Tạo JWT token ──
    
      const token = jwt.sign(
        { id: userId, username: username.trim() },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: { id: userId, username: username.trim(), email: email.trim() }
      });
    }
  );
});



// ENDPOINT 2: POST /auth/login
// Đăng nhập
// Client gửi: { email, password }
// Server trả: { token, user: { id, username, email } }

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Thiếu email hoặc mật khẩu' });

  // Tìm user theo email
  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email.trim().toLowerCase()],
    async (err, user) => {
      if (err)   return res.status(500).json({ error: 'Lỗi server' });
      if (!user) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

      // So sánh mật khẩu nhập vào với hash trong database
      // bcrypt.compare() tự động hash rồi so sánh
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

      // Tạo token mới
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email }
      });
    }
  );
});


module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
