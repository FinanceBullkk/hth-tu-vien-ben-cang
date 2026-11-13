import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Db } from '../server/db.js';
import { Fishing } from '../server/fishing.js';
import { FISH, FISH_BITE, SHADOW_WAIT, fightGreen } from '../shared/fish.js';
import { GOLDEN_HOUR, STREAK_STEPS, TROPHY, catchTeu, goldenHour, isTrophy, streakBonus } from '../shared/fish-bonus.js';
import { TEU } from '../shared/protocol.js';

const SHORE = { x: 19, z: 16.7 };
const GOLDEN_AT = GOLDEN_HOUR.periodMs - GOLDEN_HOUR.durationMs + 1000; // vừa vào Giờ cá vàng đầu tiên
const thu = FISH.find((f) => f.id === 'thu');
const bigThu = Math.round((thu.minW + (thu.maxW - thu.minW) * TROPHY.ratio + 0.01) * 100) / 100;

function fixture(t, now = 100_000) {
  t.mock.timers.enable({ apis: ['Date'], now });
  const db = new Db(':memory:');
  t.after(() => db.close());
  const events = [];
  const io = { emit: (event, data) => events.push({ event, data }) };
  const fishing = new Fishing({ db, io, config: { timezone: 'Asia/Ho_Chi_Minh' } });
  db.touchPlayer({ id: 'An', name: 'An', color: 0, hat: 0, now: Date.now(), isVisit: true });
  const a = {
    pid: 'An', sid: 1, name: 'An', x: SHORE.x, z: SHORE.z, activity: 0, dirty: false, rod: null,
    socket: { emit: (event, data) => events.push({ event, data, target: 1 }) },
  };
  const jump = (at) => t.mock.timers.tick(Math.max(0, at - Date.now()));
  /** Thả cần, chờ cá cắn, ép loài + cân rồi giữ kim theo vùng xanh tới khi đầy: luôn ra câu đẹp. */
  const catchFish = (id, weight, data = {}) => {
    fishing.cast(a, { power: 0.5, ...data });
    jump(a.rod.biteAt);
    fishing.sweep(new Map([[a.sid, a]]));
    const bite = events.findLast((e) => e.event === 'fish:bite').data;
    a.rod.catch = { fish: FISH.find((f) => f.id === id), weight };
    for (let at = bite.startAt; a.rod?.state === 'fighting'; at += 100) {
      jump(at);
      fishing.pull(a, { x: fightGreen(at - bite.startAt, bite.seed, bite.rarity, bite.assist) });
    }
    return fishing.reel(a);
  };
  return { db, events, fishing, a, jump, catchFish };
}

test('Giờ cá vàng: năm phút cuối mỗi nửa giờ, đếm ngược đúng', () => {
  assert.deepEqual(goldenHour(0), { on: false, endsIn: 0, startsIn: GOLDEN_HOUR.periodMs - GOLDEN_HOUR.durationMs });
  assert.equal(goldenHour(GOLDEN_AT).on, true);
  assert.equal(goldenHour(GOLDEN_AT).endsIn, GOLDEN_HOUR.durationMs - 1000);
  assert.equal(goldenHour(GOLDEN_HOUR.periodMs).on, false, 'hết nửa giờ là đóng');
  assert.equal(goldenHour(GOLDEN_HOUR.periodMs * 7 + GOLDEN_AT).on, true, 'lặp lại mỗi nửa giờ');
});

test('cá khủng: chỉ cá thật nặng gần đỉnh loài, đồ thất lạc không tính', () => {
  assert.equal(isTrophy(thu, thu.maxW), true);
  assert.equal(isTrophy(thu, bigThu), true);
  assert.equal(isTrophy(thu, thu.minW + (thu.maxW - thu.minW) * 0.5), false);
  assert.equal(isTrophy(FISH.find((f) => f.id === 'container'), 2.4), false);
  assert.equal(isTrophy(FISH.find((f) => f.id === 'dep'), 0.45), false);
});

