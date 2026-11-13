import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Db } from '../server/db.js';
import { Fishing } from '../server/fishing.js';
import { FISH, FISH_RARITY, MAX_RARITY, fightGreen, fightTune, fishRoll } from '../shared/fish.js';
import { BAG, anglerTitle, quickSellable, readItemIds, sortBag } from '../shared/fish-bag.js';
import { FISH_RODS, THINH } from '../shared/fish-gear.js';
import { FISH_LOOKS } from '../client/src/scene/fish-looks.js';

const SHORE = { x: 19, z: 16.7 };

function fixture(t) {
  t.mock.timers.enable({ apis: ['Date'], now: 100_000 });
  const db = new Db(':memory:');
  t.after(() => db.close());
  const events = [];
  const io = { emit: (event, data) => events.push({ event, data }) };
  const fishing = new Fishing({ db, io, config: { timezone: 'Asia/Ho_Chi_Minh' } });
  const player = (pid, sid) => {
    db.touchPlayer({ id: pid, name: pid, color: 0, hat: 0, now: Date.now(), isVisit: true });
    return {
      pid, sid, name: pid, x: SHORE.x, z: SHORE.z, activity: 0, dirty: false, rod: null,
      socket: { emit: (event, data) => events.push({ event, data, target: sid }) },
    };
  };
  const jump = (at) => t.mock.timers.tick(Math.max(0, at - Date.now()));
  /** Thả cần, ép loài + cân rồi giữ kim theo vùng xanh tới khi đầy. */
  const catchFish = (a, id, weight) => {
    fishing.cast(a, { power: 0.5 });
    jump(a.rod.biteAt);
    fishing.sweep(new Map([[a.sid, a]]));
    const bite = events.findLast((e) => e.event === 'fish:bite' && e.target === a.sid).data;
    a.rod.catch = { fish: FISH.find((f) => f.id === id), weight };
    for (let at = bite.startAt; a.rod?.state === 'fighting'; at += 100) {
      jump(at);
      fishing.pull(a, { x: fightGreen(at - bite.startAt, bite.seed, bite.rarity, bite.assist, bite.rod) });
    }
    return fishing.reel(a);
  };
  /** Nhét thẳng một con vào túi, khỏi phải câu. */
  const stash = (a, ref = 'thu', price = 3) => db.bag.add(a.pid, { ref, weight: 1, price });
  const later = () => jump(Date.now() + BAG.sellIntervalMs);
  return { db, events, fishing, bag: fishing.bag, player, jump, catchFish, stash, later };
}

test('danh mục: loài nào cũng có giá, phẩm chất hợp lệ và hình vẽ; đủ năm phẩm chất', () => {
  for (const fish of FISH) {
    assert.ok(Number.isInteger(fish.price) && fish.price > 0, fish.id);
    assert.ok(FISH_RARITY[fish.rarity], fish.id);
    assert.ok(FISH_LOOKS[fish.id], `thiếu hình cho ${fish.id}`);
  }
  for (let r = 1; r <= MAX_RARITY; r++) assert.ok(FISH.some((f) => f.rarity === r), `có cá phẩm chất ${r}`);
  assert.equal(new Set(FISH.map((f) => f.id)).size, FISH.length, 'id không trùng');
  // Cá quý hơn thì bán đắt hơn: loài rẻ nhất của bậc trên đắt hơn loài đắt nhất bậc dưới hai bậc.
  const cheapest = (r) => Math.min(...FISH.filter((f) => f.rarity === r).map((f) => f.price));
  const dearest = (r) => Math.max(...FISH.filter((f) => f.rarity === r).map((f) => f.price));
  for (let r = 3; r <= MAX_RARITY; r++) assert.ok(cheapest(r) > dearest(r - 2), `phẩm chất ${r}`);
});

