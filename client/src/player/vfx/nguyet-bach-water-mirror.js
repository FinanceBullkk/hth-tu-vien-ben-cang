import * as THREE from 'three';
import { localVertex, waterFragment, rayVertex, rayFragment } from './nguyet-bach-shaders.js';
import { humAt, waveAge } from './nguyet-bach-rhythm.js';
import { MOON } from './nguyet-bach-moon.js';
import { GUQIN } from './nguyet-bach-guqin.js';

// Nền đất của Nguyệt Bạch — GƯƠNG NƯỚC TĨNH (khác mặt hồ gợn loang có lá sen của Lưu Ly):
//  thân nước lam đêm phẳng lặng, sáng dần về phía sau như soi trời, bóng cổ cầm đổ dọc;
//  bóng trăng in nước đúng phía trăng, vỡ thành vạch ngang lăn tăn rất chậm, vệt trăng kéo về
//  phía trước lấp lánh; vài vòng gợn mảnh quanh bóng trăng khi dây ngân.
//  Tia trăng: ba dải sáng mờ rọi chéo từ trăng xuống mặt nước, phía ngoài (không qua mặt nhân vật).
const ORIGIN = { x: 0.1, z: -0.2 }, SIZE = 4.2;
const MOON_IN_WATER = new THREE.Vector2(MOON.x * 0.95, -0.12);
// Tia: điểm trên trăng → điểm chạm nước (x, y, z) và bề rộng hai đầu.
const RAYS = [
  [[0.98, 1.62, -0.66], [1.55, 0.02, 0.45], 0.16, 0.5],
  [[1.2, 1.78, -0.7], [2.0, 0.02, 0.05], 0.12, 0.42],
  [[0.72, 1.55, -0.64], [1.12, 0.02, 0.62], 0.1, 0.32],
];

function rayGeometry() {
  const pos = [], uv = [], idx = [];
  RAYS.forEach(([a, b, w0, w1], k) => {
    for (const [v, p, w] of [[0, a, w0], [1, b, w1]]) for (const u of [0, 1]) {
      pos.push(p[0] + (u - 0.5) * w * 0.9, p[1], p[2] + (u - 0.5) * w * 0.45); uv.push(u, v);
    }
    const n = k * 4; idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  return geo;
}

export function createWaterMirror(parent, colors, lowQuality) {
  const geometries = [], materials = [];
  const waterGeo = new THREE.PlaneGeometry(SIZE, SIZE); geometries.push(waterGeo);
  const water = ink => {
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: localVertex, fragmentShader: waterFragment,
      blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending,
      uniforms: { water: { value: colors.water }, sky: { value: colors.sky }, edge: { value: colors.edge }, core: { value: colors.core },
        steel: { value: colors.steel }, origin: { value: new THREE.Vector2(ORIGIN.x, ORIGIN.z) }, moon: { value: MOON_IN_WATER },
        lute: { value: new THREE.Vector2(GUQIN.x, GUQIN.z) }, opacity: { value: 1 }, ink: { value: ink }, time: { value: 0 },
        glow: { value: 0 }, ringAge: { value: [0, 0, 0] }, ringStrength: { value: [0, 0, 0] } } });
    materials.push(m);
    const mesh = new THREE.Mesh(waterGeo, m); mesh.name = ink ? 'nguyet-bach-water-mirror' : 'nguyet-bach-moon-reflection';
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(ORIGIN.x, 0.012 + ink * -0.004, ORIGIN.z); mesh.renderOrder = ink ? 1 : 2;
    parent.add(mesh);
    return m;
  };
  const body = water(1), light = water(0);
  let rays = null;
  if (!lowQuality) {
    const geo = rayGeometry(); geometries.push(geo);
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: rayVertex, fragmentShader: rayFragment,
      uniforms: { edge: { value: colors.edge }, core: { value: colors.core }, opacity: { value: 1 }, time: { value: 0 } } });
    materials.push(mat);
    rays = new THREE.Mesh(geo, mat); rays.name = 'nguyet-bach-moon-rays'; rays.renderOrder = 3; parent.add(rays);
  }
  return {
    update(time, rhythm, f) {
      for (const m of [body, light]) { m.uniforms.time.value = time; m.uniforms.glow.value = rhythm.hum; }
      body.uniforms.opacity.value = 0.8 * f; light.uniforms.opacity.value = 0.9 * f;
      for (let k = 0; k < 3; k++) {
        const a = waveAge(time, k, 3, 6);
        light.uniforms.ringAge.value[k] = a; light.uniforms.ringStrength.value[k] = humAt(time - a * 6);
      }
      if (rays) { rays.material.uniforms.time.value = time; rays.material.uniforms.opacity.value = (0.3 + 0.12 * rhythm.hum) * f; }
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
