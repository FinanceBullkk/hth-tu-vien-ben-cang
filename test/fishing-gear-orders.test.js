import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Db } from '../server/db.js';
import { Fishing } from '../server/fishing.js';
import { localDate } from '../server/time.js';
import { FISH, FISH_FIGHT, fightGreen, fightTune } from '../shared/fish.js';
import { FISH_RODS, THINH } from '../shared/fish-gear.js';
import { FISH_ORDER_COUNT, dailyOrders, orderMatches } from '../shared/fish-orders.js';

const SHORE = { x: 19, z: 16.7 };
const TZ = 'Asia/Ho_Chi_Minh';

function fixture(t) {
  t.mock.timers.enable({ apis: ['Date'], now: 1_790_000_000_000 });
  const db = new Db(':memory:');
  t.after(() => db.close());
  const events = [];
  const io = { emit: (event, data) => events.push({ event, data }) };
  const fishing = new Fishing({ db, io, config: { timezone: TZ } });
  const date = () => localDate(Date.now(), TZ);
  const player = (pid, sid, teu = 0) => {
    db.touchPlayer({ id: pid, name: pid, color: 0, hat: 0, now: Date.now(), isVisit: true });
    if (teu) db.addTeu(pid, teu, 'test', date());
    return { pid, sid, name: pid, x: SHORE.x, z: SHORE.z, activity: 0, dirty: false, rod: null, socket: { emit: (event, data) => events.push({ event, data, target: sid }) } };
  };
  const jump = (at) => t.mock.timers.tick(Math.max(0, at - Date.now()));
  const teuOf = (pid) => db.shop.teu(pid);
  /** Quăng, chờ cắn, ép loài và cân nặng, giữ kim theo vùng xanh tới khi đầy rồi kéo lên. */
  const catchFish = (a, fishId, weight, castData = {}) => {
    fishing.cast(a, castData);
    jump(a.rod.biteAt);
    fishing.sweep(new Map([[a.sid, a]]));
    a.rod.catch = { fish: FISH.find((f) => f.id === fishId), weight };
    const { fight } = a.rod;
    for (let at = fight.startAt; a.rod.state === 'fighting' && at < fight.startAt + FISH_FIGHT.maxMs; at += 100) {
      jump(at);
      fishing.pull(a, { x: fightGreen(at - fight.startAt, fight.seed, fight.rarity, fight.assist, fight.rod) });
    }
    return fishing.reel(a);
  };
  return { db, events, fishing, player, jump, teuOf, date, catchFish };
}

test('đơn hàng mỗi ngày: cùng ngày ra cùng ba đơn, không có đồ thất lạc hay cá chỉ cắn ban đêm', () => {
  const a = dailyOrders('2026-11-13');
  assert.deepEqual(a, dailyOrders('2026-11-13'), 'mọi máy và server ra cùng một danh sách');
  assert.equal(a.length, FISH_ORDER_COUNT);
  assert.equal(new Set(a.map((o) => o.fishId)).size, 3, 'ba đơn ba loài khác nhau');
  const days = Array.from({ length: 40 }, (_, i) => dailyOrders(`2026-12-${String(i % 28 + 1).padStart(2, '0')}-${i}`));
  for (const orders of days) {
    for (const order of orders) {
      const fish = FISH.find((f) => f.id === order.fishId);
      assert.ok(fish.bait !== null && !fish.time, `${fish.id} phải là cá câu được cả ngày`);
      if (order.minWeight) assert.ok(order.minWeight > fish.minW && order.minWeight <= fish.maxW, 'đơn nặng ký vẫn với tới được');
    }
  }
  assert.ok(new Set(days.map((d) => d[0].fishId)).size > 1, 'đơn đổi theo ngày');
  const heavy = a[2];
  assert.equal(orderMatches(heavy, heavy.fishId, heavy.minWeight), true);
  assert.equal(orderMatches(heavy, heavy.fishId, heavy.minWeight - 0.1), false, 'nhẹ hơn mức đặt thì không tính');
});

test('mua thính: thiếu TEU thì không mất gì; rắc thính thì tốn một nắm và cá cắn nhanh hơn', (t) => {
  const f = fixture(t);
  const poor = f.player('Ngheo', 1, THINH.price - 1);
  const res = f.fishing.supplies.buy(poor, { item: 'thinh' });
  assert.equal(res.ok, false);
  assert.match(res.error, /thiếu 1 TEU/);
  assert.equal(f.teuOf('Ngheo'), THINH.price - 1, 'không trừ TEU');
  assert.equal(f.db.fishing.thinh('Ngheo'), 0);

  const a = f.player('An', 2, 50);
  const bought = f.fishing.supplies.buy(a, { item: 'thinh' });
  assert.equal(bought.ok, true);
  assert.equal(bought.thinh, THINH.pack);
  assert.equal(bought.teu, 50 - THINH.price);

  const plain = f.fishing.cast(a, {});
  assert.equal(plain.thinh, false, 'không bật thính thì không tốn');
  assert.equal(f.db.fishing.thinh('An'), THINH.pack);
  f.fishing.cancel(a);
  const sprinkled = f.fishing.cast(a, { thinh: true });
  assert.equal(sprinkled.thinh, true);
  assert.equal(sprinkled.thinhLeft, THINH.pack - 1);
  assert.ok(a.rod.biteAt - a.rod.castAt <= 9000 * THINH.waitFactor + 1, 'thính làm cá cắn sớm hơn');
  assert.equal(f.events.findLast((e) => e.event === 'fish:bobber').data.thinh, true, 'cả hồ thấy người này rắc thính');
});

