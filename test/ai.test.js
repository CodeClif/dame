import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, stateFromRows, getLegalMoves, applyMove, getResult, sq } from '../js/rules.js';
import { chooseMove } from '../js/ai.js';

const isLegal = (state, move, o) =>
  getLegalMoves(state, o).some((m) => m.from === move.from && m.to === move.to
    && m.captures.join() === move.captures.join());

test('every level returns a legal opening move quickly', () => {
  const s = createInitialState();
  for (const level of ['easy', 'medium', 'hard']) {
    const t = Date.now();
    const m = chooseMove(s, {}, level);
    assert.ok(isLegal(s, m, {}), level);
    assert.ok(Date.now() - t < 3000, `${level} too slow`);
  }
});

test('medium and hard prefer the double capture', () => {
  // Bottom man can take one piece, or the other man can take two.
  const s = stateFromRows([
    '........', '........', '...o....', '........',
    '.o...o..', 'x.....x.', '........', '........',
  ]);
  const o = { menCaptureBackward: false };
  for (const level of ['medium', 'hard']) {
    assert.equal(chooseMove(s, o, level).captures.length, 2, level);
  }
});

test('hard avoids handing over a free piece', () => {
  // Moving the man on (5,2) to (4,3) or (4,1) walks into a capture; (6,5)->(5,6) is safe.
  const s = stateFromRows([
    '........', '........', '........', '..o.....',
    '........', '..x.....', '.....x..', '........',
  ], 1);
  const o = { flyingKings: false, menCaptureBackward: false };
  const m = chooseMove(s, o, 'hard');
  const reply = getLegalMoves(applyMove(s, m), o);
  assert.ok(reply.every((r) => r.captures.length === 0), `blundered with ${m.from}->${m.to}`);
});

test('ai vs ai finishes a game without illegal moves', () => {
  let s = createInitialState();
  const o = { drawAfterQuietPlies: 40 };
  for (let ply = 0; ply < 300 && !getResult(s, o); ply++) {
    const m = chooseMove(s, o, ply % 2 ? 'easy' : 'medium');
    assert.ok(isLegal(s, m, o));
    s = applyMove(s, m);
  }
  assert.ok(getResult(s, o), 'game should end');
});

test('returns null when there are no moves', () => {
  const s = stateFromRows([
    '........', '........', '........', '........',
    '........', '........', '........', '........',
  ]);
  s.board[sq(0, 1)] = -1;
  assert.equal(chooseMove(s, {}, 'hard'), null);
});
