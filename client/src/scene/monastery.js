// Khu tu viện: cổng, sân, gác chuông, thiền đường, cây bồ đề, hồ sen, vườn đá, quán trà, đèn lồng.
import * as THREE from 'three';
import {
  BELL, BOUNDS, CONTAINERS, COURT_TREES, GARDEN_ROCKS, HALL, LANTERN_POSTS, MATS, POND, TEA, TEA_TABLES, TREE, TREE_BRANCHES,
} from '../../../shared/layout.js';
import { Batch, addRoof, flatMaterial, rng, textTexture } from './builders.js';
import { buildCampusGround } from './campus-ground.js';
import { buildCampusGalleries } from './campus-galleries.js';

const WOOD = '#a17a51';
const WOOD_DARK = '#79583d';
const PILLAR = '#a47750';
const PLASTER = '#eee0bf';
const STONE = '#b8ac90';
const STONE_LIGHT = '#d6c8aa';

function sign(lines, w, h, x, y, z, ry, opts) {
  const tex = textTexture(lines, opts);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  return mesh;
}

function buildWalls(b) {
  const wall = (cx, cz, w, d) => {
    b.box(w, 10, d, PLASTER, cx, -3.2, cz, { jitter: 0.02 });
    b.box(w + 0.3, 0.3, d + 0.3, '#73988d', cx, 1.95, cz);
  };
  wall(-30.3, 0, 0.6, 61);
  wall(0, -30.3, 61, 0.6);
  wall(-17.7, 30, 26.2, 0.6);
  wall(17.7, 30, 26.2, 0.6);
  for (let z = -30; z <= 30; z += 6) b.box(0.85, 2.3, 0.85, '#bda98a', -30.3, 1.05, z);
  for (let x = -30; x <= 30; x += 6) {
    b.box(0.85, 2.3, 0.85, '#bda98a', x, 1.05, -30.3);
    if (Math.abs(x) > 5) b.box(0.85, 2.3, 0.85, '#bda98a', x, 1.05, 30);
  }

  // Rào gỗ phía đông, nhìn xuống cảng
  b.box(0.6, 10, 61, STONE, 30.1, -5.1, 0);
  for (let z = -30; z <= 30; z += 2.5) b.box(0.18, 1.2, 0.18, WOOD_DARK, 29.95, 0.6, z);
  b.box(0.12, 0.12, 61, WOOD, 29.95, 1.15, 0);
  b.box(0.12, 0.12, 61, WOOD, 29.95, 0.65, 0);

  // Bậc thềm trước cổng
  b.box(9.6, 10, 11, STONE, 0, -5.03, 35.5);
  for (const s of [-1, 1]) {
    b.box(0.5, 10.9, 11, STONE_LIGHT, s * 4.8, -4.75, 35.5);
    b.box(0.7, 0.9, 0.7, STONE, s * 4.8, 1.05, 40.5);
  }
  for (let i = 0; i < 12; i++) {
    b.box(9.6, 0.5, 1.1, STONE_LIGHT, 0, -0.3 - i * 0.48, 41 + i * 1.02, { jitter: 0.02 });
  }
}

function buildGate(group, b) {
  const z = 30;
  const pillar = (x, h) => {
    b.cyl(0.24, 0.28, h, PILLAR, x, h / 2, z);
    b.cyl(0.42, 0.46, 0.3, STONE, x, 0.15, z);
  };
  [-4.4, 4.4].forEach((x) => pillar(x, 3.5));
  [-1.8, 1.8].forEach((x) => pillar(x, 5.2));
  b.box(4.2, 0.35, 0.5, WOOD_DARK, 0, 4.6, z);
  b.box(4.2, 0.28, 0.45, WOOD, 0, 3.15, z);
  for (const s of [-1, 1]) b.box(2.9, 0.28, 0.45, WOOD, s * 3.1, 3.2, z);
  addRoof(b, 6.2, 3.6, 1.7, 0, 5.2, z);
  addRoof(b, 4.4, 3.0, 1.1, -3.1, 3.5, z, { ry: 0 });
  addRoof(b, 4.4, 3.0, 1.1, 3.1, 3.5, z, { ry: 0 });

  group.add(sign('HTH', 2.6, 1.0, 0, 3.9, z + 0.27, 0));
  group.add(sign(['Tu viện bên cảng'], 2.8, 0.8, 0, 3.9, z - 0.27, Math.PI, {
    font: 'bold 62px "Segoe UI",Roboto,Arial,sans-serif',
  }));
}

