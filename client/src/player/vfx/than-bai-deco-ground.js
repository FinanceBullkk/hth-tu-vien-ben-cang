import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { goldFragment, litMaterial } from './vip-aura-shaders.js';
import { decoMedallionTexture } from './than-bai-deco-textures.js';
import { createSuitGeometries } from './than-bai-suit-geometry.js';
import { rippleTexture } from './vua-cau-ca-textures.js';

// Nền đất Thần bài: ĐĨA ART DECO — sơn mài đen bóng có phản chiếu, hoa văn chỉ vàng (vòng bậc, tia nắng dài ngắn
// xen kẽ, vòng chữ V, bốn chất bài). Một vệt sáng quét rất chậm qua chỉ vàng; lúc tụ lực các đường vàng sáng dồn
// từ ngoài vào tâm. Bốn chất bài đúc vàng đứng như tượng ở bốn hướng, tự xoay chậm. Lúc lá Át hiện: sóng chấn vàng.
// Thưa hạt vàng bay lên. Không vòng chữ, không bát quái, không bàn cò quay.
const R = 1.55;
const planeVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const medallionFragment = `
  uniform sampler2D map;
  uniform vec3 gold, light, crimson;
  uniform float time, opacity, charge, burst;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p), th = atan(p.y, p.x);
    if (r > 1.0) discard;
    vec4 tex = texture2D(map, vUv);
    // Sơn mài đen: sẫm ở mép, có vệt phản chiếu mềm như mặt bóng.
    vec3 lacquer = mix(vec3(0.045, 0.03, 0.04), vec3(0.012, 0.008, 0.012), r) + vec3(0.06, 0.04, 0.03) * pow(max(0.0, 1.0 - abs(p.x + p.y * 0.4 - 0.25)), 6.0);
    float lit = tex.a * smoothstep(0.1, 0.4, tex.r);
    float sweep = pow(max(0.0, cos(th - time * 0.25)), 40.0);
    float inward = smoothstep(0.08, 0.0, abs(r - (1.0 - fract(time * 0.6)) )) * charge;
    vec3 col = mix(lacquer, tex.rgb * (0.75 + 0.25 * sin(th * 2.0 + 1.0)), tex.a);
    col += light * lit * (sweep * 0.9 + inward * 1.6 + burst * 0.8);
    col = mix(col, crimson, smoothstep(0.865, 0.875, r) * (1.0 - smoothstep(0.885, 0.895, r)) * 0.9);
    float a = (0.94 - 0.1 * r) * (1.0 - smoothstep(0.96, 1.0, r));
    gl_FragColor = vec4(col, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createDecoGround(parent, colors, lowQuality) {
  const owned = [], mats = [];
  const diskGeo = new THREE.CircleGeometry(R, 96); owned.push(diskGeo);
  const diskMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: decoMedallionTexture() }, gold: { value: colors.gold }, light: { value: colors.light }, crimson: { value: colors.red },
      time: { value: 0 }, opacity: { value: 1 }, charge: { value: 0 }, burst: { value: 0 } },
    vertexShader: planeVertex, fragmentShader: medallionFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }); mats.push(diskMat);
  const disk = new THREE.Mesh(diskGeo, diskMat); disk.name = 'than-bai-deco-medallion'; disk.rotation.x = -Math.PI / 2; disk.position.y = 0.012; disk.renderOrder = 1;
  parent.add(disk);

  const suitGeos = createSuitGeometries(lowQuality); owned.push(...suitGeos);
  const suitMat = litMaterial(goldFragment, { deep: { value: colors.deep }, gold: { value: colors.gold }, light: { value: colors.light }, ink: { value: colors.ink }, pulse: { value: 0 } });
  mats.push(suitMat);
  const suits = suitGeos.map((g, i) => {
    const mesh = new THREE.Mesh(g, suitMat); mesh.name = `than-bai-gold-suit-${i}`; mesh.renderOrder = 6; parent.add(mesh);
    return mesh;
  });

  const waveGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); owned.push(waveGeo);
  const waveMat = new THREE.MeshBasicMaterial({ map: rippleTexture(), color: colors.gold, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  mats.push(waveMat);
  const wave = new THREE.Mesh(waveGeo, waveMat); wave.name = 'than-bai-shockwave'; wave.position.y = 0.03; wave.renderOrder = 3; parent.add(wave);

  const sparkCount = lowQuality ? 8 : 16;
  const sparks = billboardLayer(parent, 'than-bai-gold-sparks', softDot(), sparkCount, colors.light.clone(), THREE.AdditiveBlending);
  const seeds = Array.from({ length: sparkCount }, (_, i) => ({ a: hash(i + 71) * Math.PI * 2, off: hash(i + 81), r: 0.5 + 0.9 * hash(i + 91) }));

  return {
    /** shock: 0..1 tiến độ sóng chấn (âm = không có). */
    update(time, rhythm, f, charge = 0, burst = 0, shock = -1) {
      diskMat.uniforms.time.value = time; diskMat.uniforms.opacity.value = f;
      diskMat.uniforms.charge.value = charge; diskMat.uniforms.burst.value = burst;
      suits.forEach((mesh, i) => {
        const a = i / suits.length * Math.PI * 2 + Math.PI / 4;
        mesh.position.set(Math.sin(a) * R * 1.06, 0.24 + 0.03 * Math.sin(time * 0.5 + i * 1.6) + 0.12 * burst, Math.cos(a) * R * 1.06);
        mesh.rotation.set(0, time * 0.25 + i, 0);
        mesh.scale.setScalar(0.72);
      });
      suitMat.uniforms.time.value = time; suitMat.uniforms.opacity.value = f; suitMat.uniforms.pulse.value = 0.1 + 0.3 * charge + 0.6 * burst;
      wave.scale.setScalar(0.4 + 4.4 * Math.max(0, shock));
      waveMat.opacity = (shock > 0 && shock < 1 ? Math.pow(1 - shock, 1.3) : 0) * f;
      seeds.forEach(({ a, off, r }, i) => {
        const u = ((time / 7 + off) % 1 + 1) % 1, ang = a + time * 0.08;
        const tw = 0.7 + 0.3 * Math.sin(time * 1.8 + i * 2.3), size = 0.03 + 0.02 * tw;
        sparks.set(i, Math.sin(ang) * r, 0.08 + u * 2.2, Math.cos(ang) * r, size, size, Math.sin(Math.PI * u) * tw * (0.45 + 0.4 * charge + 0.6 * burst) * f);
      });
      sparks.commit();
    },
    dispose() { owned.forEach(o => o.dispose()); mats.forEach(m => m.dispose()); sparks.dispose(); },
  };
}
