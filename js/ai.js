// Computer opponent: negamax minimax with alpha-beta pruning.
import { getLegalMoves, applyMove, sideOf, isKing, rowOf, colOf, withDefaults } from './rules.js';

export const LEVELS = {
  easy: { depth: 2, noise: 70, blunder: 0.2 },
  medium: { depth: 4, noise: 12, blunder: 0 },
  hard: { depth: 14, noise: 0, blunder: 0, timeMs: 1400 },
};

const WIN = 100000;
const MAX_EXTENSION = 8; // extra plies allowed while captures are forced
const TIMEOUT = Symbol('timeout');

/** Static score from the point of view of the side to move. */
export function evaluate(state, o) {
  const kingValue = o.flyingKings ? 320 : 230;
  let score = 0;
  let total = 0;
  let material = 0;
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (!p) continue;
    total++;
    const s = sideOf(p);
    const r = rowOf(i);
    const c = colOf(i);
    let v;
    if (isKing(p)) {
      v = kingValue;
      if (r === c || r + c === 7) v += 8; // the long diagonals are a king's home
    } else {
      const advanced = s === 1 ? 7 - r : r;
      v = 100 + advanced * advanced * 1.2;
      if (advanced === 0) v += 12; // guarding the back row stops enemy crowning
    }
    if (r >= 2 && r <= 5 && c >= 2 && c <= 5) v += 6;
    score += s * v;
    material += s * (isKing(p) ? kingValue : 100);
  }
  // When ahead, trading pieces brings the win closer.
  if (material !== 0) score += Math.sign(material) * (24 - total) * 4;
  return score * state.turn;
}

function search(state, depth, alpha, beta, o, ctx, ply) {
  if (ctx.deadline && (++ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline) throw TIMEOUT;
  const moves = getLegalMoves(state, o);
  if (moves.length === 0) return -WIN + ply;
  if (state.quiet >= o.drawAfterQuietPlies) return 0;
  const forced = moves[0].captures.length > 0 || moves.length === 1;
  if (depth <= 0 && !(forced && depth > -MAX_EXTENSION)) return evaluate(state, o);
  order(moves);
  let best = -Infinity;
  for (const m of moves) {
    const v = -search(applyMove(state, m), depth - 1, -beta, -alpha, o, ctx, ply + 1);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

function order(moves) {
  moves.sort((a, b) => (b.captures.length - a.captures.length) || (b.promote - a.promote));
}

function scoreRoot(state, moves, depth, o, ctx, fullWindow) {
  let alpha = -Infinity;
  const scored = [];
  for (const m of moves) {
    const lower = fullWindow ? -Infinity : alpha;
    const v = -search(applyMove(state, m), depth - 1, -Infinity, -lower, o, ctx, 1);
    scored.push({ move: m, score: v });
    if (v > alpha) alpha = v;
  }
  return scored;
}

// With a narrowed window, later moves can tie the best only as an upper bound,
// so ties are broken randomly only when every move was searched with a full window.
function pickBest(scored, rng, randomTies) {
  const top = Math.max(...scored.map((s) => s.score));
  const ties = scored.filter((s) => s.score >= top - 0.001);
  return randomTies ? ties[Math.floor(rng() * ties.length)].move : ties[0].move;
}

/** Pick a move for the side to move. level: 'easy' | 'medium' | 'hard'. */
export function chooseMove(state, options, level = 'medium', rng = Math.random) {
  const o = withDefaults(options);
  const cfg = LEVELS[level] || LEVELS.medium;
  const moves = getLegalMoves(state, o);
  if (moves.length <= 1) return moves[0] || null;
  if (cfg.blunder && rng() < cfg.blunder) return moves[Math.floor(rng() * moves.length)];

  order(moves);
  if (!cfg.timeMs) {
    const ctx = { nodes: 0 };
    const scored = scoreRoot(state, moves, cfg.depth, o, ctx, cfg.noise > 0);
    for (const s of scored) s.score += (rng() - 0.5) * 2 * cfg.noise;
    return pickBest(scored, rng, true);
  }

  // Iterative deepening against the clock; keep the last fully searched depth.
  const ctx = { nodes: 0, deadline: Date.now() + cfg.timeMs };
  let best = moves[0];
  for (let d = 1; d <= cfg.depth; d++) {
    try {
      const scored = scoreRoot(state, moves, d, o, ctx, false);
      best = pickBest(scored, rng, false);
      // Search the best move first next iteration for better pruning.
      moves.splice(moves.indexOf(best), 1);
      moves.unshift(best);
      if (Math.max(...scored.map((s) => s.score)) > WIN - 1000) break; // found a forced win
    } catch (e) {
      if (e !== TIMEOUT) throw e;
      break;
    }
  }
  return best;
}
