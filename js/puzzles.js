// Daily puzzles: "win within N moves" positions, a solver to prove them, and the defence
// the computer plays against you. Pure logic, shared with the tests.
import { getLegalMoves, applyMove, getResult, stateFromRows, withDefaults } from './rules.js';

const won = (state, o, attacker) => getResult(state, o)?.winner === attacker;

/**
 * A move that forces a win for the side to move within `n` of its own moves, or null.
 * The defender is assumed to find the best replies.
 */
export function winningMove(state, n, options) {
  const o = withDefaults(options);
  const attacker = state.turn;
  const moves = getLegalMoves(state, o);
  for (const m of moves) if (won(applyMove(state, m), o, attacker)) return m;
  if (n <= 1) return null;
  for (const m of moves) {
    const after = applyMove(state, m);
    if (getResult(after, o)) continue; // a draw or a loss is no good
    const replies = getLegalMoves(after, o);
    const holds = replies.every((rep) => {
      const next = applyMove(after, rep);
      const r = getResult(next, o);
      if (r) return r.winner === attacker;
      return winningMove(next, n - 1, o) !== null;
    });
    if (holds) return m;
  }
  return null;
}

/** Fewest moves the side to move needs to force a win (up to `max`), or 0 if it can't. */
export function movesToWin(state, options, max = 4) {
  for (let n = 1; n <= max; n++) if (winningMove(state, n, options)) return n;
  return 0;
}

/** All first moves that win within n (used to keep puzzles from being too loose). */
export function winningFirstMoves(state, n, options) {
  const o = withDefaults(options);
  const attacker = state.turn;
  return getLegalMoves(state, o).filter((m) => {
    const after = applyMove(state, m);
    if (won(after, o, attacker)) return true;
    if (n <= 1 || getResult(after, o)) return false;
    return getLegalMoves(after, o).every((rep) => {
      const next = applyMove(after, rep);
      const r = getResult(next, o);
      return r ? r.winner === attacker : winningMove(next, n - 1, o) !== null;
    });
  });
}

/** The defender's most stubborn reply: the one that delays the loss longest (or escapes). */
export function bestDefence(state, movesLeft, options) {
  const o = withDefaults(options);
  const replies = getLegalMoves(state, o);
  let best = null;
  let bestScore = -1;
  for (const rep of replies) {
    const next = applyMove(state, rep);
    const r = getResult(next, o);
    let score;
    if (r) score = r.winner === state.turn ? 99 : 0;
    else {
      const need = movesToWin(next, o, Math.max(1, movesLeft));
      score = need === 0 ? 50 : need; // can't be forced any more: great for the defender
    }
    if (score > bestScore) { best = rep; bestScore = score; }
  }
  return best;
}

export function puzzleState(p) {
  return stateFromRows(p.rows, p.turn ?? 1);
}

// ---------- which puzzle is today's ----------

export const PUZZLE_EPOCH = Date.UTC(2026, 9, 1); // puzzle #1 is 1 October 2026 (UTC)
const DAY = 86400000;

/** Day number (UTC) for a date: everyone gets the same puzzle on the same day. */
export const dayNumber = (date = new Date()) => Math.floor((date.getTime() - PUZZLE_EPOCH) / DAY) + 1;

export function puzzleForDay(puzzles, day) {
  const i = (((day - 1) % puzzles.length) + puzzles.length) % puzzles.length;
  return puzzles[i];
}

// ---------- streaks and sharing ----------

/** Update a streak record after solving the puzzle of `day`. */
// Streak freeze: a streak survives one missed day by spending a freeze. You earn a freeze
// every 5 days of streak, and can hold at most 2.
export const FREEZE_EVERY = 5;
export const MAX_FREEZES = 2;

export function recordSolve(record, day, movesUsed) {
  const r = { streak: 0, best: 0, last: 0, solved: {}, freezes: 0, frozen: [], ...record };
  r.solved = { ...(record?.solved || {}) };
  r.frozen = [...(record?.frozen || [])];
  if (r.solved[day]) return r; // already counted today
  if (r.last === day - 1) r.streak += 1;
  else if (r.last === day - 2 && r.freezes > 0) { // missed exactly one day: a freeze saves it
    r.freezes -= 1;
    r.frozen.push(day - 1);
    r.streak += 1;
  } else r.streak = 1;
  if (r.streak % FREEZE_EVERY === 0) r.freezes = Math.min(MAX_FREEZES, r.freezes + 1);
  r.best = Math.max(r.best, r.streak);
  r.last = day;
  r.solved[day] = movesUsed;
  // keep the record small: only the last 60 days
  for (const d of Object.keys(r.solved)) if (Number(d) < day - 60) delete r.solved[d];
  r.frozen = r.frozen.filter((d) => d >= day - 60);
  return r;
}

/** The streak as it stands today: alive if yesterday was solved, or one day was missed and a freeze is left. */
export const currentStreak = (record, today) => {
  if (!record) return 0;
  if (record.last >= today - 1) return record.streak;
  if (record.last === today - 2 && record.freezes > 0) return record.streak;
  return 0;
};

/** True when today's streak is only alive thanks to a freeze (so the player can be told). */
export const onFreeze = (record, today) => !!record && record.last === today - 2 && record.freezes > 0;

export function shareText({ day, movesUsed, par, streak, url }) {
  const marks = Array.from({ length: par }, (_, i) => (i < movesUsed ? '🟢' : '⚪')).join('');
  return `Dame daily #${day} 🧩 ${marks}\nSolved in ${movesUsed}/${par} move${par > 1 ? 's' : ''} · 🔥 streak ${streak}\n${url}`;
}
