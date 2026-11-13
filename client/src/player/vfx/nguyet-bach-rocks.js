import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash } from './aura-billboard-layer.js';
import { solidMaterial } from './nguyet-bach-materials.js';

// Thạch đài: cụm đá tảng lởm chởm nhô lên khỏi gương nước quanh chân cổ cầm, một khối đá Thái Hồ
// cao dựng sau đàn — làm nền cho cây đàn đứng, khối đậm normal-blend có viền bạc bắt trăng.
// Hình mặt cắt góc cạnh (đỉnh dịch theo hàm băm của chính toạ độ nên các mặt vẫn khít nhau).
const STONES = [ // x, z, rộng, cao, sâu, hạt giống
  [-1.12, -0.86, 0.34, 0.95, 0.3, 1], [-0.62, -0.4, 0.22, 0.26, 0.2, 2], [-1.2, -0.48, 0.3, 0.4, 0.26, 3],
  [-0.92, -0.2, 0.16, 0.14, 0.15, 4], [-0.5, -0.78, 0.18, 0.32, 0.16, 5],
];

function stoneGeometry(seed) {
  const geo = new THREE.IcosahedronGeometry(1, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 0.72 + 0.42 * hash(Math.round(x * 50) * 7 + Math.round(y * 50) * 13 + Math.round(z * 50) * 17 + seed * 101);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  geo.deleteAttribute('uv');
  return geo;
}

export function createRocks(parent, colors, lowQuality) {
  const parts = STONES.map(([x, z, w, h, d, seed]) => {
    const g = stoneGeometry(seed); g.scale(w, h, d); g.rotateY(seed * 1.3); g.translate(x, h * 0.45, z); return g;
  });
  const geometry = mergeGeometries(parts); parts.forEach(g => g.dispose());
  geometry.computeVertexNormals();
  const body = solidMaterial(colors, 1, { base: new THREE.Color('#39435e') }), rim = lowQuality ? null : solidMaterial(colors, 0);
  const stone = new THREE.Mesh(geometry, body); stone.name = 'nguyet-bach-rocks'; stone.renderOrder = 3; parent.add(stone);
  if (rim) { const glow = new THREE.Mesh(geometry, rim); glow.name = 'nguyet-bach-rocks'; glow.renderOrder = 4; parent.add(glow); }
  return {
    update(time, rhythm, f) {
      body.uniforms.opacity.value = 0.95 * f;
      if (rim) { rim.uniforms.opacity.value = 0.7 * f; rim.uniforms.glow.value = 0.3 + 0.4 * rhythm.hum; }
    },
    dispose() { geometry.dispose(); body.dispose(); rim?.dispose(); },
  };
}
