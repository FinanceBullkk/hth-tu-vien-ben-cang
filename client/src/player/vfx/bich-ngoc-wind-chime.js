import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { solidMaterial, KIND, SWAY_SPEED, SWAY_BIAS } from './bich-ngoc-materials.js';
import { tag, culmAxis, swayOffset } from './bich-ngoc-geometry.js';
import { bichNgocWindTag, TAG_SIZE } from './bich-ngoc-textures.js';
import { STALKS } from './bich-ngoc-grove.js';

// Chuông gió ngọc (phong linh) — chi tiết "Thanh Phong": treo trên một cần trúc nhỏ chìa ra từ
// thân trúc cao bên phải, ngoài xa vùng mặt. Mũ ngọc, năm ống ngọc dài ngắn, thẻ ngọc khắc 風.
// Cả chùm đi theo thân trúc lay, tự đung đưa nhẹ như con lắc với tốc độ cố định.
const HOST = STALKS[5], HANG_Y = 2.08, ARM = [0.42, 0.9], ARM_LEN = 0.22;

const piece = (geo, x, y, z) => { geo.translate(x, y, z); const g = geo.index ? geo.toNonIndexed() : geo; return tag(g, KIND.jade, i => [-g.attributes.position.getY(i) / 0.3, 0, 0]); };

/** Mũ, dây và ống ngọc (gốc toạ độ là điểm treo, chùm rủ theo -y). */
export function chimeGeometry() {
  const parts = [piece(new THREE.CylinderGeometry(0.003, 0.003, 0.11, 4), 0, -0.055, 0),
    piece(new THREE.ConeGeometry(0.065, 0.05, 10), 0, -0.135, 0),
    piece(new THREE.SphereGeometry(0.014, 8, 5), 0, -0.105, 0),
    piece(new THREE.CylinderGeometry(0.002, 0.002, 0.16, 3), 0, -0.24, 0)];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, x = Math.cos(a) * 0.042, z = Math.sin(a) * 0.042, len = 0.1 + 0.07 * ((i * 3) % 5) / 4;
    parts.push(piece(new THREE.CylinderGeometry(0.0018, 0.0018, 0.03, 3), x, -0.175, z),
      piece(new THREE.CylinderGeometry(0.009, 0.009, len, 8), x, -0.19 - len / 2, z));
  }
  const merged = mergeGeometries(parts); parts.forEach(p => p.dispose());
  return merged;
}

export function createWindChime(parent, colors, lowQuality) {
  const geometries = [], materials = [], own = m => (materials.push(m), m);
  const anchor = new THREE.Group(); anchor.name = 'bich-ngoc-wind-chime'; parent.add(anchor);
  const base = culmAxis(HOST, HANG_Y), hang = base.clone().add(new THREE.Vector3(ARM[0] * ARM_LEN, 0.03, ARM[1] * ARM_LEN));
  anchor.position.copy(hang);
  const body = own(solidMaterial(colors, 1)), glow = own(solidMaterial(colors, 0));
  // Cần trúc nhỏ từ thân ra điểm treo.
  const armGeo = tag(new THREE.CylinderGeometry(0.008, 0.012, ARM_LEN, 6).rotateX(Math.PI / 2).rotateY(Math.atan2(ARM[0], ARM[1]))
    .translate(-ARM[0] * ARM_LEN / 2, -0.015, -ARM[1] * ARM_LEN / 2), KIND.twig, () => [0.6, 0, 0]);
  geometries.push(armGeo);
  const arm = new THREE.Mesh(armGeo, body); arm.name = 'bich-ngoc-chime-arm'; arm.renderOrder = 5; anchor.add(arm);
  const pendulum = new THREE.Group(); anchor.add(pendulum);
  const geo = chimeGeometry(); geometries.push(geo);
  const jade = new THREE.Mesh(geo, body); jade.name = 'bich-ngoc-chime-jade'; jade.renderOrder = 5; pendulum.add(jade);
  if (!lowQuality) { const shine = new THREE.Mesh(geo, glow); shine.name = 'bich-ngoc-chime-jade'; shine.renderOrder = 8; pendulum.add(shine); }
  const tagGeo = new THREE.PlaneGeometry(...TAG_SIZE); geometries.push(tagGeo);
  const tagMat = own(new THREE.MeshBasicMaterial({ map: bichNgocWindTag(), transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const plate = new THREE.Mesh(tagGeo, tagMat); plate.name = 'bich-ngoc-wind-tag'; plate.position.y = -0.32 - TAG_SIZE[1] / 2; plate.renderOrder = 6;
  pendulum.add(plate);

  return {
    update(time, rhythm, f) {
      const [dx, dz] = swayOffset(HOST, HANG_Y, time, SWAY_SPEED, SWAY_BIAS);
      anchor.position.set(hang.x + dx, hang.y, hang.z + dz);
      pendulum.rotation.set(0.05 * Math.sin(time * 0.7 + 1), 0.25 * Math.sin(time * 0.31), 0.08 * Math.sin(time * 0.9));
      for (const m of [body, glow]) m.uniforms.time.value = time;
      body.uniforms.opacity.value = 0.95 * f; glow.uniforms.opacity.value = 0.8 * f; glow.uniforms.glow.value = rhythm.pulse;
      tagMat.opacity = f;
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
