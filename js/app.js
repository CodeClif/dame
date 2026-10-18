import * as R from './rules.js';
import { CHARACTERS, TEAMS, TEAM_ROSTER, BASE_ROSTER, characterSVG, DEFS_SVG } from './characters.js';
import { boardSVG, titleSVG, doodle, packIcon, icon, wobblyCircle, seeded } from './sketch.js';
import { sfx, setSoundEnabled } from './sound.js';
import { chooseMove } from './ai.js';
import { encodeMove, decodeMove } from './protocol.js';
import { skillOf, travelFrames, strike } from './moves.js';
import { hasRig, rigMarkup, act, fidget } from './rigs.js';
import { onlineConfigured } from './config.js';
import { emptyProgress, isUnlocked, recordGame, recordPuzzleProgress } from './progress.js';
import { getNick, getGroup } from './profile.js';
import { count, setCountsAllowed } from './analytics.js';
import { buildRecap } from './recap.js';
import { puzzleState, bestDefence, dayNumber, puzzleForDay, recordSolve, currentStreak, onFreeze, shareText, winningMove } from './puzzles.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const otherTeam = (t) => (t === 'forest' ? 'market' : 'forest');
// Modes played against a person on another phone: live rooms and games over days.
const NET = new Set(['online', 'days']);

// ---------- settings (kept in localStorage when available) ----------

