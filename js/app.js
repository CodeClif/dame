import * as R from './rules.js';
import { CHARACTERS, TEAMS, TEAM_ROSTER, BASE_ROSTER, characterSVG, DEFS_SVG } from './characters.js';
import { boardSVG, titleSVG, doodle, packIcon, icon, wobblyCircle, seeded } from './sketch.js';
import { sfx, setSoundEnabled } from './sound.js';
import { chooseMove } from './ai.js';
import { encodeMove, decodeMove } from './protocol.js';
import { onlineConfigured } from './config.js';
import { emptyProgress, isUnlocked, recordGame, recordPuzzleProgress } from './progress.js';
import { getNick, getGroup } from './profile.js';
import { puzzleState, bestDefence, dayNumber, puzzleForDay, recordSolve, currentStreak, shareText, winningMove } from './puzzles.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const otherTeam = (t) => (t === 'forest' ? 'market' : 'forest');

// ---------- settings (kept in localStorage when available) ----------

const SETTINGS_KEY = 'dame.settings.v1';
const settings = {
  flyingKings: true,
  menCaptureBackward: true,
  sound: true,
  captions: true,
  level: 'medium',
  team: 'forest',
  theme: 'pencil',
  speed: false, // speed mode: 10 seconds a turn
  night: null, // null follows the phone's light/dark setting
  lineups: { forest: [...TEAM_ROSTER.forest], market: [...TEAM_ROSTER.market] },
};
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  Object.assign(settings, saved, { lineups: { ...settings.lineups, ...(saved.lineups || {}) } });
} catch { /* private mode: defaults are fine */ }
// ---------- progress: streaks and unlocked characters ----------

const PROGRESS_KEY = 'dame.progress.v1';
let progress = emptyProgress();
try { progress = { ...progress, ...JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') }; } catch { /* defaults */ }
function saveProgress() { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* ignore */ } }

for (const t of ['forest', 'market']) {
  settings.lineups[t] = settings.lineups[t].filter((k) => CHARACTERS[k]?.team === t && isUnlocked(k, progress));
  if (!settings.lineups[t].length) settings.lineups[t] = [...BASE_ROSTER[t]];
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}
setSoundEnabled(settings.sound);

// ---------- look: board palette + night mode ----------

const THEMES = [
  { id: 'pencil', name: 'Green pencil', sq: '#cfe7c4', ha: '#3d8b47' },
  { id: 'ink', name: 'Blue ink', sq: '#d6e4f7', ha: '#2747a8' },
  { id: 'sepia', name: 'Sepia kente', sq: '#e2c9a0', ha: '#8b5a2b' },
  { id: 'berry', name: 'Pink purple', sq: '#f2d3ea', ha: '#a23a8f' },
  { id: 'contrast', name: 'High contrast', sq: '#0b5a2e', ha: '#e9ffe9' },
];
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const isNight = () => settings.night ?? darkQuery.matches;
function applyLook() {
  if (!THEMES.some((t) => t.id === settings.theme)) settings.theme = 'pencil';
  document.body.dataset.theme = settings.theme;
  document.body.classList.toggle('night', isNight());
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', isNight() ? '#142039' : '#fdfbf3');
}
darkQuery.addEventListener?.('change', () => { if (settings.night == null) applyLook(); });
applyLook();

// ---------- margin notes ----------

const LINES = {
  start: ['Akwaaba! let’s play', 'may the best crew win', 'small small, no rush', 'eyes on the board o!'],
  capture: ['captures get personal', 'Ei! see as you take am!', 'oops, sorry o', 'chop chop!', 'that one pain small', 'Hwɛ yie! (watch out!)'],
  multi: ['double wahala!', 'two for one, chale!', 'Ei! combo!', 'Ayekoo! (well done!)'],
  back: ['Sankofa! (go back and fetch it)'],
  king: ['king me!', 'Nana has arrived!', 'crown dey!', 'royalty o!'],
  must: ['you must capture!', 'no dodging — take am!', 'a capture is waiting…'],
  stuck: ['that one can’t move', 'try another piece'],
  win: ['Ayekoo!', 'Medaase for playing!'],
};
let lastLine = '';
function say(kind, force = false) {
  if (!settings.captions && !force) return;
  const pool = LINES[kind] || [kind];
  let text = pick(pool);
  if (pool.length > 1 && text === lastLine) text = pick(pool);
  lastLine = text;
  const el = $('#caption');
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth; // restart the write-in animation
  el.style.transform = `rotate(${((Math.random() - 0.5) * 5).toFixed(1)}deg)`;
  el.classList.add('show');
}

// ---------- screens ----------

const setup = { mode: 'cpu' };
let currentScreen = 'home';

function go(id) {
  if (id === 'setup') renderSetup();
  if (id === 'howto') renderHowto();
  if (id === 'shop') renderShop();
  if (id === 'settings') renderSettings();
  if (id === 'home' && currentScreen !== 'home') document.body.classList.add('skip-intro');
  if (id !== 'game' && G) { G.token = Symbol('left'); clearInterval(G.clockTimer); } // stop pending moves and clocks
  currentScreen = id;
  document.body.dataset.screen = id;
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  document.body.classList.toggle('playing', id === 'game');
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (!b) return;
  sfx.tap();
  if (b.dataset.mode) setup.mode = b.dataset.mode;
  go(b.dataset.go);
});

