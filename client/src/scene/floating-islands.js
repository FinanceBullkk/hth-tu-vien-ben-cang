// Đảo bay tiên sơn: khối đá chóp ngược lơ lửng xa xa, mặt cỏ có đình mái ngọc và tùng, thác đổ từ mép đảo
// tan thành mây. Mỗi đảo nhấp nhô chậm; dòng thác cuộn texture và nhạt dần về chân bằng alpha theo đỉnh.
import * as THREE from 'three';
import { Batch, flatMaterial, rng } from './builders.js';
import { PALACE, palaceRoof, redColumn } from './palace-kit.js';
import { SITE_CENTER } from './xianxia-backdrop-layout.js';

// Vị trí so với tâm gò (phía tây, bắc, tây nam; chừa phía đông có cảng). y là độ cao mặt đảo.
const ISLANDS = [
  { dx: -150, dz: -95, y: 58, r: 15, fall: 46 },
  { dx: -40, dz: -205, y: 74, r: 18, fall: 58 },
  { dx: -215, dz: 55, y: 48, r: 12, fall: 38 },
  { dx: 70, dz: -170, y: 64, r: 11, fall: 0 },
];

/** Texture dòng thác: vệt trắng xanh chạy dọc, lặp theo chiều dọc để cuộn. */
function waterfallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(190,225,240,0.55)';
  ctx.fillRect(0, 0, 64, 256);
  const r = rng(77);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.5})`;
    ctx.fillRect(r() * 64, r() * 256, 1 + r() * 3, 30 + r() * 90);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Tấm thác cao h, đỉnh ở gốc toạ độ, alpha 1 ở đỉnh nhạt dần về 0 ở chân. */
function waterfallGeometry(w, h) {
  const geo = new THREE.PlaneGeometry(w, h, 1, 6);
  geo.translate(0, -h / 2, 0);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const t = -pos.getY(i) / h;
    colors.set([1, 1, 1, Math.max(0, 1 - t * t * 1.15)], i * 4);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  return geo;
}

/** Thân đảo: chóp đá ngược sần sùi, mặt cỏ, đình nhỏ cột son mái ngọc, vài cây tùng. Toạ độ cục bộ, mặt đảo ở y = 0. */
function buildIsland(b, { r }, seed) {
  const rand = rng(seed);
  const cone = new THREE.ConeGeometry(r, r * 1.6, 8, 3).toNonIndexed();
  cone.rotateX(Math.PI);
  cone.translate(0, -r * 0.8, 0);
  const pos = cone.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = 0.86 + ((Math.sin(pos.getX(i) * 1.7 + seed) + Math.cos(pos.getZ(i) * 1.3 + seed)) * 0.08 + 0.08);
    pos.setX(i, pos.getX(i) * k);
    pos.setZ(i, pos.getZ(i) * k);
  }
  cone.computeVertexNormals();
  b.add(cone, '#7c847c', { jitter: 0.1 });
  b.cyl(r * 1.02, r * 0.96, 1.2, '#6d8f55', 0, -0.6, 0, { seg: 10 });
  b.cyl(r * 0.5, r * 0.5, 0.25, PALACE.marble, 0, 0.12, 0, { seg: 8 });
  for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) redColumn(b, dx, dz, 3.2, 0.25, 0.2);
  palaceRoof(b, 5.4, 5.4, 1.8, 0, 3.4, 0);
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2;
    const d = r * (0.55 + rand() * 0.3);
    const s = 1.2 + rand() * 1.4;
    b.add(new THREE.ConeGeometry(s, s * 2.6, 6), '#3f6640', { x: Math.cos(a) * d, y: s * 1.3, z: Math.sin(a) * d });
  }
}

export function createFloatingIslands(lowQuality) {
  const group = new THREE.Group();
  const tex = waterfallTexture();
  const fallMat = new THREE.MeshBasicMaterial({
    map: tex, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const list = (lowQuality ? ISLANDS.slice(0, 2) : ISLANDS).map((spec, i) => {
    const b = new Batch(300 + i);
    buildIsland(b, spec, 31 + i * 17);
    const mesh = b.build(flatMaterial(), { castShadow: false, receiveShadow: false });
    const island = new THREE.Group();
    island.position.set(SITE_CENTER.x + spec.dx, spec.y, SITE_CENTER.z + spec.dz);
    island.add(mesh);
    if (spec.fall) {
      // Thác đổ từ mép đảo phía quay về gò cho người đứng trong sân nhìn thấy.
      const toward = Math.atan2(-spec.dx, -spec.dz);
      const fall = new THREE.Mesh(waterfallGeometry(3.2, spec.fall), fallMat);
      fall.position.set(Math.sin(toward) * spec.r * 0.98, -0.3, Math.cos(toward) * spec.r * 0.98);
      fall.rotation.y = toward;
      island.add(fall);
    }
    group.add(island);
    return { island, baseY: spec.y, phase: i * 1.7 };
  });

  let time = 0;
  return {
    group,
    update(dt) {
      time += dt;
      tex.offset.y += dt * 0.55;
      for (const it of list) {
        it.island.position.y = it.baseY + Math.sin(time * 0.25 + it.phase) * 1.4;
        it.island.rotation.y = Math.sin(time * 0.05 + it.phase) * 0.08;
      }
    },
  };
}
