// Khu cảng phông nền: cầu cảng, cần cẩu, tàu container, bãi container, xe đầu kéo, biển.
import * as THREE from 'three';
import { Batch, flatMaterial, glowTexture, rng, textTexture } from './builders.js';
import { QUAY_Y, SEA_Y } from './terrain.js';

const QUAY_MIN = 55;
const QUAY_EDGE = 124;
const SHIP_X = 146;
const BOX_COLORS = ['#b5392b', '#d9782c', '#2f6d9e', '#3f8f5f', '#c9a22f', '#8a8f96', '#2c8a8f', '#7b3f8c', '#e5e0d3', '#a8432a'];

function createSea(uniformsSky) {
  const uniforms = {
    color: { value: new THREE.Color('#2a6277') },
    glint: { value: new THREE.Color('#ffd0a0') },
    sunDir: uniformsSky.sunDir,
    sunAmt: uniformsSky.sunAmt,
    fogColor: { value: new THREE.Color() },
    fogNear: { value: 140 },
    fogFar: { value: 780 },
    time: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vWorld; varying float vDepth;
      void main(){
        vec4 w = modelMatrix * vec4(position,1.0);
        vWorld = w.xyz;
        vec4 mv = viewMatrix * w;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vWorld; varying float vDepth;
      uniform vec3 color, glint, fogColor, sunDir; uniform float sunAmt, fogNear, fogFar, time;
      float wave(vec2 p){ return sin(p.x*0.11+time*0.7)*0.5 + sin(p.y*0.17-time*0.5)*0.5 + sin((p.x+p.y)*0.05+time*0.3); }
      void main(){
        float w = wave(vWorld.xz) + wave(vWorld.zx*1.7)*0.5;
        vec3 col = color * (0.82 + 0.1*w);
        vec3 view = normalize(cameraPosition - vWorld);
        vec3 n = normalize(vec3(sin(vWorld.x*0.31+time)*0.05, 1.0, sin(vWorld.z*0.37-time*0.8)*0.05));
        vec3 r = reflect(-view, n);
        float s = pow(max(dot(r, normalize(vec3(sunDir.x, max(sunDir.y,0.08), sunDir.z))),0.0), 40.0);
        col += glint * s * (0.25 + sunAmt*1.1);
        float f = smoothstep(fogNear, fogFar, vDepth);
        gl_FragColor = vec4(mix(col, fogColor, f), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3600, 3600), mat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(600, SEA_Y, 0);
  sea.frustumCulled = false;
  return { sea, uniforms };
}

function makeStsCrane(color) {
  const b = new Batch(21);
  const legH = 34;
  for (const dx of [-11, 11]) {
    for (const dz of [-9, 9]) b.box(1.5, legH, 1.5, color, dx, legH / 2, dz);
    b.box(1.6, 1.2, 20, color, dx, 2, 0);
    b.box(1.6, 1.2, 20, color, dx, legH * 0.6, 0);
  }
  for (const dz of [-9, 9]) b.box(23, 1.3, 1.3, color, 0, legH * 0.6, dz);
  // Dầm cần vươn ra biển
  b.box(92, 2.6, 4.2, color, 24, legH + 3, 0);
  // Tháp và dây giằng
  b.box(3, 16, 3, color, 0, legH + 10, 0);
  b.add(new THREE.BoxGeometry(0.4, 48, 0.4), '#b9b4a8', { x: 22, y: legH + 12, z: 0, rz: -1.05 });
  b.add(new THREE.BoxGeometry(0.4, 26, 0.4), '#b9b4a8', { x: -12, y: legH + 12, z: 0, rz: 0.92 });
  b.box(6, 4, 5, '#d8d3c5', -8, legH + 5.4, 0);
  const crane = new THREE.Group();
  crane.add(b.build(flatMaterial(), { castShadow: false, receiveShadow: false }));

  const trolley = new THREE.Group();
  trolley.position.y = legH + 0.8;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 4), new THREE.MeshLambertMaterial({ color: 0x3a3f46, flatShading: true }));
  trolley.add(cab);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
  trolley.add(cable);
  const load = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 12.2), new THREE.MeshLambertMaterial({ color: 0xd9782c, flatShading: true }));
  trolley.add(load);
  crane.add(trolley);
  return { crane, trolley, cable, load };
}

