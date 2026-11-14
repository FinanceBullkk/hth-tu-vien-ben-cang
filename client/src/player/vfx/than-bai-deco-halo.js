import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { billboardLayer } from './aura-billboard-layer.js';
import { goldFragment, instancedLayer, litMaterial } from './vip-aura-shaders.js';
import { starFlareTexture } from './than-bai-deco-textures.js';
import { sunburstTexture } from './than-bai-textures.js';

// HÀO QUANG NAN QUẠT ART DECO — bóng dáng chính của Thần bài, như vầng hào quang của một vị thần sòng bài:
// mười ba nan vàng đúc hình thoi nhọn (nan dài – nan ngắn xen kẽ) toả nửa vòng trên sau đầu; mỗi nan có sống
// gờ giữa nên hai mặt vát bắt sáng lệch nhau như vàng thật. Sau nan là hai vòng cung bậc, đầu nan ngắn gắn
// hồng ngọc; sau cùng là tấm quạt sơn mài đen mờ để vàng nổi trên nền sáng (vàng trên đen kiểu Art Deco).
// Sao lóe lần lượt chạy dọc các đầu nan (rất chậm). Phần lớn thời gian đứng yên, chỉ thở nhẹ;
// lúc "Át chủ bài" nén lại khi tụ lực rồi bật xoè rộng.
export const HALO = { x: 0, y: 1.12, z: -0.46, inner: 0.34, long: 0.66, short: 0.42, blades: 13, arc: 2.5 };
const PLATE_R = HALO.inner + HALO.long * 0.86;
const plateVertex = `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// Tấm quạt sơn mài: đen ánh đỏ, đậm ở giữa, tan mềm ở mép ngoài và quanh đầu, có hai vòng chỉ vàng chìm.
const plateFragment = `
  uniform float opacity, radius, inner;
  uniform vec3 gold;
  varying vec2 vP;
  void main() {
    float r = length(vP) / radius;
    float a = smoothstep(inner / radius - 0.02, inner / radius + 0.08, r) * (1.0 - smoothstep(0.82, 1.0, r));
    float line = smoothstep(0.012, 0.0, abs(r - 0.7)) + smoothstep(0.01, 0.0, abs(r - 0.93));
    vec3 col = mix(vec3(0.07, 0.012, 0.02), vec3(0.015, 0.008, 0.012), r) + gold * line * 0.55;
    gl_FragColor = vec4(col, (a * 0.62 + line * 0.3) * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Nan thoi có sống gờ: gốc (0,0), đầu nhọn (0,1), bụng rộng nhất ở 32% chiều dài; mặt trước vát bốn mặt. */
function bladeGeometry() {
  const B = [0, 0, 0], L = [-0.5, 0.32, 0], T = [0, 1, 0], R = [0.5, 0.32, 0], M = [0, 0.32, 0.12];
  const tris = [B, M, L, L, M, T, T, M, R, R, M, B, B, L, T, B, T, R].flat();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(tris.length / 3 * 2).fill(0), 2));
  geo.computeVertexNormals(); // không chỉ mục → pháp tuyến phẳng theo từng mặt vát
  return geo;
}

/** Hai vòng cung bậc sau nan + đế tròn, gộp một khối. */
function ringsGeometry() {
  const parts = [
    new THREE.TorusGeometry(HALO.inner * 0.92, 0.014, 6, 48, HALO.arc + 0.25),
    new THREE.TorusGeometry(HALO.inner * 0.78, 0.008, 6, 48, HALO.arc + 0.25),
    new THREE.TorusGeometry(HALO.inner + HALO.long * 0.62, 0.006, 5, 64, HALO.arc * 0.92),
  ];
  parts.forEach((g, i) => g.rotateZ(Math.PI / 2 - (i < 2 ? HALO.arc + 0.25 : HALO.arc * 0.92) / 2));
  const geo = mergeGeometries(parts);
  parts.forEach(g => g.dispose());
  return geo;
}

