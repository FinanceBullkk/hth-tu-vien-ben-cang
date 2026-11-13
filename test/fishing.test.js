import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Db } from '../server/db.js';
import { Fishing } from '../server/fishing.js';
import { LAKE, PAGODA, PLACES, clampToWalkable, lakeDistance, resolveCollision } from '../shared/layout.js';
import { lakeShot } from '../client/src/activities/fishing-camera-shot.js';
import { LAKE_SHADOW, shadowNear, shadowsAt } from '../shared/fish-lake-shadows.js';
import { TEU } from '../shared/protocol.js';
import { BAITS, FISH, FISH_BITE, FISH_FIGHT, SHADOW_WAIT, castSpot, fightGreen, fightTune, fishHint, fishRoll, isLakeNight } from '../shared/fish.js';

const SHORE = { x: 19, z: 16.7 };

function fixture(t) {
  t.mock.timers.enable({ apis: ['Date'], now: 100_000 });
  const db = new Db(':memory:');
  t.after(() => db.close());
  const events = [];
  const io = { emit: (event, data) => events.push({ event, data }) };
  const config = { timezone: 'Asia/Ho_Chi_Minh' };
  const fishing = new Fishing({ db, io, config });
  const player = (pid, sid) => {
    db.touchPlayer({ id: pid, name: pid, color: 0, hat: 0, now: Date.now(), isVisit: true });
    return {
      pid, sid, name: pid, x: SHORE.x, z: SHORE.z, activity: 0, dirty: false, rod: null,
      socket: { emit: (event, data) => events.push({ event, data, target: sid }) },
    };
  };
  const jump = (at) => t.mock.timers.tick(at - Date.now());
  const toBite = (a) => {
    jump(a.rod.biteAt);
    fishing.sweep(new Map([[a.sid, a]]));
    return events.findLast((e) => e.event === 'fish:bite').data;
  };
  /** Chơi thật như client: mỗi 100ms gửi kim, chọn đi theo vùng xanh hoặc đứng lệch. */
  const play = (a, bite, needleAt, maxMs = FISH_FIGHT.maxMs) => {
    for (let at = bite.startAt; at < bite.startAt + maxMs && a.rod?.state === 'fighting'; at += 100) {
      jump(at);
      fishing.pull(a, { x: needleAt(at - bite.startAt) });
    }
  };
  const follow = (bite) => (ms) => fightGreen(ms, bite.seed, bite.rarity, bite.assist);
  return { db, events, fishing, player, jump, toBite, play, follow, config };
}

test('quăng cần: phải ở bờ hồ, một cần một người, phát phao đúng chỗ theo lực', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  a.x = 0;
  assert.ok(f.fishing.cast(a, { power: 0.5 }).error.includes('bờ hồ'));
  a.x = SHORE.x;
  const res = f.fishing.cast(a, { bait: 'rau' });
  assert.equal(res.ok, true);
  assert.equal(a.activity, 5, 'avatar vào tư thế câu cá');
  assert.equal(a.rod.bait, 'rau');
  assert.ok(a.rod.biteAt > a.rod.castAt + FISH_BITE.minMs * SHADOW_WAIT.l - 1);
  assert.ok(a.rod.biteAt < a.rod.castAt + FISH_BITE.maxMs + 1);
  const bobber = f.events.find((e) => e.event === 'fish:bobber');
  assert.equal(bobber.data.sid, 1);
  assert.deepEqual({ bx: bobber.data.bx, bz: bobber.data.bz }, castSpot(a.x, a.z));
  assert.equal(f.fishing.cast(a, { power: 0.8 }).repeat, true, 'đã buông cần thì không buông thêm');
});

test('dữ liệu quăng bậy: mồi lạ về mồi mặc định, toạ độ rác vẫn rơi xuống nước', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  for (const data of [{ tx: 'abc', tz: {} }, { tx: Infinity, tz: 5 }, { tx: null, tz: null }, { tx: 9999, tz: -9999 }, undefined]) {
    f.fishing.cast(a, data ?? undefined);
    assert.ok(lakeDistance(a.rod.bx, a.rod.bz) < 0, `dữ liệu ${JSON.stringify(data)}`);
    f.fishing.cancel(a);
  }
  f.fishing.cast(a, { bait: '<script>' });
  assert.ok(BAITS.some((b) => b.id === a.rod.bait));
});

