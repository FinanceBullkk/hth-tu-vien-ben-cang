import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { billboardLayer } from './aura-billboard-layer.js';
import { kiemVuStar } from './kiem-vu-textures.js';
import { softDot } from './aura-rhythm.js';
import { shellVertex, shellBillboardVertex, ringFragment } from './tinh-ha-shaders.js';

// Thiên Cầu bao thân — bóng dáng chính của Tinh Hà: hồn thiên nghi trong suốt bao trọn người, tâm
// ngang ngực. Ba bộ vòng kim loại khắc độ (cung hở đầu), MỖI BỘ QUAY QUANH MỘT TRỤC RIÊNG, rất chậm
// và tốc độ cố định ("quay đa trục"):
//  A — chân trời + kinh tuyến chính: quay quanh trục đứng;
//  B — xích đạo + hoàng đạo (nghiêng 23.5°) + trục cực: thiên cầu quay quanh trục cực nghiêng, đầu
//      bắc là sao Bắc Cực; chòm sao trên vỏ cầu quay theo bộ này;
//  C — hai vòng phân chí lồng trong: lộn chậm quanh trục ngang.
// Ba tinh cầu nhỏ trôi trên vòng như hạt của mô hình thiên văn. Mọi nét chừa mặt (shader).
export const SPHERE_CENTER = new THREE.Vector3(0, 1.25, 0);
export const SPIN = { a: 0.03, b: 0.04, c: -0.025 }; // rad/giây, cố định
const GAP = 0.85, SEG = 64, AXIS = 1.55;
// rot: Euler đưa vòng (vẽ trong mặt XY) về mặt phẳng của nó; gap: góc giữa chỗ hở.
const RINGS = {
  a: [{ r: 1.42, rot: [Math.PI / 2, 0, 0], gap: Math.PI / 2, w: 0.06 }, { r: 1.42, rot: [0, 0.35, 0], gap: -Math.PI / 2, w: 0.055 }],
  b: [{ r: 1.3, rot: [Math.PI / 2, 0, 0], gap: 0.3, w: 0.05 }, { r: 1.3, rot: [Math.PI / 2 + 0.41, 0, 0], gap: 2.2, w: 0.06 }],
  c: [{ r: 1.16, rot: [0, 0, 0], gap: 1.0, w: 0.04 }, { r: 1.16, rot: [0, 1.05, 0], gap: 4.0, w: 0.04 }],
};
// Tinh cầu trôi trên vòng: [bộ, chỉ số vòng, tốc độ góc, pha, cỡ].
const PLANETS = [['b', 1, 0.11, 0, 0.16], ['a', 0, -0.08, 2.4, 0.13], ['b', 0, 0.09, 4.1, 0.11]];
const TILT = new THREE.Euler(0.4, 0, 0.3); // trục cực ngả về phía người xem và lệch trái

