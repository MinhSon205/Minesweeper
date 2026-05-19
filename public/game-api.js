// API được khai báo trong config.js (window.location.origin)
const token = localStorage.getItem('token');
const user  = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user) window.location.href = 'auth.html';


// BIẾN TRẠNG THÁI
let currentGameId     = null;
let currentDifficulty = 'easy';
let timerID           = null;
let seconds           = 0;
let mines             = 10;
let flagCount         = 0;
let isGameOver        = false; // chặn click sau khi thắng/thua


// GỌI API
async function callAPI(path, method = 'GET', body = null, needAuth = false) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (needAuth) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(API + path, options);
    const data     = await response.json();
    if (!response.ok) { if (response.status === 401) logout(); return null; }
    return data;
  } catch {
    showStatus('❌ Không kết nối được server', 'lose');
    return null;
  }
}


// KHỞI TẠO GIAO DIỆN USER
function initUserUI() {
  const wrapper = document.querySelector('.game-wrapper');
  const bar = document.createElement('div');
  bar.id = 'user-bar';
  bar.innerHTML = `
    <span>👤 <strong>${user.username}</strong></span>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button onclick="showLeaderboardModal()" class="ui-btn">🏆 Bảng điểm</button>
      <button onclick="window.location.href='stats.html'" class="ui-btn">📊 Thống kê</button>
      <button onclick="window.location.href='leaderboard.html'" class="ui-btn">📋 Xếp hạng</button>
      <button onclick="logout()" class="ui-btn" style="color:#e94560">Đăng xuất</button>
    </div>`;
  wrapper.insertBefore(bar, wrapper.firstChild);

  const style = document.createElement('style');
  style.textContent = `
    #user-bar { display:flex; align-items:center; justify-content:space-between; width:100%; max-width:600px; background:#16213e; border:1px solid #0f3460; border-radius:10px; padding:8px 16px; font-size:13px; color:#aaa; gap:12px; flex-wrap:wrap; }
    .ui-btn { padding:5px 12px; border:1px solid #0f3460; border-radius:16px; background:transparent; color:#aaa; cursor:pointer; font-size:12px; transition:all 0.2s; }
    .ui-btn:hover { border-color:#e94560; color:#e94560; }
    #lb-modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:100; align-items:center; justify-content:center; }
    #lb-modal.show { display:flex; }
    #lb-modal-box { background:#16213e; border:1px solid #0f3460; border-radius:12px; padding:24px; width:360px; max-height:80vh; overflow-y:auto; }
    #lb-modal-box h3 { color:#e94560; margin-bottom:16px; font-size:16px; }
    .lb-item { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #0f3460; font-size:13px; }
    .lb-item:last-child { border-bottom:none; }
    .lb-rank { width:28px; color:#888; }
    .lb-name { flex:1; color:#e0e0e0; }
    .lb-time { color:#e94560; font-weight:bold; font-family:monospace; }
    .modal-close { width:100%; margin-top:14px; padding:8px; background:#0f3460; border:none; border-radius:8px; color:#aaa; cursor:pointer; }
    .lb-diff-tabs { display:flex; gap:6px; margin-bottom:14px; }
    .lb-diff-tab { padding:4px 12px; border:1px solid #0f3460; border-radius:12px; background:transparent; color:#666; cursor:pointer; font-size:12px; }
    .lb-diff-tab.active { background:#e94560; border-color:#e94560; color:white; }
  `;
  document.head.appendChild(style);

  const modal = document.createElement('div');
  modal.id = 'lb-modal';
  modal.innerHTML = `
    <div id="lb-modal-box">
      <h3>🏆 Bảng xếp hạng</h3>
      <div class="lb-diff-tabs">
        <button class="lb-diff-tab active" onclick="loadModalLB('easy',this)">🟢 Dễ</button>
        <button class="lb-diff-tab" onclick="loadModalLB('medium',this)">🟡 Vừa</button>
        <button class="lb-diff-tab" onclick="loadModalLB('hard',this)">🔴 Khó</button>
      </div>
      <div id="lb-modal-body">Đang tải...</div>
      <button class="modal-close" onclick="closeModal()">Đóng</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
}


// MODAL BẢNG ĐIỂM
async function showLeaderboardModal() {
  document.getElementById('lb-modal').classList.add('show');
  loadModalLB(currentDifficulty);
  document.querySelectorAll('.lb-diff-tab').forEach((btn, i) => {
    btn.classList.toggle('active', ['easy','medium','hard'][i] === currentDifficulty);
  });
}

async function loadModalLB(difficulty, btn) {
  if (btn) {
    document.querySelectorAll('.lb-diff-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const body = document.getElementById('lb-modal-body');
  body.textContent = 'Đang tải...';
  const data = await callAPI(`/leaderboard?difficulty=${difficulty}`);
  if (!data || data.length === 0) {
    body.innerHTML = '<div style="color:#555;padding:12px 0">Chưa có điểm nào</div>';
    return;
  }
  const icons = ['🥇','🥈','🥉'];
  body.innerHTML = data.map((s, i) => `
    <div class="lb-item">
      <div class="lb-rank">${icons[i] || (i+1)}</div>
      <div class="lb-name">${escapeHtml(s.player_name)}</div>
      <div class="lb-time">${s.time_seconds}s</div>
    </div>`).join('');
}

function closeModal() { document.getElementById('lb-modal').classList.remove('show'); }
function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = 'auth.html'; }


// BẮT ĐẦU GAME MỚI
async function startGame() {
  // Reset cờ game over — cho phép click trở lại
  isGameOver = false;

  clearInterval(timerID);
  seconds = 0; flagCount = 0;
  document.getElementById('timer-display').textContent = '0';
  document.getElementById('reset-btn').textContent     = '😊';
  document.getElementById('status-msg').textContent    = '';
  document.getElementById('status-msg').className      = 'status-msg';
  document.getElementById('board').innerHTML           = '';

  const data = await callAPI('/game/new', 'POST', { difficulty: currentDifficulty });
  if (!data) return;

  currentGameId = data.gameId;
  mines         = data.mines;
  document.getElementById('mine-display').textContent = mines;
  renderBoard(data.board);
}


// CLICK TRÁI — Mở ô
async function handleLeftClick(row, col) {
  // Chặn click nếu game chưa có hoặc đã kết thúc
  if (!currentGameId || isGameOver) return;

  if (seconds === 0 && !timerID) startTimer();

  const data = await callAPI(`/game/${currentGameId}/reveal`, 'PUT', { row, col });
  if (!data) return;

  renderBoard(data.board);

  if (data.status === 'won') {
    clearInterval(timerID);
    currentGameId = null;
    isGameOver    = true; // chặn click tiếp
    document.getElementById('reset-btn').textContent = '😎';

    // Lưu điểm + thống kê, nhận về newBadges
    const [statsRes] = await Promise.all([
      callAPI('/stats/save',  'POST', { difficulty: currentDifficulty, result: 'won', timeSeconds: data.timeSeconds }, true),
      callAPI('/leaderboard', 'POST', { difficulty: currentDifficulty, timeSeconds: data.timeSeconds }, true)
    ]);

    showStatus(`🎉 Thắng! ${data.timeSeconds}s — Nhấn 😎 để chơi lại!`, 'win');

    // Hiện popup huy hiệu mới (nếu có)
    if (statsRes && statsRes.newBadges && statsRes.newBadges.length > 0) {
      setTimeout(() => showBadgePopup(statsRes.newBadges), 800);
    }
  }

  if (data.status === 'lost') {
   
    currentGameId = null;
    isGameOver    = true; // chặn click tiếp
    document.getElementById('reset-btn').textContent = '😵';

    // Lưu thống kê ván thua + check badge
    const lostRes = await callAPI('/stats/save', 'POST', { difficulty: currentDifficulty, result: 'lost' }, true);

    showStatus('💥 Thua rồi! Nhấn 😵 để chơi lại.', 'lose');

    // Có thể đạt huy hiệu ngay cả khi thua (vd: 'Không bỏ cuộc')
    if (lostRes && lostRes.newBadges && lostRes.newBadges.length > 0) {
      setTimeout(() => showBadgePopup(lostRes.newBadges), 800);
    }
    clearInterval(timerID);
  }
}

// CLICK PHẢI — Cắm / Bỏ cờ
async function handleRightClick(e, row, col) {
  e.preventDefault();
  // Chặn cắm cờ sau khi game kết thúc
  if (!currentGameId || isGameOver) return;

  const data = await callAPI(`/game/${currentGameId}/flag`, 'PUT', { row, col });
  if (!data) return;

  flagCount = data.flagCount;
  document.getElementById('mine-display').textContent = mines - flagCount;
  renderBoard(data.board);
}


// ĐỔI ĐỘ KHÓ
function setDifficulty(level) {
  currentDifficulty = level;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  startGame();
}


// TIMER
function startTimer() {
  clearInterval(timerID);
  timerID = setInterval(() => {
    seconds++;
    document.getElementById('timer-display').textContent = seconds;
  }, 1000);
}

// VẼ BOARD
const COLS       = { easy: 9, medium: 16, hard: 30 };
const NUM_COLORS = ['','n1','n2','n3','n4','n5','n6','n7','n8'];

function renderBoard(board) {
  const cols    = COLS[currentDifficulty];
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 32px)`;

  board.forEach((row, r) => {
    row.forEach((cell, c) => {
      const el = document.createElement('div');
      el.className = 'cell';

      if (cell.isRevealed) {
        el.classList.add('revealed');
        if (cell.isMine) {
          el.textContent = '💣';
          if (cell.exploded) el.classList.add('exploded');
        } else if (cell.adjacentMines > 0) {
          el.textContent = cell.adjacentMines;
          el.classList.add(NUM_COLORS[cell.adjacentMines]);
        }
      } else if (cell.isFlagged) {
        el.classList.add('flagged');
        el.textContent = '🚩';
      }

      el.addEventListener('click',       ()  => handleLeftClick(r, c));
      el.addEventListener('contextmenu', (e) => handleRightClick(e, r, c));
      boardEl.appendChild(el);
    });
  });
}



