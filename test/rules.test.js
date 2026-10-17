import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState, stateFromRows, getLegalMoves, applyMove, getResult,
  countPieces, sq, between,
} from '../js/rules.js';

const CLASSIC = { flyingKings: false, menCaptureBackward: false };
const dests = (moves) => moves.map((m) => m.to).sort((a, b) => a - b);

test('initial position has 12 pieces each on dark squares', () => {
  const s = createInitialState();
  assert.equal(countPieces(s.board, 1), 12);
  assert.equal(countPieces(s.board, -1), 12);
  s.board.forEach((p, i) => { if (p) assert.equal(((i >> 3) + (i & 7)) % 2, 1); });
});

test('opening has 7 legal moves for either side', () => {
  assert.equal(getLegalMoves(createInitialState(1)).length, 7);
  assert.equal(getLegalMoves(createInitialState(-1)).length, 7);
});

test('men step forward diagonally only', () => {
  const s = stateFromRows([
    '........', '........', '........', '........',
    '...x....', '........', '........', '........',
  ]);
  assert.deepEqual(dests(getLegalMoves(s)), [sq(3, 2), sq(3, 4)]);
});

test('capture is mandatory', () => {
  const s = stateFromRows([
    '........', '........', '........', '..o.....',
    '...x....', '........', '.x......', '........',
  ]);
  const moves = getLegalMoves(s);
  assert.equal(moves.length, 1);
  assert.deepEqual(moves[0].captures, [sq(3, 2)]);
  assert.equal(moves[0].to, sq(2, 1));
});

test('multi-jump continues to the end of the chain', () => {
  const s = stateFromRows([
    '........', '........', '...o....', '........',
    '.o......', 'x.......', '........', '........',
  ]);
  const moves = getLegalMoves(s, CLASSIC);
  assert.equal(moves.length, 1);
  assert.deepEqual(moves[0].path, [sq(5, 0), sq(3, 2), sq(1, 4)]);
  assert.deepEqual(moves[0].captures, [sq(4, 1), sq(2, 3)]);
});

test('backward capture for men follows the setting', () => {
  const s = stateFromRows([
    '........', '........', '........', '...x....',
    '..o.....', '........', '........', '........',
  ]);
  assert.equal(getLegalMoves(s, { menCaptureBackward: true })[0].captures.length, 1);
  const noBack = getLegalMoves(s, { menCaptureBackward: false });
  assert.ok(noBack.every((m) => m.captures.length === 0));
});

test('men never step backwards even when backward capture is on', () => {
  const s = stateFromRows([
    '........', '........', '........', '........',
    '...x....', '........', '........', '........',
  ]);
  assert.ok(getLegalMoves(s, { menCaptureBackward: true }).every((m) => m.to < sq(4, 3)));
});

test('reaching the far row crowns a man', () => {
  const s = stateFromRows([
    '........', '..x.....', '........', '........',
    '........', '........', '........', '........',
  ]);
  const m = getLegalMoves(s).find((x) => x.to === sq(0, 1));
  assert.ok(m.promote);
  assert.equal(applyMove(s, m).board[sq(0, 1)], 2);
});

test('a man passing the far row mid-capture keeps jumping and is not crowned', () => {
  const s = stateFromRows([
    '........', '....o.o.', '...x....', '........',
    '........', '........', '........', '........',
  ]);
  const moves = getLegalMoves(s, { menCaptureBackward: true });
  assert.equal(moves.length, 1);
  assert.deepEqual(moves[0].path, [sq(2, 3), sq(0, 5), sq(2, 7)]);
  assert.equal(moves[0].promote, false);
  // Without backward capture the chain stops on the far row and the man is crowned.
  const stop = getLegalMoves(s, { menCaptureBackward: false });
  assert.deepEqual(stop.map((m) => [m.to, m.promote]), [[sq(0, 5), true]]);
});

test('non-flying kings move one square in all directions', () => {
  const s = stateFromRows([
    '........', '........', '........', '...X....',
    '........', '........', '........', '........',
  ]);
  assert.equal(getLegalMoves(s, CLASSIC).length, 4);
});

test('flying kings slide the whole diagonal', () => {
  const s = stateFromRows([
    '........', '........', '........', '...X....',
    '........', '........', '........', '........',
  ]);
  assert.equal(getLegalMoves(s, { flyingKings: true }).length, 13);
});

test('flying kings capture from a distance and may land anywhere beyond', () => {
  const s = stateFromRows([
    'X.......', '........', '........', '...o....',
    '........', '........', '........', '........',
  ]);
  const moves = getLegalMoves(s, { flyingKings: true });
  assert.deepEqual(dests(moves), [sq(4, 4), sq(5, 5), sq(6, 6), sq(7, 7)]);
  assert.ok(moves.every((m) => m.captures[0] === sq(3, 3)));
  assert.equal(getLegalMoves(s, { flyingKings: false }).every((m) => !m.captures.length), true);
});

test('a flying king cannot jump two pieces in a row', () => {
  const s = stateFromRows([
    'X.......', '........', '..o.....', '...o....',
    '........', '........', '........', '........',
  ]);
  assert.ok(getLegalMoves(s, { flyingKings: true }).every((m) => m.captures.length === 0));
});

test('jumped pieces stay until the move ends and cannot be jumped twice', () => {
  // King on a loop of four men: it may take each one once, never re-jump one.
  const s = stateFromRows([
    '........', '..o.o...', '........', '..o.o...',
    '.....X..', '........', '........', '........',
  ]);
  const moves = getLegalMoves(s, CLASSIC);
  for (const m of moves) assert.equal(new Set(m.captures).size, m.captures.length);
  assert.ok(moves.some((m) => m.captures.length >= 2));
});

test('applyMove removes captured pieces and switches turn', () => {
  const s = stateFromRows([
    '........', '........', '........', '..o.....',
    '...x....', '........', '........', '........',
  ]);
  const next = applyMove(s, getLegalMoves(s)[0]);
  assert.equal(countPieces(next.board, -1), 0);
  assert.equal(next.turn, -1);
});

test('side with no pieces or no moves loses', () => {
  const gone = stateFromRows([
    '........', '........', '........', '........',
    '...x....', '........', '........', '........',
  ], -1);
  assert.deepEqual(getResult(gone), { winner: 1, reason: 'no-pieces' });

  const blocked = stateFromRows([
    '........', '........', '........', '........',
    '........', '........', 'o.......', '.x......',
  ], -1);
  blocked.board[sq(7, 1)] = 1;
  blocked.board[sq(6, 0)] = -1;
  // top man on (6,0) can only go to (7,1), which is occupied; jump would leave the board.
  assert.deepEqual(getResult(blocked, CLASSIC), { winner: 1, reason: 'blocked' });
});

test('quiet king shuffles end in a draw', () => {
  let s = stateFromRows([
    'X.......', '........', '........', '........',
    '........', '........', '........', '.......O',
  ]);
  const o = { flyingKings: false, drawAfterQuietPlies: 4 };
  for (let i = 0; i < 4; i++) s = applyMove(s, getLegalMoves(s, o)[0]);
  assert.deepEqual(getResult(s, o), { winner: 0, reason: 'quiet' });
});

test('between lists the squares on a diagonal', () => {
  assert.deepEqual(between(sq(0, 0), sq(3, 3)), [sq(1, 1), sq(2, 2)]);
});
