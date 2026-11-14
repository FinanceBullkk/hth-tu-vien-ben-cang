// Đập đá tìm ngọc ở bãi đá cạnh bãi container: luật dùng chung client + server.
// Hai loại đá: đá thường miễn phí (tích dần theo giờ, có trần) và đá quý mua bằng TEU (gacha, hoàn vốn ~95%).
// Mỗi tảng có độ cứng (hp). Thanh lực chạy lên xuống theo giờ server; nhát đập chấm theo vị trí thanh lúc bấm:
// Chuẩn trừ 3, Khá trừ 2, Yếu trừ 1. Vỡ thì bốc một viên ngọc theo bảng trọng số của loại đá, giá ngọc cố định.
// Id ngọc và id loại đá là chỉ số trong mảng, gửi trong gói tin nên chỉ được nối thêm vào cuối.

/** tier: bậc hiếm để tô màu và quyết định có báo cả sân không. teu: giá cộng thẳng vào ví. */
export const STONE_GEMS = [
  { key: 'vun', name: 'Đá vụn', teu: 0, color: '#9a948a', tier: 0 },
  { key: 'thach_anh', name: 'Thạch anh', teu: 1, color: '#dfe9ee', tier: 1 },
  { key: 'ma_nao', name: 'Mã não', teu: 3, color: '#e58a3a', tier: 2 },
  { key: 'bich_ngoc', name: 'Bích ngọc', teu: 8, color: '#35c47e', tier: 3 },
  { key: 'lam_ngoc', name: 'Lam ngọc', teu: 20, color: '#3d86ee', tier: 4 },
  { key: 'hong_ngoc', name: 'Hồng ngọc', teu: 50, color: '#ec3150', tier: 5 },
  { key: 'linh_thach', name: 'Linh thạch cực phẩm', teu: 200, color: '#ffd23f', tier: 6 },
];

export const GEM_TIER_NAMES = ['Phế phẩm', 'Thường', 'Khá', 'Quý', 'Hiếm', 'Sử thi', 'Huyền thoại'];

/** Tổng trọng số mỗi bảng: weights tính theo phần nghìn, đúng thứ tự STONE_GEMS. */
export const STONE_WEIGHT_TOTAL = 1000;

// price 0 là đá miễn phí (lấy từ kho tích theo giờ). Đá đắt cứng hơn và thanh lực chạy nhanh hơn: chỉ đổi nhịp chơi,
// không đổi tiền thưởng, nên đập khéo hay vụng thì hoàn vốn của đá quý vẫn như nhau.
export const STONE_KINDS = [
  { key: 'thuong', name: 'Đá thường', price: 0, hp: 8, periodMs: 1300, color: '#8d877d', weights: [0, 700, 220, 70, 9, 1, 0] },
  { key: 'ngoc', name: 'Đá ngọc', price: 10, hp: 10, periodMs: 1100, color: '#5f8f78', weights: [280, 0, 300, 230, 130, 52, 8] },
  { key: 'linh', name: 'Linh thạch thô', price: 30, hp: 12, periodMs: 950, color: '#4b3f6b', weights: [300, 0, 0, 220, 250, 160, 70] },
];

export const STONE = {
  freeMax: 12, // Kho đá thường của mỗi người tích tối đa chừng này tảng.
  freeRegenMs: 3 * 60_000, // Mỗi 3 phút có thêm một tảng.
  startGapMs: 300, // Giãn cách tối thiểu giữa hai lần lấy đá.
  hitGapMs: 380, // Giãn cách tối thiểu giữa hai nhát (một lần vung búa).
  hitLagMs: 600, // Nhát đập được ghi lùi tối đa chừng này so với lúc server nhận (bù độ trễ mạng).
  hitLeadMs: 150, // Đồng hồ client ước lượng có thể nhanh hơn server chút ít.
  damage: { perfect: 3, good: 2, weak: 1 },
  perfectMin: 0.86, // Thanh lực từ đây tới đỉnh là Chuẩn.
  goodMin: 0.62, // Từ đây tới perfectMin là Khá; thấp hơn là Yếu.
  deftBonus: 1, // Đá thường: mọi nhát đều Chuẩn thì thêm chừng này TEU.
  shoutTier: 5, // Ra ngọc từ bậc này (Hồng ngọc) trở lên thì cả sân được báo tên.
};

