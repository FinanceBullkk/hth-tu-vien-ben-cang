import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex, arcFragment } from './aura-flow-shaders.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot, sstep } from './aura-rhythm.js';
import { goldFragment, instancedLayer, litMaterial } from './vip-aura-shaders.js';
import { sunburstTexture } from './than-bai-textures.js';

// Kim Lý vượt sóng — bóng dáng chính của Vua câu cá: cá chép vàng khổng lồ bơi vòng tròn đứng sau lưng,
// vọt khỏi mặt biển bên phải, vồng qua sau đầu rồi lặn xuống bên trái (nửa dưới vòng nằm dưới mặt nước,
// bị cắt bởi shader). Đuôi kéo dải kim quang, nước nhỏ thành vệt cung, hai chỗ xuyên mặt nước toé bọt.
// "LÝ NGƯ HOÁ LONG": vòng bơi khớp nhịp 12 giây (hai vòng một nhịp) để đúng đỉnh nhịp cá vắt ngang trên đầu;
// lúc đó cá mọc đôi sừng rồng vàng có nhánh, râu dài gấp ba, vây lưng vươn như bờm, hào quang tia bùng sau
// đầu cá và kim quang xoáy quanh thân — rồi trở lại làm cá chép khi lặn xuống.
export const LOOP = { x: 0, y: 0.5, z: -0.8, radius: 1.12, period: 6 };
export const CARP = { length: 1.35, height: 0.34, width: 0.19 };
const SPAN = CARP.length / LOOP.radius, TRAIL_SPAN = 1.25, DRIPS = 16, SPRAY = 14, MOTES = 18;
// Đỉnh nhịp (phase 0.45 của chu kỳ 12 giây = giây 5.4): giữa thân cá nằm ngay đỉnh vòng.
export const CLIMAX_TIME = 0.45 * 12;
const OFFSET = Math.PI / 2 + SPAN / 2 - CLIMAX_TIME / LOOP.period * Math.PI * 2;

/** Góc đầu cá trên vòng ở thời điểm time (tăng dần: lên bên phải, qua đỉnh, xuống bên trái). */
export const carpHeadAngle = time => time / LOOP.period * Math.PI * 2 + OFFSET;
/** Độ "hoá rồng" theo nhịp: lên quanh đỉnh nhịp, tắt khi cá lặn xuống. */
export const dragonize = rhythm => sstep(0.37, 0.45, rhythm.phase) * (1 - sstep(0.55, 0.66, rhythm.phase));

/** Sừng rồng: nhánh chính cong ra sau và một nhánh phụ, gốc ở (0,0,0), mọc theo trục +y. */
function hornGeometry() {
  const main = new THREE.ConeGeometry(0.032, 0.28, 7).translate(0, 0.14, 0);
  const tine = new THREE.ConeGeometry(0.018, 0.12, 6).translate(0, 0.06, 0).rotateZ(-0.75).translate(0, 0.12, 0);
  const geo = mergeGeometries([main, tine]);
  main.dispose(); tine.dispose();
  return geo;
}
/** Điểm trên vòng ở góc a (mặt phẳng đứng sau lưng, lắc nhẹ trước sau). */
export function loopPoint(a, time, out) {
  return out.set(LOOP.x + Math.cos(a) * LOOP.radius, LOOP.y + Math.sin(a) * LOOP.radius, LOOP.z + 0.1 * Math.sin(a * 2 + time * 0.4));
}
// Hai góc vòng cắt mặt nước (y = 0): vọt lên bên phải, lặn bên trái.
const CROSS = Math.asin(-LOOP.y / LOOP.radius);
export const EMERGE_ANGLE = CROSS, DIVE_ANGLE = Math.PI - CROSS;

