// Chọn góc máy khi câu cá: sau vai nhìn ra giữa hồ, nhưng đứng ở đâu quanh hồ cũng có vật cản khác nhau
// (bảo tháp, cây, cờ, tường rào), nên thử lần lượt nhiều vị trí và lấy chỗ đầu tiên không vướng gì.
import { COURT_TREES, CIRCLES, LAKE, NONBO, STONE_LANTERNS, cameraSegmentT } from '../../../shared/layout.js';

const TREE_MARGIN = 1.8; // tán cây rộng hơn nhiều so với vòng va chạm của gốc
const OTHER_MARGIN = 0.9;
const SIDE_ANGLES = [0.33, -0.33, 0.7, -0.7, 1.1, -1.1, 1.5, -1.5];
const DISTANCE_STEPS = [1, 0.78, 0.6];
const SEGMENT_SAMPLES = 6;
const MIN_LOOK_AHEAD = 0.45; // luôn chừa nhiều mặt nước trong khung vì người chơi phải chạm vào đó

const sameSpot = (list, c) => list.some((t) => t.x === c.x && t.z === c.z);
const isTree = (c) => sameSpot(COURT_TREES, c);
// Máy đặt cao hơn đầu người nên vật thấp không chắn: bỏ mặt hồ, đèn đá, non bộ. Bảng tên ngang tầm mắt vẫn phải né.
const isLow = (c) => LAKE.lobes.includes(c) || sameSpot(STONE_LANTERNS, c) || sameSpot(NONBO, c);
const OBSTACLES = CIRCLES
  .filter((c) => !isLow(c))
  .map((c) => ({ x: c.x, z: c.z, clear: c.r + (isTree(c) ? TREE_MARGIN : OTHER_MARGIN) }));

const nearObstacle = (x, z) => OBSTACLES.some((c) => Math.hypot(x - c.x, z - c.z) < c.clear);

/** Máy tại (px, pz) có nhìn được tới người đứng ở (x, z) không. Bỏ đoạn sát người: họ đứng cạnh gì cũng được. */
function clearView(x, z, px, pz) {
  if (cameraSegmentT(x, z, px, pz) < 1) return false;
  for (let i = 2; i <= SEGMENT_SAMPLES; i++) {
    const t = i / SEGMENT_SAMPLES;
    if (nearObstacle(x + (px - x) * t, z + (pz - z) * t)) return false;
  }
  return true;
}

/** fallback: true khi không tìm được chỗ nào, đặt máy cao sau đầu. */
export function lakeShot(x, z, portrait = innerWidth < innerHeight) {
  const len = Math.hypot(LAKE.x - x, LAKE.z - z) || 1;
  const ux = (LAKE.x - x) / len;
  const uz = (LAKE.z - z) / len;
  const back = portrait ? 5.6 : 4.2;
  const ahead = portrait ? 2.6 : 4.5;
  for (const scale of DISTANCE_STEPS) {
    for (const a of SIDE_ANGLES) {
      const px = x - (ux * Math.cos(a) - uz * Math.sin(a)) * back * scale;
      const pz = z - (uz * Math.cos(a) + ux * Math.sin(a)) * back * scale;
      if (!clearView(x, z, px, pz)) continue;
      // Máy càng đứng lệch sang bên thì càng phải nhìn gần lại, nếu không người câu rơi khỏi khung.
      const reach = ahead * Math.max(MIN_LOOK_AHEAD, Math.cos(a) ** 2);
      return {
        pos: { x: px, y: (portrait ? 4.2 : 2.9) * (0.75 + scale * 0.25), z: pz },
        look: { x: x + ux * reach, y: 0.1, z: z + uz * reach },
        fallback: false,
      };
    }
  }
  return {
    pos: { x: x - ux * 2, y: 4.4, z: z - uz * 2 },
    look: { x: x + ux * 2, y: 0.1, z: z + uz * 2 },
    fallback: true,
  };
}
