// Góc máy cố định khi chơi ở bàn bầu cua / xì dách: đứng sau lưng phía khách, nhìn chéo xuống mặt bàn về phía nhà cái,
// giống góc "live dealer" của sòng bài: thấy nhà cái, đĩa/bài và mặt bàn ở nửa trên màn hình, nửa dưới chừa cho bảng cược.
// Máy đặt đủ cao để đầu nhân vật mình (đứng giữa máy và bàn) lọt xuống dưới khung, sau bảng cược.
// Hai bàn nằm giữa sân, phía trục chính trống nên không cần dò vật cản như hồ câu.

/** zone: BAUCUA_ZONE hoặc XIDACH_ZONE (có x, z và dealer.x, dealer.z). */
export function tableShot(zone, portrait = innerWidth < innerHeight) {
  const dx = zone.x - zone.dealer.x;
  const dz = zone.z - zone.dealer.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len; // Hướng từ nhà cái ra phía khách.
  const uz = dz / len;
  const back = portrait ? 3.9 : 2.75;
  const height = portrait ? 4.4 : 3.25;
  const lookY = portrait ? 0.15 : 0.45; // Tâm nhìn thấp hơn mặt bàn: bàn nằm trên giữa khung.
  return {
    pos: { x: zone.x + ux * back, y: height, z: zone.z + uz * back },
    look: { x: zone.x - ux * 0.05, y: lookY, z: zone.z - uz * 0.05 },
  };
}
