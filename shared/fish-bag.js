// Túi đồ dùng chung client + server: sức chứa, nhãn của món, xếp túi và danh hiệu ngư phủ.
// Cá kéo lên vào túi với giá bán đã chốt; bán lúc nào, ở đâu cũng được. Túi đầy thì cá mới bán ngay tại hồ.
import { fishById } from './fish-catalog.js';

export const BAG = {
  capacity: 49, // 7 x 7 ô
  sellIntervalMs: 250,
  lockIntervalMs: 150,
};

// Nhãn ghi trên món lúc câu: để túi đồ nói được vì sao con này đắt.
export const BAG_TAGS = {
  trophy: 'Cá khủng',
  golden: 'Giờ cá vàng',
  perfect: 'Câu đẹp',
};

/** Nhãn của một con cá vừa kéo lên, theo thứ tự cố định. */
export function catchTags({ trophy, golden, perfect }) {
  return [trophy && 'trophy', golden && 'golden', perfect && 'perfect'].filter(Boolean);
}

/** Phẩm chất của món trong túi; món lạ (loài đã bỏ) coi như thường. */
export const itemRarity = (item) => fishById(item.ref)?.rarity ?? 1;

export const bagValue = (items) => items.reduce((sum, it) => sum + it.price, 0);

// Cách xếp túi; nút "Sắp xếp túi" xoay vòng qua các cách này.
export const BAG_SORTS = [
  { id: 'new', label: 'Mới câu', cmp: (a, b) => b.id - a.id },
  { id: 'value', label: 'Giá cao', cmp: (a, b) => b.price - a.price || b.id - a.id },
  { id: 'rarity', label: 'Phẩm chất', cmp: (a, b) => itemRarity(b) - itemRarity(a) || b.price - a.price || b.id - a.id },
];

export function sortBag(items, sortId) {
  const sort = BAG_SORTS.find((s) => s.id === sortId) ?? BAG_SORTS[0];
  return [...items].sort(sort.cmp);
}

/** Món bán nhanh được: chưa khoá và phẩm chất không quá maxRarity. */
export const quickSellable = (items, maxRarity) => items.filter((it) => !it.locked && itemRarity(it) <= maxRarity);

// Danh hiệu ngư phủ theo số loài đã có trong Sổ cá.
const ANGLER_TITLES = [
  { species: 20, title: 'Ngư vương' },
  { species: 15, title: 'Ngư sư' },
  { species: 10, title: 'Lão ngư' },
  { species: 5, title: 'Ngư phủ' },
  { species: 0, title: 'Tân thủ' },
];
export const anglerTitle = (species) => ANGLER_TITLES.find((t) => species >= t.species).title;

/** Đọc danh sách id món client gửi lên: số nguyên dương, không trùng, tối đa bằng sức chứa túi. */
export function readItemIds(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > BAG.capacity) return null;
  const ids = [...new Set(raw)];
  return ids.every((id) => Number.isSafeInteger(id) && id > 0) ? ids : null;
}
