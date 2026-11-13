import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { solidMaterial, KIND, SWAY_SPEED, SWAY_BIAS } from './bich-ngoc-materials.js';
import { groveGeometry, tag, swayOf, swayOffset } from './bich-ngoc-geometry.js';
import { makeStalk } from './bich-ngoc-grove.js';
import { bichNgocBanner, BANNER_SIZE } from './bich-ngoc-calligraphy-textures.js';

// Cờ giang hồ: một cây sào trúc cao cắm ngoài rìa cụm trúc bên trái, ngọn có cần ngang treo tấm phướn vải
// cũ viết 清風 bút lông, triện son, đuôi nheo. Phướn bay phần phật theo gió xoáy (sóng vải chạy với
// tốc độ cố định, biên độ tăng dần xuống đuôi), cả cờ đi theo sào lay.
export const POLE = makeStalk(-1.8, 0.1, 3.25, 0.045, [0, 0], 0.46, 2.2, 0.05);
const BAR_Y = 3.02, BAR_LEN = 0.6, BAR_DIR = [1, -0.12];

// Sóng vải: v = 0 ở mép treo, 1 ở đuôi; dạt theo gió về phía sau (−z cục bộ) và gợn sóng.
const clothVertex = `
  uniform float time;
  varying vec2 vUv; varying float vShade;
  void main() {
    vUv = uv;
    float v = 1.0 - uv.y, w = pow(v, 1.3), ph = time * 1.5 + v * 4.2 - uv.x * 2.0;
    vec3 p = position;
    p.z += w * (0.07 * sin(ph) - 0.12) + 0.02 * sin(time * 0.9 + uv.x * 3.0) * v;
    p.x += 0.025 * w * sin(ph * 0.7 + 1.0);
    vShade = 0.84 + 0.16 * cos(ph);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const clothFragment = `
  uniform sampler2D map; uniform float opacity;
  varying vec2 vUv; varying float vShade;
  void main() {
    vec4 tex = texture2D(map, vUv);
    float a = tex.a * opacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(tex.rgb * vShade, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createBanner(parent, colors) {
  const geometries = [], materials = [];
  const bar = tag(new THREE.CylinderGeometry(0.014, 0.018, BAR_LEN, 6).rotateZ(Math.PI / 2).translate(BAR_LEN / 2, 0, 0)
    .rotateY(-Math.atan2(BAR_DIR[1], BAR_DIR[0])).translate(POLE.x, BAR_Y, POLE.z), KIND.twig, () => [0.9, 0, 0], swayOf(POLE));
  const pole = groveGeometry([POLE]), poleGeo = mergeGeometries([pole, bar]); pole.dispose(); bar.dispose(); geometries.push(poleGeo);
  const body = solidMaterial(colors, 1); materials.push(body);
  const poleMesh = new THREE.Mesh(poleGeo, body); poleMesh.name = 'bich-ngoc-banner-pole'; poleMesh.renderOrder = 5; parent.add(poleMesh);

  // Phướn treo dưới cần ngang, mặt vải song song cần, quay ra phía trước (nhìn chính diện đọc rõ chữ).
  const holder = new THREE.Group(); holder.rotation.y = -Math.atan2(BAR_DIR[1], BAR_DIR[0]); parent.add(holder);
  const [W, H] = BANNER_SIZE, clothGeo = new THREE.PlaneGeometry(W, H, 6, 18).translate(0.08 + W / 2, -H / 2 - 0.03, 0);
  geometries.push(clothGeo);
  const cloth = new THREE.ShaderMaterial({ uniforms: { map: { value: bichNgocBanner() }, time: { value: 0 }, opacity: { value: 1 } },
    vertexShader: clothVertex, fragmentShader: clothFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  materials.push(cloth);
  const banner = new THREE.Mesh(clothGeo, cloth); banner.name = 'bich-ngoc-banner'; banner.renderOrder = 5; holder.add(banner);

  return {
    update(time, rhythm, f) {
      const [dx, dz] = swayOffset(POLE, BAR_Y, time, SWAY_SPEED, SWAY_BIAS);
      holder.position.set(POLE.x + dx, BAR_Y, POLE.z + dz);
      body.uniforms.time.value = time; body.uniforms.opacity.value = f;
      cloth.uniforms.time.value = time; cloth.uniforms.opacity.value = f;
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
