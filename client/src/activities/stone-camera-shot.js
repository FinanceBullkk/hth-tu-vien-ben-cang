// Góc máy khi đứng đập đá, cùng kiểu góc máy cố định của máy gạt cần (slot-camera-shot.js).
import { STONE_YARD } from '../../../shared/layout.js';

/**
 * Góc máy trước đe i: đứng sau đe hơi lệch trái (búa ở bên phải) nhìn chéo xuống tảng đá; thân mình được ẩn để không che.
 * Màn dọc lùi xa và cao hơn để thấy trọn đe, búa và chỗ ngọc bay lên.
 */
export function stoneShot(i, portrait = innerWidth < innerHeight) {
  const s = STONE_YARD.spots[i];
  const back = portrait ? 2.6 : 2;
  return {
    pos: { x: s.x - 0.3, y: portrait ? 2.5 : 2.15, z: s.z + back },
    look: { x: s.x, y: 0.8, z: s.z },
    sway: 0.1,
  };
}
