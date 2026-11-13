import * as THREE from 'three';
import { solidMaterial, SWAY_SPEED } from './bich-ngoc-materials.js';
import { mossStoneGeometry, shootGeometry, twigPath } from './bich-ngoc-geometry.js';
import { bichNgocMossCarpet, bichNgocShadow } from './bich-ngoc-textures.js';
import { STALKS } from './bich-ngoc-grove.js';
import { hash } from './aura-billboard-layer.js';

// Nền đất của Bích Ngọc — không trận đồ, không vòng chữ, không vòng tròn:
//  thảm rêu loang dưới từng cụm trúc (màu thật), cỏ, lá trúc khô, sỏi; chừa đất trống trước mặt;
//  bóng trúc đổ chéo về sau-phải như nắng chiếu từ trước-trái, lay nhẹ theo trúc;
//  đá rêu 3D dẹt ở chân các cụm, măng trúc nhú lên cạnh đá.
const CARPET = { size: 3.8, x: 0, z: -0.3 }, SHADOW = { size: 4.8, x: 0.7, z: -1.45 };
const CLUSTERS = [[-1.0, -0.05, 0.55], [-0.88, -0.88, 0.45], [1.06, 0.12, 0.5], [0.92, -0.94, 0.45], [-0.75, 0.45, 0.25], [0.8, 0.5, 0.25]];
export const STONES = [[-1.08, 0.24, 0.22], [-0.68, -0.72, 0.17], [-1.36, -0.6, 0.26], [1.18, -0.02, 0.24],
  [0.98, 0.58, 0.14], [0.84, -0.74, 0.2], [1.38, -0.56, 0.16], [-0.5, 0.62, 0.1]];
export const SHOOTS = [[-0.9, 0.27, 0.28], [-1.16, -0.48, 0.22], [1.22, 0.08, 0.25], [0.96, -0.62, 0.3], [-0.52, -1.06, 0.2]];
// Bóng đổ: nắng chếch từ trước-trái, bóng ngả về sau-phải.
const project = (x, y, z) => [(x + y * 0.4 - SHADOW.x) * 1024 / SHADOW.size, (z - y * 0.55 - SHADOW.z) * 1024 / SHADOW.size];

function shadowTexture() {
  const culms = STALKS.map(s => [...project(s.x, 0, s.z), ...project(s.x + s.lean[0], s.h, s.z + s.lean[1]), s.r * 2 * 1024 / SHADOW.size * 1.4]);
  const sprays = STALKS.flatMap(s => s.twigs.map(t => {
    const p = twigPath(s, t)[2], [x, y] = project(p.x, p.y, p.z);
    return [x, y, Math.atan2(t.dir[0], -t.dir[1])];
  }));
  return bichNgocShadow(culms, sprays);
}

export function createGround(parent, colors, lowQuality) {
  const geometries = [], materials = [];
  const plane = (o, map, opacity, order, name) => {
    const geo = new THREE.PlaneGeometry(o.size, o.size); geometries.push(geo);
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false, toneMapped: false });
    materials.push(mat);
    const mesh = new THREE.Mesh(geo, mat); mesh.name = name; mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(o.x, 0.02 + order * 0.004, o.z); mesh.renderOrder = order; parent.add(mesh);
    return mesh;
  };
  const k = 1024 / CARPET.size;
  const spots = CLUSTERS.map(([x, z, r]) => [(x - CARPET.x) * k, (z - CARPET.z) * k, r * k]);
  const shadow = lowQuality ? null : plane(SHADOW, shadowTexture(), 0.32, 1, 'bich-ngoc-bamboo-shadow');
  const carpet = plane(CARPET, bichNgocMossCarpet(spots), 0.92, 2, 'bich-ngoc-moss-carpet');

  const body = solidMaterial(colors, 1); materials.push(body);
  const place = (geo, list, name, squash) => {
    const mesh = new THREE.InstancedMesh(geo, body, list.length), m = new THREE.Matrix4(), q = new THREE.Quaternion();
    list.forEach(([x, z, s], i) => {
      q.setFromEuler(new THREE.Euler((hash(i + 40) - 0.5) * 0.12 * squash, hash(i + 30) * Math.PI * 2, 0));
      m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s)); mesh.setMatrixAt(i, m);
    });
    mesh.name = name; mesh.renderOrder = 4; parent.add(mesh);
    return mesh;
  };
  place(mossStoneGeometry(), STONES, 'bich-ngoc-moss-stones', 1);
  place(shootGeometry(), SHOOTS, 'bich-ngoc-shoots', 2);

  return {
    update(time, rhythm, f) {
      carpet.material.opacity = 0.92 * f; body.uniforms.opacity.value = f; body.uniforms.time.value = time;
      if (!shadow) return;
      // Bóng lay cùng nhịp trúc (cùng tốc độ lay), biên độ nhỏ trên mặt đất.
      shadow.position.x = SHADOW.x + 0.05 * Math.sin(time * SWAY_SPEED + 1.2);
      shadow.material.opacity = 0.32 * f;
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