function paintIcons(root = document) {
  $$('[data-icon]', root).forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
  $$('.icon-btn.back', root).forEach((el) => { el.innerHTML = icon('back'); });
  $$('.sound-toggle', root).forEach((el) => {
    const ic = icon(settings.sound ? 'sound' : 'mute');
    el.innerHTML = el.classList.contains('ctrl')
      ? `<span class="ic">${ic}</span><span>${settings.sound ? 'Sound' : 'Muted'}</span>`
      : ic;
    el.setAttribute('aria-pressed', String(settings.sound));
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.sound-toggle')) return;
  settings.sound = !settings.sound;
  setSoundEnabled(settings.sound);
  saveSettings();
  paintIcons();
  sfx.tap();
});

// ---------- home ----------

// The menu board shows a full starting position with the saved line-ups.
function renderHome() {
  $('#title').innerHTML = titleSVG();
  const hb = $('#home-board');
  hb.innerHTML = `${boardSVG(21)}<div class="home-pieces"></div>`;
  const bottom = settings.team;
  const count = { 1: 0, [-1]: 0 };
  let html = '';
  let n = 0;
  R.createInitialState().board.forEach((p, s) => {
    if (!p) return;
    const side = R.sideOf(p);
    const list = settings.lineups[side === 1 ? bottom : otherTeam(bottom)];
    const key = list[count[side]++ % list.length];
    html += `<div class="piece char guest" style="--r:${R.rowOf(s)};--c:${R.colOf(s)};--pop:${(3.2 + n++ * 0.035).toFixed(2)}s;--delay:${(-Math.random() * 2.6).toFixed(2)}s;--blink:${(-Math.random() * 4.6).toFixed(2)}s"><div class="hopper">${characterSVG(key)}</div></div>`;
  });
  $('.home-pieces', hb).innerHTML = html;
  $('#home').addEventListener('pointerdown', () => document.body.classList.add('skip-intro'), { once: true });
}

function renderDoodles() {
  const items = [['sun', 'd-sun'], ['moon', 'd-moon'], ['fish', 'd-fish'], ['snail', 'd-snail'], ['bird', 'd-bird'], ['ladybug', 'd-ladybug'], ['star', 'd-star']];
  // Sun and moon sit in their own layer above the screens so they can be tapped.
  $('#sky').innerHTML = items.slice(0, 2).map(([n, cls], i) => `<button class="doodle ${cls} daynight" aria-label="Switch day or night">${doodle(n, i + 5)}</button>`).join('');
  $('#doodles').innerHTML = items.slice(2).map(([n, cls], i) => `<div class="doodle ${cls}">${doodle(n, i + 7)}</div>`).join('');
  $('#bunting').innerHTML = doodle('bunting');
  $('#g-sun').innerHTML = doodle('sun', 11);
  $('#g-moon').innerHTML = doodle('moon', 12);
  $('#ground').innerHTML = `<div class="g-fish">${doodle('fish', 13)}</div><div class="g-snail">${doodle('snail', 14)}</div>
    <div class="g-bird">${doodle('bird', 15)}</div><div class="g-ladybug">${doodle('ladybug', 16)}</div>
    <div class="waves"><svg viewBox="0 0 300 14" preserveAspectRatio="none"><path d="M0 8q12-8 25 0t25 0 25 0 25 0 25 0 25 0 25 0 25 0 25 0 25 0 25 0 25 0" fill="none" stroke="#7fb7d6" stroke-width="2" stroke-linecap="round"/></svg></div>`;
}

// Tapping the sun or moon doodle flips between day and night.
document.addEventListener('click', (e) => {
  if (!e.target.closest('.daynight')) return;
  settings.night = !isNight();
  saveSettings();
  applyLook();
  sfx.scribble();
});

// ---------- setup ----------

function renderSetup() {
  const cpu = setup.mode === 'cpu';
  $('#level-field').hidden = !cpu;
  $('#lineup2-field').hidden = cpu;
  $('#team-label').textContent = cpu ? 'You play as' : 'Player 1 (bottom) plays as';
  $('#lineup1-label').innerHTML = `${cpu ? 'Your' : 'Player 1'} line-up <small>(tap to add or remove)</small>`;
  $('#lineup2-label').innerHTML = 'Player 2 line-up <small>(top of the board)</small>';
  $$('#level-seg button').forEach((b) => b.classList.toggle('on', b.dataset.level === settings.level));
  $$('#team-seg button').forEach((b) => b.classList.toggle('on', b.dataset.team === settings.team));
  renderLineup($('#lineup1'), settings.team);
  if (!cpu) renderLineup($('#lineup2'), otherTeam(settings.team));
  $('#speed-toggle').checked = settings.speed;
}
$('#speed-toggle').addEventListener('change', (e) => { settings.speed = e.target.checked; saveSettings(); sfx.tap(); });

function renderLineup(el, team) {
  const chosen = settings.lineups[team];
  el.innerHTML = TEAM_ROSTER[team].map((k) => {
    const ch = CHARACTERS[k];
    if (!isUnlocked(k, progress)) {
      const why = ch.seasonal ? `Coming: ${ch.seasonal}` : ch.unlock.text;
      return `<button class="card off sealed" data-char="${k}" data-why="${why}" aria-disabled="true">
        <span class="pic char">${characterSVG(k, { withBase: false })}</span>
        <span class="nm">${ch.name}</span><span class="kd">🔒 ${why}</span></button>`;
    }
    const on = chosen.includes(k);
    const locked = on && chosen.length === 1; // the last one can't be removed
    return `<button class="card ${on ? 'on' : 'off'}${locked ? ' locked' : ''}" data-char="${k}" aria-pressed="${on}"${locked ? ' aria-disabled="true"' : ''}>
      <span class="pic char">${characterSVG(k, { withBase: false })}</span>
      <span class="nm">${ch.name}</span><span class="kd">${ch.kind}</span></button>`;
  }).join('');
  el.dataset.team = team;
}

$('#level-seg').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  settings.level = b.dataset.level;
  saveSettings();
  sfx.tap();
  renderSetup();
});
$('#team-seg').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  settings.team = b.dataset.team;
  saveSettings();
  sfx.tap();
  renderSetup();
});
for (const id of ['#lineup1', '#lineup2']) {
  $(id).addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    if (card.classList.contains('sealed')) {
      sfx.error();
      card.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 240);
      return;
    }
    const team = e.currentTarget.dataset.team;
    const list = settings.lineups[team];
    const k = card.dataset.char;
    if (list.includes(k)) {
      if (list.length === 1) { sfx.error(); card.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 240); return; }
      list.splice(list.indexOf(k), 1);
    } else {
      list.push(k);
      list.sort((a, b) => TEAM_ROSTER[team].indexOf(a) - TEAM_ROSTER[team].indexOf(b));
    }
    saveSettings();
    sfx.tap();
    renderSetup();
  });
}
$('#start-btn').addEventListener('click', () => {
  sfx.scribble();
  const bottom = settings.team;
  newGame({
    mode: setup.mode,
    level: settings.level,
    teams: { 1: bottom, [-1]: otherTeam(bottom) },
    lineups: {
      1: [...settings.lineups[bottom]],
      [-1]: setup.mode === 'cpu' ? [...BASE_ROSTER[otherTeam(bottom)]] : [...settings.lineups[otherTeam(bottom)]],
    },
    firstTurn: 1,
    turnSeconds: settings.speed ? 10 : 0,
  });
});

// ---------- game ----------

let G = null;
const boardEl = $('#board');
const piecesEl = $('#pieces');
const overlayEl = $('#overlay');

function newGame(config) {
  G = {
    config,
    mode: config.mode,
    level: config.level,
    opts: config.opts || { flyingKings: settings.flyingKings, menCaptureBackward: settings.menCaptureBackward },
    teams: config.teams,
    human: config.mode === 'online'
      ? { [config.localSide]: true, [-config.localSide]: false }
      : { 1: true, [-1]: config.mode === 'pnp' },
    turnSeconds: config.turnSeconds || 0,
    puzzle: config.puzzle ? { ...config.puzzle, used: 0 } : null,
    timeline: [], // { snap, move } for the replay clip
    localSide: config.localSide || 1,
    flip: config.mode === 'online' && config.localSide === -1,
    online: config.online || null, // the online controller, when playing a friend
    log: [], // encoded moves, in order
    state: config.startRows ? R.stateFromRows(config.startRows, config.firstTurn ?? 1) : R.createInitialState(config.firstTurn),
    ids: new Array(64).fill(null),
    pieces: new Map(),
    history: [],
    captured: { 1: [], [-1]: [] }, // characters each side has taken
    moves: [],
    selected: null,
    busy: true,
    over: false,
    lastMove: null,
    token: Symbol('game'),
  };
  if (G?.clockTimer) clearInterval(G.clockTimer);
  // Hand out characters, back row first, cycling through each line-up.
  for (const side of [1, -1]) {
    const rows = side === 1 ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const chars = config.lineups[side];
    let k = 0;
    for (const r of rows) {
      for (let c = 0; c < 8; c++) {
        const s = R.sq(r, c);
        if (R.sideOf(G.state.board[s]) !== side) continue;
        const id = `${side}:${k}`;
        G.pieces.set(id, { side, char: chars[k % chars.length], king: R.isKing(G.state.board[s]) });
        G.ids[s] = id;
        k++;
      }
    }
  }
  // Resuming an online game: replay the stored moves straight onto the board.
  for (const code of config.moves || []) {
    const m = decodeMove(G.state, G.opts, code);
    if (!m) break;
    commitMove(m);
  }
  document.body.dataset.mode = config.mode;
  go('game');
  $('#board-art').innerHTML = boardSVG(7 + Math.floor(Math.random() * 1000));
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
  const files = 'abcdefgh'.split('');
  if (G.flip) { ranks.reverse(); files.reverse(); }
  $('#ranks').innerHTML = ranks.map((n, i) => `<span style="--i:${i}">${n}</span>`).join('');
  $('#files').innerHTML = files.map((l, i) => `<span style="--i:${i + 8}">${l}</span>`).join('');
  overlayEl.innerHTML = '';
  $('#trail').innerHTML = '';
  $('#fx').innerHTML = '';
  renderPieces(true);
  renderBars();
  renderTray();
  drawTrail();
  const token = G.token;
  setTimeout(() => {
    if (G.token !== token) return;
    if (G.puzzle) say(`win in ${G.puzzle.par}!`, true);
    else if (!G.log.length) say('start');
    G.busy = false;
    startTurn();
    drainRemote();
  }, 2100);
}

