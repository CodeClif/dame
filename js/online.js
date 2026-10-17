// Play a friend: rooms, invite links, presence, move sync, timer, rematch and chat.
// Loaded on demand. Only moves, short chat lines and a little presence data cross the wire;
// every move is checked with the rules module on both phones before it is played.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { RealtimeRoom, rpc } from './realtime.js';
import {
  makeRoomCode, normalizeRoomCode, roomExpired, cleanChat, RateLimiter,
  QUICK_PHRASES, EMOJI, MAX_CHAT, ROOM_TTL_MS,
} from './protocol.js';
import { TEAM_ROSTER } from './characters.js';
import { getLegalMoves } from './rules.js';
import { getNick, setNick } from './profile.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const otherTeam = (t) => (t === 'forest' ? 'market' : 'forest');
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const PEER_GRACE_MS = 60000;

let api = null;
let S = null; // the current room session

// ---------- local storage: nickname, timer choice, rooms we can rejoin ----------

const STORE_KEY = 'dame.online.v1';
const store = (() => {
  try { return { timer: 0, rooms: {}, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') }; } catch { return { timer: 0, rooms: {} }; }
})();
function saveStore() {
  for (const [code, r] of Object.entries(store.rooms)) if (roomExpired(r.at)) delete store.rooms[code];
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* ignore */ }
}
const db = (fn, args) => rpc(SUPABASE_URL, SUPABASE_ANON_KEY, fn, args);
const randomKey = () => Math.random().toString(36).slice(2, 10);

// ---------- connection banner ----------

function banner(text, action = null) {
  const el = $('#net-banner');
  if (!text) { el.hidden = true; return; }
  $('#net-text').textContent = text;
  const btn = $('#net-action');
  btn.hidden = !action;
  if (action) { btn.textContent = action.label; btn.onclick = action.run; }
  el.hidden = false;
}

// ---------- setup screen ----------

export function init(theApi) {
  api = theApi;
  $('#ol-team-seg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    api.settings.team = b.dataset.team;
    api.saveSettings();
    api.sfx.tap();
    paintSetup();
  });
  $('#ol-timer-seg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    store.timer = Number(b.dataset.timer);
    saveStore();
    api.sfx.tap();
    paintSetup();
  });
  $('#ol-mode-seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-olmode]');
    if (!b) return;
    olMode = b.dataset.olmode;
    api.sfx.tap();
    paintSetup();
  });
  $('#ol-create-btn').addEventListener('click', () => (olMode === 'days' ? createDays() : createRoom()));
  $('#ol-join-btn').addEventListener('click', () => joinAny($('#ol-code').value));
  $('#ol-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinAny($('#ol-code').value); });
  $('#nick').addEventListener('change', () => setNick($('#nick').value));
  setupChat();
  window.addEventListener('offline', () => { if (S) banner('You’re offline — moves will send when the signal comes back.'); });
}

// Live rooms (6-letter codes) or games over days (8-letter codes).
let olMode = 'live';

async function createDays() {
  api.sfx.tap();
  msg('Starting your game…');
  const m = await api.days();
  const r = await m.createGame($('#nick').value);
  msg(r.error || '');
}

async function joinAny(raw) {
  const clean = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 8) { joinRoom(raw); return; }
  msg('Looking for the game…');
  const m = await api.days();
  const r = await m.openGame(clean);
  if (r.error) { msg(r.error); return; }
  if (r.join) {
    msg('');
    const row = r.join;
    api.openModal(`<h2>Join ${esc(row.host_nick)}’s game?</h2>
      <p>A game played over days: move whenever you like. ${esc(row.host_nick)} plays the ${row.options?.ht === 'market' ? 'Market Crew' : 'Forest Friends'}, you get the other side.</p>
      <div class="actions"><button class="sketch-btn big" data-act="join">Join the game</button>
      <button class="sketch-btn" data-act="close">Not now</button></div>`, {
      join: async () => {
        api.closeModal();
        const j = await m.joinGame(row, $('#nick').value);
        if (j.error) msg(j.error);
      },
    });
    return;
  }
  msg('');
}

