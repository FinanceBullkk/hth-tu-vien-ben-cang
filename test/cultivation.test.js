import { cultivationProgress } from '../shared/cultivation.js';
import { createCultivation, cultivationPoint } from '../client/src/player/avatar-cultivation.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Db } from '../server/db.js';
import { Meditation } from '../server/meditation.js';
import { Room } from '../server/rooms.js';
import { Fishing } from '../server/fishing.js';
import { PitchGame } from '../server/pitch.js';
import { RhythmGame } from '../server/rhythm.js';
import { BELL, MATS, SPAWN } from '../shared/layout.js';
import { cultivation, QI_TIERS as CULTIVATION_TIERS, QI_GAIN_RATE, QI_INTERVAL_MS } from '../shared/cultivation.js';

test('cultivation thresholds, invalid inputs and maximum tier', () => {
  for (const [points, tier] of [[0, 0], [299, 0], [300, 1], [999, 1], [1000, 2], [2499, 2], [2500, 3], [99999, 3]]) {
    assert.equal(cultivationProgress(points).tier, tier);
  }
  for (const value of [-100, NaN, Infinity, '300', null]) assert.equal(cultivationProgress(value).points, 0);
  assert.equal(cultivationProgress(2500).next, null);
});

test('saved meditation scores survive reopening and remain private to each player', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-cultivation-'));
  const file = path.join(dir, 'test.db');
  let db = new Db(file);
  t.after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  for (const id of ['one', 'two']) db.touchPlayer({ id, name: id, color: 0, hat: 0, now: 1, isVisit: true });
  for (let i = 0; i < 3; i++) db.addMeditation('one', 100, i);
  db.addMeditation('one', 0, 4);
  assert.equal(db.cultivation('one').tier, 1);
  assert.equal(db.book('one').cultivation.points, 300);
  assert.equal(db.cultivation('two').points, 0);
  db.touchPlayer({ id: 'one', name: 'one', color: 0, hat: 0, effect: 8, now: 10, isVisit: true });
  assert.equal(db.cultivation('one').points, 300);
  db.close();
  db = new Db(file);
  assert.equal(db.cultivation('one').tier, 1);
});

test('eight aura paths differ, remain bounded and release GPU resources', () => {
  const signatures = new Set();
  for (let effect = 1; effect <= 8; effect++) {
    signatures.add(JSON.stringify(cultivationPoint(effect, 0.37, 2, 5)));
    for (const lowQuality of [false, true]) {
      for (let tier = 0; tier <= 3; tier++) {
        const fx = createCultivation(effect, tier, lowQuality);
        const geometry = fx.points.geometry;
        assert.equal(geometry.attributes.position.count, tier * (lowQuality ? 48 : 96));
        for (const time of [0, 1, 1000]) {
          fx.update(time, true, 0.5);
          assert.ok([...geometry.attributes.position.array].every((v) => Number.isFinite(v) && Math.abs(v) < 3));
        }
        let disposed = 0;
        geometry.addEventListener('dispose', () => disposed++);
        fx.points.material.addEventListener('dispose', () => disposed++);
        fx.dispose();
        assert.equal(disposed, 2);
      }
    }
  }
  assert.equal(signatures.size, 8);
  const none = createCultivation(0, 3);
  assert.equal(none.points.visible, false);
  assert.equal(none.points.geometry.attributes.position.count, 0);
  none.dispose();
});

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
  t.mock.timers.tick(QI_INTERVAL_MS / QI_GAIN_RATE - 1);
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
  assert.equal(db.playerRow(p.pid).cultivation_ms, 3500 * QI_GAIN_RATE);
  t.mock.timers.tick(86_400_000);
  meditation.sit(p, 0);
  t.mock.timers.tick(2500);
  meditation.leave(p);
  assert.equal(db.book(p.pid).qi, 15);
  assert.equal(db.playerRow(p.pid).cultivation_ms, 6000 * QI_GAIN_RATE);
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
  t.mock.timers.setTime(at + QI_INTERVAL_MS / QI_GAIN_RATE);
  meditation.sweep();
  assert.equal(db.book(p.pid).qi, 1);
});

