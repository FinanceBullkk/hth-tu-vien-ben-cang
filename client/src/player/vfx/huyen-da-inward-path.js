import { hash } from './aura-billboard-layer.js';
import { sstep } from './aura-rhythm.js';

// Đường hút xoáy chung của Huyền Dạ: lông quạ, khói mực và hạt sáng đều đi theo nó, từ một quỹ
// đạo rộng quanh thân (u = 0) xoắn ốc thu nhỏ dần rồi chìm vào tâm nhật thực sau đầu (u = 1).
// Mặt phẳng quỹ đạo xoay dần từ nằm ngang (quanh thân) sang dựng đứng (ôm mặt đĩa nhật thực).
// Vùng trước mặt được chừa trống: điểm nào ở phía trước lưng (z > BACK) mà gần trục mặt hơn
// FACE_CLEAR (theo x, y) thì bị đẩy ra ngoài — không nét nào đè ngang mặt hay xuyên qua đầu.
export const ECLIPSE = { x: 0, y: 1.5, z: -0.48 };
export const HEAD_Y = 1.07, FACE_CLEAR = 0.5;
const BACK = -0.42, TAU = Math.PI * 2;

/** Thông số cố định của hành trình thứ k (hạt giống seed). */
export function pathSeed(k, seed) {
  return { a0: hash(k + seed) * TAU, y0: 0.15 + 0.55 * hash(k + seed + 1), r0: 1.05 + 0.45 * hash(k + seed + 2),
    turns: 0.8 + 0.4 * hash(k + seed + 3) };
}

/** Vị trí ở tiến độ u (0..1) của hành trình p, cộng góc quay chung spin; ghi vào out ({x,y,z}). */
export function inwardPoint(p, u, spin, out) {
  const s = sstep(0.25, 1, u), m = sstep(0.4, 0.85, u);
  const cx = ECLIPSE.x * s, cy = p.y0 + (ECLIPSE.y - p.y0) * s, cz = ECLIPSE.z * sstep(0, 0.6, u);
  const r = p.r0 * Math.pow(1 - u, 1.1), th = p.a0 - p.turns * TAU * u + spin;
  const sx = Math.sin(th), cs = Math.cos(th);
  // Quỹ đạo nghiêng: nửa trước thấp (ngang hông), nửa sau cao, nên luôn đi qua dưới mặt; tâm xoáy chỉ
  // dâng lên đầu khi đã lùi ra sau lưng. Cuối hành trình mặt phẳng dựng đứng ôm đĩa nhật thực.
  out.x = cx + r * sx;
  out.y = Math.max(0.06, cy - r * cs * (0.6 * (1 - m) + m)); // không chui xuống đất
  out.z = cz + r * cs * (1 - m);
  return clearFace(out);
}

/** Đẩy điểm ra khỏi vùng trước mặt (xem chú thích đầu file); sửa và trả lại chính out. */
export function clearFace(out) {
  if (out.z > BACK) {
    const dx = out.x, dy = out.y - HEAD_Y, d = Math.hypot(dx, dy), w = sstep(BACK, -0.3, out.z);
    const push = Math.max(0, FACE_CLEAR - d) * w;
    if (push > 0) {
      const k = d > 1e-4 ? 1 / d : 0;
      out.x += (d > 1e-4 ? dx * k : 1) * push; out.y += dy * k * push;
    }
  }
  return out;
}

/** Độ hiện theo tiến độ: hiện dần khi xuất phát, tan hẳn khi chạm mép đĩa đen (bị nuốt). */
export const inwardFade = u => Math.min(1, u * 6) * (1 - sstep(0.5, 0.72, u));
