import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { billboardLayer } from './aura-billboard-layer.js';
import { sstep, softDot } from './aura-rhythm.js';
import { goldFragment, litMaterial } from './vip-aura-shaders.js';
import { tableSealTexture } from './than-bai-textures.js';

// VẬN MỆNH LUÂN — pháp tướng phía sau của Thần bài: bánh xe vận mệnh vàng khổng lồ dựng đứng sau lưng (cao gần
// 2.5 m, như vầng trăng sau Kim Long). Mặt bánh là trận ô số đỏ đen trong như pháp trận; vành vàng đúc hai tầng,
// tám nan hoa và trục giữa; kim chỉ vàng cố định ở đỉnh; 24 bóng đèn sòng bài quanh vành chạy đuổi (marquee).
// Bình thường quay rất chậm; lúc tất tay quay một "vòng may mắn" (tăng tốc rồi hãm êm), đèn nháy rực toàn vành.
// Camera chơi thường ở sau lưng nên bánh xe nằm giữa camera và nhân vật: nhìn từ phía sau thì bánh xe mờ như bóng
// (người chơi vẫn thấy rõ nhân vật mình), nhìn từ trước/bên thì hiện đủ. Lòng bánh để trống, không trục giữa.
export const WHEEL = { x: 0, y: 1.45, z: -0.98, radius: 1.25, bulbs: 24 };
const BASE_SPEED = 0.1;

const faceVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// Mặt bánh: dùng lại trận ô số của bàn cò quay, làm trong và rực theo tia sáng quét; tâm tối để không chói sau đầu.
const faceFragment = `
  uniform sampler2D map;
  uniform vec3 gold, light;
  uniform float time, opacity, spin, glow;
  varying vec2 vUv;
  vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    vec4 tex = texture2D(map, rot(p, -spin) * 0.5 + 0.5);
    float goldMask = smoothstep(0.1, 0.3, tex.r - tex.b) * step(0.42, tex.g);
    float th = atan(p.y, p.x);
    float beam = pow(max(0.0, cos(th - time * 0.5)), 24.0);
    vec3 col = tex.rgb + goldMask * light * (0.35 + 0.8 * beam + glow);
    float a = tex.a * (0.55 + 0.35 * goldMask) * smoothstep(0.3, 0.55, r) * (1.0 - smoothstep(0.97, 1.0, r));
    gl_FragColor = vec4(col, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Vành ba tầng và mười sáu nan hoa chạy từ vòng trong ra vòng giữa (lòng bánh trống) — gộp một khối vàng. */
function wheelFrame() {
  const R = WHEEL.radius, parts = [
    new THREE.TorusGeometry(R, 0.045, 10, 120), new THREE.TorusGeometry(R * 0.8, 0.022, 8, 100),
    new THREE.TorusGeometry(R * 0.45, 0.018, 8, 64),
  ];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, len = R * 0.35;
    parts.push(new THREE.CylinderGeometry(0.01, 0.014, len, 6).translate(0, R * 0.45 + len / 2, 0).rotateZ(a));
  }
  const flat = parts.map(g => (g.index ? g.toNonIndexed() : g));
  const geo = mergeGeometries(flat);
  parts.forEach(g => g.dispose()); flat.forEach(g => g.dispose());
  return geo;
}

/** Kim chỉ ở đỉnh: mũi tam giác vàng chĩa xuống, đế tròn có viên hồng ngọc. */
function pointerGeometry() {
  const R = WHEEL.radius;
  const tip = new THREE.ConeGeometry(0.07, 0.22, 4).rotateZ(Math.PI).translate(0, R + 0.05, 0.06);
  const cap = new THREE.SphereGeometry(0.06, 12, 8).translate(0, R + 0.19, 0.06);
  const geo = mergeGeometries([tip.toNonIndexed(), cap.toNonIndexed()]);
  tip.dispose(); cap.dispose();
  return geo;
}

export function createFortuneWheel(parent, colors, lowQuality) {
  const owned = [], mats = [];
  const goldUniforms = () => ({ deep: { value: colors.deep }, gold: { value: colors.gold }, light: { value: colors.light }, ink: { value: colors.ink }, pulse: { value: 0 } });
  const root = new THREE.Group(); root.name = 'than-bai-fortune-wheel'; root.position.set(WHEEL.x, WHEEL.y, WHEEL.z); parent.add(root);
  const spinner = new THREE.Group(); root.add(spinner);
  const faceGeo = new THREE.CircleGeometry(WHEEL.radius * 0.97, 96); owned.push(faceGeo);
  const faceMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tableSealTexture() }, gold: { value: colors.gold }, light: { value: colors.light },
      time: { value: 0 }, opacity: { value: 1 }, spin: { value: 0 }, glow: { value: 0 } },
    vertexShader: faceVertex, fragmentShader: faceFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }); mats.push(faceMat);
  const face = new THREE.Mesh(faceGeo, faceMat); face.name = 'than-bai-fortune-wheel-face'; face.renderOrder = 2; root.add(face);
  const frameGeo = wheelFrame(); owned.push(frameGeo);
  const frameMat = litMaterial(goldFragment, goldUniforms()); mats.push(frameMat);
  const frame = new THREE.Mesh(frameGeo, frameMat); frame.name = 'than-bai-fortune-wheel-frame'; frame.renderOrder = 3; spinner.add(frame);
  const pointerGeo = pointerGeometry(); owned.push(pointerGeo);
  const pointerMat = litMaterial(goldFragment, goldUniforms()); mats.push(pointerMat);
  const pointer = new THREE.Mesh(pointerGeo, pointerMat); pointer.name = 'than-bai-fortune-wheel-pointer'; pointer.renderOrder = 4; root.add(pointer);
  // Mờ theo góc nhìn: đo ngay trước khi vẽ (biết camera), dùng cho mọi lớp của bánh xe.
  let view = 1, fade = 1;
  const normal = new THREE.Vector3(), toCam = new THREE.Vector3(), center = new THREE.Vector3();
  face.onBeforeRender = (renderer, scene, camera) => {
    root.getWorldPosition(center);
    normal.set(0, 0, 1).transformDirection(root.matrixWorld);
    toCam.copy(camera.position).sub(center).normalize();
    const d = normal.dot(toCam);
    view = 0.28 + 0.72 * Math.min(1, Math.max(0, (d + 0.25) / 0.5));
    faceMat.uniforms.opacity.value = fade * view;
    for (const m of [frameMat, pointerMat]) m.uniforms.opacity.value = fade * view;
  };
  const bulbs = billboardLayer(parent, 'than-bai-fortune-wheel-bulbs', softDot(), WHEEL.bulbs, colors.light.clone(), THREE.AdditiveBlending);
  const halo = billboardLayer(parent, 'than-bai-fortune-wheel-bulb-halo', softDot(), lowQuality ? 1 : WHEEL.bulbs, colors.gold.clone(), THREE.AdditiveBlending);

  return {
    update(time, rhythm, f) {
      // Vòng may mắn: thêm đúng một vòng trong cửa sổ cao trào, tăng tốc rồi hãm êm (smootherstep).
      const k = sstep(0.36, 0.7, rhythm.phase), lucky = k * k * k * (k * (k * 6 - 15) + 10);
      const angle = time * BASE_SPEED + lucky * Math.PI * 2, party = sstep(0.4, 0.46, rhythm.phase) * (1 - sstep(0.66, 0.78, rhythm.phase));
      spinner.rotation.z = -angle;
      faceMat.uniforms.spin.value = -angle; faceMat.uniforms.time.value = time;
      fade = f;
      faceMat.uniforms.glow.value = 0.2 * rhythm.pulse + 0.35 * party; faceMat.uniforms.opacity.value = f * view;
      // Đèn chạy đuổi: ba bóng sáng một bóng tối chạy vòng; lúc tất tay cả vành nháy rực theo nhịp đều.
      for (let i = 0; i < WHEEL.bulbs; i++) {
        const a = i / WHEEL.bulbs * Math.PI * 2 - angle;
        const chase = ((i + Math.floor(time * 4)) % 4) ? 1 : 0.15, blink = 0.6 + 0.4 * Math.sign(Math.sin(time * 6 + i * Math.PI));
        const on = chase * (1 - party) + blink * party;
        const x = WHEEL.x + Math.sin(a) * WHEEL.radius * 1.06, y = WHEEL.y + Math.cos(a) * WHEEL.radius * 1.06, z = WHEEL.z + 0.03;
        bulbs.set(i, x, y, z, 0.07, 0.07, on * f * (0.4 + 0.6 * view));
        if (i < halo.mesh.count) halo.set(i, x, y, z, 0.22, 0.22, on * (0.35 + 0.4 * party) * f * view);
      }
      bulbs.commit(); halo.commit();
      for (const m of [frameMat, pointerMat]) {
        m.uniforms.time.value = time; m.uniforms.opacity.value = f * view; m.uniforms.pulse.value = 0.15 * rhythm.pulse + 0.5 * party;
      }
    },
    dispose() { owned.forEach(o => o.dispose()); mats.forEach(m => m.dispose()); bulbs.dispose(); halo.dispose(); root.removeFromParent(); },
  };
}