// Apply a move to the game model without animating it (used when resuming).
function commitMove(move) {
  const side = R.sideOf(G.state.board[move.from]);
  const id = G.ids[move.from];
  for (const c of move.captures) {
    const victim = G.pieces.get(G.ids[c]);
    if (victim) G.captured[side].push(victim.char);
    G.pieces.delete(G.ids[c]);
    G.ids[c] = null;
  }
  G.state = R.applyMove(G.state, move);
  G.ids[move.from] = null;
  G.ids[move.to] = id;
  if (move.promote) G.pieces.get(id).king = true;
  G.lastMove = move;
  G.log.push(encodeMove(move));
}

// Online guests see the board turned round so their own pieces are at the bottom.
// `view` maps a board square to the square drawn on screen (it is its own inverse).
const view = (s) => (G?.flip ? 63 - s : s);
const vRow = (s) => R.rowOf(view(s));
const vCol = (s) => R.colOf(view(s));
const bottomSide = () => (G?.flip ? -1 : 1);
const barFor = (side) => (side === bottomSide() ? $('#bar-bottom') : $('#bar-top'));

function place(el, s) {
  el.style.setProperty('--r', vRow(s));
  el.style.setProperty('--c', vCol(s));
}

function renderPieces(intro = false) {
  piecesEl.innerHTML = '';
  let n = 0;
  for (let s = 0; s < 64; s++) {
    const id = G.ids[s];
    if (!id) continue;
    const info = G.pieces.get(id);
    const el = document.createElement('div');
    el.className = `piece char${info.king ? ' king' : ''}`;
    el.innerHTML = `<div class="hopper">${characterSVG(info.char)}</div>`;
    el.style.setProperty('--delay', `${(-Math.random() * 2.6).toFixed(2)}s`);
    el.style.setProperty('--blink', `${(-Math.random() * 4.6).toFixed(2)}s`);
    place(el, s);
    info.el = el;
    piecesEl.appendChild(el);
    if (intro) {
      el.firstElementChild.animate(
        [{ opacity: 0, transform: 'translateY(-40%) scale(.3)' }, { opacity: 1, transform: 'translateY(4%) scale(1.06)', offset: 0.7 }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: 1250 + n++ * 28, fill: 'backwards', easing: 'ease-out' },
      );
    }
  }
}

function sideLabel(side) {
  if (G.mode === 'cpu') return side === 1 ? 'You' : 'Computer';
  if (G.mode === 'puzzle') return side === 1 ? 'You' : `Puzzle #${G.puzzle.day}`;
  if (G.mode === 'online') return side === G.localSide ? 'You' : (G.config.names?.[side] || 'Friend');
  return side === 1 ? 'Player 1' : 'Player 2';
}

function renderBars() {
  for (const side of [1, -1]) {
    const bar = barFor(side);
    const team = TEAMS[G.teams[side]];
    let sub = G.mode === 'cpu' && side === -1 ? `${team.short} · ${G.level}` : G.mode === 'online' ? team.short : team.name;
    if (G.mode === 'puzzle') sub = side === 1 ? `win in ${G.puzzle.par}` : G.puzzle.title;
    bar.innerHTML = `<span class="avatar char">${characterSVG(G.config.lineups[side][0])}</span>
      <span class="who">${sideLabel(side)}</span>
      <span class="status"><span class="sub">${sub}</span><span class="thinking hand">thinking…</span></span>
      <span class="clock hand" data-clock></span>
      <span class="count"><i style="background:${team.color}"></i><b data-count>${R.countPieces(G.state.board, side)}</b></span>`;
  }
  updateBars();
}

function updateBars(thinking = false) {
  for (const side of [1, -1]) {
    const bar = barFor(side);
    bar.classList.toggle('active', !G.over && G.state.turn === side);
    bar.classList.toggle('thinking-on', thinking && G.state.turn === side);
    $('[data-count]', bar).textContent = `×${R.countPieces(G.state.board, side)}`;
  }
  boardEl.dataset.turn = G.over ? '' : String(G.state.turn * bottomSide());
  $('#undo-btn').disabled = !G.history.length;
}

// Captured-pieces tray under the board: each side's haul as little heads.
function renderTray(fresh = null) {
  const halves = $$('.tray-side');
  for (const side of [1, -1]) {
    const el = halves[side === bottomSide() ? 0 : 1];
    $('.tl', el).textContent = `${sideLabel(side)} took`;
    const list = G.captured[side];
    $('.heads', el).innerHTML = list.map((k, i) => `<span class="char${fresh === side && i === list.length - 1 ? ' new' : ''}">${characterSVG(k, { withBase: false })}</span>`).join('');
  }
}

function startTurn() {
  if (!G || G.over) return;
  const result = R.getResult(G.state, G.opts);
  if (result) { endGame(result); return; }
  G.moves = R.getLegalMoves(G.state, G.opts);
  G.selected = null;
  updateBars();
  drawOverlay();
  startClock();
  if (G.mode === 'puzzle') {
    if (G.state.turn === 1 && G.puzzle.used >= G.puzzle.par) { puzzleOver(false); return; }
    if (G.state.turn === -1) puzzleReply();
    return;
  }
  if (!G.human[G.state.turn] && G.mode === 'cpu') cpuTurn();
}

// ----- turn clock (speed mode, online timer) -----

function startClock() {
  clearInterval(G.clockTimer);
  api.setClock(1, '');
  api.setClock(-1, '');
  if (G.puzzle) { api.setClock(1, `move ${Math.min(G.puzzle.used + 1, G.puzzle.par)}/${G.puzzle.par}`); return; }
  const secs = G.turnSeconds;
  const turn = G.state.turn;
  if (!secs || G.over || (!G.human[turn] && G.mode !== 'online')) return; // the computer is quick enough
  const deadline = Date.now() + secs * 1000;
  let played = false;
  let claimed = false;
  const tick = () => {
    if (!G || G.over || G.state.turn !== turn) { clearInterval(G?.clockTimer); return; }
    const left = Math.ceil((deadline - Date.now()) / 1000);
    const l = Math.max(0, left);
    api.setClock(turn, `${Math.floor(l / 60)}:${String(l % 60).padStart(2, '0')}`, l <= (secs > 10 ? 5 : 3));
    if (left <= 0 && G.human[turn] && !played && !G.busy) {
      played = true;
      say('too slow — random move!', true);
      api.autoMove();
    }
    if (left <= -20 && !G.human[turn] && !claimed) { claimed = true; G.online?.remoteTimedOut(); }
  };
  tick();
  G.clockTimer = setInterval(tick, 250);
}

// ----- daily puzzle -----

