// Ghép toàn bộ cảnh và điều phối cập nhật mỗi khung: trời, cảng, hạt, con vật, rồng phượng, chuông.
import * as THREE from 'three';
import { Abbot } from './abbot.js';
import { Animals } from './animals.js';
import { Celestial } from './celestial.js';
import { FishingScene } from './fishing.js';
import { GateMonk } from './gate-monk.js';
import { createMonastery } from './monastery.js';
import { Particles } from './particles.js';
import { PitchPotCourt } from './pitch-pot-court.js';
import { createPort } from './port.js';
import { DayNight } from './sky.js';
import { createForest, createTerrain } from './terrain.js';
import { Wishes3D } from './wishes3d.js';
import { MeditationGarden } from './meditation-garden.js';
import { createWuxiaProps } from './wuxia-props.js';
import { ShadowPacer, renderPixelRatio } from './render-quality.js';

import { createMelodyStage } from './melody-stage.js';

export class World {
  constructor(scene, lowQuality) {
    this.scene = scene;
    this.sky = new DayNight(scene);
    this.sky.setShadowSize(lowQuality ? 1024 : 2048);
    // Shadows need less frequent updates than camera/player movement.
    this.sky.sun.shadow.autoUpdate = false;
    this.shadowPacer = new ShadowPacer();
    this.shadowBusy = false; // main.js bật khi có người đang đi lại.
    scene.add(createTerrain(lowQuality));
    scene.add(createForest(lowQuality));
    this.monastery = createMonastery(scene);
    this.port = createPort(scene, this.sky.uniforms, lowQuality);
    this.particles = new Particles(scene, this.monastery.lanterns.positions, this.monastery.hall.candles, lowQuality);
    this.animals = new Animals(scene, lowQuality);
    this.celestial = new Celestial(scene, lowQuality);
    this.abbot = new Abbot(scene);
    this.monk = new GateMonk(scene);
    this.wishes = new Wishes3D(scene);
    // Dải lụa thắt lên cành xong thì cánh hoa rơi nhẹ một nhịp.
    this.wishes.onLand = (amount) => this.particles.burstPetals(amount);
    this.meditation = new MeditationGarden(scene);
    this.wuxia = createWuxiaProps(scene);
    this.pitchCourt = new PitchPotCourt(scene);
    this.fishing = new FishingScene(scene);
    this.melodyStage = createMelodyStage(scene);
    this.bellPull = 0;

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

  /** Kết quả sự kiện chuông: đèn sáng bừng, cánh hoa rơi nhiều, rồng phượng lượn sát. */
  celebrate(intensity) {
    this.lanternBoost = Math.max(this.lanternBoost, 0.5 + intensity * 1.5);
    this.particles.burstPetals(0.35 + intensity * 0.65);
    this.celestial.flourish(intensity);
    this.ringBell(1);
  }

  update(dt, nowMs) {
    this.time += dt;
    if (this.shadowPacer.update(dt, this.shadowBusy || this.bellSwing > 0.002)) this.sky.sun.shadow.needsUpdate = true;
    this.sky.update(nowMs, this.dayCycleMs);
    const night = this.sky.night;
    this.port.update(nowMs, night);
    this.animals.update(nowMs, night);
    this.celestial.update(dt, nowMs, night);
    this.wishes.update(dt, nowMs, night);
    this.meditation.update(nowMs);
    this.wuxia.update(dt, night);
    this.fishing.update(dt, nowMs);

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
    bell.log.rotation.z = this.bellPull * 0.5 - Math.abs(Math.sin(this.time * 2.4)) * this.logSwing * 0.35;
  }
}

export function createRenderer(canvas, lowQuality) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // Máy bàn vẽ qua composer nên MSAA trên canvas không làm mịn được gì; mobile thì tiết kiệm.
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(renderPixelRatio(window.innerWidth, window.innerHeight, window.devicePixelRatio, 2, lowQuality));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}
