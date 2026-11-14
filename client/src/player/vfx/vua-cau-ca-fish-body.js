import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { fishBodyFragment, fishBodyVertex, finFragment, finVertex } from './vua-cau-ca-fish-shaders.js';

// Bộ dựng cá 3D cho Vua câu cá: mọi con cá (cá chép khổng lồ, cá mắc câu, đàn cá vọt) chung MỘT lưới thân
// và MỘT lưới vây (hai lần vẽ). Mỗi khung, chủ của con cá đưa đường sống lưng spine(u) (u = 0 mõm → 1 cuống
// đuôi) và hướng lưng gợi ý; bộ dựng tự uốn đuôi bơi, dựng thân thoi dẹt hai bên, vây đuôi chẻ, vây lưng,
// hai vây ngực, và hai râu cho cá chép.
export const FISH_KIND = { carp: 0, silver: 1 };
const FINS = 6; // đuôi, lưng, ngực trái, ngực phải, râu trái, râu phải

/** Hệ số bề dày thân theo u: mõm tròn kín, bụng đầy ở 1/4 thân, thuôn dần về cuống đuôi. */
export function bodyProfile(u) {
  if (u < 0.25) return Math.pow(Math.sin(Math.PI / 2 * u / 0.25), 0.55);
  return 1 - 0.84 * Math.pow((u - 0.25) / 0.75, 1.3);
}

/**
 * @param {Array<{ length: number, height: number, width: number, kind: number }>} specs
 */