function buildBellTower(group, b) {
  const { x, z } = BELL;
  b.box(7, 0.2, 7, STONE, x, 0.1, z);
  for (const dx of [-2.6, 2.6]) {
    for (const dz of [-2.6, 2.6]) {
      b.cyl(0.24, 0.3, 5, PILLAR, x + dx, 2.5, z + dz);
      b.cyl(0.44, 0.48, 0.3, STONE, x + dx, 0.15, z + dz);
    }
  }
  for (const s of [-1, 1]) {
    b.box(5.8, 0.3, 0.3, WOOD_DARK, x, 4.9, z + s * 2.6);
    b.box(0.3, 0.3, 5.8, WOOD_DARK, x + s * 2.6, 4.9, z);
  }
  b.box(5.8, 0.34, 0.34, WOOD_DARK, x, 4.72, z);
  addRoof(b, 8.2, 8.2, 1.9, x, 5.0, z);
  addRoof(b, 4.8, 4.8, 1.5, x, 6.55, z);

  // Chuông đồng treo riêng để đung đưa khi thỉnh.
  const pts = [
    [0, 0], [0.34, 0.03], [0.46, 0.14], [0.5, 0.5], [0.56, 0.95], [0.72, 1.32], [0.84, 1.54], [0.8, 1.6],
  ].map(([r, d]) => new THREE.Vector2(r, -d));
  const geo = new THREE.LatheGeometry(pts, 14);
  const mat = new THREE.MeshStandardMaterial({ color: 0x9c6b2f, metalness: 0.55, roughness: 0.48, flatShading: true, emissive: 0xffb050, emissiveIntensity: 0 });
  const bellGroup = new THREE.Group();
  bellGroup.position.set(x, 4.55, z);
  const bell = new THREE.Mesh(geo, mat);
  bell.castShadow = true;
  bellGroup.add(bell);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 10), new THREE.MeshLambertMaterial({ color: 0x3a2a18 }));
  bellGroup.add(hook);
  // Hai vòng đai trang trí trên chuông
  for (const [yy, rr] of [[-0.7, 0.53], [-1.25, 0.7]]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.03, 5, 16), mat);
    band.rotation.x = Math.PI / 2;
    band.position.y = yy;
    bellGroup.add(band);
  }
  group.add(bellGroup);

  // Khúc gỗ thỉnh chuông treo ngang
  const log = new THREE.Group();
  log.position.set(x + 2.4, 3.9, z);
  const logMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5, 7), new THREE.MeshLambertMaterial({ color: 0x5a3a22, flatShading: true }));
  logMesh.rotation.z = Math.PI / 2;
  logMesh.position.set(-0.75, -1.5, 0);
  logMesh.castShadow = true;
  log.add(logMesh);
  for (const dz of [-0.1, 0.1]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 4), new THREE.MeshLambertMaterial({ color: 0x8f8466 }));
    rope.position.set(-0.75, -0.75, dz);
    log.add(rope);
  }
  group.add(log);
  return { bellGroup, bellMat: mat, log };
}

