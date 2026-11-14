// Thú cưng: bốc thú theo bậc và bảo hiểm, ấp trứng trừ TEU trong transaction, nở trùng, dắt thú, cho ăn cá,
// dữ liệu giả mạo, cá của người khác hay đang khoá, broadcast cho cả phòng và trạng thái khi vào lại.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Db } from '../server/db.js';
import { Pets } from '../server/pets.js';
import { FISH } from '../shared/fish-catalog.js';
import {
  BOND_TIERS, FEED_GAIN, PET, PETS, PET_RARITY, PET_WEIGHT_TOTAL, bondTier, nextPity, petsOfRarity, rollPet,
} from '../shared/pets.js';

const DATE = '2026-11-15';
const config = { timezone: 'Asia/Ho_Chi_Minh' };

/** Số bốc nhỏ nhất ra đúng bậc rarity (không bảo hiểm). */
function rarityRollFor(rarity) {
  let start = 0;
  for (const [r, spec] of Object.entries(PET_RARITY)) {
    if (Number(r) === rarity) return start;
    start += spec.weight;
  }
  throw new Error(`Không có bậc ${rarity}`);
}

/** Dãy số ngẫu nhiên để server bốc đúng thú kind: [số chọn bậc, số chọn thú trong bậc]. */
function rollsFor(kind) {
  const rarity = PETS[kind].rarity;
  const pool = petsOfRarity(rarity).map((p) => p.kind);
  return [rarityRollFor(rarity), pool.indexOf(kind)];
}

function fixture({ teu = 500 } = {}) {
  const db = new Db(':memory:');
  const emits = [];
  const queue = [];
  const pets = new Pets({ db, config, io: { emit: (e, d) => emits.push([e, d]) }, random: (n) => (queue.length ? queue.shift() % n : 0) });
  const make = (sid, coins = teu) => {
    const pid = String(sid).repeat(32).slice(0, 32);
    db.touchPlayer({ id: pid, name: `Khách ${sid}`, color: 0, hat: 7, now: Date.now(), isVisit: true });
    if (coins) db.addTeu(pid, coins, 'seed', DATE);
    const p = { sid, pid, name: `Khách ${sid}` };
    pets.load(p);
    return p;
  };
  /** Ấp một trứng ra đúng thú kind, bỏ qua giới hạn nhịp. */
  const hatch = (p, kind) => {
    if (kind !== undefined) queue.push(...rollsFor(kind));
    p.lastPetHatch = 0;
    return pets.hatch(p);
  };
  const fish = (p, rarity, opts = {}) => {
    const f = FISH.find((x) => x.rarity === rarity);
    return db.bag.add(p.pid, { ref: f.id, weight: 1, price: f.price, ...opts });
  };
  const feed = (p, id) => {
    p.lastPetFeed = 0;
    return pets.feed(p, { id });
  };
  const summon = (p, kind) => {
    p.lastPetSummon = 0;
    return pets.summon(p, { kind });
  };
  return { db, pets, emits, queue, make, hatch, fish, feed, summon };
}

test('bảng thú: id liền mạch, đủ bốn bậc, mỗi bậc có thú, trọng số tổng 1000', () => {
  assert.equal(PET_WEIGHT_TOTAL, 1000);
  for (const r of Object.keys(PET_RARITY)) assert.ok(petsOfRarity(Number(r)).length > 0, `bậc ${r} phải có thú`);
  assert.equal(new Set(PETS.map((p) => p.key)).size, PETS.length, 'key thú không trùng');
  for (const p of PETS) assert.ok(PET_RARITY[p.rarity], `${p.name} có bậc hợp lệ`);
});

test('rollPet: dải trọng số liên tiếp, chia đều trong bậc', () => {
  assert.equal(PETS[rollPet(0, 0)].rarity, 1);
  assert.equal(PETS[rollPet(rarityRollFor(2), 0)].rarity, 2);
  assert.equal(PETS[rollPet(rarityRollFor(3), 0)].rarity, 3);
  assert.equal(PETS[rollPet(PET_WEIGHT_TOTAL - 1, 0)].rarity, 4);
  const commons = petsOfRarity(1).map((p) => p.kind);
  assert.deepEqual(commons.map((_, i) => rollPet(0, i)), commons);
  // Đếm đủ một vòng số bốc: mỗi bậc ra đúng phần nghìn của nó.
  const count = {};
  for (let roll = 0; roll < PET_WEIGHT_TOTAL; roll++) {
    const r = PETS[rollPet(roll, 0)].rarity;
    count[r] = (count[r] ?? 0) + 1;
  }
  for (const [r, spec] of Object.entries(PET_RARITY)) assert.equal(count[r], spec.weight);
});

