import * as THREE from 'three';
import { cultivation } from '../../../shared/cultivation.js';

const groundGeometry = new THREE.PlaneGeometry(2.8, 2.8);
groundGeometry.rotateX(-Math.PI / 2);
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv * 2.0 - 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = `
  varying vec2 vUv;
  uniform vec3 tint;
  uniform float time, level, seated, opacity, burst;
  float ring(float r, float radius, float width) {
    return 1.0 - smoothstep(width, width + 0.012, abs(r - radius));
  }
  void main() {
    float r = length(vUv);
    float a = atan(vUv.y, vUv.x);
    float breath = 0.93 + 0.04 * sin(time * 1.05);
    float light = ring(r, 0.57 * breath, 0.006) * 0.55;
    light += exp(-r * r * 10.0) * 0.09;
    if (seated > 0.01) {
      float detail = 0.0;
      if (level >= 3.0) {
        detail += ring(r, 0.73, 0.004) * (0.35 + 0.35 * pow(abs(sin(a * 6.0 + time * 0.3)), 10.0));
        detail += ring(r, 0.42, 0.004) * (0.4 + 0.3 * pow(abs(sin(a * 5.0 - time * 0.4)), 8.0));
        float petal = 0.33 + 0.17 * pow(abs(cos(a * 4.0 + time * 0.025)), 1.5);
        detail += ring(r, petal, 0.009) * 0.55;
      }
      if (level >= 4.0) {
        float runes = pow(abs(cos(a * 12.0 - time * 0.15)), 18.0);
        detail += ring(r, 0.84, 0.026) * runes * 0.7;
        detail += ring(r, 0.9, 0.003) * 0.3;
      }
      if (level >= 5.0) {
        detail += ring(r, 0.64 + 0.05 * cos(a * 8.0), 0.004) * 0.55;
        float wave = fract(time * 0.12);
        detail += ring(r, 0.35 + wave * 0.63, 0.007) * (1.0 - wave) * 0.3;
      }
      light += detail * seated;
    }
    light += ring(r, 0.3 + (1.0 - burst) * 0.65, 0.018) * burst * 0.65;
    float alpha = min(0.7, light) * opacity;
    if (alpha < 0.003 || r > 0.98) discard;
    gl_FragColor = vec4(tint, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class CultivationAura {
  constructor(lowQuality = false) {
    this.group = new THREE.Group();
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.count = lowQuality ? 12 : 24;
    this.uniforms = {
      tint: { value: new THREE.Color() }, time: { value: 0 }, level: { value: 1 },
      seated: { value: 0 }, opacity: { value: 0.6 }, burst: { value: 0 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader, fragmentShader,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    this.ground = new THREE.Mesh(groundGeometry, this.material);
    this.ground.position.y = 0.035;
    this.group.add(this.ground);
    this.positions = new Float32Array(this.count * 3);
    this.dustGeometry = new THREE.BufferGeometry();
    this.dustGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.dustMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.045, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
    this.dust = new THREE.Points(this.dustGeometry, this.dustMaterial);
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
    this.ribbonPositions = new Float32Array(64 * 3);
    this.ribbonGeometry = new THREE.BufferGeometry();
    this.ribbonGeometry.setAttribute('position', new THREE.BufferAttribute(this.ribbonPositions, 3));
    this.ribbonMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    this.ribbon = new THREE.Line(this.ribbonGeometry, this.ribbonMaterial);
    this.ribbon.frustumCulled = false;
    this.group.add(this.ribbon);
    this.time = 0;
    this.burst = 0;
    this.setQi(0);
  }

  setQi(qi) {
    const next = cultivation(qi);
    if (this.state && next.level > this.state.level && !this.motion.matches) this.burst = 1;
    this.state = next;
    this.uniforms.tint.value.set(next.color);
    this.uniforms.level.value = next.level;
    this.dustMaterial.color.set(next.color);
    this.ribbonMaterial.color.set(next.color);
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
    this.uniforms.burst.value = reduced ? 0 : this.burst;
    this.uniforms.opacity.value = (0.38 + sit * 0.45) * fading;
    const size = c.scale * (0.52 + sit * 0.48);
    this.ground.scale.set(size, 1, size);
    this.dust.visible = c.level >= 2 && sit > 0.1;
    this.ribbon.visible = c.level >= 4 && sit > 0.1;
    if (this.dust.visible) {
      for (let i = 0; i < this.count; i++) {
        const phase = (i / this.count + t * 0.09) % 1;
        const angle = i * 2.4 + t * 0.3;
        const r = (1 - phase) * size * 0.9 + 0.12;
        this.positions.set([Math.cos(angle) * r, 0.12 + phase * 0.85, Math.sin(angle) * r], i * 3);
      }
      this.dustGeometry.attributes.position.needsUpdate = true;
      this.dustMaterial.opacity = 0.65 * sit * fading;
    }
    if (this.ribbon.visible) {
      for (let i = 0; i < 64; i++) {
        const p = i / 63;
        const a = p * Math.PI * 5 - t * 0.5;
        const r = (0.28 + 0.16 * Math.sin(p * Math.PI)) * size;
        this.ribbonPositions.set([Math.cos(a) * r, 0.12 + p * 1.25, Math.sin(a) * r], i * 3);
      }
      this.ribbonGeometry.attributes.position.needsUpdate = true;
      this.ribbonMaterial.opacity = 0.3 * sit * fading;
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.material.dispose();
    this.dustGeometry.dispose();
    this.dustMaterial.dispose();
    this.ribbonGeometry.dispose();
    this.ribbonMaterial.dispose();
  }
}
