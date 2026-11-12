import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Db } from '../server/db.js';
import { RhythmGame } from '../server/rhythm.js';
import { BELL } from '../shared/layout.js';
import { RHYTHM, rhythmGrade, rhythmPattern, rhythmSummary, roundTargetAt } from '../shared/rhythm.js';

function fixture(t) {
  t.mock.timers.enable({ apis: ['Date'], now: 100_000 });
  const db = new Db(':memory:');
  t.after(() => db.close());
  const events = [];
  const io = { emit: (event, data) => events.push({ event, data }) };
  const config = { timezone: 'Asia/Ho_Chi_Minh' };
  const player = (pid, sid) => {
    db.touchPlayer({ id: pid, name: pid, color: 0, hat: 0, now: Date.now(), isVisit: true });
    return { pid, sid, name: pid, x: BELL.x, z: BELL.z + 2, lastBell: 0, mat: null };
  };
  const engine = new RhythmGame({ db, io, config });
  const jump = (at) => t.mock.timers.tick(at - Date.now());
  const commit = (p, round, offset = 0, sequence = rhythmPattern(p.rhythm.at, round, 'bell')) => {
    jump(roundTargetAt(p.rhythm.at, round) + offset);
    return engine.hit(p, { id: p.rhythm.id, round, sequence });
  };
  return { db, events, player, engine, jump, commit };
}

test('Audition tạo chuỗi ổn định và chấm đúng biên', () => {
  for (let round = 0; round < 16; round++) {
    const sequence = rhythmPattern(100_000, round, 'bell');
    assert.deepEqual(sequence, rhythmPattern(100_000, round, 'bell'));
    assert.equal(sequence.length, round >= 6 ? 4 : 3);
  }
  assert.equal(roundTargetAt(1000, 2), 1000 + 2 * RHYTHM.barMs + RHYTHM.barMs - RHYTHM.beatMs);
  assert.equal(rhythmGrade(-110, true), 'perfect');
  assert.equal(rhythmGrade(111, true), 'good');
  assert.equal(rhythmGrade(0, false), 'miss');
  assert.deepEqual(rhythmSummary(['perfect', 'good', 'miss', 'perfect']), { points: 260, score: 65, perfect: 2, good: 1, miss: 1, combo: 1, maxCombo: 2 });
});

test('server chấm cả chuỗi và Space; bấm lại không phát thêm chuông', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  assert.equal(f.engine.start(a, { kind: 'bell' }).ok, true);
  const first = f.commit(a, 0);
  assert.equal(first.grade, 'perfect');
  const count = f.events.length;
  assert.equal(f.engine.hit(a, { id: a.rhythm.id, round: 0, sequence: rhythmPattern(a.rhythm.at, 0, 'bell') }).repeat, true);
  assert.equal(f.events.length, count);
  const wrong = rhythmPattern(a.rhythm.at, 1, 'bell').with(0, 3);
  assert.equal(f.commit(a, 1, 0, wrong).grade, 'miss');
  assert.equal(f.commit(a, 2, 180).grade, 'good');
});

test('cùng phách làm chuông dày hơn; payload không lộ playerId', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  const b = f.player('Bình', 2);
  f.engine.start(a, { kind: 'bell' }); f.engine.start(b, { kind: 'bell' });
  f.commit(a, 0);
  const res = f.engine.hit(b, { id: b.rhythm.id, round: 0, sequence: rhythmPattern(b.rhythm.at, 0, 'bell') });
  assert.equal(res.grade, 'perfect');
  assert.ok(f.events.at(-1).data.intensity > 0);
  assert.equal(JSON.stringify(f.events).includes('playerId'), false);
});

test('từ chối xa gác, thiền, session sai, chuỗi giả và thời điểm sai', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  a.z = 36;
  assert.equal(f.engine.start(a, { kind: 'bell' }).ok, false);
  assert.equal(f.engine.start(a, { kind: 'meditate' }).ok, false);
  a.z = BELL.z + 2;
  f.engine.start(a, { kind: 'bell' });
  const id = a.rhythm.id;
  assert.equal(f.engine.hit(a, { id: 'wrong', round: 0, sequence: [0, 1, 2] }).ok, false);
  assert.equal(f.engine.hit(a, { id, round: 99, sequence: [0] }).ok, false);
  assert.equal(f.engine.hit(a, { id, round: 0, sequence: [9] }).ok, false);
  assert.equal(f.engine.hit(a, { id, round: 0, sequence: rhythmPattern(a.rhythm.at, 0, 'bell') }).ok, false, 'chốt quá sớm');
});

test('không chốt thành Miss; kết quả chỉ lưu một lần', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.engine.start(a, { kind: 'bell' });
  f.jump(a.rhythm.endsAt);
  const done = f.engine.finish(a, { id: a.rhythm.id });
  assert.equal(done.score, 0);
  assert.equal(done.miss, 16);
  f.engine.finish(a, { id: a.rhythm.id });
  assert.equal(f.db.db.prepare('SELECT bell_count FROM players WHERE id=?').get(a.pid).bell_count, 1);
  assert.equal(f.events.length, 0);
});
