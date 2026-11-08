import * as THREE from 'three';
import { auraSigil, auraEmblem, auraEmblemRim, auraEmblemGlow } from './aura-sigil.js';
import { createAuraManifestation } from './aura-manifestation.js';
import { createAuraFlow } from './aura-flow.js';

const COLORS = ['#ffc247', '#31d9bd', '#669dff', '#d92313', '#f57199', '#35e59b', '#e7d3a2', '#07050e'];
const ACCENTS = ['#6acfb0', '#4876dc', '#dfa5f5', '#ff570c', '#83ccb6', '#e8bb59', '#eeb640', '#583875'];
const CORES = ['#fff0bf', '#d8fff3', '#eaf3ff', '#ffc451', '#ffe7d3', '#f5f1cf', '#f5fcff', '#b493ed'];

// Đốm sáng mềm vẽ một lần, dùng chung cho hạt khí linh.
let dotTexture = null;
function glowDot() {
  if (dotTexture) return dotTexture;
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 1, 16, 16, 15);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  dotTexture = new THREE.CanvasTexture(cv); dotTexture.colorSpace = THREE.SRGBColorSpace;
  return dotTexture;
}

// Qi ribbons taper like brush strokes; the transparent center keeps the player readable.
export function createAuraSignature(effect, lowQuality) {
  const group = new THREE.Group(); group.name = 'aura-signature';
  const geometries = [], materials = [], ribbons = [];
  const color = new THREE.Color(COLORS[effect - 1]);
  const accent = new THREE.Color(ACCENTS[effect - 1]), core = new THREE.Color(CORES[effect - 1]);
  const sigilMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: auraSigil(effect) }, tint: { value: color }, accent: { value: accent },
      core: { value: core }, time: { value: 0 }, fade: { value: 1 },
      accMix: { value: effect === 1 ? .12 : .35 }, accSwing: { value: effect === 1 ? .09 : .3 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D map; uniform vec3 tint,accent,core; uniform float time,fade,accMix,accSwing; varying vec2 vUv;
      void main(){
        vec2 p=vUv*2.-1.; float r=length(p), a=atan(p.y,p.x);
        float chase=pow(.5+.5*cos(a*3.-time*2.4),12.);
        float counter=pow(.5+.5*cos(a*2.+time*1.8),16.);
        float lines=texture2D(map,vUv).a;
        float shine=max(chase,counter)*lines;
        vec3 hue=mix(tint,accent,accMix+accSwing*sin(a-time*.6));
        hue=mix(hue,core,clamp(shine*.85+lines*.2,0.,1.));
        float alpha=lines*.94;
        gl_FragColor=vec4(hue*(1.+shine*.65),alpha*fade);
      }`,
  });
  materials.push(sigilMat);
  const plane = new THREE.PlaneGeometry(3.15, 3.15); geometries.push(plane);
  const seal = new THREE.Mesh(plane, sigilMat); seal.rotation.x = -Math.PI / 2; seal.position.y = 0.035;
  seal.name = 'aura-seal'; group.add(seal);
  // V9 Kim Liên Pháp Giới: đại pháp luân = shader hoa văn có luồng chân khí quét quanh
  // viền theo thứ tự họa tiết; các hệ khác giữ MeshBasic như cũ.
  const emblemVert = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  const uprightMat = effect === 1 ? new THREE.ShaderMaterial({
    uniforms: { map: { value: auraEmblem(1) }, color: { value: color }, time: { value: 0 },
      fade: { value: 1 }, opacity: { value: .55 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: emblemVert,
    fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform float time,fade,opacity; varying vec2 vUv;
      void main(){
        float lines = texture2D(map, vUv).a;
        float a = vUv.x * 6.2831853;
        float qi = pow(.5 + .5*cos(a - time*.9), 16.);
        vec3 hue = color * (1. + qi*1.2);
        gl_FragColor = vec4(hue, lines * opacity * (1. + qi*.8) * fade);
      }`,
  }) : new THREE.MeshBasicMaterial({ map: auraEmblem(effect), color,
    transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false });
  materials.push(uprightMat);
  const upright = new THREE.Mesh(plane, uprightMat);
  upright.name = 'aura-emblem';
  upright.visible = effect !== 8 && effect !== 6 && effect !== 4;
  upright.scale.setScalar(effect === 4 ? 1.35 : 1.16);
  upright.position.set(0, effect === 1 ? 2.05 : 1.45, effect === 1 ? -.9 : -.55); group.add(upright);
  // P0 hybrid nửa camera-facing: mandala luôn quay mặt về camera theo trục ngang, neo
  // SÁT trục nhân vật (lùi .22 m) — hết cảm giác "cổng phép" tách rời; thân người đã ghi
  // depth nên vẫn che phần tâm khi nhìn nghiêng/sau. onBeforeRender nhận camera mà không
  // phải đổi API update() dùng chung.
  upright.frustumCulled = false;
  const bill = { anchor: new THREE.Vector3(), dir: new THREE.Vector3() };
  if (effect === 1) {
    upright.onBeforeRender = (renderer, scene, camera) => {
      if (!upright.parent) return;
      const { anchor, dir } = bill;
      anchor.setFromMatrixPosition(upright.parent.matrixWorld);
      dir.subVectors(anchor, camera.position); dir.y = 0;
      if (dir.lengthSq() < 1e-6) return;
      dir.normalize();
      anchor.addScaledVector(dir, .22);
      upright.parent.worldToLocal(anchor);
      upright.position.x = anchor.x; upright.position.z = anchor.z;
      const me = upright.parent.matrixWorld.elements;
      upright.rotation.y = Math.atan2(-dir.x, -dir.z) - Math.atan2(me[8], me[10]);
      // Renderer đã tính matrixWorld TRƯỚC khi onBeforeRender chạy — không ép cập nhật thì
      // khung này vẫn vẽ bằng hướng cũ (trễ 1 khung: nhìn nghiêng thành vệt khi camera nhảy).
      upright.updateMatrixWorld(true);
    };
  }
  // Vành formation ngoài là lớp riêng — quay ngược chiều lớp nội tâm trong update().
  let rimMesh = null, rimMat = null, rimInkMat = null;
  if (effect === 1) {
    rimMat = uprightMat.clone(); rimMat.uniforms.map.value = auraEmblemRim(1);
    rimMat.uniforms.opacity.value = .58;
    materials.push(rimMat);
    rimMesh = new THREE.Mesh(plane, rimMat);
    rimMesh.name = 'aura-emblem-rim'; rimMesh.renderOrder = 2; rimMesh.frustumCulled = false;
    upright.add(rimMesh);
    // Ink cho vành ngoài: mực màu vẽ đè nền sáng (normal blending) — mandala không bị
    // rửa màu khi camera ngang qua vùng trời/vỉa đá rực nắng.
    rimInkMat = rimMat.clone(); rimInkMat.blending = THREE.NormalBlending;
    rimInkMat.uniforms.color.value.multiplyScalar(.55); rimInkMat.uniforms.opacity.value = .45;
    materials.push(rimInkMat);
    const rimInk = new THREE.Mesh(plane, rimInkMat);
    rimInk.position.z = -0.004; rimInk.renderOrder = 1; rimInk.frustumCulled = false;
    upright.add(rimInk);
  }
  // V9: bỏ quạt 2 lớp nghiêng — chiều sâu giao cho pháp giới 3D (vòng khắc + thiên luân
  // phụ phía dưới), hết nguồn "chữ X vàng" khi camera đi ngang.
  // Colored ink survives bright scenery; the additive layer supplies the luminous edge.
  const inkMat = uprightMat.clone(); inkMat.blending = THREE.NormalBlending;
  if (effect === 1) inkMat.uniforms.color.value.multiplyScalar(0.55);
  else inkMat.color.multiplyScalar(0.55);
  materials.push(inkMat);
  const ink = new THREE.Mesh(plane, inkMat); ink.position.z = -0.004;
  ink.renderOrder = 1; upright.renderOrder = 2;
  upright.add(ink);
  // Điểm giao phát sáng theo nhịp: lớp phủ additive trên mandala chính, opacity pulse 8 s.
  let glowMat = null, glowFade = 1, glowMesh = null;
  if (effect === 1) {
    glowMat = new THREE.MeshBasicMaterial({ map: auraEmblemGlow(1), color: '#ffe9ad',
      transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    materials.push(glowMat);
    glowMesh = new THREE.Mesh(plane, glowMat);
    glowMesh.name = 'aura-emblem-glow'; glowMesh.renderOrder = 3;
    upright.add(glowMesh);
  }
  const count = lowQuality ? 2 : 3, segments = lowQuality ? 36 : 64;
  const ribbonMat = new THREE.ShaderMaterial({
    uniforms: { tint: { value: color }, accent: { value: accent }, core: { value: core }, opacity: { value: 0.65 }, time: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv;
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 tint,accent,core; uniform float opacity; uniform float time; varying vec2 vUv;
      void main(){
        float edge=pow(max(0.,sin(vUv.y*3.14159265)),2.);
        float tip=pow(max(0.,sin(vUv.x*3.14159265)),.7);
        float ink=.45+.55*pow(.5+.5*sin(vUv.y*55.+sin(vUv.x*19.-time)*2.),5.);
        float surge=pow(max(0.,sin(vUv.x*9.-time*2.)),12.);
        vec3 hue=mix(tint,accent,smoothstep(.2,.8,vUv.x));
        gl_FragColor=vec4(mix(hue,core,surge*.65),edge*tip*ink*opacity*(1.+surge));
      }`,
  });
  materials.push(ribbonMat);
  for (let k = 0; k < count; k++) {
    const positions = new Float32Array((segments + 1) * 6), uv = new Float32Array((segments + 1) * 4), indices = [];
    for (let i = 0; i <= segments; i++) {
      uv.set([i / segments, 0, i / segments, 1], i * 4);
      if (i < segments) { const j = i * 2; indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(indices); geometries.push(geo);
    const mesh = new THREE.Mesh(geo, ribbonMat); mesh.frustumCulled = false; group.add(mesh);
    ribbons.push({ geo, positions });
  }
  const manifestation = createAuraManifestation(effect, lowQuality, color, accent, core);
  group.add(manifestation.group);
  const flow = createAuraFlow(effect, lowQuality, color, accent, core);
  group.add(flow.group);
  // Pressure wave briefly punctuates each eight-second cycle.
  // Sen Kim: vòng sóng đổi sang jade-gold để liên kết với cánh sen, không tranh chú với mandala.
  const waveColor = effect === 1 ? new THREE.Color('#6acfb0').lerp(new THREE.Color('#ffc247'), .5) : accent;
  const waveMat = new THREE.MeshBasicMaterial({ color: waveColor, transparent: true, opacity: 0,
    depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false });
  materials.push(waveMat);
  const waves = ([1, 2].includes(effect) ? [0, 1] : []).map(i => {
    const geo = new THREE.TorusGeometry(1, i ? 0.012 : 0.025, 4, segments); geometries.push(geo);
    const ring = new THREE.Mesh(geo, waveMat); ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.055 + i * 0.012; group.add(ring); return ring;
  });
  let waveOpacity = 0, radiance = 1, groundPulse = 0, lotusPulse = 0, crownPulse = 0;

  // Sen Kim — Liên Hoa Đài Thánh: ba tầng cánh sen gradient, pháp luân sau lưng, khí linh bốc lên,
  // gân sáng tách lõi khỏi viền, hai dòng khí nối trận chân → cánh → pháp luân.
  const dummy = new THREE.Object3D();
  const dummyColor = new THREE.Color();
  let petalMesh = null, petalMat = null, veinMesh = null, veinMat = null, haloA = null, haloB = null, haloC = null, haloMat = null, coreOrb = null, coreMat = null;
  let ringMain = null, ringMainMat = null, ringSub1 = null, ringSub2 = null, ringSubMat1 = null, ringSubMat2 = null;
  let motes = null, moteMat = null, moteSeeds = null;
  let streams = null, streamMat = null;
  if (effect === 1) {
    // Cánh sen mềm: thân đầy, đầu tròn, cong lõm dịu — hết cảm giác tinh thể.
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-0.23, 0.12, -0.25, 0.6, -0.09, 0.94);
    shape.quadraticCurveTo(0, 1.12, 0.09, 0.94);
    shape.bezierCurveTo(0.25, 0.6, 0.23, 0.12, 0, 0);
    const petalGeo = new THREE.ShapeGeometry(shape, lowQuality ? 6 : 12);
    const pp = petalGeo.attributes.position, pcol = new Float32Array(pp.count * 3);
    const rootC = new THREE.Color('#a4791a'), midC = new THREE.Color('#e8bb54'), tipC = new THREE.Color('#7fdcb4');
    for (let i = 0; i < pp.count; i++) {
      const y = pp.getY(i), x = pp.getX(i);
      // Cong 3D dịu: đầu cánh cuộn nhẹ, mặt cánh lõm thoáng — cánh đọc là cánh hoa, không phải mảnh kính.
      pp.setZ(i, -(y * y) * .14 - Math.abs(x) * .16);
      const c = y < .55 ? rootC.clone().lerp(midC, y / .55) : midC.clone().lerp(tipC, (y - .55) / .45);
      pcol[i * 3] = c.r; pcol[i * 3 + 1] = c.g; pcol[i * 3 + 2] = c.b;
    }
    petalGeo.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
    geometries.push(petalGeo);
    petalMat = new THREE.ShaderMaterial({
      uniforms: { opacity: { value: .8 } },
      vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false,
      vertexShader: `varying vec3 vC; varying vec2 vP;
        void main(){
          vC = color;
          #ifdef USE_INSTANCING_COLOR
            vC *= instanceColor;
          #endif
          vP = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.);
        }`,
      fragmentShader: `uniform float opacity; varying vec3 vC; varying vec2 vP;
        void main(){
          float h = clamp(vP.y / 1.12, 0., 1.);
          float across = clamp(1. - pow(abs(vP.x) / .26, 2.), .3, 1.);
          // Gốc cánh đặc hòa vào trận, đầu cánh trong dần — cánh đọc là cánh hoa nhuận.
          float alpha = mix(.96, .48, h) * across;
          vec3 deep = vC * mix(.8, 1.08, smoothstep(0., .55, h));
          if (!gl_FrontFacing) deep *= .84;
          gl_FragColor = vec4(deep, alpha * opacity);
        }`,
    });
    materials.push(petalMat);
    // Hai tầng cánh trong (vàng kim) — tầng cánh ngoài cao là đóa sen của manifestation.
    const tiers = lowQuality ? 1 : 2, per = 8;
    petalMesh = new THREE.InstancedMesh(petalGeo, petalMat, tiers * per);
    petalMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const tints = [new THREE.Color('#d9a429'), new THREE.Color('#f2cf7c')];
    for (let i = 0; i < tiers * per; i++) petalMesh.setColorAt(i, tints[Math.min(tiers - 1, Math.floor(i / per))]);
    petalMesh.instanceColor.needsUpdate = true;
    petalMesh.frustumCulled = false; petalMesh.name = 'aura-petals'; group.add(petalMesh);
    // Gân sáng additive giữa cánh: tách lõi khỏi viền, không hòa vào một vùng sáng.
    veinMat = new THREE.ShaderMaterial({
      uniforms: { opacity: { value: .5 } },
      vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: petalMat.vertexShader,
      fragmentShader: `uniform float opacity; varying vec3 vC; varying vec2 vP;
        void main(){
          float h = clamp(vP.y / 1.12, 0., 1.);
          float spine = clamp((1. - abs(vP.x) / .26) * 1.4, 0., 1.);
          gl_FragColor = vec4(vC * 1.25, mix(.9, .3, h) * spine * opacity);
        }`,
    });
    materials.push(veinMat);
    veinMesh = new THREE.InstancedMesh(petalGeo, veinMat, tiers * per);
    veinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < tiers * per; i++) veinMesh.setColorAt(i, tints[Math.min(tiers - 1, Math.floor(i / per))]);
    veinMesh.instanceColor.needsUpdate = true;
    veinMesh.frustumCulled = false; veinMesh.name = 'aura-petals'; group.add(veinMesh);
    haloMat = new THREE.MeshBasicMaterial({ color: '#ffd76b', transparent: true, opacity: 0.45,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    materials.push(haloMat);
    // Two open body tiers and one crown reuse the three existing halo draw calls.
    const haloSegments = lowQuality ? 40 : 80;
    haloA = new THREE.Mesh(new THREE.TorusGeometry(1.04, .012, 5, haloSegments, Math.PI * 1.55), haloMat);
    haloB = new THREE.Mesh(new THREE.TorusGeometry(.94, .009, 5, haloSegments, Math.PI * 1.4), haloMat);
    haloC = new THREE.Mesh(new THREE.TorusGeometry(.72, .007, 5, haloSegments), haloMat);
    geometries.push(haloA.geometry, haloB.geometry, haloC.geometry);
    for (const [h, rx] of [[haloA, .32], [haloB, -.26], [haloC, .58]]) {
      h.position.set(0, 2.02, -.55); h.rotation.x = rx; h.frustumCulled = false;
      h.name = 'aura-halo'; group.add(h);
    }
    haloA.name = 'aura-heart-lower'; haloB.name = 'aura-heart-upper';
    haloC.name = 'aura-halo-crown';
    // Pháp giới 3D: vòng chính khắc vạch + chase sáng quanh vành, hai thiên luân phụ mảnh
    // nghiêng khác trục xoay ngược — thể tích thật khi camera đi quanh nhân vật (V9).
    ringMainMat = new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color('#ffd76b') }, core: { value: new THREE.Color('#fff0bf') },
        time: { value: 0 }, fade: { value: 1 }, opacity: { value: .55 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: emblemVert,
      fragmentShader: `uniform vec3 tint,core; uniform float time,fade,opacity; varying vec2 vUv;
        void main(){
          float a = vUv.x * 6.2831853;
          float chase = pow(.5 + .5*cos(a*3. - time*1.3), 8.);
          float engrave = .6 + .4 * smoothstep(.3, .7, abs(fract(vUv.x*36.) - .5));
          float rails = smoothstep(0., .18, vUv.y) * smoothstep(1., .82, vUv.y);
          vec3 hue = tint * (.5 + .5*engrave) + core * chase * .6;
          gl_FragColor = vec4(hue * (1. + chase*.7), (.45 + .55*rails) * (.45 + chase*.55) * opacity * fade);
        }`,
    });
    materials.push(ringMainMat);
    ringMain = new THREE.Mesh(new THREE.TorusGeometry(1.26, .02, 8, lowQuality ? 64 : 128), ringMainMat);
    ringMain.position.set(0, 2.05, -.5); ringMain.rotation.x = .42; ringMain.frustumCulled = false;
    ringMain.name = 'aura-halo'; group.add(ringMain);
    geometries.push(ringMain.geometry);
    ringSubMat1 = ringMainMat.clone(); ringSubMat1.uniforms.opacity.value = .3;
    materials.push(ringSubMat1);
    ringSub1 = new THREE.Mesh(new THREE.TorusGeometry(1.08, .007, 6, lowQuality ? 48 : 96), ringSubMat1);
    ringSub1.position.set(0, 2.05, -.5); ringSub1.rotation.x = -.5; ringSub1.frustumCulled = false;
    ringSub1.name = 'aura-halo'; group.add(ringSub1);
    ringSubMat2 = ringMainMat.clone(); ringSubMat2.uniforms.opacity.value = .26;
    materials.push(ringSubMat2);
    ringSub2 = new THREE.Mesh(new THREE.TorusGeometry(1.16, .006, 6, lowQuality ? 48 : 96), ringSubMat2);
    ringSub2.position.set(0, 2.05, -.5); ringSub2.rotation.set(.75, 0, .3); ringSub2.frustumCulled = false;
    ringSub2.name = 'aura-halo'; group.add(ringSub2);
    geometries.push(ringSub1.geometry, ringSub2.geometry);
    // Lõi năng lượng: đốm sáng 3D tại tâm mandala, thở theo pulse — mỏ neo thị giác.
    coreMat = new THREE.SpriteMaterial({ map: glowDot(), color: '#fff2c0', transparent: true,
      opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    materials.push(coreMat);
    coreOrb = new THREE.Sprite(coreMat);
    coreOrb.scale.setScalar(.3); coreOrb.position.set(0, 0, .02); coreOrb.name = 'aura-halo';
    upright.add(coreOrb);
    // Hai dòng khí mảnh nối trận chân lên pháp luân, chấm sáng chạy dọc đường.
    const streamGeo = new THREE.BufferGeometry();
    const sPts = 26, sPos = new Float32Array((sPts + 1) * 6), sUv = new Float32Array((sPts + 1) * 4), sIdx = [];
    for (let i = 0; i <= sPts; i++) {
      const u = i / sPts;
      sUv.set([u, 0, u, 1], i * 4);
      if (i < sPts) { const j = i * 2; sIdx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    streamGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage));
    streamGeo.setAttribute('uv', new THREE.BufferAttribute(sUv, 2)); streamGeo.setIndex(sIdx);
    geometries.push(streamGeo);
    streamMat = new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color('#ffd76b') }, opacity: { value: 0.55 }, time: { value: 0 }, fade: { value: 1 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform vec3 tint; uniform float opacity,time,fade; varying vec2 vUv;
        void main(){
          float edge=pow(max(0.,sin(vUv.y*3.14159265)),1.5);
          float body=.3+.3*pow(1.-vUv.x,2.);
          float pulse=pow(.5+.5*cos(time*.78539816-.6-vUv.x*1.5),12.);
          vec3 hue=mix(tint,vec3(1.,.96,.8),pulse*.85);
          gl_FragColor=vec4(hue,(edge*body*.55+pulse*.75)*opacity*fade);
        }`,
    });
    materials.push(streamMat);
    streams = [-1, 1].map((side, i) => {
      const geo = i ? streamGeo.clone() : streamGeo;
      if (i) geometries.push(geo);
      const m = new THREE.Mesh(geo, streamMat); m.frustumCulled = false; m.name = 'aura-streams'; group.add(m);
      return { m, side };
    });
    // Khí linh: 24 hạt bốc lên từ trận + 8 hạt rơi từ pháp luân xuống cánh.
    const rising = lowQuality ? 8 : 24, falling = lowQuality ? 4 : 8;
    const mCount = rising + falling;
    const mGeo = new THREE.BufferGeometry();
    geometries.push(mGeo);
    const mPos = new Float32Array(mCount * 3), mCol = new Float32Array(mCount * 3);
    mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3).setUsage(THREE.DynamicDrawUsage));
    mGeo.setAttribute('color', new THREE.BufferAttribute(mCol, 3).setUsage(THREE.DynamicDrawUsage));
    moteSeeds = Array.from({ length: mCount }, (_, i) => {
      if (i < rising) return {
        up: true, a: i / rising * Math.PI * 2, r: 0.48 + (i % 5) * 0.13,
        sp: 0.22 + ((i * 7) % 10) / 10 * 0.28, ph: ((i * 29) % 10) / 10,
      };
      return {
        up: false, a: (i - rising) / falling * Math.PI * 2 + .4, r: .96 + ((i * 13) % 10) / 10 * .14,
        sp: 0.1 + ((i * 11) % 10) / 10 * 0.12, ph: ((i * 17) % 10) / 10, side: (i % 2) ? 1 : -1,
      };
    });
    moteMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, map: glowDot() });
    materials.push(moteMat);
    motes = new THREE.Points(mGeo, moteMat); motes.frustumCulled = false; motes.name = 'aura-motes'; group.add(motes);
  }
  const update = t => {
    seal.rotation.z = [2, 4, 6, 8].includes(effect) ? -t * 0.065 : Math.sin(t * .45) * .045;
    sigilMat.uniforms.time.value = t;
    // Eight-second breath travels upward; each tier peaks after the one below it.
    const phase = t * Math.PI / 4;
    groundPulse = Math.pow(.5 + .5 * Math.cos(phase - .6), 4);
    lotusPulse = Math.pow(.5 + .5 * Math.cos(phase - 1.3), 4);
    crownPulse = Math.pow(.5 + .5 * Math.cos(phase - 2.1), 4);
    const pulse = effect === 1 ? crownPulse : Math.pow(0.5 + 0.5 * Math.sin(t * 0.85), 3);
    radiance = 0.8 + pulse * 0.2;
    ribbonMat.uniforms.time.value = t;
    upright.rotation.z = effect === 2 ? t * 0.055
      : effect === 1 ? -t * 0.045                       // lớp nội tâm quay chậm một chiều
      : Math.sin(t * 0.35) * 0.035;
    if (rimMesh) rimMesh.rotation.z = t * 0.075;        // vành phù văn ngoài quay ngược chiều
    if (glowMesh) glowMesh.rotation.z = -t * 0.12;      // chấm sáng chạy quanh hoa văn
    upright.scale.setScalar((effect === 4 ? 1.35 : effect === 1 ? 1.0 : 1.16) * (1 + pulse * 0.065));
    upright.position.y = (effect === 1 ? 2.05 : 1.45) + Math.sin(t * 0.7) * 0.045;
    const beat = (t % 8) / 8;
    waveOpacity = Math.exp(-Math.pow((beat - 0.26) / 0.11, 2)) * (effect === 1 ? .6 : .85);
    // Nhịp thở 8 s chung: nở (.0–.55) rồi tán — cánh sen, đốm sáng, dòng khí cùng một hơi thở.
    const breath = effect === 1 ? lotusPulse : Math.exp(-Math.pow((beat - 0.26) / 0.16, 2));
    // Hít vào (pha ~.70): sen khép, khí hội tụ về đan điền; thở ra: mở và dâng lên pháp luân.
    const inhale = effect === 1 ? Math.pow(.5 + .5 * Math.cos(phase - 4.4), 4) : 0;
    if (effect === 1) {
      uprightMat.uniforms.time.value = t;
      if (rimMat) rimMat.uniforms.time.value = t;
      if (inkMat) inkMat.uniforms.time.value = t;
      if (rimInkMat) rimInkMat.uniforms.time.value = t;
    }
    if (glowMat) glowMat.opacity = (.1 + .5 * crownPulse + .12 * pulse) * glowFade;
    if (streamMat) streamMat.uniforms.opacity.value = .28 + .42 * breath;
    waves.forEach((ring, i) => {
      const spread = Math.max(0, Math.min(1, (beat - 0.16 - i * 0.045) / 0.22));
      ring.scale.setScalar(0.34 + spread * (1.2 + i * 0.32));
    });
    if (effect === 1 && petalMesh) {
      // Đài sen xuyên tâm: cánh sau cao nhất, cánh trước thấp (không che người);
      // ba tầng nở khác độ mở; nghiêng ngoài qua trục YXZ nên mọi góc đều thấy cánh cong.
      dummy.rotation.order = 'YXZ';
      const tiers = petalMesh.count / 8;
      for (let i = 0; i < petalMesh.count; i++) {
        const tier = Math.floor(i / 8), k = i % 8;
        const bloom = .5 + .5 * Math.sin((beat - .18 - tier * .05 - k * .012) * Math.PI * 2);
        const a = k * Math.PI / 4 + tier * Math.PI / 8 + t * (tier % 2 ? .1 : -.13);
        const back = Math.cos(a);                       // 1 = sau lưng, -1 = trực diện
        const frontness = 1 - (back * .5 + .5);
        const open = tier ? .34 : .58;                  // tầng trong đứng, tầng ngoài xòe
        const r = (tier ? .44 : .6) + (bloom - .5) * .06;   // gốc cánh chung một đài trên trận
        dummy.position.set(Math.sin(a) * r, .08 + tier * .3 * (1 - frontness * .4) + (bloom - .5) * .08, -Math.cos(a) * r * .9);
        dummy.rotation.set(open * (1 - frontness * .3) + (bloom - .5) * .32 + breath * .1 - inhale * .22, a, 0);
        dummy.scale.set(1.05, (.8 + tier * .14) * (1 - frontness * .38) * (.84 + (bloom - .5) * .3 + breath * .08), 1);
        dummy.updateMatrix();
        petalMesh.setMatrixAt(i, dummy.matrix);
        // Gân sáng cùng khung nhưng lùi vào giữa cánh — lõi tách khỏi viền.
        dummy.scale.multiplyScalar(.5);
        dummy.position.y += .035;
        dummy.updateMatrix();
        veinMesh.setMatrixAt(i, dummy.matrix);
      }
      petalMesh.instanceMatrix.needsUpdate = true;
      veinMesh.instanceMatrix.needsUpdate = true;
      haloA.rotation.set(Math.PI / 2 + .06 * Math.sin(phase), 0, t * .16);
      haloB.rotation.set(Math.PI / 2 - .08 * Math.sin(phase - .7), 0, -t * .11 + Math.PI);
      haloC.rotation.z = -t * .2;
      haloA.position.set(0, .95 + lotusPulse * .035, 0);
      haloB.position.set(0, 1.3 + crownPulse * .035, 0);
      haloC.rotation.x = .58 + Math.sin(t * .27 + 1.4) * .2;
      const haloS = 1 + waveOpacity * .07;
      haloA.scale.setScalar(haloS); haloB.scale.setScalar(haloS); haloC.scale.setScalar(haloS * (1 + pulse * .12));
      if (coreOrb) coreOrb.scale.setScalar(.22 + .16 * pulse + waveOpacity * .06 + inhale * .1);
      // Pháp giới 3D: vòng chính xoay chậm mang khắc vạch, thiên luân phụ xoay ngược khác tốc.
      if (ringMainMat) {
        ringMainMat.uniforms.time.value = t;
        ringMain.rotation.z = t * .2;
        ringSubMat1.uniforms.time.value = t * 1.3;
        ringSub1.rotation.z = -t * .3;
        ringSubMat2.uniforms.time.value = t * .8;
        ringSub2.rotation.z = t * .16;
      }
      // Hai dòng khí: vòng cung từ mép trận lên pháp luân, uốn theo nhịp thở.
      streams.forEach(({ m, side }, k) => {
        const arr = m.geometry.attributes.position.array;
        const seg = 26;
        for (let i = 0; i <= seg; i++) {
          const u = i / seg;
          const sway = Math.sin(t * .7 + k * 2.1 + u * 2.6) * .1 * u;
          const x = side * (1.02 - u * .52 + sway);
          const y = .12 + u * 1.92 + Math.sin(u * Math.PI) * .1;
          const z = .12 - u * .78;
          const w = .022 * Math.sin(u * Math.PI) + .004;
          arr[i * 6] = x - w; arr[i * 6 + 1] = y; arr[i * 6 + 2] = z;
          arr[i * 6 + 3] = x + w; arr[i * 6 + 4] = y + .01; arr[i * 6 + 5] = z + .012;
        }
        m.geometry.attributes.position.needsUpdate = true;
      });
      streamMat.uniforms.time.value = t;
      // Khí linh: hạt bốc lên sáng dần theo độ cao; hạt rơi từ pháp luân mờ dần khi chạm cánh.
      const mp = motes.geometry.attributes.position.array;
      const mc = motes.geometry.attributes.color.array;
      const lo = color, hi = core;
      for (let i = 0; i < moteSeeds.length; i++) {
        const m = moteSeeds[i], y = (t * m.sp + m.ph) % 1;
        if (m.up) {
          const r = m.r + y * .55 - inhale * .25, a = m.a + y * 2.4;
          mp[i * 3] = Math.cos(a) * r;
          mp[i * 3 + 1] = .05 + y * 1.5;
          mp[i * 3 + 2] = Math.sin(a) * r;
          const c = dummyColor.copy(lo).lerp(hi, y).multiplyScalar(Math.sin(y * Math.PI));
          mc[i * 3] = c.r; mc[i * 3 + 1] = c.g; mc[i * 3 + 2] = c.b;
        } else {
          const r = m.r - y * .3, a = m.a + y * .5;
          mp[i * 3] = Math.sin(a) * r * m.side;
          mp[i * 3 + 1] = 2.05 - y * 1.7;
          mp[i * 3 + 2] = -.55 - Math.cos(a) * .05;
          const c = dummyColor.copy(hi).lerp(lo, y).multiplyScalar(Math.sin(y * Math.PI));
          mc[i * 3] = c.r; mc[i * 3 + 1] = c.g; mc[i * 3 + 2] = c.b;
        }
      }
      motes.geometry.attributes.position.needsUpdate = true;
      motes.geometry.attributes.color.needsUpdate = true;
    }
    ribbons.forEach(({ geo, positions }, k) => {
      for (let i = 0; i <= segments; i++) {
        const u = i / segments, phase = k * Math.PI * 2 / count;
        const a = u * Math.PI * 1.65 + phase + t * 0.33;
        let x, y, z, width = 0.1;
        if (effect === 1) {
          const r = 0.65 + Math.sin(u * Math.PI) * 0.5;
          x = Math.cos(a) * r; z = Math.sin(a) * r; y = 0.12 + u * 1.18; width = 0.065;
        } else if (effect === 2) {
          x = Math.cos(a) * 1.04; z = Math.sin(a) * 1.04;
          y = 0.4 + u * 0.85 + Math.sin(a * 2 - t * 0.4) * 0.22; width = 0.2;
        } else if (effect === 3) {
          x = Math.cos(a) * 1.15; y = 0.85 + Math.sin(a) * 0.75;
          z = Math.sin(a + phase) * 0.7; width = 0.055;
        } else if (effect === 4) {
          const r = 0.8 * (1 - u * 0.65);
          x = Math.cos(phase + u * 1.8 + t * 0.3) * r; z = Math.sin(phase + u * 1.8 + t * 0.3) * r;
          y = 0.1 + u * 1.65; width = 0.2 * (1 - u) + 0.025;
        } else if (effect === 5) {
          x = Math.cos(a) * (0.8 + u * 0.35); z = Math.sin(a) * (0.8 + u * 0.35);
          y = 1.5 - u * 1.3 + Math.sin(a * 2 + t * 0.6) * 0.1; width = 0.065;
        } else if (effect === 6) {
          x = Math.cos(a) * 1.12; z = Math.sin(a) * 1.12; y = 0.2 + Math.sin(a * 2) * 0.08; width = 0.075;
        } else if (effect === 7) {
          const crescent = u * Math.PI * 1.5 + Math.PI * 0.25 + Math.sin(t * 0.3) * 0.08;
          x = Math.cos(crescent) * (0.92 + k * 0.05); y = 0.96 + Math.sin(crescent) * 0.9;
          z = -0.65 + k * 0.07; width = 0.075;
        } else {
          const sweep = u * Math.PI * 1.15 + t * (k % 2 ? -.24 : .18) + phase;
          const r = 1.05 + k * .12;
          x = Math.cos(sweep) * r; z = Math.sin(sweep) * .65 - .35;
          y = .3 + Math.sin(sweep) * .2 + Math.sin(u * Math.PI) * (.45 + k * .22);
          width = .025 + .045 * Math.pow(Math.sin(u * Math.PI),4.);
        }
        width *= Math.sin(u * Math.PI) * 1.55;
        // Vertical strips read as flowing silk, with irregular brush-grain in the fragment shader.
        positions.set([x, y - width / 2, z, x, y + width / 2, z + 0.025], i * 6);
      }
      geo.attributes.position.needsUpdate = true;
    });
    manifestation.update(t);
    flow.update(t);
  };
  update(0);
  return { group, update,
    setOpacity(f) { glowFade = f; sigilMat.uniforms.fade.value = (effect === 8 ? 0.5 : effect === 1 ? .48 + .14 * groundPulse : .7) * f;
      if (effect === 1) uprightMat.uniforms.opacity.value = .55 * radiance * f;
      else uprightMat.opacity = 0.2 * radiance * f;
      if (effect === 1) inkMat.uniforms.opacity.value = .65 * f;
      else inkMat.opacity = .06 * f;
      ribbonMat.uniforms.opacity.value = (effect === 4 ? .18 : effect === 1 ? .45 : .7) * radiance * f;
      waveMat.opacity = waveOpacity * f * (effect === 8 ? .25 : 1);
      if (petalMat) petalMat.uniforms.opacity.value = .8 * (.75 + .25 * radiance) * f;
      if (veinMat) veinMat.uniforms.opacity.value = .5 * f;
      if (haloMat) haloMat.opacity = (.22 + .14 * lotusPulse) * f;
      if (coreMat) coreMat.opacity = .85 * f;
      if (moteMat) moteMat.opacity = .9 * f;
      if (streamMat) streamMat.uniforms.fade.value = f;
      if (rimMat) rimMat.uniforms.opacity.value = .58 * radiance * f;
      if (rimInkMat) rimInkMat.uniforms.opacity.value = .6 * f;
      if (ringMainMat) ringMainMat.uniforms.opacity.value = .55 * radiance * f;
      if (ringSubMat1) ringSubMat1.uniforms.opacity.value = .3 * f;
      if (ringSubMat2) ringSubMat2.uniforms.opacity.value = .26 * f;
      manifestation.setOpacity(f); flow.setOpacity(f); },
    dispose() { flow.dispose(); manifestation.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