export function createDecoHalo(parent, colors, lowQuality) {
  const n = HALO.blades, owned = [];
  const goldUniforms = () => ({ deep: { value: colors.deep }, gold: { value: colors.gold }, light: { value: colors.light }, ink: { value: colors.ink }, pulse: { value: 0 } });
  const blade = bladeGeometry(); owned.push(blade);
  const blades = instancedLayer(parent, 'than-bai-deco-halo-ribs', blade, litMaterial(goldFragment, goldUniforms(), { side: THREE.DoubleSide }), n, 5);
  const ringGeo = ringsGeometry(); owned.push(ringGeo);
  const ringMat = litMaterial(goldFragment, goldUniforms());
  const rings = new THREE.Mesh(ringGeo, ringMat); rings.name = 'than-bai-deco-halo-rings'; rings.renderOrder = 5;
  rings.position.set(HALO.x, HALO.y, HALO.z - 0.01); parent.add(rings);
  const gemGeo = new THREE.OctahedronGeometry(1, 0); owned.push(gemGeo);
  const gems = instancedLayer(parent, 'than-bai-deco-halo-gems', gemGeo, litMaterial(goldFragment, {
    deep: { value: colors.rubyDeep }, gold: { value: colors.red }, light: { value: colors.rubyLight }, ink: { value: colors.ink }, pulse: { value: 0 },
  }), Math.floor(n / 2), 6);
  const plateGeo = new THREE.CircleGeometry(PLATE_R, 64, Math.PI / 2 - HALO.arc / 2 - 0.12, HALO.arc + 0.24); owned.push(plateGeo);
  const plateMat = new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 1 }, radius: { value: PLATE_R }, inner: { value: HALO.inner * 0.9 }, gold: { value: colors.gold } },
    vertexShader: plateVertex, fragmentShader: plateFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const plate = new THREE.Mesh(plateGeo, plateMat); plate.name = 'than-bai-deco-halo-plate'; plate.renderOrder = 4;
  plate.position.set(HALO.x, HALO.y, HALO.z - 0.03); parent.add(plate);
  const glow = billboardLayer(parent, 'than-bai-deco-halo-glow', sunburstTexture(), 1, colors.gold.clone(), THREE.AdditiveBlending);
  glow.mesh.renderOrder = 3;
  const glints = billboardLayer(parent, 'than-bai-deco-halo-glints', starFlareTexture(), lowQuality ? 3 : 5, colors.light.clone(), THREE.AdditiveBlending);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const tipOf = (i, spread, out) => {
    const a = (i / (n - 1) - 0.5) * HALO.arc * spread, len = i % 2 ? HALO.short : HALO.long;
    return out.set(HALO.x + Math.sin(a) * (HALO.inner + len), HALO.y + Math.cos(a) * (HALO.inner + len), HALO.z);
  };

  return {
    /** charge: tụ lực trước cao trào (nan nén lại, sáng dần); burst: lúc lá Át hiện (nan bật xoè). */
    update(time, rhythm, f, charge = 0, burst = 0) {
      const spread = 1 + 0.025 * rhythm.release - 0.08 * charge + 0.14 * burst;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * HALO.arc * spread, len = (i % 2 ? HALO.short : HALO.long) * (1 + 0.08 * burst);
        p.set(HALO.x + Math.sin(a) * HALO.inner, HALO.y + Math.cos(a) * HALO.inner, HALO.z - (i % 2) * 0.012);
        q.setFromEuler(e.set(0, 0, -a));
        blades.set(i, m.compose(p, q, s.set(i % 2 ? 0.075 : 0.105, len, 1)), f);
        if (i % 2) {
          tipOf(i, spread, p);
          q.setFromEuler(e.set(time * 0.3, time * 0.4 + i, 0));
          gems.set((i - 1) / 2, m.compose(p, q, s.setScalar(0.028)), f);
        }
      }
      blades.commit(); gems.commit();
      // Sao lóe chạy dọc các đầu nan dài, mỗi lúc một hai đầu, rất chậm.
      const count = glints.mesh.count;
      for (let k = 0; k < count; k++) {
        const u = ((time / 9 + k / count) % 1 + 1) % 1, i = Math.round(u * (n - 1) / 2) * 2;
        tipOf(i, spread, p);
        const tw = Math.pow(Math.sin(Math.PI * ((u * (n - 1) / 2) % 1)), 3), size = 0.16 * tw * (1 + 0.6 * burst);
        glints.set(k, p.x, p.y, p.z + 0.04, size, size, tw * f, 0);
      }
      glints.commit();
      glow.set(0, HALO.x, HALO.y + 0.3, HALO.z - 0.05, 2.3 + 0.6 * burst, 2.3 + 0.6 * burst, (0.16 + 0.2 * charge + 0.35 * burst) * f, (time * 0.004) % 1);
      glow.commit();
      plateMat.uniforms.opacity.value = f;
      for (const mat of [blades.material, ringMat, gems.material]) {
        mat.uniforms.time.value = time; mat.uniforms.opacity.value = f;
        mat.uniforms.pulse.value = 0.15 * rhythm.pulse + 0.4 * charge + 0.6 * burst;
      }
    },
    dispose() { blades.dispose(); gems.dispose(); ringMat.dispose(); plateMat.dispose(); glow.dispose(); glints.dispose(); owned.forEach(o => o.dispose()); },
  };
}
