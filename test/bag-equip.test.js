// Thẻ Trang bị trong túi đồ: chọn món cho lưới và ô trang bị, phẩm chất theo giá, mặc và tháo.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canUnequip, equipLook, gridEntries, lookRarity, unequipLook, wardrobeStats, wearableIndexes, wornEntries,
} from '../client/src/ui/bag-equip-items.js';
import { LOOK_DEFAULT, SHOP_PRICES } from '../shared/shop.js';

const LOOK = { color: 0, hair: 0, hat: 7, attire: 0, weapon: 0, effect: 0 };

test('lưới chỉ có món đã có mà chưa mặc, không có món để trống hay id cũ', () => {
  const owned = new Set(['effect:11', 'attire:7']);
  const ids = gridEntries(owned, LOOK).map((e) => e.id);
  assert.ok(ids.includes('effect:11'), 'hào quang đã mua vào túi');
  assert.ok(ids.includes('effect:1'), 'hào quang miễn phí cũng có');
  assert.ok(!ids.includes('effect:3'), 'hào quang chưa mua không vào túi');
  assert.ok(!ids.includes('effect:0'), '"Không" hào quang không phải món đồ');
  assert.ok(!ids.includes('hat:7') && !ids.includes('weapon:0'), 'món để trống không vào túi');
  assert.ok(!ids.some((id) => ['hat:0', 'hat:1', 'hat:2'].includes(id)), 'mũ id cũ không vào túi');
  assert.ok(!ids.includes('attire:0') && !ids.includes('color:0') && !ids.includes('hair:0'), 'món đang mặc nằm ở ô trang bị');
  assert.equal(new Set(ids).size, ids.length);
});

test('lưới xếp hào quang trước, món quý trước, lọc được theo loại', () => {
  const owned = new Set(['effect:11', 'effect:3', 'hat:9']);
  const all = gridEntries(owned, LOOK);
  assert.equal(all[0].id, 'effect:11', 'Kim long (huyền thoại) đứng đầu');
  assert.ok(all.findIndex((e) => e.slot === 'hat') > all.findIndex((e) => e.slot === 'effect'));
  const hats = gridEntries(owned, LOOK, 'hat');
  assert.ok(hats.length > 0 && hats.every((e) => e.slot === 'hat'));
  assert.equal(hats[0].id, 'hat:9');
  assert.deepEqual(gridEntries(owned, LOOK, 'khong-co'), []);
});

test('ô trang bị: món đang mặc, ô trống khi để trống', () => {
  const worn = wornEntries({ ...LOOK, effect: 11, weapon: 1 });
  assert.equal(worn.effect.id, 'effect:11');
  assert.equal(worn.effect.empty, false);
  assert.equal(worn.weapon.index, 1);
  assert.equal(worn.hat.empty, true, 'mũ "Không đội" là ô trống');
  assert.equal(worn.effect.key, 'w:effect');
});

test('phẩm chất theo giá, hào quang chí tôn là huyền thoại', () => {
  assert.equal(lookRarity('effect:0'), 1);
  assert.equal(lookRarity('hair:3'), 2);
  assert.equal(lookRarity('effect:3'), 3);
  assert.equal(lookRarity('effect:4'), 4);
  assert.equal(lookRarity('effect:11'), 5);
  assert.equal(lookRarity('effect:13'), 5);
});

test('mặc và tháo: tháo về món mặc định, món mặc định không tháo nữa', () => {
  const look = equipLook(LOOK, 'effect', 11);
  assert.equal(look.effect, 11);
  assert.equal(LOOK.effect, 0, 'không sửa bộ đồ gốc');
  assert.ok(canUnequip(look, 'effect'));
  assert.deepEqual(unequipLook(look, 'effect'), LOOK);
  for (const slot of Object.keys(LOOK_DEFAULT)) assert.equal(canUnequip(LOOK_DEFAULT, slot), false);
});

test('món mặc được: miễn phí hoặc đã mua', () => {
  assert.ok(!wearableIndexes(new Set(), 'effect').includes(11));
  assert.ok(wearableIndexes(new Set(['effect:11']), 'effect').includes(11));
});

test('số liệu tủ đồ đếm món quý đã có và giá trị', () => {
  const owned = new Set(['effect:11', 'hat:9', 'la:1']);
  const stats = wardrobeStats(owned, { ...LOOK, effect: 11 });
  assert.equal(stats.collected, 2);
  assert.equal(stats.total, Object.keys(SHOP_PRICES).length);
  assert.equal(stats.auras, 1);
  assert.equal(stats.value, SHOP_PRICES['effect:11'] + SHOP_PRICES['hat:9']);
  assert.equal(stats.outfit, SHOP_PRICES['effect:11']);
});
