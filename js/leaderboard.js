// Weekly leaderboards by nickname and by campus / school / region. Loaded on demand.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { rpc } from './realtime.js';
import { getNick, setNick, getGroup, setGroup } from './profile.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
let groups = null;
let tab = 'players';
let wired = false;
let last = null;

async function loadGroups() {
  groups ||= fetch('data/groups.json').then((r) => r.json()).then((d) => d.groups);
  return groups;
}
const groupName = (list, id) => list.find((g) => g.id === id)?.name || id;

export async function addPoints(reason, points) {
  const nick = getNick();
  const group = getGroup();
  if (!nick || !group) return false;
  return rpc(SUPABASE_URL, SUPABASE_ANON_KEY, 'dame_add_points', { p_nickname: nick, p_group: group, p_points: points, p_reason: reason });
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
    last = await rpc(SUPABASE_URL, SUPABASE_ANON_KEY, 'dame_leaderboard', {});
    render(list);
  } catch {
    $('#lb-list').innerHTML = '';
    $('#lb-msg').textContent = navigator.onLine ? 'Couldn’t reach the scoreboard. Try again in a bit.' : 'You’re offline — scores show up when you’re back online.';
  }
}

function hint() {
  $('#lb-msg').textContent = getNick() && getGroup() ? '' : 'Pick a nickname and a group to start earning points.';
}

function render(list) {
  if (!last) return;
  const me = getNick();
  const rows = tab === 'players'
    ? last.players.map((r) => `<li class="${r.n === me ? 'me' : ''}"><b>${esc(r.n)}</b><span class="g">${esc(groupName(list, r.g))}</span><span class="p">${r.p}</span></li>`)
    : last.groups.map((r) => `<li class="${r.g === getGroup() ? 'me' : ''}"><b>${esc(groupName(list, r.g))}</b><span class="g">${r.c} player${r.c === 1 ? '' : 's'}</span><span class="p">${r.p}</span></li>`);
  $('#lb-list').innerHTML = rows.join('') || '<li class="loading hand">No scores yet this week — be the first!</li>';
}