let puzzleData = null;
async function loadPuzzles() {
  puzzleData ||= fetch('data/puzzles.json').then((r) => r.json()).then((d) => d.puzzles);
  return puzzleData;
}
const PUZZLE_KEY = 'dame.puzzle.v1';
const puzzleRecord = () => { try { return JSON.parse(localStorage.getItem(PUZZLE_KEY) || 'null'); } catch { return null; } };

async function openPuzzle() {
  let list;
  try { list = await loadPuzzles(); } catch { openModal('<h2>No puzzle yet</h2><p>Connect once to download the puzzles, then they work offline.</p><div class="actions"><button class="sketch-btn big" data-act="close">OK</button></div>'); return; }
  const day = dayNumber();
  const p = puzzleForDay(list, day);
  const bottom = settings.team;
  newGame({
    mode: 'puzzle',
    puzzle: { id: p.id, day, par: p.moves, title: p.title },
    startRows: p.rows,
    firstTurn: p.turn ?? 1,
    opts: p.options,
    teams: { 1: bottom, [-1]: otherTeam(bottom) },
    lineups: { 1: [...settings.lineups[bottom]], [-1]: [...BASE_ROSTER[otherTeam(bottom)]] },
  });
}

function refreshPuzzleButton() {
  const rec = puzzleRecord();
  const streak = currentStreak(rec, dayNumber());
  $('#puzzle-btn').innerHTML = `Daily puzzle${rec?.solved?.[dayNumber()] ? ' ✓' : ''}${streak ? ` <small>🔥${streak}</small>` : ''}`;
}

function puzzleReply() {
  const token = G.token;
  G.busy = true;
  updateBars(true);
  setTimeout(() => {
    if (G.token !== token) return;
    updateBars(false);
    const m = bestDefence(G.state, G.puzzle.par - G.puzzle.used, G.opts);
    if (m) performMove(m, true);
  }, 650);
}

function puzzleOver(won) {
  if (G.over) return;
  G.over = true;
  G.busy = false;
  clearInterval(G.clockTimer);
  updateBars();
  drawOverlay();
  const { day, par, used, id } = G.puzzle;
  const today = day === dayNumber();
  let notes = '';
  let streak = currentStreak(puzzleRecord(), dayNumber());
  if (won) {
    sfx.win();
    say('Ayekoo!', true);
    for (const p of G.pieces.values()) if (p.side === 1) p.el?.classList.add('dance');
    const before = puzzleRecord();
    if (today && !before?.solved?.[day]) {
      const rec = recordSolve(before, day, used);
      try { localStorage.setItem(PUZZLE_KEY, JSON.stringify(rec)); } catch { /* ignore */ }
      streak = rec.streak;
      const r = recordPuzzleProgress(progress, rec);
      progress = r.progress;
      saveProgress();
      notes = unlockNotes(r.unlocked);
      award('puzzle');
      refreshPuzzleButton();
    } else if (before?.solved?.[day]) {
      notes = '<p class="note">Already counted today — this one was practice.</p>';
    }
  } else {
    sfx.lose();
  }
  const text = shareText({ day, movesUsed: used, par, streak, url: location.origin + location.pathname });
  const clip = clipButton();
  setTimeout(() => {
    openModal(won
      ? `<h2>Solved! 🧩</h2><p>Puzzle #${day} · ${used}/${par} move${par > 1 ? 's' : ''}<br><b>🔥 ${streak}-day streak</b></p>${notes}
        <div class="actions">
          <button class="sketch-btn big" data-act="share">Share result</button>
          <a class="sketch-btn wa" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">Send on WhatsApp</a>
          ${clip}
          <button class="sketch-btn" data-act="home">Main menu</button>
        </div>
        <p class="note">A new puzzle every day at midnight (GMT).</p>`
      : `<h2>Not quite!</h2><p>Puzzle #${day} needs a win in ${par}. Small small — try again.</p>
        <div class="actions">
          <button class="sketch-btn big" data-act="retry">Try again</button>
          <button class="sketch-btn" data-act="show">Show me the first move</button>
          <button class="sketch-btn" data-act="home">Main menu</button>
        </div>`, {
      share: async () => {
        if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* cancelled */ } }
        try { await navigator.clipboard.writeText(text); $('#sheet .note').textContent = 'Result copied — paste it anywhere.'; } catch { /* ignore */ }
      },
      retry: () => { closeModal(); openPuzzle(); },
      show: async () => {
        closeModal();
        await openPuzzle();
        const list = await loadPuzzles();
        const p = list.find((x) => x.id === id);
        const m = winningMove(puzzleState(p), p.moves, p.options);
        setTimeout(() => { if (G?.puzzle && m) { G.selected = m.from; drawOverlay(m); say('psst… start here', true); } }, 2200);
      },
      clip: () => makeClip(),
      home: () => { closeModal(); go('home'); },
    }, false);
  }, won ? 1100 : 500);
}

// ----- moves from the other player (online) -----

const remoteQueue = [];
/** Queue an opponent's move; it is checked against the rules before it is played. */
function remoteMove(code, ply, catchUp = false) {
  remoteQueue.push({ code, ply, catchUp });
  drainRemote();
}
function drainRemote() {
  if (!G || G.mode !== 'online' || G.busy || G.over) return;
  while (remoteQueue.length) {
    const { code, ply, catchUp } = remoteQueue.shift();
    if (ply < G.log.length) continue; // already have it
    // Catch-up moves (after a reconnect) may be our own; live ones must be the opponent's.
    if (ply > G.log.length || (!catchUp && G.human[G.state.turn])) { G.online?.outOfSync(); remoteQueue.length = 0; return; }
    const move = decodeMove(G.state, G.opts, code);
    if (!move) { G.online?.outOfSync(); remoteQueue.length = 0; return; }
    performMove(move, true);
    return; // performMove calls drainRemote again when it is done
  }
}

// ----- computer opponent (in a worker, falling back to the main thread) -----

let worker = null;
let reqId = 0;
const pending = new Map();
function getWorker() {
  if (worker !== null) return worker;
  try {
    worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => { pending.get(e.data.id)?.(e.data.move); pending.delete(e.data.id); };
    worker.onerror = () => {
      worker = false;
      for (const resolve of pending.values()) resolve(undefined);
      pending.clear();
    };
  } catch {
    worker = false;
  }
  return worker;
}
function askAI(state, opts, level) {
  const local = () => chooseMove(state, opts, level);
  const w = getWorker();
  if (!w) return sleep(30).then(local);
  return new Promise((resolve) => {
    const id = ++reqId;
    pending.set(id, (move) => resolve(move === undefined ? local() : move));
    w.postMessage({ id, state, opts, level });
  });
}

async function cpuTurn() {
  const token = G.token;
  G.busy = true;
  updateBars(true);
  const started = Date.now();
  const move = await askAI(G.state, G.opts, G.level);
  await sleep(Math.max(0, 700 - (Date.now() - started)));
  if (!G || G.token !== token) return;
  updateBars(false);
  if (move) await performMove(move);
}

// ----- taps -----

boardEl.addEventListener('pointerdown', (e) => {
  if (!G || G.busy || G.over || !G.human[G.state.turn]) return;
  const rect = boardEl.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 8;
  const y = ((e.clientY - rect.top) / rect.height) * 8;
  if (x < 0 || y < 0 || x >= 8 || y >= 8) return;
  e.preventDefault();
  handleTap(view(R.sq(Math.floor(y), Math.floor(x))), y - Math.floor(y));
});

