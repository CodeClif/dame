// Play over days: turn-based games stored in Supabase, for slow or patchy data.
// Make a move, share "your turn" on WhatsApp, and the game waits — for up to 14 days.
// Loaded on demand. Every stored move is replayed through the rules module before use.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { rpc } from './realtime.js';
import {
  makeGameId, normalizeGameId, makeSeatToken, turnAfter, daysLeft, timeAgo, parseResult, cleanNickname,
} from './protocol.js';
import { TEAM_ROSTER } from './characters.js';
import { getNick, setNick } from './profile.js';
import { count } from './analytics.js';
import { pushState, pushMessage, enablePush, notifyOpponent } from './push.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const otherTeam = (t) => (t === 'forest' ? 'market' : 'forest');
const db = (fn, args) => rpc(SUPABASE_URL, SUPABASE_ANON_KEY, fn, args);
const POLL_MS = 20000;

let api = null;
let current = null; // { id, token, seat, row }
let pollTimer = null;

// ---------- the games this phone takes part in ----------

const KEY = 'dame.days.v1';
const store = (() => {
  try { return { games: {}, pending: [], ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { games: {}, pending: [] }; }
})();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ } };
export const myGameIds = () => Object.keys(store.games);

const seatSide = (seat) => (seat === 'h' ? 1 : -1);
const linkFor = (id) => { const u = new URL(location.href); u.search = `?days=${id}`; u.hash = ''; return u.toString(); };
const validLineup = (csv, team) => {
  const keys = String(csv || '').split(',').filter((k) => TEAM_ROSTER[team].includes(k));
  return keys.length ? keys.slice(0, 12) : TEAM_ROSTER[team].slice(0, 6);
};
const lineupFor = (team) => (api.settings.lineups[team] || TEAM_ROSTER[team]).join(',');
const hostTeam = (row) => (row.options?.ht === 'market' ? 'market' : 'forest');
const names = (row) => ({ 1: row.host_nick, [-1]: row.guest_nick || 'Your friend' });

export function init(theApi) {
  api = theApi;
  window.addEventListener('online', flushPending);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  flushPending();
}

// ---------- create / join / open ----------

function needNick() {
  const n = getNick();
  if (n) return n;
  return null;
}

export async function createGame(nickInput) {
  const nick = setNick(nickInput) || needNick();
  if (!nick) return { error: 'Choose a nickname of 2–16 letters first.' };
  if (!navigator.onLine) return { error: 'You’re offline. Connect once to start a game; after that it works on slow data.' };
  const token = makeSeatToken();
  const team = api.settings.team;
  const opts = { fk: api.settings.flyingKings ? 1 : 0, mb: api.settings.menCaptureBackward ? 1 : 0, ht: team };
  let row = null;
  for (let i = 0; i < 3 && !row; i++) {
    const id = makeGameId();
    try { row = await db('dame_days_create', { p_id: id, p_token: token, p_nick: nick, p_lineup: lineupFor(team), p_options: opts }); } catch (e) {
      if (!/409/.test(String(e))) return { error: 'Couldn’t reach the game server. Try again in a moment.' };
    }
  }
  if (!row) return { error: 'Couldn’t make a game code. Try again.' };
  store.games[row.id] = { token, seat: 'h', added: Date.now() };
  save();
  count('game_start_days');
  start(row, 'h');
  setTimeout(() => showInvite(row.id), 2300);
  return { ok: true };
}

/** Open a game from a link or the My games list. */
export async function openGame(rawId) {
  const id = normalizeGameId(rawId);
  if (!id) return { error: 'Game codes are 8 letters and numbers.' };
  let row;
  try { row = await db('dame_days_get', { p_id: id }); } catch {
    return { error: navigator.onLine ? 'Couldn’t reach the game server. Try again in a moment.' : 'You’re offline — open this game again when you have signal.' };
  }
  if (!row) {
    if (store.games[id]) { delete store.games[id]; save(); }
    return { error: 'That game has finished and been cleared, or the link is wrong.' };
  }
  const mine = store.games[id];
  if (mine) { start(row, mine.seat); return { ok: true }; }
  if (row.has_guest) return { error: 'That game already has two players.' };
  return { join: row };
}

