// Linh khí nội viện: trận pháp bát quái phát sáng trên sân đạo trường (xoay chậm, rực hơn khi đêm xuống)
// và đốm linh khí xanh ngọc bốc lên quanh đài đại điện. Chỉ là hình ảnh, không chặn đường đi.
import * as THREE from 'three';
import { HALL, TERRACE } from '../../../shared/layout.js';
import { glowTexture, rng } from './builders.js';

// Trận pháp nằm giữa sân đạo trường: từ chân bậc đại điện tới đầu sân phía nam.
const COURT_END_Z = -3;
export const FORMATION = { x: HALL.x, z: (TERRACE.stairFootZ + COURT_END_Z) / 2, radius: 6.2 };

// Quẻ bát quái (dưới lên trên), 1 là hào liền, 0 là hào đứt.
const TRIGRAMS = [[1, 1, 1], [0, 1, 1], [1, 0, 1], [0, 0, 1], [1, 1, 0], [0, 1, 0], [1, 0, 0], [0, 0, 0]];

/** Vẽ trận pháp lên canvas: các vòng tròn, vạch chia, tám quẻ, vòng phù văn và thái cực ở giữa. */
function formationTexture() {
  const size = 1024;
  const c = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = ctx.fillStyle = '#fff';
  ctx.lineCap = 'round';
  const ring = (r, w) => {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  ring(500, 10); ring(470, 4); ring(350, 6); ring(330, 3); ring(170, 6);
  const rand = rng(88);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const r0 = 478;
    const len = 8 + rand() * 16;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
    ctx.lineTo(c + Math.cos(a) * (r0 - len), c + Math.sin(a) * (r0 - len));
    ctx.stroke();
  }
  TRIGRAMS.forEach((lines, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(c + Math.cos(a) * 410, c + Math.sin(a) * 410);
    ctx.rotate(a + Math.PI / 2);
    lines.forEach((solid, k) => {
      const y = 30 - k * 30;
      if (solid) ctx.fillRect(-56, y - 8, 112, 16);
      else {
        ctx.fillRect(-56, y - 8, 46, 16);
        ctx.fillRect(10, y - 8, 46, 16);
      }
    });
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a + Math.PI / 8) * 170, c + Math.sin(a + Math.PI / 8) * 170);
    ctx.lineTo(c + Math.cos(a + Math.PI / 8) * 350, c + Math.sin(a + Math.PI / 8) * 350);
    ctx.stroke();
  });
  // Thái cực: nửa đặc nửa rỗng, hai chấm ngược màu.
  ctx.beginPath();
  ctx.arc(c, c, 120, -Math.PI / 2, Math.PI / 2);
  ctx.arc(c, c + 60, 60, Math.PI / 2, -Math.PI / 2, true);
  ctx.arc(c, c - 60, 60, Math.PI / 2, -Math.PI / 2);
  ctx.fill();
  ring(120, 6);
  // Chấm đặc trong nửa rỗng (dưới), khoét chấm rỗng trong nửa đặc (trên).
  ctx.beginPath();
  ctx.arc(c, c + 60, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(c, c - 60, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class SpiritFormation {
  constructor(scene, lowQuality) {
    this.time = 0;
    this.circleMat = new THREE.MeshBasicMaterial({
      map: formationTexture(), color: 0x8ff0d0, transparent: true, opacity: 0.3,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    this.circle = new THREE.Mesh(new THREE.CircleGeometry(FORMATION.radius, 64), this.circleMat);
    this.circle.rotation.x = -Math.PI / 2;
    this.circle.position.set(FORMATION.x, 0.06, FORMATION.z);
    scene.add(this.circle);

    // Đốm linh khí: bốc lên từ đài đại điện và trận pháp, lượn nhẹ rồi tan ở trên cao.
    this.count = lowQuality ? 36 : 80;
    this.rand = rng(1717);
    this.pos = new Float32Array(this.count * 3);
    this.speed = new Float32Array(this.count);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.moteMat = new THREE.PointsMaterial({
      map: glowTexture(64), color: 0x9ff5d6, size: 0.55, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.motes = new THREE.Points(geo, this.moteMat);
    this.motes.frustumCulled = false;
    scene.add(this.motes);
    for (let i = 0; i < this.count; i++) this.#reset(i, true);
  }

  #reset(i, anywhere) {
    const r = this.rand;
    const fromCircle = i % 3 === 0;
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const x = fromCircle ? FORMATION.x + Math.cos(a) * d * FORMATION.radius : HALL.x + (r() - 0.5) * TERRACE.halfW * 2.4;
    const z = fromCircle ? FORMATION.z + Math.sin(a) * d * FORMATION.radius : TERRACE.backZ + r() * (TERRACE.frontZ - TERRACE.backZ + 4);
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = anywhere ? r() * 12 : (fromCircle ? 0.1 : TERRACE.y);
    this.pos[i * 3 + 2] = z;
    this.speed[i] = 0.35 + r() * 0.6;
  }

  update(dt, night) {
    this.time += dt;
    this.circle.rotation.z += dt * 0.05;
    this.circleMat.opacity = 0.22 + night * 0.55 + Math.sin(this.time * 1.4) * 0.04;
    this.moteMat.opacity = 0.35 + night * 0.55;
    for (let i = 0; i < this.count; i++) {
      const k = i * 3;
      this.pos[k + 1] += this.speed[i] * dt;
      this.pos[k] += Math.sin(this.time * 0.8 + i) * dt * 0.15;
      if (this.pos[k + 1] > 13) this.#reset(i, false);
    }
    this.motes.geometry.attributes.position.needsUpdate = true;
  }
}
