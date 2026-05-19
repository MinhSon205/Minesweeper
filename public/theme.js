
// theme.js — Quản lý dark/light mode


// ÁP DỤNG THEME KHI TRANG TẢI
// Chạy NGAY (không cần DOMContentLoaded) để tránh "flash"
// (trang sáng chớp lên rồi mới tối)
(function applyThemeEarly() {
  const saved = localStorage.getItem('theme') || 'dark';
  if (saved === 'light') {
    document.documentElement.classList.add('light');
  }
})();



// TẠO NÚT TOGGLE VÀ GẮN VÀO TRANG
function createThemeToggle(parent) {
  const btn = document.createElement('button');
  btn.className   = 'theme-toggle';
  btn.title       = 'Chuyển dark/light mode';
  btn.textContent = isDark() ? '☀️' : '🌙';

  btn.addEventListener('click', () => {
    const goLight = isDark(); // nếu đang dark → chuyển sang light
    document.documentElement.classList.toggle('light', goLight);
    localStorage.setItem('theme', goLight ? 'light' : 'dark');
    btn.textContent = goLight ? '🌙' : '☀️';
    // Icon: đang dark hiện ☀️ (nhấn → sáng), đang light hiện 🌙 (nhấn → tối)
  });

  parent.appendChild(btn);
  return btn;
}

function isDark() {
  return !document.documentElement.classList.contains('light');
}