function paintSetup() {
  $$('#ol-mode-seg button').forEach((b) => b.classList.toggle('on', b.dataset.olmode === olMode));
  $('#ol-timer-field').hidden = olMode === 'days';
  $('#ol-create-btn').textContent = olMode === 'days' ? 'Start a game over days' : 'Create a room';
  $('#ol-mode-hint').textContent = olMode === 'days'
    ? 'Take turns whenever you like — great on slow data. Your friend gets a link; each move waits up to 14 days.'
    : 'Play together right now, both online at the same time.';
  $$('#ol-team-seg button').forEach((b) => b.classList.toggle('on', b.dataset.team === api.settings.team));
  $$('#ol-timer-seg button').forEach((b) => b.classList.toggle('on', Number(b.dataset.timer) === store.timer));
}

function msg(text) { $('#ol-msg').textContent = text; }

/** Show the Play-a-friend screen, optionally with a room code from an invite link. */
export function open(code = '', mode = 'live') {
  api.go('online');
  olMode = mode;
  $('#nick').value = getNick();
  $('#ol-code').value = normalizeRoomCode(code) || String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  paintSetup();
  msg('');
  if (code) {
    if (getNick()) joinAny(code);
    else { msg('Pick a nickname, then tap Join.'); $('#nick').focus(); }
  }
}

function readNick() {
  const n = setNick($('#nick').value);
  if (!n) { msg('Choose a nickname of 2–16 letters (and keep it friendly).'); $('#nick').focus(); return null; }
  return n;
}

async function createRoom() {
  const nick = readNick();
  if (!nick) return;
  if (!navigator.onLine) { msg('You’re offline. Connect to the internet to play a friend.'); return; }
  api.sfx.tap();
  msg('Making a room…');
  const opts = {
    fk: api.settings.flyingKings ? 1 : 0,
    mb: api.settings.menCaptureBackward ? 1 : 0,
    tm: store.timer || 0,
    ht: api.settings.team,
    c: Date.now(),
  };
  let code = null;
  let dbOk = true;
  for (let i = 0; i < 3 && !code; i++) {
    const tryCode = makeRoomCode();
    try { await db('dame_create_room', { p_code: tryCode, p_options: opts }); code = tryCode; } catch (e) {
      if (!/HTTP 409/.test(String(e))) { dbOk = false; code = tryCode; } // no database: rooms still work, minus resume
    }
  }
  store.rooms[code] = { role: 'h', key: randomKey(), at: opts.c, opts };
  saveStore();
  msg('');
  start({ code, role: 'h', nick, opts, dbOk, game: 1, firstTurn: 1, moves: [] });
  showInvite();
}

async function joinRoom(raw) {
  const code = normalizeRoomCode(raw);
  if (!code) { msg('Room codes are 6 letters and numbers, like K7QM2D.'); return; }
  const nick = readNick();
  if (!nick) return;
  if (!navigator.onLine) { msg('You’re offline. Connect to the internet to join.'); return; }
  api.sfx.tap();
  msg('Looking for the room…');
  let row = null;
  let dbOk = true;
  try { row = await db('dame_get_room', { p_code: code }); } catch { dbOk = false; }
  if (dbOk && !row) { msg('That room has expired or doesn’t exist. Ask your friend for a new code.'); return; }
  const mine = store.rooms[code];
  const role = mine?.role || 'g';
  if (!mine) { store.rooms[code] = { role, key: randomKey(), at: row ? Date.parse(row.created_at) : Date.now() }; saveStore(); }
  msg(dbOk ? 'Joining…' : 'Joining… (waiting for your friend to be online)');
  start({
    code, role, nick, dbOk,
    opts: row?.options || mine?.opts || null,
    game: row?.game || 1,
    firstTurn: row?.first_turn || 1,
    moves: row?.moves || [],
    createdAt: row ? Date.parse(row.created_at) : null,
  });
}

function inviteUrl(code) {
  const u = new URL(location.href);
  u.search = `?room=${code}`;
  u.hash = '';
  return u.toString();
}

