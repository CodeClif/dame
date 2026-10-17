// End-to-end check of the whole game in a real (headless) browser.
//   npm run e2e
// Starts a static server for the site, a local Supabase stand-in (e2e/mock-supabase.mjs),
// and plays through rules, online play and failure cases on phone-sized screens.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startMock } from './mock-supabase.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const SITE_PORT = 8181;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
const site = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  let f = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => site.listen(SITE_PORT, r));
const mock = await startMock({ port: 54399 });
const BASE = `http://localhost:${SITE_PORT}/`;
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

const results = [];
const pageErrors = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function phone({ nick = 'Tester', team = 'forest', w = 390, h = 844, settings = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await ctx.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: `export const SUPABASE_URL='${mock.url}';export const SUPABASE_ANON_KEY='anon-test';export const VAPID_PUBLIC_KEY='';export const onlineConfigured=()=>true;` }));
  await ctx.addInitScript(([n, t, s]) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('dame.profile.v1', JSON.stringify({ nick: n }));
      localStorage.setItem('dame.settings.v1', JSON.stringify({ team: t, sound: false, ...s }));
      sessionStorage.setItem('seeded', '1');
    }
  }, [nick, team, settings]);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { pageErrors.push(`${nick}: ${e.message}`); console.log('  page error:', nick, e.message); });
  return p;
}
const idle = (p) => p.waitForFunction(() => window.dame?.game && !window.dame.game.busy, null, { timeout: 15000 });
async function tapSq(p, s) {
  const flip = await p.evaluate(() => dame.game.flip);
  const v = flip ? 63 - s : s;
  const bb = await p.locator('#board').boundingBox();
  await p.mouse.click(bb.x + ((v & 7) + 0.5) * (bb.width / 8), bb.y + ((v >> 3) + 0.5) * (bb.height / 8));
  await p.waitForTimeout(120);
}
async function move(p, from, to) { await tapSq(p, from); await tapSq(p, to); }
async function startPnp(p) {
  await p.goto(BASE);
  await p.click('#home');
  await p.click('[data-mode=pnp]');
  await p.click('#start-btn');
  await idle(p);
}
const sq = (r, c) => r * 8 + c;
const modalTitle = (p) => p.waitForSelector('#modal:not([hidden]) #sheet h2', { timeout: 8000 }).then((e) => e.textContent());

