// middleware/authMiddleware.js — Xác thực JWT token
// Gắn vào route nào cần đăng nhập: router.post('/', authMiddleware, handler)
// Nếu hợp lệ → req.user = { id, username }
// Nếu không   → trả 401 và dừng luôn, không chạy handler

const jwt = require('jsonwebtoken');

// Lấy cùng secret với auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'minesweeper_secret_key_2024';

function authMiddleware(req, res, next) {
  // Token nằm trong header: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Không có token xác thực' });
  }

  const token = authHeader.slice(7); // cắt bỏ "Bearer "

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username };
    next(); // hợp lệ → chạy tiếp route handler
  } catch (err) {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

module.exports = authMiddleware;
