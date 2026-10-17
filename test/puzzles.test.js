import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getLegalMoves, applyMove, getResult } from '../js/rules.js';
import {
  puzzleState, movesToWin, winningMove, bestDefence, dayNumber, puzzleForDay,
  recordSolve, currentStreak, shareText,
} from '../js/puzzles.js';

const { puzzles } = JSON.parse(fs.readFileSync(new URL('../data/puzzles.json', import.meta.url)));

test('there are at least 30 puzzles with unique ids', () => {
  assert.ok(puzzles.length >= 30);
  assert.equal(new Set(puzzles.map((p) => p.id)).size, puzzles.length);
});

for (const p of puzzles) {
  test(`puzzle #${p.id} is a forced win in exactly ${p.moves}`, () => {
    const s = puzzleState(p);
    assert.equal(getResult(s, p.options), null, 'already finished');
    assert.equal(movesToWin(s, p.options, p.moves), p.moves);
  });
}

test('playing the solution against the best defence wins in time', () => {
  for (const p of puzzles) {
    let s = puzzleState(p);
    for (let left = p.moves; left > 0; left--) {
      const m = winningMove(s, left, p.options);
      assert.ok(m, `#${p.id} lost the thread`);
      s = applyMove(s, m);
      if (getResult(s, p.options)) break;
      s = applyMove(s, bestDefence(s, left - 1, p.options));
    }
    assert.equal(getResult(s, p.options)?.winner, 1, `#${p.id} not won`);
  }
});

test('everyone gets the same puzzle on the same UTC day', () => {
  const d = dayNumber(new Date(Date.UTC(2026, 9, 1, 23, 59)));
  assert.equal(d, 1);
  assert.equal(dayNumber(new Date(Date.UTC(2026, 9, 31))), 31);
  assert.equal(puzzleForDay(puzzles, 1).id, puzzles[0].id);
  assert.equal(puzzleForDay(puzzles, puzzles.length + 1).id, puzzles[0].id);
});

test('streaks grow on consecutive days and reset after a gap', () => {
  let r = recordSolve(null, 10, 2);
  r = recordSolve(r, 11, 1);
  r = recordSolve(r, 11, 1); // same day twice counts once
  assert.equal(r.streak, 2);
  assert.equal(currentStreak(r, 12), 2);
  assert.equal(currentStreak(r, 13), 0);
  r = recordSolve(r, 14, 3);
  assert.equal(r.streak, 1);
  assert.equal(r.best, 2);
});

test('share text is short and WhatsApp friendly', () => {
  const t = shareText({ day: 17, movesUsed: 2, par: 3, streak: 4, url: 'https://example.com/dame/' });
  assert.match(t, /#17/);
  assert.match(t, /2\/3/);
  assert.match(t, /streak 4/);
  assert.ok(t.length < 140);
});
