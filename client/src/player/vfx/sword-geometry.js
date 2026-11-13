import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Thanh kiếm 3D dùng chung cho Kiếm Vũ: lưỡi hai cạnh có sống giữa (mặt cắt hình thoi),
// thuôn nhẹ về mũi rồi vát nhọn; chắn tay, chuôi, núm. Mũi hướng +y, gốc toạ độ ở chắn
// tay, lưỡi dài 1. Thuộc tính `part`: 0→1 dọc lưỡi (gốc → mũi), -1 cho chắn/chuôi/núm —
// shader dùng nó để chạy luồng sáng dọc lưỡi mà không làm sáng chuôi.
const BLADE_W = 0.085, BLADE_T = 0.022, TIP_START = 0.8;

function bladeGeometry(rings) {
  const pos = [], part = [];
  const ring = y => {
    const narrow = 1 - 0.22 * y;
    const tip = y > TIP_START ? 1 - (y - TIP_START) / (1 - TIP_START) : 1;
    const w = BLADE_W * narrow * Math.pow(tip, 0.85), t = BLADE_T * narrow * Math.max(tip, 0.25);
    return [[w, y, 0], [0, y, t], [-w, y, 0], [0, y, -t]];
  };
  for (let i = 0; i < rings; i++) {
    const y0 = i / rings, y1 = (i + 1) / rings, a = ring(y0), b = ring(y1);
    for (let k = 0; k < 4; k++) {
      const n = (k + 1) % 4;
      for (const [p, v] of [[a[k], y0], [b[k], y1], [b[n], y1], [a[k], y0], [b[n], y1], [a[n], y0]]) {
        pos.push(...p); part.push(v);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('part', new THREE.Float32BufferAttribute(part, 1));
  g.computeVertexNormals();
  return g;
}

// part = -1: đồ đồng (chắn, chuôi, núm, cuộn mây) mạ vàng; -2: viên ngọc giữa chắn.
function fitting(geo, x, y, z, part = -1, rz = 0) {
  if (rz) geo.rotateZ(rz);
  geo.translate(x, y, z);
  const flat = geo.index ? geo.toNonIndexed() : geo;
  if (flat !== geo) geo.dispose();
  flat.deleteAttribute('uv');
  flat.setAttribute('part', new THREE.Float32BufferAttribute(new Float32Array(flat.attributes.position.count).fill(part), 1));
  return flat;
}

let cached = null;
/** Hình học kiếm dùng chung giữa mọi nhân vật — KHÔNG dispose từ nơi dùng. */
export function swordGeometry() {
  if (cached) return cached;
  const pieces = [
    bladeGeometry(12),
    // Chắn tay cong như cánh mây: thân giữa + hai cuộn xoắn ở đầu, ngọc ở tâm.
    fitting(new THREE.BoxGeometry(0.2, 0.03, 0.05), 0, -0.016, 0),
    fitting(new THREE.TorusGeometry(0.04, 0.011, 4, 10, Math.PI * 1.5), 0.13, 0.012, 0, -1, -Math.PI * 0.25),
    fitting(new THREE.TorusGeometry(0.04, 0.011, 4, 10, Math.PI * 1.5), -0.13, 0.012, 0, -1, Math.PI * 1.75),
    fitting(new THREE.OctahedronGeometry(0.03), 0, -0.012, 0.022, -2),
    fitting(new THREE.OctahedronGeometry(0.03), 0, -0.012, -0.022, -2),
    // Chuôi quấn ba đốt + núm hình hoa.
    fitting(new THREE.CylinderGeometry(0.019, 0.023, 0.19, 6), 0, -0.13, 0),
    ...[-0.07, -0.13, -0.19].map(y => fitting(new THREE.TorusGeometry(0.024, 0.006, 3, 8).rotateX(Math.PI / 2), 0, y, 0)),
    fitting(new THREE.OctahedronGeometry(0.04), 0, -0.255, 0),
    fitting(new THREE.TorusGeometry(0.03, 0.007, 3, 10), 0, -0.29, 0),
  ];
  cached = mergeGeometries(pieces);
  pieces.forEach(p => p.dispose());
  cached.computeBoundingSphere();
  return cached;
}
