const path             = require('path');
const express          = require('express');
const cors             = require('cors');

// Tải biến môi trường từ file .env (nếu có)
// Phải gọi trước khi require các module khác dùng process.env
require('dotenv').config();

const gameRouter       = require('./routes/game');
const lbRouter         = require('./routes/leaderboard');
const authRouter       = require('./routes/auth');
const statsRouter      = require('./routes/stats');
const achievRouter     = require('./routes/achievements');
const profileRouter    = require('./routes/profile');

const app  = express();
const PORT = process.env.PORT || 3000;  // ngrok/Railway/Render tự set PORT

// CORS: cho phép mọi origin để ngrok hoạt động
// Nếu muốn giới hạn: thay '*' bằng URL ngrok cụ thể
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth',         authRouter);
app.use('/game',         gameRouter);
app.use('/leaderboard',  lbRouter);
app.use('/stats',        statsRouter);
app.use('/achievements', achievRouter);
app.use('/profile',      profileRouter);  // ← thêm mới

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Minesweeper server đang chạy 🚀' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Lỗi server nội bộ' });
});

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});