const SETTINGS_KEY = 'dame.settings.v1';
const settings = {
  flyingKings: true,
  menCaptureBackward: true,
  sound: true,
  captions: true,
  skills: true, // signature moves: each character's own travel and capture animation
  level: 'medium',
  team: 'forest',
  theme: 'pencil',
  speed: false, // speed mode: 10 seconds a turn
  counts: true, // anonymous daily totals (see privacy.html)
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

// Testers (from the link on test.html, ?tester) get every character for this visit. Nothing is saved.
const TESTER = (() => {
  try {
    if (new URLSearchParams(location.search).has('tester')) sessionStorage.setItem('dame.tester', '1');
    return sessionStorage.getItem('dame.tester') === '1';
  } catch { return false; }
})();
const unlocked = (k) => (TESTER && !CHARACTERS[k]?.seasonal) || isUnlocked(k, progress);

for (const t of ['forest', 'market']) {
  settings.lineups[t] = settings.lineups[t].filter((k) => CHARACTERS[k]?.team === t && unlocked(k));
  if (!settings.lineups[t].length) settings.lineups[t] = [...BASE_ROSTER[t]];
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}
setSoundEnabled(settings.sound);
setCountsAllowed(() => settings.counts);

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
  el.classList.toggle('long', text.length > 24);
  el.classList.toggle('longer', text.length > 36);
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

// Line-up cards, grouped: starters, streak unlocks, the two packs, then seasonal friends.
const GROUPS = [
  ['Starters', (c) => !c.unlock && !c.seasonal],
  ['Streak friends', (c) => c.unlock && !c.pack],
  ['Chop Bar pack', (c) => c.pack === 'Chop Bar'],
  ['Wildlife pack', (c) => c.pack === 'Wildlife'],
  ['Seasonal (coming soon)', (c) => c.seasonal],
];
function renderLineup(el, team) {
  const chosen = settings.lineups[team];
  const card = (k) => {
    const ch = CHARACTERS[k];
    if (!unlocked(k)) {
      const why = ch.seasonal ? `Coming: ${ch.seasonal}` : ch.unlock.text;
      return `<button class="card off sealed" data-char="${k}" data-why="${why}" aria-disabled="true" aria-label="${ch.name}, locked: ${why}">
        <span class="lock" aria-hidden="true">🔒 Locked</span>
        <span class="pic char">${characterSVG(k, { withBase: false })}</span>
        <span class="nm">${ch.name}</span><span class="kd">${why}</span></button>`;
    }
    const on = chosen.includes(k);
    const locked = on && chosen.length === 1; // the last one can't be removed
    return `<button class="card ${on ? 'on' : 'off'}${locked ? ' locked' : ''}" data-char="${k}" aria-pressed="${on}"${locked ? ' aria-disabled="true"' : ''}${ch.quip ? ` title="${ch.quip}"` : ''}>
      <span class="pic char">${characterSVG(k, { withBase: false })}</span>
      <span class="nm">${ch.name}</span><span class="kd">${ch.kind}</span><span class="sk">✨${skillOf(k).name}</span></button>`;
  };
  el.innerHTML = (TESTER ? '<p class="pack-head hand">🧪 Test mode: every character is unlocked for this visit</p>' : '') + GROUPS.map(([label, test]) => {
    const keys = TEAM_ROSTER[team].filter((k) => test(CHARACTERS[k]));
    if (!keys.length) return '';
    const open = keys.filter((k) => unlocked(k)).length;
    return `<p class="pack-head hand">${label}${label === 'Starters' ? '' : ` <small>${open}/${keys.length} unlocked</small>`}</p>${keys.map(card).join('')}`;
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
    human: NET.has(config.mode)
      ? { [config.localSide]: true, [-config.localSide]: false }
      : { 1: true, [-1]: config.mode === 'pnp' },
    turnSeconds: config.turnSeconds || 0,
    puzzle: config.puzzle ? { ...config.puzzle, used: 0 } : null,
    timeline: [], // { snap, move } for the replay clip
    record: [], // what happened each move, for the post-game recap
    localSide: config.localSide || 1,
    flip: NET.has(config.mode) && config.localSide === -1,
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
    skillsShown: new Set(), // characters who have already announced their signature move
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
  document.body.dataset.play = config.mode;
  if (!config.moves?.length) count(`game_start_${config.mode}`);
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
    el.innerHTML = `<div class="hopper">${characterSVG(info.char, hasRig(info.char) ? { drawing: rigMarkup(info.char) } : {})}</div>`;
    el.dataset.char = info.char;
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
  if (NET.has(G.mode)) return side === G.localSide ? 'You' : (G.config.names?.[side] || 'Friend');
  return side === 1 ? 'Player 1' : 'Player 2';
}

function renderBars() {
  for (const side of [1, -1]) {
    const bar = barFor(side);
    const team = TEAMS[G.teams[side]];
    let sub = G.mode === 'cpu' && side === -1 ? `${team.short} · ${G.level}` : NET.has(G.mode) ? team.short : team.name;
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
  count('puzzle_play');
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
  const ice = rec?.freezes ? ` 🧊${rec.freezes}` : '';
  const warn = onFreeze(rec, dayNumber()) ? ' — on ice!' : '';
  $('#puzzle-btn').innerHTML = `Daily puzzle${rec?.solved?.[dayNumber()] ? ' ✓' : ''}${streak ? ` <small>🔥${streak}${ice}${warn}</small>` : ''}`;
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
  const endToken = G.token;
  G.over = true;
  G.busy = false;
  clearInterval(G.clockTimer);
  updateBars();
  drawOverlay();
  const { day, par, used, id } = G.puzzle;
  count('game_finish_puzzle');
  if (won) count('puzzle_solve');
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
      if (rec.frozen.includes(day - 1) && !before?.frozen?.includes(day - 1)) notes += '<p class="unlock">🧊 A streak freeze saved your streak for the day you missed.</p>';
      if (rec.freezes > (before?.freezes || 0)) notes += `<p class="unlock">🧊 You earned a streak freeze! It saves your streak if you miss a day (you have ${rec.freezes}).</p>`;
      try { localStorage.setItem(PUZZLE_KEY, JSON.stringify(rec)); } catch { /* ignore */ }
      streak = rec.streak;
      const r = recordPuzzleProgress(progress, rec);
      progress = r.progress;
      saveProgress();
      notes += unlockNotes(r.unlocked);
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
    if (G.token !== endToken || !G.over) return; // the game was restarted meanwhile
    openModal(won
      ? `<h2>Solved! 🧩</h2><p>Puzzle #${day} · ${used}/${par} move${par > 1 ? 's' : ''}<br><b>🔥 ${streak}-day streak</b></p>${notes}
        <div class="actions">
          <div class="pair">
            <button class="sketch-btn big" data-act="share">Share</button>
            <a class="sketch-btn big wa" data-act="wa" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">WhatsApp</a>
          </div>
          <div class="pair">${clip}<button class="sketch-btn" data-act="home">Main menu</button></div>
        </div>
        <p class="note">A new puzzle every day at midnight (GMT).</p>`
      : `<h2>Not quite!</h2><p>Puzzle #${day} needs a win in ${par}. Small small — try again.</p>
        <div class="actions">
          <button class="sketch-btn big" data-act="retry">Try again</button>
          <div class="pair"><button class="sketch-btn" data-act="show">Show first move</button>
          <button class="sketch-btn" data-act="home">Main menu</button></div>
        </div>`, {
      wa: () => count('puzzle_share'),
      share: async () => {
        count('puzzle_share');
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
  if (!G || !NET.has(G.mode) || G.busy || G.over) return;
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

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const showSkills = () => settings.skills && !reducedMotion.matches;

function hop(el, a, b, char) {
  const [ra, ca, rb, cb] = [vRow(a), vCol(a), vRow(b), vCol(b)];
  const dist = Math.abs(rb - ra);
  const style = showSkills() ? skillOf(char).travel : 'hop';
  const { frames, mul, easing } = travelFrames(style, dist);
  const duration = Math.round((300 + dist * 75) * mul);
  const travel = el.animate([{ transform: cellTransform(ra, ca) }, { transform: cellTransform(rb, cb) }],
    { duration, easing: style === 'hop' ? 'cubic-bezier(.45,.05,.4,1)' : easing });
  el.firstElementChild.animate(frames, { duration });
  if (style === 'stomp') setTimeout(() => $('.board-frame')?.animate([{ transform: 'none' }, { transform: 'translateY(2px)' }, { transform: 'translateY(-1px)' }, { transform: 'none' }], 180), duration * 0.85);
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

// The mover's secret skill: its own capture animation on the jumped piece.
function signatureCapture(s, mover, char, from) {
  const info = G.pieces.get(G.ids[s]);
  if (!info?.el) return Promise.resolve();
  const el = info.el;
  el.classList.add('shocked');
  el.style.zIndex = 40;
  sfx.capture();
  const [r, c] = [vRow(s), vCol(s)];
  return strike(char, {
    fx: $('#fx'), victim: el, base: cellTransform(r, c), r, c,
    mover: mover.firstElementChild, board: $('.board-frame'),
    dir: c >= vCol(from) ? 1 : -1,
  });
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
  G.record.push({
    ply: G.log.length,
    side: R.sideOf(G.state.board[move.from]),
    char: G.pieces.get(G.ids[move.from])?.char,
    captures: move.captures.length,
    maxAvail: Math.max(0, ...R.getLegalMoves(G.state, G.opts).map((m) => m.captures.length)),
    promote: !!move.promote,
    victims: move.captures.map((c) => ({ char: G.pieces.get(G.ids[c])?.char, king: R.isKing(G.state.board[c]) })),
  });
  G.history.push(snap);
  G.timeline.push({ snap, move });
  if (G.timeline.length > 40) G.timeline.shift();
  const id = G.ids[move.from];
  const info = G.pieces.get(id);
  const el = info.el;
  const side = info.side;
  el.style.zIndex = 50;
  const acted = showSkills() && hasRig(info.char);
  for (let i = 0; i < move.path.length - 1; i++) {
    if (acted) {
      // Characters with moving parts act the whole leg out themselves (fly, crawl, walk, stomp…).
      const [a, b] = [move.path[i], move.path[i + 1]];
      const cap = move.captures[i];
      const target = cap != null ? G.pieces.get(G.ids[cap]) : null;
      if (target) { G.captured[side].push(target.char); renderTray(side); }
      if (target?.el) { target.el.classList.add('shocked'); target.el.style.zIndex = 40; }
      if (cap != null && !G.skillsShown.has(info.char)) {
        G.skillsShown.add(info.char);
        say(`${CHARACTERS[info.char]?.name || 'Ei'}’s ${skillOf(info.char).name}!`);
      }
      sfx.hop();
      if (cap != null) setTimeout(() => sfx.capture(), 600);
      await act(info.char, el, [vRow(a), vCol(a)], [vRow(b), vCol(b)],
        target?.el ? { el: target.el, r: vRow(cap), c: vCol(cap) } : null,
        { fx: $('#fx'), board: $('.board-frame') });
      place(el, b);
      if (G.token !== token) return;
      sfx.land();
      if (cap != null) el.classList.add('cheer');
      continue;
    }
    sfx.hop();
    await hop(el, move.path[i], move.path[i + 1], info.char);
    if (G.token !== token) return;
    sfx.land();
    if (move.captures[i] != null) {
      const victim = G.pieces.get(G.ids[move.captures[i]]);
      if (victim) { G.captured[side].push(victim.char); renderTray(side); }
      el.classList.add('cheer');
      if (showSkills()) {
        if (!G.skillsShown.has(info.char)) {
          G.skillsShown.add(info.char);
          say(`${CHARACTERS[info.char]?.name || 'Ei'}’s ${skillOf(info.char).name}!`);
        }
        // Wait for the skill's big moment, but not for the piece to finish leaving.
        await Promise.race([signatureCapture(move.captures[i], el, info.char, move.path[i]), sleep(700)]);
      } else {
        knockOut(move.captures[i]);
        await sleep(260);
      }
      if (G.token !== token) return;
    }
  }
  const wasMan = !R.isKing(G.state.board[move.from]);
  G.state = R.applyMove(G.state, move);
  G.ids[move.from] = null;
  for (const c of move.captures) { G.pieces.delete(G.ids[c]); G.ids[c] = null; }
  G.ids[move.to] = id;
  G.lastMove = move;
  G.log.push(encodeMove(move));
  if (NET.has(G.mode) && !remote) G.online?.localMove(G.log[G.log.length - 1], G.log.length - 1);
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
  } else if (move.captures.length && CHARACTERS[info.char]?.quip && Math.random() < 0.5) {
    say(CHARACTERS[info.char].quip); // pack characters have their own voice
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
  if (NET.has(G?.mode)) {
    const days = G.mode === 'days';
    openModal(`<h2>Paused</h2><p class="hand">${days ? 'The game waits for you — come back any time.' : 'Your friend can still see the board.'}</p>
      <div class="actions">
        <button class="sketch-btn big" data-act="close">Back to the game</button>
        <button class="sketch-btn" data-act="resign"${G.over ? ' disabled' : ''}>Resign this game</button>
        <button class="sketch-btn" data-act="leave">${days ? 'My games' : 'Leave the room'}</button>
      </div>`, {
      resign: () => { closeModal(); G.online?.resign(); },
      leave: () => { closeModal(); G.online?.leave(); },
    });
    return;
  }
  openModal(`<h2>Paused</h2><p class="hand">Take a breather, chale.</p>
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
  const endToken = G.token;
  clearInterval(G.clockTimer);
  count(`game_finish_${G.mode}`);
  G.over = true;
  G.busy = false;
  updateBars();
  drawOverlay();
  G.online?.gameEnded(result);
  const { winner, reason } = result;
  const humanWon = G.mode === 'pnp' || G.human[winner];
  // Streaks, unlocks and leaderboard points (cosmetic only; no stakes, no prizes).
  let notes = '';
  if (G.mode === 'cpu' || NET.has(G.mode)) {
    const r = recordGame(progress, winner ? !!G.human[winner] : null);
    progress = r.progress;
    saveProgress();
    notes = unlockNotes(r.unlocked);
    if (G.mode === 'cpu' && winner === 1) award(`cpu-${G.level}`);
    if (NET.has(G.mode)) award(winner === G.localSide ? 'online-win' : 'online-play');
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
    else if (NET.has(G.mode)) title = humanWon ? 'You win! Ayekoo!' : `${sideLabel(winner)} wins`;
    else title = `${sideLabel(winner)} wins!`;
    const reasons = {
      'no-pieces': `The ${team} took every last piece.`,
      blocked: `${sideLabel(loser)} ${you ? 'have' : 'has'} no moves left. ${team} take it!`,
      resign: `${sideLabel(loser)} resigned. Good game!`,
      left: `${sideLabel(loser)} left the game.`,
      timeout: `${sideLabel(loser)} ran out of time.`,
      forfeit: `${sideLabel(loser)} didn’t move for 14 days, so the ${team} win by forfeit.`,
    };
    line = reasons[reason] || reasons.blocked;
  }
  // The recap, in the characters' voices; it replaces the dancing line-up when there is one.
  const recap = buildRecap({
    entries: G.record.filter((e) => e.char),
    localSide: G.mode === 'pnp' ? 1 : G.localSide,
    winner,
    twoHumans: G.mode === 'pnp',
    who: (k) => CHARACTERS[k] || { name: '?', kind: '' },
  });
  const recapHtml = recap.length >= 2 ? `<div class="recap">${recap.map((l) => `<p><span class="mini char">${characterSVG(l.char, { withBase: false })}</span><span class="hand">${l.text}</span></p>`).join('')}</div>` : '';
  const partyHtml = winner
    ? [...new Set(G.config.lineups[winner])].slice(0, 4).map((k) => `<div class="piece char cheer dance"><div class="hopper">${characterSVG(k)}</div></div>`).join('')
    : `<div class="piece char dance"><div class="hopper">${characterSVG(G.config.lineups[1][0])}</div></div><div class="piece char dance"><div class="hopper">${characterSVG(G.config.lineups[-1][0])}</div></div>`;
  const party = recapHtml ? '' : partyHtml;
  const labels = G.online?.menuLabels || { rematch: 'Ask for a rematch', leave: 'Leave the room' };
  const onlineActions = `<div class="actions">
        <button class="sketch-btn big" data-act="orematch">${labels.rematch}</button>
        <button class="sketch-btn" data-act="leave">${labels.leave}</button>
      </div>`;
  setTimeout(() => {
    if (G.token !== endToken || !G.over) return; // the game was restarted meanwhile
    if (NET.has(G.mode)) {
      openModal(`<h2>${title}</h2>${party ? `<div class="party">${party}</div>` : ''}<p>${line}</p>${recapHtml}${notes}${onlineActions.replace('</div>', `${clip}</div>`)}
        <div class="ad-slot" role="note" aria-label="Advertisement placeholder"><b>Ad space</b> · banner 320×50</div>`, {
        orematch: () => { G.online?.requestRematch(); },
        clip: () => makeClip(),
        leave: () => { closeModal(); G.online?.leave(); },
      }, false);
      return;
    }
    openModal(`<h2>${title}</h2>${party ? `<div class="party">${party}</div>` : ''}<p>${line}</p>${recapHtml}${notes}
      <div class="actions">
        <button class="sketch-btn big" data-act="rematch">Rematch</button>
        <div class="pair"><button class="sketch-btn" data-act="teams">Change crews</button>
        <button class="sketch-btn" data-act="home">Main menu</button></div>
        ${clip}
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
  if (!onlineConfigured() || !getNick() || !points || !navigator.onLine) return;
  import('./leaderboard.js').then((m) => m.addPoints(reason, points)).catch(() => {});
}

// ----- replay clip -----

const canRecord = () => typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream;
const clipButton = () => (canRecord() && G?.timeline.length ? '<button class="sketch-btn" data-act="clip">🎬 Replay clip</button>' : '');
async function makeClip() {
  const timeline = G.timeline.slice(-12);
  const finalSnap = snapshot();
  openModal('<h2>Recording…</h2><p class="hand">Drawing your last moves into a little video.</p><canvas id="clip-canvas" class="clip-canvas"></canvas>', {}, false, { closable: false });
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
// Every sheet gets a ✕ in the corner (actions.x overrides what it does), except busy
// ones opened with { closable: false }.
function openModal(html, actions = {}, dismissable = true, { closable = true } = {}) {
  modalActions = actions;
  $('#sheet').innerHTML = (closable ? '<button class="sheet-x" data-act="x" aria-label="Close">✕</button>' : '') + html;
  $('#sheet').scrollTop = 0;
  $('#modal').hidden = false;
  $('#modal').dataset.dismissable = dismissable ? '1' : '';
}
function closeModal() { $('#modal').hidden = true; }
$('#modal').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (b) {
    sfx.tap();
    if (b.dataset.act === 'x' && !modalActions.x) closeModal();
    else if (b.dataset.act === 'close') closeModal();
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
    <h3>Signature moves ✨</h3>
    <p>Every character has a secret skill they show off when they capture: the crocodile’s <b>Jaw Snap</b> chomps, the spider shoots a web line and slings pieces off the board, the fisherman casts a net, the tro-tro driver honks them off the board. They travel in their own way too — birds fly, the tortoise rolls, the elephant stomps. It’s all for fun: every character follows exactly the same rules. Switch it off in <b>Settings</b>.</p>
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
    <p><b>Streak freeze 🧊:</b> every 5 days in a row earns a freeze (hold up to 2). If you miss a single day, a freeze is used and your streak carries on.</p>
    <h3>Speed mode</h3>
    <p>Switch it on before a match: 10 seconds a turn. If the clock runs out, a random move is played for you.</p>
    <h3>Unlockable friends</h3>
    <p>Win streaks and puzzle streaks unlock extra characters for your line-up, including the <b>Chop Bar</b> and <b>Wildlife</b> packs. They only change how your pieces look — every piece follows the same rules. Seasonal friends arrive later in the year.</p>
    <h3>Weekly leagues</h3>
    <p>Score points by winning games or solving the daily puzzle and you join a league of up to 30 players for the week: Pebble, Cowrie, Bead, Kente, then Gold. In leagues of 10 or more, the top 5 move up and the bottom 5 move down. Just for fun — no prizes.</p>
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
  // Free packs first: earned with streaks, never bought. Then paid previews, clearly "coming soon".
  const free = ['Chop Bar', 'Wildlife'].map((pack) => {
    const keys = Object.keys(CHARACTERS).filter((k) => CHARACTERS[k].pack === pack);
    const open = keys.filter((k) => unlocked(k)).length;
    return `<article class="pack free">
      <h3>${pack} <small class="price">Free</small></h3>
      <p>${pack === 'Chop Bar' ? 'Six street-food sellers for the Market Crew.' : 'Six wild animals for the Forest Friends.'} Unlocked by win streaks and puzzle streaks — ${open}/6 so far.</p>
      <div class="icons">${keys.map((k) => `<span class="char${unlocked(k) ? '' : ' dim'}" title="${CHARACTERS[k].name} · ${unlocked(k) ? CHARACTERS[k].kind : CHARACTERS[k].unlock.text}">${characterSVG(k, { withBase: false })}</span>`).join('')}</div>
    </article>`;
  }).join('');
  const paid = PACKS.map((p) => `
    <article class="pack soon">
      <span class="stamp">coming soon</span>
      <h3>${p.name}</h3><p>${p.blurb}</p>
      <div class="icons">${p.icons.map((i) => `<span>${packIcon(i)}</span>`).join('')}</div>
      <div class="row"><span class="price">${p.price}</span>
        <button class="sketch-btn momo" data-pack="${p.id}">Pay via MoMo · soon</button></div>
    </article>`).join('');
  $('#packs').innerHTML = `${free}<p class="pack-head hand">Coming soon</p>${paid}`;
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
  paintInstall();
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

// Now and then a waiting character fidgets: a head tilt, a yawn, an ear flap…
setInterval(() => {
  if (!G || G.busy || currentScreen !== 'game' || document.hidden || !showSkills()) return;
  const idle = [...piecesEl.querySelectorAll('.piece')].filter((e) => hasRig(e.dataset.char));
  const e = idle[Math.floor(Math.random() * idle.length)];
  if (e) fidget(e.dataset.char, e);
}, 2200);

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
let daysModule = null;
async function days() {
  daysModule ||= import('./days.js').then((m) => { m.init(api); return m; });
  return daysModule;
}
api.days = days;
$('#games-btn').addEventListener('click', async () => { sfx.tap(); (await days()).openMyGames(); });
$('#games-new').addEventListener('click', async () => { sfx.tap(); (await online()).open('', 'days'); });
$('#friend-btn').addEventListener('click', async () => {
  sfx.tap();
  (await online()).open();
});

// ---------- install as an app ----------

let installPrompt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function paintInstall() {
  const text = $('#install-text');
  const btn = $('#install-btn');
  if (isStandalone()) { text.textContent = 'Installed — you’re playing the app version. ✓'; btn.hidden = true; return; }
  if (installPrompt) { text.textContent = 'Opens like an app and works offline.'; btn.hidden = false; return; }
  btn.hidden = true;
  text.innerHTML = isIOS()
    ? 'On iPhone: open this page in <b>Safari</b>, tap the <b>Share</b> button (square with an arrow), then <b>Add to Home Screen</b>.'
    : 'In Chrome: open the <b>⋮</b> menu and choose <b>Add to Home screen</b> or <b>Install app</b>.';
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; paintInstall(); });
window.addEventListener('appinstalled', () => { installPrompt = null; count('app_install'); paintInstall(); });
$('#install-btn').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => {});
  installPrompt = null;
  paintInstall();
});

// ---------- boot ----------

document.body.insertAdjacentHTML('afterbegin', DEFS_SVG);
paintIcons();
renderDoodles();
renderHome();
$('#friend-btn').hidden = !onlineConfigured();
$('#leaders-btn').hidden = !onlineConfigured();
$('#games-btn').hidden = !onlineConfigured();
// A badge on "My games" when friends are waiting for your move.
if (onlineConfigured() && localStorage.getItem('dame.days.v1')) {
  days().then((m) => m.yourTurnCount()).then((n) => { if (n) $('#games-btn').innerHTML = `My games <small>${n} your turn</small>`; }).catch(() => {});
}
// A play-over-days link (?days=ID) opens that game.
if (new URLSearchParams(location.search).has('days')) {
  count('invite_open', { once: true });
  document.body.classList.add('skip-intro');
  online().then((m) => m.open(new URLSearchParams(location.search).get('days'), 'days'));
}
refreshPuzzleButton();
// App shortcuts from the home-screen icon.
{
  const goTo = new URLSearchParams(location.search).get('go');
  if (goTo === 'puzzle') { document.body.classList.add('skip-intro'); openPuzzle(); }
  if (goTo === 'cpu') { document.body.classList.add('skip-intro'); setup.mode = 'cpu'; go('setup'); }
}
// An invite link (?room=CODE) goes straight to the join screen.
if (new URLSearchParams(location.search).has('room')) {
  count('invite_open', { once: true });
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
  position(rows, turn = 1, quiet = 0) {
    if (!G) return;
    G.token = Symbol('debug');
    G.state = R.stateFromRows(rows, turn, quiet);
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