test('hết thính thì bật cũng không được rắc; giỏ thính có trần', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1, 1000);
  assert.equal(f.fishing.cast(a, { thinh: true }).thinh, false, 'chưa mua thì không có thính');
  f.fishing.cancel(a);
  a.lastBuy = 0;
  for (let i = 0; i < 30; i++) {
    f.jump(Date.now() + 400);
    f.fishing.supplies.buy(a, { item: 'thinh' });
  }
  assert.ok(f.db.fishing.thinh('An') <= THINH.maxStock);
  assert.match(f.fishing.supplies.buy(a, { item: 'thinh' }).error, /đầy|Từ từ/);
});

test('mua cần: lên bậc thì vùng xanh rộng hơn, server gửi bậc cần trong fish:bite; không mua lùi, không mua món lạ', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1, 300);
  assert.equal(f.fishing.supplies.info(a).rod, 0);
  const rod1 = FISH_RODS[1];
  const res = f.fishing.supplies.buy(a, { item: rod1.item });
  assert.equal(res.ok, true);
  assert.equal(res.rod, 1);
  assert.equal(f.teuOf('An'), 300 - rod1.price);
  f.jump(Date.now() + 400);
  assert.match(f.fishing.supplies.buy(a, { item: rod1.item }).error, /tốt bằng/, 'không mua lại cần đã có');
  f.jump(Date.now() + 400);
  for (const item of ['rod:9', 'color:1', '', null, { item: 'rod:2' }]) {
    f.jump(Date.now() + 400);
    assert.equal(f.fishing.supplies.buy(a, { item }).ok, false, `không bán ${JSON.stringify(item)}`);
  }
  assert.equal(f.teuOf('An'), 300 - rod1.price, 'món lạ không trừ TEU');

  f.fishing.cast(a, {});
  f.jump(a.rod.biteAt);
  f.fishing.sweep(new Map([[a.sid, a]]));
  const bite = f.events.findLast((e) => e.event === 'fish:bite').data;
  assert.equal(bite.rod, 1);
  assert.ok(fightTune(bite.rarity, false, 1).half > fightTune(bite.rarity, false, 0).half, 'cần tốt thì vùng xanh rộng hơn');
  assert.ok(fightTune(bite.rarity, false, 2).drain < fightTune(bite.rarity, false, 1).drain, 'cần tốt thì cá tụt chậm hơn');
});

test('đơn hàng: cá khớp đơn được cộng, đủ đơn được thưởng TEU một lần, cá lệch đơn không tính', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  const [common, , heavy] = dailyOrders(f.date());
  const other = FISH.find((fish) => !dailyOrders(f.date()).some((o) => o.fishId === fish.id));

  let res = f.catchFish(a, other.id, other.minW);
  assert.equal(res.ok, true);
  assert.equal(res.orderDone, null, 'loài không có trong đơn thì không tính');
  assert.equal(f.fishing.supplies.orders('An').every((o) => o.progress === 0), true);

  const commonFish = FISH.find((fish) => fish.id === common.fishId);
  for (let i = 1; i <= common.need; i++) {
    const before = f.teuOf('An');
    res = f.catchFish(a, common.fishId, commonFish.minW);
    assert.equal(res.ok, true);
    const order = res.orders.find((o) => o.slot === common.slot);
    assert.equal(order.progress, i);
    if (i < common.need) assert.equal(res.orderDone, null);
    else {
      assert.deepEqual(res.orderDone, { slot: common.slot, teu: common.teu });
      assert.equal(order.done, true);
      assert.equal(f.teuOf('An') - before, res.teu, 'TEU báo về khớp TEU cộng vào ví');
    }
  }
  res = f.catchFish(a, common.fishId, commonFish.minW);
  assert.equal(res.orderDone, null, 'đơn đã xong không thưởng lần hai');
  assert.equal(f.db.db.prepare("SELECT COUNT(*) n FROM teu_log WHERE player_id='An' AND reason='fish-order'").get().n, 1);

  res = f.catchFish(a, heavy.fishId, heavy.minWeight - 0.1);
  assert.equal(res.orderDone, null, 'cá nhẹ hơn mức đặt không tính');
  res = f.catchFish(a, heavy.fishId, heavy.minWeight);
  assert.equal(res.orderDone?.slot, heavy.slot);
});

test('đơn hàng tính riêng từng người và đổi sang ngày mới', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  const b = f.player('Binh', 2);
  const [, fine] = dailyOrders(f.date());
  const fish = FISH.find((x) => x.id === fine.fishId);
  assert.equal(f.catchFish(a, fine.fishId, fish.minW).orderDone?.slot, fine.slot);
  assert.equal(f.fishing.supplies.orders('Binh')[fine.slot].done, false, 'người khác chưa xong đơn của mình');
  assert.equal(b.rod, null);
  const today = f.date();
  f.jump(Date.now() + 24 * 3600_000);
  assert.notEqual(f.date(), today);
  assert.equal(f.fishing.supplies.orders('An').every((o) => !o.done && o.progress === 0), true, 'sang ngày mới đơn mới, chưa làm gì');
});