function showInvite() {
  const { code } = S;
  api.openModal(`<h2>Your room</h2>
    <p class="code-big hand" aria-label="Room code">${code}</p>
    <p>Send the invite to a friend. When they open it, the match starts.</p>
    <div class="actions">
      <button class="sketch-btn big" data-act="share">Share invite</button>
      <div class="pair"><button class="sketch-btn" data-act="copy">Copy link</button>
      <button class="sketch-btn" data-act="cancel">Cancel</button></div>
    </div>
    <p class="note" id="invite-note">Waiting for your friend… The room closes after 2 hours.</p>`, {
    share: async () => {
      const url = inviteUrl(code);
      if (navigator.share) {
        try { await navigator.share({ title: 'Dame', text: `Play Dame with me! Room ${code}`, url }); return; } catch { /* cancelled */ }
      }
      copyLink(url);
    },
    copy: () => copyLink(inviteUrl(code)),
    cancel: () => { api.closeModal(); leave(); },
    x: () => { api.closeModal(); leave(); },
  }, false);
}

async function copyLink(url) {
  try { await navigator.clipboard.writeText(url); $('#invite-note').textContent = 'Link copied — paste it in WhatsApp or SMS.'; } catch {
    $('#invite-note').textContent = url;
  }
}

// ---------- the room session ----------

function start(o) {
  S?.net?.close();
  const saved = store.rooms[o.code];
  S = {
    ...o,
    key: saved.key,
    team: o.role === 'h' ? (o.opts?.ht || api.settings.team) : (o.opts ? otherTeam(o.opts.ht) : otherTeam(api.settings.team)),
    started: false,
    peer: null,
    peerMeta: null,
    muted: false,
    chatOut: new RateLimiter({ gapMs: 1500, burst: 5, windowMs: 15000 }),
    chatIn: new RateLimiter({ gapMs: 300, burst: 10, windowMs: 15000 }),
    lastSyncAsk: 0,
    peerAskedRematch: false,
  };
  S.net = new RealtimeRoom({
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
    topic: `dame-${o.code}`,
    presenceKey: S.key,
    meta: meta(),
    onBroadcast,
    onPresence,
    onStatus,
  });
  if (o.createdAt || o.opts?.c) scheduleExpiry(o.createdAt || o.opts.c);
  history.replaceState(null, '', `?room=${o.code}`);
}

function meta() {
  const m = { v: 1, r: S.role, n: S.nick, t: S.team, l: lineupFor(S.team).join(','), g: S.game };
  if (S.role === 'h') m.o = S.opts;
  return m;
}

function lineupFor(team) {
  const list = api.settings.lineups[team] || [];
  return list.length ? list : TEAM_ROSTER[team];
}

function scheduleExpiry(createdAt) {
  clearTimeout(S.expiryTimer);
  const left = createdAt + ROOM_TTL_MS - Date.now();
  if (left <= 0) { expired(); return; }
  S.expiryTimer = setTimeout(expired, Math.min(left, 2 ** 31 - 1));
}

function expired() {
  if (!S) return;
  const wasPlaying = S.started;
  leave(false);
  api.openModal(`<h2>Room closed</h2><p>Rooms last 2 hours. ${wasPlaying ? 'Thanks for the game!' : ''} Make a new one to keep playing.</p>
    <div class="actions"><button class="sketch-btn big" data-act="close">OK</button></div>`);
}

function onStatus(status) {
  if (!S) return;
  if (status === 'reconnecting') banner('Connection lost — reconnecting…');
  if (status === 'connected') {
    banner(S.peerGoneAt ? peerGoneText() : '');
    if (S.started) askSync(true);
  }
}

