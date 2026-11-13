import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex } from './aura-flow-shaders.js';
import { plumeFragment } from './hong-lien-shaders.js';

// Phượng vĩ của Hồng Liên: năm lông đuôi dài rủ từ thắt lưng xuống chạm đất, quét ra sau và hai
// bên như vạt áo, uốn sóng nhẹ theo gió; mắt lông ở ngọn. Là khối thứ hai của bóng dáng (sau đôi cánh).
// Nhịp thở chỉ nâng thân lông lên vài phân, không đổi tốc độ.
export function createPlumes(parent, colors, lowQuality) {
  const n = lowQuality ? 3 : 5, seg = lowQuality ? 18 : 32;
  const strips = createRibbonStrips(n, seg);
  const make = ink => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { steel: { value: colors.steel }, edge: { value: colors.edge }, core: { value: colors.core },
      gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 }, ink: { value: ink } },
    vertexShader: ribbonVertex, fragmentShader: plumeFragment, blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
  const mats = lowQuality ? [make(0)] : [make(0), make(1)];
  mats.forEach((m, i) => {
    const mesh = new THREE.Mesh(strips.geometry, m); mesh.name = i ? 'hong-lien-plumes-ink' : 'hong-lien-plumes';
    mesh.frustumCulled = false; mesh.renderOrder = 6 - i; parent.add(mesh);
  });
  const p = new THREE.Vector3(), q = new THREE.Vector3(), tangent = new THREE.Vector3(), side = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  // u: 0 gốc thắt lưng → 1 ngọn chạm đất; sk: -1..1 vị trí trong chùm (giữa dài nhất, quét thẳng ra sau).
  const path = (k, u, time, lift, out) => {
    const sk = n === 1 ? 0 : (k / (n - 1)) * 2 - 1, mid = 1 - Math.abs(sk);
    // Hai lông ngoài quét vòng ra hai bên (thấy được cả khi nhìn chính diện), lông giữa quét thẳng ra sau.
    const outer = Math.abs(sk) > 0.9 ? 1 : 0;
    return out.set(sk * (0.2 * u + (1.05 + 0.45 * outer) * u * u) + 0.07 * Math.sin(u * 5 - time * 0.45 + k) * u,
      0.95 + (0.18 + lift) * Math.sin(u * Math.PI) - 0.86 * u * u,
      -0.34 - (0.85 + 0.45 * mid) * u + 0.55 * outer * u * u + 0.09 * Math.sin(u * 4 - time * 0.4 + k * 1.3) * u);
  };
  return {
    update(time, rhythm, f) {
      const lift = 0.07 * rhythm.release - 0.03 * rhythm.gather;
      for (let k = 0; k < n; k++) for (let j = 0; j <= seg; j++) {
        const u = j / seg;
        path(k, u, time, lift, p); path(k, u + 0.01, time, lift, q);
        tangent.subVectors(q, p).normalize();
        side.crossVectors(tangent, up).normalize();
        strips.write(k, j, p, side, 0.03 + 0.1 * Math.exp(-(((u - 0.86) / 0.1) ** 2)));
      }
      strips.commit();
      mats.forEach(m => { m.uniforms.time.value = time; m.uniforms.opacity.value = (m.uniforms.ink.value ? 0.5 : 0.8) * f; });
    },
    dispose() { strips.geometry.dispose(); mats.forEach(m => m.dispose()); },
  };
}
