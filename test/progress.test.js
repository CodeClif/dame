import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, BASE_ROSTER, TEAM_ROSTER } from '../js/characters.js';
import { emptyProgress, isUnlocked, recordGame, recordPuzzleProgress } from '../js/progress.js';
import { recordSolve } from '../js/puzzles.js';

test('the starting six of each team are always available', () => {
  for (const team of ['forest', 'market']) {
    assert.equal(BASE_ROSTER[team].length, 6);
    for (const k of BASE_ROSTER[team]) assert.ok(isUnlocked(k, emptyProgress()));
    assert.ok(TEAM_ROSTER[team].length > 6);
  }
});

test('win streaks unlock characters and losses reset the streak', () => {
  let p = emptyProgress();
  const unlocked = [];
  for (let i = 0; i < 5; i++) { const r = recordGame(p, true); p = r.progress; unlocked.push(...r.unlocked); }
  const expected = Object.keys(CHARACTERS).filter((k) => CHARACTERS[k].unlock?.type === 'wins' && CHARACTERS[k].unlock.n <= 5);
  assert.deepEqual(unlocked.sort(), expected.sort());
  assert.ok(unlocked.includes('owl') && unlocked.includes('kenkey') && unlocked.includes('hornbill'));
  p = recordGame(p, false).progress;
  assert.equal(p.winStreak, 0);
  assert.equal(p.bestWin, 5);
  assert.ok(isUnlocked('owl', p), 'unlocks are kept');
});

test('puzzle streaks unlock characters', () => {
  let p = emptyProgress();
  let rec = null;
  const unlocked = [];
  for (let d = 1; d <= 7; d++) {
    rec = recordSolve(rec, d, 1);
    const r = recordPuzzleProgress(p, rec);
    p = r.progress;
    unlocked.push(...r.unlocked);
  }
  const expected = Object.keys(CHARACTERS).filter((k) => CHARACTERS[k].unlock?.type === 'puzzles' && CHARACTERS[k].unlock.n <= 7);
  assert.deepEqual(unlocked.sort(), expected.sort());
  assert.ok(unlocked.includes('hedgehog') && unlocked.includes('tailor') && unlocked.includes('mona'));
});

test('seasonal characters are placeholders and stay locked', () => {
  const seasonal = Object.keys(CHARACTERS).filter((k) => CHARACTERS[k].seasonal);
  assert.equal(seasonal.length, 4);
  const p = { ...emptyProgress(), bestWin: 99, puzzle: { best: 99 } };
  for (const k of seasonal) assert.equal(isUnlocked(k, p), false);
});

test('the Chop Bar and Wildlife packs have six original characters each, with day-names and quips', () => {
  for (const [pack, team] of [['Chop Bar', 'market'], ['Wildlife', 'forest']]) {
    const keys = Object.keys(CHARACTERS).filter((k) => CHARACTERS[k].pack === pack);
    assert.equal(keys.length, 6, pack);
    for (const k of keys) {
      const c = CHARACTERS[k];
      assert.equal(c.team, team);
      assert.ok(c.unlock && c.quip && c.name, `${k} needs an unlock, a name and a quip`);
      assert.equal(isUnlocked(k, emptyProgress()), false, `${k} starts locked`);
    }
  }
  const names = Object.values(CHARACTERS).map((c) => c.name);
  assert.equal(new Set(names).size, names.length, 'every character has its own name');
});
