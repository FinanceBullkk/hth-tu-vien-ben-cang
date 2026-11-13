import * as THREE from 'three';
import { swordGeometry } from './sword-geometry.js';
import { trailVertex, streamFragment } from './kiem-vu-shaders.js';

// Lớp trang trí 3D của Kiếm Vũ, mỗi lớp là một factory trả { update(time, rhythm, f), dispose }.
// rhythm: { phase, gather, release, sweep, sweepOn, pulse } — nhịp 8 giây do kiem-vu-aura tính.
const sstep = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/** Hai vòng thiên luân nghiêng ôm kiếm luân, mỗi vòng có hạt vàng chạy quanh. */
export function createArmillary(parent, colors, lowQuality) {
  const ringGeo = new THREE.TorusGeometry(1.3, 0.006, 4, lowQuality ? 64 : 128);
  const beadGeo = new THREE.OctahedronGeometry(0.038);
  const ringMat = new THREE.MeshBasicMaterial({ color: colors.edge, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const beadMat = new THREE.MeshBasicMaterial({ color: colors.gold, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const beads = lowQuality ? 3 : 6;
  const spinners = [-1, 1].map(side => {
    const tilt = new THREE.Group(); tilt.rotation.set(1.18, side * 0.42, 0); parent.add(tilt);
    const spin = new THREE.Group(); tilt.add(spin);
    spin.add(new THREE.Mesh(ringGeo, ringMat));
    for (let i = 0; i < beads; i++) {
      const a = i / beads * Math.PI * 2, bead = new THREE.Mesh(beadGeo, beadMat);
      bead.position.set(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0); bead.scale.set(1, 1.6, 1); bead.rotation.z = a;
      spin.add(bead);
    }
    return { tilt, spin, side };
  });
  return {
    update(time, rhythm, f) {
      for (const { spin, side } of spinners) spin.rotation.z = side * time * 0.28;
      ringMat.opacity = (0.32 + 0.3 * rhythm.sweepOn) * f;
      beadMat.opacity = (0.75 + 0.25 * rhythm.pulse) * f;
    },
    dispose() { ringGeo.dispose(); beadGeo.dispose(); ringMat.dispose(); beadMat.dispose(); },
  };
}

// Hai dải gió xoắn từ trận đồ lên tới vành kiếm luân. Hình bất biến → dùng chung mọi nhân vật.
let streamGeometry = null;
function windGeometry() {
  if (streamGeometry) return streamGeometry;
  const seg = 72, pos = [], uv = [], idx = [];
  const point = (s, u, out) => {
    const a = s * Math.PI + u * Math.PI * 2.6, r = 0.95 - 0.3 * u + 0.08 * Math.sin(u * Math.PI);
    return out.set(Math.sin(a) * r, 0.12 + u * 1.85, Math.cos(a) * r - 0.12 * u);
  };
  const p = new THREE.Vector3(), q = new THREE.Vector3(), side = new THREE.Vector3(), out = new THREE.Vector3();
  for (let s = 0; s < 2; s++) for (let i = 0; i <= seg; i++) {
    const u = i / seg; point(s, u, p); point(s, Math.min(1, u + 0.01), q);
    side.subVectors(q, p).normalize().cross(out.set(p.x, 0, p.z).normalize()).normalize();
    const w = 0.07 * Math.sin(Math.PI * u) + 0.01;
    pos.push(p.x - side.x * w, p.y - side.y * w, p.z - side.z * w, p.x + side.x * w, p.y + side.y * w, p.z + side.z * w);
    uv.push(u, 0, u, 1);
    const n = (s * (seg + 1) + i) * 2;
    if (i < seg) idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  }
  streamGeometry = new THREE.BufferGeometry();
  streamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  streamGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  streamGeometry.setIndex(idx);
  return streamGeometry;
}

export function createWindStreams(parent, colors) {
  const mat = new THREE.ShaderMaterial({ uniforms: { edge: { value: colors.edge }, core: { value: colors.core },
    time: { value: 0 }, opacity: { value: 0.5 } }, vertexShader: trailVertex, fragmentShader: streamFragment,
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const mesh = new THREE.Mesh(windGeometry(), mat); mesh.name = 'kiem-vu-wind'; mesh.renderOrder = 6;
  parent.add(mesh);
  return {
    update(time, rhythm, f) {
      mat.uniforms.time.value = time; mesh.rotation.y = time * 0.15;
      mat.uniforms.opacity.value = (0.38 + 0.35 * rhythm.release) * f;
    },
    dispose() { mat.dispose(); },
  };
}

/** Vạn kiếm quy tông: tám kiếm hư ảnh rơi cắm vào tám kiếm ấn của trận đồ ở nhịp xuất kiếm. */
export function createSwordRain(parent, makeMaterial) {
  const mat = makeMaterial(0);
  const mesh = new THREE.InstancedMesh(swordGeometry(), mat, 8);
  mesh.name = 'kiem-vu-rain'; mesh.renderOrder = 7; mesh.frustumCulled = false; parent.add(mesh);
  const dummy = new THREE.Object3D();
  return {
    update(time, rhythm, f) {
      const ph = rhythm.phase;
      const fall = sstep(0.2, 0.33, ph), sink = sstep(0.56, 0.72, ph);
      const visible = ph > 0.2 && ph < 0.72;
      mesh.visible = visible;
      if (!visible) return;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, lag = k % 2 ? 0.03 : 0, drop = sstep(0.2 + lag, 0.33, ph);
        const y = 0.35 + (1 - drop * drop) * 2.8 - sink * 0.35;
        dummy.position.set(Math.sin(a) * 0.84, y, -Math.cos(a) * 0.84);
        dummy.rotation.set(Math.PI, a, 0); dummy.scale.setScalar(0.55); dummy.updateMatrix();
        mesh.setMatrixAt(k, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      const flash = Math.exp(-Math.pow((ph - 0.335) / 0.03, 2));
      mat.uniforms.time.value = time;
      mat.uniforms.opacity.value = (0.45 * fall + 0.6 * flash) * (1 - sink) * f;
    },
    dispose() { mesh.dispose(); mat.dispose(); },
  };
}
