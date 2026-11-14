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

// ===== V10.1 Ngọc Liên Bảo Tọa — dựng hình trước (Phase 1 blockout) =====
// Một cánh sen parametric: bản cánh rộng thân, gốc thuôn cắm vào đài, mặt thìa lõm,
// mép vểnh, dọc cánh vồng nhẹ và đầu cánh vòm mềm vểnh lên — không nhọn như lưỡi
// kiếm, không phẳng như mảnh kính. v: 0 gốc → 1 đầu cánh; across: −1..1.
function buildLotusPetal(lSeg, wSeg) {
  // CHIỀU Z CÁNH: với cặp quay (rotation.x=lean, rotation.y=π−a) thì +z_local chỉ XUỐNG
  // → mặt thìa lõm phải về −z_local (lõm hướng trời), đầu cánh vểnh lên cũng −z_local.
  const W = .26, CUP = .08, EDGE = .045, BEND = .07, FLICK = .12, TUCK = .05;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= lSeg; j++) {
    const v = j / lSeg;
    const halfW = W * Math.pow(Math.sin(Math.PI * v), .45) * (.3 + .7 * Math.min(1, v / .22));
    const bow = -(BEND * Math.sin(Math.PI * Math.pow(v, 1.1))
      + FLICK * Math.pow(Math.max(0, (v - .68) / .32), 2))
      + TUCK * (1 - Math.min(1, v / .12));
    for (let k = 0; k <= wSeg; k++) {
      const u = k / wSeg, across = u * 2 - 1;
      const dish = (CUP * (1 - across * across) - EDGE * Math.pow(Math.abs(across), 3)) * (halfW / W);
      pos.push(across * halfW, v, bow + dish);
      uv.push(u, v);
    }
  }
  for (let j = 0; j < lSeg; j++) for (let k = 0; k < wSeg; k++) {
    const n = j * (wSeg + 1) + k;
    idx.push(n, n + 1, n + wSeg + 1, n + 1, n + wSeg + 2, n + wSeg + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// Cấu hình ba tầng sen — gốc cánh chung mép đài (.42/.5/.58 ≈ vành bowl .55), xa hơn bán
// kính drape áo (~.4) để không xuyên thân; đỉnh cánh trước không vượt hông người ngồi:
//   ngoài: xòe rộng tạo silhouette; giữa: so le (7 nguyên tố) hướng lên; trong: thấp ôm chân.
// lean = góc ngả tính từ phương thẳng đứng (rad).
const LOTUS_TIERS = [
  { n: 8, r: .58, y: .1, len: 1.05, lean: .98, stag: 0 },
  { n: 7, r: .5, y: .12, len: .8, lean: .84, stag: Math.PI / 7 },
  { n: 5, r: .42, y: .1, len: .38, lean: .84, stag: .3 },
];

// ===== V10.2 bộ điều khiển trạng thái (chỉ hệ 1) =====
// Summon → Idle ↔ Enhanced → Breakthrough (one-shot, gọi Kim Cương Pháp Tướng) → về
// trạng thái trước; Dissolve trình tự khi avatar bắt đầu mờ dần. Mọi envelope là HÀM
// THUẦN của thời gian trạng thái (không tích lũy dt) — tua/step lại ra đúng khung, đổi
// state giữa chừng không sinh đối tượng mồ côi. Vòng xoay thêm lúc Đột phá dùng pha
// cộng f(brk) với f(0)=0, f(1)=2π·N (N vòng nguyên) — không bao giờ giật vị trí vòng.
const STATE_DUR = { summon: 2.2, breakthrough: 5, dissolve: 1.8 };
const STATE_NAMES = ['summon', 'idle', 'enhanced', 'breakthrough', 'dissolve'];
const clamp01 = x => Math.max(0, Math.min(1, x));
const sstep = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const bell = (c, w, x) => Math.exp(-((x - c) * (x - c)) / (w * w));
// Tiến trình chuẩn hoá 0→1, ra vào có đạo hàm 0 (gia tốc mềm).
const rise01 = brk => brk - Math.sin(brk * Math.PI * 2) / (Math.PI * 2);

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
  // V10: toàn bộ lớp hoa văn (nội tâm + vành phù văn + mực + chấm sáng + lõi) nằm trong
  // MỘT group billboard riêng — hoa văn luôn đọc được ở mọi góc; pháp giới 3D (vòng khắc,
  // thiên luân, dải khí) ở ngoài group, giữ vị trí thế giới cho chiều sâu thật.
  const ornamental = new THREE.Group(); ornamental.name = 'aura-emblem';
  ornamental.scale.setScalar(effect === 1 ? .95 : 1); group.add(ornamental);
  const upright = new THREE.Mesh(plane, uprightMat);
  upright.name = 'aura-emblem-core';
  upright.visible = effect !== 8 && effect !== 6 && effect !== 4;
  upright.scale.setScalar(effect === 4 ? 1.35 : 1.16);
  upright.position.set(0, effect === 1 ? 1.62 : 1.45, effect === 1 ? 0 : -.55); ornamental.add(upright);
  // V10.3 bỏ billboard theo camera (feedback chủ dự án: đĩa luôn trượt ra phía sau theo
  // camera nên trông giả) — mandala neo CỐ ĐỊNH sau lưng nhân vật trong local (z −.3) và
  // quay theo yaw nhân vật qua root cha, như một vật thể thật: nhìn ngang thấy cạnh đĩa,
  // đi ra sau thấy mặt kia. Cả vành pháp giới + vòng quan là con ornamental nên giữ nguyên
  // bố cục quanh đĩa ở mọi góc; hệ 2–8 vốn đã cố định như vậy (z −.55) — KHÔNG đụng tới.
  if (effect === 1) ornamental.position.z = -.3;
  upright.frustumCulled = false;
  // bill: HẰNG SỐ neo local cho dòng khí, hạt rơi và pháp tướng (manifestation đọc
  // view.ax/az/yaw mỗi khung) — đĩa không còn di chuyển nên không cần ghi lại mỗi khung.
  const bill = { ax: 0, az: -.3, yaw: 0 };
  // camYaw: phương camera quy về local, đo live trong onBeforeRender (callback phải nằm
  // trên MESH được render — Group không được renderer gọi). Chỉ guard cánh sen dùng:
  // cánh vẫn nhường ống kính dù đĩa không còn xoay theo camera.
  let camYaw = 0;
  if (effect === 1) {
    const vA = new THREE.Vector3(), vD = new THREE.Vector3();
    upright.onBeforeRender = (renderer, scene, camera) => {
      if (!ornamental.parent) return;
      vA.setFromMatrixPosition(ornamental.parent.matrixWorld);
      vD.subVectors(vA, camera.position); vD.y = 0;
      if (vD.lengthSq() < 1e-6) return;
      vD.normalize();
      const me = ornamental.parent.matrixWorld.elements;
      camYaw = Math.atan2(-vD.x, -vD.z) - Math.atan2(me[8], me[10]);
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
    rimInk.name = 'aura-emblem-rim-ink';
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
  ink.name = 'aura-emblem-ink';
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
  // V10.2: quét phù văn tuần tự trên vành mandala lúc Đột phá — một đầu sóng sáng chạy
  // một vòng, đuôi mờ dần kèm vạch khắc nhấp nháy theo; ẩn hoàn toàn ngoài state đó.
  let sweepMat = null, sweepMesh = null;
  if (effect === 1) {
    sweepMat = new THREE.ShaderMaterial({
      uniforms: { tint: { value: core }, sweep: { value: 0 }, on: { value: 0 }, fade: { value: 1 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: emblemVert,
      fragmentShader: `uniform vec3 tint; uniform float sweep, on, fade; varying vec2 vUv;
        void main(){
          vec2 p = vUv * 2. - 1.;
          float r = length(p), ang = atan(p.y, p.x);
          float band = smoothstep(.5, .58, r) * smoothstep(1., .92, r);
          float lead = sweep * 6.2831853;
          float d = mod(lead - ang, 6.2831853);
          // Đầu quét MỎNG và không trắng lị: đầu quét cô đặc trên cung gần-tiếp tuyến
          // tụ thành vệt chéo trắng (bẫy "giọt sáng lạc") — hạ đỉnh, trải rộng.
          float head = exp(-d * d * 55.);
          float trail = exp(-d * 2.6);
          float tick = pow(.5 + .5 * cos(ang * 48.), 6.);
          vec3 hue = mix(tint, vec3(1., .97, .86), head * .5);
          float a = (head * .4 + trail * .26 + trail * tick * .45) * band * on * fade;
          gl_FragColor = vec4(hue * (1. + head * .35), a);
        }`,
    });
    materials.push(sweepMat);
    sweepMesh = new THREE.Mesh(plane, sweepMat);
    sweepMesh.name = 'aura-emblem-sweep'; sweepMesh.visible = false; sweepMesh.frustumCulled = false;
    upright.add(sweepMesh);
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
    if (effect === 1) mesh.name = 'aura-halo';   // V10: dải khí thuộc lớp pháp giới khi isolate
    ribbons.push({ geo, positions });
  }
  const manifestation = createAuraManifestation(effect, lowQuality, color, accent, core, effect === 1 ? bill : null);
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
  let lotus = null, lotusMats = null, lotusPetalMat = null, lotusDishMat = null, haloA = null, haloB = null, haloC = null, haloMat = null, coreOrb = null, coreMat = null;
  let ringMain = null, ringMainMat = null, ringSub1 = null, ringSub2 = null, ringSubMat1 = null, ringSubMat2 = null;
  let motes = null, moteMat = null, moteSeeds = null;
  let streams = null, streamMat = null;
  if (effect === 1) {
    // ===== V10.1 Ngọc Liên Bảo Tọa — Phase 2 material (geometry đã duyệt) =====
    // Tòa sen từ đài sen thật + 20 cánh parametric. LOTUS_GRAY=true quay lại blockout
    // xám (debug hình khối); Phase 2: gradient vàng ấm → ngọc bích, gân khí chạy dọc
    // cánh, viền phát quang tinh tế, đài vàng pulse cùng nhịp 8 s.
    const LOTUS_GRAY = false;
    const petalGeo = buildLotusPetal(lowQuality ? 8 : 12, lowQuality ? 4 : 6);
    geometries.push(petalGeo);
    const dishGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0, .04), new THREE.Vector2(.2, .045), new THREE.Vector2(.34, .07),
      new THREE.Vector2(.46, .1), new THREE.Vector2(.55, .125), new THREE.Vector2(.575, .1),
      new THREE.Vector2(.55, .06), new THREE.Vector2(.44, .02), new THREE.Vector2(0, 0),
    ], lowQuality ? 24 : 40);
    geometries.push(dishGeo);
    lotusMats = [];
    const lotusVert = `varying vec2 vUv; varying vec3 vTint;
      void main(){
        vUv = uv;
        #ifdef USE_INSTANCING_COLOR
          vTint = instanceColor;
        #else
          vTint = vec3(1.);
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.);
      }`;
    if (LOTUS_GRAY) {
      const gray = k => { const m = new THREE.MeshStandardMaterial({ color: 0xb9bfc2,
        roughness: .62, metalness: .04, side: THREE.DoubleSide, transparent: true, opacity: .96 });
        materials.push(m); lotusMats.push({ m, base: .96, k }); return m; };
      const dish = new THREE.Mesh(dishGeo, gray('dish'));
      dish.name = 'aura-lotus-dish'; dish.position.y = .02; group.add(dish);
      lotus = LOTUS_TIERS.map((cfg, tier) => {
        const mesh = new THREE.InstancedMesh(petalGeo, gray('lotus'), cfg.n);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false; mesh.name = 'aura-petals'; group.add(mesh);
        return { mesh, cfg, tier };
      });
    } else {
      // Cánh sen: gradient gốc vàng ấm → đầu ngọc, gân chính + gân phụ có dòng khí chạy,
      // viền sáng mảnh; đầu cánh trong nhẹ đọc được chồng lớp; mặt sau tối hơn cho dày.
      lotusPetalMat = new THREE.ShaderMaterial({
        uniforms: { fade: { value: 1 }, time: { value: 0 }, glow: { value: 0 } },
        vertexShader: lotusVert,
        fragmentShader: `uniform float fade, time, glow; varying vec2 vUv; varying vec3 vTint;
        void main(){
          float u = vUv.x, v = vUv.y;
          // Palette Sen Kim: gốc vàng ấm ~30% chiều cánh, thân và đầu ngọc bích chủ đạo.
          vec3 goldC = vec3(.98, .74, .22), jadeC = vec3(.36, .84, .70), tipC = vec3(.60, .95, .84);
          vec3 base = mix(goldC, jadeC, smoothstep(.1, .48, v));
          base = mix(base, tipC, smoothstep(.55, 1., v) * .65);
          vec3 col = base * vTint * mix(.88, 1.15, smoothstep(0., .5, v));
          // Gân: sống giữa đậm + hai gân phụ; dòng khí vàng chạy root → tip theo nhịp.
          float mid = 1. - abs(u * 2. - 1.);
          float spine = pow(mid, 6.);
          float side = pow(max(0., 1. - abs(abs(u * 2. - 1.) - .45) / .16), 2.) * .5;
          float qi = pow(.5 + .5 * sin(v * 9. - time * 1.6), 6.) * .35;
          col += vec3(1., .92, .55) * (spine * .55 + side * .3) * (.55 + qi);
          // Viền phát quang mảnh, mặt sau tối hơn — cánh có thể tích, không tinh thể.
          col += vec3(.9, 1., .92) * pow(abs(u * 2. - 1.), 5.) * .22;
          if (!gl_FrontFacing) col *= .82;
          float alpha = mix(1., .82, smoothstep(.55, 1., v));
          gl_FragColor = vec4(col * (1. + glow * .3), alpha * fade);
        }`,
        transparent: true, depthWrite: true, side: THREE.DoubleSide, toneMapped: false,
      });
      materials.push(lotusPetalMat);
      lotusMats.push({ m: lotusPetalMat, base: 1, k: 'lotus' });
      // Đài sen vàng ấm: vành sáng hơn, lõi pulse nhẹ theo chu kỳ 8 s của công pháp.
      lotusDishMat = new THREE.ShaderMaterial({
        uniforms: { fade: { value: 1 }, time: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
        fragmentShader: `uniform float fade, time; varying vec2 vUv;
        void main(){
          vec3 deepC = vec3(.55, .38, .09), lightC = vec3(.95, .81, .49);
          vec3 col = mix(deepC, lightC, smoothstep(.1, .5, vUv.y));
          float pulse = pow(.5 + .5 * sin(time * .785398), 3.);
          col += lightC * pulse * (1. - vUv.y) * .22;
          gl_FragColor = vec4(col, fade);
        }`,
        transparent: true, side: THREE.DoubleSide, toneMapped: false,
      });
      materials.push(lotusDishMat);
      lotusMats.push({ m: lotusDishMat, base: 1, k: 'dish' });
      const dish = new THREE.Mesh(dishGeo, lotusDishMat);
      dish.name = 'aura-lotus-dish'; dish.position.y = .02; group.add(dish);
      // Tint gần trắng ấm để không chèn màu gốc vàng — tầng trong ấm hơn, ngoài nhạt dần.
      const tints = [new THREE.Color('#ffe9b8'), new THREE.Color('#fff3d6'), new THREE.Color('#ffffff')];
      lotus = LOTUS_TIERS.map((cfg, tier) => {
        const mesh = new THREE.InstancedMesh(petalGeo, lotusPetalMat, cfg.n);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        for (let i = 0; i < cfg.n; i++) mesh.setColorAt(i, tints[Math.min(2, tier)]);
        mesh.instanceColor.needsUpdate = true;
        mesh.frustumCulled = false; mesh.name = 'aura-petals'; group.add(mesh);
        return { mesh, cfg, tier };
      });
    }
    // Cung ôm thân + vòng quan: ShaderMaterial nhẹ với fade theo hướng nhìn — khi camera
    // đi tới phương cạnh-mặt, vòng nghiêng nén thành đường chéo mà additive+bloom cộng
    // thành vệt chói (bẫy "chữ X" từng trả giá ở V9). Dùng pháp tuyến MẶT vòng ((0,0,1)
    // object space), không phải normal ống — normal ống không về 0 khi cạnh-mặt.
    haloMat = new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color('#ffd76b') }, opacity: { value: .45 }, fade: { value: 1 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `varying float vFacing;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          vFacing = abs(dot(normalize(normalMatrix * vec3(0., 0., 1.)), normalize(-mv.xyz)));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 tint; uniform float opacity,fade; varying float vFacing;
        void main(){ gl_FragColor = vec4(tint, opacity * fade * smoothstep(.05, .42, vFacing)); }`,
    });
    materials.push(haloMat);
    // Two open body tiers and one crown reuse the three existing halo draw calls.
    const haloSegments = lowQuality ? 40 : 80;
    haloA = new THREE.Mesh(new THREE.TorusGeometry(1.04, .012, 5, haloSegments, Math.PI * 1.55), haloMat);
    haloB = new THREE.Mesh(new THREE.TorusGeometry(.94, .009, 5, haloSegments, Math.PI * 1.4), haloMat);
    haloC = new THREE.Mesh(new THREE.TorusGeometry(.72, .007, 5, haloSegments), haloMat);
    geometries.push(haloA.geometry, haloB.geometry, haloC.geometry);
    for (const [h, rx] of [[haloA, .32], [haloB, -.26], [haloC, .58]]) {
      // haloC (vòng quan) là child của ornamental → đi theo đĩa cố định, local z .06 sau đĩa.
      h.position.set(0, 1.62, h === haloC ? -.06 : -.3); h.rotation.x = rx; h.frustumCulled = false;
      h.name = 'aura-halo'; (h === haloC ? ornamental : group).add(h);
    }
    haloA.name = 'aura-heart-lower'; haloB.name = 'aura-heart-upper';
    haloC.name = 'aura-halo-crown';
    // Pháp giới 3D: vòng chính khắc vạch + chase sáng quanh vành, hai thiên luân phụ mảnh
    // nghiêng khác trục xoay ngược — thể tích thật khi camera đi quanh nhân vật (V9).
    ringMainMat = new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color('#ffd76b') }, core: { value: new THREE.Color('#fff0bf') },
        time: { value: 0 }, fade: { value: 1 }, opacity: { value: .55 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
      // V10.3 vòng cố định sau lưng: khi camera đi tới phương cạnh-mặt, cả vòng nén thành
      // một đường thẳng mà additive+bloom cộng thành vệt chéo chữ X. Fade theo độ mở của
      // mặt vòng với hướng nhìn — mờ dần liên tục, không pop, không đụng vẻ mặt-đối-diện.
      // CHÚ Ý: phải dùng pháp tuyến MẶT vòng (hằng (0,0,1) trong object space của torus),
      // không phải normal của ống — pháp tuyến ống quay quanh chân ống nên lúc cạnh-mặt
      // vẫn có fragment hướng thẳng camera, facing không bao giờ về 0 (bẫy đã nghiệm).
      vertexShader: `varying vec2 vUv; varying float vFacing;
        void main(){
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          vFacing = abs(dot(normalize(normalMatrix * vec3(0., 0., 1.)), normalize(-mv.xyz)));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 tint,core; uniform float time,fade,opacity; varying vec2 vUv; varying float vFacing;
        void main(){
          float a = vUv.x * 6.2831853;
          float chase = pow(.5 + .5*cos(a*3. - time*1.3), 8.);
          float engrave = .6 + .4 * smoothstep(.3, .7, abs(fract(vUv.x*36.) - .5));
          float rails = smoothstep(0., .18, vUv.y) * smoothstep(1., .82, vUv.y);
          vec3 hue = tint * (.5 + .5*engrave) + core * chase * .6;
          float edgeFade = smoothstep(.05, .42, vFacing);
          gl_FragColor = vec4(hue * (1. + chase*.7), (.45 + .55*rails) * (.45 + chase*.55) * opacity * fade * edgeFade);
        }`,
    });
    materials.push(ringMainMat);
    // V10: các vòng pháp giới là child của ornamental — luôn ôm đĩa như vành quỹ đạo ở
    // mọi góc camera (ellipse không bao giờ dẹt thành đoạn thẳng chéo qua đĩa = hết chữ X);
    // V10.3 đĩa cố định sau lưng nên các vòng cũng thế — cạnh thật 3D khi nhìn ngang.
    // Chiều sâu thế giới vẫn do cánh sen, trận chân, dải khí và hạt khí đảm nhiệm.
    ringMain = new THREE.Mesh(new THREE.TorusGeometry(1.26, .02, 8, lowQuality ? 64 : 128), ringMainMat);
    ringMain.position.set(0, 1.62, -.06); ringMain.rotation.x = .42; ringMain.frustumCulled = false;
    ringMain.name = 'aura-halo'; ornamental.add(ringMain);
    geometries.push(ringMain.geometry);
    ringSubMat1 = ringMainMat.clone(); ringSubMat1.uniforms.opacity.value = .22;
    materials.push(ringSubMat1);
    ringSub1 = new THREE.Mesh(new THREE.TorusGeometry(1.08, .006, 6, lowQuality ? 48 : 96), ringSubMat1);
    // Thiên luân phụ tilt khác trục, xoay ngược khác tốc — ellipse đan xen quanh đĩa.
    ringSub1.position.set(0, 1.62, -.06); ringSub1.rotation.set(-.38, .7, 0); ringSub1.frustumCulled = false;
    ringSub1.name = 'aura-halo'; ornamental.add(ringSub1);
    ringSubMat2 = ringMainMat.clone(); ringSubMat2.uniforms.opacity.value = .18;
    materials.push(ringSubMat2);
    ringSub2 = new THREE.Mesh(new THREE.TorusGeometry(1.16, .005, 6, lowQuality ? 48 : 96), ringSubMat2);
    ringSub2.position.set(0, 1.62, -.06); ringSub2.rotation.set(.34, -.9, .3); ringSub2.frustumCulled = false;
    ringSub2.name = 'aura-halo'; ornamental.add(ringSub2);
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
          float body=.22+.26*pow(1.-vUv.x,2.);
          // Gói sáng chạy trận → pháp luân đúng pha Vận khí (đỉnh trên ở beat ~.58).
          float pulse=pow(.5+.5*cos(time*.78539816-2.15-vUv.x*1.5),16.);
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
  // Trạng thái + hệ số lớp (chỉ hệ 1 dùng; hệ khác mặc định 1). update() ghi, setOpacity() đọc.
  let stName = 'summon', stT0 = -1, stPrev = 'idle', stReturn = 'idle', stPin = null, stArmed = false, lastT = 0;
  let sealK = 1, lotusK = 1, dishK = 1, ringK = 1, flowK = 1;
  const formFxObj = { form: 0, diss: 0, ring: 0 };   // tái dùng — không cấp phát mỗi khung
  const update = t => {
    seal.rotation.z = [2, 4, 6, 8].includes(effect) ? -t * 0.065 : Math.sin(t * .45) * .045;
    sigilMat.uniforms.time.value = t;
    lastT = t;
    // Đồng hồ trạng thái: update(0) lúc khởi tạo chỉ dựng hình, chưa mở ngoắc đồng hồ —
    // anchor ở lần update thật đầu tiên để trong game (avatar.time ngẫu nhiên 0–10) summon
    // vẫn chạy đủ từ lúc đeo.
    let stLocal = 0, brk = -1, enhK = 0, summonP = 1, dissP = 0;
    let gathK = 0, bsK = 0, stillK = 1, ctK = 1, spinMain = 0, spinSub1 = 0, spinSub2 = 0;
    let formFx = 0, dissFx = 0, ringFx = 0;
    if (effect === 1) {
      // curName: tên trạng thái dùng cho envelope — khi ghim QA thì lấy từ pin, không
      // ghi đè stName của máy trạng thái (bỏ ghim phải về đúng trạng thái đang chạy).
      // Gán curName SAU khối chuyển trạng thái để khung chuyển đã dùng trạng thái mới.
      let curName;
      if (stPin) { curName = stPin.name; stLocal = stPin.T; }
      else {
        if (stT0 < 0) { if (stArmed) stT0 = t; else stArmed = true; }
        if (stT0 >= 0) stLocal = t - stT0;
        if (stName === 'summon' && stLocal >= STATE_DUR.summon) {
          stPrev = 'summon'; stName = 'idle'; stT0 = t; stLocal = 0;
        } else if (stName === 'breakthrough' && stLocal >= STATE_DUR.breakthrough) {
          stPrev = 'breakthrough'; stName = stReturn; stT0 = t; stLocal = 0;
        }
        curName = stName;
      }
      if (curName === 'summon') summonP = clamp01(stLocal / STATE_DUR.summon);
      else if (curName === 'dissolve') dissP = clamp01(stLocal / STATE_DUR.dissolve);
      else if (curName === 'enhanced') enhK = sstep(0, .9, stLocal);
      else if (curName === 'breakthrough') { brk = clamp01(stLocal / STATE_DUR.breakthrough); enhK = stReturn === 'enhanced' ? 1 : 0; }
      else if (curName === 'idle' && stPrev === 'enhanced') enhK = 1 - sstep(0, .9, stLocal);
      // Trình tự hiện/tan theo master brief: trận chân → sen → pháp giới → khí hội tụ;
      // tan thì khí tan trước, vòng pháp giới theo sau, cánh thu về đài, trận chân mất cuối.
      sealK = sstep(0, .28, summonP) * (1 - sstep(.66, .95, dissP));
      lotusK = sstep(.14, .52, summonP) * (1 - sstep(.3, .68, dissP));
      dishK = sstep(.1, .4, summonP) * (1 - sstep(.52, .82, dissP));
      ringK = sstep(.32, .72, summonP) * (1 - sstep(.18, .5, dissP));
      flowK = sstep(.5, .95, summonP) * (1 - sstep(0, .3, dissP));
      if (brk >= 0) {
        gathK = sstep(0, .22, brk) * (1 - sstep(.3, .45, brk));            // A tụ khí
        bsK = bell(.42, .07, brk);                                          // nổ vàng
        stillK = 1 - .6 * bell(.3, .05, brk);                               // khoảnh khắc lặng
        ctK = 1 - .16 * bell(.28, .09, brk);                                // co cấu hình
        formFx = sstep(.4, .58, brk) * (1 - sstep(.84, .96, brk));          // pháp tướng
        dissFx = sstep(.8, .96, brk);                                       // pháp tướng thiêu lên
        ringFx = clamp01(bell(.5, .1, brk) * 1.15 + bell(.68, .12, brk) * .8);
        spinMain = Math.PI * 2 * 3 * rise01(brk);   // +3 vòng nguyên — về đúng vị trí, không giật
        spinSub1 = -Math.PI * 2 * 2 * rise01(brk);
        spinSub2 = Math.PI * 2 * 2 * rise01(brk);
      }
    }
    if (effect === 1) seal.scale.setScalar(.55 + .45 * sstep(.05, .5, summonP) * (1 - .25 * dissP));
    // V10 chu kỳ công pháp 8 s, ba pha liền mạch (mọi đường đều cos mũ — loop kín không giật):
    //   A Hấp khí  (đỉnh beat ~.15): sen khép, khí hội tụ về đan điền, vòng trận thu vào tâm.
    //   B Vận khí  (beats ~.3–.6): ánh sáng dâng từ trận → hoa → quan, dòng khí chạy mạnh,
    //              các vòng xoay nhanh hơn theo nhịp.
    //   C Thổ khí  (beats ~.65–.9): sen mở, sóng linh lực tỏa mềm, aura về trạng thái đầu.
    const phase = t * Math.PI / 4;
    const inhale = effect === 1 ? Math.pow(.5 + .5 * Math.cos(phase - .94), 4) : 0;   // A — đỉnh beat .15
    groundPulse = effect === 1 ? Math.pow(.5 + .5 * Math.cos(phase - 2.39), 4)          // B — trận .38
      : Math.pow(.5 + .5 * Math.cos(phase - .6), 4);
    lotusPulse = effect === 1 ? Math.pow(.5 + .5 * Math.cos(phase - 3.02), 4)           // B — hoa .48
      : Math.pow(.5 + .5 * Math.cos(phase - 1.3), 4);
    crownPulse = effect === 1 ? Math.pow(.5 + .5 * Math.cos(phase - 3.65), 4)           // B→C — quan .58
      : Math.pow(.5 + .5 * Math.cos(phase - 2.1), 4);
    const pulse = effect === 1 ? crownPulse : Math.pow(0.5 + 0.5 * Math.sin(t * 0.85), 3);
    radiance = 0.8 + pulse * 0.2;
    ribbonMat.uniforms.time.value = t;
    upright.rotation.z = effect === 2 ? t * 0.055
      : effect === 1 ? -t * 0.045                       // lớp nội tâm quay chậm một chiều
      : Math.sin(t * 0.35) * 0.035;
    if (rimMesh) rimMesh.rotation.z = t * 0.075;        // vành phù văn ngoài quay ngược chiều
    if (glowMesh) glowMesh.rotation.z = -t * 0.12;      // chấm sáng chạy quanh hoa văn
    upright.scale.setScalar((effect === 4 ? 1.35 : effect === 1 ? 1.0 : 1.16)
      * (1 + pulse * 0.065) * (effect === 1 ? (.7 + .3 * ringK) * ctK : 1));   // triệu tập phóng to dần, đột phá co lại
    upright.position.y = (effect === 1 ? 1.62 : 1.45) + Math.sin(t * 0.7) * 0.045;
    const beat = (t % 8) / 8;
    waveOpacity = Math.exp(-Math.pow((beat - (effect === 1 ? .74 : .26)) / .11, 2)) * (effect === 1 ? .6 : .85)
      + (effect === 1 ? bsK * .55 : 0);   // Đột phá: sóng ấn phụt thêm ở nhịp nổ vàng
    // Nhịp thở 8 s chung: giữa pha B (vận khí) cánh và dòng khí dâng mạnh nhất.
    const breath = effect === 1 ? lotusPulse : Math.exp(-Math.pow((beat - 0.26) / 0.16, 2));
    if (effect === 1) {
      uprightMat.uniforms.time.value = t;
      if (rimMat) rimMat.uniforms.time.value = t;
      if (inkMat) inkMat.uniforms.time.value = t;
      if (rimInkMat) rimInkMat.uniforms.time.value = t;
    }
    if (glowMat) glowMat.opacity = ((.1 + .5 * crownPulse + .12 * pulse) * (1 + .4 * enhK) * stillK
      + ringFx * .25) * glowFade;
    if (streamMat) streamMat.uniforms.opacity.value = (.22 + .3 * breath + .12 * enhK
      + (brk >= 0 ? .3 * bell(.5, .15, brk) : 0)) * stillK;
    waves.forEach((ring, i) => {
      // V10: sóng ấn tỏa rộng ở pha Thổ khí (beat ~.74); pha Hấp khí vòng thu vào tâm.
      const burst = effect === 1 ? .64 : .16;
      const spread = Math.max(0, Math.min(1, (beat - burst - i * 0.045) / 0.22));
      ring.scale.setScalar((1 - inhale * .35) * (0.34 + spread * (1.2 + i * 0.32)) * (1 + bsK * 1.1));
    });
    if (effect === 1 && lotus) {
      // Gân cánh + đài pulse theo cùng chu kỳ công pháp; glow theo bậc sáng radiance.
      // Enhanced cộng sáng dần; Đột phá cho cánh sen phụt theo nhịp nổ vàng.
      if (lotusPetalMat) {
        lotusPetalMat.uniforms.time.value = t;
        lotusPetalMat.uniforms.glow.value = (radiance - .8) * 2.5 + .35 * enhK + bsK * .8;
      }
      if (lotusDishMat) lotusDishMat.uniforms.time.value = t;
      // V10.1 tòa sen: gốc cánh chung đài (.5/.42/.3), so le theo số nguyên tố 8/7/5,
      // cánh KHÔNG xoay drift (chỉ trôi rất chậm) — mở/khép nhẹ theo nhịp công pháp.
      // Guard kép giữ khoảng trống trước mặt người VÀ trước ống kính: cánh lọt guard
      // bị hạ thấp (droop) + thu ngắn — đỉnh trước không vượt hông người ngồi.
      dummy.rotation.order = 'YXZ';
      for (const { mesh, cfg, tier } of lotus) {
        for (let i = 0; i < cfg.n; i++) {
          // Cánh mở ở pha Thổ khí (đỉnh beat .70, trễ dần từng cánh) — khép ở pha Hấp.
          const bloom = .5 + .5 * Math.sin((beat - .45 - i * .014) * Math.PI * 2);
          const a = i * Math.PI * 2 / cfg.n + cfg.stag + t * .02;
          const frontness = 1 - (Math.cos(a) * .5 + .5);          // 1 = trước mặt người
          const camFront = 1 - (-Math.cos(a + camYaw) * .5 + .5); // 1 = chắn giữa người và camera
          const guard = Math.max(frontness, camFront * .9);
          // V10.2: triệu tập — cánh mọc dần từ đài (tầng ngoài trước, lệch từng cánh);
          // tan — cánh thu ngắn về đài theo trình tự ngược (tầng trong trước).
          const grow = sstep(tier * .12 + i * .025, tier * .12 + i * .025 + .3, summonP)
            * (1 - sstep(.3 + (2 - tier) * .06 + i * .015, .62 + (2 - tier) * .06 + i * .015, dissP));
          // Guard dịu: cánh trước ống kính hạ thấp một chút chứ không bẹp xuống đất
          // (lần chụp đầu droop .3/.4 làm cánh trước biến mất thành vũng xám).
          const lean = cfg.lean + guard * .12 + (bloom - .5) * .18 * (1 + .5 * enhK) + breath * .06 - inhale * .18;
          const len = cfg.len * Math.max(.001, grow) * (1 - guard * .28) * (.96 + (bloom - .5) * .1 + breath * .04);
          dummy.position.set(Math.sin(a) * cfg.r, cfg.y, -Math.cos(a) * cfg.r * .9);
          // Cặp quay đúng cho gốc cánh (sin a, −cos a): rotation.y = π−a đưa trục +z_local
          // về hướng ra-ngoài, khi đó rotation.x = +lean mới nghiêng TIP ra ngoài VÀ giữ
          // mặt lõm hướng trời (rotation.y=a cũ làm mặt cánh lộn ngược thành ô/lá nằm).
          dummy.rotation.set(lean, Math.PI - a, 0);
          dummy.scale.set(len, len, len);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
      // V10: hai dải cung ôm thân trả lại tilt thật (V9 đẩy nằm ngang → cạnh-mặt thành vệt).
      haloA.rotation.set(.52 + .06 * Math.sin(phase), 0, t * .16);
      haloB.rotation.set(-.44 + .08 * Math.sin(phase - .7), 0, -t * .11 + Math.PI);
      haloC.rotation.z = -t * .2;
      haloA.position.set(0, .95 + lotusPulse * .035, 0);
      haloB.position.set(0, 1.3 + crownPulse * .035, 0);
      haloC.rotation.x = .58 + Math.sin(t * .27 + 1.4) * .2;
      const haloS = (1 + waveOpacity * .07) * ctK * (1 + .05 * enhK);
      haloA.scale.setScalar(haloS); haloB.scale.setScalar(haloS); haloC.scale.setScalar(haloS * (1 + pulse * .12));
      if (coreOrb) coreOrb.scale.setScalar(.22 + .16 * pulse + waveOpacity * .06 + inhale * .1 + bsK * .5);
      // Pháp giới 3D: vòng chính xoay chậm mang khắc vạch, thiên luân phụ xoay ngược khác
      // tốc; tốc độ luận theo nhịp vận khí (hàm liên tục của t — loop kín, không giật).
      // Đột phá: cộng pha rise01 — vòng quay nhanh thêm N vòng nguyên rồi về đúng vị trí.
      if (ringMainMat) {
        ringMainMat.uniforms.time.value = t;
        ringMain.rotation.z = t * .2 * (1 + .35 * crownPulse) + spinMain;
        ringMain.scale.setScalar(ctK * (1 + .07 * enhK));
        ringSubMat1.uniforms.time.value = t * 1.3;
        ringSub1.rotation.z = -t * .3 * (1 + .3 * lotusPulse) + spinSub1;
        ringSubMat2.uniforms.time.value = t * .8;
        ringSub2.rotation.z = t * .16 * (1 + .25 * groundPulse) + spinSub2;
      }
      // V10.2: quét phù văn tuần tự trên vành mandala — chỉ sáng giữa Đột phá.
      if (sweepMesh) {
        const on = brk >= 0 ? sstep(.44, .5, brk) * (1 - sstep(.78, .88, brk)) : 0;
        sweepMesh.visible = on > .003;
        if (sweepMesh.visible) {
          sweepMat.uniforms.sweep.value = sstep(.46, .82, brk);
          sweepMat.uniforms.on.value = on;
        }
      }
      // Hai dòng khí: từ mép trận lên ĐÍNH BÁM MẶT pháp giới (billboard) — hết hở tail
      // phía sau mandala khi camera xoay (V10).
      streams.forEach(({ m, side }, k) => {
        const arr = m.geometry.attributes.position.array;
        const seg = 26;
        const tx = bill.ax + side * .52 * Math.cos(bill.yaw);
        const tz = bill.az - side * .52 * Math.sin(bill.yaw);
        for (let i = 0; i <= seg; i++) {
          const u = i / seg;
          const sway = Math.sin(t * .7 + k * 2.1 + u * 2.6) * .1 * u;
          const k2 = u * u;                       // lên cao càng bám sát mặt pháp giới
          const x = side * 1.02 + (tx - side * 1.02) * k2 + sway * (1 - k2 * .7);
          const y = .12 + u * 1.5 + Math.sin(u * Math.PI) * .1;
          const z = .12 + (tz - .12) * k2;
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
          const r = m.r + y * .55 - inhale * .25 - gathK * .3, a = m.a + y * 2.4;
          mp[i * 3] = Math.cos(a) * r;
          mp[i * 3 + 1] = .05 + y * 1.5;
          mp[i * 3 + 2] = Math.sin(a) * r;
          const c = dummyColor.copy(lo).lerp(hi, y).multiplyScalar(Math.sin(y * Math.PI));
          mc[i * 3] = c.r; mc[i * 3 + 1] = c.g; mc[i * 3 + 2] = c.b;
        } else {
          // Hạt rơi từ pháp luân: rải TRÊN MẶT billboard, hơi trồi sau đĩa .05.
          const r = m.r - y * .3 - gathK * .2 + bsK * .45, a = m.a + y * .5;
          const px = Math.sin(a) * r * m.side, pz = -Math.cos(a) * .05;
          mp[i * 3] = bill.ax + px * Math.cos(bill.yaw) + pz * Math.sin(bill.yaw);
          mp[i * 3 + 1] = 1.62 - y * 1.5;
          mp[i * 3 + 2] = bill.az - px * Math.sin(bill.yaw) + pz * Math.cos(bill.yaw);
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
          // V10: dải khí cong ôm quanh pháp giới (tâm 1.62, lùi .3) — hết dải sáng dài
          // quấn ngang thân tạo vệt khi nhìn nghiêng.
          const r = 1.24 + k * .07 + Math.sin(u * Math.PI) * .1;
          x = Math.cos(a) * r;
          z = -.3 + Math.sin(a) * r * .55;
          y = 1.62 + Math.sin(a * 2 + k * 2.1) * .22 + (u - .5) * .3;
          width = .04;
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
    formFxObj.form = formFx; formFxObj.diss = dissFx; formFxObj.ring = ringFx;
    manifestation.update(t, effect === 1 ? formFxObj : null);
    flow.update(t);
  };
  update(0);
  return { group, update,
    /** V10.2: đổi trạng thái aura hệ 1 (summon/idle/enhanced/breakthrough/dissolve). */
    setState(name) {
      if (effect !== 1 || !STATE_NAMES.includes(name) || name === stName) return;
      if (name === 'breakthrough') stReturn = stName === 'enhanced' ? 'enhanced' : 'idle';
      stPrev = stName; stName = name; stT0 = lastT; stPin = null;
    },
    /** Game gọi khi avatar bắt đầu mờ dần (beginFade) — Dissolve trình tự thay vì tắt cụm. */
    onFadeStart() { if (effect === 1 && (stName === 'idle' || stName === 'enhanced')) this.setState('dissolve'); },
    /** QA/preview: ghim trạng thái + tiến trình để chụp khung tái lập; T == null thì bỏ ghim. */
    qaState(name, T) { if (effect !== 1) return; if (T == null) this.setState(name); else stPin = { name, T }; },
    // V10.2: f (fade avatar từ game) nhân thêm hệ số lớp trạng thái — mỗi lớp theo trình
    // tự hiện/tan của Summon/Dissolve thay vì cả aura bật/tắt cùng lúc.
    setOpacity(f) { glowFade = f; sigilMat.uniforms.fade.value = (effect === 8 ? 0.5 : effect === 1 ? .48 + .14 * groundPulse : .7) * f * sealK;
      if (effect === 1) uprightMat.uniforms.opacity.value = .55 * radiance * f * ringK;
      else uprightMat.opacity = 0.2 * radiance * f;
      if (effect === 1) inkMat.uniforms.opacity.value = .65 * f * ringK;
      else inkMat.opacity = .06 * f;
      ribbonMat.uniforms.opacity.value = (effect === 4 ? .18 : effect === 1 ? .32 : .7) * radiance * f * (effect === 1 ? ringK : 1);
      waveMat.opacity = waveOpacity * f * (effect === 8 ? .25 : 1) * (effect === 1 ? sealK : 1);
      // Cánh/đài sen: ShaderMaterial dùng uniform fade; Material thường dùng .opacity.
      if (lotusMats) for (const { m, base, k } of lotusMats) {
        const kk = k === 'dish' ? dishK : lotusK;
        if (m.uniforms?.fade) m.uniforms.fade.value = base * f * kk;
        else m.opacity = base * f * kk;
      }
      if (haloMat) haloMat.uniforms.opacity.value = (.16 + .1 * lotusPulse) * f * ringK;
      if (coreMat) coreMat.opacity = .85 * f * ringK;
      if (moteMat) moteMat.opacity = .9 * f * flowK;
      if (streamMat) streamMat.uniforms.fade.value = f * flowK;
      if (rimMat) rimMat.uniforms.opacity.value = .58 * radiance * f * ringK;
      if (rimInkMat) rimInkMat.uniforms.opacity.value = .6 * f * ringK;
      if (ringMainMat) ringMainMat.uniforms.opacity.value = .55 * radiance * f * ringK;
      if (ringSubMat1) ringSubMat1.uniforms.opacity.value = .22 * f * ringK;
      if (ringSubMat2) ringSubMat2.uniforms.opacity.value = .18 * f * ringK;
      if (sweepMat) sweepMat.uniforms.fade.value = f * ringK;
      manifestation.setOpacity(f); flow.setOpacity(f); },
    dispose() { flow.dispose(); manifestation.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
