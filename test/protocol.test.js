import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, getLegalMoves, applyMove, stateFromRows } from '../js/rules.js';
import { chooseMove } from '../js/ai.js';
import {
  encodeMove, decodeMove, replayMoves, makeRoomCode, normalizeRoomCode, roomExpired,
  cleanChat, cleanNickname, containsProfanity, RateLimiter, MAX_CHAT,
} from '../js/protocol.js';

test('moves round-trip through their compact code', () => {
  let s = createInitialState();
  for (let i = 0; i < 40; i++) {
    const moves = getLegalMoves(s);
    if (!moves.length) break;
    for (const m of moves) assert.deepEqual(decodeMove(s, {}, encodeMove(m)), m);
    s = applyMove(s, moves[i % moves.length]);
  }
});

test('a multi-jump encodes its whole path in a few bytes', () => {
  const s = stateFromRows(['........', '........', '...o....', '........', '.o......', 'x.......', '........', '........']);
  const [m] = getLegalMoves(s, { flyingKings: false, menCaptureBackward: false });
  const code = encodeMove(m);
  assert.equal(code.length, 3);
  assert.deepEqual(decodeMove(s, { flyingKings: false, menCaptureBackward: false }, code), m);
});

test('illegal or garbled moves are rejected', () => {
  const s = createInitialState();
  assert.equal(decodeMove(s, {}, 'AA'), null);
  assert.equal(decodeMove(s, {}, '??'), null);
  assert.equal(decodeMove(s, {}, ''), null);
  assert.equal(decodeMove(s, {}, 123), null);
  // A legal-looking step for the side that is not on move.
  const theirs = getLegalMoves({ ...s, turn: -1 })[0];
  assert.equal(decodeMove(s, {}, encodeMove(theirs)), null);
});

test('replayMoves rebuilds a game and stops at a bad move', () => {
  let s = createInitialState();
  const codes = [];
  for (let i = 0; i < 20; i++) {
    const m = chooseMove(s, {}, 'easy');
    if (!m) break;
    codes.push(encodeMove(m));
    s = applyMove(s, m);
  }
  const ok = replayMoves(codes, {});
  assert.equal(ok.error, null);
  assert.deepEqual(ok.state, s);
  const bad = replayMoves([...codes.slice(0, 3), 'AA', ...codes.slice(4)], {});
  assert.equal(bad.moves.length, 3);
  assert.match(bad.error, /#4/);
});

test('room codes are 6 unambiguous characters', () => {
  for (let i = 0; i < 200; i++) {
    const c = makeRoomCode();
    assert.match(c, /^[A-HJKMNP-Z2-9]{6}$/);
    assert.equal(normalizeRoomCode(c.toLowerCase()), c);
  }
  assert.equal(normalizeRoomCode('ABC'), null);
  assert.equal(normalizeRoomCode('ABCDE0'), null);
  assert.equal(normalizeRoomCode(' abc-def '), 'ABCDEF');
});

test('rooms expire after two hours', () => {
  const now = Date.now();
  assert.equal(roomExpired(now - 60 * 60 * 1000, now), false);
  assert.equal(roomExpired(now - 2.1 * 60 * 60 * 1000, now), true);
  assert.equal(roomExpired(null, now), true);
});

test('chat is trimmed, capped at 80 characters and masked', () => {
  assert.equal(cleanChat('  hello   there  '), 'hello there');
  assert.equal([...cleanChat('x'.repeat(200))].length, MAX_CHAT);
  assert.ok(!cleanChat('you are a kwasia').includes('kwasia'));
  assert.ok(!/fuck/i.test(cleanChat('F.U.C.K this')));
  assert.ok(!/shit/i.test(cleanChat('sh1t move')));
  assert.equal(cleanChat('Good game, chale!'), 'Good game, chale!');
  assert.ok(containsProfanity('f u c k'));
  assert.ok(!containsProfanity('Akwaaba my friend'));
});

test('nicknames are tidied and rude ones refused', () => {
  assert.equal(cleanNickname('  Ama <b>K</b> '), 'Ama bKb');
  assert.equal(cleanNickname('x'), null);
  assert.equal(cleanNickname('kwasia99'), null);
  assert.equal(cleanNickname('Kofi the Great and Mighty'), 'Kofi the Great a');
});

test('rate limiter blocks floods', () => {
  const rl = new RateLimiter({ gapMs: 1000, burst: 3, windowMs: 10000 });
  assert.ok(rl.allow(0));
  assert.ok(!rl.allow(500));
  assert.ok(rl.allow(1500));
  assert.ok(rl.allow(3000));
  assert.ok(!rl.allow(4500));
  assert.ok(rl.allow(10100));
});

import { makeGameId, normalizeGameId, makeSeatToken, turnAfter, daysLeft, timeAgo, parseResult } from '../js/protocol.js';

test('play-over-days ids are 8 unambiguous characters and seat tokens are long', () => {
  for (let i = 0; i < 100; i++) {
    const id = makeGameId();
    assert.match(id, /^[A-HJKMNP-Z2-9]{8}$/);
    assert.equal(normalizeGameId(id.toLowerCase()), id);
  }
  assert.equal(normalizeGameId('ABC123'), null);
  const t = makeSeatToken();
  assert.ok(t.length >= 24);
  assert.notEqual(t, makeSeatToken());
});

test('turns alternate from whoever started', () => {
  assert.equal(turnAfter(1, 0), 1);
  assert.equal(turnAfter(1, 3), -1);
  assert.equal(turnAfter(-1, 2), -1);
});

test('quiet games run out after 14 days', () => {
  const now = Date.parse('2026-10-20T12:00:00Z');
  assert.equal(daysLeft('2026-10-20T11:00:00Z', now), 14);
  assert.equal(daysLeft('2026-10-10T12:00:00Z', now), 4);
  assert.equal(daysLeft('2026-10-01T12:00:00Z', now), 0);
  assert.equal(timeAgo('2026-10-18T12:00:00Z', now), '2 days ago');
  assert.equal(timeAgo('2026-10-20T11:59:30Z', now), 'just now');
});

test('stored results parse back', () => {
  assert.deepEqual(parseResult('-1:resign'), { winner: -1, reason: 'resign' });
  assert.deepEqual(parseResult('0:quiet'), { winner: 0, reason: 'quiet' });
  assert.equal(parseResult('junk'), null);
});