function onPresence(players) {
  if (!S) return;
  const others = players.filter((p) => p.key !== S.key && p.meta?.v === 1);
  // Two people trying to be the same player: the room is full for whoever came second.
  const rival = others.find((p) => p.meta.r === S.role);
  if (rival && !S.started && rival.key < S.key) {
    leave(false);
    msg('That room already has two players.');
    return;
  }
  const peer = others.find((p) => p.meta.r !== S.role);
  if (peer) {
    S.peer = peer.key;
    S.peerMeta = peer.meta;
    if (peer.meta.o && S.role === 'g') {
      if (!S.opts) S.opts = peer.meta.o;
      S.team = otherTeam(S.opts.ht);
      if (!S.createdAt) scheduleExpiry(S.opts.c);
      if (roomExpired(S.opts.c)) { expired(); return; }
      if (peer.meta.g > S.game) { S.game = peer.meta.g; S.firstTurn = S.game % 2 ? 1 : -1; S.moves = []; }
    }
    if (S.peerGoneAt) { S.peerGoneAt = null; clearInterval(S.peerTimer); banner(''); api.say(`${peer.meta.n} is back`, true); askSync(true); }
    if (!S.started && S.opts) {
      S.net.track(meta());
      startGame(S.moves || []);
    }
  } else if (S.started && S.peer && !api.isOver()) {
    S.peerGoneAt = Date.now();
    clearInterval(S.peerTimer);
    S.peerTimer = setInterval(() => banner(peerGoneText(), peerGoneAction()), 1000);
    banner(peerGoneText());
  }
}

const peerName = () => S?.peerMeta?.n || 'Your friend';
function peerGoneText() {
  const left = Math.max(0, Math.ceil((S.peerGoneAt + PEER_GRACE_MS - Date.now()) / 1000));
  return left ? `${peerName()}’s connection dropped. Waiting ${left}s for them…` : `${peerName()} hasn’t come back.`;
}
function peerGoneAction() {
  if (Date.now() - S.peerGoneAt < PEER_GRACE_MS || api.isOver()) return null;
  return { label: 'Claim the win', run: () => { clearInterval(S.peerTimer); banner(''); finishLocally(localSide(), 'left'); } };
}

const localSide = () => (S.role === 'h' ? 1 : -1);

function validLineup(csv, team) {
  const keys = String(csv || '').split(',').filter((k) => TEAM_ROSTER[team].includes(k));
  return keys.length ? keys.slice(0, 12) : TEAM_ROSTER[team];
}

function startGame(moves) {
  const hostTeam = S.opts.ht === 'market' ? 'market' : 'forest';
  const hostMeta = S.role === 'h' ? meta() : S.peerMeta;
  const guestMeta = S.role === 'g' ? meta() : S.peerMeta;
  S.started = true;
  S.peerAskedRematch = false;
  api.closeModal();
  msg('');
  api.newGame({
    mode: 'online',
    localSide: localSide(),
    opts: { flyingKings: !!S.opts.fk, menCaptureBackward: !!S.opts.mb },
    teams: { 1: hostTeam, [-1]: otherTeam(hostTeam) },
    lineups: { 1: validLineup(hostMeta?.l, hostTeam), [-1]: validLineup(guestMeta?.l, otherTeam(hostTeam)) },
    names: { 1: hostMeta?.n || 'Host', [-1]: guestMeta?.n || 'Guest' },
    firstTurn: S.firstTurn,
    moves,
    turnSeconds: Number(S.opts.tm) || 0,
    online: controller,
  });
  clearChatLog();
  setTimeout(() => askSync(true), 2300);
}

function askSync(force = false) {
  if (!S?.started) return;
  if (!force && Date.now() - S.lastSyncAsk < 2000) return;
  S.lastSyncAsk = Date.now();
  S.net.send('sq', { g: S.game });
}