function buildHall(group, b, emissive) {
  const { x, z, halfW: hw, halfD: hd, doorHalf: dh, height: h } = HALL;
  // Nền và tường
  b.box(hw * 2 + 0.8, 0.26, hd * 2 + 0.8, STONE, x, 0.13, z);
  b.box(hw * 2 - 0.2, 0.05, hd * 2 - 0.2, '#8a5d38', x, 0.28, z, { jitter: 0.01 });
  for (let i = -6; i <= 6; i++) b.box(0.03, 0.05, hd * 2 - 0.2, '#6d4728', x + i * 1.2, 0.285, z, { jitter: 0 });
  const wc = '#7d5233';
  b.box(hw * 2, h, 0.5, wc, x, h / 2, z - hd);
  b.box(0.5, h, hd * 2, wc, x - hw, h / 2, z);
  b.box(0.5, h, hd * 2, wc, x + hw, h / 2, z);
  for (const s of [-1, 1]) {
    const w = hw - dh;
    b.box(w, h, 0.5, wc, x + s * (dh + w / 2), h / 2, z + hd);
  }
  b.box(dh * 2, 1.1, 0.5, wc, x, h - 0.55, z + hd); // Lanh tô cửa
  for (const s of [-1, 1]) b.box(0.3, h - 0.9, 0.62, PILLAR, x + s * dh, (h - 0.9) / 2, z + hd);
  // Cột và dầm trang trí
  for (const dx of [-hw, -hw / 2, hw / 2, hw]) {
    b.box(0.34, h, 0.6, WOOD_DARK, x + dx, h / 2, z + hd);
    b.box(0.34, h, 0.6, WOOD_DARK, x + dx, h / 2, z - hd);
  }
  for (const dz of [-hd, 0, hd]) {
    b.box(0.6, h, 0.34, WOOD_DARK, x - hw, h / 2, z + dz);
    b.box(0.6, h, 0.34, WOOD_DARK, x + hw, h / 2, z + dz);
  }
  b.box(hw * 2 + 0.2, 0.3, hd * 2 + 0.2, WOOD_DARK, x, h, z);

  // Hiên có cột
  for (const dx of [-7, -3.4, 3.4, 7]) {
    b.cyl(0.2, 0.25, h - 0.3, PILLAR, x + dx, (h - 0.3) / 2 + 0.3, z + hd + 1.8);
  }
  b.box(hw * 2 + 0.6, 0.26, 0.3, WOOD_DARK, x, h, z + hd + 1.8);
  // Mái hiên nối vào mái chính
  b.box(hw * 2 + 0.6, 0.14, 2.4, '#82a393', x, h + 0.25, z + hd + 1.05, { rx: 0.12 });

  // Mái hai tầng
  addRoof(b, hw * 2 + 4, hd * 2 + 5.2, 3.3, x, h + 0.08, z + 0.2);
  addRoof(b, hw + 3, hd + 1.6, 1.9, x, h + 2.45, z + 0.2);

  // Cửa sổ sáng vàng khi đêm xuống
  for (const dx of [-5.6, 5.6]) {
    emissive.box(2.2, 1.5, 0.08, '#ffc76f', x + dx, 2.1, z + hd + 0.27);
    b.box(2.5, 0.12, 0.6, WOOD_DARK, x + dx, 2.9, z + hd);
    b.box(2.5, 0.12, 0.6, WOOD_DARK, x + dx, 1.32, z + hd);
    for (let k = -1; k <= 1; k++) b.box(0.06, 1.5, 0.12, WOOD_DARK, x + dx + k * 0.7, 2.1, z + hd + 0.28);
  }

  // Chiếu ngồi xếp vòng tròn
  for (const m of MATS) {
    b.cyl(0.62, 0.62, 0.05, '#c9a15f', m.x, 0.33, m.z, { seg: 10, jitter: 0.06 });
    b.cyl(0.42, 0.42, 0.055, '#a8824a', m.x, 0.335, m.z, { seg: 10 });
  }
  // Nến dọc tường và giữa vòng tròn
  const candles = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    candles.push([x + Math.sin(a) * 6.2, z + Math.cos(a) * 4.8]);
  }
  for (const [cx, cz] of candles) {
    b.cyl(0.06, 0.07, 0.34, '#efe6cf', cx, 0.47, cz, { seg: 6 });
    emissive.add(new THREE.ConeGeometry(0.05, 0.16, 5), '#ffd27a', { x: cx, y: 0.72, z: cz });
  }
  const light = new THREE.PointLight(0xffc27a, 34, 17, 1.8);
  light.position.set(x, 3.2, z);
  group.add(light);
  return { candles: candles.map(([cx, cz]) => [cx, 0.72, cz]), hallLight: light };
}

