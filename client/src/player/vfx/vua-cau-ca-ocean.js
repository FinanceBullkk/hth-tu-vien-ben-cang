import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { atlasPlaneLayer } from './vip-atlas-plane-layer.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { bell, softDot } from './aura-rhythm.js';
import { bubbleTexture, rippleTexture, seaSealTexture } from './vua-cau-ca-textures.js';

// Nền đất Vua câu cá: MẶT BIỂN SỐNG dưới chân — sóng lăn tăn, vân ánh sáng đáy nước (caustic) chạy,
// xoáy nước nhỏ quanh chân, ấn 漁王 (lưỡi câu, sóng vảy) chìm dưới nước xoay chậm, viền bọt trắng;
// ba con SÓNG CUỘN 3D chạy vòng quanh người, ngọn sóng bạc đầu; gợn nước loang; bọt và kim quang nổi lên.
const R = 1.75, RIPPLES = 3, RIPPLE_LIFE = 3.4;
const planeVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const oceanFragment = `
  uniform sampler2D seal;
  uniform vec3 deep, mid, foam, gold;
  uniform float time, opacity, pulse, flash;
  varying vec2 vUv;
  vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p), th = atan(p.y, p.x);
    if (r > 1.0) discard;
    float w = sin(p.x * 9.0 + time * 1.3) * sin(p.y * 7.0 - time * 1.1) + 0.5 * sin((p.x + p.y) * 13.0 - time * 2.0);
    vec2 q = p * 5.0; float c = 0.0;
    for (int i = 0; i < 3; i++) {
      q += vec2(sin(q.y * 1.3 + time * 0.7), cos(q.x * 1.1 - time * 0.6));
      c += 1.0 / (1.0 + 14.0 * abs(sin(q.x) * sin(q.y)));
    }
    c /= 3.0;
    float swirl = smoothstep(0.55, 1.0, sin(th * 3.0 + r * 16.0 - time * 2.4)) * (1.0 - smoothstep(0.08, 0.45, r)) * smoothstep(0.02, 0.1, r);
    vec3 col = mix(deep, mid, 0.45 + 0.25 * w + 0.3 * (1.0 - r));
    col += foam * c * 0.35 + foam * swirl * 0.5;
    vec4 s = texture2D(seal, rot(p, time * 0.05) * 0.5 + 0.5);
    float sealMask = s.a * (0.55 + 0.25 * sin(time * 1.5 + r * 6.0));
    col = mix(col, gold * (1.0 + pulse), sealMask * smoothstep(0.1, 0.5, s.r) * 0.55);
    col += gold * pow(c, 3.0) * (0.6 + pulse) * 0.8;
    float rim = smoothstep(0.84, 0.92, r) * (1.0 - smoothstep(0.92, 1.0, r));
    col = mix(col, foam, rim * (0.5 + 0.3 * sin(th * 14.0 + time * 2.0)));
    col += foam * flash * (1.0 - r) * 0.6;
    float a = (0.88 - 0.2 * r) * (1.0 - smoothstep(0.93, 1.0, r));
    gl_FragColor = vec4(col, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Sóng cuộn: u chạy dọc con sóng (hai đầu tan), v từ chân sóng lên ngọn; ngọn bạc đầu có bọt trôi.
const waveFragment = `
  uniform vec3 deep, mid, foam;
  uniform float time, opacity;
  varying vec2 vUv;
  void main() {
    float u = vUv.x, v = vUv.y;
    float ends = smoothstep(0.0, 0.18, u) * (1.0 - smoothstep(0.82, 1.0, u));
    float noise = 0.5 + 0.5 * sin(u * 70.0 - time * 3.0 + sin(v * 20.0 + time) * 2.0);
    float cap = smoothstep(0.62, 0.85, v) * (0.6 + 0.4 * noise);
    vec3 col = mix(deep, mid, smoothstep(0.0, 0.7, v));
    col += foam * pow(0.5 + 0.5 * sin(u * 34.0 + v * 9.0 - time * 2.4), 6.0) * 0.25;
    col = mix(col, foam, cap);
    float a = ends * (0.25 + 0.5 * smoothstep(0.05, 0.5, v) + 0.25 * cap);
    gl_FragColor = vec4(col, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Ba con sóng cuộn ra ngoài: tiết diện cuộn môi sóng, quay quanh trục đứng mỗi con một cung 1.7 rad. */
function waveCrests(lowQuality) {
  const profile = [[1.0, 0], [1.1, 0.05], [1.2, 0.14], [1.27, 0.24], [1.31, 0.3], [1.37, 0.33], [1.43, 0.31], [1.46, 0.25], [1.43, 0.2]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const parts = [0, 1, 2].map(k => new THREE.LatheGeometry(profile, lowQuality ? 14 : 28, k * Math.PI * 2 / 3, 1.7));
  // Lathe để u chạy theo góc, v theo tiết diện; gộp ba con thành một lần vẽ.
  const geo = mergeGeometries(parts);
  parts.forEach(g => g.dispose());
  return geo;
}

export function createOcean(parent, colors, lowQuality) {
  const owned = [], mats = [];
  const diskGeo = new THREE.CircleGeometry(R, 96); owned.push(diskGeo);
  const oceanMat = new THREE.ShaderMaterial({
    uniforms: { seal: { value: seaSealTexture() }, deep: { value: colors.sea }, mid: { value: colors.seaMid }, foam: { value: colors.foam },
      gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 }, pulse: { value: 0 }, flash: { value: 0 } },
    vertexShader: planeVertex, fragmentShader: oceanFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }); mats.push(oceanMat);
  const disk = new THREE.Mesh(diskGeo, oceanMat); disk.name = 'vua-cau-ca-ocean'; disk.rotation.x = -Math.PI / 2; disk.position.y = 0.012; disk.renderOrder = 1;
  parent.add(disk);

  const waveGeo = waveCrests(lowQuality); owned.push(waveGeo);
  const waveMat = new THREE.ShaderMaterial({
    uniforms: { deep: { value: colors.sea }, mid: { value: colors.aqua }, foam: { value: colors.foam }, time: { value: 0 }, opacity: { value: 1 } },
    vertexShader: planeVertex, fragmentShader: waveFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }); mats.push(waveMat);
  const waves = new THREE.Mesh(waveGeo, waveMat); waves.name = 'vua-cau-ca-wave-crests'; waves.renderOrder = 4;
  parent.add(waves);

  const ripples = atlasPlaneLayer(parent, 'vua-cau-ca-ripples', rippleTexture(), RIPPLES, { tint: colors.foam.clone(), blending: THREE.AdditiveBlending, renderOrder: 3 });
  const bubbleCount = lowQuality ? 10 : 22, sparkCount = lowQuality ? 10 : 24;
  const bubbles = billboardLayer(parent, 'vua-cau-ca-bubbles', bubbleTexture(), bubbleCount, colors.foam.clone(), THREE.AdditiveBlending);
  const sparks = billboardLayer(parent, 'vua-cau-ca-gold-sparks', softDot(), sparkCount, colors.light.clone(), THREE.AdditiveBlending);
  const seeds = Array.from({ length: Math.max(bubbleCount, sparkCount) }, (_, i) => ({ a: hash(i + 3) * Math.PI * 2, r: 0.35 + 0.75 * hash(i + 13), off: hash(i + 23), s: 0.03 + 0.045 * hash(i + 33) }));
  const m = new THREE.Matrix4(), flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const p = new THREE.Vector3(), s = new THREE.Vector3();

  return {
    update(time, rhythm, f, surge = 0) {
      const flash = bell(0.45, 0.04, rhythm.phase);
      oceanMat.uniforms.time.value = time; oceanMat.uniforms.pulse.value = rhythm.pulse; oceanMat.uniforms.flash.value = flash; oceanMat.uniforms.opacity.value = f;
      waveMat.uniforms.time.value = time; waveMat.uniforms.opacity.value = f;
      waves.rotation.y = time * 0.35;
      waves.scale.set(1 + 0.08 * surge, 1 + 0.6 * surge + 0.12 * rhythm.release, 1 + 0.08 * surge);
      for (let i = 0; i < RIPPLES; i++) {
        const u = ((time / RIPPLE_LIFE + i / RIPPLES) % 1 + 1) % 1, size = 0.5 + 2.4 * u;
        ripples.set(i, m.compose(p.set(0, 0.02, 0), flat, s.set(size, size, 1)), Math.pow(1 - u, 1.4) * 0.8 * f);
      }
      ripples.commit();
      for (let i = 0; i < bubbleCount; i++) {
        const { a, r, off, s: size } = seeds[i], u = ((time / 5 + off) % 1 + 1) % 1, wob = 0.05 * Math.sin(time * 2.2 + i);
        bubbles.set(i, Math.sin(a) * r + wob, 0.05 + u * 1.8, Math.cos(a) * r + wob * 0.6, size, size, Math.sin(Math.PI * u) * 0.85 * f);
      }
      bubbles.commit();
      for (let i = 0; i < sparkCount; i++) {
        const { a, r, off } = seeds[i], u = ((time / 4 + off) % 1 + 1) % 1, ang = a + time * 0.4 + u * 2;
        const tw = 0.6 + 0.4 * Math.sin(time * 6 + i * 2.3), size = (0.03 + 0.03 * tw) * (1 + flash);
        sparks.set(i, Math.sin(ang) * r, 0.1 + u * 2.1, Math.cos(ang) * r, size, size, Math.sin(Math.PI * u) * tw * (0.5 + 0.5 * rhythm.pulse + flash) * f);
      }
      sparks.commit();
    },
    dispose() { owned.forEach(o => o.dispose()); mats.forEach(m => m.dispose()); ripples.dispose(); bubbles.dispose(); sparks.dispose(); },
  };
}
