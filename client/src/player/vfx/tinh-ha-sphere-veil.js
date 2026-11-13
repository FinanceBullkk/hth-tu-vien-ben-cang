import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { kiemVuStar } from './kiem-vu-textures.js';
import { veilVertex, veilFragment, shellBillboardVertex } from './tinh-ha-shaders.js';

// Vỏ thiên cầu và các hạt sao gắn trên nó (đều theo khung quay bộ B của thiên cầu):
//  vỏ trong suốt có viền sáng mép cầu và lưới kinh vĩ mảnh; 28 sao định vị Nhị Thập Bát Tú rải đều
//  trên vòng xích đạo; bụi sao trôi chậm dọc dải hoàng đạo (tốc độ cố định). Mọi lớp chừa mặt.
const VEIL_R = 1.36, EQUATOR_R = 1.3, ECLIPTIC_TILT = 0.41;

export function createSphereVeil(parent, colors, lowQuality, frame, head) {
  const geometry = new THREE.SphereGeometry(VEIL_R, lowQuality ? 24 : 40, lowQuality ? 16 : 24);
  const material = new THREE.ShaderMaterial({
    uniforms: { edge: { value: colors.edge }, core: { value: colors.core }, opacity: { value: 1 }, pulse: { value: 0 }, head: { value: head } },
    vertexShader: veilVertex, fragmentShader: veilFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const veil = new THREE.Mesh(geometry, material);
  veil.name = 'tinh-ha-veil'; veil.matrixAutoUpdate = false; veil.renderOrder = 3; parent.add(veil);
  const shellOpts = { vertexShader: shellBillboardVertex, uniforms: { head: { value: head } } };
  const mansions = billboardLayer(parent, 'tinh-ha-mansion-stars', kiemVuStar(), 28, colors.core.clone().lerp(colors.gold, 0.5),
    THREE.AdditiveBlending, shellOpts);
  const dustN = lowQuality ? 16 : 40;
  const dust = billboardLayer(parent, 'tinh-ha-ecliptic-dust', softDot(), dustN, colors.edge.clone().lerp(colors.core, 0.4),
    THREE.AdditiveBlending, shellOpts);
  const p = new THREE.Vector3(), tilt = new THREE.Matrix4().makeRotationX(ECLIPTIC_TILT);

  return {
    update(time, rhythm, f) {
      veil.matrix.copy(frame);
      material.uniforms.opacity.value = f; material.uniforms.pulse.value = rhythm.pulse;
      for (let i = 0; i < 28; i++) {
        const a = i / 28 * Math.PI * 2, tw = 0.5 + 0.5 * Math.sin(time * 0.7 + i * 2.3);
        p.set(Math.cos(a) * EQUATOR_R, 0, Math.sin(a) * EQUATOR_R).applyMatrix4(frame);
        const s = 0.07 + 0.03 * tw;
        mansions.set(i, p.x, p.y, p.z, s, s, 0.55 + 0.35 * tw * (0.6 + 0.4 * rhythm.release));
      }
      mansions.commit(); mansions.material.uniforms.opacity.value = f;
      // Bụi sao trôi dọc dải hoàng đạo, lệch nhẹ khỏi đường giữa dải, sáng tối theo nhịp riêng.
      for (let i = 0; i < dustN; i++) {
        const a = hash(i + 500) * Math.PI * 2 + time * 0.03, off = (hash(i + 510) - 0.5) * 0.16;
        const r = EQUATOR_R + (hash(i + 520) - 0.5) * 0.08;
        p.set(Math.cos(a) * r, off, Math.sin(a) * r).applyMatrix4(tilt).applyMatrix4(frame);
        const s = 0.035 + 0.05 * hash(i + 530);
        dust.set(i, p.x, p.y, p.z, s, s, 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(time * (0.5 + hash(i + 540)) + i)));
      }
      dust.commit(); dust.material.uniforms.opacity.value = f;
    },
    dispose() { geometry.dispose(); material.dispose(); mansions.dispose(); dust.dispose(); },
  };
}