test('chuỗi câu đẹp và công thức TEU: nhân gốc, cộng câu đẹp và chuỗi', () => {
  assert.equal(streakBonus(0), 0);
  assert.equal(streakBonus(1), 0);
  for (const step of STREAK_STEPS) assert.equal(streakBonus(step.streak), step.teu);
  assert.equal(streakBonus(99), STREAK_STEPS.at(-1).teu, 'có trần');
  assert.equal(catchTeu({ rarity: 2, perfect: false, trophy: false, golden: false, streak: 0 }), TEU.fishByRarity[2]);
  assert.equal(
    catchTeu({ rarity: 3, perfect: true, trophy: true, golden: true, streak: 4 }),
    TEU.fishByRarity[3] * TROPHY.teuFactor * GOLDEN_HOUR.teuFactor + TEU.fishPerfectBonus + streakBonus(4),
  );
});

test('server: câu đẹp liên tiếp thì chuỗi tăng và được thưởng, rút sớm làm đứt chuỗi', (t) => {
  const f = fixture(t);
  const first = f.catchFish('thu', 1);
  assert.equal(first.grade, 'perfect');
  assert.equal(first.bonus.streak, 1);
  assert.equal(first.teu, TEU.fishByRarity[1] + TEU.fishPerfectBonus + (first.orderDone?.teu ?? 0));
  const second = f.catchFish('thu', 1);
  assert.equal(second.bonus.streak, 2);
  assert.equal(second.teu, TEU.fishByRarity[1] + TEU.fishPerfectBonus + streakBonus(2) + (second.orderDone?.teu ?? 0));

  f.fishing.cast(f.a, { power: 0.5 });
  assert.equal(f.fishing.reel(f.a).escaped, true);
  assert.equal(f.catchFish('thu', 1).bonus.streak, 1, 'rút sớm thì chuỗi về 0');

  f.fishing.cancel(f.a);
  assert.equal(f.catchFish('thu', 1).bonus.streak, 1, 'về bờ rồi ra lại là chuỗi mới');
});

test('server: cá thua vòng giằng co cũng làm đứt chuỗi', (t) => {
  const f = fixture(t);
  f.catchFish('thu', 1);
  f.fishing.cast(f.a, { power: 0.5 });
  f.jump(f.a.rod.biteAt);
  f.fishing.sweep(new Map([[1, f.a]]));
  f.fishing.pull(f.a, { x: 0 });
  for (let i = 0; i < 100 && f.a.rod; i++) {
    f.jump(Date.now() + 500);
    f.fishing.sweep(new Map([[1, f.a]]));
  }
  assert.equal(f.a.rod, null, 'đứng lệch mãi thì cá tuột');
  assert.equal(f.a.fishStreak, 0);
});

test('server: cá khủng gấp đôi phần gốc và cả phòng được báo', (t) => {
  const f = fixture(t);
  const res = f.catchFish('thu', bigThu);
  assert.equal(res.bonus.trophy, true);
  assert.equal(res.teu, TEU.fishByRarity[1] * TROPHY.teuFactor + TEU.fishPerfectBonus + (res.orderDone?.teu ?? 0));
  assert.equal(f.events.findLast((e) => e.event === 'fish:caught').data.trophy, true);
});

test('server: quăng trong Giờ cá vàng thì cá cắn sớm hơn và TEU gấp đôi, client không tự xin được', (t) => {
  const f = fixture(t, GOLDEN_AT);
  f.fishing.cast(f.a, { power: 0.5 });
  const wait = f.a.rod.biteAt - f.a.rod.castAt;
  assert.ok(wait <= FISH_BITE.maxMs * SHADOW_WAIT.none * GOLDEN_HOUR.waitFactor + 1, 'cá cắn sớm hơn');
  f.fishing.cancel(f.a);
  const res = f.catchFish('thu', 1);
  assert.equal(res.bonus.golden, true);
  assert.equal(res.teu, TEU.fishByRarity[1] * GOLDEN_HOUR.teuFactor + TEU.fishPerfectBonus + (res.orderDone?.teu ?? 0));

  // Ngoài giờ: dữ liệu client kèm cờ golden hay bonus cũng không có tác dụng.
  f.jump(GOLDEN_HOUR.periodMs + 1000);
  const plain = f.catchFish('thu', 1, { golden: true, bonus: { golden: true, trophy: true } });
  assert.equal(plain.bonus.golden, false);
  assert.equal(plain.bonus.trophy, false);
});