function buildBodhi(b) {
  const { x, z } = TREE;
  const trunkCol = '#5a4030';
  b.cyl(0.85, 1.35, 4.8, trunkCol, x, 2.4, z, { seg: 8 });
  b.cyl(1.7, 1.9, 0.5, '#6b5b45', x, 0.15, z, { seg: 10 }); // Bệ đá quanh gốc
  const rand = rng(31);
  // Cành toả ngang để treo dải lụa: cùng toạ độ với wishes3d để ribbon bám đúng mặt cành.
  for (const br of TREE_BRANCHES) {
    const cx = x + Math.sin(br.a) * br.len * 0.5;
    const cz = z + Math.cos(br.a) * br.len * 0.5;
    b.add(new THREE.CylinderGeometry(0.14, 0.3, br.len, 6), trunkCol, { x: cx, y: br.y, z: cz, ry: br.a, rx: Math.PI / 2 - 0.12 });
  }
  // Tán lá nhiều khối
  const leaves = ['#7da95a', '#67954f', '#92b66b', '#aac879'];
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const r = i < 5 ? rand() * 2 : 2.2 + rand() * 3.8;
    const y = 6.6 + rand() * 2.6 - r * 0.14;
    const s = 1.8 + rand() * 1.5;
    b.add(new THREE.IcosahedronGeometry(s, 1), leaves[i % leaves.length], {
      x: x + Math.sin(a) * r, y, z: z + Math.cos(a) * r, sy: 0.72, ry: rand() * 3, jitter: 0.1,
    });
  }
}

function buildPond(group, b) {
  const { x, z, radius: r } = POND;
  const N = 26;
  const rand = rng(77);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const s = 0.5 + rand() * 0.28;
    b.add(new THREE.DodecahedronGeometry(s, 0), i % 3 ? STONE : STONE_LIGHT, {
      x: x + Math.sin(a) * (r + 0.05), y: 0.12, z: z + Math.cos(a) * (r + 0.05), sy: 0.65, ry: rand() * 3, jitter: 0.1,
    });
  }
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(r, 32),
    new THREE.MeshLambertMaterial({ color: 0x2f6f7e, transparent: true, opacity: 0.78 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, 0.07, z);
  group.add(water);
  const bed = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshLambertMaterial({ color: 0x17333b }));
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(x, 0.035, z);
  group.add(bed);
  // Lá sen và hoa
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const d = 1.2 + rand() * (r - 2);
    const px = x + Math.sin(a) * d;
    const pz = z + Math.cos(a) * d;
    b.cyl(0.42 + rand() * 0.25, 0.42, 0.02, '#4f8a46', px, 0.09, pz, { seg: 8, jitter: 0.12 });
    if (i % 3 === 0) {
      b.add(new THREE.ConeGeometry(0.17, 0.26, 6), '#e88fa8', { x: px, y: 0.23, z: pz, jitter: 0.1 });
      b.add(new THREE.ConeGeometry(0.1, 0.2, 5), '#f7c9d4', { x: px, y: 0.3, z: pz });
    }
  }
  return water;
}

function buildGarden(b) {
  const rand = rng(41);
  for (const r of GARDEN_ROCKS) {
    b.add(new THREE.DodecahedronGeometry(r.r, 0), '#6d6a66', { x: r.x, y: r.r * 0.46, z: r.z, sy: 0.85, ry: rand() * 3, rx: rand() * 0.4, jitter: 0.08 });
    b.add(new THREE.DodecahedronGeometry(r.r * 0.5, 0), '#7b7874', {
      x: r.x + r.r * 0.8, y: r.r * 0.2, z: r.z + r.r * 0.4, ry: rand() * 3,
    });
    b.cyl(r.r * 1.24, r.r * 1.3, 0.03, '#61704f', r.x, 0.045, r.z, { seg: 18 }); // Rêu quanh chân đá
  }
}

