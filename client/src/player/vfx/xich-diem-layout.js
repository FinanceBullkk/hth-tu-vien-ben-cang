// Bố cục dùng chung của Xích Diễm Lưu Vân (effect 10) — Hỏa Vân Đài. Mọi khối nằm THẤP và RỘNG:
// đài mây lửa sát đất (cao dưới 0.6, rộng gần 3) và một vòng lửa nằm ngang quanh eo. Từ vai trở
// lên để trống. Mọi chuyển động là hàm thuần của thời gian với tốc độ cố định.

/** Chu kỳ nhịp thở (giây). */
export const XICH_DIEM_CYCLE = 11;
/** Tốc độ trôi vòng của cả đài mây (rad/giây, ngược chiều kim đồng hồ nhìn từ trên). */
export const DRIFT = 0.055;
/** Tâm đầu nhân vật và vùng chừa trống quanh mặt (giống quy ước Huyền Dạ). */
export const HEAD_Y = 1.07, FACE_CLEAR = 0.45;

// Vòng lửa ngang eo: mặt vòng nghiêng nhẹ (nửa trước thấp hơn nửa sau) để nhìn thấy độ cong, sóng
// lượn chạy quanh vòng với tốc độ cố định.
export const RING = { y: 0.55, r: 0.82, tilt: 0.06, wave: 0.04, lobes: 3, speed: 0.45, spin: 0.1 };

/** Điểm trên vòng eo tại góc th (0 = phía trước +z), ghi vào out. */
export function ringPoint(th, time, out, r = RING.r) {
  const y = RING.y - RING.tilt * Math.cos(th) + RING.wave * Math.sin(RING.lobes * th - time * RING.speed);
  return out.set(Math.sin(th) * r, y, Math.cos(th) * r);
}

// Đài mây: 16 cuộn tường vân 3D xếp hai vòng so le chồng mép nhau thành một bệ liền — vòng trong cuộn
// lớn, vòng ngoài cuộn nhỏ, một số cuộn lật gương để không lặp đều như nan quạt. Mặt cuộn xoay xéo
// TURN so với hướng toả ra (như mây cuộn xoáy theo chiều trôi) nên nhìn góc nào cũng ít cuộn bị
// thấy cạnh. a = góc gốc, r = bán kính, s = tỉ lệ, flip = lật.
export const TURN = 0.6;
export const CLOUDS = Array.from({ length: 16 }, (_, i) => ({
  a: i * Math.PI * 2 / 16 + (i % 2 ? 0.08 : 0),
  r: i % 2 ? 1.22 : 0.84,
  s: i % 2 ? 0.66 : 0.84,
  flip: i % 3 === 1 ? -1 : 1,
  lift: i % 2 ? 0 : 0.025,
}));

/** Hệ số nở của đài mây theo nhịp: hít vào gom lại nhẹ, thở ra toả rộng. */
export const spread = rhythm => 1 - 0.035 * rhythm.gather + 0.06 * rhythm.release;
