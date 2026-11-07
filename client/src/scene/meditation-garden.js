// Hoa sen và nhịp sáng ở từng chiếu; mọi máy dựng từ cùng mốc giờ server.
import * as THREE from 'three';
import { MATS, floorHeight } from '../../../shared/layout.js';
import { BREATH } from '../../../shared/protocol.js';
import { RHYTHM } from '../../../shared/rhythm.js';

export class MeditationGarden {
  constructor(scene) {
    this.state = { epoch: 0, seats: [] };
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const petalGeo = new THREE.SphereGeometry(1, 10, 6);
    const petalMat = new THREE.MeshBasicMaterial({ color: 0xf5b6c9, transparent: true, opacity: 0.65, depthWrite: false });
    this.lightMat = new THREE.MeshBasicMaterial({ color: 0xf8d799, transparent: true, opacity: 0.5, depthWrite: false });
    const ringGeo = new THREE.RingGeometry(0.73, 0.75, 40);
    const centerGeo = new THREE.SphereGeometry(0.13, 10, 6);
    this.flowers = MATS.map((mat) => {
      const root = new THREE.Group();
      root.position.set(mat.x, floorHeight(mat.x, mat.z) + 0.08, mat.z);
      const ring = new THREE.Mesh(ringGeo, this.lightMat);
      ring.rotation.x = -Math.PI / 2;
      root.add(ring);
      // Lotus nằm trước nhân vật, không xuyên qua thân đang ngồi.
      const flower = new THREE.Group();
      flower.position.set(Math.sin(mat.rot) * 0.8 + Math.cos(mat.rot) * 0.65, 0.07, Math.cos(mat.rot) * 0.8 - Math.sin(mat.rot) * 0.65);
      const petals = Array.from({ length: BREATH.cycles }, (_, i) => {
        const angle = i * Math.PI * 2 / BREATH.cycles;
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.position.set(Math.sin(angle) * 0.22, 0.05, Math.cos(angle) * 0.22);
        petal.rotation.y = angle;
        flower.add(petal);
        return petal;
      });
      flower.add(new THREE.Mesh(centerGeo, this.lightMat));
      root.add(flower);
      root.visible = false;
      scene.add(root);
      return { root, ring, petals };
    });

    this.links = new Float32Array(MATS.length * 6);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.links, 3));
    this.linkMat = new THREE.LineBasicMaterial({ color: 0xf3d39f, transparent: true, opacity: 0.4, depthWrite: false });
    this.lines = new THREE.LineSegments(geometry, this.linkMat);
    this.lines.frustumCulled = false;
    scene.add(this.lines);

    this.dustPositions = new Float32Array(MATS.length * 10 * 3);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const ctx = sprite.getContext('2d');
    const glow = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    glow.addColorStop(0, '#fff');
    glow.addColorStop(0.25, 'rgba(255,255,255,.8)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 32, 32);
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(sprite), color: 0xffe3a8, size: 0.14, transparent: true, opacity: 0.8, depthWrite: false }));
    this.dust.frustumCulled = false;
    scene.add(this.dust);
  }

  apply(state) { this.state = state; }

  bloom({ mat, bloom, pulseAt }) {
    const seat = this.state.seats.find((s) => s.mat === mat);
    if (seat) Object.assign(seat, { bloom, pulseAt });
  }

  update(now) {
    const { seats } = this.state;
    const phase = (now % RHYTHM.beatMs) / RHYTHM.beatMs;
    const breath = this.reducedMotion ? 0.65 : (1 + Math.cos(phase * Math.PI * 2)) * 0.5;
    this.lightMat.opacity = 0.3 + breath * 0.35;
    this.linkMat.opacity = 0.16 + breath * 0.28;
    this.flowers.forEach(({ root }) => { root.visible = false; });
    let dustCount = 0;
    seats.forEach(({ mat, bloom = 0, pulseAt = 0 }) => {
      const { root, ring, petals } = this.flowers[mat];
      root.visible = true;
      ring.scale.setScalar(0.82 + breath * 0.25 + Math.max(0, 1 - (now - pulseAt) / 600) * 0.2);
      const progress = Math.max(0, Math.min(BREATH.cycles, bloom));
      petals.forEach((petal, i) => {
        const open = Math.max(0, Math.min(1, progress - i));
        petal.scale.set(0.10 + open * 0.08, 0.09 - open * 0.035, 0.12 + open * 0.32);
        petal.visible = progress > i;
      });
      for (let i = 0; i < 10; i++) {
        const t = this.reducedMotion ? i * 0.628 : now / 6000 + i * 0.628;
        const radius = 0.5 + breath * 0.28;
        this.dustPositions[dustCount++] = root.position.x + Math.sin(t) * radius;
        this.dustPositions[dustCount++] = root.position.y + 0.3 + (i / 10) * 1.3;
        this.dustPositions[dustCount++] = root.position.z + Math.cos(t) * radius;
      }
    });
    this.dust.geometry.setDrawRange(0, dustCount / 3);
    this.dust.geometry.attributes.position.needsUpdate = true;
    let linkCount = 0;
    if (seats.length > 1) {
      seats.forEach(({ mat }, i) => {
        // Hai chiếu chỉ cần một đường nối; ba chiếu trở lên khép thành vòng.
        if (seats.length === 2 && i === 1) return;
        for (const index of [mat, seats[(i + 1) % seats.length].mat]) {
          const p = this.flowers[index].root.position;
          this.links[linkCount++] = p.x;
          this.links[linkCount++] = p.y + 0.025;
          this.links[linkCount++] = p.z;
        }
      });
    }
    this.lines.geometry.setDrawRange(0, linkCount / 3);
    this.lines.geometry.attributes.position.needsUpdate = true;
  }
}
