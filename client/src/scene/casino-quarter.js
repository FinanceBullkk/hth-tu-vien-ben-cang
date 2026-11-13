// Kim Ngân Phường (khu sòng phía tây): tường son mũ lưu ly vàng, hai cổng bài lâu, thảm đỏ viền vàng dọc lối giữa,
// Tụ Bảo Bồn có nguyên bảo vàng bay vòng, Kim Ngân Lâu và dây đèn lồng đỏ. Tông vàng–đỏ tương phản với nội viện xanh ngọc.
// Hộp va chạm lấy từ CASINO_WALLS / CASINO_GATE_POSTS / TREASURE_BASIN / CASINO_HALL trong shared/layout.js
// nên hình và va chạm luôn khớp nhau.
import * as THREE from 'three';
import { CASINO, CASINO_HALL, CASINO_WALLS, TREASURE_BASIN } from '../../../shared/layout.js';
import { Batch, flatMaterial } from './builders.js';
import { buildGoldenPavilion } from './casino-golden-pavilion.js';
import { buildCasinoLanterns } from './casino-lantern-strings.js';
import { PALACE, bracketBand, palacePlaque, palaceRoof, redColumn } from './palace-kit.js';

const CARPET_RED = '#7d2620';
const INGOTS = 6;

function buildWalls(b) {
  const top = CASINO.wallTop;
  for (const w of CASINO_WALLS) {
    const sx = w.maxX - w.minX;
    const sz = w.maxZ - w.minZ;
    const cx = (w.minX + w.maxX) / 2;
    const cz = (w.minZ + w.maxZ) / 2;
    b.box(sx, top - 0.3, sz, PALACE.wallRed, cx, (top - 0.3) / 2, cz, { jitter: 0.02 });
    b.box(sx + 0.1, 0.36, sz + 0.1, '#8f8b80', cx, 0.18, cz);
    b.box(sx + 0.36, 0.14, sz + 0.36, PALACE.goldTileDark, cx, top - 0.24, cz);
    b.box(sx + 0.1, 0.2, sz + 0.1, PALACE.goldTile, cx, top - 0.08, cz);
    b.box(sx, 0.07, sz, PALACE.ridgeRed, cx, top + 0.05, cz);
  }
}

/**
 * Cổng bài lâu hai cột son, lanh tô, đấu củng, mái lưu ly vàng; biển ngoài "Kim Ngân Phường", trong "Phát Tài".
 * along: trục chạy dọc tường ('x' hoặc 'z'); out: hướng ra ngoài sòng (+1/-1 theo trục còn lại).
 * Trả về vị trí hai đèn lồng treo dưới lanh tô.
 */
function buildGate(group, b, { cx, cz, half, along, out }) {
  const alongZ = along === 'z';
  const ry = alongZ ? Math.PI / 2 : 0;
  const post = (o) => (alongZ ? [cx, cz + o] : [cx + o, cz]);
  for (const s of [-1, 1]) {
    const [px, pz] = post(s * half);
    redColumn(b, px, pz, 5.0, 0, 0.3);
  }
  b.box(half * 2 + 0.7, 0.4, 0.42, PALACE.redDark, cx, 4.1, cz, { ry });
  b.box(half * 2 + 0.4, 0.22, 0.36, PALACE.red, cx, 3.35, cz, { ry });
  bracketBand(b, half * 2 + 0.9, cx, 4.62, cz, { ry, depth: 0.5 });
  palaceRoof(b, half * 2 + 2.2, 2.4, 1.4, cx, 4.95, cz, { ry, gold: true, lift: 0.55 });
  // Biển treo giữa hai lanh tô, mỗi mặt một biển.
  const offset = 0.25; // Biển nổi trước mặt lanh tô (sâu 0.21) để không chập hình.
  const outer = alongZ ? [cx + out * offset, cz] : [cx, cz + out * offset];
  const inner = alongZ ? [cx - out * offset, cz] : [cx, cz - out * offset];
  const faceOut = alongZ ? (out > 0 ? Math.PI / 2 : -Math.PI / 2) : (out > 0 ? 0 : Math.PI);
  palacePlaque(group, 'Kim Ngân Phường', 3.2, 0.62, outer[0], 3.73, outer[1], faceOut);
  palacePlaque(group, 'Phát Tài', 2.0, 0.62, inner[0], 3.73, inner[1], faceOut + Math.PI);
  return [-1, 1].map((s) => {
    const [px, pz] = post(s * (half - 0.9));
    return alongZ ? [px + out * 0.1, 2.85, pz] : [px, 2.85, pz + out * 0.1];
  });
}

