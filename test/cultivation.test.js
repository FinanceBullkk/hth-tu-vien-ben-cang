import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Db } from '../server/db.js';
import { Meditation } from '../server/meditation.js';
import { Room } from '../server/rooms.js';
import { MATS } from '../shared/layout.js';
import { cultivation, CULTIVATION_TIERS, QI_INTERVAL_MS } from '../shared/cultivation.js';

function fixture(t) {
  t.mock.timers.enable({ apis: ['Date'], now: 100_000 });
  const db = new Db(':memory:');
  t.after(() => db.close());
  db.touchPlayer({ id: 'test', name: 'Thiền', color: 0, hat: 0, now: Date.now(), isVisit: true });
  const events = [];
  const meditation = new Meditation({ db, io: { emit: (e, data) => events.push({ e, data }) }, config: {} });
  const p = { pid: 'test', sid: 1, name: 'Thiền', ...MATS[0], mat: null, activity: 0, lastSit: 0, socket: { emit() {} } };
  return { db, meditation, p, events };
}

test('five tier boundaries and bounded, monotonic aura scale', () => {
  for (const [i, tier] of CULTIVATION_TIERS.entries()) {
    assert.equal(cultivation(tier.qi).level, i + 1);
    if (i) assert.equal(cultivation(tier.qi - 1).level, i);
    assert.equal(cultivation(tier.qi).progress, i === 4 ? 1 : 0);
  }
  assert.equal(cultivation(-10).qi, 0);
  assert.equal(cultivation(NaN).qi, 0);
  assert.equal(cultivation(Infinity).qi, 0);
  assert.ok(cultivation(1e9).scale <= 1.65);
  assert.ok(cultivation(100).scale < cultivation(101).scale);
  assert.equal(cultivation(750).next, null);
});

test('only server time awards qi, repeated sweep/leave cannot double credit', (t) => {
  const { db, meditation, p, events } = fixture(t);
  assert.equal(meditation.sit(p, 0).qi, 0);
  t.mock.timers.tick(QI_INTERVAL_MS - 1);
  meditation.sweep();
  assert.equal(db.book(p.pid).qi, 0);
  t.mock.timers.tick(1);
  meditation.sweep();
  assert.equal(db.book(p.pid).qi, 1);
  meditation.sweep();
  meditation.leave(p);
  meditation.leave(p);
  assert.equal(db.book(p.pid).qi, 1);
  assert.deepEqual(events.find((e) => e.e === 'cultivation:progress').data, { sid: 1, qi: 1 });
  t.mock.timers.tick(60_000);
  meditation.sweep();
  assert.equal(db.book(p.pid).qi, 1);
});

test('partial time survives standing up and no offline time is added', (t) => {
  const { db, meditation, p } = fixture(t);
  meditation.sit(p, 0);
  t.mock.timers.tick(3500);
  meditation.leave(p);
  assert.equal(db.playerRow(p.pid).cultivation_ms, 3500);
  t.mock.timers.tick(86_400_000);
  meditation.sit(p, 0);
  t.mock.timers.tick(2500);
  meditation.leave(p);
  assert.equal(db.book(p.pid).qi, 1);
  assert.equal(db.playerRow(p.pid).cultivation_ms, 6000);
});

test('suspended server and backward wall clock cannot manufacture qi', (t) => {
  const { db, meditation, p } = fixture(t);
  meditation.sit(p, 0);
  t.mock.timers.tick(3_600_000);
  meditation.sweep();
  assert.equal(db.book(p.pid).qi, 0);
  const at = Date.now();
  t.mock.timers.setTime(at - 10_000);
  meditation.sweep();
  t.mock.timers.setTime(at + 6000);
  meditation.sweep();
  assert.equal(db.book(p.pid).qi, 1);
});

test('failed database write keeps pending credit for exactly one retry', (t) => {
  const { db, meditation, p } = fixture(t);
  meditation.sit(p, 0);
  t.mock.timers.tick(6000);
  const write = db.addCultivation.bind(db);
  db.addCultivation = () => { throw Error('disk unavailable'); };
  assert.throws(() => meditation.sweep(), /disk unavailable/);
  assert.equal(p.qiPendingMs, 6000);
  db.addCultivation = write;
  meditation.sweep();
  meditation.sweep();
  assert.equal(db.book(p.pid).qi, 1);
});

test('invalid seats, distant players and conflicting activities are rejected', (t) => {
  const { db, meditation, p } = fixture(t);
  for (const mat of [null, '0', false, {}, -1, 0.1, 999]) assert.equal(meditation.sit(p, mat).ok, false);
  p.x = 999;
  assert.equal(meditation.sit(p, 0).ok, false);
  p.x = MATS[0].x;
  const room = new Room({ db, meditation, config: { timezone: 'Asia/Ho_Chi_Minh' }, io: { to: () => ({ emit() {} }) } });
  p.activity = 5;
  assert.equal(room.onActionStart(p, { kind: 'meditate', mat: 0 }).ok, false);
  p.activity = 0;
  assert.equal(room.onActionStart(p, { kind: 'meditate', mat: 0, qi: 1e9, startAt: 0 }).ok, true);
  assert.equal(p.qi, 0);
  assert.equal(room.onActionStart(p, { kind: 'fish' }).ok, false);
  assert.equal(meditation.sit({ ...p, pid: 'other' }, 0).ok, false);
});

test('migration keeps existing player data; qi survives database restart', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-cultivation-'));
  const file = path.join(dir, 'test.db');
  let db;
  try {
    db = new Db(file);
    db.touchPlayer({ id: 'saved', name: 'Saved', color: 1, hat: 2, now: 100, isVisit: true });
    db.db.exec('ALTER TABLE players DROP COLUMN cultivation_ms');
    db.close();
    db = new Db(file);
    assert.equal(db.playerRow('saved').name, 'Saved');
    assert.equal(db.playerRow('saved').visits, 1);
    assert.equal(db.book('saved').qi, 0);
    db.addCultivation('saved', 9000);
    assert.throws(() => db.addCultivation('saved', -1), RangeError);
    db.close();
    db = new Db(file);
    assert.equal(db.book('saved').qi, 1);
    assert.equal(db.playerRow('saved').cultivation_ms, 9000);
  } finally {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
