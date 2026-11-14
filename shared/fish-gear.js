// Đồ câu mua bằng TEU, dùng chung client + server: cần câu (mua một lần, dùng mãi) và thính (rắc trước mỗi lần quăng).
// Đây là chỗ tiêu TEU kiếm từ câu cá, để TEU còn giá trị chứ không chỉ chảy vào.

// Cần tốt hơn làm vùng xanh rộng hơn, cá tụt chậm hơn và hay dính cá quý hơn; tự động dùng cần xịn nhất mình có.
// luck: nhân thêm tỉ lệ cắn theo phẩm chất cá (thiếu là 1); 0 nghĩa là cần này không kéo nổi loài phẩm chất đó.
// rarity: phẩm chất của chính cây cần, để túi đồ tô màu như cá.
export const FISH_RODS = [
  { tier: 0, item: null, name: 'Cần tre', price: 0, half: 1, drain: 1, color: 0x8a6a3c, rarity: 1, luck: { 5: 0 } },
  { tier: 1, item: 'rod:1', name: 'Cần trúc đen', price: 60, half: 1.15, drain: 0.8, color: 0x2e2a26, rarity: 2, luck: { 3: 1.25, 4: 1.5, 5: 0.5 } },
  { tier: 2, item: 'rod:2', name: 'Cần kim long', price: 160, half: 1.3, drain: 0.62, color: 0xd9a93a, rarity: 4, luck: { 2: 1.2, 3: 1.8, 4: 3.2, 5: 3.5 } },
  { tier: 3, item: 'rod:3', name: 'Cần phượng hoàng', price: 400, half: 1.4, drain: 0.52, color: 0xd8452b, rarity: 5, luck: { 2: 1.3, 3: 2.4, 4: 5.5, 5: 8 } },
];

// Thính: một gói nhiều nắm, mỗi lần quăng có bật thính thì tốn một nắm.
export const THINH = {
  item: 'thinh',
  name: 'Thính thơm',
  pack: 5,
  price: 8,
  maxStock: 99,
  waitFactor: 0.6, // cá kéo tới nhanh hơn
  rareBias: { 1: 1, 2: 1.35, 3: 1.9, 4: 2, 5: 2 }, // dễ ra cá quý, cá hiếm hơn
};

/** Bậc cần xịn nhất trong tập món đã sở hữu (Set id món). */
export function rodTierOf(owned) {
  let tier = 0;
  for (const rod of FISH_RODS) if (rod.item && owned.has(rod.item)) tier = Math.max(tier, rod.tier);
  return tier;
}

export const rodOf = (tier) => FISH_RODS[tier] ?? FISH_RODS[0];
