import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Db } from '../server/db.js';
import { MelodyGame } from '../server/melody.js';
import { Room } from '../server/rooms.js';
import { MELODY_ZONE, clampToWalkable } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';
import { MELODY, MELODY_NOTES, melodyCandidate, melodyGrade, melodySummary } from '../shared/melody.js';
import { MelodyPerformance } from '../client/src/activities/melody-performance.js';

function fixture(t) {
  t.mock.timers.enable({ apis: ['Date'], now: 100000 });
  const db = new Db(':memory:');
  t.after(() => db.close());
  const engine = new MelodyGame({ db, config: { timezone: 'Asia/Ho_Chi_Minh' } });
  const player = (pid = 'An') => {
    db.touchPlayer({ id: pid, name: pid, color: 0, hat: 0, now: Date.now(), isVisit: true });
    return { pid, sid: 1, x: MELODY_ZONE.x, z: MELODY_ZONE.z, activity: ACTIVITY.none };
  };
  const jump = (at) => t.mock.timers.tick(at - Date.now());
  const tap = (p, index, offset = 0, lane = MELODY_NOTES[index].lane) => {
    jump(p.melody.at + MELODY_NOTES[index].at + offset);
    return engine.hit(p, { id: p.melody.id, index, lane });
  };
  return { db, engine, player, jump, tap };
}

test('melody chart: ordered six-lane notes, playable seat, timing boundaries', () => {
  assert.equal(MELODY_NOTES.length, 98);
  assert.equal(MELODY_NOTES.filter((n) => n.duration).length, 24);
  assert.equal(new Set(MELODY_NOTES.map((n) => n.lane)).size, 6);
  MELODY_NOTES.forEach((n, i) => {
    assert.ok(Number.isInteger(n.at) && n.at >= MELODY.approachMs && n.at + MELODY.lateMs < MELODY.durationMs);
    assert.ok(Number.isInteger(n.lane) && n.lane >= 0 && n.lane < 6);
    assert.ok(n.duration >= 0 && n.at + n.duration + MELODY.lateMs < MELODY.durationMs);
    const next = MELODY_NOTES.slice(i + 1).find((other) => other.lane === n.lane);
    if (next) assert.ok(n.at + n.duration < next.at, 'same-lane holds must not overlap');
    if (i) assert.ok(n.at >= MELODY_NOTES[i - 1].at);
  });
  assert.deepEqual(clampToWalkable(MELODY_ZONE.x, MELODY_ZONE.z), [MELODY_ZONE.x, MELODY_ZONE.z]);
  assert.equal(melodyGrade(-110, true), 'perfect');
  assert.equal(melodyGrade(111, true), 'great');
  assert.equal(melodyGrade(175, true), 'great');
  assert.equal(melodyGrade(176, true), 'good');
  assert.equal(melodyGrade(240, true), 'good');
  assert.equal(melodyGrade(241, true), 'miss');
  assert.equal(melodyGrade(0, false), 'miss');
  const results = Array(MELODY_NOTES.length).fill(null);
  assert.equal(melodyCandidate(0, 0, results), -1);
  assert.equal(melodyCandidate(MELODY_NOTES[0].at, 5, results), -1);
  results[0] = 'perfect';
  assert.equal(melodyCandidate(MELODY_NOTES[0].at, 0, results), -1);
});

test('melody: proximity, busy activity and exclusive seat; cancellation frees seat', (t) => {
  const f = fixture(t), a = f.player(), b = f.player('Binh');
  a.x = 0;
  assert.equal(f.engine.start(a).ok, false);
  a.x = MELODY_ZONE.x;
  a.activity = ACTIVITY.fish;
  assert.equal(f.engine.start(a).ok, false);
  a.activity = ACTIVITY.none;
  a.mat = 0;
  assert.equal(f.engine.start(a).ok, false);
  a.mat = null;
  const start = f.engine.start(a);
  assert.equal(start.ok, true);
  assert.equal(a.activity, ACTIVITY.melody);
  assert.equal(f.engine.start(a).ok, false);
  assert.equal(f.engine.start(b).ok, false);
  f.engine.leave(b);
  assert.equal(f.engine.start(b).ok, false, 'another player cannot free occupied seat');
  f.engine.leave(a);
  assert.equal(f.engine.hit(a, { id: start.game.id, index: 0, lane: 0 }).ok, false);
  assert.equal(f.engine.start(b).ok, true);
  assert.equal(f.db.playerRow(a.pid).teu, 0);
});

