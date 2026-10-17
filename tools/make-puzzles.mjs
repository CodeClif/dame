// Generates data/puzzles.json: sparse positions where the bottom side (to move) can force
// a win within a set number of moves. Seeded, so the output is reproducible.
//   node tools/make-puzzles.mjs            -> writes data/puzzles.json
// To add your own, append entries by hand (see README) and run `npm test` to check them.
import fs from 'node:fs';
import { sq, isDarkSquare, getLegalMoves, getResult } from '../js/rules.js';
import { movesToWin, winningFirstMoves } from '../js/puzzles.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rand = seeded(20261001);
const pick = (n) => Math.floor(rand() * n);
const dark = [];
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (isDarkSquare(r, c)) dark.push(sq(r, c));

function randomPosition() {
  const board = new Array(64).fill(0);
  const place = (piece, ok) => { for (let t = 0; t < 50; t++) { const s = dark[pick(dark.length)]; if (!board[s] && ok(s >> 3)) { board[s] = piece; return; } } };
  const mine = 2 + pick(3);
  const theirs = 1 + pick(3);
  for (let i = 0; i < mine; i++) place(rand() < 0.3 ? 2 : 1, (r) => r > 0);
  for (let i = 0; i < theirs; i++) place(rand() < 0.25 ? -2 : -1, (r) => r < 7);
  return { board, turn: 1, quiet: 0 };
}
const toRows = (b) => Array.from({ length: 8 }, (_, r) => b.slice(r * 8, r * 8 + 8).map((p) => ({ 0: '.', 1: 'x', 2: 'X', [-1]: 'o', [-2]: 'O' })[p]).join(''));

const RULES = [
  { name: 'flying', options: { flyingKings: true, menCaptureBackward: true } },
  { name: 'classic', options: { flyingKings: false, menCaptureBackward: false } },
];
const TITLES = ['Clean sweep', 'Chale, finish am', 'Sankofa strike', 'Market rush', 'Double wahala', 'Small small', 'Last stand', 'Corner trap', 'The long road', 'Akwaaba to the end', 'Royal visit', 'No escape', 'Ei! one shot', 'Patience pays', 'Under the mango tree', 'Tro-tro express', 'Kente knot', 'Harmattan haze', 'Drum roll', 'Fisherman’s net'];

const want = { 1: 5, 2: 15, 3: 10 };
const found = [];
const seen = new Set();
let tries = 0;
while (Object.values(want).some((v) => v > 0) && tries < 400000) {
  tries++;
  const rules = RULES[tries % 4 === 0 ? 1 : 0];
  const s = randomPosition();
  if (s.board.filter(Boolean).length < 4) continue; // too bare to be fun
  if (getResult(s, rules.options)) continue;
  if (getLegalMoves({ ...s, turn: -1 }, rules.options).length === 0) continue;
  const myMoves = getLegalMoves(s, rules.options);
  if (myMoves.length < 3) continue; // not a puzzle if the move is forced
  const n = movesToWin(s, rules.options, 3);
  if (!n || want[n] <= 0) continue;
  const winners = winningFirstMoves(s, n, rules.options);
  if (winners.length > (n === 1 ? 1 : 2)) continue; // keep the solution tight
  const key = toRows(s.board).join('/');
  if (seen.has(key)) continue;
  seen.add(key);
  want[n]--;
  found.push({ rows: toRows(s.board), turn: 1, moves: n, rules: rules.name, options: rules.options });
}
// Mix the order so difficulty varies through the month, then number them.
found.sort(() => rand() - 0.5);
const puzzles = found.map((p, i) => ({ id: i + 1, title: TITLES[i % TITLES.length], ...p }));
fs.writeFileSync(new URL('../data/puzzles.json', import.meta.url), `${JSON.stringify({ version: 1, puzzles }, null, 1)}\n`);
console.log(`wrote ${puzzles.length} puzzles after ${tries} tries`, puzzles.map((p) => p.moves).join(''));