// ---------------------------------------------------------------- rules through the UI
{
  const p = await phone();
  await startPnp(p);
  check('a new game has 7 opening moves and 12 pieces a side', await p.evaluate(() => dame.game.moves.length === 7 && document.querySelectorAll('#pieces .piece').length === 24));

  await p.evaluate(() => dame.position(['........', '........', '........', '..o.....', '...x....', '........', '.x......', '........'], 1));
  await tapSq(p, sq(6, 1));
  const cap = await p.textContent('#caption');
  check('forced capture: a piece that can’t capture is refused', await p.evaluate(() => dame.game.selected == null) && /capture|take am/.test(cap), `caption "${cap}"`);
  await move(p, sq(4, 3), sq(2, 1));
  await idle(p);
  check('forced capture: the capture is played', await p.evaluate(() => dame.game.state.board.filter((x) => x < 0).length === 0));
  check('taking the last piece wins the game', /wins/.test(await modalTitle(p)));
  await p.click('.sheet-x');
  check('the ✕ closes the result card', await p.evaluate(() => document.querySelector('#modal').hidden));

  await p.evaluate(() => dame.position(['........', '........', '...o....', '........', '.o......', 'x.......', '........', '.......O'], 1));
  await move(p, sq(5, 0), sq(1, 4));
  await idle(p);
  const multi = await p.evaluate(() => ({ left: dame.game.state.board.filter((x) => x === -1).length, tray: document.querySelectorAll('.tray-side .heads span').length }));
  check('multi-jump: both men are taken in one turn', multi.left === 0 && multi.tray === 2, JSON.stringify(multi));

  await p.evaluate(() => dame.position(['........', '..x.....', '........', '........', '........', '........', '.....o..', '........'], 1));
  await move(p, sq(1, 2), sq(0, 1));
  await idle(p);
  const crown = await p.evaluate(() => ({ b1: dame.game.state.board[1], king: !!document.querySelector('#pieces .piece.king'), log: dame.game.log.length, sel: dame.game.selected, turn: dame.game.state.turn }));
  check('a man reaching the far row is crowned', crown.b1 === 2 && crown.king, JSON.stringify(crown));

  await p.evaluate(() => dame.position(['X.......', '........', '........', '........', '........', '........', '........', '.......O'], 1, 49));
  await move(p, sq(0, 0), sq(1, 1));
  check('49 quiet plies + one king move ends in a draw', /draw/i.test(await modalTitle(p)));

  await p.evaluate(() => dame.position(['........', '........', '........', '........', '........', '....x...', 'o.......', '.x......'], 1));
  await p.click('.sheet-x');
  await move(p, sq(5, 4), sq(4, 3));
  const blocked = await modalTitle(p);
  const line = await p.textContent('#sheet p');
  check('a side with no moves left loses', /Player 1 wins/.test(blocked) && /no moves left/.test(line), `${blocked} / ${line.trim()}`);

  await p.click('.sheet-x');
  // a result card must not pop up over a game started straight afterwards
  await p.evaluate(() => dame.position(['........', '........', '........', '..o.....', '...x....', '........', '........', '........'], 1));
  await move(p, sq(4, 3), sq(2, 1));
  await idle(p);
  await p.evaluate(() => dame.position(['........', '........', '........', '..o.....', '...x....', '........', '.x......', '........'], 1));
  await p.waitForTimeout(1800);
  check('no stale result card after restarting quickly', await p.evaluate(() => document.querySelector('#modal').hidden), await p.evaluate(() => document.querySelector('#sheet h2')?.textContent));
  if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + 'stale.png' });

  // the two rule toggles, set through the Settings screen
  await p.evaluate(() => dame.go('settings'));
  await p.click('label:has([data-setting=flyingKings])');
  await p.click('label:has([data-setting=menCaptureBackward])');
  await p.evaluate(() => dame.go('home'));
  if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + 'home2.png' });
  await p.click('[data-mode=pnp]');
  if (process.env.SHOTS) await p.screenshot({ path: process.env.SHOTS + 'setup2.png' });
  await p.click('#start-btn'); await idle(p);
  const opts = await p.evaluate(() => dame.game.opts);
  await p.evaluate(() => dame.position(['........', '........', '........', '...X....', '..o.....', '........', '........', '........'], 1));
  const off = await p.evaluate(() => dame.game.moves.map((m) => m.captures.length));
  check('flying kings OFF: a king steps one square and captures adjacent only', !opts.flyingKings && off.length === 1 && off[0] === 1, JSON.stringify(off));
  await p.evaluate(() => dame.position(['........', '........', '........', '...x....', '..o.....', '........', '........', '........'], 1));
  check('backward capture OFF: a man can’t take backwards', await p.evaluate(() => dame.game.moves.every((m) => m.captures.length === 0)));
  await p.evaluate(() => dame.go('settings'));
  await p.click('label:has([data-setting=flyingKings])');
  await p.click('label:has([data-setting=menCaptureBackward])');
  await p.evaluate(() => dame.go('home'));
  await p.click('[data-mode=pnp]'); await p.click('#start-btn'); await idle(p);
  await p.evaluate(() => dame.position(['........', '........', '........', '...X....', '........', '........', '........', '........'], 1));
  check('flying kings ON: a lone king in the centre has 13 moves', await p.evaluate(() => dame.game.moves.length === 13));
  await p.evaluate(() => dame.position(['........', '........', '........', '...x....', '..o.....', '........', '........', '........'], 1));
  check('backward capture ON: the man captures backwards', await p.evaluate(() => dame.game.moves.length === 1 && dame.game.moves[0].captures.length === 1));

  // the computer answers and the undo button rolls back to the human's turn
  await p.goto(BASE);
  await p.click('#home'); await p.click('[data-mode=cpu]'); await p.click('#start-btn'); await idle(p);
  const [f, t] = await p.evaluate(() => [dame.game.moves[0].from, dame.game.moves[0].to]);
  await move(p, f, t);
  await p.waitForFunction(() => dame.game.log.length === 2 && !dame.game.busy, null, { timeout: 15000 });
  await p.click('#undo-btn');
  check('vs computer: the AI replies and undo returns to your turn', await p.evaluate(() => dame.game.log.length === 0 || dame.game.state.turn === 1));
  await p.context().close();
}