function makeHarborCrane() {
  const base = new Batch(22);
  base.box(9, 3, 9, '#c9a22f', 0, 1.5, 0);
  base.cyl(1.4, 1.8, 16, '#c9a22f', 0, 11, 0);
  const crane = new THREE.Group();
  crane.add(base.build(flatMaterial(), { castShadow: false, receiveShadow: false }));
  const top = new Batch(23);
  top.box(5, 4, 7, '#d9b53a', 0, 2, -1);
  top.box(1.6, 1.4, 40, '#c9a22f', 0, 9, 16, { rx: -0.42 });
  top.box(0.3, 0.3, 28, '#b9b4a8', 0, 12, 7, { rx: -0.92 });
  const swing = new THREE.Group();
  swing.position.y = 19;
  swing.add(top.build(flatMaterial(), { castShadow: false, receiveShadow: false }));
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.25, 16, 0.25), new THREE.MeshLambertMaterial({ color: 0x333333 }));
  hook.position.set(0, 9, 34);
  swing.add(hook);
  crane.add(swing);
  return { crane, swing };
}

function makeShip(group) {
  const b = new Batch(24);
  const beam = 30;
  const length = 200;
  const deck = -3.5;
  const hullH = deck - SEA_Y + 2;
  const midY = SEA_Y - 2 + hullH / 2;
  b.box(beam, hullH, length - 34, '#20344f', SHIP_X, midY, 0, { jitter: 0.01 });
  b.box(beam + 0.3, 4, length - 34, '#8c2f26', SHIP_X, SEA_Y + 1, 0, { jitter: 0.01 });
  // Mũi và đuôi vát
  const prow = new THREE.CylinderGeometry(beam / 2, beam / 2, hullH, 3, 1);
  prow.rotateY(Math.PI / 6);
  b.add(prow, '#20344f', { x: SHIP_X, y: midY, z: length / 2 - 17, sz: 1.6, sx: 1.155, jitter: 0.01 });
  b.box(beam, hullH, 12, '#20344f', SHIP_X, midY, -(length / 2 - 18), { jitter: 0.01 });
  // Cabin chỉ huy
  b.box(24, 15, 13, '#e6e2d6', SHIP_X, deck + 7.5, -66);
  b.box(30, 1.5, 7, '#e6e2d6', SHIP_X, deck + 15.5, -66);
  b.box(26, 1.8, 0.2, '#22303e', SHIP_X, deck + 13, -59.4);
  b.box(4.5, 9, 4.5, '#d9782c', SHIP_X, deck + 19, -72);
  group.add(b.build(flatMaterial(), { castShadow: false, receiveShadow: false }));

  const name = new THREE.Mesh(
    new THREE.PlaneGeometry(58, 10),
    new THREE.MeshLambertMaterial({ map: textTexture('HTH LOGISTICS', { w: 1024, h: 180, bg: '#20344f', fg: '#f0ece0', border: null, font: 'bold 130px "Segoe UI",Roboto,Arial,sans-serif' }) }),
  );
  name.position.set(SHIP_X - beam / 2 - 0.2, -9, 22);
  name.rotation.y = -Math.PI / 2;
  group.add(name);
  return { deck, beam, length };
}

