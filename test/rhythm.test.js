import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Db } from '../server/db.js';
import { RhythmGame } from '../server/rhythm.js';
import { Meditation } from '../server/meditation.js';
import { BELL, MATS } from '../shared/layout.js';
import { RHYTHM, noteTargetAt, rhythmPattern, rhythmGrade, rhythmSummary, roundGrade } from '../shared/rhythm.js';

function fixture(t) {
  t.mock.timers.enable({ apis: ['Date'], now: 100_000 });
  const db = new Db(':memory:');
  t.after(() => db.close());
  const events = [];
  const io = { emit: (event, data) => events.push({ event, data }) };
  const config = { timezone: 'Asia/Ho_Chi_Canh', meditationPhrases: { high: ['giỏi'], mid: ['khá'], low: ['thôi'] }, };
  config.timezone = 'Asia/Ho_Chi_Minh';
  const player = (pid, sid) => {
    db.touchPlayer({ id: pid, name: pid, color: 0, hat: 0, now: Date.now(), isVisit: true });
    return { pid, sid, name: pid, x: BELL.x, z: BELL.z + 2, lastBell: 0, mat: null, medMates: new Set() };
  };
  const engine = new RhythmGame({ db, io, config });
  const jump = (at) => t.mock.timers.tick(at - Date.now());
  // Bấm nốt idx của round, lệch `offset` ms so với lúc nốt chạm vạch.
  const tap = (p, round, idx, offset = 0, note) => {
    const pattern = rhythmPattern(p.rhythm.at, round, p.rhythm.kind);
    jump(noteTargetAt(p.rhythm.at, round, idx) + offset);
    return engine.hit(p, { id: p.rhythm.id, round, idx, note: note ?? pattern[idx] });
  };
  return { db, io, config, events, player, engine, jump, tap };
}

test('chuỗi nốt ổn định 3–4 nốt; nốt nằm trên beat; cửa sổ và combo đúng biên', () => {
  for (let round = 0; round < 24; round++) {
    const notes = rhythmPattern(100_000, round, 'bell');
    assert.deepEqual(notes, rhythmPattern(100_000, round, 'bell'));
    assert.equal(notes.length, round >= 6 ? 4 : 3);
    assert.ok(notes.every((n) => n >= 0 && n <= 3));
  }
  assert.notDeepEqual(rhythmPattern(100_000, 0, 'bell'), rhythmPattern(100_000, 0, 'meditate'));
  assert.equal(noteTargetAt(1000, 2, 3), 1000 + 2 * RHYTHM.barMs + 3 * RHYTHM.beatMs);
  assert.equal(rhythmGrade(-110, true), 'perfect');
  assert.equal(rhythmGrade(111, true), 'good');
  assert.equal(rhythmGrade(240, true), 'good');
  assert.equal(rhythmGrade(241, true), 'miss');
  assert.equal(rhythmGrade(0, false), 'miss', 'bấm sai phím là miss ngay — chống spam kiểu WWM');
  assert.deepEqual(rhythmSummary(['perfect', 'good', 'miss', 'perfect']), { points: 260, score: 65, perfect: 2, good: 1, miss: 1, combo: 1, maxCombo: 2 });
  assert.equal(rhythmSummary([]).score, 0);
  assert.equal(roundGrade(['perfect', 'perfect']), 'perfect');
  assert.equal(roundGrade(['perfect', 'good']), 'good');
  assert.equal(roundGrade(['good', 'miss']), 'miss');
});

