import * as R from './rules.js';
import { CHARACTERS, TEAMS, TEAM_ROSTER, characterSVG, DEFS_SVG } from './characters.js';
import { boardSVG, titleSVG, doodle, packIcon, icon, wobblyCircle, seeded } from './sketch.js';
import { sfx, setSoundEnabled } from './sound.js';
import { chooseMove } from './ai.js';

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
  night: null, // null follows the phone's light/dark setting
  lineups: { forest: [...TEAM_ROSTER.forest], market: [...TEAM_ROSTER.market] },
};
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  Object.assign(settings, saved, { lineups: { ...settings.lineups, ...(saved.lineups || {}) } });
} catch { /* private mode: defaults are fine */ }
for (const t of ['forest', 'market']) {
  settings.lineups[t] = settings.lineups[t].filter((k) => CHARACTERS[k]?.team === t);
  if (!settings.lineups[t].length) settings.lineups[t] = [...TEAM_ROSTER[t]];
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
  if (id !== 'game' && G) G.token = Symbol('left'); // stop any pending computer move
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
}

function renderLineup(el, team) {
  const chosen = settings.lineups[team];
  el.innerHTML = TEAM_ROSTER[team].map((k) => {
    const ch = CHARACTERS[k];
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
      [-1]: setup.mode === 'cpu' ? [...TEAM_ROSTER[otherTeam(bottom)]] : [...settings.lineups[otherTeam(bottom)]],
    },
    firstTurn: 1,
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
    opts: { flyingKings: settings.flyingKings, menCaptureBackward: settings.menCaptureBackward },
    teams: config.teams,
    human: { 1: true, [-1]: config.mode === 'pnp' },
    state: R.createInitialState(config.firstTurn),
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
  // Hand out characters, back row first, cycling through each line-up.
  for (const side of [1, -1]) {
    const rows = side === 1 ? [7, 6, 5] : [0, 1, 2];
    const chars = config.lineups[side];
    let k = 0;
    for (const r of rows) {
      for (let c = 0; c < 8; c++) {
        const s = R.sq(r, c);
        if (R.sideOf(G.state.board[s]) !== side) continue;
        const id = `${side}:${k}`;
        G.pieces.set(id, { side, char: chars[k % chars.length], king: false });
        G.ids[s] = id;
        k++;
      }
    }
  }
  go('game');
  $('#board-art').innerHTML = boardSVG(7 + Math.floor(Math.random() * 1000));
  $('#ranks').innerHTML = [8, 7, 6, 5, 4, 3, 2, 1].map((n, i) => `<span style="--i:${i}">${n}</span>`).join('');
  $('#files').innerHTML = 'abcdefgh'.split('').map((l, i) => `<span style="--i:${i + 8}">${l}</span>`).join('');
  overlayEl.innerHTML = '';
  $('#trail').innerHTML = '';
  $('#fx').innerHTML = '';
  renderPieces(true);
  renderBars();
  renderTray();
  const token = G.token;
  setTimeout(() => {
    if (G.token !== token) return;
    say('start');
    G.busy = false;
    startTurn();
  }, 2100);
}

function place(el, s) {
  el.style.setProperty('--r', R.rowOf(s));
  el.style.setProperty('--c', R.colOf(s));
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
  return side === 1 ? 'Player 1' : 'Player 2';
}

function renderBars() {
  for (const side of [1, -1]) {
    const bar = side === 1 ? $('#bar-bottom') : $('#bar-top');
    const team = TEAMS[G.teams[side]];
    const sub = G.mode === 'cpu' && side === -1 ? `${team.short} · ${G.level}` : team.name;
    bar.innerHTML = `<span class="avatar char">${characterSVG(G.config.lineups[side][0])}</span>
      <span class="who">${sideLabel(side)}</span>
      <span class="status"><span class="sub">${sub}</span><span class="thinking hand">thinking…</span></span>
      <span class="count"><i style="background:${team.color}"></i><b data-count>${R.countPieces(G.state.board, side)}</b></span>`;
  }
  updateBars();
}

function updateBars(thinking = false) {
  for (const side of [1, -1]) {
    const bar = side === 1 ? $('#bar-bottom') : $('#bar-top');
    bar.classList.toggle('active', !G.over && G.state.turn === side);
    bar.classList.toggle('thinking-on', thinking && G.state.turn === side);
    $('[data-count]', bar).textContent = `×${R.countPieces(G.state.board, side)}`;
  }
  boardEl.dataset.turn = G.over ? '' : String(G.state.turn);
  $('#undo-btn').disabled = !G.history.length;
}

// Captured-pieces tray under the board: each side's haul as little heads.
function renderTray(fresh = null) {
  for (const side of [1, -1]) {
    const el = $(`.tray-side[data-side="${side}"]`);
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
  if (!G.human[G.state.turn]) cpuTurn();
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
  handleTap(R.sq(Math.floor(y), Math.floor(x)), y - Math.floor(y));
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
  if (R.sideOf(G.state.board[s]) !== turn && fracY > 0.55 && R.rowOf(s) < 7 && R.sideOf(G.state.board[s + 8]) === turn) s += 8;
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

const center = (s) => [R.colOf(s) * 100 + 50, R.rowOf(s) * 100 + 50];
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
  const [ra, ca, rb, cb] = [R.rowOf(a), R.colOf(a), R.rowOf(b), R.colOf(b)];
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
  fx.style.setProperty('--r', R.rowOf(s));
  fx.style.setProperty('--c', R.colOf(s));
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
  const base = cellTransform(R.rowOf(s), R.colOf(s));
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

async function performMove(move) {
  const token = G.token;
  G.busy = true;
  G.selected = null;
  drawOverlay();
  G.history.push(snapshot());
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
  if (!G || G.busy || G.over || !G.human[G.state.turn]) return;
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
  G.over = true;
  G.busy = false;
  updateBars();
  drawOverlay();
  const { winner, reason } = result;
  const humanWon = G.mode === 'pnp' || G.human[winner];
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
    if (G.mode === 'cpu') title = humanWon ? 'You win! Ayekoo!' : 'The computer wins';
    else title = `${sideLabel(winner)} wins!`;
    line = reason === 'no-pieces'
      ? `The ${team} took every last piece.`
      : `${sideLabel(loser)} ${G.mode === 'cpu' && loser === 1 ? 'have' : 'has'} no moves left. ${team} take it!`;
  }
  const party = winner
    ? [...new Set(G.config.lineups[winner])].slice(0, 4).map((k) => `<div class="piece char cheer dance"><div class="hopper">${characterSVG(k)}</div></div>`).join('')
    : `<div class="piece char dance"><div class="hopper">${characterSVG(G.config.lineups[1][0])}</div></div><div class="piece char dance"><div class="hopper">${characterSVG(G.config.lineups[-1][0])}</div></div>`;
  setTimeout(() => {
    openModal(`<h2>${title}</h2><div class="party">${party}</div><p>${line}</p>
      <div class="actions">
        <button class="sketch-btn big" data-act="rematch">Rematch</button>
        <button class="sketch-btn" data-act="teams">Change crews</button>
        <button class="sketch-btn" data-act="home">Main menu</button>
      </div>
      <div class="ad-slot" role="note" aria-label="Advertisement placeholder"><b>Ad space</b> · banner 320×50</div>`, {
      rematch: () => { closeModal(); newGame({ ...G.config, firstTurn: -G.config.firstTurn }); },
      teams: () => { closeModal(); setup.mode = G.mode; go('setup'); },
      home: () => { closeModal(); go('home'); },
    }, false);
  }, winner ? 1300 : 600);
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

// ---------- boot ----------

document.body.insertAdjacentHTML('afterbegin', DEFS_SVG);
paintIcons();
renderDoodles();
renderHome();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Console helpers for debugging, e.g. dame.position(['........', ...], 1).
window.dame = {
  get game() { return G; },
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
