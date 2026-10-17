// Online-play helpers shared by the browser and the tests: compact move encoding,
// room codes, nicknames, chat filtering and rate limiting. No DOM, no network.
import { getLegalMoves, applyMove, createInitialState } from './rules.js';

// One character per square, so a move is its path: "kQ" or "kQ3" for a double jump.
const SQUARES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function encodeMove(move) {
  return move.path.map((s) => SQUARES[s]).join('');
}

/** The legal move in this position whose path matches the code, or null. */
export function decodeMove(state, options, code) {
  if (typeof code !== 'string' || code.length < 2 || code.length > 20) return null;
  const path = [...code].map((ch) => SQUARES.indexOf(ch));
  if (path.some((s) => s < 0)) return null;
  return getLegalMoves(state, options).find((m) => m.path.length === path.length
    && m.path.every((s, i) => s === path[i])) || null;
}

/** Replay encoded moves from the start, checking every one. Stops at the first bad move. */
export function replayMoves(codes, options, firstTurn = 1) {
  let state = createInitialState(firstTurn);
  const moves = [];
  for (const code of codes) {
    const move = decodeMove(state, options, code);
    if (!move) return { state, moves, error: `illegal move #${moves.length + 1}` };
    moves.push(move);
    state = applyMove(state, move);
  }
  return { state, moves, error: null };
}

// ---------- rooms ----------

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

export function makeRoomCode(rand = Math.random) {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return code;
}

export function normalizeRoomCode(s) {
  const code = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.length === 6 && [...code].every((ch) => CODE_CHARS.includes(ch)) ? code : null;
}

export const roomExpired = (createdAt, now = Date.now()) => !createdAt || now - createdAt > ROOM_TTL_MS;

// ---------- chat ----------

export const QUICK_PHRASES = ['Ei!', 'Chale!', 'You try!', 'Akwaaba', 'Good game', 'Ayekoo!', 'Hwɛ yie!', 'Medaase'];
export const EMOJI = ['😂', '👏', '🔥', '😮', '🙏', '👀', '😅', '🤝'];
export const MAX_CHAT = 80;

// Kept short and mild on purpose; words are compared after undoing common disguises.
const BAD_WORDS = new Set([
  'fuck', 'fucker', 'fuckin', 'fucking', 'motherfucker', 'shit', 'shity', 'bulshit', 'bitch', 'bastard', 'cunt',
  'dick', 'cock', 'pusy', 'ashole', 'whore', 'slut', 'nigger', 'niga', 'fag', 'fagot', 'retard', 'porn', 'wanker', 'twat',
  // Twi / Ghanaian Pidgin insults
  'kwasia', 'kwasea', 'gyimi', 'etwe', 'shua', 'kote', 'ashawo', 'otwea',
]);
const BAD_PARTS = ['fuck', 'shit', 'cunt', 'nigg', 'bitch', 'whore', 'kwasia'];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '+': 't' };

function squash(word) {
  return [...word.toLowerCase()].map((ch) => LEET[ch] ?? ch).join('')
    .replace(/[^a-zɛɔ]/g, '').replace(/(.)\1+/g, '$1');
}

export function isBadWord(word) {
  const w = squash(word);
  if (!w) return false;
  return BAD_WORDS.has(w) || BAD_PARTS.some((p) => w.includes(p));
}

export function containsProfanity(text) {
  const words = String(text).split(/\s+/);
  if (words.some(isBadWord)) return true;
  // Catch spaced-out spellings like "f u c k".
  const joined = squash(words.filter((w) => w.length <= 2).join(''));
  return BAD_PARTS.some((p) => joined.includes(p));
}

/** Trim, cap at 80 characters and mask rude words. */
export function cleanChat(text) {
  let t = String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  t = [...t].slice(0, MAX_CHAT).join('');
  return t.split(' ').map((w) => (isBadWord(w) ? `${[...w][0]}${'✱'.repeat(Math.max(2, [...w].length - 1))}` : w)).join(' ');
}

/** A tidy nickname, or null if it is empty or rude. */
export function cleanNickname(s) {
  const n = String(s ?? '').replace(/[^\p{L}\p{N} _.-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (n.length < 2 || containsProfanity(n)) return null;
  return n;
}

/** Allows at most `burst` messages per `windowMs`, and no two closer than `gapMs`. */
export class RateLimiter {
  constructor({ gapMs = 1200, burst = 5, windowMs = 15000 } = {}) {
    Object.assign(this, { gapMs, burst, windowMs });
    this.times = [];
  }

  allow(now = Date.now()) {
    this.times = this.times.filter((t) => now - t < this.windowMs);
    const last = this.times[this.times.length - 1];
    if (last != null && now - last < this.gapMs) return false;
    if (this.times.length >= this.burst) return false;
    this.times.push(now);
    return true;
  }
}
