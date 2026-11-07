// Asset võ hiệp dựng bằng Blender (bảo tháp, cầu vòm, non bộ, cờ băng, đèn đá, khung quán trà)
// theo phong cách Võ Lâm / Where Winds Meet nhưng giữ bảng màu và chất low-poly của game.
// Vị trí + va chạm khai báo trong shared/layout.js. GLB thiếu thì tự dựng bản code thay thế.
import * as THREE from 'three';
import {
  BANNERS, BRIDGE, NONBO, PAGODA, STONE_LANTERNS, TEA,
} from '../../../shared/layout.js';
import { Batch, addRoof, flatMaterial, textTexture } from './builders.js';
import { placeProp } from './props.js';

// Dây đèn lồng vắt qua lối đi, treo giữa các cột cờ — sáng rực khi đêm về.
const STRING_Z = [...new Set(BANNERS.map((banner) => banner.z))];
const STRING_TOP = 4.42;
const STRING_SAG = 0.6;
const STRING_T = [0.07, 0.285, 0.5, 0.715, 0.93];
const BANNER_TEXT = { 28: ['Tĩnh tâm'] };

function stringY(t) {
  return STRING_TOP - STRING_SAG * 4 * t * (1 - t);
}

/** Dây đèn lồng: dây gỗ mảnh + đèn đỏ nhấp nháy, bản code dựng ngay (không phụ thuộc GLB). */
function buildLanternStrings(scene, b, state) {
  for (const z of STRING_Z) {
    const n = 16;
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      b.box(0.72, 0.02, 0.02, '#79583d', (t0 + t1) / 2 * 11.2 - 5.6, stringY((t0 + t1) / 2), z, { jitter: 0 });
    }
  }
  const geo = new THREE.IcosahedronGeometry(0.17, 1);
  geo.scale(1, 1.2, 1);
  const mat = new THREE.MeshLambertMaterial({ color: 0xa81f12, emissive: 0xff4a1e, emissiveIntensity: 0.3, flatShading: true });
  state.lanternMat = mat;
  const count = STRING_Z.length * STRING_T.length;
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4();
  let k = 0;
  for (const z of STRING_Z) {
    for (const t of STRING_T) {
      const x = t * 11.2 - 5.6;
      const y = stringY(t);
      m.setPosition(x, y - 0.24, z);
      mesh.setMatrixAt(k++, m);
      b.box(0.17, 0.04, 0.17, '#2f2214', x, y - 0.05, z, { jitter: 0 });
      b.box(0.013, 0.16, 0.013, '#d8b24a', x, y - 0.5, z, { jitter: 0 });
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
}

/** Biển chữ trên lá băng: texture canvas nên hiển thị đúng tiếng Việt có dấu.
 *  Mặt chữ song song với lá (như cờ băng thật), dán cả hai mặt để đi chiều nào cũng đọc được. */
function addBannerText(scene, x, z, ry) {
  const lines = BANNER_TEXT[z];
  if (!lines) return;
  const tex = textTexture(lines, { w: 256, h: 168, font: 'bold 78px "Segoe UI",Roboto,Arial,sans-serif' });
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  for (const lz of [0.1, -0.1]) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.51), new THREE.MeshLambertMaterial({ map: tex, side: THREE.FrontSide }));
    plane.position.set(x + 0.57 * c + lz * s, 2.95, z - 0.57 * s + lz * c);
    plane.rotation.y = ry + (lz > 0 ? 0 : Math.PI);
    scene.add(plane);
  }
}

// ---- Bản code thay thế khi GLB chưa có (game không bao giờ trống) ----

function fbPagoda(scene) {
  const b = new Batch(91);
  b.box(7.6, 0.36, 7.6, '#b8ac90', PAGODA.x, 0.18, PAGODA.z);
  b.box(6.6, 0.34, 6.6, '#d6c8aa', PAGODA.x, 0.51, PAGODA.z);
  const tiers = [[8.8, 3.55, 1.8, 1.8], [6.4, 6.15, 1.5, 1.5], [4.4, 8.25, 1.2, 1.2]];
  for (const [w, y, h, core] of tiers) {
    b.box(core, 1.9, core, '#eee0bf', PAGODA.x, y + h - 1.35, PAGODA.z);
    addRoof(b, w, w, h, PAGODA.x, y, PAGODA.z);
  }
  b.cyl(0.03, 0.07, 1.1, '#bca36b', PAGODA.x, 9.9, PAGODA.z, { seg: 6 });
  scene.add(b.build(flatMaterial()));
}

