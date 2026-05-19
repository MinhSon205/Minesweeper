
// routes/game.js — API endpoints cho game

// 3 endpoints:
//   POST /game/new        → tạo game mới
//   PUT  /game/:id/reveal → mở ô
//   PUT  /game/:id/flag   → cắm / bỏ cờ


const express = require('express');
const router  = express.Router();
const crypto  = require('crypto'); // tạo ID ngẫu nhiên, có sẵn trong Node.js


// LƯU TRẠNG THÁI GAME TRONG BỘ NHỚ (Map)
// Map giống Object nhưng tối ưu hơn khi key là string.
// games.set(id, gameData)  → lưu
// games.get(id)            → lấy
// games.delete(id)         → xóa


const games = new Map();



// CẤU HÌNH ĐỘ KHÓ (giống frontend)

const DIFFICULTY = {
  easy:   { rows: 9,  cols: 9,  mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard:   { rows: 16, cols: 30, mines: 99 }
};



// GAME LOGIC (chuyển từ game.js frontend)

function createBoard(rows, cols, mineCount) {
  // Tạo mảng 2D rỗng
  const board = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      row: r, col: c,
      isMine: false, isRevealed: false,
      isFlagged: false, adjacentMines: 0
    }))
  );

  // Fisher-Yates shuffle để đặt mìn ngẫu nhiên
  const positions = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      positions.push([r, c]);

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  positions.slice(0, mineCount).forEach(([r, c]) => {
    board[r][c].isMine = true;
  });

  // Tính adjacentMines
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!board[r][c].isMine)
        board[r][c].adjacentMines = getNeighbors(r, c, rows, cols)
          .filter(([nr, nc]) => board[nr][nc].isMine).length;

  return board;
}

function getNeighbors(r, c, rows, cols) {
  const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  return dirs
    .map(([dr, dc]) => [r + dr, c + dc])
    .filter(([nr, nc]) => nr >= 0 && nr < rows && nc >= 0 && nc < cols);
}

function floodFill(board, startRow, startCol, rows, cols) {
  const queue = [[startRow, startCol]];
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const cell   = board[r][c];
    if (cell.isRevealed || cell.isFlagged) continue;
    cell.isRevealed = true;
    if (cell.adjacentMines === 0 && !cell.isMine) {
      getNeighbors(r, c, rows, cols).forEach(([nr, nc]) => {
        if (!board[nr][nc].isRevealed) queue.push([nr, nc]);
      });
    }
  }
}

function checkWin(board) {
  return board.flat().every(cell => cell.isMine || cell.isRevealed);
}


// MASK BOARD — Che mìn trước khi gửi về client
// Server biết hết vị trí mìn, nhưng KHÔNG được
// gửi thông tin đó về client (tránh gian lận).


function maskBoard(board) {
  return board.map(row =>
    row.map(cell => {
      if (!cell.isRevealed && !cell.isFlagged) {
        // Che thông tin mìn với ô chưa mở
        return { ...cell, isMine: false, adjacentMines: 0 };
      }
      return cell; // ô đã mở hoặc có cờ: giữ nguyên
    })
  );
}



// ENDPOINT 1: POST /game/new

router.post('/new', (req, res) => {
  // Lấy difficulty từ body, mặc định là 'easy' nếu không có
  const difficulty = req.body.difficulty || 'easy';

  // Kiểm tra difficulty hợp lệ
  if (!DIFFICULTY[difficulty]) {
    return res.status(400).json({ error: 'Độ khó không hợp lệ' });
  }

  const { rows, cols, mines } = DIFFICULTY[difficulty];

  // Tạo ID duy nhất 
  // crypto.randomUUID() tạo chuỗi
  const gameId = crypto.randomUUID();

  // Tạo board mới và lưu vào Map (có đủ thông tin mìn)
  const board = createBoard(rows, cols, mines);
  games.set(gameId, {
    board,
    difficulty,
    rows,
    cols,
    mines,
    startTime: Date.now(), // milliseconds từ 1970, dùng để tính thời gian
    status: 'playing'      // 'playing' | 'won' | 'lost'
  });

  // Trả về gameId và board đã che mìn
 
  res.status(201).json({
    gameId,
    board: maskBoard(board),
    difficulty,
    mines
  });
});



// ENDPOINT 2: PUT /game/:id/reveal

router.put('/:id/reveal', (req, res) => {
  const gameId = req.params.id; // lấy :id từ URL
  const game   = games.get(gameId);

  // Kiểm tra game tồn tại
  if (!game) {
    // 404 Not Found
    return res.status(404).json({ error: 'Không tìm thấy game' });
  }

  if (game.status !== 'playing') {
    return res.status(400).json({ error: 'Game đã kết thúc' });
  }

  // Lấy row, col từ body — chuyển sang số nguyên
  const row = parseInt(req.body.row);
  const col = parseInt(req.body.col);

  // Validate: row và col phải là số hợp lệ
  if (isNaN(row) || isNaN(col) ||
      row < 0 || row >= game.rows ||
      col < 0 || col >= game.cols) {
    return res.status(400).json({ error: 'Vị trí không hợp lệ' });
  }

  const cell = game.board[row][col];

  // Bỏ qua ô đã mở hoặc có cờ
  if (cell.isRevealed || cell.isFlagged) {
    return res.json({ board: maskBoard(game.board), status: game.status });
  }

  // Tính thời gian chơi (giây)
  const timeSeconds = Math.floor((Date.now() - game.startTime) / 1000);

  if (cell.isMine) {
    // THUA: lộ hết mìn
    cell.isRevealed  = true;
    cell.exploded    = true;
    game.status      = 'lost';
    game.board.flat().forEach(c => { if (c.isMine) c.isRevealed = true; });

    games.delete(gameId); // xóa game khỏi bộ nhớ

    // Khi thua: gửi board thật (có mìn) để client hiển thị
    return res.json({ board: game.board, status: 'lost', timeSeconds });
  }

  // Mở ô và BFS flood fill
  floodFill(game.board, row, col, game.rows, game.cols);

  if (checkWin(game.board)) {
    game.status = 'won';
    games.delete(gameId);

    // Khi thắng: gửi board thật luôn (đã mở hết rồi)
    return res.json({ board: game.board, status: 'won', timeSeconds });
  }

  // Vẫn đang chơi: gửi board đã che mìn
  res.json({ board: maskBoard(game.board), status: 'playing' });
});



// ENDPOINT 3: PUT /game/:id/flag

router.put('/:id/flag', (req, res) => {
  const game = games.get(req.params.id);

  if (!game)                     return res.status(404).json({ error: 'Không tìm thấy game' });
  if (game.status !== 'playing') return res.status(400).json({ error: 'Game đã kết thúc' });

  const row  = parseInt(req.body.row);
  const col  = parseInt(req.body.col);
  const cell = game.board[row][col];

  // Không cắm cờ lên ô đã mở
  if (cell.isRevealed) {
    return res.status(400).json({ error: 'Ô đã được mở' });
  }

  // Toggle cờ
  cell.isFlagged = !cell.isFlagged;

  // Đếm tổng số cờ hiện tại
  const flagCount = game.board.flat().filter(c => c.isFlagged).length;

  res.json({ board: maskBoard(game.board), flagCount });
});


module.exports = router;
