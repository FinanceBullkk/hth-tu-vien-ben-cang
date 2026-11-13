// Cò quay: luật bánh xe châu Âu, lợi thế nhà cái đều 2,7% mọi cửa, bàn trong sân, và một ván đủ pha.
// Lõi bàn chung (người tung, giả mạo, ngắt kết nối, sập server, socket) đã thử kỹ trong taixiu.test.js.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CoQuay } from '../server/coquay.js';
import { Db } from '../server/db.js';
import { localDate } from '../server/time.js';
import { expectedReturn } from '../shared/casino-bets.js';
import { ALL_POCKETS, COQUAY_TARGETS, OUTSIDE_ID, POCKETS, WHEEL_ORDER, coquayWins, pocketColor, settleCoquay } from '../shared/coquay.js';
import { CIRCLES, COQUAY_ZONE, PLACES, PLAYER_RADIUS, TAIXIU_ZONE, XIDACH_ZONE, BAUCUA_ZONE, resolveCollision } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';

const config = { timezone: 'Asia/Ho_Chi_Minh' };
const DATE = localDate(Date.now(), config.timezone);
const A = 'a'.repeat(32);
const B = 'b'.repeat(32);
const bets = (map) => Object.assign(new Array(COQUAY_TARGETS.length).fill(0), map);

test('bánh xe châu Âu: đủ 37 ô không trùng, 18 đỏ 18 đen, đỏ đen xen kẽ quanh vành', () => {
  assert.deepEqual([...WHEEL_ORDER].sort((x, y) => x - y), ALL_POCKETS);
  const colors = ALL_POCKETS.map(pocketColor);
  assert.equal(colors.filter((c) => c === 'red').length, 18);
  assert.equal(colors.filter((c) => c === 'black').length, 18);
  for (let i = 1; i < WHEEL_ORDER.length - 1; i++) {
    assert.notEqual(pocketColor(WHEEL_ORDER[i]), pocketColor(WHEEL_ORDER[i + 1]), `ô ${WHEEL_ORDER[i]} cạnh ${WHEEL_ORDER[i + 1]}`);
  }
});

test('luật: số đơn ăn 35, tá ăn 2, cửa ngoài ăn 1; ra 0 thì mọi cửa ngoài thua', () => {
  assert.equal(coquayWins(17, 17), true);
  assert.equal(coquayWins(OUTSIDE_ID.red, 32), true);
  assert.equal(coquayWins(OUTSIDE_ID.black, 32), false);
  assert.equal(coquayWins(OUTSIDE_ID.d3, 25), true);
  for (const key of Object.keys(OUTSIDE_ID)) assert.equal(coquayWins(OUTSIDE_ID[key], 0), false, key);
  // 17 đen, lẻ, nhỏ, tá 2: số 17 (2 × 36) + đen 10 × 2 + tá 2 5 × 3; đỏ mất 10.
  const res = settleCoquay(bets({ 17: 2, [OUTSIDE_ID.black]: 10, [OUTSIDE_ID.d2]: 5, [OUTSIDE_ID.red]: 10 }), 17);
  assert.deepEqual(res, { stake: 27, payout: 72 + 20 + 15, net: 80, profit: 80, returned: 27 });
});

test('nhà cái lợi đúng 1/37 ở mọi cửa, không cửa nào lệch', () => {
  const wins = (t, n) => coquayWins(t, n);
  for (let t = 0; t < COQUAY_TARGETS.length; t++) {
    assert.equal(Math.round(expectedReturn(t, COQUAY_TARGETS, ALL_POCKETS, wins) * POCKETS), 36, COQUAY_TARGETS[t].key);
  }
});

test('bàn trong sân: là vật cản, chỗ đứng đi tới được, có trong menu, không chồng vùng bàn khác', () => {
  const { seat } = COQUAY_ZONE;
  assert.deepEqual(resolveCollision(seat.x, seat.z), { x: seat.x, z: seat.z });
  const pushed = resolveCollision(COQUAY_ZONE.x - 0.3, COQUAY_ZONE.z);
  assert.ok(Math.hypot(pushed.x - COQUAY_ZONE.x, pushed.z - COQUAY_ZONE.z) >= COQUAY_ZONE.tableRadius + PLAYER_RADIUS - 1e-6);
  assert.deepEqual(Object.values(PLACES.find((p) => p.key === 'coquay')).slice(-2), [seat.x, seat.z]);
  const zones = [BAUCUA_ZONE, XIDACH_ZONE, TAIXIU_ZONE, COQUAY_ZONE];
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const d = Math.hypot(zones[i].x - zones[j].x, zones[i].z - zones[j].z);
      assert.ok(d > zones[i].radius + zones[j].radius, `vùng bàn ${i} và ${j} chồng nhau`);
    }
  }
  // Chỗ đứng của hai bàn mới không nằm trong vật cản nào khác (cột đèn, hành lang).
  for (const z of [TAIXIU_ZONE, COQUAY_ZONE]) {
    for (const c of CIRCLES) assert.ok(Math.hypot(z.seat.x - c.x, z.seat.z - c.z) >= c.r + PLAYER_RADIUS - 1e-6);
  }
});

test('một ván cò quay: cược trải nhiều cửa, người tung búng bi, chia tiền theo ô dừng', () => {
  const db = new Db(':memory:');
  const payouts = [];
  const game = new CoQuay({ db, io: { emit() {} }, config, random: () => 0 });
  game.onPayout = (pid, r) => payouts.push([pid, r]);
  const player = (pid, teu, sid) => {
    db.touchPlayer({ id: pid, name: `Khách ${pid[0]}`, color: 0, hat: 7, now: Date.now(), isVisit: true });
    db.addTeu(pid, teu, 'seed', DATE);
    return { pid, sid, name: `Khách ${pid[0]}`, x: COQUAY_ZONE.seat.x, z: COQUAY_ZONE.seat.z, activity: ACTIVITY.coquay };
  };
  const bet = (p, target, amount) => {
    p.lastCasinoBet = 0;
    return game.bet(p, { target, amount });
  };
  const a = player(A, 100, 1);
  const b = player(B, 100, 2);
  assert.equal(bet(a, 0, 5).ok, true);
  assert.match(bet(a, 0, 1).error, /tối đa 5/, 'số đơn tối đa 5');
  assert.equal(bet(b, OUTSIDE_ID.red, 10).ok, true);
  game.sweep(game.endsAt);
  assert.equal(game.publicState().thrower.sid, b.sid);
  game.throw(b, { power: 0.4 });
  assert.equal(game.result, 0);
  game.sweep(game.endsAt);
  // Ra 0: A trúng 5 × 36 = 180 → 95 + 180 = 275; B mất đỏ → 90.
  assert.deepEqual([db.shop.teu(A), db.shop.teu(B)], [275, 90]);
  assert.deepEqual(game.publicState().history, [0]);
  assert.equal(payouts.length, 2);
  db.close();
});