function buildTea(group, b) {
  const { x, z } = TEA;
  // Khung sàn/cột/mái do Blender dựng (tea-pavilion.glb, đặt bởi wuxia-props.js);
  // ở đây giữ bàn ghế, ấm trà, ống nhang và biển hiệu.
  for (const t of TEA_TABLES) {
    b.cyl(0.72, 0.72, 0.09, '#8a5a34', t.x, 0.82, t.z, { seg: 10 });
    b.cyl(0.11, 0.2, 0.74, WOOD_DARK, t.x, 0.46, t.z, { seg: 6 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.6;
      const sx = t.x + Math.sin(a) * 1.25;
      const sz = t.z + Math.cos(a) * 1.25;
      b.cyl(0.24, 0.24, 0.07, '#8a5a34', sx, 0.5, sz, { seg: 8 });
      b.cyl(0.06, 0.09, 0.44, WOOD_DARK, sx, 0.26, sz, { seg: 5 });
    }
    // Ấm trà và chén
    b.add(new THREE.SphereGeometry(0.13, 7, 5), '#3d5a60', { x: t.x + 0.2, y: 0.96, z: t.z - 0.1, sy: 0.8 });
    for (const [cx, cz] of [[-0.3, 0.1], [0.05, 0.32]]) {
      b.cyl(0.05, 0.035, 0.07, '#e8e0cf', t.x + cx, 0.9, t.z + cz, { seg: 6 });
    }
  }
  // Ống xăm trên bàn giữa
  const tube = new THREE.Group();
  tube.position.set(x - 0.18, 0.87, z + 0.12);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.34, 8), new THREE.MeshLambertMaterial({ color: 0x9c2f1d, flatShading: true }));
  body.position.y = 0.17;
  body.castShadow = true;
  tube.add(body);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.28;
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.34, 0.012), new THREE.MeshLambertMaterial({ color: 0xe6cf9a }));
    stick.position.set(Math.sin(a) * 0.045, 0.36, Math.cos(a) * 0.045);
    stick.rotation.z = Math.sin(a) * 0.14;
    tube.add(stick);
  }
  group.add(tube);
  group.add(sign('Quán trà', 2.2, 0.62, x, 2.86, z + 3.95, 0, {
    w: 512, h: 144, font: 'bold 76px "Segoe UI",Roboto,Arial,sans-serif',
  }));
}

function buildWishGallery(group, b) {
  const { minX, maxX, minZ, maxZ } = CONTAINERS;
  const h = 2.6;
  const c = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, len: maxZ - minZ, col: PLASTER };
  b.box(maxX - minX, h, c.len, c.col, c.x, h / 2, c.z, { jitter: 0.02 });
  for (const z of [minZ, maxZ]) {
    b.box(0.2, h + 0.2, 0.22, WOOD_DARK, minX - 0.02, h / 2, z);
  }
  b.box(maxX - minX + 0.06, 0.12, c.len + 0.06, '#5c4030', c.x, h - 0.03, c.z);
  b.box(maxX - minX + 0.06, 0.12, c.len + 0.06, '#5c4030', c.x, 0.06, c.z);
  // Giữ mặt thẻ lời ước cùng tọa độ; thay vỏ container bằng tường vôi và mái hiên.
  addRoof(b, 13.4, 3.8, 1.1, c.x, h + 0.12, c.z, { ry: Math.PI / 2, lift: 0.2 });
  group.add(sign('HTH LOGISTICS', 4.4, 0.42, minX - 0.08, 2.42, c.z, -Math.PI / 2, {
    w: 1024, h: 96, bg: '#79583d', fg: '#e8d4b0', border: null, font: 'bold 66px "Segoe UI",Roboto,Arial,sans-serif',
  }));
  // Biển tên trên cùng mặt với các thẻ lời ước.
  group.add(sign('Bảng ước', 2.6, 0.42, minX - 0.08, 2.42, c.z + 4.4, -Math.PI / 2, {
    w: 512, h: 84, bg: '#3e5a64', fg: '#f0e4cc', border: null, font: 'bold 56px "Segoe UI",Roboto,Arial,sans-serif',
  }));
}