test('cần câu: cần tre không bao giờ kéo được cá huyền thoại, cần xịn ra nhiều cá quý hơn', () => {
  const rare = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const legend = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < 6000; i++) {
    for (const rod of [0, 1, 2, 3]) {
      const { fish } = fishRoll(5000 + i * 7919, i % 40, { bait: 'rau', shadow: 'l', night: i % 2 === 0, rod });
      if (fish.rarity >= 4) rare[rod]++;
      if (fish.rarity === 5) legend[rod]++;
    }
  }
  assert.equal(legend[0], 0, 'cần tre không giữ nổi cá huyền thoại');
  assert.ok(legend[1] > 0, 'cần trúc đen đã có cơ hội');
  assert.ok(rare[0] < rare[1] && rare[1] < rare[2] && rare[2] < rare[3], `cá sử thi trở lên tăng theo cần: ${JSON.stringify(rare)}`);
  assert.ok(legend[3] > legend[2] * 1.3, 'cần phượng hoàng săn huyền thoại tốt hơn hẳn');
  for (const rod of FISH_RODS) assert.ok(rod.rarity >= 1 && rod.rarity <= MAX_RARITY);
  for (let r = 1; r <= MAX_RARITY; r++) assert.ok(THINH.rareBias[r] > 0, `thính có hệ số cho phẩm chất ${r}`);
});

test('giằng co cá sử thi, huyền thoại: vùng xanh hẹp hơn nhưng luôn nằm trong vòng', () => {
  for (let r = 4; r <= MAX_RARITY; r++) {
    assert.ok(fightTune(r).half < fightTune(r - 1).half);
    for (const rod of [0, 3]) {
      const { half } = fightTune(r, false, rod);
      for (let ms = 0; ms < 40000; ms += 777) {
        const center = fightGreen(ms, 4242 + ms, r, false, rod);
        assert.ok(center - half >= -1e-9 && center + half <= 1 + 1e-9);
      }
    }
  }
});

test('kéo cá lên: cá vào túi với giá chốt sẵn, ví chưa đổi; snapshot túi có con cá đó', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  const before = f.db.shop.teu('An');
  const res = f.catchFish(a, 'mu', 3);
  assert.equal(res.ok, true);
  assert.equal(res.soldNow, false);
  assert.equal(f.db.shop.teu('An') - before, res.teu, 'ví chỉ nhận đúng phần báo về');
  const state = f.bag.state('An');
  assert.equal(state.capacity, BAG.capacity);
  assert.deepEqual(state.items.map((it) => [it.ref, it.weight, it.price, it.locked]), [['mu', 3, res.value, false]]);
  assert.deepEqual([state.species, state.caught, state.rod, state.thinh], [1, 1, 0, 0]);
  assert.equal(f.bag.state('Binh').items.length, 0, 'túi người khác trống');
});

test('túi đầy: con cá mới được bán ngay tại hồ, không mất cá cũng không tràn túi', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  for (let i = 0; i < BAG.capacity; i++) f.stash(a);
  const before = f.db.shop.teu('An');
  const res = f.catchFish(a, 'mu', 3);
  assert.deepEqual([res.ok, res.item, res.soldNow], [true, null, true]);
  assert.equal(f.db.bag.count('An'), BAG.capacity);
  assert.equal(f.db.shop.teu('An') - before, res.teu);
  assert.ok(res.teu >= res.value, 'giá con cá vào thẳng ví');
});

test('bán cá: cộng đúng tổng giá, bán rồi không bán lại được, ghi vào bảng tuần', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  const x = f.stash(a, 'thu', 4);
  const y = f.stash(a, 'nham', 9);
  const before = f.db.shop.teu('An');
  const res = f.bag.sell(a, { ids: [x.id, y.id] });
  assert.deepEqual([res.ok, res.sold, res.gained, res.teu], [true, [x.id, y.id], 13, before + 13]);
  assert.equal(f.db.bag.count('An'), 0);
  f.later();
  const again = f.bag.sell(a, { ids: [x.id] });
  assert.equal(again.ok, false, 'đã bán thì không bán lần nữa');
  assert.equal(f.db.shop.teu('An'), before + 13);
  const weekly = f.db.weekly('1970-01-01'); // đồng hồ giả của test đang ở năm 1970
  assert.equal(weekly.teu.find((r) => r.name === 'An')?.teu, 13, 'tiền bán cá tính vào bảng TEU tuần');
});

