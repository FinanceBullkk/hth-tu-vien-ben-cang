// Thú cưng: luật dùng chung client + server. Mua trứng bằng TEU, nở ra một thú ngẫu nhiên theo bậc hiếm,
// dắt một thú đi theo, cho ăn cá trong túi để tăng thân thiết. Thân thiết cao thì thú có thêm hiệu ứng.
// Id thú là chỉ số trong PETS, lưu trong DB và gửi trong gói tin nên chỉ được nối thêm vào cuối.

/** Bậc hiếm của thú. weight: phần nghìn khả năng trứng ra bậc này; dup: thân thiết cộng khi nở trùng. */
export const PET_RARITY = {
  1: { name: 'Thường', color: '#e6dfcf', weight: 580, dup: 15 },
  2: { name: 'Quý', color: '#7fd67c', weight: 270, dup: 25 },
  3: { name: 'Linh thú', color: '#cf8dff', weight: 110, dup: 50 },
  4: { name: 'Thần thú', color: '#ffb23e', weight: 40, dup: 100 },
};

/**
 * fly: thú bay lơ lửng ngang vai chủ thay vì chạy dưới đất. color: màu chủ đạo cho thẻ và hiệu ứng.
 * blurb: một câu giới thiệu trong bảng thú cưng.
 */
export const PETS = [
  { key: 'meo_muop', name: 'Mèo mướp', rarity: 1, color: '#d9a066', blurb: 'Hay nằm phơi nắng, gọi tên thì vẫy đuôi.' },
  { key: 'cho_co', name: 'Chó cỏ', rarity: 1, color: '#c98a3c', blurb: 'Trung thành, chủ đi đâu theo đó.' },
  { key: 'tho_trang', name: 'Thỏ trắng', rarity: 1, color: '#f3eee6', blurb: 'Nhảy lóc cóc, mê cà rốt hơn cá.' },
  { key: 'gau_truc', name: 'Gấu trúc con', rarity: 2, color: '#f2f0ea', blurb: 'Ôm cành trúc cả ngày, thỉnh thoảng lăn một vòng.' },
  { key: 'rua_ngoc', name: 'Rùa ngọc', rarity: 2, color: '#4fbf8f', blurb: 'Mai bích ngọc trăm năm, đi chậm mà chắc.' },
  { key: 'ho_ly', name: 'Hồ ly chín đuôi', rarity: 3, color: '#ff8a3d', blurb: 'Chín đuôi lửa hồ ly, đêm xuống đầu đuôi phát sáng.' },
  { key: 'hac_tien', name: 'Hạc tiên', rarity: 3, color: '#f5f7ff', fly: true, blurb: 'Hạc trắng đỉnh hồng, bay theo chủ trên mây.' },
  { key: 'ky_lan', name: 'Kỳ lân con', rarity: 4, color: '#3fd0c0', blurb: 'Vảy ngọc bích, bước tới đâu mây lành theo tới đó.' },
  { key: 'rong_con', name: 'Rồng con', rarity: 4, color: '#ffc93c', fly: true, blurb: 'Rồng vàng nhỏ cuộn mây, ôm ngọc như ý.' },
];

export const PET = {
  eggPrice: 25, // TEU một trứng linh thú
  hatchIntervalMs: 1200, // Giãn cách giữa hai lần ấp: đủ cho hoạt cảnh nở, chặn bấm dồn.
  summonIntervalMs: 800,
  feedIntervalMs: 1500, // Thú đang nhai thì chờ chút.
  pityEvery: 12, // Liền chừng này trứng không ra Linh thú trở lên thì trứng cuối chắc chắn ra.
  pityRarity: 3,
  bondMax: 300,
};

/** Mốc thân thiết và tên bậc. Bậc càng cao hiệu ứng càng rõ. */
export const BOND_TIERS = [
  { at: 0, name: 'Mới quen' },
  { at: 40, name: 'Thân quen' },
  { at: 120, name: 'Gắn bó' },
  { at: 300, name: 'Tri kỷ' },
];

/** Thân thiết cộng thêm khi cho ăn một con cá theo phẩm chất cá (1..5). */
export const FEED_GAIN = { 1: 4, 2: 8, 3: 16, 4: 40, 5: 90 };

/** Tổng trọng số các bậc (phần nghìn). */
export const PET_WEIGHT_TOTAL = Object.values(PET_RARITY).reduce((sum, r) => sum + r.weight, 0);

/** Id thú hợp lệ: số nguyên trong bảng. Không ép kiểu: chuỗi "1" bị loại. */
export const isPetKind = (v) => Number.isInteger(v) && v >= 0 && v < PETS.length;

export const petsOfRarity = (rarity) => PETS.map((p, kind) => ({ ...p, kind })).filter((p) => p.rarity === rarity);

export const clampBond = (bond) => Math.max(0, Math.min(PET.bondMax, Math.floor(Number(bond) || 0)));

/** Bậc thân thiết (chỉ số trong BOND_TIERS) của một mức thân thiết. */
export function bondTier(bond) {
  let tier = 0;
  for (let i = 0; i < BOND_TIERS.length; i++) if (bond >= BOND_TIERS[i].at) tier = i;
  return tier;
}

/** Thân thiết cộng khi cho ăn cá phẩm chất rarity (cá lạ coi như thường). */
export const feedGain = (rarity) => FEED_GAIN[rarity] ?? FEED_GAIN[1];

/**
 * Bốc thú từ một số ngẫu nhiên. rarityRoll trong [0, PET_WEIGHT_TOTAL) chọn bậc; pickRoll là số nguyên không âm
 * chọn thú trong bậc đó. pity: số trứng liền trước chưa ra Linh thú trở lên. Tới lượt bảo hiểm thì chỉ bốc trong
 * các bậc từ pityRarity trở lên, giữ đúng tỉ lệ giữa các bậc đó.
 */
export function rollPet(rarityRoll, pickRoll, pity = 0) {
  const forced = pity >= PET.pityEvery - 1;
  const tiers = Object.entries(PET_RARITY)
    .map(([r, spec]) => ({ rarity: Number(r), weight: spec.weight }))
    .filter((t) => !forced || t.rarity >= PET.pityRarity);
  const total = tiers.reduce((sum, t) => sum + t.weight, 0);
  let left = ((rarityRoll % total) + total) % total;
  let rarity = tiers[tiers.length - 1].rarity;
  for (const t of tiers) {
    left -= t.weight;
    if (left < 0) {
      rarity = t.rarity;
      break;
    }
  }
  const pool = petsOfRarity(rarity);
  return pool[Math.abs(pickRoll) % pool.length].kind;
}

/** Bộ đếm bảo hiểm sau khi nở ra thú kind. */
export const nextPity = (pity, kind) => (PETS[kind].rarity >= PET.pityRarity ? 0 : pity + 1);