function fbBridge(scene) {
  const b = new Batch(92);
  const cx = (BRIDGE.x1 + BRIDGE.x2) / 2;
  const half = (BRIDGE.x2 - BRIDGE.x1) / 2;
  const arch = (x) => 0.06 + BRIDGE.peak * (1 - ((x - cx) / half) ** 2);
  for (let i = 0; i < 28; i++) {
    const x = BRIDGE.x1 + (i + 0.5) * ((BRIDGE.x2 - BRIDGE.x1) / 28);
    b.box(0.36, 0.08, 1.9, '#a17a51', x, arch(x) - 0.02, BRIDGE.z, { jitter: 0.06 });
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const x = BRIDGE.x1 + 0.35 + i * 1.3;
      b.box(0.09, 0.9, 0.09, '#a47750', x, arch(x) + 0.45, BRIDGE.z + side * 0.9);
    }
  }
  scene.add(b.build(flatMaterial()));
}

function fbNonbo(scene, n) {
  const b = new Batch(93 + n.x);
  b.cyl(1.45 * n.s, 1.55 * n.s, 0.4 * n.s, '#b8ac90', n.x, 0.2 * n.s, n.z, { seg: 12 });
  const rocks = [[0.95, 0, 0.95, 0.1], [0.6, 0.72, 0.62, -0.42], [0.46, 0.25, 1.62, 0.3], [0.36, -0.68, 0.42, -0.5], [0.42, -0.05, 2.15, -0.05]];
  for (const [r, dx, dy, dz] of rocks) {
    b.add(new THREE.DodecahedronGeometry(r * n.s, 0), n.s > 0.8 ? '#6d6a66' : '#7b7874', {
      x: n.x + dx * n.s, y: dy * n.s, z: n.z + dz * n.s, sy: 0.9, ry: n.ry,
    });
  }
  scene.add(b.build(flatMaterial()));
}

function fbStoneLantern(scene, l, state) {
  const b = new Batch(95 + l.x);
  b.cyl(0.26, 0.3, 0.14, '#b8ac90', l.x, 0.07, l.z, { seg: 8 });
  b.cyl(0.08, 0.1, 0.7, '#d6c8aa', l.x, 0.49, l.z, { seg: 7 });
  b.box(0.32, 0.26, 0.32, '#d6c8aa', l.x, 1.03, l.z);
  b.cyl(0.06, 0.44, 0.3, '#b8ac90', l.x, 1.31, l.z, { seg: 6 });
  // Lửa có vertex colors ấm để update setScalar (trắng x màu đỉnh) không làm mất màu cam.
  const g = new THREE.IcosahedronGeometry(0.08, 0);
  const warm = new THREE.Color(0xffcf6f);
  const cols = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < g.attributes.position.count; i++) {
    cols[i * 3] = warm.r;
    cols[i * 3 + 1] = warm.g;
    cols[i * 3 + 2] = warm.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const flame = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true }));
  flame.position.set(l.x, 1.03, l.z);
  state.flames.push(flame.material);
  scene.add(b.build(flatMaterial()));
  scene.add(flame);
}

function fbBanner(scene, banner, state) {
  const b = new Batch(97 + banner.x);
  b.cyl(0.2, 0.24, 0.16, '#b8ac90', banner.x, 0.08, banner.z, { seg: 8 });
  b.cyl(0.05, 0.07, 4.5, '#79583d', banner.x, 2.33, banner.z, { seg: 7 });
  b.box(1.3, 0.07, 0.07, '#79583d', banner.x + 0.35 * Math.cos(banner.ry), 4.42, banner.z - 0.35 * Math.sin(banner.ry), { ry: banner.ry });
  scene.add(b.build(flatMaterial()));
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 2.6),
    new THREE.MeshLambertMaterial({ color: 0xa81f12, flatShading: true, side: THREE.DoubleSide }),
  );
  const c = Math.cos(banner.ry);
  const s = Math.sin(banner.ry);
  cloth.position.set(banner.x + 0.57 * c, 3.04, banner.z - 0.57 * s);
  cloth.rotation.y = banner.ry;
  state.cloths.push(cloth);
  scene.add(cloth);
}

