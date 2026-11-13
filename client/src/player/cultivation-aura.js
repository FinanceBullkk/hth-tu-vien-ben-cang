import * as THREE from 'three';
import { cultivation } from '../../../shared/cultivation.js';
import { groundVertex, groundFragment, ribbonVertex, ribbonFragment } from './cultivation-aura-shaders.js';
import { createManifestation } from './cultivation-manifestation.js';

const PALETTES = [
  ['#a4d8c7', '#ffe6ac'], ['#f4ca73', '#fff0c8'], ['#6db8f2', '#e6e0ff'],
  ['#a9bfff', '#fff1bb'], ['#ff6f62', '#ffe4c4'], ['#ee9cbb', '#ffdfca'],
  ['#73cfa0', '#e8f4bc'], ['#c6daf5', '#fff4d9'], ['#ae83d0', '#e8bbef'],
  ['#ff693b', '#ffe6a1'],
];
PALETTES[10] = ['#ff4a2e', '#ffcf7a']; // Xích Diễm: đỏ son, viền vàng kim.
PALETTES[12] = ['#5fd6c4', '#e9fff9']; // Kiếm Vũ; 11 chưa có bảng riêng nên vẫn rơi về 0.

const groundGeometry = new THREE.PlaneGeometry(2.8, 2.8);
groundGeometry.rotateX(-Math.PI / 2);
// Immutable silk-strip geometry is shared between avatars.
const ribbonGeometry = new THREE.PlaneGeometry(1, 1, 72, 1);
const strip = ribbonGeometry.attributes.position;
const uv = ribbonGeometry.attributes.uv;
for (let i = 0; i < strip.count; i++) {
  const u = uv.getX(i), a = u * Math.PI * 1.6;
  const radius = 0.72 + Math.sin(a * 1.5) * 0.04;
  strip.setXYZ(i, Math.cos(a) * radius, 0.12 + Math.sin(u * Math.PI) * 0.22 + (uv.getY(i) - 0.5) * 0.15, Math.sin(a) * radius);
}
ribbonGeometry.computeBoundingSphere();
const dustPixels = new Uint8Array(16 * 16 * 4);
for (let i = 0; i < 256; i++) {
  const r = Math.hypot((i % 16 - 7.5) / 7.5, (Math.floor(i / 16) - 7.5) / 7.5);
  dustPixels.set([255, 255, 255, Math.round(255 * Math.max(0, 1 - r) ** 2)], i * 4);
}
const dustTexture = new THREE.DataTexture(dustPixels, 16, 16);
dustTexture.needsUpdate = true;
export class CultivationAura {
  constructor(lowQuality = false, effect = 0) {
    this.group = new THREE.Group();
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.count = lowQuality ? 12 : 24;
    this.uniforms = {
      tint: { value: new THREE.Color() }, accent: { value: new THREE.Color() }, theme: { value: 0 }, time: { value: 0 }, level: { value: 1 },
      seated: { value: 0 }, opacity: { value: 0.6 }, burst: { value: 0 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: groundVertex, fragmentShader: groundFragment,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    this.ground = new THREE.Mesh(groundGeometry, this.material);
    this.ground.position.y = 0.035;
    this.group.add(this.ground);
    this.positions = new Float32Array(this.count * 3);
    this.dustGeometry = new THREE.BufferGeometry();
    this.dustGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.dustMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, map: dustTexture, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
    this.dust = new THREE.Points(this.dustGeometry, this.dustMaterial);
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
    this.ribbonUniforms = { tint: this.uniforms.tint, accent: this.uniforms.accent, time: this.uniforms.time, opacity: { value: 0.5 } };
    this.ribbonMaterial = new THREE.ShaderMaterial({ uniforms: this.ribbonUniforms, vertexShader: ribbonVertex, fragmentShader: ribbonFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    this.ribbon = new THREE.Mesh(ribbonGeometry, this.ribbonMaterial);
    this.group.add(this.ribbon);
    this.secondRibbon = new THREE.Mesh(ribbonGeometry, this.ribbonMaterial);
    this.group.add(this.secondRibbon);
    this.lowQuality = lowQuality;
    this.setEffect(effect);
    this.time = 0;
    this.burst = 0;
    this.setQi(0);
  }

  setEffect(effect) {
    this.effect = Number.isInteger(effect) && PALETTES[effect] ? effect : 0;
    const [tint, accent] = PALETTES[this.effect];
    this.uniforms.tint.value.set(tint);
    this.uniforms.accent.value.set(accent);
    this.uniforms.theme.value = this.effect === 9 ? 2 : this.effect;
    this.dustMaterial.color.set(accent);
    this.manifestation?.dispose();
    this.manifestation = createManifestation(this.effect === 9 ? 2 : this.effect, this.uniforms.tint.value, this.uniforms.accent.value, this.lowQuality);
    this.group.add(this.manifestation.group);
  }

  setQi(qi) {
    const next = cultivation(qi);
    if (this.state && next.level > this.state.level && !this.motion.matches) this.burst = 1;
    this.state = next;
    this.uniforms.level.value = next.level;
  }

  update(dt, sit, distance, fading = 1) {
    const c = this.state;
    this.group.visible = distance < 30 && (c.qi > 0 || sit > 0.01) && fading > 0;
    if (!this.group.visible) return;
    const reduced = this.motion.matches;
    if (!reduced) this.time += dt;
    const t = reduced ? 0 : this.time;
    this.burst = Math.max(0, this.burst - dt / 1.8);
    this.uniforms.time.value = t;
    this.uniforms.seated.value = sit;
    this.uniforms.burst.value = reduced ? 0 : this.burst * sit;
    this.uniforms.opacity.value = (0.25 + sit * 0.65) * fading;
    const size = c.scale * (0.52 + sit * (0.6 + 0.07 * c.level));
    const groundSize = Math.min(size, 1.15);
    this.ground.scale.set(groundSize, 1, groundSize);
    this.manifestation.update(c.level, sit, t, fading);
    this.dust.visible = sit > 0.1;
    const count = Math.round(this.count * (0.2 + 0.16 * c.level));
    this.dustGeometry.setDrawRange(0, count);
    this.ribbon.visible = sit > 0.1;
    this.secondRibbon.visible = c.level >= 2 && sit > 0.1 && !this.lowQuality;
    if (this.dust.visible) {
      for (let i = 0; i < count; i++) {
        const phase = (i / count + t * 0.14) % 1;
        const angle = i * 2.4 + t * 0.3;
        const r = (1 - phase) * size * 0.9 + 0.12;
        this.positions[i * 3] = Math.cos(angle) * r;
        this.positions[i * 3 + 1] = 0.1 + Math.sin(phase * Math.PI * 0.5) * (0.25 + c.level * 0.13);
        this.positions[i * 3 + 2] = Math.sin(angle) * r;
      }
      this.dustGeometry.attributes.position.needsUpdate = true;
      this.dustMaterial.size = 0.07 + c.level * 0.009;
      this.dustMaterial.opacity = (0.45 + 0.12 * Math.sin(t * 0.8)) * sit * fading;
    }
    if (this.ribbon.visible) {
      this.ribbon.scale.set(size, 0.55 + c.level * 0.18, size);
      this.ribbon.rotation.y = -t * 0.24;
      this.secondRibbon.scale.set(size * 0.92, 0.8 + c.level * 0.16, size * 0.92);
      this.secondRibbon.rotation.y = t * 0.19 + Math.PI;
      this.secondRibbon.position.y = 0.11;
      this.ribbonUniforms.opacity.value = (0.65 + c.level * 0.06) * sit * fading;
    }
  }

  dispose() {
    this.manifestation.dispose();
    this.group.removeFromParent();
    this.material.dispose();
    this.dustGeometry.dispose();
    this.dustMaterial.dispose();
    this.ribbonMaterial.dispose();
  }
}
