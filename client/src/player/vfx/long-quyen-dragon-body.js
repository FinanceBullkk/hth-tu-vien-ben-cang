import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { hongLienFlameTongue } from './hong-lien-billboard-textures.js';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex } from './aura-flow-shaders.js';
import { dragonMaterial, finMaterial, tickMaterials } from './long-quyen-materials.js';
import { dragonGeometry } from './long-quyen-body-geometry.js';
import { spineFrame, spineRadius, addSpineWave } from './long-quyen-spine.js';

// Thân hỏa long — khối chính của Long Quyền: ống vảy dày (mực + lửa), vây lưng răng cưa (mực + lửa),
// lưỡi lửa cưỡi dọc sống lưng trôi từ đuôi lên đầu, tàn lửa bong khỏi vảy bay lên, và long khí đỏ
// sẫm cuộn sát mép thân. Lửa chỉ nằm trên thân rồng. Mọi vật trôi theo chiều tăng của s (cuộn lên),
// vận tốc cố định; nhịp thở chỉ đổi độ đậm.
export const TONGUE_SPEED = 0.02, EMBER_LIFE = 5;
const qiFragment = `
  uniform vec3 deep, edge;
  uniform float time, opacity;
  varying vec2 vUv;
  void main() {
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0);
    float body = 1.0 - smoothstep(0.15, 1.0, across);
    float streak = 0.5 + 0.5 * sin(u * 80.0 - time * 1.6 + vUv.y * 5.0);
    float ends = smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.85, 1.0, u));
    gl_FragColor = vec4(mix(deep * 3.0, edge, 0.45 * streak), body * ends * (0.22 + 0.3 * streak) * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createDragonBody(parent, colors, lowQuality) {
  const geo = dragonGeometry(lowQuality), mats = [];
  const mesh = (g, m, name, order, base, breathe = 0) => {
    const o = new THREE.Mesh(g, m); o.name = name; o.renderOrder = order; parent.add(o);
    mats.push({ m, base, breathe });
  };
  if (!lowQuality) {
    mesh(geo.body, dragonMaterial(colors, { ink: 1 }), 'long-quyen-body-ink', 4, 0.9);
    mesh(geo.fins, finMaterial(colors, 1), 'long-quyen-fins-ink', 4, 0.8);
  }
  mesh(geo.body, dragonMaterial(colors), 'long-quyen-body', 6, 0.95, 0.15);
  mesh(geo.fins, finMaterial(colors, 0), 'long-quyen-fins', 6, 0.9, 0.2);

  const tongueN = lowQuality ? 12 : 26, emberN = lowQuality ? 14 : 32;
  const tongues = billboardLayer(parent, 'long-quyen-tongues', hongLienFlameTongue(), tongueN, colors.edge.clone().lerp(colors.core, 0.35),
    THREE.AdditiveBlending);
  const embers = billboardLayer(parent, 'long-quyen-embers', softDot(), emberN, colors.core.clone().lerp(colors.hot, 0.3), THREE.AdditiveBlending);

  // Long khí: một dải khói đỏ sẫm cuộn sát mép ngoài thân, lệch pha với sóng cơ (bỏ ở chất lượng thấp).
  const QI_SEG = 90;
  let qi = null, qiMat = null;
  if (!lowQuality) {
    qi = createRibbonStrips(1, QI_SEG);
    qiMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { deep: { value: colors.deep }, edge: { value: colors.edge }, time: { value: 0 }, opacity: { value: 1 } },
      vertexShader: ribbonVertex, fragmentShader: qiFragment });
    const o = new THREE.Mesh(qi.geometry, qiMat); o.name = 'long-quyen-qi-trail'; o.renderOrder = 5; parent.add(o);
    mats.push({ m: qiMat, base: 0.8, breathe: 0.2 });
  }

  const f = spineFrame(0), c = new THREE.Vector3(), p = new THREE.Vector3();
  /** Điểm trên mặt lưng rồng (−n) cách bề mặt `lift`, đã cộng sóng cơ. */
  const onBack = (s, time, lift) => {
    spineFrame(s, f); c.copy(f.p);
    return addSpineWave(p.copy(f.p).addScaledVector(f.n, -(spineRadius(s) + lift)), c, s, time);
  };

  return {
    update(time, rhythm, fade) {
      tickMaterials(mats, time, rhythm, fade);
      for (let i = 0; i < tongueN; i++) {
        const u = ((hash(i + 3) + time * TONGUE_SPEED) % 1 + 1) % 1, s = 0.12 + 0.84 * u;
        const q = onBack(s, time, 0.07), env = Math.sin(u * Math.PI), h = (0.15 + 0.1 * hash(i + 11)) * (0.6 + 0.4 * env);
        tongues.set(i, q.x, q.y, q.z, h * 0.62, h, env * (0.75 + 0.2 * rhythm.release), 0.04 * Math.sin(time * 0.6 + i));
      }
      tongues.commit(); tongues.material.uniforms.opacity.value = fade;
      for (let i = 0; i < emberN; i++) {
        const u = ((time / EMBER_LIFE + hash(i + 50)) % 1 + 1) % 1, s = 0.1 + 0.8 * hash(i + 57) + 0.06 * u;
        const q = onBack(s, time, 0.02 + 0.2 * u);
        q.y += 0.32 * u;
        const size = 0.035 + 0.02 * hash(i + 61);
        embers.set(i, q.x, q.y, q.z, size, size, Math.sin(u * Math.PI) ** 2 * 0.9); // tắt hẳn ở hai đầu vòng đời
      }
      embers.commit(); embers.material.uniforms.opacity.value = fade;
      if (!qi) return;
      for (let j = 0; j <= QI_SEG; j++) {
        const s = 0.08 + 0.86 * j / QI_SEG;
        const q = onBack(s, time, 0.05 + 0.04 * Math.sin(s * 16 - time * 0.45));
        qi.write(0, j, q, f.b, 0.045 + 0.025 * Math.sin(s * Math.PI));
      }
      qi.commit();
    },
    dispose() {
      mats.forEach(({ m }) => m.dispose()); tongues.dispose(); embers.dispose(); qi?.geometry.dispose();
    },
  };
}
