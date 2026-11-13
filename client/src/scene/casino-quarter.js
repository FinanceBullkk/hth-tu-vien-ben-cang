// Kim Ngân Phường (khu sòng phía tây): tường bao thân vôi gờ son, cột cổng sơn son, Tụ Bảo Bồn giữa lối.
// Hộp va chạm lấy từ CASINO_WALLS / CASINO_GATE_POSTS / TREASURE_BASIN trong shared/layout.js
// nên hình và va chạm luôn khớp nhau.
import * as THREE from 'three';
import { CASINO, CASINO_GATE_POSTS, CASINO_WALLS, TREASURE_BASIN } from '../../../shared/layout.js';
import { Batch, flatMaterial } from './builders.js';

const PLASTER = '#eee0bf';
const CAP_RED = '#8e2b1f';
const PILLAR_RED = '#a3341f';
const STONE = '#b8ac90';
const BRONZE = '#9c6b2f';
const GOLD = '#e2b23c';

function buildWalls(b) {
  const top = CASINO.wallTop;
  for (const w of CASINO_WALLS) {
    const sx = w.maxX - w.minX;
    const sz = w.maxZ - w.minZ;
    const cx = (w.minX + w.maxX) / 2;
    const cz = (w.minZ + w.maxZ) / 2;
    b.box(sx, top - 0.2, sz, PLASTER, cx, (top - 0.2) / 2, cz, { jitter: 0.02 });
    b.box(sx + 0.3, 0.3, sz + 0.3, CAP_RED, cx, top - 0.15, cz);
  }
  for (const p of CASINO_GATE_POSTS) {
    b.cyl(p.r + 0.14, p.r + 0.18, 0.3, STONE, p.x, 0.15, p.z);
    b.cyl(p.r - 0.04, p.r, 3.4, PILLAR_RED, p.x, 1.85, p.z);
  }
}

/** Tụ Bảo Bồn: bệ đá, chậu đồng miệng loe, ụ vàng thỏi nhô lên miệng chậu. */
function buildTreasureBasin(b) {
  const { x, z, r } = TREASURE_BASIN;
  b.cyl(r, r + 0.1, 0.36, STONE, x, 0.18, z, { seg: 12 });
  b.cyl(r * 0.6, r * 0.66, 0.3, BRONZE, x, 0.5, z, { seg: 10 });
  b.cyl(r * 0.95, r * 0.62, 0.72, BRONZE, x, 1.0, z, { seg: 12 });
  b.cyl(r * 1.0, r * 0.97, 0.1, GOLD, x, 1.38, z, { seg: 12 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const d = i === 0 ? 0 : r * 0.45;
    b.add(new THREE.IcosahedronGeometry(i === 0 ? 0.42 : 0.28, 0), GOLD, {
      x: x + Math.sin(a) * d, y: i === 0 ? 1.6 : 1.42, z: z + Math.cos(a) * d, sy: 0.7, ry: a,
    });
  }
}

export function createCasinoQuarter(scene) {
  const b = new Batch(131);
  buildWalls(b);
  buildTreasureBasin(b);
  const mesh = b.build(flatMaterial());
  scene.add(mesh);
  return mesh;
}
