// Thẻ Trang bị trong túi đồ: coi trang phục, hào quang, vũ khí, mũ, tóc, màu áo là vật phẩm như game thùng đồ.
// Món đang mặc nằm ở ô trang bị quanh nhân vật, lưới túi chỉ chứa món đã có mà chưa mặc.
// Chỉ tính toán, không đụng DOM, để test được bằng node; mặc hay tháo thật vẫn đi qua "look:set" trên server.
import { AVATAR } from '../../../shared/protocol.js';
import { HAT_SHOP_START, LOOK_DEFAULT, SHOP_PRICES, SHOP_SECTIONS, canWear, itemId, priceOf, requirementOf } from '../../../shared/shop.js';

export const SLOT_COUNT = { color: AVATAR.colors, hair: AVATAR.hairs, hat: AVATAR.hats, attire: AVATAR.attires, weapon: AVATAR.weapons, effect: AVATAR.effects };

/** Món "để trống" của slot: mặc nó tức là ô trang bị trống, không xếp vào lưới. */
const NONE = { hat: 7, weapon: 0, effect: 0 };
// Mũ id 0-2 là kiểu tóc cũ chỉ còn để di trú, không coi là món đồ.
const FIRST = { hat: HAT_SHOP_START };

export const EQUIP_SECTIONS = SHOP_SECTIONS;
const SECTION = Object.fromEntries(SHOP_SECTIONS.map((s, i) => [s.slot, { ...s, order: i }]));
export const slotLabel = (slot) => SECTION[slot]?.label ?? slot;
export const slotHanzi = (slot) => SECTION[slot]?.hanzi ?? '';

/** Bộ lọc lưới Trang bị, bấm vòng qua từng loại. */
export const EQUIP_FILTERS = [{ id: 'all', label: 'Tất cả' }, ...SHOP_SECTIONS.map(({ slot, label }) => ({ id: slot, label }))];

export const isNone = (slot, index) => NONE[slot] === index;

/**
 * Phẩm chất món đồ theo giá ở Sạp Kim Bảo, cùng thang màu với cá:
 * miễn phí Thường, dưới 30 Quý, dưới 40 Hiếm, dưới 80 Sử thi, từ 80 hoặc hào quang chí tôn là Huyền thoại.
 */
export function lookRarity(id) {
  const price = priceOf(id);
  if (requirementOf(id) || price >= 80) return 5;
  if (price >= 40) return 4;
  if (price >= 30) return 3;
  if (price > 0) return 2;
  return 1;
}

const entryOf = (slot, index, worn) => {
  const id = itemId(slot, index);
  return { key: worn ? `w:${slot}` : `e:${id}`, kind: 'look', slot, index, id, rarity: lookRarity(id), worn, empty: worn && isNone(slot, index) };
};

/** Các món mặc được của một slot (miễn phí hoặc đã mua), bỏ món để trống và id cũ. */
export function wearableIndexes(owned, slot) {
  const out = [];
  for (let i = FIRST[slot] ?? 0; i < SLOT_COUNT[slot]; i++) {
    if (!isNone(slot, i) && canWear(owned, slot, i)) out.push(i);
  }
  return out;
}

/**
 * Ô trong lưới Trang bị: món đã có mà chưa mặc, theo thứ tự thẻ cửa hàng (hào quang trước),
 * trong mỗi loại món quý lên trước. filter 'all' hoặc tên slot.
 */
export function gridEntries(owned, look, filter = 'all') {
  const slots = filter === 'all' ? SHOP_SECTIONS.map((s) => s.slot) : [filter].filter((s) => SECTION[s]);
  return slots.flatMap((slot) => wearableIndexes(owned, slot)
    .filter((i) => i !== look[slot])
    .map((i) => entryOf(slot, i, false))
    .sort((a, b) => b.rarity - a.rarity || a.index - b.index));
}

/** Sáu ô trang bị quanh nhân vật, mỗi ô là món đang mặc (empty khi đang để trống). */
export const wornEntries = (look) => Object.fromEntries(SHOP_SECTIONS.map(({ slot }) => [slot, entryOf(slot, look[slot], true)]));

/** Tháo được khi đang không mặc món mặc định của slot (tóc, màu áo, trang phục tháo là về kiểu gốc). */
export const canUnequip = (look, slot) => look[slot] !== LOOK_DEFAULT[slot];
export const unequipLook = (look, slot) => ({ ...look, [slot]: LOOK_DEFAULT[slot] });
export const equipLook = (look, slot, index) => ({ ...look, [slot]: index });

/** Số liệu cột Nhân vật: món quý đã sưu tầm, hào quang đã có, giá trị tủ đồ và giá trị bộ đang mặc. */
export function wardrobeStats(owned, look) {
  const paid = Object.keys(SHOP_PRICES);
  const have = paid.filter((id) => owned.has(id));
  const auras = paid.filter((id) => id.startsWith('effect:'));
  return {
    collected: have.length,
    total: paid.length,
    auras: auras.filter((id) => owned.has(id)).length,
    aurasTotal: auras.length,
    value: have.reduce((sum, id) => sum + priceOf(id), 0),
    outfit: SHOP_SECTIONS.reduce((sum, { slot }) => sum + priceOf(itemId(slot, look[slot])), 0),
  };
}