test('khoá món: bán lẻ hay bán nhanh đều bỏ qua món đang khoá, mở khoá thì bán được', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  const keep = f.stash(a, 'ly_ngu', 60);
  const junk = f.stash(a, 'com', 1);
  assert.deepEqual(f.bag.lock(a, { id: keep.id, locked: true }), { ok: true, id: keep.id, locked: true });
  const res = f.bag.sell(a, { ids: [keep.id, junk.id] });
  assert.deepEqual([res.ok, res.sold, res.gained], [true, [junk.id], 1], 'món khoá nằm lại');
  f.later();
  assert.equal(f.bag.sell(a, { ids: [keep.id] }).ok, false);
  f.jump(Date.now() + BAG.lockIntervalMs);
  f.bag.lock(a, { id: keep.id, locked: false });
  f.later();
  assert.equal(f.bag.sell(a, { ids: [keep.id] }).gained, 60);
});

test('dữ liệu giả mạo: id rác, id của người khác, mảng quá dài, bấm dồn dập', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  const b = f.player('Binh', 2);
  const theirs = f.stash(b, 'kiem', 30);
  const mine = f.stash(a, 'thu', 2);
  for (const ids of [undefined, 'abc', [], ['1'], [1.5], [-1], [0], [Number.MAX_VALUE], Array.from({ length: BAG.capacity + 1 }, (_, i) => i + 1)]) {
    f.later();
    assert.equal(f.bag.sell(a, { ids }).ok, false, JSON.stringify(ids)?.slice(0, 40));
  }
  f.later();
  const steal = f.bag.sell(a, { ids: [theirs.id] });
  assert.equal(steal.ok, false, 'không bán được cá người khác');
  assert.equal(f.db.bag.count('Binh'), 1);
  f.later();
  assert.equal(f.bag.sell(a, { ids: [mine.id, mine.id, mine.id] }).gained, 2, 'id lặp chỉ tính một lần');
  const spam = f.bag.sell(a, { ids: [mine.id] });
  assert.match(spam.error, /Từ từ/, 'bấm dồn dập bị chặn');
  for (const data of [{ id: theirs.id, locked: true }, { id: 'x', locked: true }, { id: -3 }, null]) {
    f.jump(Date.now() + BAG.lockIntervalMs);
    assert.equal(f.bag.lock(a, data).ok, false);
  }
  assert.equal(f.db.bag.list('Binh')[0].locked, false, 'không khoá được món người khác');
});

test('xếp túi, bán nhanh theo phẩm chất, danh hiệu ngư phủ, đọc id', () => {
  const items = [
    { id: 1, ref: 'com', price: 1, locked: false },
    { id: 2, ref: 'ly_ngu', price: 70, locked: false },
    { id: 3, ref: 'hong', price: 4, locked: true },
    { id: 4, ref: 'nham', price: 6, locked: false },
  ];
  assert.deepEqual(sortBag(items, 'new').map((it) => it.id), [4, 3, 2, 1]);
  assert.deepEqual(sortBag(items, 'value').map((it) => it.id), [2, 4, 3, 1]);
  assert.deepEqual(sortBag(items, 'rarity').map((it) => it.id), [2, 4, 3, 1]);
  assert.deepEqual(quickSellable(items, 2).map((it) => it.id), [1], 'món khoá và cá hiếm không bị bán nhanh');
  assert.deepEqual(quickSellable(items, 3).map((it) => it.id), [1, 4]);
  assert.equal(anglerTitle(0), 'Tân thủ');
  assert.equal(anglerTitle(12), 'Lão ngư');
  assert.equal(anglerTitle(99), 'Ngư vương');
  assert.deepEqual(readItemIds([3, 3, 7]), [3, 7]);
  assert.equal(readItemIds([3, 'x']), null);
});