/** Thảm đỏ viền vàng dọc lối giữa từ cổng nam tới thềm Kim Ngân Lâu, vòng tròn lát vàng quanh Tụ Bảo Bồn. */
function buildCarpet(b) {
  const x = CASINO.aisleX;
  const z0 = CASINO_HALL.z + CASINO_HALL.halfD + 0.4;
  const z1 = CASINO.maxZ - 0.3;
  const len = z1 - z0;
  const zc = (z0 + z1) / 2;
  b.box(3.2, 0.02, len, CARPET_RED, x, 0.045, zc, { jitter: 0 });
  for (const s of [-1, 1]) b.box(0.14, 0.022, len, PALACE.gold, x + s * 1.53, 0.047, zc, { jitter: 0 });
  const { z } = TREASURE_BASIN;
  b.cyl(3.1, 3.1, 0.02, PALACE.gold, x, 0.048, z, { seg: 32, jitter: 0 });
  b.cyl(2.85, 2.85, 0.02, CARPET_RED, x, 0.05, z, { seg: 32, jitter: 0 });
}

/** Tụ Bảo Bồn: bệ đá, chậu đồng miệng loe, ụ vàng thỏi nhô lên miệng chậu. */
function buildTreasureBasin(b) {
  const { x, z, r } = TREASURE_BASIN;
  b.cyl(r, r + 0.1, 0.36, PALACE.marbleShade, x, 0.18, z, { seg: 12 });
  b.cyl(r * 0.6, r * 0.66, 0.3, '#9c6b2f', x, 0.5, z, { seg: 10 });
  b.cyl(r * 0.95, r * 0.62, 0.72, '#9c6b2f', x, 1.0, z, { seg: 12 });
  b.cyl(r * 1.0, r * 0.97, 0.1, PALACE.gold, x, 1.38, z, { seg: 12 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const d = i === 0 ? 0 : r * 0.45;
    b.add(new THREE.IcosahedronGeometry(i === 0 ? 0.42 : 0.28, 0), PALACE.gold, {
      x: x + Math.sin(a) * d, y: i === 0 ? 1.6 : 1.42, z: z + Math.cos(a) * d, sy: 0.7, ry: a,
    });
  }
}

/** Vòng nguyên bảo vàng bay quanh trên miệng Tụ Bảo Bồn: một mesh gộp, xoay và nhấp nhô cả nhóm. */
function buildFloatingIngots(scene) {
  const b = new Batch(141);
  for (let i = 0; i < INGOTS; i++) {
    const a = (i / INGOTS) * Math.PI * 2;
    const x = Math.sin(a) * 1.25;
    const z = Math.cos(a) * 1.25;
    const y = (i % 2) * 0.25;
    b.box(0.36, 0.12, 0.2, PALACE.gold, x, y, z, { ry: a });
    for (const s of [-1, 1]) {
      b.box(0.1, 0.14, 0.22, PALACE.gold, x + Math.cos(a) * s * 0.17, y + 0.07, z - Math.sin(a) * s * 0.17, { ry: a, rz: -s * 0.5 });
    }
    b.add(new THREE.SphereGeometry(0.08, 6, 4), PALACE.gold, { x, y: y + 0.1, z });
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0xffb43a, emissiveIntensity: 0.15 });
  const mesh = b.build(mat, { castShadow: false });
  mesh.position.set(TREASURE_BASIN.x, 2.3, TREASURE_BASIN.z);
  scene.add(mesh);
  return { mesh, mat };
}

export function createCasinoQuarter(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const b = new Batch(131);
  const glow = new Batch(132);

  buildWalls(b);
  const { gateEast: ge, gateSouth: gs } = CASINO;
  const gateLanterns = [
    ...buildGate(group, b, { cx: CASINO.maxX, cz: ge.z, half: ge.half, along: 'z', out: 1 }),
    ...buildGate(group, b, { cx: gs.x, cz: CASINO.maxZ, half: gs.half, along: 'x', out: 1 }),
  ];
  buildCarpet(b);
  buildTreasureBasin(b);
  const hallLanterns = buildGoldenPavilion(group, b, glow);
  const lanternMat = buildCasinoLanterns(scene, b, [...gateLanterns, ...hallLanterns]);

  group.add(b.build(flatMaterial()));
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x8a8a8a });
  group.add(glow.build(glowMat, { castShadow: false, receiveShadow: false }));
  const ingots = buildFloatingIngots(scene);

  let time = 0;
  return {
    /** night 0..1 từ bầu trời, flick là nhịp chập chờn chung của đèn lồng. */
    update(dt, night, flick = 1) {
      time += dt;
      lanternMat.emissiveIntensity = (0.3 + night * 1.5) * flick;
      glowMat.color.setScalar(0.55 + night * 0.6);
      ingots.mat.emissiveIntensity = 0.15 + night * 0.6;
      ingots.mesh.rotation.y = time * 0.35;
      ingots.mesh.position.y = 2.3 + Math.sin(time * 1.3) * 0.12;
    },
  };
}