export async function joinGame(row, nickInput) {
  const nick = setNick(nickInput) || needNick();
  if (!nick) return { error: 'Choose a nickname of 2–16 letters first.' };
  const token = makeSeatToken();
  const team = otherTeam(hostTeam(row));
  let seat;
  try { seat = await db('dame_days_join', { p_id: row.id, p_token: token, p_nick: nick, p_lineup: lineupFor(team) }); } catch {
    return { error: 'Couldn’t reach the game server. Try again in a moment.' };
  }
  if (seat !== 'g') return { error: seat === 'full' ? 'That game already has two players.' : 'Couldn’t join that game.' };
  store.games[row.id] = { token, seat: 'g', added: Date.now() };
  save();
  const fresh = await db('dame_days_get', { p_id: row.id }).catch(() => ({ ...row, guest_nick: nick, guest_lineup: lineupFor(team), has_guest: true }));
  start(fresh, 'g');
  return { ok: true };
}

function start(row, seat) {
  current = { id: row.id, token: store.games[row.id].token, seat, row };
  const ht = hostTeam(row);
  const pending = store.pending.filter((p) => p.id === row.id).sort((a, b) => a.ply - b.ply);
  const moves = [...row.moves];
  for (const p of pending) if (p.ply === moves.length) moves.push(p.move); // our unsent moves
  api.newGame({
    mode: 'days',
    localSide: seatSide(seat),
    opts: { flyingKings: !!row.options?.fk, menCaptureBackward: !!row.options?.mb },
    teams: { 1: ht, [-1]: otherTeam(ht) },
    lineups: { 1: validLineup(row.host_lineup, ht), [-1]: validLineup(row.guest_lineup, otherTeam(ht)) },
    names: names(row),
    firstTurn: row.first_turn,
    moves,
    online: controller,
  });
  history.replaceState(null, '', `?days=${row.id}`);
  setTimeout(() => afterOpen(row), 2200);
  startPolling();
}

function afterOpen(row) {
  if (!current || current.id !== row.id) return;
  const result = parseResult(row.result);
  if (result) { api.endGame(result); return; }
  if (row.expired) {
    const toMove = turnAfter(row.first_turn, row.moves.length);
    finish({ winner: -toMove, reason: 'forfeit' });
    api.endGame({ winner: -toMove, reason: 'forfeit' });
    return;
  }
  paintStatus();
}

// ---------- the status strip under the board ----------

async function paintStatus(justMoved = false) {
  const el = $('#days-bar');
  if (!current || api.isOver()) { el.hidden = true; return; }
  const g = api.game;
  const row = current.row;
  const myTurn = g.state.turn === g.localSide;
  const opp = names(row)[-g.localSide];
  const left = daysLeft(row.last_move_at);
  const waitingForGuest = !row.guest_nick && current.seat === 'h';
  let text;
  if (waitingForGuest) text = 'Waiting for your friend to open the link and join.';
  else if (myTurn) text = `Your move. ${left} day${left === 1 ? '' : 's'} left before this game times out.`;
  else text = `${justMoved ? 'Move sent ✓ ' : ''}Now it’s ${esc(opp)}’s turn — they have ${left} day${left === 1 ? '' : 's'}.`;
  const state = await pushState().catch(() => 'unsupported');
  const showNudge = !myTurn || waitingForGuest;
  el.innerHTML = `<p class="hand">${text}</p>
    <div class="days-actions">
      ${showNudge ? `<button class="chip" data-days="share">${waitingForGuest ? 'Send the link' : `Tell ${esc(opp)} it’s their turn`}</button>
      <a class="chip wa" data-days="wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(nudgeText())}">WhatsApp</a>` : ''}
      ${state === 'ready' ? '<button class="chip" data-days="push">🔔 Notify me</button>' : ''}
      <button class="chip" data-days="games">My games</button>
    </div>
    ${state === 'ready' || state === 'on' ? '' : `<small class="push-note">${pushMessage(state)}</small>`}`;
  el.hidden = false;
  el.onclick = async (e) => {
    const b = e.target.closest('[data-days]');
    if (!b) return;
    if (b.dataset.days === 'share') shareTurn();
    if (b.dataset.days === 'push') {
      b.disabled = true;
      const ok = await enablePush(current.id, current.token).catch(() => false);
      b.textContent = ok ? '🔔 On' : 'Not allowed';
      if (ok) paintStatus();
    }
    if (b.dataset.days === 'games') openMyGames();
  };
}

