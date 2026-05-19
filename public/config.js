// config.js — Tự động phát hiện API base URL
// Hoạt động với cả localhost lẫn ngrok/production
// vì frontend và backend cùng được serve bởi Express (express.static)

const API = window.location.origin;