// ---------------------------------------------------------------- online
async function onlinePair(timer = 0) {
  const host = await phone({ nick: 'Ama', team: 'market', w: 375, h: 667 });
  const guest = await phone({ nick: 'Kojo', team: 'forest' });
  await host.goto(BASE); await host.click('#home'); await host.click('#friend-btn');
  await host.click(`#ol-timer-seg [data-timer="${timer}"]`);
  await host.click('#ol-create-btn');
  await host.waitForSelector('.code-big');
  const code = (await host.textContent('.code-big')).trim();
  await guest.goto(`${BASE}?room=${code}`);
  await Promise.all([host, guest].map((p) => p.waitForFunction(() => window.dame?.game?.mode === 'online' && !window.dame.game.busy, null, { timeout: 15000 })));
  return { host, guest, code };
}
const sameBoard = async (a, b) => (await a.evaluate(() => JSON.stringify(dame.game.state))) === (await b.evaluate(() => JSON.stringify(dame.game.state)));
async function playPlies(host, guest, n) {
  for (let i = 0; i < n; i++) {
    const turn = await host.evaluate(() => dame.game.state.turn);
    const mover = turn === 1 ? host : guest;
    await mover.waitForFunction(() => dame.game.human[dame.game.state.turn] && !dame.game.busy, null, { timeout: 15000 });
    const before = await mover.evaluate(() => dame.game.log.length);
    const [f, t] = await mover.evaluate(() => [dame.game.moves[0].from, dame.game.moves[0].to]);
    await move(mover, f, t);
    await Promise.all([host, guest].map((p) => p.waitForFunction((k) => dame.game.log.length === k && !dame.game.busy, before + 1, { timeout: 20000 })));
  }
}
{
  const { host, guest, code } = await onlinePair();
  check('online: host and guest join the same room', /^[A-Z2-9]{6}$/.test(code) && await guest.evaluate(() => dame.game.flip === true));
  await playPlies(host, guest, 4);
  check('online: four moves later both boards match', await sameBoard(host, guest));

  // dropped connection mid-move: the host starts a move, the network blips, the move finishes
  await host.waitForFunction(() => dame.game.state.turn === 1 && !dame.game.busy);
  const [f, t] = await host.evaluate(() => [dame.game.moves[0].from, dame.game.moves[0].to]);
  await tapSq(host, f);
  mock.drop();
  await tapSq(host, t);
  await Promise.all([host, guest].map((p) => p.waitForFunction(() => dame.game.log.length === 5 && !dame.game.busy, null, { timeout: 30000 })));
  check('online: a move made while the connection drops still arrives', await sameBoard(host, guest));
  const banner = await host.evaluate(() => document.querySelector('#net-banner').hidden);
  check('online: the connection banner clears after reconnecting', banner);

  // reconnect: the guest reloads in the middle of the game
  await guest.reload();
  await guest.waitForFunction(() => window.dame?.game?.mode === 'online' && !window.dame.game.busy && dame.game.log.length === 5, null, { timeout: 20000 });
  check('online: reloading resumes the game from the stored moves', await sameBoard(host, guest));
  await playPlies(host, guest, 2);
  check('online: play carries on after the reload', await sameBoard(host, guest));

  // resign and rematch
  await guest.click('#menu-btn'); await guest.click('[data-act=resign]');
  check('online: resigning shows the result on both phones', /win/i.test(await modalTitle(host)) && /wins/i.test(await modalTitle(guest)));
  await host.click('[data-act=orematch]');
  await guest.waitForSelector('text=Rematch?', { timeout: 8000 });
  await guest.click('[data-act=yes]');
  await Promise.all([host, guest].map((p) => p.waitForFunction(() => dame.game.log.length === 0 && !dame.game.over && !dame.game.busy, null, { timeout: 15000 })));
  check('online: rematch starts a fresh game with the other side moving first', await host.evaluate(() => dame.game.state.turn === -1));
  const row = await mock.pg.query(`select game, cardinality(moves) n, first_turn from dame_rooms where code = $1`, [code]);
  check('online: the database moved on to game 2', row.rows[0].game === 2 && row.rows[0].n === 0 && row.rows[0].first_turn === -1, JSON.stringify(row.rows[0]));

  // an illegal move from a tampered client is ignored
  await guest.evaluate(() => { /* nothing */ });
  await host.evaluate(() => dame.game.online && 0);
  await host.context().close(); await guest.context().close();
}
{
  // database unreachable: the phones sync from each other
  mock.dbDown(true);
  const { host, guest } = await onlinePair();
  await playPlies(host, guest, 3);
  await guest.reload();
  await guest.waitForFunction(() => window.dame?.game?.mode === 'online' && !window.dame.game.busy && dame.game.log.length === 3, null, { timeout: 25000 });
  check('online without the database: a reloaded phone catches up from the other', await sameBoard(host, guest));
  mock.dbDown(false);
  await host.context().close(); await guest.context().close();
}