function buildBoxes(group, ship, lowQuality) {
  const rand = rng(303);
  const items = [];
  // Bãi container: các khối chạy dọc bờ
  const rowStep = lowQuality ? 7.8 : 3.9;
  for (let x = 74; x < 110; x += rowStep) {
    if (Math.abs(x - 92) < 4) continue; // Đường nội bộ giữa bãi
    for (let z = -128; z < 128; z += 13.2) {
      if (Math.abs(z) < 7 || rand() < 0.1) continue;
      const stack = 1 + Math.floor(rand() * 4);
      for (let k = 0; k < stack; k++) items.push([x, QUAY_Y + 1.3 + k * 2.6, z]);
    }
  }
  // Trên tàu
  const bayStep = 13.2;
  for (let z = -46; z < 78; z += bayStep) {
    for (let col = -5; col <= 5; col++) {
      const tiers = 1 + Math.floor(rand() * 4) + (Math.abs(col) < 3 ? 1 : 0);
      for (let k = 0; k < tiers; k++) items.push([SHIP_X + col * 2.65, ship.deck + 1.3 + k * 2.6, z]);
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2.55, 2.55, 12.1), new THREE.MeshLambertMaterial({ flatShading: true }), items.length);
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  items.forEach(([x, y, z], i) => {
    m.makeTranslation(x, y, z);
    mesh.setMatrixAt(i, m);
    col.set(BOX_COLORS[Math.floor(rand() * BOX_COLORS.length)]);
    mesh.setColorAt(i, col);
  });
  group.add(mesh);
}

function makeTruck(color) {
  const truck = new THREE.Group();
  const b = new Batch(25);
  b.box(2.5, 2.9, 3, color, 0, 2.4, -7);
  b.box(2.3, 1, 0.2, '#22303e', 0, 3, -8.55);
  b.box(2.4, 0.5, 13, '#2a2a2a', 0, 1.1, 0);
  b.box(2.55, 2.55, 12.1, BOX_COLORS[Math.floor(Math.abs(color.charCodeAt(2)) % BOX_COLORS.length)], 0, 2.7, 0.6);
  for (const z of [-7, -1, 3, 5.5]) {
    for (const s of [-1, 1]) b.cyl(0.5, 0.5, 0.35, '#141414', s * 1.2, 0.5, z, { rz: Math.PI / 2 });
  }
  truck.add(b.build(flatMaterial(), { castShadow: false, receiveShadow: false }));
  return truck;
}