test('bảo hiểm: tới lượt thì chỉ ra Linh thú trở lên, nở thú hiếm thì đếm lại từ 0', () => {
  const last = PET.pityEvery - 1;
  for (let roll = 0; roll < PET_WEIGHT_TOTAL; roll += 7) {
    assert.ok(PETS[rollPet(roll, roll, last)].rarity >= PET.pityRarity, `số bốc ${roll} lúc bảo hiểm phải ra thú hiếm`);
  }
  assert.equal(PETS[rollPet(0, 0, last - 1)].rarity, 1, 'chưa tới lượt thì vẫn bốc thường');
  assert.equal(nextPity(3, 0), 4);
  assert.equal(nextPity(3, petsOfRarity(3)[0].kind), 0);
});

test('bậc thân thiết theo mốc', () => {
  assert.equal(bondTier(0), 0);
  assert.equal(bondTier(BOND_TIERS[1].at - 1), 0);
  assert.equal(bondTier(BOND_TIERS[1].at), 1);
  assert.equal(bondTier(PET.bondMax), BOND_TIERS.length - 1);
});

test('ấp trứng: trừ đúng giá, ghi sổ TEU, thú vào chuồng với thân thiết 0', () => {
  const f = fixture({ teu: 100 });
  const a = f.make(1);
  const res = f.hatch(a, 0);
  assert.equal(res.ok, true);
  assert.equal(res.kind, 0);
  assert.equal(res.dup, false);
  assert.equal(res.teu, 100 - PET.eggPrice);
  assert.deepEqual(res.list, [{ kind: 0, bond: 0, hatched: 1 }]);
  assert.equal(res.pity, 1, 'thú thường làm tăng bộ đếm bảo hiểm');
  assert.equal(f.db.shop.teu(a.pid), 100 - PET.eggPrice);
});

test('ấp trứng: thiếu TEU thì không trừ, không có thú, bộ đếm bảo hiểm giữ nguyên', () => {
  const f = fixture({ teu: PET.eggPrice - 1 });
  const a = f.make(1);
  const res = f.hatch(a, 0);
  assert.equal(res.ok, false);
  assert.match(res.error, /thiếu 1 TEU/);
  assert.equal(f.db.shop.teu(a.pid), PET.eggPrice - 1);
  assert.deepEqual(f.pets.state(a.pid).list, []);
  assert.equal(f.pets.state(a.pid).pity, 0);
});

test('ấp trứng: bấm dồn bị chặn bởi giới hạn nhịp', () => {
  const f = fixture();
  const a = f.make(1);
  assert.equal(f.hatch(a, 0).ok, true);
  const again = f.pets.hatch(a);
  assert.equal(again.ok, false);
  assert.equal(f.db.shop.teu(a.pid), 500 - PET.eggPrice);
});

test('ấp trứng: nở trùng thì cộng thân thiết theo bậc, không vượt trần', () => {
  const f = fixture({ teu: 5000 });
  const a = f.make(1);
  const dragon = PETS.findIndex((p) => p.key === 'rong_con');
  f.hatch(a, dragon);
  const dup = f.hatch(a, dragon);
  assert.equal(dup.dup, true);
  assert.equal(dup.gained, PET_RARITY[4].dup);
  assert.equal(dup.bond, PET_RARITY[4].dup);
  for (let i = 0; i < 5; i++) f.hatch(a, dragon);
  const row = f.pets.state(a.pid).list.find((p) => p.kind === dragon);
  assert.equal(row.bond, PET.bondMax);
  assert.equal(row.hatched, 7);
});

test('ấp trứng: liền mười một trứng thường thì trứng thứ mười hai chắc chắn ra thú hiếm', () => {
  const f = fixture({ teu: 5000 });
  const a = f.make(1);
  for (let i = 0; i < PET.pityEvery - 1; i++) assert.equal(PETS[f.hatch(a, 0).kind].rarity, 1);
  assert.equal(f.pets.state(a.pid).pity, PET.pityEvery - 1);
  f.queue.push(0, 0); // số bốc thường nhất, vẫn phải ra Linh thú
  const lucky = f.hatch(a);
  assert.ok(PETS[lucky.kind].rarity >= PET.pityRarity);
  assert.equal(lucky.pity, 0);
});

