// Ghép toàn bộ cảnh và điều phối cập nhật mỗi khung: trời, cảng, hạt, con vật, chuông.
import * as THREE from 'three';
import { Abbot } from './abbot.js';
import { Animals } from './animals.js';
import { createMonastery } from './monastery.js';
import { Particles } from './particles.js';
import { createPort } from './port.js';
import { DayNight } from './sky.js';
import { createForest, createTerrain } from './terrain.js';
import { Wishes3D } from './wishes3d.js';

export class World {
  constructor(scene, lowQuality) {
    this.scene = scene;
    this.sky = new DayNight(scene);
    this.sky.setShadowSize(lowQuality ? 1024 : 2048);
    scene.add(createTerrain(lowQuality));
    scene.add(createForest(lowQuality));
    this.monastery = createMonastery(scene);
    this.port = createPort(scene, this.sky.uniforms, lowQuality);
    this.particles = new Particles(scene, this.monastery.lanterns.positions, this.monastery.hall.candles, lowQuality);
    this.animals = new Animals(scene, lowQuality);
    this.abbot = new Abbot(scene);
    this.wishes = new Wishes3D(scene);

    this.bellSwing = 0;
    this.bellFlash = 0;
    this.logSwing = 0;
    this.lanternBoost = 0;
    this.time = 0;
    this.dayCycleMs = 20 * 60_000;
  }

  /** Hiệu ứng thân chuông khi có người thỉnh. strength 0..1. */
  ringBell(strength) {
    this.bellSwing = Math.max(this.bellSwing, 0.03 + strength * 0.05);
    this.logSwing = 0.75;
    this.bellFlash = Math.max(this.bellFlash, 0.25 + strength * 0.55);
    this.particles.bellWave(strength);
  }

  /** Kết quả sự kiện chuông: đèn sáng bừng, cánh hoa rơi nhiều. */
  celebrate(intensity) {
    this.lanternBoost = Math.max(this.lanternBoost, 0.5 + intensity * 1.5);
    this.particles.burstPetals(0.35 + intensity * 0.65);
    this.ringBell(1);
  }

  update(dt, nowMs) {
    this.time += dt;
    this.sky.update(nowMs, this.dayCycleMs);
    const night = this.sky.night;
    this.port.update(nowMs, night);
    this.animals.update(nowMs, night);
    this.wishes.update(dt, nowMs);

    this.lanternBoost = Math.max(0, this.lanternBoost - dt * 0.12);
    const flick = 0.94 + Math.sin(this.time * 9.1) * 0.04 + Math.sin(this.time * 17.3) * 0.02;
    const { lanterns, emissiveMat, hall, bell } = this.monastery;
    lanterns.mat.emissiveIntensity = (0.28 + night * 1.5 + this.lanternBoost) * flick;
    emissiveMat.color.setScalar(0.55 + night * 0.6);
    hall.hallLight.intensity = (22 + night * 22) * flick;
    this.particles.update(dt, night, this.lanternBoost);

    // Chuông đung đưa rồi lặng dần; khúc gỗ thúc vào rồi trở về.
    this.bellSwing *= Math.exp(-dt * 0.7);
    bell.bellGroup.rotation.z = Math.sin(this.time * 3.3) * this.bellSwing;
    this.bellFlash *= Math.exp(-dt * 1.2);
    bell.bellMat.emissiveIntensity = this.bellFlash;
    this.logSwing *= Math.exp(-dt * 1.3);
    bell.log.rotation.z = -Math.abs(Math.sin(this.time * 2.4)) * this.logSwing * 0.35;
  }
}

export function createRenderer(canvas, lowQuality) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !lowQuality,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowQuality ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}