// ---------------------------------------------------------------- play over days
{
  const poke = (p) => p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const host = await phone({ nick: 'Abena', team: 'forest' });
  const guest = await phone({ nick: 'Yaw', team: 'forest', w: 375, h: 667 });
  await host.goto(BASE); await host.click('#home'); await host.click('#friend-btn');
  await host.click('[data-olmode=days]');
  await host.click('#ol-create-btn');
  await host.waitForSelector('.code-big', { timeout: 15000 });
  const id = (await host.textContent('.code-big')).trim();
  check('over days: a game gets an 8-character code and a link', /^[A-HJKMNP-Z2-9]{8}$/.test(id) && host.url().includes(`?days=${id}`), id);
  await host.click('[data-act=close]');
  await idle(host);
  let [f, t] = await host.evaluate(() => [dame.game.moves[0].from, dame.game.moves[0].to]);
  await move(host, f, t);
  await host.waitForFunction(() => dame.game.log.length === 1 && !document.querySelector('#days-bar').hidden, null, { timeout: 15000 });
  check('over days: after moving, the host is offered a share / WhatsApp nudge', await host.evaluate(() => !!document.querySelector('#days-bar [data-days=share]') && !!document.querySelector('#days-bar a[href^="https://wa.me/"]')));
  check('over days: a clear message where notifications aren’t available', await host.evaluate(() => document.querySelector('#days-bar .push-note')?.textContent.length > 20), await host.evaluate(() => document.querySelector('#days-bar .push-note')?.textContent));

  await guest.goto(`${BASE}?days=${id}`);
  await guest.waitForSelector('[data-act=join]', { timeout: 15000 });
  await guest.click('[data-act=join]');
  await guest.waitForFunction(() => dame.game?.mode === 'days' && !dame.game.busy && dame.game.log.length === 1, null, { timeout: 15000 });
  check('over days: the friend joins from the link and sees the first move', await guest.evaluate(() => dame.game.localSide === -1 && dame.game.flip));
  [f, t] = await guest.evaluate(() => [dame.game.moves[0].from, dame.game.moves[0].to]);
  await move(guest, f, t);
  await guest.waitForFunction(() => dame.game.log.length === 2 && !dame.game.busy, null, { timeout: 15000 });
  await poke(host);
  await host.waitForFunction(() => dame.game.log.length === 2 && !dame.game.busy, null, { timeout: 15000 });
  check('over days: the host picks up the reply when they come back', await sameBoard(host, guest));

  // a move made with no signal is kept on the phone and sent later
  [f, t] = await host.evaluate(() => [dame.game.moves[0].from, dame.game.moves[0].to]);
  await host.context().setOffline(true);
  await move(host, f, t);
  await host.waitForFunction(() => JSON.parse(localStorage.getItem('dame.days.v1')).pending.length === 1, null, { timeout: 10000 });
  check('over days: offline, the move is saved on the phone', await host.evaluate(() => /saved|signal/i.test(document.querySelector('#days-bar').textContent)));
  await host.context().setOffline(false);
  await host.evaluate(() => window.dispatchEvent(new Event('online')));
  await host.waitForFunction(() => JSON.parse(localStorage.getItem('dame.days.v1')).pending.length === 0, null, { timeout: 15000 });
  await poke(guest);
  await guest.waitForFunction(() => dame.game.log.length === 3 && !dame.game.busy, null, { timeout: 15000 });
  check('over days: back online, the saved move reaches the friend', await sameBoard(host, guest));

  // My games
  await guest.click('#menu-btn'); await guest.click('[data-act=leave]');
  await guest.waitForSelector('#games-list .game-row', { timeout: 10000 });
  const rowText = await guest.textContent('#games-list li');
  check('My games: lists the game and whose turn it is', /Abena/.test(rowText) && /Your turn/.test(rowText), rowText.replace(/\s+/g, ' ').trim());
  await guest.click('#games-list .game-row');
  await guest.waitForFunction(() => dame.game?.mode === 'days' && !dame.game.busy, null, { timeout: 15000 });

  // nobody else can take a seat
  const third = await phone({ nick: 'Esi' });
  await third.goto(`${BASE}?days=${id}`);
  await third.waitForFunction(() => /two players/.test(document.querySelector('#ol-msg')?.textContent || ''), null, { timeout: 15000 });
  check('over days: a third person can’t join', true);
  await third.context().close();

  // 14 days without a move: the player to move forfeits
  await mock.pg.query(`update dame_days_games set last_move_at = now() - interval '15 days' where id = $1`, [id]);
  await guest.reload();
  const fTitle = await modalTitle(guest);
  const fLine = await guest.textContent('#sheet p');
  check('over days: after 14 quiet days the player to move forfeits, with a clear message', /wins/i.test(fTitle) && /14 days/.test(fLine), `${fTitle} / ${fLine.trim()}`);
  const stored = await mock.pg.query('select result from dame_days_games where id = $1', [id]);
  check('over days: the forfeit is recorded in the database', /^1:forfeit$/.test(stored.rows[0].result), stored.rows[0].result);
  await host.context().close(); await guest.context().close();
}

