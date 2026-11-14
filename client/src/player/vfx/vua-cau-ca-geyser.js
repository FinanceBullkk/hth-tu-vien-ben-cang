import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot, sstep } from './aura-rhythm.js';
import { instancedLayer } from './vip-aura-shaders.js';
import { rippleTexture } from './vua-cau-ca-textures.js';

// Cao trào "THUỶ TRỤ LỤC HỢP" của Vua câu cá, mỗi nhịp 12 giây: sáu cột nước phun vọt quanh người
// (nước chảy ngược lên, đỉnh bạc đầu), bụi nước toé ở đỉnh cột rồi rơi, sóng chấn loang khỏi mặt biển.
// surge(rhythm) cho các lớp khác (sóng cuộn dâng cao, mặt biển lóe) cùng nhịp.
const JETS = 6, SPRAY_PER = 10, RADIUS = 1.0, HEIGHT = 1.7;
export const surge = rhythm => sstep(0.4, 0.47, rhythm.phase) * (1 - sstep(0.58, 0.78, rhythm.phase));

const jetVertex = `
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    vUv = uv; vAlpha = 1.0;
    vec4 p = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vAlpha = instanceColor.r;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * p;
  }
`;
const jetFragment = `
  uniform vec3 deep, aqua, foam;
  uniform float time, opacity;
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    // Nước chảy ngược lên: sọc dọc uốn lượn, vân bọt chạy lên, đỉnh bạc đầu tan thành bụi.
    float wob = sin(vUv.y * 9.0 - time * 6.0) * 0.08;
    float flow = 0.5 + 0.5 * sin(vUv.y * 26.0 - time * 11.0 + sin((vUv.x + wob) * 25.0) * 1.8);
    float streak = pow(0.5 + 0.5 * sin((vUv.x + wob) * 6.2831853 * 9.0), 6.0);
    vec3 col = mix(deep, aqua, 0.35 + 0.45 * flow);
    float crest = smoothstep(0.72, 0.95, vUv.y);
    col = mix(col, foam, crest * 0.85 + streak * flow * 0.45);
    float a = (0.16 + 0.28 * flow + 0.35 * streak + 0.35 * crest) * smoothstep(0.0, 0.1, vUv.y) * (1.0 - smoothstep(0.88, 1.0, vUv.y) * 0.8);
    a *= vAlpha * opacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createGeyser(parent, colors, lowQuality) {
  const jetGeo = new THREE.CylinderGeometry(0.15, 0.07, 1, lowQuality ? 10 : 18, 8, true).translate(0, 0.5, 0); // loe ở đỉnh như nước phun
  const jetMat = new THREE.ShaderMaterial({
    uniforms: { deep: { value: colors.sea }, aqua: { value: colors.aqua }, foam: { value: colors.foam }, time: { value: 0 }, opacity: { value: 1 } },
    vertexShader: jetVertex, fragmentShader: jetFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const jets = instancedLayer(parent, 'vua-cau-ca-water-jets', jetGeo, jetMat, JETS, 6);
  const spray = billboardLayer(parent, 'vua-cau-ca-jet-spray', softDot(), JETS * SPRAY_PER, colors.foam.clone(), THREE.AdditiveBlending);
  const waveGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const waveMat = new THREE.MeshBasicMaterial({ map: rippleTexture(), color: colors.aqua, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const wave = new THREE.Mesh(waveGeo, waveMat); wave.name = 'vua-cau-ca-shockwave'; wave.position.y = 0.03; wave.renderOrder = 3;
  parent.add(wave);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();

  return {
    update(time, rhythm, f) {
      const k = surge(rhythm), shock = Math.max(0, Math.min(1, (rhythm.phase - 0.42) / 0.25));
      for (let i = 0; i < JETS; i++) {
        const a = i / JETS * Math.PI * 2 + 0.3, lag = sstep(0.4 + i * 0.012, 0.48 + i * 0.012, rhythm.phase) * (1 - sstep(0.58, 0.78, rhythm.phase));
        const h = Math.max(0.001, HEIGHT * lag * (0.85 + 0.15 * Math.sin(time * 9 + i)));
        p.set(Math.sin(a) * RADIUS, 0, Math.cos(a) * RADIUS);
        q.setFromEuler(e.set(0.12 * Math.sin(a), time * 2 + i, -0.12 * Math.cos(a)));
        jets.set(i, m.compose(p, q, s.set(1, h, 1)), lag > 0.01 ? f : 0);
        for (let j = 0; j < SPRAY_PER; j++) {
          const u = ((time / 0.75 + j / SPRAY_PER + hash(i)) % 1 + 1) % 1, th = j * 1.9 + i;
          const size = 0.15 * (1 - u) + 0.04;
          spray.set(i * SPRAY_PER + j, p.x + Math.cos(th) * 0.38 * u, h + 0.05 + 0.7 * u - 1.6 * u * u, p.z + Math.sin(th) * 0.38 * u, size, size, lag * (1 - u) * 0.9 * f);
        }
      }
      jets.commit(); spray.commit();
      jetMat.uniforms.time.value = time;
      wave.scale.setScalar(0.4 + 4.4 * shock);
      waveMat.opacity = (shock > 0 && shock < 1 ? Math.pow(1 - shock, 1.2) : 0) * f;
      return k;
    },
    dispose() { jets.dispose(); jetGeo.dispose(); spray.dispose(); waveGeo.dispose(); waveMat.dispose(); },
  };
}