function onBroadcast(event, d) {
  if (!S) return;
  const G = api.game;
  switch (event) {
    case 'mv':
      if (d.g === S.game && S.started) api.remoteMove(String(d.m), Number(d.p));
      break;
    case 'sq':
      if (S.started && G?.mode === 'online') S.net.send('sy', { g: S.game, ms: G.log.join(' ') });
      break;
    case 'sy': {
      if (!S.started || !G) break;
      if (d.g > S.game) { S.game = d.g; S.firstTurn = S.game % 2 ? 1 : -1; startGame(String(d.ms || '').split(' ').filter(Boolean)); break; }
      if (d.g !== S.game) break;
      const theirs = String(d.ms || '').split(' ').filter(Boolean);
      const mine = G.log;
      const samePrefix = theirs.slice(0, mine.length).join(' ') === mine.slice(0, theirs.length).join(' ');
      if (theirs.length > mine.length && samePrefix) {
        for (let i = mine.length; i < theirs.length; i++) api.remoteMove(theirs[i], i, true);
      } else if (!samePrefix && S.role === 'g') {
        startGame(theirs); // histories forked: the host's copy wins
      }
      break;
    }
    case 'rs':
      if (d.g === S.game && !api.isOver()) finishLocally(localSide(), 'resign');
      break;
    case 'rm':
      if (d.g !== S.game) break;
      S.peerAskedRematch = true;
      if (S.askedRematch) { S.net.send('ra', { g: S.game + 1 }); nextGame(); break; }
      api.openModal(`<h2>Rematch?</h2><p>${esc(peerName())} wants another game.</p>
        <div class="actions"><button class="sketch-btn big" data-act="yes">Let’s go!</button>
        <button class="sketch-btn" data-act="no">Not now</button></div>`, {
        yes: () => { S.net.send('ra', { g: S.game + 1 }); nextGame(); },
        no: () => api.closeModal(),
        x: () => api.closeModal(),
      });
      break;
    case 'ra':
      if (d.g === S.game + 1) nextGame();
      break;
    case 'ch':
      receiveChat(d);
      break;
    case 'bye':
      api.say(`${peerName()} left the room`, true);
      if (S.started && !api.isOver()) finishLocally(localSide(), 'left');
      S.peer = null;
      break;
    default:
      break;
  }
}

/** End the game on this phone with a result the board itself doesn't show. */
function finishLocally(winner, reason) {
  api.endGame({ winner, reason });
}

function nextGame() {
  S.game += 1;
  S.firstTurn = S.game % 2 ? 1 : -1;
  S.askedRematch = false;
  S.peerAskedRematch = false;
  if (S.dbOk && S.role === 'h') db('dame_new_game', { p_code: S.code, p_game: S.game }).catch(() => {});
  S.net.track(meta());
  startGame([]);
}

export function leave(navigate = true) {
  if (!S) return;
  if (S.started && !api.isOver()) S.net.send('rs', { g: S.game });
  S.net.send('bye', {});
  const net = S.net;
  setTimeout(() => net.close(), 300);
  clearInterval(S.peerTimer);
  clearTimeout(S.expiryTimer);
  delete store.rooms[S.code];
  saveStore();
  S = null;
  banner('');
  $('#chat').hidden = true;
  document.body.classList.remove('chat-open');
  history.replaceState(null, '', location.pathname);
  if (navigate) api.go('home');
}

// What the game engine calls back into.
const controller = {
  localMove(code, ply) {
    if (!S) return;
    S.net.send('mv', { g: S.game, p: ply, m: code });
    if (S.dbOk) db('dame_push_move', { p_code: S.code, p_game: S.game, p_ply: ply, p_move: code }).catch(() => {});
  },
  outOfSync() { askSync(); },
  remoteTimedOut() {
    if (!S?.peer || api.isOver()) return;
    banner(`${peerName()} ran out of time.`, { label: 'Claim the win', run: () => { banner(''); finishLocally(localSide(), 'timeout'); } });
  },
  gameEnded(result) {
    if (!S) return;
    if (S.dbOk) db('dame_finish', { p_code: S.code, p_game: S.game, p_result: `${result.winner}:${result.reason}` }).catch(() => {});
  },
  resign() {
    if (!S || api.isOver()) return;
    S.net.send('rs', { g: S.game });
    finishLocally(-localSide(), 'resign');
  },
  requestRematch() {
    if (!S) return;
    if (!S.peer) { $('#sheet .actions')?.insertAdjacentHTML('beforebegin', `<p class="note">${esc(peerName())} isn’t in the room right now.</p>`); return; }
    if (S.peerAskedRematch) { S.net.send('ra', { g: S.game + 1 }); nextGame(); return; }
    S.askedRematch = true;
    S.net.send('rm', { g: S.game });
    const b = $('#sheet [data-act=orematch]');
    if (b) { b.disabled = true; b.textContent = `Waiting for ${peerName()}…`; }
  },
  leave() { leave(); },
};

