// Hiệu ứng hạt: cánh hoa, đom đóm, khói, quầng đèn, sóng âm chuông. Dùng pool, không cấp phát mỗi khung.
import * as THREE from 'three';
import { BELL, GARDEN, HALL, POND, TREE } from '../../../shared/layout.js';
import { glowTexture, rng } from './builders.js';

function makePoints(count, material) {
  const pos = new Float32Array(count * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  const pts = new THREE.Points(g, material);
  pts.frustumCulled = false;
  return { pts, pos, attr: g.attributes.position, geo: g };
}

export class Particles {
  constructor(scene, lanternPositions, candlePositions, lowQuality) {
    this.scene = scene;
    this.time = 0;
    const scale = lowQuality ? 0.5 : 1;
    const glow = glowTexture(64);
    const rand = rng(4242);
    this.rand = rand;

    // Cánh hoa rơi
    const petalTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const x = c.getContext('2d');
      x.fillStyle = '#ffb3c6';
      x.beginPath();
      x.ellipse(16, 16, 13, 7, 0.6, 0, Math.PI * 2);
      x.fill();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    this.petalMax = Math.floor(320 * scale);
    this.petals = makePoints(this.petalMax, new THREE.PointsMaterial({ size: 0.26, map: petalTex, transparent: true, alphaTest: 0.2, depthWrite: false }));
    this.petalSeed = new Float32Array(this.petalMax);
    for (let i = 0; i < this.petalMax; i++) {
      this.petalSeed[i] = rand() * 100;
      this.#resetPetal(i, true);
    }
    this.petalRate = 0.28;
    this.petalBoost = 0;
    scene.add(this.petals.pts);

    // Đom đóm quanh hồ, cây, vườn
    this.fireMax = Math.floor(70 * scale);
    this.fire = makePoints(this.fireMax, new THREE.PointsMaterial({
      color: 0xd8ff7a, size: 0.2, map: glow, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.fireBase = new Float32Array(this.fireMax * 4);
    for (let i = 0; i < this.fireMax; i++) {
      const anchor = i % 3 === 0 ? POND : i % 3 === 1 ? TREE : { x: (GARDEN.minX + GARDEN.maxX) / 2, z: (GARDEN.minZ + GARDEN.maxZ) / 2 };
      const a = rand() * 6.28;
      const d = 2 + rand() * 9;
      this.fireBase[i * 4] = anchor.x + Math.sin(a) * d;
      this.fireBase[i * 4 + 1] = 0.5 + rand() * 2.4;
      this.fireBase[i * 4 + 2] = anchor.z + Math.cos(a) * d;
      this.fireBase[i * 4 + 3] = rand() * 100;
    }
    scene.add(this.fire.pts);

    // Khói trầm nhẹ quanh thiền đường
    this.smokeMax = Math.floor(30 * scale);
    this.smoke = makePoints(this.smokeMax, new THREE.PointsMaterial({
      color: 0xe6dccb, size: 1.5, map: glow, transparent: true, opacity: 0.1, depthWrite: false,
    }));
    this.smokeBase = new Float32Array(this.smokeMax * 4);
    for (let i = 0; i < this.smokeMax; i++) {
      const s = i % 2 ? -1 : 1;
      this.smokeBase[i * 4] = HALL.x + s * (3 + rand() * 6);
      this.smokeBase[i * 4 + 1] = HALL.z + HALL.halfD + 0.9 + rand() * 2.4;
      this.smokeBase[i * 4 + 2] = rand() * 100;
      this.smokeBase[i * 4 + 3] = 0.25 + rand() * 0.25;
    }
    scene.add(this.smoke.pts);

    // Quầng sáng đèn lồng và nến
    const lamps = [...lanternPositions];
    const glowPts = makePoints(lamps.length, new THREE.PointsMaterial({
      color: 0xff8a3c, size: 2.1, map: glow, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    lamps.forEach(([x, y, z], i) => glowPts.pos.set([x, y, z], i * 3));
    glowPts.attr.needsUpdate = true;
    this.lampGlow = glowPts;
    scene.add(glowPts.pts);

    const candle = makePoints(candlePositions.length, new THREE.PointsMaterial({
      color: 0xffc56a, size: 0.8, map: glow, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    candlePositions.forEach(([x, y, z], i) => candle.pos.set([x, y, z], i * 3));
    candle.attr.needsUpdate = true;
    this.candleGlow = candle;
    scene.add(candle.pts);

    // Sóng âm chuông: vòng lan trên mặt sân
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.92, 1, 56);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color: 0xffd488, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      }));
      mesh.position.set(BELL.x, 0.14, BELL.z);
      mesh.visible = false;
      scene.add(mesh);
      this.rings.push({ mesh, age: 0, life: 0, size: 0 });
    }
  }

  #resetPetal(i, anywhere) {
    const r = this.rand;
    let x;
    let z;
    if (r() < 0.55) {
      const a = r() * 6.28;
      const d = r() * 9;
      x = TREE.x + Math.sin(a) * d;
      z = TREE.z + Math.cos(a) * d;
    } else {
      x = -30 + r() * 60;
      z = -30 + r() * 62;
    }
    const y = anywhere ? r() * 9 : 8 + r() * 2.5;
    this.petals.pos[i * 3] = x;
    this.petals.pos[i * 3 + 1] = y;
    this.petals.pos[i * 3 + 2] = z;
  }

  /** Sóng âm lan từ gác chuông; strength 0..1 quyết định kích thước. */
  bellWave(strength) {
    const n = 1 + Math.round(strength * 2);
    for (let k = 0; k < n; k++) {
      const ring = this.rings.find((r) => r.life <= r.age);
      if (!ring) return;
      ring.age = -k * 0.3;
      ring.life = 2.2 + strength * 1.4;
      ring.size = 12 + strength * 34;
      ring.mesh.visible = true;
    }
  }

  /** Mưa cánh hoa khi sự kiện chuông kết thúc. */
  burstPetals(amount) {
    this.petalBoost = Math.max(this.petalBoost, amount);
  }

  update(dt, night, lanternBoost) {
    this.time += dt;
    const t = this.time;

    // Cánh hoa
    this.petalBoost = Math.max(0, this.petalBoost - dt * 0.09);
    const active = Math.floor(this.petalMax * Math.min(1, this.petalRate + this.petalBoost));
    this.petals.geo.setDrawRange(0, active);
    for (let i = 0; i < active; i++) {
      const s = this.petalSeed[i];
      const p = this.petals.pos;
      p[i * 3] += Math.sin(t * 0.9 + s) * dt * 0.5;
      p[i * 3 + 1] -= dt * (0.55 + (s % 1) * 0.3);
      p[i * 3 + 2] += Math.cos(t * 0.7 + s) * dt * 0.45;
      if (p[i * 3 + 1] < 0.05) this.#resetPetal(i, false);
    }
    this.petals.attr.needsUpdate = true;

    // Đom đóm chỉ thấy khi trời tối
    this.fire.pts.material.opacity = Math.max(0, (night - 0.35) * 1.5);
    this.fire.pts.visible = night > 0.36;
    if (this.fire.pts.visible) {
      for (let i = 0; i < this.fireMax; i++) {
        const s = this.fireBase[i * 4 + 3];
        this.fire.pos[i * 3] = this.fireBase[i * 4] + Math.sin(t * 0.3 + s) * 1.3;
        this.fire.pos[i * 3 + 1] = this.fireBase[i * 4 + 1] + Math.sin(t * 0.5 + s * 2) * 0.5;
        this.fire.pos[i * 3 + 2] = this.fireBase[i * 4 + 2] + Math.cos(t * 0.27 + s) * 1.3;
      }
      this.fire.attr.needsUpdate = true;
    }

    // Khói bốc lên, tuần hoàn theo thời gian
    for (let i = 0; i < this.smokeMax; i++) {
      const b = i * 4;
      const life = (t * this.smokeBase[b + 3] + this.smokeBase[b + 2]) % 7;
      this.smoke.pos[i * 3] = this.smokeBase[b] + Math.sin(life + i) * 0.4;
      this.smoke.pos[i * 3 + 1] = 0.3 + life * 0.75;
      this.smoke.pos[i * 3 + 2] = this.smokeBase[b + 1] + Math.cos(life * 0.7 + i) * 0.3;
    }
    this.smoke.attr.needsUpdate = true;

    // Đèn lồng lung linh, sáng dần khi tối
    const flicker = 0.93 + Math.sin(t * 7.3) * 0.04 + Math.sin(t * 13.1) * 0.03;
    this.lampGlow.pts.material.opacity = Math.min(1, (0.08 + night * 0.72 + lanternBoost * 0.5) * flicker);
    this.lampGlow.pts.material.size = 2.1 + lanternBoost * 2.2;
    this.candleGlow.pts.material.opacity = 0.75 * flicker;

    // Sóng âm
    for (const ring of this.rings) {
      if (ring.life <= ring.age) continue;
      ring.age += dt;
      const k = Math.max(0, ring.age / ring.life);
      if (ring.age >= ring.life) {
        ring.mesh.visible = false;
        ring.mesh.material.opacity = 0;
        continue;
      }
      const s = 2 + k * ring.size;
      ring.mesh.scale.set(s, 1, s);
      ring.mesh.material.opacity = ring.age < 0 ? 0 : (1 - k) * 0.65;
    }
  }
}