test('melody: server time, wrong keys, forged fields and duplicate hits', (t) => {
  const f = fixture(t), a = f.player();
  f.engine.start(a);
  const id = a.melody.id;
  for (const data of [null, {}, { id: 'wrong', index: 0, lane: 0 },
    { id, index: -1, lane: 0 }, { id, index: 999, lane: 0 },
    { id, index: 0, lane: '0' }, { id, index: 0.5, lane: 0 }, { id, index: 0, lane: 6 }]) {
    assert.equal(f.engine.hit(a, data).ok, false);
  }
  assert.equal(f.engine.finish(a, { id }).ok, false);
  assert.equal(f.engine.hit(a, { id, index: 0, lane: 0, t: a.melody.at + MELODY_NOTES[0].at, score: 100 }).ok, false);
  assert.equal(f.tap(a, 0).grade, 'perfect');
  const again = f.engine.hit(a, { id, index: 0, lane: 0 });
  assert.equal(again.repeat, true);
  assert.equal(again.grade, 'perfect');
  assert.equal(f.tap(a, 1, 150).grade, 'great');
  assert.equal(f.tap(a, 2, 0, (MELODY_NOTES[2].lane + 1) % 6).ok, false);
  assert.equal(a.melody.results[2], null);
  assert.equal(f.tap(a, 2).grade, 'perfect');
  assert.equal(f.tap(a, 3, 361).ok, false);
});

test('melody: full performance awards once, server ignores submitted score', (t) => {
  const f = fixture(t), a = f.player();
  f.engine.start(a);
  const id = a.melody.id;
  const events = MELODY_NOTES.flatMap((note, index) => [
    { at: note.at, index, phase: 'down', lane: note.lane },
    ...(note.duration ? [{ at: note.at + note.duration, index, phase: 'up', lane: note.lane }] : []),
  ]).sort((x, y) => x.at - y.at);
  for (const event of events) {
    f.jump(a.melody.at + event.at);
    assert.equal(f.engine.hit(a, { ...event, at: Date.now(), id }).grade, 'perfect');
  }
  f.jump(a.melody.endsAt);
  const result = f.engine.finish(a, { id, score: 0, teu: 999 });
  assert.equal(result.score, 100);
  assert.equal(result.maxCombo, MELODY_NOTES.length);
  assert.equal(result.teu, 4);
  assert.deepEqual(f.engine.finish(a, { id }), result);
  assert.equal(f.db.playerRow(a.pid).teu, 4);
  assert.equal(f.engine.hit(a, { id, index: 0, lane: 0 }).ok, false);
});

test('melody: missed notes reset combo, idle finish grants nothing, expired seat released', (t) => {
  const f = fixture(t), a = f.player();
  f.engine.start(a);
  const id = a.melody.id;
  f.jump(a.melody.endsAt);
  const result = f.engine.finish(a, { id, score: 100 });
  assert.equal(result.miss, MELODY_NOTES.length);
  assert.equal(result.teu, 0);
  let expired = false;
  a.socket = { emit: (event) => { expired = event === 'melody:expired'; } };
  f.jump(a.melody.endsAt + 30001);
  f.engine.sweep();
  assert.equal(expired, true);
  assert.equal(a.melody, null);
  assert.equal(a.activity, ACTIVITY.none);
  assert.equal(f.engine.finish(a, { id }).ok, false);
});

test('melody: Room stop and disconnect free session; movement cannot leave seat', (t) => {
  const f = fixture(t), a = f.player();
  f.engine.start(a);
  const noop = { leave() {}, cancel() {} };
  const room = { melody: f.engine, meditation: noop, fishing: noop, riddle: noop, pitch: noop,
    voice: noop, onActionStop: Room.prototype.onActionStop, removePlayer() {} };
  const socket = { data: { player: a } };
  a.socket = socket;
  Object.assign(a, { moveWindow: Date.now(), moveCount: 0 });
  Room.prototype.onMove.call(room, a, [0, 36, 0, 1]);
  assert.equal(a.x, MELODY_ZONE.seat.x);
  Room.prototype.onDisconnect.call(room, socket);
  clearTimeout(a.ghostTimer);
  assert.equal(a.melody, null);
  assert.equal(f.engine.owner, null);
  assert.equal(a.activity, ACTIVITY.none);
});