function handleTap(s, fracY) {
  const turn = G.state.turn;
  if (G.selected != null) {
    const options = G.moves.filter((m) => m.from === G.selected && m.to === s);
    if (options.length) {
      options.sort((a, b) => b.captures.length - a.captures.length);
      performMove(options[0]);
      return;
    }
  }
  // Characters stand taller than their square: a tap on a head lands in the square above.
  if (R.sideOf(G.state.board[s]) !== turn && fracY > 0.55 && vRow(s) < 7 && R.sideOf(G.state.board[view(view(s) + 8)]) === turn) s = view(view(s) + 8);
  if (R.sideOf(G.state.board[s]) !== turn) {
    if (G.selected != null) { G.selected = null; drawOverlay(); sfx.tap(); }
    return;
  }
  const mine = G.moves.filter((m) => m.from === s);
  if (!mine.length) {
    sfx.error();
    const info = G.pieces.get(G.ids[s]);
    shake(info.el);
    if (G.moves[0]?.captures.length) {
      say('must', true);
      for (const m of G.moves) shake(G.pieces.get(G.ids[m.from]).el);
    } else {
      say('stuck', true);
    }
    return;
  }
  if (G.selected === s) { G.selected = null; drawOverlay(); sfx.tap(); return; }
  G.selected = s;
  sfx.select();
  drawOverlay();
}

function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 420);
}

// ----- red pen overlay -----

const center = (s) => [vCol(s) * 100 + 50, vRow(s) * 100 + 50];
const penRand = seeded(99);

function drawOverlay(hintMove = null) {
  let svg = '';
  const humanTurn = G && !G.over && G.human[G.state.turn] && !G.busy;
  if (humanTurn && G.selected == null && G.moves[0]?.captures.length) {
    const froms = [...new Set(G.moves.map((m) => m.from))];
    for (const f of froms) {
      const [x, y] = center(f);
      svg += `<circle class="must-ring" cx="${x}" cy="${y}" r="44"/>`;
    }
  }
  if (G && G.selected != null) {
    const [x, y] = center(G.selected);
    svg += `<path class="ring" pathLength="1" d="${wobblyCircle(x, y, 46, penRand, 0.06)}"/>`;
    for (const m of G.moves.filter((mv) => mv.from === G.selected)) {
      const pts = m.path.map(center);
      svg += `<path class="route" d="M${pts.map((p) => p.join(' ')).join('L')}"/>`;
      const [tx, ty] = pts[pts.length - 1];
      svg += `<circle class="target" cx="${tx}" cy="${ty}" r="20"/>`;
      for (const c of m.captures) {
        const [cx, cy] = center(c);
        svg += `<path class="xmark" d="M${cx - 13} ${cy - 30}l26 22m0 -22l-26 22"/>`;
      }
    }
  }
  if (hintMove) {
    const [tx, ty] = center(hintMove.to);
    svg += `<circle class="hint-ring" cx="${tx}" cy="${ty}" r="36"/>`;
  }
  overlayEl.innerHTML = svg;
}

function drawTrail() {
  const m = G.lastMove;
  $('#trail').innerHTML = m ? `<path class="last" d="M${m.path.map((s) => center(s).join(' ')).join('L')}"/>` : '';
}

// ----- moving, capturing, crowning -----

const cellTransform = (r, c) => `translate(calc(${c} * 100%), calc(${r} * 100%))`;

function hop(el, a, b) {
  const [ra, ca, rb, cb] = [vRow(a), vCol(a), vRow(b), vCol(b)];
  const dist = Math.abs(rb - ra);
  const duration = 300 + dist * 75;
  const travel = el.animate([{ transform: cellTransform(ra, ca) }, { transform: cellTransform(rb, cb) }],
    { duration, easing: 'cubic-bezier(.45,.05,.4,1)' });
  el.firstElementChild.animate([
    { transform: 'translateY(0) scale(1,1)' },
    { transform: 'translateY(-3%) scale(1.07,.9)', offset: 0.1 },
    { transform: `translateY(-${28 + dist * 7}%) scale(.95,1.06)`, offset: 0.5 },
    { transform: 'translateY(0) scale(1.14,.84)', offset: 0.88 },
    { transform: 'translateY(0) scale(1,1)' },
  ], { duration });
  place(el, b); // the running animation hides the jump; when it ends the piece is already there
  return travel.finished.catch(() => {});
}

function sparkle(s) {
  const fx = document.createElement('div');
  fx.className = 'spark';
  fx.style.setProperty('--r', vRow(s));
  fx.style.setProperty('--c', vCol(s));
  const colors = ['#f6c431', '#d62828', '#3d8b47', '#4f74d0'];
  let rays = '';
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + Math.random() * 0.3;
    const r1 = 18 + Math.random() * 6;
    const r2 = 36 + Math.random() * 10;
    rays += `<path class="ray" pathLength="1" d="M${50 + Math.cos(a) * r1} ${50 + Math.sin(a) * r1}L${50 + Math.cos(a) * r2} ${50 + Math.sin(a) * r2}" stroke="${colors[k % 4]}" stroke-width="3.4" stroke-linecap="round"/>`;
  }
  for (let k = 0; k < 4; k++) {
    const x = 20 + Math.random() * 60;
    const y = 15 + Math.random() * 60;
    rays += `<path class="twk" style="animation-delay:${k * 70}ms" d="M${x} ${y - 7}l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffd34d" stroke="#2b2622" stroke-width="1.2"/>`;
  }
  fx.innerHTML = `<svg viewBox="0 0 100 100">${rays}</svg>`;
  $('#fx').appendChild(fx);
  setTimeout(() => fx.remove(), 1000);
}

function knockOut(s) {
  const id = G.ids[s];
  const info = G.pieces.get(id);
  if (!info?.el) return;
  const el = info.el;
  el.classList.add('shocked');
  el.style.zIndex = 40;
  sparkle(s);
  sfx.capture();
  const base = cellTransform(vRow(s), vCol(s));
  el.animate([
    { transform: base, opacity: 1 },
    { transform: `${base} translateY(-22%) rotate(-10deg) scale(1.1)`, opacity: 1, offset: 0.35 },
    { transform: `${base} translateY(35%) rotate(170deg) scale(0)`, opacity: 0 },
  ], { duration: 760, delay: 200, easing: 'ease-in', fill: 'forwards' }).finished.then(() => el.remove(), () => el.remove());
}

function snapshot() {
  return {
    state: G.state,
    ids: G.ids.slice(),
    pieces: [...G.pieces].map(([id, p]) => [id, { side: p.side, char: p.char, king: p.king }]),
    captured: { 1: [...G.captured[1]], [-1]: [...G.captured[-1]] },
    lastMove: G.lastMove,
  };
}