test('failed database write keeps pending credit for exactly one retry', (t) => {
  const { db, meditation, p } = fixture(t);
  meditation.sit(p, 0);
  t.mock.timers.tick(QI_INTERVAL_MS / QI_GAIN_RATE);
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

test('free meditation keeps server position, locks movement and accrues without occupying a mat', (t) => {
  const { db, meditation, p } = fixture(t);
  Object.assign(p, { x: SPAWN.x, z: SPAWN.z, rot: 0.7, moveWindow: 0, moveCount: 0 });
  const room = new Room({ db, meditation, filter: { isBad: () => false }, config: {}, io: { to: () => ({ emit() {} }) } });
  const seated = room.onActionStart(p, { kind: 'meditate', x: 999, z: 999, qi: 999 });
  assert.equal(seated.ok, true);
  assert.deepEqual([seated.x, seated.z, seated.rot], [SPAWN.x, SPAWN.z, 0.7]);
  assert.equal(p.mat, null);
  assert.equal(meditation.occupancy().every((sid) => sid === 0), true);
  assert.deepEqual(meditation.scene().seats, []);
  room.onMove(p, [BELL.x, BELL.z, 2, 1]);
  assert.deepEqual([p.x, p.z, p.rot], [SPAWN.x, SPAWN.z, 0.7]);
  assert.equal(room.onChat(p, { text: 'hello' }).ok, true);
  assert.equal(room.onActionStart(p, { kind: 'fish' }).ok, false);
  t.mock.timers.tick(6000);
  assert.equal(room.onActionStart(p, { kind: 'meditate' }).ok, false);
  meditation.sweep();
  assert.equal(db.book(p.pid).qi, 15);
  t.mock.timers.tick(500);
  room.players.set(p.sid, p);
  room.stop();
  assert.equal(db.playerRow(p.pid).cultivation_ms, 6500 * QI_GAIN_RATE);
  assert.equal(meditation.members().length, 0);
  t.mock.timers.tick(6000);
  meditation.sweep();
  assert.equal(db.playerRow(p.pid).cultivation_ms, 6500 * QI_GAIN_RATE);
});

test('free meditation blocks fishing, pitch and rhythm; moving between free and mat seats keeps partial qi', (t) => {
  const { db, meditation, p } = fixture(t);
  const room = new Room({ db, meditation, config: {}, io: { to: () => ({ emit() {} }) } });
  assert.equal(room.onActionStart(p, { kind: 'meditate' }).ok, true);
  assert.equal(new Fishing({}).cast(p, {}).ok, false);
  assert.equal(new PitchGame({}).start(p, {}).ok, false);
  const rhythm = new RhythmGame({});
  assert.equal(rhythm.start(p, { kind: 'meditate' }).ok, false);
  Object.assign(p, { x: BELL.x, z: BELL.z });
  assert.equal(rhythm.start(p, { kind: 'bell' }).ok, false);
  t.mock.timers.tick(3500);
  meditation.leave(p);
  Object.assign(p, MATS[0]);
  assert.equal(meditation.sit(p, 0).ok, true);
  t.mock.timers.tick(2500);
  meditation.leave(p);
  assert.equal(db.book(p.pid).qi, 15);
  assert.equal(meditation.occupancy()[0], 0);
  assert.equal(meditation.members().length, 0);
});

test('new meditation reaches tier five at five minutes; saved qi is not repriced', (t) => {
  const { db, meditation, p } = fixture(t);
  meditation.sit(p);
  for (let elapsed = 500; elapsed < 300_000; elapsed += 500) {
    t.mock.timers.tick(500);
    meditation.sweep();
  }
  assert.equal(cultivation(p.qi).level, 4);
  t.mock.timers.tick(500);
  meditation.sweep();
  assert.equal(p.qi, 750);
  assert.equal(cultivation(p.qi).level, 5);
  meditation.leave(p);
  db.touchPlayer({ id: 'old', name: 'Old', color: 0, hat: 0, now: Date.now(), isVisit: true });
  db.addCultivation('old', 9000);
  p.pid = 'old';
  assert.equal(meditation.sit(p).qi, 1);
  t.mock.timers.tick(400);
  meditation.leave(p);
  assert.equal(db.playerRow('old').cultivation_ms, 15000);
  assert.equal(db.book('old').qi, 2);
});
