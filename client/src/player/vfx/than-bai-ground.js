import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { bell, softDot } from './aura-rhythm.js';
import { goldFragment, litMaterial } from './vip-aura-shaders.js';
import { tableSealTexture } from './than-bai-textures.js';
import { rippleTexture } from './vua-cau-ca-textures.js';
import { createSuitGeometries } from './than-bai-suit-geometry.js';

// Nền đất Thần bài: BÀN CÒ QUAY PHÁP TRẬN.
//  - Mặt bàn (shader): vành 37 ô đỏ đen quay một chiều, lõi khảm bốn chất + chữ 賭神財運 quay chiều ngược,
//    nền nỉ đỏ thẫm; tia sáng quét vòng như đèn sòng, chỗ khảm vàng lóe theo tia và theo nhịp.
//  - Vành vàng 3D hai tầng và 37 phím ngăn vàng nhô lên quay cùng vành ô.
//  - Viên bi ngà chạy ngược chiều quanh rãnh, kéo vệt sáng.
//  - Bốn chất bài đúc vàng 3D bay vòng ngoài, tự xoay.
//  - Cột kim quang dựng quanh vành, vân sáng chạy lên.
//  - Lúc "tất tay": sóng chấn vàng loang ra từ tâm.
const R = 1.7, POCKETS = 37, WHEEL_SPEED = 0.28, HUB_SPEED = -0.08, BALL_SPEED = -1.0, TRAIL = 12;