function nudgeText() {
  const g = api.game;
  const me = names(current.row)[g?.localSide] || 'Your friend';
  return current.row.guest_nick
    ? `${me} made a move in Dame ✏️ Your turn! ${linkFor(current.id)}`
    : `Play Dame with me over the next few days ✏️ ${linkFor(current.id)}`;
}

async function shareTurn() {
  const text = nudgeText();
  if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* cancelled */ } }
  try { await navigator.clipboard.writeText(text); api.say('link copied!', true); } catch { /* ignore */ }
}

function showInvite(id) {
  if (!current || current.id !== id) return;
  api.openModal(`<h2>Game started</h2>
    <p class="code-big hand">${id}</p>
    <p>Make your first move, then send the link. Your friend can join and reply whenever they like — the game waits up to 14 days between moves.</p>
    <div class="actions"><div class="pair">
      <button class="sketch-btn big" data-act="share">Share link</button>
      <a class="sketch-btn big wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(nudgeText())}">WhatsApp</a></div>
      <button class="sketch-btn" data-act="close">Make my move first</button></div>`, {
    share: () => shareTurn(),
  });
}

// ---------- moves, sync and polling ----------

async function sendMove(id, token, ply, move) {
  try {
    const ok = await db('dame_days_move', { p_id: id, p_token: token, p_ply: ply, p_move: move });
    return ok ? 'ok' : 'refused';
  } catch {
    return 'offline';
  }
}

async function flushPending() {
  if (!navigator.onLine || !store.pending.length) return;
  for (const p of [...store.pending].sort((a, b) => a.ply - b.ply)) {
    const game = store.games[p.id];
    if (!game) { store.pending = store.pending.filter((x) => x !== p); continue; }
    const r = await sendMove(p.id, game.token, p.ply, p.move);
    if (r === 'offline') break;
    store.pending = store.pending.filter((x) => x !== p);
    if (r === 'ok') notifyOpponent(p.id, game.token);
  }
  save();
  if (current) poll();
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(poll, POLL_MS);
}

async function poll() {
  if (!current || document.hidden) return;
  const g = api.game;
  if (!g || g.mode !== 'days') { clearInterval(pollTimer); return; }
  let row;
  try { row = await db('dame_days_get', { p_id: current.id }); } catch { return; }
  if (!row || !current || row.id !== current.id) return;
  current.row = row;
  const have = g.log;
  const theirs = row.moves;
  if (theirs.length > have.length && theirs.slice(0, have.length).join() === have.join()) {
    for (let i = have.length; i < theirs.length; i++) api.remoteMove(theirs[i], i, true);
    api.sfx.select();
  }
  const result = parseResult(row.result);
  if (result && !api.isOver()) { api.endGame(result); return; }
  if (row.expired && !api.isOver()) {
    const toMove = turnAfter(row.first_turn, row.moves.length);
    finish({ winner: -toMove, reason: 'forfeit' });
    api.endGame({ winner: -toMove, reason: 'forfeit' });
    return;
  }
  if (!api.isOver()) paintStatus();
}

function finish(result) {
  if (!current || current.row.result) return;
  const r = `${result.winner}:${result.reason}`.slice(0, 20);
  current.row.result = r;
  db('dame_days_finish', { p_id: current.id, p_token: current.token, p_result: r }).then(() => notifyOpponent(current.id, current.token)).catch(() => {});
}

// What the game engine calls back into.
const controller = {
  label: 'days',
  async localMove(move, ply) {
    if (!current) return;
    const { id, token } = current;
    const r = await sendMove(id, token, ply, move);
    if (r === 'ok') {
      current.row.last_move_at = new Date().toISOString();
      current.row.moves = [...current.row.moves.slice(0, ply), move];
      notifyOpponent(id, token);
      paintStatus(true);
    } else if (r === 'offline') {
      store.pending.push({ id, ply, move });
      save();
      api.say('saved — it’ll send when you’re online', true);
      $('#days-bar').hidden = false;
      $('#days-bar').innerHTML = '<p class="hand">📶 No signal: your move is saved on this phone and will send by itself when you’re back online.</p>';
    } else {
      api.say('that move didn’t go through — reloading the game', true);
      setTimeout(() => openGame(id), 1200);
    }
  },
  outOfSync() { poll(); },
  remoteTimedOut() {},
  gameEnded(result) {
    $('#days-bar').hidden = true;
    if (result.reason !== 'forfeit') finish(result);
  },
  resign() {
    if (!current || api.isOver()) return;
    const result = { winner: -api.game.localSide, reason: 'resign' };
    finish(result);
    api.endGame(result);
  },
  leave() { openMyGames(); },
  requestRematch() { api.closeModal(); createGame(); },
  menuLabels: { leave: 'My games', rematch: 'New game over days' },
};