function ringMaterial(colors, ink, head) {
  return new THREE.ShaderMaterial({
    uniforms: { edge: { value: colors.edge }, core: { value: colors.core }, gold: { value: colors.gold }, steel: { value: colors.steel },
      opacity: { value: 1 }, time: { value: 0 }, ink: { value: ink }, head: { value: head } },
    vertexShader: shellVertex, fragmentShader: ringFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}

/** head: Vector3 toạ độ thế giới của đầu, aura cập nhật mỗi khung (dùng chung mọi lớp chừa mặt). */
export function createCelestialSphere(parent, colors, lowQuality, head) {
  const sets = lowQuality ? ['a', 'b'] : ['a', 'b', 'c'];
  const rings = sets.flatMap(set => RINGS[set].map(ring => ({ set, ring })));
  const strips = createRibbonStrips(rings.length + 1, SEG);
  const glowMat = ringMaterial(colors, 0, head), materials = [glowMat];
  const mesh = new THREE.Mesh(strips.geometry, glowMat); mesh.name = 'tinh-ha-armillary'; mesh.renderOrder = 7; parent.add(mesh);
  if (!lowQuality) {
    const inkMat = ringMaterial(colors, 1, head); materials.push(inkMat);
    const shade = new THREE.Mesh(strips.geometry, inkMat); shade.renderOrder = 6; parent.add(shade);
  }
  const shellOpts = { vertexShader: shellBillboardVertex, uniforms: { head: { value: head } } };
  const poles = billboardLayer(parent, 'tinh-ha-pole-stars', kiemVuStar(), 2, colors.core.clone().lerp(colors.gold, 0.35),
    THREE.AdditiveBlending, shellOpts);
  const planets = billboardLayer(parent, 'tinh-ha-planets', softDot(), PLANETS.length * 2, colors.core.clone().lerp(colors.gold, 0.45),
    THREE.AdditiveBlending, shellOpts);

  /** Khung toạ độ từng bộ (trong parent): tâm cầu, co giãn theo nhịp thở, quay theo trục riêng. */
  const frames = { a: new THREE.Matrix4(), b: new THREE.Matrix4(), c: new THREE.Matrix4() };
  const tiltM = new THREE.Matrix4().makeRotationFromEuler(TILT), base = new THREE.Matrix4(), axisFrame = new THREE.Matrix4();
  const rot = new THREE.Matrix4(), local = new THREE.Matrix4(), nm = new THREE.Matrix3(), euler = new THREE.Euler();
  const p = new THREE.Vector3(), side = new THREE.Vector3(), northPole = new THREE.Vector3();
  const ringPoint = (frame, ring, a, out) => {
    local.multiplyMatrices(frame, rot.makeRotationFromEuler(euler.set(...ring.rot)));
    return out.set(Math.cos(a) * ring.r, Math.sin(a) * ring.r, 0).applyMatrix4(local);
  };

  return {
    frames, northPole,
    update(time, rhythm, f) {
      const s = 1 + 0.025 * rhythm.release - 0.015 * rhythm.gather;
      base.makeScale(s, s, s).setPosition(SPHERE_CENTER);
      frames.a.multiplyMatrices(base, rot.makeRotationY(time * SPIN.a));
      axisFrame.multiplyMatrices(base, tiltM);
      frames.b.multiplyMatrices(axisFrame, rot.makeRotationY(time * SPIN.b));
      frames.c.multiplyMatrices(base, rot.makeRotationX(time * SPIN.c));
      rings.forEach(({ set, ring }, k) => {
        local.multiplyMatrices(frames[set], rot.makeRotationFromEuler(euler.set(...ring.rot))); nm.setFromMatrix4(local);
        for (let j = 0; j <= SEG; j++) {
          const a = ring.gap + GAP / 2 + (Math.PI * 2 - GAP) * j / SEG, c = Math.cos(a), sn = Math.sin(a);
          p.set(c * ring.r, sn * ring.r, 0).applyMatrix4(local); side.set(c, sn, 0).applyMatrix3(nm).normalize();
          strips.write(k, j, p, side, ring.w);
        }
      });
      // Trục cực: dải thẳng xuyên tâm theo trục nghiêng (không quay theo thiên cầu).
      nm.setFromMatrix4(axisFrame); side.set(1, 0, 0).applyMatrix3(nm).normalize();
      for (let j = 0; j <= SEG; j++) strips.write(rings.length, j, p.set(0, AXIS * (j / SEG * 2 - 1), 0).applyMatrix4(axisFrame), side, 0.014);
      strips.commit();
      for (const m of materials) m.uniforms.time.value = time;
      glowMat.uniforms.opacity.value = (0.8 + 0.2 * rhythm.pulse) * f;
      if (materials[1]) materials[1].uniforms.opacity.value = 0.55 * f;
      // Sao Bắc Cực (đầu bắc trục) rực, sao Nam Cực mờ.
      const tw = 0.5 + 0.5 * Math.sin(time * 0.9);
      northPole.set(0, AXIS + 0.05, 0).applyMatrix4(axisFrame);
      poles.set(0, northPole.x, northPole.y, northPole.z, 0.36 + 0.05 * tw, 0.36 + 0.05 * tw, 0.95);
      p.set(0, -AXIS, 0).applyMatrix4(axisFrame); poles.set(1, p.x, p.y, p.z, 0.14, 0.14, 0.45);
      poles.commit(); poles.material.uniforms.opacity.value = f;
      // Tinh cầu: lõi đặc + quầng loang mềm (hai instance cùng chỗ), trôi trên vòng với tốc độ góc cố định.
      PLANETS.forEach(([set, i, speed, phase, size], k) => {
        if (!sets.includes(set)) return;
        ringPoint(frames[set], RINGS[set][i], time * speed + phase, p);
        const halo = 2.6 * (1 + 0.1 * Math.sin(time * 0.8 + k * 1.7));
        planets.set(k * 2, p.x, p.y, p.z, size, size, 1);
        planets.set(k * 2 + 1, p.x, p.y, p.z, size * halo, size * halo, 0.35 + 0.15 * rhythm.pulse);
      });
      planets.commit(); planets.material.uniforms.opacity.value = f;
    },
    dispose() { strips.geometry.dispose(); materials.forEach(m => m.dispose()); poles.dispose(); planets.dispose(); },
  };
}
