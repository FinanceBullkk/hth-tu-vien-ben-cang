// Thưởng thêm khi câu cá, dùng chung client + server: cá khủng, chuỗi câu đẹp và Giờ cá vàng.
// Server tính giá trị con cá bằng catchTeu (giá bán khi vào túi); client chỉ dùng để vẽ banner và ghi chú trên thẻ cá.
import { fishBasePrice } from './fish-catalog.js';
import { TEU } from './protocol.js';

// Giờ cá vàng: năm phút cuối của mỗi nửa giờ (theo đồng hồ server), cá cắn nhanh và trả gấp đôi.
// Tính thuần từ giờ nên không cần lưu, cả phòng thấy cùng một lúc mà không cần sự kiện riêng.
export const GOLDEN_HOUR = {
  periodMs: 30 * 60_000,
  durationMs: 5 * 60_000,
  teuFactor: 2,
  waitFactor: 0.7, // cá kéo tới sớm hơn
};

// Cá khủng: nặng từ chừng này phần quãng cân của loài trở lên thì TEU của con cá gấp đôi.
export const TROPHY = { ratio: 0.8, teuFactor: 2 };

// Chuỗi câu đẹp liên tiếp: đủ streak thì cộng thêm teu mỗi con (lấy mốc cao nhất đã chạm).
export const STREAK_STEPS = [{ streak: 2, teu: 1 }, { streak: 4, teu: 2 }, { streak: 6, teu: 3 }];

/** Còn bao lâu nữa Giờ cá vàng mở (0 nếu đang mở) và còn bao lâu thì đóng (0 nếu đang đóng). */
export function goldenHour(now) {
  const { periodMs, durationMs } = GOLDEN_HOUR;
  const t = ((now % periodMs) + periodMs) % periodMs;
  const opensAt = periodMs - durationMs;
  return t >= opensAt
    ? { on: true, endsIn: periodMs - t, startsIn: 0 }
    : { on: false, endsIn: 0, startsIn: opensAt - t };
}

export const isGoldenHour = (now) => goldenHour(now).on;

/** Đồ thất lạc có cân cố định nên không bao giờ là cá khủng. */
export function isTrophy(fish, weight) {
  if (!fish || fish.bait === null || !(fish.maxW > fish.minW)) return false;
  return weight >= fish.minW + (fish.maxW - fish.minW) * TROPHY.ratio;
}

export function streakBonus(streak) {
  let teu = 0;
  for (const step of STREAK_STEPS) if (streak >= step.streak) teu = step.teu;
  return teu;
}

/**
 * Giá bán (TEU) của một con cá, chốt ngay lúc kéo lên và ghi vào túi đồ (chưa gồm mốc Sổ cá và đơn hàng):
 * giá gốc theo loài và cân nặng, nhân cá khủng và Giờ cá vàng, cộng câu đẹp và chuỗi. Ít nhất 1 TEU.
 */
export function catchTeu({ fish, weight, perfect, trophy, golden, streak }) {
  const base = Math.round(fishBasePrice(fish, weight)
    * (trophy ? TROPHY.teuFactor : 1)
    * (golden ? GOLDEN_HOUR.teuFactor : 1));
  return Math.max(1, base + (perfect ? TEU.fishPerfectBonus : 0) + streakBonus(streak));
}
