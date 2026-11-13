import * as THREE from 'three';
import { swordGeometry } from './sword-geometry.js';
import { swordVertex, swordFragment, trailVertex, trailFragment, sealVertex, sealFragment } from './kiem-vu-shaders.js';

// Thanh Phong Kiếm Vũ (effect 12) — pháp tướng riêng theo công thức của Kim Liên:
//  - Kiếm luân sau lưng: 12 kiếm ngoài + 8 kiếm trong xếp như đóa sen hướng tâm, hai vòng
//    quay ngược chiều, chừa khoảng rỗng quanh đầu; vành pháp luân mảnh bao ngoài.
//  - Ba phi kiếm bay quanh thân trên ba quỹ đạo nghiêng, kéo vệt kiếm khí.
//  - Trận đồ dưới chân: tám kiếm ấn hướng tâm, vòng đôi, vạch khắc.
//  - Nhịp 8 giây: tụ kiếm (thu vào) → xuất kiếm (bung ra, sóng sáng quét quanh vòng,
//    trận đồ phát xung) → ổn định. Mọi chuyển động là hàm thuần của thời gian.
const STEEL = new THREE.Color('#1f7f74'), EDGE = new THREE.Color('#8ff2e2'), CORE = new THREE.Color('#e9fff9');
const BASE_OPACITY = 0.9, CYCLE = 8;
const sstep = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const bell = (c, w, x) => Math.exp(-((x - c) * (x - c)) / (w * w));
// Ba quỹ đạo phi kiếm: bán kính, độ cao, nghiêng mặt phẳng, xoay phương, tốc độ (dấu = chiều).
const ORBITS = [
  { r: 0.95, h: 0.62, tilt: 0.38, yaw: 0, speed: 1.05 },
  { r: 0.88, h: 1.02, tilt: -0.28, yaw: 2.1, speed: -0.85 },
  { r: 1.0, h: 1.4, tilt: 0.18, yaw: 4.2, speed: 1.25 },
];

let dotTexture = null;
function dot() {
  if (dotTexture) return dotTexture;
  const px = new Uint8Array(16 * 16 * 4);
  for (let i = 0; i < 256; i++) {
    const r = Math.hypot((i % 16 - 7.5) / 7.5, (Math.floor(i / 16) - 7.5) / 7.5);
    px.set([255, 255, 255, Math.round(255 * Math.max(0, 1 - r) ** 2)], i * 4);
  }
  dotTexture = new THREE.DataTexture(px, 16, 16); dotTexture.needsUpdate = true;
  return dotTexture;
}

/** reducedMotion: đối tượng `{ matches }` (đã tính nút "Hiệu ứng động đầy đủ"); mặc định
    đọc thẳng thiết lập hệ điều hành. Giảm chuyển động = chậm ba lần, không tắt hình. */
