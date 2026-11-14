import * as THREE from 'three';
import { tableSealTexture } from './than-bai-textures.js';

// Nền đất Thần bài: TRẬN BÀN SÒNG — vành ô đỏ đen như cò quay, bốn chất bài, chữ 賭神財運,
// xoay rất chậm như bàn quay sắp dừng. Lớp sơn (normal blend) cho màu đỏ đen đọc được trên nền sáng;
// lớp ánh vàng cộng màu chỉ có ở chất lượng đủ và sáng lên theo nhịp.
const SIZE = 3.0;

export function createThanBaiGround(parent, colors, lowQuality) {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE), map = tableSealTexture(), layers = [];
  for (const glow of lowQuality ? [0] : [0, 1]) {
    const material = new THREE.MeshBasicMaterial({
      map, color: glow ? colors.gold : 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: 0,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = glow ? 'than-bai-table-seal-glow' : 'than-bai-table-seal';
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.012 + glow * 0.004; mesh.renderOrder = 1 + glow;
    parent.add(mesh);
    layers.push({ mesh, material, glow });
  }
  return {
    update(time, rhythm, f) {
      for (const { mesh, material, glow } of layers) {
        mesh.rotation.z = time * 0.06;
        material.opacity = (glow ? 0.18 + 0.32 * rhythm.pulse : 0.62) * f;
      }
    },
    dispose() { geo.dispose(); layers.forEach(l => l.material.dispose()); },
  };
}