// ---------- My games ----------

export async function openMyGames() {
  api.closeModal();
  current = null;
  clearInterval(pollTimer);
  history.replaceState(null, '', location.pathname);
  api.go('games');
  const list = $('#games-list');
  const ids = myGameIds();
  if (!ids.length) { list.innerHTML = '<li class="empty hand">No games yet. Start one and send the link to a friend.</li>'; return; }
  list.innerHTML = '<li class="empty hand">Checking your games…</li>';
  let rows = [];
  try { rows = await db('dame_days_list', { p_ids: ids }); } catch {
    list.innerHTML = `<li class="empty hand">${navigator.onLine ? 'Couldn’t reach the game server.' : 'You’re offline — your games will show when you’re back online.'}</li>`;
    return;
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const id of ids) if (!byId.has(id)) delete store.games[id]; // cleared on the server
  save();
  rows.sort((a, b) => rank(b) - rank(a) || Date.parse(b.last_move_at) - Date.parse(a.last_move_at));
  list.innerHTML = rows.map((r) => {
    const seat = store.games[r.id].seat;
    const me = seatSide(seat);
    const opp = names(r)[-me];
    const res = parseResult(r.result);
    const toMove = turnAfter(r.first_turn, r.moves.length);
    let status;
    let cls = '';
    if (res) status = res.winner === 0 ? 'Draw' : res.winner === me ? `You won${res.reason === 'forfeit' ? ' (forfeit)' : ''}` : `${esc(opp)} won${res.reason === 'forfeit' ? ' (forfeit)' : ''}`;
    else if (r.expired) status = toMove === me ? 'Timed out — you forfeit' : `${esc(opp)} timed out — you win`;
    else if (!r.guest_nick) { status = 'Waiting for your friend to join'; cls = 'wait'; }
    else if (toMove === me) { status = 'Your turn!'; cls = 'mine'; }
    else { status = `${esc(opp)}’s turn`; cls = 'wait'; }
    const done = res || r.expired;
    return `<li class="${cls}${done ? ' done' : ''}"><button class="game-row" data-open="${r.id}">
      <b>vs ${esc(seat === 'h' ? (r.guest_nick || '…') : r.host_nick)}</b><span class="st">${status}</span>
      <span class="meta">${r.moves.length} move${r.moves.length === 1 ? '' : 's'} · last ${timeAgo(r.last_move_at)}${done ? '' : ` · ${daysLeft(r.last_move_at)} days left`}</span></button>
      ${done ? `<button class="chip" data-forget="${r.id}" aria-label="Remove from list">✕</button>` : ''}</li>`;
  }).join('') || '<li class="empty hand">No games yet.</li>';
  list.onclick = async (e) => {
    const f = e.target.closest('[data-forget]');
    if (f) { delete store.games[f.dataset.forget]; save(); f.closest('li').remove(); return; }
    const o = e.target.closest('[data-open]');
    if (o) {
      const r = await openGame(o.dataset.open);
      if (r?.error) $('#games-msg').textContent = r.error;
    }
  };
}
const rank = (r) => (r.result || r.expired ? 0 : 1);

/** How many games are waiting for this phone's move (for the menu badge). */
export async function yourTurnCount() {
  const ids = myGameIds();
  if (!ids.length || !navigator.onLine) return 0;
  try {
    const rows = await db('dame_days_list', { p_ids: ids });
    return rows.filter((r) => !r.result && !r.expired && r.guest_nick && turnAfter(r.first_turn, r.moves.length) === seatSide(store.games[r.id]?.seat)).length;
  } catch { return 0; }
}

export const _debug = { store, get current() { return current; }, cleanNickname };
