import * as THREE from 'three';

// Giọt lưu ly 3D dùng chung (Lưu Ly Vân Thủy): đáy tròn ở gốc toạ độ, đầu nhọn hướng +y, dài 1.
// Tiện tám mặt rồi tách đỉnh để mỗi mặt phẳng phản quang riêng như kính mài. Dùng chung mọi
// nhân vật và cả tòa ngồi thiền — không bao giờ dispose.
let cached = null;

export function dropGeometry() {
  if (cached) return cached;
  const R = 0.3, BULB = 0.32, profile = [];
  for (let i = 0; i <= 12; i++) {
    const y = i / 12;
    // Nửa dưới: cung tròn bầu giọt; nửa trên: thuôn cong về mũi nhọn.
    const r = y <= BULB ? R * Math.sqrt(Math.max(0, 1 - ((y - BULB) / BULB) ** 2))
      : R * Math.pow(1 - (y - BULB) / (1 - BULB), 1.35);
    profile.push(new THREE.Vector2(Math.max(r, i === 0 || i === 12 ? 0 : 0.002), y));
  }
  const lathe = new THREE.LatheGeometry(profile, 8);
  cached = lathe.toNonIndexed();
  lathe.dispose();
  cached.computeVertexNormals();
  cached.computeBoundingSphere();
  return cached;
}