test('cá cắn là vào giằng co luôn, không cần móc; lộ độ hiếm nhưng không lộ tên', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.fishing.cast(a, { power: 1 });
  f.jump(a.rod.biteAt - 1);
  f.fishing.sweep(new Map([[a.sid, a]]));
  assert.equal(a.rod.state, 'waiting', 'chưa tới giờ thì cá chưa cắn');
  const bite = f.toBite(a);
  assert.equal(a.rod.state, 'fighting');
  assert.equal(f.events.find((e) => e.event === 'fish:bite').target, a.sid, 'fish:bite chỉ gửi riêng người câu');
  assert.ok([1, 2, 3].includes(bite.rarity));
  assert.equal(bite.name, undefined);
  assert.ok(bite.startAt > Date.now(), 'có một nhịp chuẩn bị');
  const struck = f.events.find((e) => e.event === 'fish:struck');
  assert.ok(struck, 'cả phòng thấy phao giật');
  assert.equal(struck.data.rarity, bite.rarity, 'cả phòng thấy bóng cá to nhỏ đúng độ hiếm');
  assert.equal(struck.data.name, undefined, 'chưa lộ tên cá');
});

test('giữ kim trong vùng thì đầy vòng rồi mới kéo lên được, được TEU và câu đẹp', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.fishing.cast(a, { power: 1 });
  const bite = f.toBite(a);
  assert.equal(f.fishing.reel(a).ok, false, 'chưa đầy vòng thì không kéo được');
  assert.equal(a.rod.state, 'fighting', 'kéo sớm không làm mất cá');
  f.play(a, bite, f.follow(bite));
  assert.equal(a.rod.state, 'ready');
  const res = f.fishing.reel(a);
  assert.equal(res.ok, true);
  assert.equal(res.grade, 'perfect');
  assert.ok(res.fish.name);
  assert.equal(res.fish.rarity, bite.rarity, 'độ khó khớp đúng con cá bắt được');
  assert.equal(res.teu, TEU.fishByRarity[res.fish.rarity] + TEU.fishPerfectBonus);
  assert.equal(res.isNew, true, 'lần đầu bắt loài này');
  assert.equal(a.rod, null);
  assert.equal(a.activity, 5, 'bắt xong vẫn đứng câu, người khác không thấy nhân vật giật về đứng thường');
  assert.equal(f.events.findLast((e) => e.event === 'fish:rodoff').data.idle, true);
  const caughtAt = f.events.findIndex((e) => e.event === 'fish:caught');
  const rodOffAt = f.events.findIndex((e) => e.event === 'fish:rodoff');
  assert.ok(caughtAt >= 0 && caughtAt < rodOffAt, 'báo bắt được trước khi dọn phao');
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM fish_log WHERE player_id=?').get(a.pid).n, 1);
  const row = f.db.db.prepare('SELECT count, best_weight FROM fish_caught WHERE player_id=?').get(a.pid);
  assert.equal(row.count, 1);
  assert.equal(row.best_weight, res.fish.weight);
});

test('client không thể tự báo đầy: đứng lệch vùng thì cá tuột, không ghi sổ', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.fishing.cast(a, { power: 0.2 });
  const bite = f.toBite(a);
  // Luôn đứng phía xa nhất so với vùng xanh.
  f.play(a, bite, (ms) => (fightGreen(ms, bite.seed, bite.rarity, bite.assist) > 0.5 ? 0 : 1));
  assert.equal(a.rod, null, 'cạn vòng là cá tuột');
  assert.equal(f.events.findLast((e) => e.event === 'fish:escaped').data.reason, 'fight');
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM fish_log WHERE player_id=?').get(a.pid).n, 0);
  assert.equal(f.fishing.reel(a).ok, false);
});

test('server tự chạy tiếp khi client im lặng: mất mạng giữa chừng thì cá tuột', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.fishing.cast(a, { power: 0.4 });
  const bite = f.toBite(a);
  f.jump(bite.startAt + FISH_FIGHT.maxMs + 1000);
  f.fishing.sweep(new Map([[a.sid, a]]));
  assert.equal(a.rod?.state === 'fighting', false, 'không treo mãi ở pha giằng co');
});

test('đầy vòng mà không kéo trong hạn thì cá vùng thoát', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.fishing.cast(a, { power: 0.4 });
  const bite = f.toBite(a);
  f.play(a, bite, f.follow(bite));
  assert.equal(a.rod.state, 'ready');
  f.jump(a.rod.readyUntil + 1);
  f.fishing.sweep(new Map([[a.sid, a]]));
  assert.equal(a.rod, null);
  assert.equal(f.events.findLast((e) => e.event === 'fish:escaped').data.reason, 'slack');
});

