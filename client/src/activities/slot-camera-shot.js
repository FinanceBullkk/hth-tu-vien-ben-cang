// Góc máy khi đứng chơi máy gạt cần, theo lối góc nhìn thứ nhất như bàn tài xỉu / cò quay: máy ngang tầm mắt nhìn thẳng mặt máy.
// Thân mình được ẩn trên máy mình (activity lo) để không che ô cửa cuộn và cần gạt.
import { SLOT_ZONE, floorHeight } from '../../../shared/layout.js';

/**
 * Góc máy trước mặt máy i: ngang tầm mắt, ô cửa cuộn và bảng hiệu nằm nửa trên màn hình, chừa đáy cho HUD.
 * Màn dọc lùi xa hơn để thấy trọn bề ngang máy và cần gạt. Lắc rất nhẹ: đứng sát máy, lắc nhiều là lệch khỏi cuộn.
 */
export function slotShot(i, portrait = innerWidth < innerHeight) {
  const m = SLOT_ZONE.machines[i];
  const fx = Math.sin(m.rot);
  const fz = Math.cos(m.rot); // Hướng mặt máy.
  const y0 = floorHeight(m.x, m.z); // Máy đứng trên sàn hành lang, cao hơn mặt sân.
  const back = portrait ? 2.3 : 1.7;
  // Cần gạt nhô bên phải máy (trục +x cục bộ): dời khung hình lệch về phía cần để thấy trọn cả máy lẫn cần.
  const side = portrait ? 0.1 : 0.05;
  const cx = m.x + Math.cos(m.rot) * side;
  const cz = m.z - Math.sin(m.rot) * side;
  return {
    pos: { x: cx + fx * back, y: y0 + (portrait ? 1.55 : 1.5), z: cz + fz * back },
    look: { x: cx, y: y0 + (portrait ? 1.2 : 1.28), z: cz },
    sway: 0.12,
  };
}