export function createPort(scene, skyUniforms, lowQuality) {
  const group = new THREE.Group();
  scene.add(group);

  const { sea, uniforms: seaU } = createSea(skyUniforms);
  group.add(sea);

  // Nền cầu cảng
  const q = new Batch(26);
  q.box(QUAY_EDGE - QUAY_MIN, 6, 420, '#8d8a82', (QUAY_MIN + QUAY_EDGE) / 2, QUAY_Y - 3, 0, { jitter: 0.01 });
  q.box(1.2, 0.8, 420, '#3b3b3b', QUAY_EDGE - 0.6, QUAY_Y + 0.4, 0);
  q.box(8, 0.03, 420, '#4d4d4d', 66, QUAY_Y + 0.02, 0, { jitter: 0 }); // Đường xe đầu kéo
  for (let z = -200; z < 200; z += 12) q.box(0.3, 0.04, 5, '#e0dccb', 66, QUAY_Y + 0.03, z, { jitter: 0 });
  // Vạch vàng mép cầu cảng, nhà kho
  q.box(0.6, 0.03, 420, '#d9b53a', QUAY_EDGE - 4, QUAY_Y + 0.02, 0, { jitter: 0 });
  for (const [z, w] of [[-165, 38], [160, 44]]) {
    q.box(24, 12, w, '#9aa0a6', 90, QUAY_Y + 6, z);
    q.box(25, 1.4, w + 1, '#a8432a', 90, QUAY_Y + 12.6, z);
  }
  group.add(q.build(flatMaterial(), { castShadow: false, receiveShadow: false }));

  const ship = makeShip(group);
  buildBoxes(group, ship, lowQuality);

  const sts1 = makeStsCrane('#b5392b');
  sts1.crane.position.set(QUAY_EDGE - 12, QUAY_Y, -28);
  const sts2 = makeStsCrane('#2f6d9e');
  sts2.crane.position.set(QUAY_EDGE - 12, QUAY_Y, 44);
  const harbor = makeHarborCrane();
  harbor.crane.position.set(QUAY_EDGE - 22, QUAY_Y, -92);
  group.add(sts1.crane, sts2.crane, harbor.crane);

  const trucks = [makeTruck('#c0392b'), makeTruck('#2f6d9e')];
  trucks.forEach((t) => {
    t.position.set(66, QUAY_Y, 0);
    group.add(t);
  });

  // Đèn nhấp nháy và đèn cao áp: Points sáng, tốn rất ít.
  const blink = [
    [SHIP_X, 8, -72], [SHIP_X, 16, 90], [QUAY_EDGE - 12, 34, -28], [QUAY_EDGE - 12, 34, 44],
    [QUAY_EDGE + 50, 22, -28], [QUAY_EDGE + 50, 22, 44],
  ];
  const makePts = (list, size, color) => {
    const arr = new Float32Array(list.flat());
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({
      color, size, map: glowTexture(64), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false,
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    group.add(pts);
    return mat;
  };
  const blinkMat = makePts(blink, 11, 0xff3322);
  const floods = [];
  for (let z = -120; z <= 120; z += 40) floods.push([92, QUAY_Y + 26, z]);
  floods.push([SHIP_X, 12, -60], [SHIP_X - 14, 2, 0], [SHIP_X + 14, 2, 40]);
  const floodMat = makePts(floods, 13, 0xffdca8);
  // Cột đèn cao áp trong bãi
  const poles = new Batch(27);
  for (let z = -120; z <= 120; z += 40) poles.box(0.6, 26, 0.6, '#55585c', 92, QUAY_Y + 13, z);
  group.add(poles.build(flatMaterial(), { castShadow: false, receiveShadow: false }));

  const animSts = (s, t, phase) => {
    // Xe con chạy ra tàu, hạ hàng, quay về.
    const p = ((t + phase) % 56) / 56;
    let x;
    let lower;
    let hasLoad;
    if (p < 0.3) {
      x = -4 + 44 * (p / 0.3);
      lower = 0.12;
      hasLoad = true;
    } else if (p < 0.5) {
      x = 40;
      lower = 0.12 + 0.75 * Math.sin(((p - 0.3) / 0.2) * Math.PI);
      hasLoad = p < 0.4;
    } else if (p < 0.8) {
      x = 40 - 44 * ((p - 0.5) / 0.3);
      lower = 0.12;
      hasLoad = false;
    } else {
      x = -4;
      lower = 0.12 + 0.75 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
      hasLoad = p > 0.9;
    }
    s.trolley.position.x = x;
    const drop = lower * 34;
    s.cable.scale.y = Math.max(0.1, drop);
    s.cable.position.y = -drop / 2;
    s.load.position.y = -drop - 1.4;
    s.load.visible = hasLoad;
  };

  return {
    group,
    update(now, night) {
      const t = now / 1000;
      seaU.time.value = t % 3600;
      seaU.color.value.set('#2a6277').lerp(_nightSea, night);
      seaU.fogColor.value.copy(scene.fog.color);
      animSts(sts1, t, 0);
      animSts(sts2, t, 21);
      harbor.swing.rotation.y = -0.6 + Math.sin(t * 0.09) * 1.05;
      // Xe đầu kéo chạy ngang rồi nghỉ, dùng giờ server nên mọi máy thấy giống nhau.
      trucks.forEach((truck, i) => {
        const period = 62 + i * 13;
        const p = ((t + i * 37) % period) / period;
        const travel = 400;
        const dir = i % 2 === 0 ? 1 : -1;
        truck.position.z = dir * (p * travel - travel / 2);
        truck.position.x = i % 2 === 0 ? 64.3 : 67.7;
        truck.rotation.y = dir > 0 ? Math.PI : 0;
        truck.visible = p < 0.8;
        if (!truck.visible) truck.position.z = 9999;
      });
      blinkMat.opacity = Math.sin(t * 3) > 0.25 ? 0.95 : 0.1;
      floodMat.opacity = Math.max(0, night - 0.25) * 1.25;
    },
  };
}

const _nightSea = new THREE.Color('#0c1c34');
