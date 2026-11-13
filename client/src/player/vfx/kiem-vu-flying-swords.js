import * as THREE from 'three';
import { swordGeometry } from './sword-geometry.js';
import { trailVertex, trailFragment } from './kiem-vu-shaders.js';

// Ba phi kiếm của Kiếm Vũ bay trên ba quỹ đạo nghiêng quanh thân, mỗi thanh kéo vệt kiếm khí
// và một tua kiếm (kiếm tuệ) vàng đung đưa sau núm chuôi.
const ORBITS = [
  { r: 0.95, h: 0.62, tilt: 0.38, yaw: 0, speed: 1.05 },
  { r: 0.88, h: 1.02, tilt: -0.28, yaw: 2.1, speed: -0.85 },
  { r: 1.0, h: 1.4, tilt: 0.18, yaw: 4.2, speed: 1.25 },
];
const SCALE = 0.5, TASSEL_SEG = 7;

function strips(count, seg) {
  const pos = new Float32Array(count * (seg + 1) * 6), uv = [], idx = [];
  for (let k = 0; k < count; k++) for (let j = 0; j <= seg; j++) {
    uv.push(j / seg, 0, j / seg, 1);
    const n = (k * (seg + 1) + j) * 2;
    if (j < seg) idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  return { geo, pos };
}

export function createFlyingSwords(parent, colors, makeSword, lowQuality) {
  const swords = makeSword(ORBITS.length, parent);
  const seg = lowQuality ? 12 : 22;
  const trail = strips(ORBITS.length, seg), tassel = strips(ORBITS.length, TASSEL_SEG);
  const material = (edge, core) => new THREE.ShaderMaterial({
    uniforms: { edge: { value: edge }, core: { value: core }, opacity: { value: 0.7 } },
    vertexShader: trailVertex, fragmentShader: trailFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const trailMat = material(colors.edge, colors.core), tasselMat = material(colors.gold, colors.core);
  for (const [{ geo }, mat] of [[trail, trailMat], [tassel, tasselMat]]) {
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 6; parent.add(mesh);
  }
  const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), euler = new THREE.Euler();
  const p = new THREE.Vector3(), q = new THREE.Vector3(), tangent = new THREE.Vector3(), normal = new THREE.Vector3();
  const knot = new THREE.Vector3();
  const orbitPoint = (o, theta, out) => {
    euler.set(o.tilt, o.yaw, 0, 'YXZ');
    return out.set(Math.cos(theta) * o.r, 0, Math.sin(theta) * o.r).applyEuler(euler).setY(out.y + o.h);
  };
  const quad = (pos, base, c, n, w) => pos.set([c.x - n.x * w, c.y - n.y * w, c.z - n.z * w, c.x + n.x * w, c.y + n.y * w, c.z + n.z * w], base);

  return {
    update(time, rhythm, f) {
      ORBITS.forEach((o, k) => {
        const dir = Math.sign(o.speed), theta = time * o.speed * (1 + 0.6 * rhythm.release) + o.yaw;
        orbitPoint(o, theta, p); orbitPoint(o, theta + dir * 0.01, q);
        tangent.subVectors(q, p).normalize();
        dummy.position.copy(p); dummy.quaternion.setFromUnitVectors(up, tangent);
        dummy.scale.setScalar(SCALE); dummy.updateMatrix(); swords.mesh.setMatrixAt(k, dummy.matrix);
        // Tua kiếm: từ vòng núm (0.29 dưới chắn) buông về sau và rủ xuống, lắc theo gió.
        knot.copy(p).addScaledVector(tangent, -0.29 * SCALE);
        normal.crossVectors(tangent, up).normalize();
        for (let j = 0; j <= TASSEL_SEG; j++) {
          const u = j / TASSEL_SEG, sway = Math.sin(time * 5 + k * 2 + u * 3) * 0.03 * u;
          q.copy(knot).addScaledVector(tangent, -0.12 * u).addScaledVector(normal, sway);
          q.y -= 0.16 * u * u;
          quad(tassel.pos, ((k * (TASSEL_SEG + 1) + j) * 2) * 3, q, normal, 0.018 * (1 - u * 0.4));
        }
        // Vệt kiếm khí: dải đứng vuông góc mặt phẳng quỹ đạo, nhìn ngang thấy rõ.
        for (let j = 0; j <= seg; j++) {
          orbitPoint(o, theta - dir * j * 0.065, p);
          normal.set(0, 1, 0).applyEuler(euler);
          quad(trail.pos, ((k * (seg + 1) + j) * 2) * 3, p, normal, 0.06 * (1 - j / seg * 0.6));
        }
      });
      swords.mesh.instanceMatrix.needsUpdate = true;
      trail.geo.attributes.position.needsUpdate = true; tassel.geo.attributes.position.needsUpdate = true;
      trailMat.uniforms.opacity.value = 0.7 * f; tasselMat.uniforms.opacity.value = 0.85 * f;
    },
    dispose() { trail.geo.dispose(); tassel.geo.dispose(); trailMat.dispose(); tasselMat.dispose(); },
  };
}
