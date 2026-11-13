// Đồ câu mua bằng TEU, dùng chung client + server: cần câu (mua một lần, dùng mãi) và thính (rắc trước mỗi lần quăng).
// Đây là chỗ tiêu TEU kiếm từ câu cá, để TEU còn giá trị chứ không chỉ chảy vào.

// Cần tốt hơn làm vùng xanh rộng hơn và cá tụt chậm hơn; người chơi tự động dùng cần xịn nhất mình có.
export const FISH_RODS = [
  { tier: 0, item: null, name: 'Cần tre', price: 0, half: 1, drain: 1, color: 0x8a6a3c },
  { tier: 1, item: 'rod:1', name: 'Cần trúc đen', price: 60, half: 1.15, drain: 0.8, color: 0x2e2a26 },
  { tier: 2, item: 'rod:2', name: 'Cần kim long', price: 160, half: 1.3, drain: 0.62, color: 0xd9a93a },
];

// Thính: một gói nhiều nắm, mỗi lần quăng có bật thính thì tốn một nắm.
export const THINH = {
  item: 'thinh',
  name: 'Thính thơm',
  pack: 5,
  price: 8,
  maxStock: 99,
  waitFactor: 0.6, // cá kéo tới nhanh hơn
  rareBias: { 1: 1, 2: 1.35, 3: 1.9 }, // dễ ra cá quý, cá hiếm hơn
};

/** Bậc cần xịn nhất trong tập món đã sở hữu (Set id món). */
export function rodTierOf(owned) {
  let tier = 0;
  for (const rod of FISH_RODS) if (rod.item && owned.has(rod.item)) tier = Math.max(tier, rod.tier);
  return tier;
}

export const rodOf = (tier) => FISH_RODS[tier] ?? FISH_RODS[0];
