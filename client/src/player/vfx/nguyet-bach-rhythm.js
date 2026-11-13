import { breathRhythm, sstep } from './aura-rhythm.js';

// Nhịp của Nguyệt Bạch Tri Âm — chu kỳ 16 giây: tụ khí → một tiếng gảy (dây ngân lên mềm trong
// khoảng một giây rồi tắt dần) → âm lắng. "Ngân" chỉ đổi BIÊN ĐỘ rung và độ đậm của sóng âm;
// tần số rung và tốc độ lan sóng luôn cố định — không có pha tăng tốc hay lóe gắt.
export const NGUYET_BACH_CYCLE = 16;
export const PLUCK_AT = 0.3;
const TAU = Math.PI * 2;

/** Độ ngân 0..1 tại thời điểm bất kỳ: lúc lắng vẫn còn ngân rất khẽ (0.18). Liên tục cả khi qua chu kỳ. */
export function humAt(time) {
  const phase = ((time / NGUYET_BACH_CYCLE) % 1 + 1) % 1;
  const pluck = sstep(PLUCK_AT - 0.06, PLUCK_AT, phase) * Math.exp(-Math.max(0, phase - PLUCK_AT) * 5.5) * (1 - sstep(0.88, 1, phase));
  return 0.18 + 0.82 * pluck;
}

/** Nhịp chung (breathRhythm) kèm độ ngân hiện tại. */
export function nguyetBachRhythm(time) {
  return { ...breathRhythm(time, NGUYET_BACH_CYCLE), hum: humAt(time) };
}

// Hai hoạ âm của dây: tần số cố định (Hz); biên độ = độ ngân × cực đại.
const F1 = 1.1, F2 = 1.75, MAX_AMP = 0.034;

/** Độ lệch ngang của dây k tại vị trí s (0 đuôi → 1 nhạc sơn), độ ngân hum. Dây trầm (k nhỏ) rung rộng hơn. */
export function stringOffset(k, s, time, hum) {
  const amp = MAX_AMP * hum * (1 - 0.35 * k / 6);
  return amp * (Math.sin(Math.PI * s) * Math.sin(TAU * F1 * time + k * 0.9)
    + 0.35 * Math.sin(TAU * s) * Math.sin(TAU * F2 * time + k * 1.3));
}

/** Tuổi (0..1) của gợn thứ k trong `count` gợn lan đều, mỗi gợn sống `life` giây. */
export const waveAge = (time, k, count, life) => ((time / life + k / count) % 1 + 1) % 1;