function buildTrees(b) {
  const rand = rng(53);
  for (const t of COURT_TREES) {
    b.cyl(0.14 * t.s, 0.24 * t.s, 2 * t.s, '#553a28', t.x, t.s, t.z, { seg: 6 });
    const green = t.blossom ? [t.blossom, '#f2d3bc', '#e6baa7'] : ['#7da95a', '#92b66b', '#67954f'];
    for (let i = 0; i < 4; i++) {
      const a = rand() * 6.28;
      const d = i === 0 ? 0 : 0.8 * t.s;
      b.add(new THREE.IcosahedronGeometry((0.85 + rand() * 0.5) * t.s, 0), green[i % 3], {
        x: t.x + Math.sin(a) * d, y: (2.4 + rand() * 1.0) * t.s, z: t.z + Math.cos(a) * d, ry: rand() * 3, jitter: 0.1,
      });
    }
  }
}

function buildLanterns(group, b) {
  const positions = [];
  for (const p of LANTERN_POSTS) {
    b.cyl(0.05, 0.08, 2.5, WOOD_DARK, p.x, 1.25, p.z, { seg: 6 });
    b.box(0.5, 0.05, 0.05, WOOD_DARK, p.x, 2.46, p.z);
    positions.push([p.x, 2.15, p.z]);
  }
  // Đèn dưới hiên thiền đường, cổng, quán trà, gác chuông
  for (const dx of [-5.2, -1.2, 1.2, 5.2]) positions.push([HALL.x + dx, 3.75, HALL.z + HALL.halfD + 1.8]);
  for (const dx of [-3.1, 3.1]) positions.push([dx, 2.6, 30]);
  for (const dx of [-1.1, 1.1]) positions.push([dx, 3.1, 30.4]);
  for (const dx of [-3.1, 3.1]) positions.push([TEA.x + dx, 2.7, TEA.z + 3.8]);
  for (const dx of [-2.6, 2.6]) positions.push([BELL.x + dx, 4.25, BELL.z + 2.6]);

  const geo = new THREE.IcosahedronGeometry(0.2, 1);
  geo.scale(1, 1.2, 1);
  const mat = new THREE.MeshLambertMaterial({ color: 0xa81f12, emissive: 0xff4a1e, emissiveIntensity: 0.3, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
  const m = new THREE.Matrix4();
  positions.forEach(([x, y, z], i) => {
    m.setPosition(x, y, z);
    mesh.setMatrixAt(i, m);
    b.box(0.2, 0.05, 0.2, '#2f2214', x, y + 0.26, z);
    b.box(0.015, 0.2, 0.015, '#d8b24a', x, y - 0.33, z);
  });
  group.add(mesh);
  return { mesh, mat, positions };
}

export function createMonastery(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const b = new Batch(11);
  const emissive = new Batch(12);

  buildCampusGround(group, b);
  buildCampusGalleries(b);
  buildWalls(b);
  buildGate(group, b);
  const bell = buildBellTower(group, b);
  const hall = buildHall(group, b, emissive);
  buildBodhi(b);
  const pondWater = buildPond(group, b);
  buildGarden(b);
  buildTea(group, b);
  buildWishGallery(group, b);
  buildTrees(b);
  const lanterns = buildLanterns(group, b);

  group.add(b.build(flatMaterial()));
  const emissiveMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x8a8a8a });
  const emissiveMesh = emissive.build(emissiveMat, { castShadow: false, receiveShadow: false });
  group.add(emissiveMesh);

  return { group, bell, hall, lanterns, emissiveMat, pondWater, bounds: BOUNDS };
}