const diskFragment = `
  uniform sampler2D map;
  uniform vec3 gold, light;
  uniform float time, opacity, pulse, wheel, hub, flash;
  varying vec2 vUv;
  vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float ang = r > 0.765 && r < 0.985 ? wheel : (r <= 0.765 ? hub : 0.0);
    vec4 tex = texture2D(map, rot(p, -ang) * 0.5 + 0.5);
    float goldMask = smoothstep(0.1, 0.3, tex.r - tex.b) * step(0.42, tex.g);
    float th = atan(p.y, p.x);
    float beam = pow(max(0.0, cos(th - time * 0.6)), 28.0) * smoothstep(0.15, 0.9, r);
    // Nỉ nhung đỏ thẫm có vân trám chìm, sẫm dần ra mép.
    vec2 hp = rot(p, -hub) * 18.0;
    float lattice = smoothstep(0.88, 1.0, max(abs(sin(hp.x + hp.y)), abs(sin(hp.x - hp.y))));
    vec3 felt = mix(vec3(0.42, 0.03, 0.07), vec3(0.12, 0.01, 0.03), smoothstep(0.0, 0.8, r)) + gold * lattice * 0.08;
    vec3 col = mix(felt, tex.rgb, tex.a);
    col += goldMask * light * (0.45 + 0.8 * beam + 0.7 * pulse) + light * beam * 0.15;
    col += light * flash * 0.7 * (1.0 - r);
    float a = max(tex.a, 0.95) * (1.0 - smoothstep(0.95, 1.0, r));
    gl_FragColor = vec4(col, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const pillarFragment = `
  uniform vec3 gold, light;
  uniform float time, opacity, pulse;
  varying vec2 vUv;
  void main() {
    float streak = pow(0.5 + 0.5 * sin(vUv.x * 6.2831853 * 26.0 + sin(vUv.x * 41.0) * 2.0), 6.0);
    float rise = 0.5 + 0.5 * sin(vUv.y * 11.0 - time * 1.5 + vUv.x * 31.0);
    float fade = pow(1.0 - vUv.y, 1.7) * smoothstep(0.0, 0.06, vUv.y);
    vec3 col = mix(gold, light, rise * 0.55);
    float a = fade * (0.1 + 0.4 * streak * rise) * (0.55 + 0.9 * pulse);
    gl_FragColor = vec4(col, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const planeVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function rimsAndFrets() {
  const parts = [new THREE.TorusGeometry(R * 0.985, 0.03, 8, 96), new THREE.TorusGeometry(R * 0.765, 0.022, 8, 80)];
  const rims = mergeGeometries(parts.map(g => g.rotateX(-Math.PI / 2).translate(0, 0.03, 0)));
  parts.forEach(g => g.dispose());
  const fretParts = [];
  for (let i = 0; i < POCKETS; i++) {
    const a = Math.PI + i / POCKETS * Math.PI * 2, mid = R * 0.875; // trùng ranh giới ô của texture
    const g = new THREE.BoxGeometry(0.014, 0.045, R * 0.21).rotateY(a).translate(Math.sin(a) * mid, 0.03, Math.cos(a) * mid);
    fretParts.push(g);
  }
  const frets = mergeGeometries(fretParts);
  fretParts.forEach(g => g.dispose());
  return { rims, frets };
}

export function createThanBaiGround(parent, colors, lowQuality) {
  const owned = [], mats = [];
  const goldMat = () => { const m = litMaterial(goldFragment, { deep: { value: colors.deep }, gold: { value: colors.gold }, light: { value: colors.light }, ink: { value: colors.ink }, pulse: { value: 0 } }); mats.push(m); return m; };
  const add = (geo, mat, name, order) => { const mesh = new THREE.Mesh(geo, mat); mesh.name = name; mesh.renderOrder = order; parent.add(mesh); return mesh; };

  const diskGeo = new THREE.CircleGeometry(R, 96); owned.push(diskGeo);
  const diskMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tableSealTexture() }, gold: { value: colors.gold }, light: { value: colors.light },
      time: { value: 0 }, opacity: { value: 1 }, pulse: { value: 0 }, wheel: { value: 0 }, hub: { value: 0 }, flash: { value: 0 } },
    vertexShader: planeVertex, fragmentShader: diskFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }); mats.push(diskMat);
  const disk = add(diskGeo, diskMat, 'than-bai-roulette', 1);
  disk.rotation.x = -Math.PI / 2; disk.position.y = 0.012;

  const { rims, frets } = rimsAndFrets(); owned.push(rims, frets);
  const rimMat = goldMat();
  add(rims, rimMat, 'than-bai-roulette-rims', 2);
  const fretMesh = add(frets, rimMat, 'than-bai-roulette-frets', 2);

  const ballGeo = new THREE.SphereGeometry(0.045, 16, 10); owned.push(ballGeo);
  const ball = add(ballGeo, goldMat(), 'than-bai-roulette-ball', 3);
  const trail = billboardLayer(parent, 'than-bai-ball-trail', softDot(), TRAIL, colors.light.clone(), THREE.AdditiveBlending);
  // Hạt vàng thưa bay lên chậm từ mặt bàn (ít hạt, không thành bụi rác).
  const sparkCount = lowQuality ? 6 : 10;
  const sparks = billboardLayer(parent, 'than-bai-gold-sparks', softDot(), sparkCount, colors.light.clone(), THREE.AdditiveBlending);
  const sparkSeeds = Array.from({ length: sparkCount }, (_, i) => ({ a: hash(i + 71) * Math.PI * 2, off: i / sparkCount, r: 0.6 + 0.9 * hash(i + 91) }));

  const suitGeos = createSuitGeometries(lowQuality); owned.push(...suitGeos);
  const suitMat = goldMat();
  const suits = suitGeos.map((g, i) => add(g, suitMat, `than-bai-gold-suit-${i}`, 6));

  let pillarMat = null;
  if (!lowQuality) {
    const pillarGeo = new THREE.CylinderGeometry(R * 0.99, R * 0.99, 1.3, 72, 1, true).translate(0, 0.65, 0); owned.push(pillarGeo);
    pillarMat = new THREE.ShaderMaterial({ uniforms: { gold: { value: colors.gold }, light: { value: colors.light }, time: { value: 0 }, opacity: { value: 1 }, pulse: { value: 0 } },
      vertexShader: planeVertex, fragmentShader: pillarFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    mats.push(pillarMat);
    add(pillarGeo, pillarMat, 'than-bai-gold-pillars', 4);
  }
  const waveGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); owned.push(waveGeo);
  const waveMat = new THREE.MeshBasicMaterial({ map: rippleTexture(), color: colors.gold, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }); mats.push(waveMat);
  const wave = add(waveGeo, waveMat, 'than-bai-shockwave', 3);
  wave.position.y = 0.03;

  return {
    update(time, rhythm, f) {
      sparkSeeds.forEach(({ a, off, r }, i) => {
        const u = ((time / 7 + off) % 1 + 1) % 1, tw = 0.75 + 0.25 * Math.sin(time * 1.6 + i * 2.3), size = 0.035 * tw;
        sparks.set(i, Math.sin(a) * r, 0.1 + u * 1.8, Math.cos(a) * r, size, size, Math.sin(Math.PI * u) * tw * (0.5 + 0.4 * rhythm.pulse) * f);
      });
      sparks.commit();
      const flash = bell(0.45, 0.035, rhythm.phase), shock = Math.max(0, Math.min(1, (rhythm.phase - 0.44) / 0.22));
      diskMat.uniforms.time.value = time; diskMat.uniforms.wheel.value = time * WHEEL_SPEED; diskMat.uniforms.hub.value = time * HUB_SPEED;
      diskMat.uniforms.pulse.value = rhythm.pulse; diskMat.uniforms.flash.value = flash; diskMat.uniforms.opacity.value = 0.88 * f;
      fretMesh.rotation.y = time * WHEEL_SPEED;
      const ba = time * BALL_SPEED, br = R * 0.745;
      ball.position.set(Math.sin(ba) * br, 0.05 + 0.012 * Math.abs(Math.sin(time * 4)), Math.cos(ba) * br);
      for (let i = 0; i < TRAIL; i++) {
        const a = ba - i * 0.045 * Math.sign(BALL_SPEED), s = 0.09 * (1 - i / TRAIL);
        trail.set(i, Math.sin(a) * br, 0.05, Math.cos(a) * br, s, s, (1 - i / TRAIL) * 0.8 * f);
      }
      trail.commit();
      suits.forEach((mesh, i) => {
        const a = i / suits.length * Math.PI * 2 + time * 0.15;
        mesh.position.set(Math.sin(a) * R * 1.12, 0.3 + 0.06 * Math.sin(time * 0.7 + i * 1.6) + 0.35 * flash, Math.cos(a) * R * 1.12);
        mesh.rotation.set(0, time * 0.5 + i, 0);
      });
      for (const m of mats) {
        if (!m.uniforms) continue;
        m.uniforms.time.value = time;
        if (m.uniforms.pulse && m !== diskMat) m.uniforms.pulse.value = 0.35 * rhythm.pulse + flash;
        if (m !== diskMat) m.uniforms.opacity.value = f;
      }
      if (pillarMat) pillarMat.uniforms.opacity.value = 0.8 * f;
      wave.scale.setScalar(0.4 + 4.6 * shock);
      waveMat.opacity = (shock > 0 && shock < 1 ? Math.pow(1 - shock, 1.3) : 0) * f;
    },
    dispose() { owned.forEach(o => o.dispose()); mats.forEach(m => m.dispose()); trail.dispose(); sparks.dispose(); },
  };
}