test('về bờ: mọi người thấy cần biến mất kể cả khi đang chờ quăng tiếp', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.fishing.cast(a, { power: 0.4 });
  f.fishing.reel(a); // Rút sớm: hết phao nhưng còn đứng câu.
  assert.equal(a.activity, 5);
  f.events.length = 0;
  f.fishing.cancel(a);
  assert.equal(f.events.findLast((e) => e.event === 'fish:rodoff').data.idle, false);
  assert.equal(a.activity, 0);
  f.events.length = 0;
  f.fishing.cancel(a);
  assert.equal(f.events.length, 0, 'gọi lại không phát thừa cho cả phòng');
});

test('chạm đâu cũng thả được: trúng nước thì rơi đúng chỗ, trúng bờ hay quá xa thì vẫn xuống nước', () => {
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    // Đi từ tâm ra tới đúng chỗ cách mép nước vừa đủ cho người đứng.
    let d = 0;
    while (lakeDistance(LAKE.x + Math.sin(a) * d, LAKE.z + Math.cos(a) * d) < 0.45) d += 0.05;
    const x = LAKE.x + Math.sin(a) * d;
    const z = LAKE.z + Math.cos(a) * d;
    const def = castSpot(x, z);
    assert.ok(lakeDistance(def.bx, def.bz) < 0, `thả mặc định ở hướng ${i}`);
    for (let j = 0; j < 12; j++) {
      const b = (j / 12) * Math.PI * 2;
      for (const far of [0.5, 3, 8, 40]) {
        const { bx, bz } = castSpot(x, z, x + Math.sin(b) * far, z + Math.cos(b) * far);
        assert.ok(lakeDistance(bx, bz) < 0, `đứng hướng ${i}, chạm hướng ${j}, xa ${far}`);
      }
    }
  }
  // Điểm chạm đã ở trên nước và trong tầm thì giữ đúng, người chơi chạm đâu phao rơi đó.
  const hit = castSpot(SHORE.x, SHORE.z, 21, 21);
  assert.ok(Math.hypot(hit.bx - 21, hit.bz - 21) < 0.02);
});

test('đứng ở đâu quanh hồ, máy quay cũng tìm được chỗ không vướng bảo tháp, cây hay tường', () => {
  for (const portrait of [false, true]) {
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      let d = 0;
      while (lakeDistance(LAKE.x + Math.sin(a) * d, LAKE.z + Math.cos(a) * d) < 0.45) d += 0.05;
      const [x, z] = clampToWalkable(LAKE.x + Math.sin(a) * d, LAKE.z + Math.cos(a) * d);
      const shot = lakeShot(x, z, portrait);
      assert.equal(shot.fallback, false, `bờ hướng ${i} (${x.toFixed(1)}, ${z.toFixed(1)}), màn dọc=${portrait}`);
      assert.ok(Math.hypot(PAGODA.x - shot.pos.x, PAGODA.z - shot.pos.z) > PAGODA.radius, 'không chui vào bảo tháp');
    }
  }
});

test('người mới: mấy con đầu dễ hơn, đủ loài rồi thì về độ khó thường', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.fishing.cast(a);
  assert.equal(f.toBite(a).assist, true);
  f.fishing.cancel(a);
  for (const id of ['com', 'doi', 'dep']) f.db.fishCatch(a.pid, id, 0.3, 'good', '2026-11-07', Date.now());
  f.fishing.cast(a);
  assert.equal(f.toBite(a).assist, false);
  for (const rarity of [1, 2, 3]) {
    assert.ok(fightTune(rarity, true).half > fightTune(rarity).half);
    assert.ok(fightTune(rarity, true).drain < fightTune(rarity).drain);
  }
  // Vùng xanh chế độ dễ vẫn không tràn khỏi vòng cung.
  for (let ms = 0; ms < 60000; ms += 137) {
    const center = fightGreen(ms, 7777 + ms, 1, true);
    assert.ok(center - fightTune(1, true).half >= -1e-9 && center + fightTune(1, true).half <= 1 + 1e-9);
  }
});

