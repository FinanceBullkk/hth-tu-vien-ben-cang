// Góc máy khi ngồi ở bàn tài xỉu / cò quay, theo lối góc nhìn thứ nhất: máy ngang tầm mắt ngay chỗ đứng, nhìn xuống
// mặt bàn; thân mình được ẩn trên máy mình (người khác vẫn thấy) để không che bàn.
// Màn dọc hẹp ngang nên nâng máy cao, nhìn gần như thẳng xuống mặt bạt để ô số đủ to cho ngón tay.

/** zone: TAIXIU_ZONE hoặc COQUAY_ZONE (có x, z và seat.x, seat.z). Trả { pos, look } cho FollowCamera.shot. */
export function casinoSeatShot(zone, portrait = innerWidth < innerHeight) {
  const dx = zone.seat.x - zone.x;
  const dz = zone.seat.z - zone.z;
  const len = Math.hypot(dx, dz);
  const ux = dx / len; // Hướng từ tâm bàn ra chỗ khách đứng.
  const uz = dz / len;
  const at = (d, y) => ({ x: zone.x + ux * d, y, z: zone.z + uz * d });
  if (portrait) return { pos: at(1.75, 4.1), look: at(0.12, 0.8) };
  return { pos: at(len + 0.3, 1.95), look: at(-0.1, 0.7) };
}
