// Biển mây: các tấm mây nằm ngang thấp hơn mặt gò, lấp thung lũng quanh gò để núi đá dựng nhô lên khỏi mây.
// Một InstancedMesh, không ghi depth; cả lớp mây xoay rất chậm quanh tâm gò, ban đêm ngả màu lam.
import * as THREE from 'three';
import { rng } from './builders.js';
import { SITE_CENTER, ringPlacements } from './xianxia-backdrop-layout.js';

const DAY = new THREE.Color('#f6efe4');
const NIGHT = new THREE.Color('#6f7590');

/** Texture một đám mây: nhiều cụm tròn mờ chồng lên nhau, mép trong suốt. */
function cloudTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const r = rng(515);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * size * 0.26;
    const x = size / 2 + Math.cos(a) * d;
    const y = size / 2 + Math.sin(a) * d * 0.7;
    const rad = size * (0.1 + r() * 0.14);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCloudSea(lowQuality) {
  const count = lowQuality ? 14 : 26;
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    map: cloudTexture(), color: DAY.clone(), transparent: true, opacity: 0.85, depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.frustumCulled = false;
  const pivot = new THREE.Group();
  pivot.position.set(SITE_CENTER.x, 0, SITE_CENTER.z);
  pivot.add(mesh);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  // Gần gò mây thấp (lòng thung lũng), xa dần thì mây dâng lên lưng chừng đồi.
  ringPlacements(count, 55, 300, 6127).forEach((spot, i) => {
    const { r } = spot;
    const y = -9 + (spot.d / 300) * 12 + r() * 3;
    const size = 70 + r() * 80;
    q.setFromAxisAngle(up, r() * Math.PI * 2);
    m.compose(p.set(spot.x - SITE_CENTER.x, y, spot.z - SITE_CENTER.z), q, s.set(size, 1, size * (0.6 + r() * 0.5)));
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;

  return {
    group: pivot,
    update(dt, night) {
      pivot.rotation.y += dt * 0.0025;
      material.color.copy(DAY).lerp(NIGHT, night);
    },
  };
}
