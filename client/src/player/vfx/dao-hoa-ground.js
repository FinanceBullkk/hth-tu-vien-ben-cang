import * as THREE from 'three';
import { canvasTexture } from './aura-canvas-kit.js';
import { petalPath } from './dao-hoa-canvas-motifs.js';
import { branchPoint } from './dao-hoa-geometry.js';
import { BRANCHES } from './dao-hoa-branches.js';
import { hash } from './aura-billboard-layer.js';

// Nền đất của Đào Hoa — không trận đồ, không vòng chữ, không mặt nước:
//  thảm cánh đào rải (màu thật, normal blend): dày ở chân cổng và gốc cành, thưa dần ra ngoài, mép tan;
//  bóng cành đổ (mực hồng gụ mờ) ngả về sau cổng, lay theo cành.
const TAU = Math.PI * 2;
const CARPET = { size: 3.6, x: 0, z: -0.35 }, SHADOW = { size: 4, x: 0.25, z: -1.35 };
// Bóng ngả về sau và hơi lệch phải như nắng chiếu chếch từ trước-trái.
const project = (p, o) => [(p.x + p.y * 0.12 - o.x) * 1024 / o.size, (p.z - p.y * 0.5 - o.z) * 1024 / o.size];

function carpetTexture() {
  return canvasTexture('dao-hoa-petal-carpet', 1024, ({ c }) => {
    const k = 1024 / CARPET.size, gate = (-0.62 - CARPET.z) * k;
    for (let i = 0; i < 300; i++) {
      // Ba vùng rải: dọc chân cổng, quanh gốc cành, rải mỏng khắp nơi.
      const mode = i % 4, u = hash(i * 3 + 1), v = hash(i * 3 + 2);
      let x, y;
      if (mode < 2) { x = (u * 2 - 1) * 1.35 * k; y = gate + (v - 0.5) * 0.7 * k; }
      else if (mode === 2) { const a = u * TAU, r = Math.sqrt(v) * 0.45 * k; x = -0.84 * k + Math.cos(a) * r; y = (-0.9 - CARPET.z) * k + Math.sin(a) * r * 0.7; }
      else { const a = u * TAU, r = Math.sqrt(v) * 480; x = Math.cos(a) * r; y = Math.sin(a) * r; }
      const edge = Math.max(0, 1 - Math.hypot(x, y) / 500), tone = hash(i + 900);
      const rgb = tone < 0.6 ? '255,172,202' : tone < 0.85 ? '255,232,236' : '226,112,152';
      c.save(); c.translate(x, y); c.rotate(hash(i + 400) * TAU); c.globalAlpha = Math.min(1, edge * 1.6) * (0.55 + 0.4 * hash(i + 500));
      c.fillStyle = `rgb(${rgb})`; c.beginPath(); petalPath(c, 16 + 12 * hash(i + 600)); c.fill(); c.restore();
    }
    // Vài chiếc lá non rụng.
    c.fillStyle = 'rgb(190,232,140)';
    for (let i = 0; i < 14; i++) {
      const x = (hash(i + 700) * 2 - 1) * 1.3 * k, y = gate + (hash(i + 710) - 0.4) * 0.8 * k;
      c.save(); c.translate(x, y); c.rotate(hash(i + 720) * TAU); c.globalAlpha = 0.7;
      c.beginPath(); c.ellipse(0, 0, 6, 20, 0, 0, TAU); c.fill(); c.restore();
    }
  });
}

function shadowTexture() {
  return canvasTexture('dao-hoa-branch-shadow', 1024, ({ c }) => {
    c.strokeStyle = 'rgb(70,24,46)'; c.fillStyle = 'rgb(70,24,46)'; c.lineCap = 'round';
    c.shadowColor = 'rgb(70,24,46)'; c.shadowBlur = 14;
    const br = BRANCHES[0];
    [br.main, ...br.twigs].forEach((pts, k) => {
      const n = k ? 8 : 40;
      for (let i = 0; i < n; i++) {
        const a = project(branchPoint(pts, i / n), SHADOW), b = project(branchPoint(pts, (i + 1) / n), SHADOW);
        c.lineWidth = (k ? 4 : 13) * (1 - 0.6 * i / n); c.globalAlpha = 0.8;
        c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke();
      }
      // Tán hoa thành những vệt bóng tròn mềm.
      for (const u of br.blooms[k]) {
        const [x, y] = project(branchPoint(pts, u), SHADOW);
        c.globalAlpha = 0.45; c.beginPath(); c.arc(x, y, 16, 0, TAU); c.fill();
      }
    });
  });
}

export function createGround(parent, lowQuality) {
  const geometries = [], materials = [];
  const plane = (o, map, opacity, order, name) => {
    const geo = new THREE.PlaneGeometry(o.size, o.size); geometries.push(geo);
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false, toneMapped: false });
    materials.push(mat);
    const mesh = new THREE.Mesh(geo, mat); mesh.name = name; mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(o.x, 0.02 + order * 0.004, o.z); mesh.renderOrder = order; parent.add(mesh);
    return mesh;
  };
  const shadow = lowQuality ? null : plane(SHADOW, shadowTexture(), 0.3, 1, 'dao-hoa-branch-shadow');
  const carpet = plane(CARPET, carpetTexture(), 0.9, 2, 'dao-hoa-petal-carpet');
  const br = BRANCHES[0];
  return {
    update(time, rhythm, f) {
      carpet.material.opacity = 0.9 * f;
      if (!shadow) return;
      // Bóng lay theo cành: cùng hàm đung đưa với dao-hoa-branches, quy ra độ lệch trên đất.
      shadow.position.x = SHADOW.x + 2.4 * br.sway * Math.sin(time * 0.33 + br.phase);
      shadow.material.opacity = 0.3 * f;
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
