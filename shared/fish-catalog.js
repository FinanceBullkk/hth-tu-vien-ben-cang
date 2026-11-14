// Danh mục cá dùng chung client + server: mồi, các loài, phẩm chất và giá bán gốc.
// Tách khỏi fish.js (roll loài, giằng co) để danh mục dài ra không làm file luật phình theo.
// Chỉ được nối thêm loài; id là khoá lưu trong DB (Sổ cá, túi đồ) nên không đổi tên id đã có.
// Đừng thêm loài phẩm chất 1-2 không giờ: đơn bếp chùa (fish-orders.js) chọn theo chỉ số trong nhóm đó,
// thêm vào giữa ngày sẽ đổi đơn đang làm dở của mọi người.

export const BAITS = [
  { id: 'bot', name: 'Mồi bột', seal: '粉' },
  { id: 'giun', name: 'Mồi giun', seal: '蚓' },
  { id: 'rau', name: 'Mồi rau', seal: '草' },
];
export const DEFAULT_BAIT = 'giun';

// Phẩm chất: tên và màu chữ dùng ở thẻ cá, túi đồ, Sổ cá.
export const FISH_RARITY = {
  1: { name: 'Thường', color: '#e6dfcf' },
  2: { name: 'Quý', color: '#7fd67c' },
  3: { name: 'Hiếm', color: '#62b4ff' },
  4: { name: 'Sử thi', color: '#cf8dff' },
  5: { name: 'Huyền thoại', color: '#ffb23e' },
};
export const MAX_RARITY = 5;

// bait: loài này mê mồi nào; null là đồ thất lạc, mồi nào cũng vướng.
// time: chỉ cắn lúc hoàng hôn ('dusk') hoặc đêm ('night'); bỏ trống là lúc nào cũng có.
// price: giá bán gốc (TEU) của một con cỡ trung bình; con nặng hơn bán đắt hơn, xem fishBasePrice.
export const FISH = [
  { id: 'com', name: 'Cá cơm', rarity: 1, minW: 0.05, maxW: 0.2, bait: 'bot', price: 1 },
  { id: 'doi', name: 'Cá đối', rarity: 1, minW: 0.4, maxW: 1.2, bait: 'rau', price: 1 },
  { id: 'thu', name: 'Cá thu', rarity: 1, minW: 0.8, maxW: 2.4, bait: 'giun', price: 2 },
  { id: 'dep', name: 'Dép tổ ong của sếp', rarity: 1, minW: 0.3, maxW: 0.45, bait: null, price: 1 },
  { id: 'hong', name: 'Cá hồng', rarity: 2, minW: 1.2, maxW: 3.5, bait: 'rau', price: 3 },
  { id: 'mu', name: 'Cá mú', rarity: 2, minW: 1.5, maxW: 4.2, bait: 'giun', price: 3 },
  { id: 'voa', name: 'Cá vòa', rarity: 2, minW: 0.6, maxW: 1.8, bait: 'rau', price: 2 },
  { id: 'giay', name: 'Giày da CEO', rarity: 2, minW: 0.7, maxW: 0.9, bait: null, price: 3 },
  { id: 'ngu_van', name: 'Cá ngừ vằn', rarity: 2, minW: 3, maxW: 8, bait: 'bot', price: 3 },
  { id: 'nham', name: 'Cá nhám mập', rarity: 3, minW: 8, maxW: 24, bait: 'giun', price: 5 },
  { id: 'ngu_duong', name: 'Cá ngừ đại dương', rarity: 3, minW: 20, maxW: 60, bait: 'bot', price: 7 },
  { id: 'container', name: 'Container thất lạc (mô hình)', rarity: 3, minW: 2.4, maxW: 2.4, bait: null, price: 5 },
  { id: 'long_den', name: 'Cá lồng đèn', rarity: 2, minW: 0.5, maxW: 1.6, bait: 'bot', time: 'night', price: 3 },
  { id: 'trang', name: 'Cá mặt trăng', rarity: 3, minW: 6, maxW: 18, bait: 'rau', time: 'night', price: 6 },
  { id: 'chep_vang', name: 'Cá chép vàng', rarity: 3, minW: 2, maxW: 7, bait: 'rau', time: 'dusk', price: 6 },
  // Sử thi: chỉ rình bóng lớn, cần tốt mới hay cắn.
  { id: 'rong_huyet', name: 'Cá rồng huyết long', rarity: 4, minW: 3, maxW: 9, bait: 'giun', price: 18 },
  { id: 'tam_hoang', name: 'Cá tầm hoàng đế', rarity: 4, minW: 15, maxW: 45, bait: 'bot', price: 22 },
  { id: 'koi_bach', name: 'Cá koi bạch kim', rarity: 4, minW: 2, maxW: 6, bait: 'rau', time: 'dusk', price: 20 },
  { id: 'kiem', name: 'Cá kiếm', rarity: 4, minW: 30, maxW: 90, bait: 'giun', time: 'night', price: 24 },
  { id: 'ket_sat', name: 'Két sắt phòng kế toán', rarity: 4, minW: 40, maxW: 40, bait: null, price: 16 },
  // Huyền thoại: cần tre không giữ nổi, phải từ cần trúc đen trở lên (luck trong fish-gear.js).
  { id: 'ly_ngu', name: 'Lý ngư hoá long', rarity: 5, minW: 12, maxW: 36, bait: 'rau', time: 'dusk', price: 60 },
  { id: 'nguyet_ngu', name: 'Nguyệt quang ngư', rarity: 5, minW: 4, maxW: 12, bait: 'bot', time: 'night', price: 55 },
  { id: 'ruong_vang', name: 'Rương vàng tàu đắm', rarity: 5, minW: 25, maxW: 25, bait: null, price: 70 },
];

export const fishById = (id) => FISH.find((f) => f.id === id) ?? null;

/** Độ nặng 0..1 trong quãng cân của loài; đồ thất lạc cân cố định tính là cỡ trung bình. */
export function fishHeft(fish, weight) {
  if (!(fish.maxW > fish.minW)) return 0.5;
  return Math.min(1, Math.max(0, (weight - fish.minW) / (fish.maxW - fish.minW)));
}

/** Giá bán gốc của một con: từ 80% (nhẹ nhất) tới 120% (nặng nhất) giá loài, chưa tính thưởng. */
export const fishBasePrice = (fish, weight) => fish.price * (0.8 + 0.4 * fishHeft(fish, weight));