// ---------- chat ----------

function setupChat() {
  $('#chat-phrases').innerHTML = QUICK_PHRASES.map((p, i) => `<button class="chip" data-q="${i}">${esc(p)}</button>`).join('');
  $('#chat-emoji').innerHTML = EMOJI.map((e, i) => `<button class="chip" data-e="${i}" aria-label="emoji">${e}</button>`).join('');
  $('#chat-btn').addEventListener('click', () => {
    const chat = $('#chat');
    chat.hidden = !chat.hidden;
    document.body.classList.toggle('chat-open', !chat.hidden);
    $('#chat-btn .dot').hidden = true;
    if (!chat.hidden) $('#chat-log').scrollTop = 1e6;
  });
  $('#chat-close').addEventListener('click', () => { $('#chat').hidden = true; document.body.classList.remove('chat-open'); });
  $('#chat-phrases').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) sendChat({ q: Number(b.dataset.q) }); });
  $('#chat-emoji').addEventListener('click', (e) => { const b = e.target.closest('[data-e]'); if (b) sendChat({ e: Number(b.dataset.e) }); });
  $('#chat-input').addEventListener('input', (e) => { $('#chat-count').textContent = `${[...e.target.value].length}/${MAX_CHAT}`; });
  $('#chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const x = cleanChat($('#chat-input').value);
    if (!x) return;
    if (sendChat({ x })) { $('#chat-input').value = ''; $('#chat-count').textContent = `0/${MAX_CHAT}`; }
  });
  $('#chat-mute').addEventListener('click', () => {
    if (!S) return;
    S.muted = !S.muted;
    $('#chat-mute').textContent = S.muted ? 'Muted' : 'Mute';
    $('#chat-mute').setAttribute('aria-pressed', String(S.muted));
  });
  $('#chat-log').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-report]');
    if (!b || !S) return;
    const text = b.closest('.line').querySelector('.tx').textContent;
    b.disabled = true;
    S.muted = true;
    $('#chat-mute').textContent = 'Muted';
    try { if (S.dbOk) await db('dame_report', { p_room: S.code, p_nickname: peerName(), p_message: text }); } catch { /* still muted */ }
    b.textContent = 'reported';
    logLine('note', 'Thanks — reported. You won’t see their messages now.');
  });
}

const chatText = (d) => (d.q != null ? QUICK_PHRASES[d.q] : d.e != null ? EMOJI[d.e] : cleanChat(d.x));

function sendChat(d) {
  if (!S?.started) return false;
  if (!S.chatOut.allow()) { logLine('note', 'Slow down small — wait a moment before sending again.'); return false; }
  const text = chatText(d);
  if (!text) return false;
  S.net.send('ch', d.x != null ? { x: text } : d);
  api.bubble(localSide(), text);
  logLine('me', text);
  api.sfx.tap();
  return true;
}

function receiveChat(d) {
  if (!S?.started || S.muted || !S.chatIn.allow()) return;
  const text = chatText(d || {});
  if (!text) return;
  api.bubble(-localSide(), text);
  logLine('them', text);
  if ($('#chat').hidden) $('#chat-btn .dot').hidden = false;
}

function logLine(who, text) {
  const log = $('#chat-log');
  const name = who === 'me' ? 'You' : who === 'them' ? peerName() : '';
  log.insertAdjacentHTML('beforeend', `<div class="line ${who}">${name ? `<b>${esc(name)}:</b> ` : ''}<span class="tx">${esc(text)}</span>${who === 'them' ? ' <button class="chip tiny" data-report>report</button>' : ''}</div>`);
  while (log.children.length > 40) log.firstElementChild.remove();
  log.scrollTop = 1e6;
}

function clearChatLog() {
  $('#chat-log').innerHTML = '<div class="line note">Be kind. Quick phrases and emoji are always welcome.</div>';
}

// Exposed for tests.
export const _debug = { get session() { return S; }, legalCount: () => getLegalMoves(api.game.state, api.game.opts).length };
