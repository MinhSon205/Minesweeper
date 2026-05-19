const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'minesweeper_secret_key_2024';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ error: 'Không có token xác thực' });
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username };
    next();
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

module.exports = authMiddleware;