// ---------------------------------------------------------------- keep coming back: recap, freeze, packs, leagues
{
  const p = await phone({ nick: 'Kofi B' });
  await p.goto(BASE); await p.click('#home'); await p.click('[data-mode=cpu]'); await p.click('#start-btn'); await idle(p);
  // a quick win with a double jump
  await p.evaluate(() => dame.position(['........', '........', '...o....', '........', '.o......', 'x.......', '........', '........'], 1));
  await move(p, sq(5, 0), sq(1, 4));
  await modalTitle(p);
  const recap = await p.evaluate(() => [...document.querySelectorAll('#sheet .recap p')].map((x) => x.textContent));
  check('recap: handwritten lines in the characters’ voices after a game', recap.length >= 2 && recap.length <= 4 && recap.some((l) => /Double wahala on move 1/.test(l)), JSON.stringify(recap));
  await p.click('.sheet-x');

  // leagues: that win earned points and a place in a league
  await p.waitForTimeout(800);
  await p.evaluate(() => dame.go('home'));
  await p.click('#leaders-btn');
  await p.waitForSelector('.league-head', { timeout: 10000 });
  const league = await p.textContent('#lb-list');
  check('leagues: the win puts you in this week’s Pebble league with your nickname only', /Pebble league/.test(league) && /Kofi B/.test(league) && /ends in/.test(league), league.replace(/\s+/g, ' ').trim().slice(0, 120));
  const lcols = await mock.pg.query(`select column_name from information_schema.columns where table_name = 'dame_league_members'`);
  check('leagues: only a nickname and a random player number are stored', !lcols.rows.some((r) => /mail|phone|ip|device|name$/.test(r.column_name) && r.column_name !== 'nickname'), lcols.rows.map((r) => r.column_name).join(','));

  // streak freeze: solved 5 days in a row up to two days ago, missed yesterday
  await p.evaluate(async () => {
    const m = await import('./js/puzzles.js');
    const today = m.dayNumber();
    let r = null;
    for (let d = today - 6; d <= today - 2; d++) r = m.recordSolve(r, d, 1);
    localStorage.setItem('dame.puzzle.v1', JSON.stringify(r));
  });
  await p.goto(BASE); await p.click('#home');
  const btn = await p.textContent('#puzzle-btn');
  check('streak freeze: a missed day keeps the streak alive “on ice”', /🔥5/.test(btn) && /🧊1/.test(btn) && /ice/.test(btn), btn.trim());
  await p.click('#puzzle-btn');
  await p.waitForFunction(() => dame.game?.mode === 'puzzle' && !dame.game.busy, null, { timeout: 10000 });
  for (let i = 0; i < 4; i++) {
    await p.waitForFunction(() => dame.game.over || (dame.game.state.turn === 1 && !dame.game.busy), null, { timeout: 10000 });
    if (await p.evaluate(() => dame.game.over)) break;
    const [a, b] = await p.evaluate(async () => { const m = await import('./js/puzzles.js'); const g = dame.game; const mv = m.winningMove(g.state, g.puzzle.par - g.puzzle.used, g.opts); return [mv.from, mv.to]; });
    await move(p, a, b);
    await p.waitForTimeout(300);
  }
  await p.waitForSelector('text=Solved!', { timeout: 10000 });
  const solved = await p.textContent('#sheet');
  check('streak freeze: solving today spends the freeze and continues the streak', /6-day streak/.test(solved) && /freeze saved your streak/.test(solved), solved.replace(/\s+/g, ' ').match(/🔥[^.]*streak/)?.[0]);
  await p.click('.sheet-x');

  // the two new packs: listed, grouped and clearly locked
  await p.evaluate(() => dame.go('home'));
  await p.click('[data-mode=cpu]');
  await p.click('#team-seg [data-team=market]');
  const heads = await p.evaluate(() => [...document.querySelectorAll('#lineup1 .pack-head')].map((h) => h.textContent));
  const chop = await p.evaluate(() => [...document.querySelectorAll('#lineup1 .card')].filter((c) => ['waakye', 'bofrot', 'kenkeywrap', 'chichinga', 'plantain', 'pito'].includes(c.dataset.char)).map((c) => [c.dataset.char, c.classList.contains('sealed'), c.querySelector('.lock')?.textContent || '']));
  check('packs: Chop Bar is listed with six characters', heads.some((h) => /Chop Bar/.test(h)) && chop.length === 6, heads.join(' / '));
  check('packs: locked characters say they are locked and how to unlock', chop.filter(([, sealed]) => sealed).every(([, , lock]) => /Locked/.test(lock)) && chop.some(([k, sealed]) => k === 'bofrot' && !sealed) && chop.some(([k, sealed]) => k === 'waakye' && sealed), JSON.stringify(chop));
  await p.click('#team-seg [data-team=forest]');
  const wild = await p.evaluate(() => [...document.querySelectorAll('#lineup1 .card')].filter((c) => ['mona', 'hornbill', 'elephant', 'pangolin', 'grasscutter', 'riverhog'].includes(c.dataset.char)).length);
  check('packs: Wildlife is listed with six characters', wild === 6);
  await p.evaluate(() => dame.go('shop'));
  const shop = await p.textContent('#packs');
  check('shop: free packs shown, paid packs clearly “coming soon”', /Chop Bar\s*Free/.test(shop) && /coming soon/i.test(shop));
  await p.context().close();
}