test('melody: hold release, duplicate start, overlapping lanes and bounded input time', (t) => {
  const f = fixture(t), a = f.player();
  f.engine.start(a);
  const index = MELODY_NOTES.findIndex((note) => note.duration), note = MELODY_NOTES[index];
  const id = a.melody.id, at = a.melody.at + note.at;
  f.jump(at + 120);
  const data = { id, index, lane: note.lane, at };
  assert.equal(f.engine.hit(a, { ...data, at: at - 10000 }).ok, false);
  assert.equal(f.engine.hit(a, { ...data, at: Date.now() + 21 }).ok, false);
  assert.equal(f.engine.hit(a, { ...data, at: 'bad' }).ok, false);
  assert.equal(f.engine.hit(a, { ...data, phase: 'up' }).ok, false);
  assert.equal(f.engine.hit(a, data).holding, true);
  assert.equal(f.engine.hit(a, data).repeat, true);
  assert.equal(a.melody.results[index], null);
  f.jump(at + note.duration - MELODY.releaseMs - 1);
  assert.equal(f.engine.hit(a, { ...data, at: Date.now(), phase: 'up' }).grade, 'miss');
  assert.equal(f.engine.hit(a, { ...data, at: Date.now() }).grade, 'miss');

  const next = MELODY_NOTES.findIndex((n, i) => i > index && n.duration);
  const end = a.melody.at + MELODY_NOTES[next].at + MELODY_NOTES[next].duration;
  assert.equal(f.tap(a, next).holding, true);
  f.jump(end - MELODY.releaseMs);
  assert.equal(f.engine.hit(a, { id, index: next, lane: MELODY_NOTES[next].lane, phase: 'up' }).grade, 'perfect');
  assert.equal(melodySummary(['perfect', 'great', null, 'miss', 'good']).points, 240);
});

test('melody: held note auto-completes but delayed early release still breaks it', (t) => {
  const f = fixture(t), a = f.player(); f.engine.start(a);
  const index = MELODY_NOTES.findIndex((n) => n.duration), note = MELODY_NOTES[index];
  const end = a.melody.at + note.at + note.duration;
  f.tap(a, index);
  f.jump(end + 20);
  f.engine.sweepNotes(a.melody, Date.now());
  assert.equal(a.melody.results[index], null, 'wait for in-flight release');
  assert.equal(f.engine.hit(a, { id: a.melody.id, index, lane: note.lane, phase: 'up', at: end - 100 }).grade, 'miss');
  const next = MELODY_NOTES.findIndex((n, i) => i > index && n.duration);
  f.tap(a, next);
  f.jump(a.melody.at + MELODY_NOTES[next].at + MELODY_NOTES[next].duration + MELODY.maxLagMs + 1);
  f.engine.sweepNotes(a.melody, Date.now());
  assert.equal(a.melody.results[next], 'perfect');
});

test('melody client: immediate feedback, mixed inputs, early release and out-of-order acknowledgements', async () => {
  const index = MELODY_NOTES.findIndex((n) => n.duration), note = MELODY_NOTES[index];
  let elapsed = note.at, cues = 0;
  const requests = [], grades = [];
  const panel = { flash() {}, feedback(g) { grades.push(g); }, sfxVolume: () => 0.2, draw() {}, stats() {} };
  const app = { net: { call(event, data) { return new Promise((resolve) => requests.push({ event, data, resolve })); } },
    hud: { toast() {} }, activities: { exit() {} } };
  const audio = { elapsed: () => elapsed, cue() { cues++; } };
  const performance = new MelodyPerformance(app, { id: 'test', at: 100000 }, panel, audio);
  performance.input(note.lane, true);
  assert.equal(grades.at(-1), 'perfect', 'no network wait for visual feedback');
  assert.equal(cues, 1);
  performance.input(note.lane, true);
  performance.input(note.lane, true, 'pointer');
  performance.input(note.lane, false);
  assert.equal(requests.length, 1, 'repeats and mixed sources cannot retrigger or release a hold');
  elapsed += 200;
  performance.input(note.lane, false, 'pointer');
  assert.equal(requests.length, 2);
  assert.equal(performance.results[index], 'miss');
  requests[1].resolve({ ok: true, grade: 'miss' }); await Promise.resolve();
  requests[0].resolve({ ok: true, holding: true, grade: 'perfect' }); await Promise.resolve();
  assert.equal(performance.results[index], 'miss', 'old down response must not resurrect released hold');
  assert.equal(performance.holds.size, 0);
  performance.stop();
  performance.input(note.lane, true);
  assert.equal(requests.length, 2);
});
