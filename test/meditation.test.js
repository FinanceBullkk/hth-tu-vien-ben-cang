// Ngồi thiền tặng TEU: đủ mỗi phút ngồi liên tục được 1 TEU, có trần mỗi ngày, server treo không tính giờ.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Db } from '../server/db.js';
import { Meditation } from '../server/meditation.js';
import { localDate } from '../server/time.js';
import { TEU } from '../shared/protocol.js';

const PID = 'b'.repeat(32);
const TZ = 'Asia/Ho_Chi_Minh';

function setup() {
  const db = new Db(':memory:');
  db.touchPlayer({ id: PID, name: 'Thiền sinh', color: 0, hat: 7, now: Date.now(), isVisit: true });
  const meditation = new Meditation({ db, io: { emit() {} }, config: { timezone: TZ } });
  const events = [];
  const player = { pid: PID, sid: 7, name: 'Thiền sinh', x: 0, z: 0, socket: { emit: (name, data) => events.push([name, data]) } };
  return { db, meditation, player, events };
}

/** Ngồi liên tục `ms` mili giây, sweep mỗi 500ms như server thật. */
function sitFor(meditation, player, ms) {
  let now = player.qiAt;
  const end = now + ms;
  while (now < end) {
    now = Math.min(end, now + 500);
    meditation.accrue(player, now);
  }
  return now;
}

const teuEvents = (events) => events.filter(([name]) => name === 'meditation:teu').map(([, data]) => data);

test('thiền: đủ một phút được 1 TEU, chưa đủ phút thì chưa được', () => {
  const { db, meditation, player, events } = setup();
  const seated = meditation.sit(player);
  assert.equal(seated.ok, true);
  assert.equal(seated.teuToday, 0);
  assert.equal(seated.teuCap, TEU.meditateDailyCap);
  sitFor(meditation, player, TEU.meditateEveryMs - 1000);
  assert.equal(db.shop.teu(PID), 0);
  sitFor(meditation, player, 1000);
  assert.equal(db.shop.teu(PID), 1);
  assert.deepEqual(teuEvents(events), [{ teu: 1, today: 1, cap: TEU.meditateDailyCap }]);
});

test('thiền: đứng dậy thì mất phần lẻ phút, ngồi lại tính từ đầu', () => {
  const { db, meditation, player } = setup();
  meditation.sit(player);
  sitFor(meditation, player, TEU.meditateEveryMs * 0.9);
  meditation.leave(player);
  meditation.sit(player);
  sitFor(meditation, player, TEU.meditateEveryMs * 0.9);
  assert.equal(db.shop.teu(PID), 0);
});

test('thiền: server treo quá 15 giây không tính là thời gian ngồi', () => {
  const { db, meditation, player } = setup();
  meditation.sit(player);
  meditation.accrue(player, player.qiAt + TEU.meditateEveryMs * 5);
  assert.equal(db.shop.teu(PID), 0);
});

test('thiền: không vượt trần mỗi ngày, sang ngày khác lại được nhận', () => {
  const { db, meditation, player, events } = setup();
  const seated = meditation.sit(player);
  sitFor(meditation, player, TEU.meditateEveryMs * (TEU.meditateDailyCap + 3));
  assert.equal(db.shop.teu(PID), TEU.meditateDailyCap);
  assert.equal(teuEvents(events).at(-1).today, TEU.meditateDailyCap);
  assert.equal(db.teuToday(PID, 'meditate', localDate(seated.now, TZ)), TEU.meditateDailyCap);
  // TEU kiếm ở trò khác không ăn vào trần thiền.
  db.addTeu(PID, 5, 'fish', localDate(seated.now, TZ));
  meditation.leave(player);
  assert.equal(meditation.sit(player).teuToday, TEU.meditateDailyCap);
  // Ngày hôm sau: phiên ngồi mới đếm lại từ 0.
  player.qiAt += 24 * 3600_000;
  sitFor(meditation, player, TEU.meditateEveryMs);
  assert.equal(db.shop.teu(PID), TEU.meditateDailyCap + 5 + 1);
});