test('menu Chơi gì: mỗi chỗ đứng đều hợp lệ, không bị đẩy ra khỏi vật cản', () => {
  for (const place of PLACES) {
    const out = resolveCollision(place.x, place.z);
    assert.ok(Math.hypot(out.x - place.x, out.z - place.z) < 0.01, `${place.name} đứng trùng vật cản`);
  }
  assert.equal(new Set(PLACES.map((p) => p.key)).size, PLACES.length);
});

test('bóng cá: mọi máy tính ra giống nhau, luôn nằm trong hồ, có đủ cỡ', () => {
  const sizes = new Set();
  for (let now = 1_000_000; now < 1_000_000 + 3_600_000; now += 7_000) {
    const shadows = shadowsAt(now);
    assert.deepEqual(shadows, shadowsAt(now));
    assert.equal(shadows.length, LAKE_SHADOW.lanes);
    for (const s of shadows) {
      assert.ok(lakeDistance(s.x, s.z) < 0, `bóng ${s.id} phải nằm trên mặt nước`);
      sizes.add(s.size);
    }
    assert.equal(new Set(shadows.map((s) => s.id)).size, shadows.length);
  }
  assert.deepEqual([...sizes].sort(), ['l', 'm', 's']);
});

test('quăng trúng bóng: bóng thuộc về người đó, người sau không lấy được', (t) => {
  const f = fixture(t);
  const now = Date.now();
  const [target] = shadowsAt(now);
  const size = f.fishing.takeShadow(target.x, target.z, now, 1);
  assert.ok(size);
  assert.ok(f.events.find((e) => e.event === 'fish:shadow' && e.data.sid === 1), 'cả phòng biết bóng đã có chủ');
  assert.ok(f.fishing.takenShadowIds().length === 1);
  const again = shadowNear(now, target.x, target.z, f.fishing.takenShadows);
  assert.notEqual(again?.id, target.id);
  t.mock.timers.tick(LAKE_SHADOW.periodMs + 1);
  f.fishing.sweep(new Map());
  assert.equal(f.fishing.takenShadowIds().length, 0, 'hết khung thì dọn sổ');
});

const forceCatch = (f, a, id, weight) => {
  const bite = f.toBite(a);
  a.rod.catch = { fish: FISH.find((x) => x.id === id), weight };
  f.play(a, bite, f.follow(bite));
  return f.fishing.reel(a);
};

test('Sổ cá: đủ mốc loài thưởng một lần, phá kỷ lục cân nặng được báo', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  for (const id of ['com', 'doi', 'dep', 'hong']) f.db.fishCatch(a.pid, id, 0.3, 'good', '2026-11-07', Date.now());
  f.fishing.cast(a, { power: 0.5 });
  const first = forceCatch(f, a, 'thu', 1);
  assert.equal(first.isNew, true);
  assert.equal(first.species, 5);
  assert.equal(first.milestone?.teu, 5, 'loài thứ năm chạm mốc');
  assert.equal(first.teu, 1 + 1 + 5);
  assert.equal(first.record, false, 'lần đầu không tính kỷ lục');

  f.fishing.cast(a, { power: 0.5 });
  const second = forceCatch(f, a, 'thu', 2);
  assert.equal(second.milestone, null, 'bắt lại không thưởng mốc lần nữa');
  assert.equal(second.record, true);
  f.fishing.cast(a, { power: 0.5 });
  assert.equal(forceCatch(f, a, 'thu', 1.5).record, false);
});

test('kim gửi bậy không làm hỏng mô phỏng', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.fishing.cast(a, { power: 0.4 });
  f.toBite(a);
  for (const x of ['abc', null, Infinity, {}]) {
    f.fishing.pull(a, { x });
    assert.ok(Number.isFinite(a.rod.needle));
  }
  f.fishing.pull(a, { x: 50 });
  assert.equal(a.rod.needle, 1);
  f.fishing.pull(a);
  assert.equal(a.rod.needle, 1);
});

test('rút khi chưa cắn làm cá bỏ mồi', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.fishing.cast(a, { power: 0.4 });
  const early = f.fishing.reel(a);
  assert.equal(early.escaped, true);
  assert.equal(a.rod, null);
  assert.ok(f.events.find((e) => e.event === 'fish:rodoff'));
  assert.equal(f.db.db.prepare('SELECT COUNT(*) n FROM fish_log WHERE player_id=?').get(a.pid).n, 0);
});

