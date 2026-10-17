// A local stand-in for Supabase, for the end-to-end tests:
//  - PostgREST-style /rest/v1/rpc/<fn> calls, run against real Postgres (PGlite) loaded
//    with supabase/schema.sql, so the SQL itself is under test;
//  - Realtime broadcast + presence over the Phoenix JSON protocol (vsn 1.0.0).
// Test hooks: drop() closes every socket (a network blip), dbDown(true) makes RPC fail.
import http from 'node:http';
import fs from 'node:fs';
import { WebSocketServer } from 'ws';
import { PGlite } from '@electric-sql/pglite';

export async function startMock({ port = 54321, schema = new URL('../supabase/schema.sql', import.meta.url) } = {}) {
  const pg = new PGlite();
  await pg.exec('create role anon; create role authenticated;');
  await pg.exec(fs.readFileSync(schema, 'utf8'));
  // The function signatures come straight from the database, so new functions just work.
  const fnArgs = new Map();
  const { rows } = await pg.query(`select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'dame\\_%'`);
  for (const r of rows) {
    const names = r.args ? r.args.split(', ').map((a) => a.split(' ')[0]) : [];
    const prev = fnArgs.get(r.proname) || [];
    fnArgs.set(r.proname, [...prev, names]);
  }
  let dbIsDown = false;
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' };

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
    const m = req.url.match(/^\/rest\/v1\/rpc\/(\w+)/);
    if (!m || !fnArgs.has(m[1])) { res.writeHead(404, cors); res.end(); return; }
    if (dbIsDown) { res.writeHead(503, cors); res.end(); return; }
    let body = '';
    for await (const c of req) body += c;
    const args = JSON.parse(body || '{}');
    // pick the overload whose argument names match what was sent
    const keys = Object.keys(args).sort().join(',');
    const names = fnArgs.get(m[1]).find((n) => [...n].sort().join(',') === keys) || fnArgs.get(m[1])[0];
    try {
      const r = await pg.query(
        `select public.${m[1]}(${names.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as v`,
        names.map((n) => (Array.isArray(args[n]) ? args[n] : typeof args[n] === 'object' && args[n] !== null ? JSON.stringify(args[n]) : args[n])),
      );
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(r.rows[0].v));
    } catch (e) {
      res.writeHead(/duplicate key/.test(e.message) ? 409 : 400, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: e.message }));
    }
  });

  const topics = new Map();
  const wss = new WebSocketServer({ server, path: '/realtime/v1/websocket' });
  let phxRef = 0;
  const leave = (ws, t) => {
    const sub = ws.subs.get(t);
    ws.subs.delete(t);
    topics.get(t)?.delete(ws);
    if (sub?.meta) {
      const diff = { joins: {}, leaves: { [sub.key]: { metas: [sub.meta] } } };
      for (const c of topics.get(t) || []) if (c.readyState === 1) c.send(JSON.stringify({ topic: t, event: 'presence_diff', payload: diff }));
    }
  };
  wss.on('connection', (ws, req) => {
    if (!/apikey=/.test(req.url) || !/vsn=1\.0\.0/.test(req.url)) { ws.close(); return; }
    ws.subs = new Map();
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      const send = (o) => ws.readyState === 1 && ws.send(JSON.stringify(o));
      if (msg.topic === 'phoenix' && msg.event === 'heartbeat') { send({ topic: 'phoenix', event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: msg.ref }); return; }
      const t = msg.topic;
      if (msg.event === 'phx_join') {
        if (!t.startsWith('realtime:') || !msg.payload?.config) { send({ topic: t, event: 'phx_reply', payload: { status: 'error' }, ref: msg.ref }); return; }
        if (!topics.has(t)) topics.set(t, new Set());
        topics.get(t).add(ws);
        ws.subs.set(t, { key: msg.payload.config.presence?.key || String(Math.random()), meta: null });
        send({ topic: t, event: 'phx_reply', payload: { status: 'ok', response: { postgres_changes: [] } }, ref: msg.ref });
        const state = {};
        for (const c of topics.get(t)) { const s = c.subs.get(t); if (s?.meta) (state[s.key] ||= { metas: [] }).metas.push(s.meta); }
        send({ topic: t, event: 'presence_state', payload: state });
        return;
      }
      const sub = ws.subs.get(t);
      if (!sub) return;
      if (msg.event === 'broadcast') {
        for (const c of topics.get(t)) if (c !== ws && c.readyState === 1) c.send(JSON.stringify({ topic: t, event: 'broadcast', payload: msg.payload, ref: null }));
      } else if (msg.event === 'presence' && msg.payload?.event === 'track') {
        const old = sub.meta;
        sub.meta = { ...msg.payload.payload, phx_ref: String(++phxRef) };
        const diff = { joins: { [sub.key]: { metas: [sub.meta] } }, leaves: old ? { [sub.key]: { metas: [old] } } : {} };
        for (const c of topics.get(t)) if (c.readyState === 1) c.send(JSON.stringify({ topic: t, event: 'presence_diff', payload: diff }));
      } else if (msg.event === 'phx_leave') {
        leave(ws, t);
      }
    });
    ws.on('close', () => { for (const t of [...ws.subs.keys()]) leave(ws, t); });
  });

  await new Promise((r) => server.listen(port, r));
  return {
    url: `http://localhost:${port}`,
    pg,
    drop() { for (const c of wss.clients) c.terminate(); },
    dbDown(down) { dbIsDown = down; },
    close() { for (const c of wss.clients) c.terminate(); wss.close(); return new Promise((r) => server.close(r)); },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = await startMock({ port: Number(process.env.PORT || 54321) });
  console.log('mock supabase on', m.url);
}
