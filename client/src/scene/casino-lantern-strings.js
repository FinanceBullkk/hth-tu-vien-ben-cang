// Dây đèn lồng đỏ vắt ngang sân Kim Ngân Phường giữa các cột cờ son, cộng đèn treo ở cổng và Kim Ngân Lâu.
// Tất cả đèn dùng chung một InstancedMesh; material trả về để World làm sáng dần khi đêm xuống.
import * as THREE from 'three';
import { CASINO_POLES } from '../../../shared/layout.js';
import { PALACE } from './palace-kit.js';

const POLE_H = 6.4;
const STRING_TOP = 6.0;
const STRING_SAG = 0.9;
const LANTERN_GAP = 2.6;

/** Cột cờ son đế đá, đỉnh hồ lô vàng. */
function buildPoles(b) {
  for (const p of CASINO_POLES) {
    b.box(0.5, 0.36, 0.5, PALACE.marble, p.x, 0.18, p.z);
    b.cyl(p.r * 0.6, p.r * 0.8, POLE_H, PALACE.red, p.x, POLE_H / 2 + 0.3, p.z, { seg: 8 });
    b.add(new THREE.IcosahedronGeometry(0.16, 1), PALACE.gold, { x: p.x, y: POLE_H + 0.4, z: p.z });
  }
}

/** Mỗi cặp cột cùng z nối một dây võng; trả về vị trí từng đèn treo trên dây. */
function buildStrings(b) {
  const lanterns = [];
  const byZ = new Map();
  for (const p of CASINO_POLES) byZ.set(p.z, [...(byZ.get(p.z) ?? []), p]);
  for (const [z, pair] of byZ) {
    const [a, c] = pair.sort((p, q) => p.x - q.x);
    const len = c.x - a.x;
    const yAt = (t) => STRING_TOP - STRING_SAG * 4 * t * (1 - t);
    const seg = 24;
    for (let i = 0; i < seg; i++) {
      const t0 = i / seg;
      const t1 = (i + 1) / seg;
      const y0 = yAt(t0);
      const y1 = yAt(t1);
      const piece = len / seg;
      b.box(Math.hypot(piece, y1 - y0), 0.025, 0.025, PALACE.redDark, a.x + len * (t0 + t1) / 2, (y0 + y1) / 2, z, {
        rz: Math.atan2(y1 - y0, piece), jitter: 0,
      });
    }
    const n = Math.floor(len / LANTERN_GAP);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      lanterns.push([a.x + len * t, yAt(t) - 0.42, z]);
    }
  }
  return lanterns;
}

/** Đèn lồng sáu cạnh đỏ, mũ và tua vàng. positions: [x, y, z] tâm đèn. */
function buildLanternMesh(scene, b, positions) {
  const geo = new THREE.CylinderGeometry(0.17, 0.17, 0.4, 6, 1);
  geo.scale(1.3, 1, 1.3);
  const mat = new THREE.MeshLambertMaterial({ color: 0xb3241a, emissive: 0xff4a1e, emissiveIntensity: 0.3, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
  const m = new THREE.Matrix4();
  positions.forEach(([x, y, z], i) => {
    m.setPosition(x, y, z);
    mesh.setMatrixAt(i, m);
    b.cyl(0.14, 0.22, 0.08, PALACE.gold, x, y + 0.24, z, { seg: 6 });
    b.cyl(0.22, 0.14, 0.06, PALACE.gold, x, y - 0.23, z, { seg: 6 });
    b.box(0.015, 0.24, 0.015, PALACE.gold, x, y - 0.38, z, { jitter: 0 });
  });
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mat;
}

/** Dựng cột, dây và toàn bộ đèn (gồm extraLanterns của cổng và lầu). Trả về material đèn. */
export function buildCasinoLanterns(scene, b, extraLanterns = []) {
  buildPoles(b);
  const positions = [...buildStrings(b), ...extraLanterns];
  return buildLanternMesh(scene, b, positions);
}
