import * as THREE from 'three';

// Khung đôi cánh chu tước dùng chung cho lông cánh, quầng cánh, mép lửa và lông rụng của Hồng Liên.
// Cánh GIANG NGANG thành chữ V rộng: gốc sau vai, cánh tay chếch 66° so với phương đứng, ngọn lông
// bay vươn tới ~2.3 m mỗi bên; chỉ ngả về sau một chút (yaw) để nhìn chính diện vẫn thấy sải rộng.
// Động từ chính là VỖ CÁNH rất chậm: mỗi chu kỳ 14 giây hạ cánh ~23° rồi nâng lại theo cosin mềm —
// vận tốc là hình sin trơn, không có pha giật hay tăng tốc.
export const HONG_LIEN_CYCLE = 14;
export const WING = { rootX: 0.2, rootY: 1.32, rootZ: -0.3, yaw: 0.26, arm: 1.0, base: 1.12, stroke: 0.4 };

/** Góc cánh tay (rad so với phương đứng) và độ lệch khỏi tư thế gốc tại thời điểm time. */
export function wingStroke(time) {
  const phase = ((time / HONG_LIEN_CYCLE) % 1 + 1) % 1;
  const down = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2); // 0 cánh nâng → 1 cánh hạ thấp nhất
  return { phase, down, armA: WING.base + WING.stroke * down, delta: WING.stroke * down };
}

const euler = new THREE.Euler(), quat = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), root = new THREE.Vector3();
/** Ma trận khung cánh (gốc vai + ngả sau) của bên side (-1 trái, +1 phải). */
export function wingMatrix(side, out) {
  euler.set(0, side * WING.yaw, 0); quat.setFromEuler(euler);
  return out.compose(root.set(side * WING.rootX, WING.rootY, WING.rootZ), quat, one);
}

/** Điểm ở vị trí s (0 gốc → 1 cổ tay) dọc cánh tay, trong toạ độ khung cánh. */
export function armPoint(side, s, armA, out) {
  const d = s * WING.arm;
  return out.set(side * Math.sin(armA) * d, Math.cos(armA) * d, 0);
}

// Lông cánh (bên phải, khung cánh ở tư thế gốc): [vị trí dọc cánh tay s, góc so với phương đứng (rad), dài, lệch z].
// Lông bay xoè ngang-lên ở đầu cánh, lông giữa rủ ra-xuống dọc cánh tay, lông phủ ngắn nằm trên.
export const PRIMARIES = Array.from({ length: 7 }, (_, i) => [0.62 + i * 0.065, 0.7 + i * 0.15, 1.55 - i * 0.07, 0]);
export const SECONDARIES = Array.from({ length: 7 }, (_, i) => [0.08 + i * 0.09, 2.3 - i * 0.1, 1.0 - i * 0.02, -0.02]);
export const COVERTS = Array.from({ length: 6 }, (_, i) => [0.12 + i * 0.12, 1.95 - i * 0.08, 0.5, 0.035]);