async function performMove(move, remote = false) {
  const token = G.token;
  G.busy = true;
  G.selected = null;
  drawOverlay();
  const snap = snapshot();
  G.history.push(snap);
  G.timeline.push({ snap, move });
  if (G.timeline.length > 40) G.timeline.shift();
  const id = G.ids[move.from];
  const info = G.pieces.get(id);
  const el = info.el;
  const side = info.side;
  el.style.zIndex = 50;
  for (let i = 0; i < move.path.length - 1; i++) {
    sfx.hop();
    await hop(el, move.path[i], move.path[i + 1]);
    if (G.token !== token) return;
    sfx.land();
    if (move.captures[i] != null) {
      const victim = G.pieces.get(G.ids[move.captures[i]]);
      if (victim) { G.captured[side].push(victim.char); renderTray(side); }
      knockOut(move.captures[i]);
      el.classList.add('cheer');
      await sleep(260);
    }
  }
  const wasMan = !R.isKing(G.state.board[move.from]);
  G.state = R.applyMove(G.state, move);
  G.ids[move.from] = null;
  for (const c of move.captures) { G.pieces.delete(G.ids[c]); G.ids[c] = null; }
  G.ids[move.to] = id;
  G.lastMove = move;
  G.log.push(encodeMove(move));
  if (G.mode === 'online' && !remote) G.online?.localMove(G.log[G.log.length - 1], G.log.length - 1);
  if (G.puzzle && side === 1) G.puzzle.used++;
  el.style.zIndex = '';
  drawTrail();

  const backwards = wasMan && move.path.some((p, i) => i > 0 && (R.rowOf(p) - R.rowOf(move.path[i - 1])) * R.forwardDir(side) < 0);
  if (move.promote) {
    info.king = true;
    el.classList.add('king', 'crowning');
    sfx.king();
    say('king');
    setTimeout(() => el.classList.remove('crowning'), 900);
  } else if (move.captures.length >= 2) {
    say('multi');
  } else if (backwards) {
    say('back');
  } else if (move.captures.length && Math.random() < 0.7) {
    say('capture');
  }
  if (move.captures.length) setTimeout(() => el.classList.remove('cheer'), 900);
  else el.classList.remove('cheer');
  updateBars();
  await sleep(move.captures.length ? 350 : 120);
  if (G.token !== token) return;
  G.busy = false;
  startTurn();
  drainRemote();
}

// ----- undo, hint, menu -----

$('#undo-btn').addEventListener('click', () => {
  if (!G || G.busy || !G.history.length) return;
  let snap = G.history.pop();
  while (snap && !G.human[snap.state.turn] && G.history.length) snap = G.history.pop();
  if (!snap || !G.human[snap.state.turn]) { if (snap) G.history.push(snap); return; }
  sfx.scribble();
  G.token = Symbol('undo');
  G.state = snap.state;
  G.ids = snap.ids;
  G.pieces = new Map(snap.pieces);
  G.lastMove = snap.lastMove;
  G.captured = snap.captured;
  G.over = false;
  renderPieces();
  renderTray();
  drawTrail();
  say('undo… pretend you saw nothing', true);
  startTurn();
});

$('#hint-btn').addEventListener('click', async () => {
  if (!G || G.busy || G.over || !G.human[G.state.turn] || G.puzzle) return;
  sfx.tap();
  const token = G.token;
  G.busy = true;
  const move = await askAI(G.state, G.opts, 'medium');
  if (G.token !== token) return;
  G.busy = false;
  if (!move) return;
  G.selected = move.from;
  drawOverlay(move);
  say('psst… try this one', true);
});

$('#menu-btn').addEventListener('click', () => {
  sfx.tap();
  if (G?.mode === 'online') {
    openModal(`<h2>Paused</h2><p class="hand" style="font-size:22px">Your friend can still see the board.</p>
      <div class="actions">
        <button class="sketch-btn big" data-act="close">Back to the game</button>
        <button class="sketch-btn" data-act="resign"${G.over ? ' disabled' : ''}>Resign this game</button>
        <button class="sketch-btn" data-act="leave">Leave the room</button>
      </div>`, {
      resign: () => { closeModal(); G.online?.resign(); },
      leave: () => { closeModal(); G.online?.leave(); },
    });
    return;
  }
  openModal(`<h2>Paused</h2><p class="hand" style="font-size:22px">Take a breather, chale.</p>
    <div class="actions">
      <button class="sketch-btn big" data-act="close">Back to the game</button>
      <button class="sketch-btn" data-act="restart">Restart this match</button>
      <button class="sketch-btn" data-act="howto">How to play</button>
      <button class="sketch-btn" data-act="home">Quit to menu</button>
    </div>`, {
    restart: () => { closeModal(); newGame(G.config); },
    howto: () => { closeModal(); go('howto'); },
    home: () => { closeModal(); go('home'); },
  });
});

// ----- end of game -----

function endGame(result) {
  if (G.over) return;
  if (G.mode === 'puzzle') { puzzleOver(result.winner === 1); return; }
  clearInterval(G.clockTimer);
  G.over = true;
  G.busy = false;
  updateBars();
  drawOverlay();
  G.online?.gameEnded(result);
  const { winner, reason } = result;
  const humanWon = G.mode === 'pnp' || G.human[winner];
  // Streaks, unlocks and leaderboard points (cosmetic only; no stakes, no prizes).
  let notes = '';
  if (G.mode === 'cpu' || G.mode === 'online') {
    const r = recordGame(progress, winner ? !!G.human[winner] : null);
    progress = r.progress;
    saveProgress();
    notes = unlockNotes(r.unlocked);
    if (G.mode === 'cpu' && winner === 1) award(`cpu-${G.level}`);
    if (G.mode === 'online') award(winner === G.localSide ? 'online-win' : 'online-play');
  }
  const clip = clipButton();
  if (winner) {
    for (const p of G.pieces.values()) if (p.side === winner) p.el?.classList.add('dance');
    (humanWon ? sfx.win : sfx.lose)();
    say('win', true);
  }
  const loser = -winner;
  let title;
  let line;
  if (!winner) {
    title = 'It’s a draw!';
    line = 'Twenty-five quiet king moves each — no wahala, shake hands.';
  } else {
    const team = TEAMS[G.teams[winner]].name;
    const you = sideLabel(loser) === 'You';
    if (G.mode === 'cpu') title = humanWon ? 'You win! Ayekoo!' : 'The computer wins';
    else if (G.mode === 'online') title = humanWon ? 'You win! Ayekoo!' : `${sideLabel(winner)} wins`;
    else title = `${sideLabel(winner)} wins!`;
    const reasons = {
      'no-pieces': `The ${team} took every last piece.`,
      blocked: `${sideLabel(loser)} ${you ? 'have' : 'has'} no moves left. ${team} take it!`,
      resign: `${sideLabel(loser)} resigned. Good game!`,
      left: `${sideLabel(loser)} left the game.`,
      timeout: `${sideLabel(loser)} ran out of time.`,
    };
    line = reasons[reason] || reasons.blocked;
  }
  const party = winner
    ? [...new Set(G.config.lineups[winner])].slice(0, 4).map((k) => `<div class="piece char cheer dance"><div class="hopper">${characterSVG(k)}</div></div>`).join('')
    : `<div class="piece char dance"><div class="hopper">${characterSVG(G.config.lineups[1][0])}</div></div><div class="piece char dance"><div class="hopper">${characterSVG(G.config.lineups[-1][0])}</div></div>`;
  const onlineActions = `<div class="actions">
        <button class="sketch-btn big" data-act="orematch">Ask for a rematch</button>
        <button class="sketch-btn" data-act="leave">Leave the room</button>
      </div>`;
  setTimeout(() => {
    if (G.mode === 'online') {
      openModal(`<h2>${title}</h2><div class="party">${party}</div><p>${line}</p>${notes}${onlineActions.replace('</div>', `${clip}</div>`)}
        <div class="ad-slot" role="note" aria-label="Advertisement placeholder"><b>Ad space</b> · banner 320×50</div>`, {
        orematch: () => { G.online?.requestRematch(); },
        clip: () => makeClip(),
        leave: () => { closeModal(); G.online?.leave(); },
      }, false);
      return;
    }
    openModal(`<h2>${title}</h2><div class="party">${party}</div><p>${line}</p>${notes}
      <div class="actions">
        <button class="sketch-btn big" data-act="rematch">Rematch</button>
        ${clip}
        <button class="sketch-btn" data-act="teams">Change crews</button>
        <button class="sketch-btn" data-act="home">Main menu</button>
      </div>
      <div class="ad-slot" role="note" aria-label="Advertisement placeholder"><b>Ad space</b> · banner 320×50</div>`, {
      rematch: () => { closeModal(); newGame({ ...G.config, firstTurn: -G.config.firstTurn }); },
      clip: () => makeClip(),
      teams: () => { closeModal(); setup.mode = G.mode; go('setup'); },
      home: () => { closeModal(); go('home'); },
    }, false);
  }, winner ? 1300 : 600);
}