test('dắt thú: chỉ dắt được thú đã có, cả phòng thấy, cất về bằng -1', () => {
  const f = fixture();
  const a = f.make(1);
  assert.equal(f.summon(a, 0).ok, false, 'chưa có thú');
  f.hatch(a, 0);
  assert.deepEqual(f.summon(a, 0), { ok: true, active: 0 });
  assert.deepEqual(f.emits.at(-1), ['player:pet', { sid: 1, pet: 0, tier: 0 }]);
  assert.equal(a.pet, 0);
  assert.equal(f.pets.state(a.pid).active, 0);
  assert.deepEqual(f.summon(a, -1), { ok: true, active: -1 });
  assert.deepEqual(f.emits.at(-1), ['player:pet', { sid: 1, pet: -1, tier: 0 }]);
  assert.equal(f.pets.state(a.pid).active, -1);
});

test('dắt thú: dữ liệu giả mạo bị từ chối', () => {
  const f = fixture();
  const a = f.make(1);
  f.hatch(a, 0);
  for (const kind of ['0', 1.5, PETS.length, -2, null, undefined, { kind: 0 }]) {
    assert.equal(f.summon(a, kind).ok, false, `kind ${JSON.stringify(kind)}`);
  }
  assert.equal(f.pets.summon(a, null).ok, false);
  assert.equal(a.pet, -1);
});

test('cho ăn: chưa dắt thú thì không cho ăn, cá vẫn còn', () => {
  const f = fixture();
  const a = f.make(1);
  f.hatch(a, 0);
  const item = f.fish(a, 1);
  assert.equal(f.feed(a, item.id).ok, false);
  assert.equal(f.db.bag.count(a.pid), 1);
});

test('cho ăn: cá mất khỏi túi, thân thiết cộng theo phẩm chất cá, cả phòng thấy', () => {
  const f = fixture();
  const a = f.make(1);
  f.hatch(a, 0);
  f.summon(a, 0);
  const item = f.fish(a, 3);
  const res = f.feed(a, item.id);
  assert.equal(res.ok, true);
  assert.equal(res.gained, FEED_GAIN[3]);
  assert.equal(res.bond, FEED_GAIN[3]);
  assert.equal(f.db.bag.count(a.pid), 0);
  assert.deepEqual(f.emits.at(-1), ['pet:fed', { sid: 1, rarity: 3, tier: bondTier(FEED_GAIN[3]) }]);
  // Lên bậc thì báo up để client bắn hiệu ứng, và người khác vào sau thấy đúng bậc mới.
  let up = null;
  for (let i = 0; i < 4 && !up; i++) {
    const r = f.feed(a, f.fish(a, 5).id);
    if (r.up) up = r;
  }
  assert.ok(up, 'cho cá huyền thoại phải lên bậc');
  assert.equal(a.petTier, up.tier);
});

test('cho ăn: cá khoá, cá người khác, id giả đều bị từ chối và không mất cá', () => {
  const f = fixture();
  const a = f.make(1);
  const b = f.make(2);
  f.hatch(a, 0);
  f.summon(a, 0);
  const locked = f.fish(a, 2);
  f.db.bag.setLocked(a.pid, locked.id, true);
  assert.equal(f.feed(a, locked.id).ok, false);
  const theirs = f.fish(b, 2);
  assert.equal(f.feed(a, theirs.id).ok, false);
  for (const id of ['1', -1, 0, 1.5, null, 9_999_999]) assert.equal(f.feed(a, id).ok, false, `id ${id}`);
  assert.equal(f.db.bag.count(a.pid), 1);
  assert.equal(f.db.bag.count(b.pid), 1);
  assert.equal(f.pets.state(a.pid).list[0].bond, 0);
});

test('cho ăn: thú đã tri kỷ thì không ăn thêm, giữ cá lại', () => {
  const f = fixture({ teu: 5000 });
  const a = f.make(1);
  const dragon = PETS.findIndex((p) => p.key === 'rong_con');
  for (let i = 0; i < 4; i++) f.hatch(a, dragon);
  f.summon(a, dragon);
  assert.equal(a.petTier, BOND_TIERS.length - 1);
  const item = f.fish(a, 1);
  const res = f.feed(a, item.id);
  assert.equal(res.ok, false);
  assert.match(res.error, /tri kỷ/);
  assert.equal(f.db.bag.count(a.pid), 1);
});

test('vào lại: thú đang dắt và bậc thân thiết được nạp từ DB', () => {
  const f = fixture();
  const a = f.make(1);
  f.hatch(a, 0);
  f.summon(a, 0);
  for (let i = 0; i < 3; i++) f.feed(a, f.fish(a, 3).id);
  const again = { sid: 9, pid: a.pid };
  f.pets.load(again);
  assert.equal(again.pet, 0);
  assert.equal(again.petTier, a.petTier);
  const fresh = { sid: 10, pid: f.make(3).pid };
  f.pets.load(fresh);
  assert.equal(fresh.pet, -1);
});
