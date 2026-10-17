// Weekly leaderboards by nickname and by campus / school / region. Loaded on demand.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { rpc } from './realtime.js';
import { getNick, setNick, getGroup, setGroup, getPlayerId } from './profile.js';

export const TIERS = ['Pebble', 'Cowrie', 'Bead', 'Kente', 'Gold'];

const $ = (s, el = document) => el.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
let groups = null;
let tab = 'league';
let league = null;
let wired = false;
let last = null;

async function loadGroups() {
  groups ||= fetch('data/groups.json').then((r) => r.json()).then((d) => d.groups);
  return groups;
}
const groupName = (list, id) => list.find((g) => g.id === id)?.name || id;

export async function addPoints(reason, points) {
  const nick = getNick();
  if (!nick) return false;
  return rpc(SUPABASE_URL, SUPABASE_ANON_KEY, 'dame_add_points', { p_player: getPlayerId(), p_nickname: nick, p_group: getGroup(), p_points: points, p_reason: reason });
}

export async function open(api) {
  api.go('leaders');
  $('#lb-nick').value = getNick();
  const list = await loadGroups().catch(() => []);
  const sel = $('#lb-group');
  const opt = (g) => `<option value="${g.id}">${esc(g.name)}</option>`;
  sel.innerHTML = `<option value="">Choose one…</option>
    <optgroup label="Campuses and schools">${list.filter((g) => g.type === 'campus').map(opt).join('')}</optgroup>
    <optgroup label="Regions">${list.filter((g) => g.type !== 'campus').map(opt).join('')}</optgroup>`;
  sel.value = getGroup();
  if (!wired) {
    wired = true;
    sel.addEventListener('change', () => { setGroup(sel.value); api.sfx.tap(); hint(); });
    $('#lb-nick').addEventListener('change', () => { if (!setNick($('#lb-nick').value)) $('#lb-msg').textContent = 'Nicknames need 2–16 friendly letters.'; else hint(); });
    $('#lb-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      tab = b.dataset.tab;
      for (const x of $('#lb-tabs').children) x.classList.toggle('on', x === b);
      render(list);
    });
  }
  hint();
  $('#lb-list').innerHTML = '<li class="loading hand">Fetching the scores…</li>';
  try {
    [last, league] = await Promise.all([
      rpc(SUPABASE_URL, SUPABASE_ANON_KEY, 'dame_leaderboard', {}),
      rpc(SUPABASE_URL, SUPABASE_ANON_KEY, 'dame_league', { p_player: getPlayerId() }),
    ]);
    for (const x of $('#lb-tabs').children) x.classList.toggle('on', x.dataset.tab === tab);
    render(list);
  } catch {
    $('#lb-list').innerHTML = '';
    $('#lb-msg').textContent = navigator.onLine ? 'Couldn’t reach the scoreboard. Try again in a bit.' : 'You’re offline — scores show up when you’re back online.';
  }
}

function hint() {
  $('#lb-msg').textContent = !getNick() ? 'Pick a nickname to start earning points.' : getGroup() ? '' : 'Pick a group too if you want to count for your campus or region.';
}

function endsIn(iso) {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return 'ending now';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d ? `ends in ${d} day${d === 1 ? '' : 's'} ${h} h` : `ends in ${h} h`;
}

function renderLeague() {
  if (!league) return '';
  if (!league.joined) {
    return `<li class="loading hand">Win a game or solve the daily puzzle to join this week’s league (${endsIn(league.ends_at)}). New players start in the ${TIERS[0]} league.</li>`;
  }
  const head = `<li class="league-head"><b class="tier tier-${league.tier}">${TIERS[league.tier]} league</b>
    <span class="g">Group ${league.league_no} · ${league.size} player${league.size === 1 ? '' : 's'} · ${endsIn(league.ends_at)}</span>
    <span class="g">${league.promote ? `Top ${league.promote} move up` : league.tier === TIERS.length - 1 ? 'Top tier — hold on!' : 'Needs 10 players for moves up'}${league.demote ? ` · bottom ${league.demote} move down` : ''}</span></li>`;
  const n = league.members.length;
  const rows = league.members.map((m, i) => {
    const zone = i < league.promote ? 'up' : i >= n - league.demote ? 'down' : '';
    return `<li class="${m.me ? 'me ' : ''}${zone}"><b>${esc(m.n)}${zone === 'up' ? ' ▲' : zone === 'down' ? ' ▼' : ''}</b><span class="g">${m.me ? 'you' : ''}</span><span class="p">${m.p}</span></li>`;
  }).join('');
  return head + rows;
}

function render(list) {
  if (!last) return;
  const me = getNick();
  if (tab === 'league') { $('#lb-list').innerHTML = renderLeague(); return; }
  const rows = tab === 'players'
    ? last.players.map((r) => `<li class="${r.n === me ? 'me' : ''}"><b>${esc(r.n)}</b><span class="g">${esc(groupName(list, r.g))}</span><span class="p">${r.p}</span></li>`)
    : last.groups.map((r) => `<li class="${r.g === getGroup() ? 'me' : ''}"><b>${esc(groupName(list, r.g))}</b><span class="g">${r.c} player${r.c === 1 ? '' : 's'}</span><span class="p">${r.p}</span></li>`);
  $('#lb-list').innerHTML = rows.join('') || '<li class="loading hand">No scores yet this week — be the first!</li>';
}