function unlockNotes(keys) {
  return keys.map((k) => `<p class="unlock">🎉 New friend unlocked: <b>${CHARACTERS[k].name}</b> the ${CHARACTERS[k].kind}! Add them in your line-up.</p>`).join('');
}

/** Leaderboard points, sent only when the player has chosen a nickname and a group. */
function award(reason) {
  const points = { 'cpu-easy': 1, 'cpu-medium': 2, 'cpu-hard': 3, 'online-win': 3, 'online-play': 1, puzzle: 2 }[reason];
  if (!onlineConfigured() || !getNick() || !getGroup() || !points || !navigator.onLine) return;
  import('./leaderboard.js').then((m) => m.addPoints(reason, points)).catch(() => {});
}

// ----- replay clip -----

const canRecord = () => typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream;
const clipButton = () => (canRecord() && G?.timeline.length ? '<button class="sketch-btn" data-act="clip">🎬 Make a replay clip</button>' : '');
async function makeClip() {
  const timeline = G.timeline.slice(-12);
  const finalSnap = snapshot();
  openModal('<h2>Recording…</h2><p class="hand" style="font-size:24px">Drawing your last moves into a little video.</p><canvas id="clip-canvas" class="clip-canvas"></canvas>', {}, false);
  try {
    const m = await import('./replay.js');
    const { blob, ext } = await m.recordClip({
      canvas: $('#clip-canvas'),
      boardSvg: $('#board-art svg'),
      timeline,
      finalSnap,
      flip: G.flip,
      title: `${sideLabel(bottomSide())} vs ${sideLabel(-bottomSide())}`,
    });
    const url = URL.createObjectURL(blob);
    const file = new File([blob], `dame-replay.${ext}`, { type: blob.type });
    const canShareFile = navigator.canShare?.({ files: [file] });
    openModal(`<h2>Your replay 🎬</h2><video class="clip-video" src="${url}" autoplay loop muted playsinline></video>
      <div class="actions">
        ${canShareFile ? '<button class="sketch-btn big" data-act="share">Share video</button>' : ''}
        <a class="sketch-btn${canShareFile ? '' : ' big'}" href="${url}" download="dame-replay.${ext}">Save video</a>
        <button class="sketch-btn" data-act="close">Close</button>
      </div>`, {
      share: async () => { try { await navigator.share({ files: [file], title: 'Dame replay' }); } catch { /* cancelled */ } },
    });
  } catch (e) {
    openModal(`<h2>No clip this time</h2><p>This phone’s browser can’t record video (${String(e.message || e).slice(0, 60)}).</p><div class="actions"><button class="sketch-btn big" data-act="close">OK</button></div>`);
  }
}

// ---------- modal ----------

let modalActions = {};
function openModal(html, actions = {}, dismissable = true) {
  modalActions = actions;
  $('#sheet').innerHTML = html;
  $('#modal').hidden = false;
  $('#modal').dataset.dismissable = dismissable ? '1' : '';
}
function closeModal() { $('#modal').hidden = true; }
$('#modal').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (b) {
    sfx.tap();
    if (b.dataset.act === 'close') closeModal();
    else modalActions[b.dataset.act]?.();
    return;
  }
  if (e.target.id === 'modal' && e.currentTarget.dataset.dismissable) closeModal();
});

// ---------- how to play ----------

function renderHowto() {
  const fk = settings.flyingKings;
  const mb = settings.menCaptureBackward;
  $('#howto-body').innerHTML = `
    <span class="mini char">${characterSVG('tortoise')}</span>
    <h3>The aim</h3>
    <p>Capture all of your opponent’s pieces, or leave them with no move to make.</p>
    <h3>Setting up</h3>
    <p>Each side has 12 pieces on the green squares of the first three rows. Pieces only ever stand on green squares.</p>
    <h3>Moving</h3>
    <p>An ordinary piece (a “man”) steps one square diagonally forward onto an empty green square.</p>
    <span class="mini char">${characterSVG('drummer')}</span>
    <h3>Capturing</h3>
    <ul>
      <li>Jump over an enemy piece right next to you onto the empty square just behind it. The jumped piece is out.</li>
      <li><b>Capturing is compulsory.</b> If any capture is possible you must take one. Pieces that can capture get a dashed red ring.</li>
      <li>If you can jump again after landing, you must keep going — one turn can take a whole line (<span class="tw">double wahala!</span>).</li>
      <li>${mb ? 'Men may capture <b>backwards</b> as well as forwards.' : 'Men capture <b>forwards only</b> (backward capture is switched off in Settings).'}</li>
      <li>Pieces you jump stay on the board until your turn ends, so you can’t jump the same piece twice.</li>
    </ul>
    <h3>Kings</h3>
    <p>Reach the far side of the board and you are crowned king.
    ${fk ? 'Kings <b>fly</b>: they glide any distance along a diagonal, and can capture a piece far away as long as the squares in between are empty, landing on any empty square beyond it.'
    : 'Kings move and capture one square at a time, but in any diagonal direction.'}
    A man who reaches the far side in the middle of a capture chain carries on capturing and is only crowned if he finishes there.</p>
    <h3>Draws</h3>
    <p>If 25 moves each go by with only kings moving and nothing captured, the game is a draw.</p>
    <h3>On this phone</h3>
    <ul>
      <li>Tap a piece: red pen circles it and dotted lines show every square it can reach. Tap an end point to go.</li>
      <li><b>Hint</b> suggests a move, <b>Undo</b> takes back your last move.</li>
      <li>Change flying kings and backward captures in <b>Settings</b>.</li>
    </ul>
    <h3>Daily puzzle</h3>
    <p>One position a day, the same for everyone. Win within the number of moves shown (the computer defends as well as it can). Solve on consecutive days to grow your 🔥 streak, then share your result.</p>
    <h3>Speed mode</h3>
    <p>Switch it on before a match: 10 seconds a turn. If the clock runs out, a random move is played for you.</p>
    <h3>Unlockable friends</h3>
    <p>Win streaks and puzzle streaks unlock extra characters for your line-up. They only change how your pieces look — every piece follows the same rules. Seasonal friends arrive later in the year.</p>
    <h3>Playing a friend online</h3>
    <ul>
      <li>Tap <b>Play a friend online</b>, pick a nickname and create a room. Share the invite link (or the 6-letter code) on WhatsApp or SMS.</li>
      <li>The room uses the host’s rules. If your signal drops, open the link again and the game carries on where it stopped.</li>
      <li>With a turn timer on, a random move is played for you when time runs out.</li>
      <li>Chat with quick phrases, emoji or short messages. Rude words are hidden, and you can mute or report anyone.</li>
    </ul>
    <h3>A few words from the margins</h3>
    <ul>
      <li><span class="tw">Akwaaba</span> — welcome (Twi)</li>
      <li><span class="tw">Ayekoo</span> — well done (Twi)</li>
      <li><span class="tw">Hwɛ yie</span> — be careful (Twi)</li>
      <li><span class="tw">Medaase</span> — thank you (Twi)</li>
      <li><span class="tw">Sankofa</span> — go back and fetch it</li>
      <li><span class="tw">Chale</span> — friend; <span class="tw">wahala</span> — trouble (Ghanaian Pidgin)</li>
    </ul>`;
}