test('server chấm từng nốt theo giờ nhận gói; bấm lại không phát thêm chuông', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  assert.equal(f.engine.start(a, { kind: 'bell' }).ok, true);
  const id = a.rhythm.id;
  const first = f.tap(a, 0, 0);
  assert.equal(first.grade, 'perfect');
  assert.equal(first.points, 100);
  const count = f.events.length;
  const again = f.engine.hit(a, { id, round: 0, idx: 0, note: 0 });
  assert.equal(again.repeat, true);
  assert.equal(f.events.length, count, 'bấm lại không phát chuông thêm');
  assert.equal(f.tap(a, 0, 1, 180).grade, 'good');
  const pattern = rhythmPattern(a.rhythm.at, 0, 'bell');
  assert.equal(f.tap(a, 0, 2, 0, (pattern[2] + 1) % 4).grade, 'miss', 'sai phím -> miss');
  assert.equal(f.tap(a, 1, 0, -500).ok, false, 'bấm sớm quá bị từ chối');
  assert.equal(f.tap(a, 1, 0, 361).ok, false, 'trễ quá cửa sổ bị từ chối');
  assert.equal(f.tap(a, 2, 1, 240).grade, 'good');
  assert.equal(f.events.filter((e) => e.event === 'bell:ring').length, 3);
});

test('cùng giờ bắt đầu, đồng nghiệp bấm cùng beat làm chuông dày hơn', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  const b = f.player('Bình', 2);
  f.engine.start(a, { kind: 'bell' });
  f.engine.start(b, { kind: 'bell' });
  assert.equal(a.rhythm.at, b.rhythm.at);
  f.tap(a, 0, 0);
  const res = f.engine.hit(b, { id: b.rhythm.id, round: 0, idx: 0, note: rhythmPattern(b.rhythm.at, 0, 'bell')[0] });
  assert.equal(res.grade, 'perfect');
  assert.ok(f.events.at(-1).data.intensity > 0);
  assert.equal(JSON.stringify(f.events).includes('playerId'), false);
});

test('ranh giới: xa gác, chưa ngồi, sai session, nốt ngoài phạm vi, round tương lai đều bị chặn', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  a.z = 36;
  assert.equal(f.engine.start(a, { kind: 'bell' }).ok, false);
  assert.equal(f.engine.start(a, { kind: 'meditate' }).ok, false);
  assert.equal(f.engine.start(a, { kind: '__proto__' }).ok, false);
  a.z = BELL.z + 2;
  f.engine.start(a, { kind: 'bell' });
  const id = a.rhythm.id;
  for (const payload of [{ round: 0, idx: 9, note: 0 }, { round: 0, idx: -1, note: 0 }, { round: 0, idx: 0, note: 9 }, { round: 0, idx: 0, note: NaN }, { round: 99, idx: 0, note: 0 }, null]) {
    assert.equal(f.engine.hit(a, { id, ...payload }).ok, false);
  }
  assert.equal(f.engine.hit(a, { id: 'wrong', round: 0, idx: 0, note: 0 }).ok, false);
  assert.equal(f.engine.finish(a, { id }).saved, false);
  a.rhythm = null;
  assert.equal(f.engine.hit(a, { id, round: 0, idx: 0, note: 0 }).ok, false);
  assert.ok(f.engine.start(a, { kind: 'bell' }).wait > 0);
});

test('nốt không bấm bị quét thành miss, điểm luôn khớp thực tế', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.engine.start(a, { kind: 'bell' });
  f.tap(a, 0, 0);
  // Nhảy qua hết round 0 và round 1 rồi bấm round 2: nốt bỏ quên phải thành miss.
  f.tap(a, 2, 0);
  const summary = f.tap(a, 2, 1);
  // round 0: perfect + 2 miss; round 1: 3 miss; round 2: 2 perfect (tính tới lúc này)
  assert.equal(summary.perfect, 3);
  assert.equal(summary.miss, 5);
  const done = (() => {
    f.jump(a.rhythm.endsAt);
    return f.engine.finish(a, { id: a.rhythm.id });
  })();
  assert.equal(done.miss, 6 * 3 + 10 * 4 - 3, 'còn lại toàn miss sau khi quét đủ (58 nốt, 3 perfect)');
  assert.equal(done.score, Math.round(300 / 58));
});