function fbTeaShell(scene) {
  const b = new Batch(99);
  b.box(10, 0.16, 8.2, '#6d4a2c', TEA.x, 0.08, TEA.z + 0.3, { jitter: 0.02 });
  for (const dx of [-4.4, 4.4]) {
    for (const dz of [-3.2, 3.8]) b.cyl(0.17, 0.22, 3.2, '#a47750', TEA.x + dx, 1.6, TEA.z + dz + 0.3, { seg: 8 });
  }
  for (const dz of [-3.2, 3.8]) b.box(9.2, 0.22, 0.22, '#79583d', TEA.x, 3.2, TEA.z + dz + 0.3);
  for (const dx of [-4.4, 4.4]) b.box(0.22, 0.22, 7.4, '#79583d', TEA.x + dx, 3.2, TEA.z + 0.3);
  addRoof(b, 12.2, 9.8, 2.1, TEA.x, 3.25, TEA.z + 0.3);
  scene.add(b.build(flatMaterial()));
}

/** Ghép toàn bộ: GLB trước, hỏng thì dùng bản code; dây đèn và biển chữ luôn dựng bằng code. */
export function createWuxiaProps(scene) {
  const state = {
    glows: [],
    flames: [],
    cloths: [],
    lanternMat: null,
    time: 0,
  };
  const b = new Batch(81);

  buildLanternStrings(scene, b, state);
  scene.add(b.build(flatMaterial()));

  (async () => {
    // Bảo tháp
    const pagodaGlows = [];
    if (!await placeProp(scene, 'pagoda.glb', { x: PAGODA.x, z: PAGODA.z, glows: pagodaGlows })) {
      fbPagoda(scene);
    }
    state.glows.push(...pagodaGlows);

    // Cầu vòm qua hồ sen
    if (!await placeProp(scene, 'bridge.glb', { x: (BRIDGE.x1 + BRIDGE.x2) / 2, z: BRIDGE.z })) fbBridge(scene);

    // Hòn non bộ
    for (const n of NONBO) {
      if (!await placeProp(scene, 'nonbo.glb', { x: n.x, z: n.z, ry: n.ry, s: n.s })) fbNonbo(scene, n);
    }

    // Cờ băng + biển chữ
    for (const banner of BANNERS) {
      const cloths = [];
      if (!await placeProp(scene, 'banner.glb', { x: banner.x, z: banner.z, ry: banner.ry, cloths })) {
        fbBanner(scene, banner, state);
      }
      state.cloths.push(...cloths);
      addBannerText(scene, banner.x, banner.z, banner.ry);
    }

    // Đèn đá
    for (const l of STONE_LANTERNS) {
      const flames = [];
      if (!await placeProp(scene, 'stone-lantern.glb', { x: l.x, z: l.z, ry: l.ry, flames })) {
        fbStoneLantern(scene, l, state);
      }
      state.flames.push(...flames);
    }

    // Khung quán trà dựng lại (bàn, ấm, biển chữ do monastery.js giữ nguyên)
    if (!await placeProp(scene, 'tea-pavilion.glb', { x: TEA.x, z: TEA.z })) fbTeaShell(scene);
  })();

  return {
    update(dt, night) {
      state.time += dt;
      const t = state.time;
      const flick = 0.94 + Math.sin(t * 9.1) * 0.04 + Math.sin(t * 17.3) * 0.02;
      if (state.lanternMat) state.lanternMat.emissiveIntensity = (0.28 + night * 1.5) * flick;
      const glowScalar = 0.45 + night * 0.62;
      for (const mat of state.glows) mat.color.setScalar(glowScalar);
      for (let i = 0; i < state.flames.length; i++) {
        state.flames[i].color.setScalar(0.85 + Math.sin(t * 7.3 + i * 1.7) * 0.15);
      }
      for (let i = 0; i < state.cloths.length; i++) {
        state.cloths[i].rotation.y = Math.sin(t * 1.25 + i * 0.9) * 0.05;
      }
    },
  };
}