// ---------- shop ----------

const PACKS = [
  { id: 'sea', name: 'Sea Breeze', blurb: 'Beach friends from the coast road.', icons: ['crab', 'jelly', 'starfish'], price: 'GH₵ 5.00' },
  { id: 'festival', name: 'Festival Night', blurb: 'Kites, lanterns and a clay pot that dances.', icons: ['kite', 'lantern', 'pot'], price: 'GH₵ 5.00' },
  { id: 'village', name: 'Village Yard', blurb: 'The owl, the hen and the goat who never listens.', icons: ['owl', 'hen', 'goat'], price: 'GH₵ 4.00' },
];

function renderShop() {
  $('#packs').innerHTML = PACKS.map((p) => `
    <article class="pack">
      <h3>${p.name}</h3><p>${p.blurb}</p>
      <div class="icons">${p.icons.map((i) => `<span>${packIcon(i)}</span>`).join('')}</div>
      <div class="row"><span class="price">${p.price}</span>
        <button class="sketch-btn momo" data-pack="${p.id}">Pay via MoMo</button></div>
    </article>`).join('');
}

$('#packs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pack]');
  if (!b) return;
  sfx.tap();
  const p = PACKS.find((x) => x.id === b.dataset.pack);
  openModal(`<h2>Pay via MoMo</h2><p><b>${p.name}</b> pack · ${p.price}</p>
    <form class="momo-form" onsubmit="return false">
      <label for="momo-num">Mobile money number</label>
      <input id="momo-num" type="tel" inputmode="tel" placeholder="0XX XXX XXXX" autocomplete="off">
      <label for="momo-net">Network</label>
      <select id="momo-net"><option>Choose your network</option></select>
    </form>
    <span class="stamp">coming soon</span>
    <p class="note">Preview only: no payment is taken and nothing you type here is sent anywhere.</p>
    <div class="actions"><button class="sketch-btn momo" disabled>Send payment prompt</button>
    <button class="sketch-btn" data-act="close">Close</button></div>`);
});

// ---------- settings ----------

const swatch = (t) => `<svg viewBox="0 0 40 40"><rect width="40" height="40" fill="#fffef8"/>
  <rect x="20" width="20" height="20" fill="${t.sq}"/><rect y="20" width="20" height="20" fill="${t.sq}"/>
  <path d="M22 18L38 2M28 18L38 8M20 12L32 0M2 38L18 22M8 38L18 28M0 32L12 20" stroke="${t.ha}" stroke-width="2"/>
  <path d="M0 20H40M20 0V40" stroke="#24304f" stroke-width="1.6"/><rect width="40" height="40" fill="none" stroke="#24304f" stroke-width="2.4"/></svg>`;

function renderSettings() {
  $$('[data-setting]').forEach((input) => { input.checked = !!settings[input.dataset.setting]; });
  $('#themes').innerHTML = THEMES.map((t) => `<button class="theme-btn${t.id === settings.theme ? ' on' : ''}" data-theme-id="${t.id}" aria-pressed="${t.id === settings.theme}">${swatch(t)}<span>${t.name}</span></button>`).join('');
  $('#night-toggle').checked = isNight();
}
$('#themes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-theme-id]');
  if (!b) return;
  settings.theme = b.dataset.themeId;
  saveSettings();
  applyLook();
  sfx.tap();
  renderSettings();
});
$('#night-toggle').addEventListener('change', (e) => {
  settings.night = e.target.checked;
  saveSettings();
  applyLook();
  sfx.tap();
});
$$('[data-setting]').forEach((input) => input.addEventListener('change', () => {
  settings[input.dataset.setting] = input.checked;
  if (input.dataset.setting === 'sound') { setSoundEnabled(input.checked); paintIcons(); }
  saveSettings();
  sfx.tap();
}));

// ---------- online play (loaded only when needed) ----------

/** What the online module may do to the game. */
const api = {
  settings, saveSettings, sfx, say, go, openModal, closeModal, newGame, remoteMove, endGame,
  get game() { return G; },
  isOver: () => !G || G.over,
  /** Play a move for the local player (turn timer ran out). */
  autoMove() {
    if (!G || G.over || G.busy || !G.human[G.state.turn]) return;
    const moves = R.getLegalMoves(G.state, G.opts);
    if (moves.length) performMove(moves[Math.floor(Math.random() * moves.length)]);
  },
  setClock(side, text, low = false) {
    if (!G) return;
    const el = $('[data-clock]', barFor(side));
    if (el) { el.textContent = text; el.classList.toggle('low', low); }
  },
  bubble(side, text) {
    if (!G) return;
    const bar = barFor(side);
    $('.bubble', bar)?.remove();
    const b = document.createElement('span');
    b.className = `bubble ${side === bottomSide() ? 'up' : 'down'}`;
    b.textContent = text;
    bar.appendChild(b);
    bar.style.zIndex = 25; // lift the bubble above the bunting and board
    setTimeout(() => { b.remove(); if (!$('.bubble', bar)) bar.style.zIndex = ''; }, 4200);
  },
  sideLabel: (side) => sideLabel(side),
};

let onlineModule = null;
async function online() {
  onlineModule ||= import('./online.js').then((m) => { m.init(api); return m; });
  return onlineModule;
}
$('#puzzle-btn').addEventListener('click', () => { sfx.tap(); openPuzzle(); });
$('#leaders-btn').addEventListener('click', async () => {
  sfx.tap();
  (await import('./leaderboard.js')).open(api);
});
$('#friend-btn').addEventListener('click', async () => {
  sfx.tap();
  (await online()).open();
});

// ---------- boot ----------

document.body.insertAdjacentHTML('afterbegin', DEFS_SVG);
paintIcons();
renderDoodles();
renderHome();
$('#friend-btn').hidden = !onlineConfigured();
$('#leaders-btn').hidden = !onlineConfigured();
refreshPuzzleButton();
// An invite link (?room=CODE) goes straight to the join screen.
if (new URLSearchParams(location.search).has('room')) {
  document.body.classList.add('skip-intro');
  online().then((m) => m.open(new URLSearchParams(location.search).get('room')));
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Console helpers for debugging, e.g. dame.position(['........', ...], 1).
window.dame = {
  get game() { return G; },
  get progress() { return progress; },
  openPuzzle,
  newGame,
  go,
  position(rows, turn = 1) {
    if (!G) return;
    G.token = Symbol('debug');
    G.state = R.stateFromRows(rows, turn);
    G.ids = new Array(64).fill(null);
    G.pieces = new Map();
    G.history = [];
    G.captured = { 1: [], [-1]: [] };
    G.over = false;
    G.busy = false;
    G.state.board.forEach((p, s) => {
      if (!p) return;
      const side = R.sideOf(p);
      const id = `${side}:d${s}`;
      const list = G.config.lineups[side];
      G.pieces.set(id, { side, char: list[s % list.length], king: R.isKing(p) });
      G.ids[s] = id;
    });
    renderPieces();
    renderBars();
    renderTray();
    startTurn();
  },
};
