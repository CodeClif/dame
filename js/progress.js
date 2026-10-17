// Win streaks, puzzle streaks and the cosmetic characters they unlock. Pure functions;
// the app keeps the record in localStorage.
import { CHARACTERS } from './characters.js';

export const emptyProgress = () => ({ winStreak: 0, bestWin: 0, wins: 0, games: 0, puzzle: null });

export function isUnlocked(key, p) {
  const ch = CHARACTERS[key];
  if (!ch) return false;
  if (ch.seasonal) return false; // placeholders for now
  if (!ch.unlock) return true;
  const have = ch.unlock.type === 'wins' ? p.bestWin : (p.puzzle?.best || 0);
  return have >= ch.unlock.n;
}

const unlockedSet = (p) => new Set(Object.keys(CHARACTERS).filter((k) => isUnlocked(k, p)));
const newlyUnlocked = (before, after) => [...unlockedSet(after)].filter((k) => !unlockedSet(before).has(k));

/** Record a finished game against the computer or a friend. `won` is true, false or null (draw). */
export function recordGame(p, won) {
  const next = { ...p, games: p.games + 1 };
  if (won === true) {
    next.wins = p.wins + 1;
    next.winStreak = p.winStreak + 1;
    next.bestWin = Math.max(p.bestWin, next.winStreak);
  } else if (won === false) {
    next.winStreak = 0;
  }
  return { progress: next, unlocked: newlyUnlocked(p, next) };
}

/** Swap in an updated puzzle record (see puzzles.js recordSolve). */
export function recordPuzzleProgress(p, puzzleRecord) {
  const next = { ...p, puzzle: puzzleRecord };
  return { progress: next, unlocked: newlyUnlocked(p, next) };
}