export const GRADE_LABEL = { perfect: 'Chuẩn', good: 'Khá', weak: 'Yếu' };

/** Loại đá hợp lệ: số nguyên trong bảng. Không ép kiểu: chuỗi "1" bị loại. */
export const isStoneKind = (v) => Number.isInteger(v) && v >= 0 && v < STONE_KINDS.length;

/** Vị trí thanh lực (0..1) lúc t: bắt đầu ở 0 khi đặt đá, lên đỉnh giữa chu kỳ rồi về 0, lặp lại. */
export function powerAt(kind, startAt, t) {
  const period = STONE_KINDS[kind].periodMs;
  const phase = (((t - startAt) % period) + period) % period / period;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

export function hitGrade(power) {
  if (power >= STONE.perfectMin) return 'perfect';
  if (power >= STONE.goodMin) return 'good';
  return 'weak';
}

/** Số nhát ít nhất để vỡ một tảng (mọi nhát đều Chuẩn). */
export const minHits = (kind) => Math.ceil(STONE_KINDS[kind].hp / STONE.damage.perfect);

/** Số bốc được (0..999) -> id ngọc, theo dải trọng số liên tiếp của loại đá. */
export function gemAt(kind, roll) {
  const { weights } = STONE_KINDS[kind];
  let left = roll;
  for (let i = 0; i < weights.length; i++) {
    left -= weights[i];
    if (left < 0) return i;
  }
  return weights.length - 1;
}

/** Số bốc nhỏ nhất ra đúng ngọc gem từ loại đá kind (để test dựng sẵn kết quả). */
export function rollFor(kind, gem) {
  const { weights } = STONE_KINDS[kind];
  if (!weights[gem]) throw new Error(`Đá ${kind} không ra được ngọc ${gem}`);
  return weights.slice(0, gem).reduce((sum, w) => sum + w, 0);
}

/**
 * Chia tiền ngọc của một tảng đá quý theo kiểu TableStakeStore: returned là phần tiền mua được hoàn,
 * profit là lãi ròng, net là lãi/lỗ so với giá đá.
 */
export function stonePayout(kind, gem) {
  const price = STONE_KINDS[kind].price;
  const payout = STONE_GEMS[gem].teu;
  const profit = Math.max(0, payout - price);
  return { price, payout, returned: payout - profit, profit, net: payout - price };
}

/** Giá trị kỳ vọng một tảng và tỉ lệ hoàn vốn (đá miễn phí thì rtp là null). Dùng trong test và docs. */
export function expectedValue(kind) {
  const { weights, price } = STONE_KINDS[kind];
  const ev = weights.reduce((sum, w, i) => sum + (w / STONE_WEIGHT_TOTAL) * STONE_GEMS[i].teu, 0);
  return { ev, rtp: price > 0 ? ev / price : null };
}

/**
 * Kho đá thường lúc now, từ số đã lưu (saved) ở mốc savedAt. Kho đầy thì đồng hồ đứng; chưa đầy thì giữ phần
 * thời gian lẻ để tảng kế tiếp không bị tính lại từ đầu. Trả { stock, at, nextAt } với at là mốc lưu mới,
 * nextAt là lúc có tảng kế tiếp (0 khi đầy).
 */
export function freeStock(saved, savedAt, now) {
  const { freeMax, freeRegenMs } = STONE;
  if (saved >= freeMax) return { stock: freeMax, at: now, nextAt: 0 };
  const gained = Math.max(0, Math.floor((now - savedAt) / freeRegenMs));
  const stock = Math.min(freeMax, saved + gained);
  if (stock >= freeMax) return { stock, at: now, nextAt: 0 };
  const at = savedAt + gained * freeRegenMs;
  return { stock, at, nextAt: at + freeRegenMs };
}
