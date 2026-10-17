import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecap } from '../js/recap.js';

const who = (k) => ({ tortoise: { name: 'Nana Kwaku', kind: 'tortoise' }, trader: { name: 'Auntie Ama', kind: 'trader', quip: 'Market is closed!' }, hornbill: { name: 'Afia', kind: 'hornbill', quip: 'I saw that from the treetops.' } })[k];
const e = (ply, side, char, captures = 0, maxAvail = captures, extra = {}) => ({ ply, side, char, captures, maxAvail, promote: false, victims: Array.from({ length: captures }, () => ({ char: 'x', king: false })), ...extra });

test('recap names the best capture, a missed jump, the other chain and signs off', () => {
  const entries = [
    e(0, 1, 'tortoise'), e(1, -1, 'trader'),
    e(6, 1, 'hornbill', 3, 3),
    e(9, -1, 'trader', 2, 2),
    e(12, 1, 'tortoise', 1, 2),
    e(20, 1, 'hornbill', 0, 0, { promote: true }),
  ];
  const lines = buildRecap({ entries, localSide: 1, winner: 1, who });
  assert.ok(lines.length >= 3 && lines.length <= 4);
  assert.match(lines[0].text, /^Afia: “Three at once on move 7/);
  assert.match(lines[1].text, /Nana Kwaku: “Hwɛ yie! On move 13 you took one when two were there/);
  assert.match(lines[2].text, /Auntie Ama: “Don’t forget my two-piece chain on move 10/);
  assert.match(lines[lines.length - 1].text, /treetops/);
});

test('a quiet game still gets a short, friendly recap', () => {
  const lines = buildRecap({ entries: [e(0, 1, 'tortoise'), e(1, -1, 'trader')], localSide: 1, winner: 0, who });
  assert.equal(lines.length, 1);
  assert.match(lines[0].text, /draw/);
});

test('pass-and-play speaks to the players by number', () => {
  const lines = buildRecap({ entries: [e(4, -1, 'trader', 1, 2)], localSide: 1, winner: -1, who, twoHumans: true });
  assert.ok(lines.some((l) => /Player 2 took one when two were there/.test(l.text)));
});