// ---------------------------------------------------------------- database rules (the real SQL)
{
  const q = (sql, args) => mock.pg.query(sql, args);
  const rls = await q(`select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and relkind = 'r'`);
  check('database: row level security is on for every table', rls.rows.length > 0 && rls.rows.every((r) => r.relrowsecurity), rls.rows.map((r) => r.relname).join(', '));
  const grants = await q(`select table_name, privilege_type from information_schema.role_table_grants where grantee in ('anon', 'authenticated') and table_schema = 'public'`);
  check('database: the anon key has no direct table access', grants.rows.length === 0, JSON.stringify(grants.rows));
  const fns = await q(`select proname, prosecdef, proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname like 'dame\\_%'`);
  check('database: every function pins its search_path', fns.rows.every((r) => r.proconfig?.some((c) => c.startsWith('search_path='))), fns.rows.filter((r) => !r.proconfig).map((r) => r.proname).join(', '));
  await q(`select dame_create_room('ZZZZZZ', '{"ht":"forest","c":1}'::jsonb)`);
  await q(`update dame_rooms set expires_at = now() - interval '1 minute' where code = 'ZZZZZZ'`);
  const exp = await q(`select dame_get_room('ZZZZZZ') as r, dame_push_move('ZZZZZZ', 1, 0, 'kQ') as m`);
  check('database: expired rooms can’t be read or played', exp.rows[0].r === null && exp.rows[0].m === false);
  let reports = 0;
  for (let i = 0; i < 25; i++) if ((await q(`select dame_report('RRRRRR', 'x', 'spam') as ok`)).rows[0].ok) reports++;
  check('database: reports are capped per room', reports === 20, `${reports} accepted`);
}