export function createGiantCarp(parent, bodies, index, colors, lowQuality) {
  const up = new THREE.Vector3(), p = new THREE.Vector3(), tail = new THREE.Vector3(), side = new THREE.Vector3(0, 0, 1);
  const seg = lowQuality ? 16 : 32, strips = createRibbonStrips(1, seg);
  const trailMat = new THREE.ShaderMaterial({
    uniforms: { edge: { value: colors.aqua }, core: { value: colors.light }, gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 } },
    vertexShader: ribbonVertex, fragmentShader: arcFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const trail = new THREE.Mesh(strips.geometry, trailMat); trail.name = 'vua-cau-ca-carp-trail'; trail.frustumCulled = false; trail.renderOrder = 7;
  parent.add(trail);
  const water = billboardLayer(parent, 'vua-cau-ca-carp-water', softDot(), DRIPS + SPRAY * 2, colors.foam.clone(), THREE.AdditiveBlending);
  const crossings = [EMERGE_ANGLE, DIVE_ANGLE].map(a => loopPoint(a, 0, new THREE.Vector3()).setY(0.02));
  const hornGeo = hornGeometry();
  const horns = instancedLayer(parent, 'vua-cau-ca-dragon-horns', hornGeo, litMaterial(goldFragment, {
    deep: { value: colors.deep }, gold: { value: colors.gold }, light: { value: colors.light }, ink: { value: colors.ink }, pulse: { value: 0 },
  }), 2, 7);
  const glory = billboardLayer(parent, 'vua-cau-ca-dragon-glory', sunburstTexture(), 1, colors.gold.clone(), THREE.AdditiveBlending);
  glory.mesh.renderOrder = 4;
  const motes = billboardLayer(parent, 'vua-cau-ca-dragon-motes', softDot(), MOTES, colors.light.clone(), THREE.AdditiveBlending);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), hs = new THREE.Vector3(), T = new THREE.Vector3(), D = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);

  // Thân cá có đang xuyên qua góc a không (0..1, mềm ở hai đầu).
  const through = (head, a) => {
    const d = ((head - a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    return d < SPAN + 0.15 ? Math.min(1, d / 0.12, (SPAN + 0.15 - d) / 0.2) : 0;
  };

  return {
    update(time, rhythm, f) {
      const head = carpHeadAngle(time), dragon = dragonize(rhythm);
      up.set(Math.cos(head), Math.sin(head), 0);
      bodies.pose(index, (u, out) => loopPoint(head - u * SPAN, time, out), up, time, 0, false, dragon);

      // Sừng rồng mọc trên đầu cá: gốc sau mắt, ngả ra sau theo thân, hai bên đối xứng.
      const ha = head - 0.12 * SPAN;
      loopPoint(ha, time, p);
      T.set(-Math.sin(ha), Math.cos(ha), 0); D.set(Math.cos(ha), Math.sin(ha), 0);
      [-1, 1].forEach((sgn, i) => {
        dir.copy(D).multiplyScalar(0.75).addScaledVector(T, -0.6).addScaledVector(Z, sgn * 0.35).normalize();
        q.setFromUnitVectors(Y, dir);
        tail.copy(p).addScaledVector(D, CARP.height * 0.38).addScaledVector(Z, sgn * CARP.width * 0.28);
        horns.set(i, m.compose(tail, q, hs.setScalar(Math.max(0.001, dragon * (1 + 0.15 * Math.sin(time * 3))))), dragon > 0.01 ? f : 0);
      });
      horns.commit();
      horns.material.uniforms.time.value = time; horns.material.uniforms.pulse.value = dragon;
      // Hào quang tia bùng sau đầu cá, kim quang xoáy dọc thân.
      loopPoint(head - 0.05 * SPAN, time, p);
      glory.set(0, p.x, p.y, p.z - 0.12, 1.9 * dragon, 1.9 * dragon, dragon * 0.85 * f, (time * 0.03) % 1);
      glory.commit();
      for (let k = 0; k < MOTES; k++) {
        const u = k / MOTES, a = head - u * SPAN, spin = time * 4 + k * 2.1, r = 0.22 + 0.08 * Math.sin(time * 3 + k);
        loopPoint(a, time, p);
        p.x += Math.cos(a) * Math.cos(spin) * r; p.y += Math.sin(a) * Math.cos(spin) * r; p.z += Math.sin(spin) * r;
        const size = 0.05 + 0.03 * Math.sin(time * 7 + k);
        motes.set(k, p.x, p.y, p.z, size, size, dragon * (p.y > 0.05 ? 1 : 0) * f);
      }
      motes.commit();

      // Dải kim quang bám đuôi, tan dần.
      for (let j = 0; j <= seg; j++) {
        const t = j / seg, a = head - SPAN - t * TRAIL_SPAN;
        loopPoint(a, time, p);
        p.z += 0.06 * Math.sin(t * 9 - time * 3);
        strips.write(0, j, p, side, 0.09 * Math.pow(1 - t, 1.2) * Math.min(1, t * 8 + 0.3) * (p.y > 0.05 ? 1 : 0));
      }
      strips.commit();
      trailMat.uniforms.time.value = time; trailMat.uniforms.opacity.value = (0.75 + 0.25 * rhythm.pulse) * f;

      // Nước nhỏ từ đuôi: vị trí đuôi ở các khoảnh khắc trước, rơi tự do theo thời gian đã trôi.
      for (let k = 0; k < DRIPS; k++) {
        const dt = (k + 1) * 0.07, a = carpHeadAngle(time - dt) - SPAN;
        loopPoint(a, time - dt, tail);
        const y = tail.y - 4.9 * dt * dt, seen = tail.y > 0.05 && y > 0.02;
        const size = 0.045 * (1 - k / DRIPS) + 0.015;
        water.set(k, tail.x + (hash(k) - 0.5) * 0.08, Math.max(0.02, y), tail.z + (hash(k + 9) - 0.5) * 0.08, size, size * 1.4, seen ? (1 - k / DRIPS) * 0.9 * f : 0);
      }
      // Bọt toé ở chỗ thân cá xuyên mặt nước.
      crossings.forEach((at, e) => {
        const on = through(head, e ? DIVE_ANGLE : EMERGE_ANGLE);
        for (let k = 0; k < SPRAY; k++) {
          const u = ((time / 0.8 + k / SPRAY) % 1 + 1) % 1, th = k * 2.4 + e;
          const r = 0.06 + 0.35 * u, size = 0.07 * (1 - u) + 0.02;
          water.set(DRIPS + e * SPRAY + k, at.x + Math.cos(th) * r * 0.6, 0.03 + (1.4 + hash(k + e * 31)) * u - 2.2 * u * u, at.z + Math.sin(th) * r,
            size, size, on * (1 - u) * f);
        }
      });
      water.commit();
    },
    dispose() { strips.geometry.dispose(); trailMat.dispose(); water.dispose(); horns.dispose(); hornGeo.dispose(); glory.dispose(); motes.dispose(); },
  };
}