export function createKiemVuAura(lowQuality = false, reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  const group = new THREE.Group(); group.name = 'kiem-vu-aura';
  // Bộ điều khiển opacity mà Avatar ghi khi mờ dần (giống ribbon-aura).
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: BASE_OPACITY });
  const geometries = [], materials = [group.material];
  const sword = swordGeometry();
  const swordUniforms = (ink) => ({ steel: { value: STEEL }, edge: { value: EDGE }, core: { value: CORE },
    time: { value: 0 }, opacity: { value: 1 }, sweep: { value: 0 }, sweepOn: { value: 0 }, ink: { value: ink } });
  const glowMat = new THREE.ShaderMaterial({ uniforms: swordUniforms(0), vertexShader: swordVertex, fragmentShader: swordFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const inkMat = new THREE.ShaderMaterial({ uniforms: swordUniforms(1), vertexShader: swordVertex, fragmentShader: swordFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide });
  materials.push(glowMat, inkMat);
  const swordSets = [];
  // Lớp sáng + lớp mực dùng chung ma trận instance và nằm chung một nhóm để quay cùng nhau.
  function swords(count, parent) {
    const holder = new THREE.Group(); parent.add(holder);
    const glow = new THREE.InstancedMesh(sword, glowMat, count);
    glow.renderOrder = 7; holder.add(glow);
    if (!lowQuality) {
      const ink = new THREE.InstancedMesh(sword, inkMat, count);
      ink.instanceMatrix = glow.instanceMatrix; ink.renderOrder = 6; holder.add(ink);
    }
    swordSets.push(glow); holder.mesh = glow; return holder;
  }

  // Kiếm luân sau lưng.
  const wheel = new THREE.Group(); wheel.name = 'kiem-vu-wheel';
  wheel.position.set(0, 1.42, -0.42); group.add(wheel);
  const outer = swords(12, wheel), inner = swords(lowQuality ? 6 : 8, wheel);
  const sealMat = (mode, opacity) => new THREE.ShaderMaterial({
    uniforms: { edge: { value: EDGE }, core: { value: CORE }, time: { value: 0 }, opacity: { value: opacity },
      pulse: { value: 0 }, sweep: { value: 0 }, mode: { value: mode } },
    vertexShader: sealVertex, fragmentShader: sealFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const rimMat = sealMat(1, 0.6), groundMat = sealMat(0, 0.75), auraMat = sealMat(2, 0.55);
  materials.push(rimMat, groundMat, auraMat);
  const rimGeo = new THREE.PlaneGeometry(2.3, 2.3), groundGeo = new THREE.PlaneGeometry(3, 3);
  geometries.push(rimGeo, groundGeo);
  const rim = new THREE.Mesh(rimGeo, rimMat); rim.position.z = -0.03; rim.renderOrder = 6; wheel.add(rim);
  const glowDisc = new THREE.Mesh(rimGeo, auraMat); glowDisc.position.z = -0.06; glowDisc.renderOrder = 5; wheel.add(glowDisc);
  const ground = new THREE.Mesh(groundGeo, groundMat); ground.name = 'kiem-vu-seal';
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0.04; ground.renderOrder = 6; group.add(ground);

  // Phi kiếm + vệt kiếm khí.
  const flying = swords(ORBITS.length, group);
  const seg = lowQuality ? 12 : 22, trailPos = new Float32Array(ORBITS.length * (seg + 1) * 6);
  const trailUv = [], trailIdx = [];
  for (let k = 0; k < ORBITS.length; k++) for (let j = 0; j <= seg; j++) {
    trailUv.push(j / seg, 0, j / seg, 1);
    const n = (k * (seg + 1) + j) * 2;
    if (j < seg) trailIdx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  }
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
  trailGeo.setAttribute('uv', new THREE.Float32BufferAttribute(trailUv, 2)); trailGeo.setIndex(trailIdx);
  const trailMat = new THREE.ShaderMaterial({ uniforms: { edge: { value: EDGE }, core: { value: CORE }, opacity: { value: 0.7 } },
    vertexShader: trailVertex, fragmentShader: trailFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  geometries.push(trailGeo); materials.push(trailMat);
  const trails = new THREE.Mesh(trailGeo, trailMat); trails.frustumCulled = false; trails.renderOrder = 6; group.add(trails);

  // Hạt kiếm khí bay lên quanh thân.
  const moteCount = lowQuality ? 8 : 18, motePos = new Float32Array(moteCount * 3);
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: EDGE, size: 0.07, map: dot(), transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending });
  geometries.push(moteGeo); materials.push(moteMat);
  const motes = new THREE.Points(moteGeo, moteMat); motes.frustumCulled = false; group.add(motes);
  group.traverse(o => { o.frustumCulled = false; });

  const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3(), q = new THREE.Vector3(), tangent = new THREE.Vector3(), normal = new THREE.Vector3();
  const euler = new THREE.Euler();
  function orbitPoint(o, theta, out) {
    euler.set(o.tilt, o.yaw, 0, 'YXZ');
    return out.set(Math.cos(theta) * o.r, 0, Math.sin(theta) * o.r).applyEuler(euler).setY(out.y + o.h);
  }
  function layRing(mesh, count, radius, length, z, t, push, offset) {
    for (let i = 0; i < count; i++) {
      const a = (i + offset) / count * Math.PI * 2, r = radius + push + 0.012 * Math.sin(t * 1.3 + i * 1.7);
      dummy.position.set(Math.sin(a) * r, Math.cos(a) * r, z);
      dummy.rotation.set(0, 0, -a); dummy.scale.setScalar(length); dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    points: group,
    update(t) {
      const time = reducedMotion?.matches ? t * 0.35 : t;
      const f = group.material.opacity / BASE_OPACITY;
      const phase = (time / CYCLE) % 1;
      const gather = bell(0.22, 0.1, phase), release = sstep(0.3, 0.37, phase) * (1 - sstep(0.4, 0.75, phase));
      const sweepOn = sstep(0.3, 0.36, phase) * (1 - sstep(0.62, 0.72, phase));
      const sweep = sstep(0.32, 0.68, phase) * Math.PI * 2, pulse = bell(0.38, 0.09, phase);
      const push = 0.08 * release - 0.035 * gather;
      layRing(outer.mesh, 12, 0.42, 0.62, 0, time, push, 0);
      layRing(inner.mesh, inner.mesh.count, 0.21, 0.36, -0.02, time, push * 0.6, 0.5);
      outer.rotation.z = time * 0.1; inner.rotation.z = -time * 0.16;
      rim.rotation.z = time * 0.04;
      wheel.position.y = 1.42 + 0.03 * Math.sin(time * 0.7);
      for (const m of [glowMat, inkMat]) {
        m.uniforms.time.value = time; m.uniforms.sweep.value = sweep; m.uniforms.sweepOn.value = sweepOn;
      }
      glowMat.uniforms.opacity.value = 0.85 * f; inkMat.uniforms.opacity.value = 0.55 * f;
      for (const m of [rimMat, groundMat, auraMat]) { m.uniforms.time.value = time; m.uniforms.pulse.value = pulse; m.uniforms.sweep.value = sweep; }
      rimMat.uniforms.opacity.value = (0.5 + 0.3 * sweepOn) * f; groundMat.uniforms.opacity.value = 0.75 * f;
      auraMat.uniforms.opacity.value = 0.55 * f;

      ORBITS.forEach((o, k) => {
        const dir = Math.sign(o.speed), theta = time * o.speed * (1 + 0.6 * release) + o.yaw;
        orbitPoint(o, theta, p); orbitPoint(o, theta + dir * 0.01, q);
        tangent.subVectors(q, p).normalize();
        dummy.position.copy(p); dummy.quaternion.setFromUnitVectors(up, tangent);
        dummy.scale.setScalar(0.5); dummy.updateMatrix(); flying.mesh.setMatrixAt(k, dummy.matrix);
        for (let j = 0; j <= seg; j++) {
          const th = theta - dir * j * 0.065;
          orbitPoint(o, th, p); orbitPoint(o, th + dir * 0.01, q);
          // Dải vệt đứng vuông góc mặt phẳng quỹ đạo: nhìn ngang (góc camera thường gặp) thấy rõ.
          normal.set(0, 1, 0).applyEuler(euler);
          const w = 0.06 * (1 - j / seg * 0.6), base = ((k * (seg + 1) + j) * 2) * 3;
          trailPos.set([p.x - normal.x * w, p.y - normal.y * w, p.z - normal.z * w,
            p.x + normal.x * w, p.y + normal.y * w, p.z + normal.z * w], base);
        }
      });
      flying.mesh.instanceMatrix.needsUpdate = true;
      trailGeo.attributes.position.needsUpdate = true;
      trailMat.uniforms.opacity.value = 0.7 * f;

      for (let i = 0; i < moteCount; i++) {
        const u = ((i / moteCount + time * 0.09) % 1 + 1) % 1, a = i * 2.39996 + time * 0.2;
        const r = 0.75 + 0.3 * Math.sin(u * Math.PI);
        motePos.set([Math.cos(a) * r, 0.1 + u * 2.2, Math.sin(a) * r], i * 3);
      }
      moteGeo.attributes.position.needsUpdate = true;
      moteMat.opacity = 0.7 * f;
    },
    beginFade() {}, // Avatar ghi thẳng group.material.opacity; không có material dùng chung để nhân bản.
    setColor() {},
    setWeapon() {},
    dispose() {
      swordSets.forEach(m => m.dispose());
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
    },
  };
}