// POPUP HUY HIỆU MỚI
function showBadgePopup(badges) {
  // Xóa popup cũ nếu còn
  document.querySelectorAll('.badge-popup').forEach(el => el.remove());

  badges.forEach((badge, index) => {
    const popup = document.createElement('div');
    popup.className = 'badge-popup';
    popup.style.cssText = `
      position: fixed;
      bottom: ${24 + index * 90}px;
      right: 20px;
      background: ${badge.color || '#1a2a3a'};
      border: 1px solid #4ade80;
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      animation: slideIn 0.4s ease;
      max-width: 300px;
    `;

    popup.innerHTML = `
      <div style="font-size:32px;line-height:1">${badge.icon}</div>
      <div>
        <div style="font-size:11px;color:#4ade80;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">
          🏅 Huy hiệu mới!
        </div>
        <div style="font-size:14px;font-weight:600;color:#cdd5e0;margin-bottom:2px">${badge.name}</div>
        <div style="font-size:12px;color:#6b7a99">${badge.desc}</div>
      </div>
    `;

    document.body.appendChild(popup);

    // Tự xóa sau 4 giây
    setTimeout(() => {
      popup.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => popup.remove(), 300);
    }, 4000);
  });

  // Inject animation CSS nếu chưa có
  if (!document.getElementById('badge-anim-style')) {
    const style = document.createElement('style');
    style.id = 'badge-anim-style';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(120%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0);    opacity: 1; }
        to   { transform: translateX(120%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}


// HELPERS
function showStatus(text, type) {
  const el = document.getElementById('status-msg');
  el.textContent = text;
  el.className   = `status-msg ${type}`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}


// KHỞI CHẠY
document.addEventListener('DOMContentLoaded', () => {
  initUserUI();
  startGame();
});
// Vẽ mini board preview ngẫu nhiên
  function drawMiniBoards() {
    document.querySelectorAll('.mini-board').forEach(board => {
      const cols     = parseInt(board.style.gridTemplateColumns.match(/\d+/)[0]);
      const size     = parseInt(board.style.gridTemplateColumns.split('px')[0].split(' ').pop());
      const rows     = cols === 9 ? 6 : 8;
      const mineRate = cols === 9 ? 0.12 : cols === 12 ? 0.16 : 0.2;
      board.style.gap = '1px';
      board.innerHTML = '';
      for (let i = 0; i < rows * cols; i++) {
        const cell = document.createElement('div');
        cell.className = 'mini-cell';
        cell.style.width  = size + 'px';
        cell.style.height = size + 'px';
        const r = Math.random();
        if (r < mineRate)        cell.classList.add('mine');
        else if (r < mineRate*2) cell.classList.add('flag');
        else if (r < 0.5)        cell.classList.add('open');
        board.appendChild(cell);
      }
    });
  }

  // Tải thống kê nhanh vào right panel
  async function loadQuickStats() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res  = await fetch(API + '/stats/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) return;
      document.getElementById('qs-total').textContent   = data.overall.totalGames;
      document.getElementById('qs-wins').textContent    = data.overall.totalWins;
      document.getElementById('qs-losses').textContent  = data.overall.totalLosses;
      document.getElementById('qs-rate').textContent    = data.overall.winRate + '%';
      const bd = data.byDifficulty;
      document.getElementById('qs-best-easy').textContent   = bd.easy?.best_time   ? bd.easy.best_time   + 's' : '—';
      document.getElementById('qs-best-medium').textContent = bd.medium?.best_time ? bd.medium.best_time + 's' : '—';
      document.getElementById('qs-best-hard').textContent   = bd.hard?.best_time   ? bd.hard.best_time   + 's' : '—';
      document.getElementById('qs-best-option').textContent   = bd.hard?.best_time   ? bd.hard.best_time   + 's' : '—';
    } catch {}
  }

  // Header user info
  function initHeader() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) return;
    document.getElementById('header-user').innerHTML = `
      <span class="header-username">👤 ${user.username}</span>
      <button class="header-btn danger" onclick="logout()">Đăng xuất</button>`;
  }

  // Override setDifficulty để update card UI
  window.setDifficulty = function(level) {
    document.querySelectorAll('.diff-card').forEach(c => c.classList.remove('active'));
    document.getElementById('card-' + level).classList.add('active');
    currentDifficulty = level;
    startGame();
  };

  // Override showStatus để reload quick stats sau mỗi ván
  const _orig = window.showStatus;
  window.showStatus = function(text, type) {
    const el = document.getElementById('status-msg');
    el.textContent = text;
    el.className   = 'status-msg ' + type;
    if (type === 'win' || type === 'lose')
      setTimeout(loadQuickStats, 1500);
  };

  initHeader();
  drawMiniBoards();
  loadQuickStats();
  // Tạo nút toggle theme trong header
  createThemeToggle(document.getElementById('theme-btn-wrap'));
