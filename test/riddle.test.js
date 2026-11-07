import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Db } from '../server/db.js';
import { Riddle } from '../server/riddle.js';
import { RIDDLE } from '../shared/protocol.js';

const RIDDLES = [
  { q: 'Vận đơn đường biển viết tắt là gì?', a: ['B/L', 'BL'], hint: 'Hai ký tự', tier: 1 },
  { q: 'Một container 40 feet bằng mấy TEU?', a: ['2', 'hai'], hint: 'Nhẩm nha', tier: 1 },
  { q: 'Phí giữ container tại bãi quá hạn gọi là gì?', a: ['Demurrage'], hint: 'Tiếng Anh', tier: 2 },
  { q: 'Thứ gì càng lấy đi càng nhẹ?', a: ['Gánh nặng'], hint: '', tier: 3 },
];

function fixture(t) {
  t.mock.timers.enable({ apis: ['Date'], now: 100_000 });
  const db = new Db(':memory:');
  t.after(() => db.close());
  const config = { timezone: 'Asia/Ho_Chi_Minh', riddles: RIDDLES };
  const riddle = new Riddle({ db, io: { emit() {} }, config });
  const player = (pid) => {
    db.touchPlayer({ id: pid, name: pid, color: 0, hat: 0, now: Date.now(), isVisit: true });
    return { pid, name: pid, riddle: null };
  };
  const jump = (ms) => t.mock.timers.tick(ms);
  return { db, riddle, player, jump, config };
}

test('chuẩn hoá đáp án: hoa thường, dấu, ký tự lạ đều bằng nhau', (t) => {
  const { riddle } = fixture(t);
  assert.equal(riddle.normalize('B/L'), riddle.normalize('bl'));
  assert.equal(riddle.normalize('ĐẬM Container'), riddle.normalize('damcontainer'));
  assert.equal(riddle.normalize('  Gánh nặng! '), 'ganhnang');
});

test('xin câu đố trả câu hỏi + bậc, không lộ đáp án; hỏi dồn bị giới hạn', (t) => {
  const f = fixture(t);
  const a = f.player('An');
  const res = f.riddle.draw(a);
  assert.equal(res.ok, true);
  assert.ok(res.riddle.q);
  assert.ok([1, 2, 3].includes(res.riddle.tier));
  assert.equal(JSON.stringify(res).includes(JSON.stringify(RIDDLES[0].a)), false, 'không gửi kèm đáp án');
  assert.equal(f.riddle.draw(a).wait, RIDDLE.intervalMs);
  f.jump(RIDDLE.intervalMs);
  assert.equal(f.riddle.draw(a).ok, true);
});

test('trả lời đúng nhận TEU theo bậc, đếm vào Sổ an đúng một lần', (t) => {
  const f = fixture(t);
  const a = f.player('An');
  f.riddle.draw(a);
  const picked = RIDDLES[a.riddle.index];
  const res = f.riddle.answer(a, { text: picked.a[0] });
  assert.equal(res.correct, true);
  assert.equal(res.teu, RIDDLE.teuByTier[picked.tier]);
  assert.equal(f.db.playerRow(a.pid).teu, RIDDLE.teuByTier[picked.tier]);
  assert.equal(f.db.playerRow(a.pid).riddle_correct, 1);
  assert.equal(a.riddle, null, 'trả lời xong hết câu đang hỏi');
  assert.equal(f.riddle.answer(a, { text: picked.a[0] }).ok, false, 'không có câu thì không trả lời');
});

test('sai hai lần thì có gợi ý; sai tiếp vẫn đợi lượt khác', (t) => {
  const f = fixture(t);
  f.config.riddles = RIDDLES.filter((riddle) => riddle.hint);
  const a = f.player('An');
  f.riddle.draw(a);
  const first = f.riddle.answer(a, { text: 'đáp án lung tung' });
  assert.equal(first.correct, false);
  assert.equal(first.hint, undefined);
  const second = f.riddle.answer(a, { text: 'sai tiếp' });
  assert.equal(second.correct, false);
  assert.ok(second.hint, 'sai lần 2 có gợi ý');
});

test('hết lượt trong ngày thì dừng', (t) => {
  const f = fixture(t);
  const a = f.player('An');
  for (let i = 0; i < RIDDLE.attemptsPerDay; i++) {
    assert.equal(f.riddle.draw(a).ok, true, `lượt ${i + 1}`);
    f.jump(RIDDLE.intervalMs);
  }
  assert.ok(f.riddle.draw(a).error.includes('hết lượt'));
  assert.equal(f.db.riddleAttemptsToday(a.pid, '1970-01-02'), 0, 'ngày khác thì chưa tốn lượt');
});