test('lắc cần dụ cá cắn sớm hơn nhưng có trần; bỏ đi quá xa là mất mồi', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  f.fishing.cast(a, { power: 0.4 });
  const originalBite = a.rod.biteAt;
  const { castAt } = a.rod;
  for (let i = 1; i <= 4; i++) {
    f.jump(castAt + i * 600);
    if (a.rod.state === 'waiting') f.fishing.wiggle(a);
  }
  assert.ok(originalBite - a.rod.biteAt >= FISH_BITE.wigglePullMs, 'lắc nhiều đẩy sớm được vài nhịp');
  assert.ok(originalBite - a.rod.biteAt <= FISH_BITE.wiggleMaxPullMs + 1, 'tổng mức đẩy có trần');

  f.fishing.cancel(a);
  f.fishing.cast(a, { power: 0.4 });
  a.x = 0; // Đi khỏi bờ hồ
  f.fishing.sweep(new Map([[a.sid, a]]));
  assert.equal(a.rod, null, 'bỏ đi thì dọn cần');
  assert.equal(a.activity, 0);
});

test('mồi đúng, bóng to và đúng giờ làm tăng tỉ lệ đúng như hứa', () => {
  const countOf = (options, pick) => {
    let n = 0;
    for (let i = 0; i < 4000; i++) if (pick(fishRoll(100_000 + i * 977, 3, options).fish)) n++;
    return n;
  };
  const wormFish = (fish) => fish.bait === 'giun';
  assert.ok(countOf({ bait: 'giun' }, wormFish) > countOf({ bait: 'rau' }, wormFish) * 2, 'mồi giun ra nhiều cá ăn giun');
  const rare = (fish) => fish.rarity === 3;
  assert.ok(countOf({ shadow: 'l' }, rare) > countOf({ shadow: null }, rare) * 5, 'bóng lớn dễ ra cá hiếm');
  const moon = (fish) => fish.id === 'trang';
  assert.equal(countOf({ bait: 'rau', shadow: 'l', night: false }, moon), 0, 'cá đêm không cắn lúc hoàng hôn');
  assert.ok(countOf({ bait: 'rau', shadow: 'l', night: true }, moon) > 0, 'đúng giờ đúng mồi thì có');
  assert.equal(countOf({ bait: 'rau', shadow: 'l', night: true }, (fish) => fish.id === 'chep_vang'), 0);
  for (const fish of FISH) {
    assert.ok(fish.bait === null || BAITS.some((b) => b.id === fish.bait), `${fish.id} gắn mồi có thật`);
    assert.ok(fishHint(fish).length > 3);
  }
  // Đồ thất lạc là món hài thỉnh thoảng gặp, không được lấn át cá ở bất kỳ loại mồi nào.
  for (const { id } of BAITS) {
    const junkShare = countOf({ bait: id }, (fish) => fish.bait === null) / 4000;
    assert.ok(junkShare > 0.03 && junkShare < 0.3, `mồi ${id}: đồ thất lạc chiếm ${junkShare}`);
  }
  // Mỗi vòng ngày đêm đều có cả hai pha.
  assert.equal(isLakeNight(0, 1000), false);
  assert.equal(isLakeNight(500, 1000), true);
});

test('vùng xanh của cá hiếm hẹp hơn và không bao giờ tràn khỏi vòng cung', () => {
  const { byRarity } = FISH_FIGHT;
  assert.ok(byRarity[1].half > byRarity[2].half && byRarity[2].half > byRarity[3].half);
  for (const rarity of [1, 2, 3]) {
    for (let ms = 0; ms < 60000; ms += 137) {
      const center = fightGreen(ms, 12345 + ms, rarity);
      assert.ok(center - byRarity[rarity].half >= -1e-9 && center + byRarity[rarity].half <= 1 + 1e-9);
    }
  }
});

test('bắt loài thứ hai lần nữa: count tăng, isNew = false', (t) => {
  const f = fixture(t);
  const a = f.player('An', 1);
  // Đổ trực tiếp hai lần cùng loài để không phụ thuộc roll.
  f.db.fishCatch(a.pid, 'com', 0.12, 'good', '2026-11-07', Date.now());
  const isNew = !f.db.hasCaught(a.pid, 'com');
  assert.equal(isNew, false);
  f.db.fishCatch(a.pid, 'com', 0.2, 'perfect', '2026-11-07', Date.now());
  const row = f.db.db.prepare('SELECT count, best_weight FROM fish_caught WHERE player_id=? AND fish_id=?').get(a.pid, 'com');
  assert.equal(row.count, 2);
  assert.equal(row.best_weight, 0.2);
});