export function createFishBodies(parent, specs, colors, lowQuality) {
  const SEG = lowQuality ? 12 : 22, RING = lowQuality ? 8 : 12, FSEG = lowQuality ? 6 : 10;
  const per = (SEG + 1) * (RING + 1), n = specs.length;
  const pos = new Float32Array(n * per * 3), nor = new Float32Array(n * per * 3), uv = [], kind = [], index = [];
  specs.forEach((spec, f) => {
    for (let i = 0; i <= SEG; i++) for (let j = 0; j <= RING; j++) {
      uv.push(i / SEG, j / RING); kind.push(spec.kind);
      if (i < SEG && j < RING) {
        const a = f * per + i * (RING + 1) + j, b = a + RING + 1;
        index.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  });
  const bodyGeo = new THREE.BufferGeometry();
  bodyGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  bodyGeo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
  bodyGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  bodyGeo.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  bodyGeo.setIndex(index);
  const bodyMat = new THREE.ShaderMaterial({
    uniforms: { gold: { value: colors.gold }, deep: { value: colors.deep }, belly: { value: colors.belly }, silver: { value: colors.silver },
      silverDeep: { value: colors.silverDeep }, ink: { value: colors.ink }, light: { value: colors.light },
      time: { value: 0 }, opacity: { value: 1 }, pulse: { value: 0 } },
    vertexShader: fishBodyVertex, fragmentShader: fishBodyFragment, transparent: true, depthWrite: false, side: THREE.FrontSide,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat); body.name = 'vua-cau-ca-fish-bodies'; body.frustumCulled = false; body.renderOrder = 6;
  parent.add(body);

  const strips = createRibbonStrips(n * FINS, FSEG);
  const finKind = new Float32Array(n * FINS * (FSEG + 1) * 2);
  specs.forEach((spec, f) => {
    for (let k = 0; k < FINS; k++) finKind.fill(k >= 4 ? 2 : spec.kind, (f * FINS + k) * (FSEG + 1) * 2, (f * FINS + k + 1) * (FSEG + 1) * 2);
  });
  strips.geometry.setAttribute('aKind', new THREE.BufferAttribute(finKind, 1));
  const finMat = new THREE.ShaderMaterial({
    uniforms: { finGold: { value: colors.finGold }, finTip: { value: colors.finTip }, finSilver: { value: colors.finSilver },
      light: { value: colors.light }, time: { value: 0 }, opacity: { value: 1 } },
    vertexShader: finVertex, fragmentShader: finFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const fins = new THREE.Mesh(strips.geometry, finMat); fins.name = 'vua-cau-ca-fins'; fins.frustumCulled = false; fins.renderOrder = 5;
  parent.add(fins);

  const spineP = Array.from({ length: SEG + 1 }, () => new THREE.Vector3());
  const T = Array.from({ length: SEG + 1 }, () => new THREE.Vector3());
  const D = new THREE.Vector3(), Lt = new THREE.Vector3(), c = new THREE.Vector3(), q = new THREE.Vector3(), s = new THREE.Vector3();
  const tmp = new THREE.Vector3(), dir = new THREE.Vector3();
  const frameAt = (i, up) => {
    D.copy(up).addScaledVector(T[i], -up.dot(T[i])).normalize();
    Lt.crossVectors(T[i], D).normalize();
  };

  return {
    count: n,
    /**
     * Đặt dáng con cá f. spine(u, out) trả điểm sống lưng; up là hướng lưng gợi ý; phase lệch nhịp vẫy đuôi.
     * hidden = true thì thu cá về một điểm dưới mặt nước (không vẽ).
     */
    pose(f, spine, up, time, phase = 0, hidden = false) {
      const spec = specs[f], base = f * per;
      if (hidden) {
        pos.fill(0, base * 3, (base + per) * 3);
        for (let i = 1; i < per * 3; i += 3) pos[base * 3 + i] = -1;
        for (let k = 0; k < FINS; k++) strips.collapse(f * FINS + k);
        return;
      }
      for (let i = 0; i <= SEG; i++) spine(i / SEG, spineP[i]);
      for (let i = 0; i <= SEG; i++) T[i].subVectors(spineP[Math.max(0, i - 1)], spineP[Math.min(SEG, i + 1)]).normalize();
      // Vẫy đuôi: lệch ngang tăng dần về đuôi, sóng chạy từ đầu ra đuôi.
      for (let i = 0; i <= SEG; i++) {
        const u = i / SEG;
        frameAt(i, up);
        spineP[i].addScaledVector(Lt, Math.sin(u * 5.5 - time * 7 + phase) * 0.06 * spec.length * u * u);
      }
      for (let i = 0; i <= SEG; i++) {
        const u = i / SEG, prof = Math.max(0.015, bodyProfile(u)), h = spec.height / 2 * prof, w = spec.width / 2 * prof;
        frameAt(i, up);
        for (let j = 0; j <= RING; j++) {
          const th = j / RING * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th), k = (base + i * (RING + 1) + j) * 3;
          c.copy(spineP[i]).addScaledVector(D, cs * h).addScaledVector(Lt, sn * w);
          pos[k] = c.x; pos[k + 1] = c.y; pos[k + 2] = c.z;
          tmp.copy(D).multiplyScalar(cs / h).addScaledVector(Lt, sn / w).normalize();
          nor[k] = tmp.x; nor[k + 1] = tmp.y; nor[k + 2] = tmp.z;
        }
      }
      // Vây: đuôi chẻ dựng đứng, vây lưng, hai vây ngực phất, hai râu (chỉ cá chép).
      const L = spec.length, flap = Math.sin(time * 6 + phase);
      for (let j = 0; j <= FSEG; j++) {
        const t = j / FSEG;
        frameAt(SEG, up);
        c.copy(spineP[SEG]).addScaledVector(T[SEG], -t * L * 0.32).addScaledVector(Lt, Math.sin(time * 7 + phase - t * 2) * 0.05 * L * t);
        strips.write(f * FINS, j, c, D, L * 0.2 * (0.15 + 0.85 * Math.pow(t, 0.8)));
        const du = 0.25 + 0.45 * t, di = Math.round(du * SEG);
        frameAt(di, up);
        const fh = spec.height * 0.5 * Math.pow(Math.sin(Math.PI * t), 0.6);
        c.copy(spineP[di]).addScaledVector(D, spec.height / 2 * bodyProfile(du) + fh * 0.45);
        strips.write(f * FINS + 1, j, c, D, Math.max(0.001, fh * 0.5));
        const pi = Math.round(0.24 * SEG);
        frameAt(pi, up);
        for (const side of [-1, 1]) {
          dir.copy(T[pi]).multiplyScalar(-0.6).addScaledVector(D, -0.5).addScaledVector(Lt, side * (0.55 + 0.2 * flap)).normalize();
          c.copy(spineP[pi]).addScaledVector(Lt, side * spec.width * 0.45).addScaledVector(D, -spec.height * 0.15).addScaledVector(dir, t * L * 0.22);
          strips.write(f * FINS + (side < 0 ? 2 : 3), j, c, T[pi], L * 0.07 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.5) + 0.001);
        }
      }
      if (spec.kind === FISH_KIND.carp) {
        frameAt(0, up);
        for (const side of [-1, 1]) for (let j = 0; j <= FSEG; j++) {
          const t = j / FSEG;
          q.copy(T[0]).multiplyScalar(-0.35).addScaledVector(Lt, side * 0.75).addScaledVector(D, -0.45).normalize();
          s.copy(spineP[0]).addScaledVector(D, -spec.height * 0.12).addScaledVector(Lt, side * spec.width * 0.2)
            .addScaledVector(q, t * L * 0.26).addScaledVector(D, Math.sin(time * 3 + phase + t * 4) * 0.03 * L * t);
          strips.write(f * FINS + (side < 0 ? 4 : 5), j, s, D, L * 0.006 * (1 - t) + 0.0015);
        }
      } else {
        strips.collapse(f * FINS + 4); strips.collapse(f * FINS + 5);
      }
    },
    commit(time, f, pulse = 0) {
      bodyGeo.attributes.position.needsUpdate = true; bodyGeo.attributes.normal.needsUpdate = true;
      strips.commit();
      bodyMat.uniforms.time.value = time; bodyMat.uniforms.opacity.value = f; bodyMat.uniforms.pulse.value = pulse;
      finMat.uniforms.time.value = time; finMat.uniforms.opacity.value = 0.9 * f;
    },
    dispose() { bodyGeo.dispose(); bodyMat.dispose(); strips.geometry.dispose(); finMat.dispose(); },
  };
}
