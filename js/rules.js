// Dame rules engine. Pure functions, no DOM — shared by the UI, the AI worker and the tests.
//
// Board: 64 squares, index = row * 8 + col, row 0 at the top.
// Pieces: 0 empty, 1 / 2 = bottom side man / king, -1 / -2 = top side man / king.
// Side 1 (bottom) moves up the board (towards row 0); side -1 (top) moves down.

export const SIZE = 8;

export const DEFAULT_OPTIONS = Object.freeze({
  flyingKings: true,         // kings slide any distance and capture from afar
  menCaptureBackward: true,  // men may capture backwards (they still only step forwards)
  drawAfterQuietPlies: 50,   // plies with only king moves and no capture before a draw
});

export const sq = (r, c) => r * SIZE + c;
export const rowOf = (i) => i >> 3;
export const colOf = (i) => i & 7;
export const inBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
export const isDarkSquare = (r, c) => (r + c) % 2 === 1;
export const sideOf = (p) => (p > 0 ? 1 : p < 0 ? -1 : 0);
export const isKing = (p) => p === 2 || p === -2;
export const forwardDir = (side) => (side === 1 ? -1 : 1);
export const promotionRow = (side) => (side === 1 ? 0 : SIZE - 1);

const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export function withDefaults(options) {
  return { ...DEFAULT_OPTIONS, ...(options || {}) };
}

export function createInitialState(firstTurn = 1) {
  const board = new Array(SIZE * SIZE).fill(0);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isDarkSquare(r, c)) continue;
      if (r <= 2) board[sq(r, c)] = -1;
      else if (r >= 5) board[sq(r, c)] = 1;
    }
  }
  return { board, turn: firstTurn, quiet: 0 };
}

/** Build a state from a picture, handy for tests. Rows top to bottom; x/X = bottom man/king, o/O = top man/king. */
export function stateFromRows(rows, turn = 1, quiet = 0) {
  const map = { '.': 0, x: 1, X: 2, o: -1, O: -2 };
  const board = [];
  for (const row of rows) for (const ch of row.replace(/\s/g, '')) board.push(map[ch] ?? 0);
  if (board.length !== SIZE * SIZE) throw new Error('need 8 rows of 8 squares');
  return { board, turn, quiet };
}

export function countPieces(board, side) {
  let n = 0;
  for (const p of board) if (sideOf(p) === side) n++;
  return n;
}

// Depth-first search over capture sequences. Jumped pieces stay on the board until
// the move ends (so they block the path and cannot be jumped twice), like in most
// international-style draughts. A man that reaches the far row mid-sequence keeps
// capturing as a man and is crowned only if the sequence ends there.
function collectCaptures(board, from, o, out) {
  const piece = board[from];
  const side = sideOf(piece);
  const king = isKing(piece);
  const flying = king && o.flyingKings;
  const fwd = forwardDir(side);
  const path = [from];
  const caps = [];
  board[from] = 0; // lift the piece so it may pass back over its start square

  const dfs = (pos) => {
    let extended = false;
    for (const [dr, dc] of DIRS) {
      if (!king && !o.menCaptureBackward && dr !== fwd) continue;
      let r = rowOf(pos) + dr;
      let c = colOf(pos) + dc;
      if (flying) {
        while (inBounds(r, c) && board[sq(r, c)] === 0) { r += dr; c += dc; }
      }
      if (!inBounds(r, c)) continue;
      const mid = sq(r, c);
      if (sideOf(board[mid]) !== -side || caps.includes(mid)) continue;
      let lr = r + dr;
      let lc = c + dc;
      while (inBounds(lr, lc) && board[sq(lr, lc)] === 0) {
        const land = sq(lr, lc);
        extended = true;
        path.push(land);
        caps.push(mid);
        dfs(land);
        path.pop();
        caps.pop();
        if (!flying) break;
        lr += dr;
        lc += dc;
      }
    }
    if (!extended && caps.length) {
      out.push(makeMove(from, path.slice(), caps.slice(), piece));
    }
  };

  dfs(from);
  board[from] = piece;
}

function makeMove(from, path, captures, piece) {
  const to = path[path.length - 1];
  const promote = !isKing(piece) && rowOf(to) === promotionRow(sideOf(piece));
  return { from, to, path, captures, promote };
}

function collectSteps(board, from, o, out) {
  const piece = board[from];
  const side = sideOf(piece);
  const king = isKing(piece);
  for (const [dr, dc] of DIRS) {
    if (!king && dr !== forwardDir(side)) continue;
    let r = rowOf(from) + dr;
    let c = colOf(from) + dc;
    while (inBounds(r, c) && board[sq(r, c)] === 0) {
      out.push(makeMove(from, [from, sq(r, c)], [], piece));
      if (!(king && o.flyingKings)) break;
      r += dr;
      c += dc;
    }
  }
}

/**
 * All legal moves for the side to move. Capturing is mandatory: if any capture
 * exists only captures are returned, and each capture runs to the end of its chain.
 * Move: { from, to, path: [from, ...landings], captures: [jumped squares in order], promote }
 */
export function getLegalMoves(state, options) {
  const o = withDefaults(options);
  const board = state.board.slice();
  const captures = [];
  for (let i = 0; i < board.length; i++) {
    if (sideOf(board[i]) === state.turn) collectCaptures(board, i, o, captures);
  }
  if (captures.length) return dedupe(captures);
  const steps = [];
  for (let i = 0; i < board.length; i++) {
    if (sideOf(board[i]) === state.turn) collectSteps(board, i, o, steps);
  }
  return steps;
}

// Flying kings can reach the same square taking the same pieces in a different order.
function dedupe(moves) {
  const seen = new Set();
  return moves.filter((m) => {
    const key = `${m.from}>${m.to}:${[...m.captures].sort((a, b) => a - b).join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function applyMove(state, move) {
  const board = state.board.slice();
  const piece = board[move.from];
  board[move.from] = 0;
  for (const c of move.captures) board[c] = 0;
  board[move.to] = move.promote ? 2 * sideOf(piece) : piece;
  const progress = move.captures.length > 0 || !isKing(piece);
  return { board, turn: -state.turn, quiet: progress ? 0 : state.quiet + 1 };
}

/** null while the game is on, otherwise { winner: 1 | -1 | 0, reason }. */
export function getResult(state, options) {
  const o = withDefaults(options);
  if (getLegalMoves(state, o).length === 0) {
    const reason = countPieces(state.board, state.turn) === 0 ? 'no-pieces' : 'blocked';
    return { winner: -state.turn, reason };
  }
  if (state.quiet >= o.drawAfterQuietPlies) return { winner: 0, reason: 'quiet' };
  return null;
}

/** Squares between two squares on a diagonal (exclusive). */
export function between(a, b) {
  const dr = Math.sign(rowOf(b) - rowOf(a));
  const dc = Math.sign(colOf(b) - colOf(a));
  const out = [];
  let r = rowOf(a) + dr;
  let c = colOf(a) + dc;
  while (sq(r, c) !== b && inBounds(r, c)) { out.push(sq(r, c)); r += dr; c += dc; }
  return out;
}