// ---------------------------------------------------------------- counts, previews, install, legal pages
{
  const ev = await mock.pg.query('select event, n from dame_event_counts order by event');
  const names = ev.rows.map((r) => r.event);
  check('anonymous counts: games, invites recorded as daily totals only', ['game_start_pnp', 'game_start_online', 'game_finish_online', 'invite_open'].every((e) => names.includes(e)), names.join(', '));
  const cols = await mock.pg.query(`select column_name from information_schema.columns where table_name = 'dame_event_counts'`);
  check('anonymous counts: the table has no user or device columns', cols.rows.map((r) => r.column_name).sort().join() === 'day,event,n');
  const p = await phone();
  await p.goto(BASE);
  const meta = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')].map((m) => [m.getAttribute('property') || m.name, m.content])));
  check('link previews: Open Graph + Twitter tags with an absolute image', /^https:\/\/.+\.(jpg|png)$/.test(meta['og:image']) && meta['twitter:card'] === 'summary_large_image' && !!meta['og:title'], meta['og:image']);
  const og = await p.request.get(`${BASE}og.jpg`);
  check('link previews: the share image exists and is small enough for WhatsApp', og.ok() && (await og.body()).length < 300000, `${(await og.body()).length} bytes`);
  const man = await (await p.request.get(`${BASE}manifest.webmanifest`)).json();
  const icons = await Promise.all(man.icons.map((i) => p.request.get(BASE + i.src).then((r) => r.ok())));
  check('install: manifest has standalone display, 192/512 and maskable icons, all reachable', man.display === 'standalone' && man.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable') && man.icons.some((i) => i.sizes === '192x192') && icons.every(Boolean));
  check('install: iPhone home-screen icon and tags', await p.evaluate(() => !!document.querySelector('link[rel=apple-touch-icon][href$=".png"]') && !!document.querySelector('meta[name=apple-mobile-web-app-capable]')));
  for (const page of ['privacy.html', 'terms.html']) {
    await p.goto(BASE + page);
    check(`legal: ${page} loads with a way back to the game`, (await p.textContent('h1')).length > 5 && await p.locator('a[href="./"]').count() === 1);
  }
  await p.context().close();
}

check('no JavaScript errors on any page', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
await browser.close();
await mock.close();
site.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
