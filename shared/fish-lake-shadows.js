// Bóng cá trên hồ: tính thuần từ giờ server nên mọi máy thấy cùng một bóng mà không tốn băng thông.
// Mỗi "làn" sinh một bóng cho từng khung thời gian; bóng to hiếm hơn và cho cá quý hơn.
import { LAKE, lakeEdgeRadius } from './layout.js';

export const LAKE_SHADOW = {
  lanes: 7,
  periodMs: 40000,
  catchRadius: 1.5, // phao rơi trong chừng này quanh bóng thì bóng đó cắn câu
};

export const SHADOW_SIZES = {
  s: { label: 'Bóng nhỏ', scale: 0.8, share: 0.55 },
  m: { label: 'Bóng vừa', scale: 1.35, share: 0.33 },
  l: { label: 'Bóng lớn', scale: 2.2, share: 0.12 },
};

function hash01(a, b) {
  let h = (Math.imul(a + 1, 2654435761) ^ Math.imul(b + 1, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 3266489917) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

function shadowOfLane(lane, now) {
  const { periodMs, lanes } = LAKE_SHADOW;
  const shifted = now + (lane * periodMs) / lanes; // lệch pha để bóng không cùng biến mất một lúc
  const slot = Math.floor(shifted / periodMs);
  const life = (shifted - slot * periodMs) / periodMs;
  const angle = hash01(lane, slot) * Math.PI * 2;
  const reach = lakeEdgeRadius(angle) * (0.2 + hash01(lane + 40, slot) * 0.45);
  const roll = hash01(lane + 80, slot);
  const size = roll < SHADOW_SIZES.s.share ? 's' : roll < SHADOW_SIZES.s.share + SHADOW_SIZES.m.share ? 'm' : 'l';
  // Bơi chậm thành vòng nhỏ quanh một điểm, đủ để phải ngắm lại nhưng không chạy khỏi tầm quăng.
  const swim = life * Math.PI * 2 * (hash01(lane + 120, slot) < 0.5 ? 1 : -1) + angle;
  return {
    id: `${lane}:${slot}`,
    size,
    expiresAt: (slot + 1) * periodMs - (lane * periodMs) / lanes,
    x: LAKE.x + Math.sin(angle) * reach + Math.sin(swim) * 0.9,
    z: LAKE.z + Math.cos(angle) * reach + Math.cos(swim) * 0.9,
    heading: swim + (hash01(lane + 120, slot) < 0.5 ? Math.PI / 2 : -Math.PI / 2),
    alpha: Math.min(1, Math.min(life, 1 - life) * 8), // hiện dần, mờ dần ở hai đầu khung
  };
}

export function shadowsAt(now) {
  return Array.from({ length: LAKE_SHADOW.lanes }, (_, lane) => shadowOfLane(lane, now));
}

/** Bóng còn trống gần điểm (x, z) nhất, ưu tiên bóng to khi trùng tầm. taken có .has(id). */
export function shadowNear(now, x, z, taken) {
  let best = null;
  for (const shadow of shadowsAt(now)) {
    if (taken?.has(shadow.id)) continue;
    if (Math.hypot(shadow.x - x, shadow.z - z) > LAKE_SHADOW.catchRadius) continue;
    if (!best || SHADOW_SIZES[shadow.size].scale > SHADOW_SIZES[best.size].scale) best = shadow;
  }
  return best;
}