test('Nhịp sen lưu điểm server đúng một lần, hoa sen mở theo tổng nốt, bạn ngồi cùng có trong danh sách', (t) => {
  const f = fixture(t);
  const meditation = new Meditation(f);
  const a = f.player('An', 1);
  const b = f.player('Bình', 2);
  Object.assign(a, MATS[0]);
  Object.assign(b, MATS[1]);
  assert.equal(meditation.sit(a, 0).ok, true);
  assert.equal(meditation.sit(b, 1).ok, true);
  f.engine.start(a, { kind: 'meditate' });
  for (let round = 0; round < a.rhythm.rounds; round++) {
    for (let idx = 0; idx < (round >= 6 ? 4 : 3); idx++) f.tap(a, round, idx);
  }
  assert.equal(meditation.scene().seats.find((s) => s.mat === 0).bloom, 5);
  assert.ok(f.events.some((e) => e.event === 'rhythm:bloom'));
  const bloomCount = f.events.filter((e) => e.event === 'rhythm:bloom').length;
  assert.equal(bloomCount, a.rhythm.rounds, 'mỗi round phát hoa sen đúng một lần');
  f.jump(a.rhythm.endsAt);
  const done = f.engine.finish(a, { id: a.rhythm.id, score: -99 });
  assert.equal(done.score, 100);
  assert.equal(done.cultivation.points, 100);
  assert.equal(a.cultivationTier, 0);
  assert.deepEqual(done.mates, ['Bình']);
  assert.equal(f.engine.finish(a, { id: a.rhythm.id }).saved, true);
  assert.equal(f.db.cultivation(a.pid).points, 100);
  assert.deepEqual(f.events.filter((e) => e.event === 'cultivation:update'), [
    { event: 'cultivation:update', data: { sid: a.sid, tier: 0 } },
  ]);
  assert.deepEqual(f.db.db.prepare('SELECT COUNT(*) n, MAX(score) score FROM meditations WHERE player_id=?').get(a.pid), { n: 1, score: 100 });
  assert.equal(f.db.db.prepare('SELECT teu FROM players WHERE id=?').get(a.pid).teu, 4, 'score 100 -> 4 TEU');
  meditation.leave(a);
  assert.equal(f.engine.hit(a, { id: a.rhythm.id, round: 0, idx: 0, note: 0 }).ok, false);
});

test('không bấm vẫn kết thúc với Miss, lưu một lượt chuông, không phát tiếng thành công giả', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.engine.start(a, { kind: 'bell' });
  f.jump(a.rhythm.endsAt);
  const done = f.engine.finish(a, { id: a.rhythm.id });
  assert.equal(done.score, 0);
  assert.equal(done.miss, 6 * 3 + 10 * 4, '58 nốt của 16 round đều miss');
  f.engine.finish(a, { id: a.rhythm.id });
  assert.equal(f.db.db.prepare('SELECT bell_count FROM players WHERE id=?').get(a.pid).bell_count, 1);
  assert.equal(f.events.length, 0);
});

test('thiền nâng tầng theo điểm server; bỏ dở, giả điểm và ngồi im không thưởng', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  a.mat = 0;
  f.db.addMeditation(a.pid, 200, Date.now());
  f.engine.start(a, { kind: 'meditate' });
  assert.equal(f.engine.finish(a, { id: a.rhythm.id, score: 99999 }).saved, false);
  assert.equal(f.db.cultivation(a.pid).points, 200);
  for (let round = 0; round < a.rhythm.rounds; round++) {
    for (let idx = 0; idx < (round >= 6 ? 4 : 3); idx++) f.tap(a, round, idx);
  }
  f.jump(a.rhythm.endsAt);
  const done = f.engine.finish(a, { id: a.rhythm.id, score: 99999 });
  assert.equal(done.cultivation.tier, 1);
  assert.equal(done.cultivation.points, 300);
  assert.equal(a.cultivationTier, 1);
  f.engine.start(a, { kind: 'meditate' });
  f.jump(a.rhythm.endsAt);
  const idle = f.engine.finish(a, { id: a.rhythm.id, score: 99999 });
  assert.equal(idle.cultivation.points, 300);
  f.engine.start(a, { kind: 'meditate' });
  a.mat = null;
  f.jump(a.rhythm.endsAt);
  assert.equal(f.engine.finish(a, { id: a.rhythm.id }).saved, false);
  assert.equal(f.db.cultivation(a.pid).points, 300);
});
