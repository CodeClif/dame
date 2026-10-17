// Guards against secrets or unsafe settings leaking into the files every visitor downloads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const clientFiles = ['index.html', 'sw.js', ...fs.readdirSync('js').map((f) => `js/${f}`)];

test('no service-role or secret keys in client files', () => {
  for (const f of clientFiles) {
    const text = fs.readFileSync(f, 'utf8');
    assert.ok(!/service_role|sb_secret_|SUPABASE_SERVICE/i.test(text.replace(/\/\/.*$/gm, '')), `${f} mentions a secret key`);
    for (const jwt of text.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g) || []) {
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
      assert.equal(payload.role, 'anon', `${f} contains a ${payload.role} JWT`);
    }
  }
});

test('the database schema keeps row level security on and grants no table access', () => {
  const sql = fs.readFileSync('supabase/schema.sql', 'utf8');
  const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
  assert.ok(tables.length >= 3);
  for (const t of tables) {
    assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`), `${t} has no RLS`);
    assert.match(sql, new RegExp(`revoke all on [^;]*public\\.${t}\\b`), `${t} keeps default grants`);
  }
  assert.ok(!/grant (select|insert|update|delete|all)[^;]* on (table )?public\./i.test(sql), 'a table is granted to clients');
  assert.ok(!/\bdrop table\b|\btruncate\b/i.test(sql), 'schema must never drop or empty tables');
  for (const fn of sql.matchAll(/create or replace function public\.(\w+)[\s\S]*?\$\$;/g)) {
    assert.match(fn[0], /set search_path = public/, `${fn[1]} has a mutable search_path`);
  }
});
