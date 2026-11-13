import * as THREE from 'three';
import { canvasTexture } from './aura-canvas-kit.js';
import { hash } from './aura-billboard-layer.js';

// Hoa văn canvas của Xích Diễm (vẽ trắng, shader tô màu).
const OFFSETS = [-1024, 0, 1024];

/** Texture lát gạch: mỗi nét vẽ ở 9 vị trí lệch ±1024 cho liền mép khi lặp (trải toạ độ cực). */
function tiled(key, size, draw) {
  const tex = canvasTexture(key, size, pen => {
    for (const dx of OFFSETS) for (const dy of OFFSETS) { pen.c.save(); pen.c.translate(dx, dy); draw(pen); pen.c.restore(); }
  });
  // Chỗ nối góc ±π của toạ độ cực: tắt mipmap để không lộ đường chỉ.
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  return tex;
}

/** Nét xoắn ốc cuộn vào tâm (đầu cuộn mây lành). */
function spiral(pen, x, y, R, dir, width, alpha) {
  pen.stroke(() => {
    for (let i = 0; i <= 48; i++) {
      const u = i / 48, th = dir * u * Math.PI * 2.4, r = R * (1 - 0.85 * u);
      const px = x + Math.cos(th) * r, py = y + Math.sin(th) * r;
      if (i) pen.c.lineTo(px, py); else pen.c.moveTo(px, py);
    }
  }, width, alpha);
}

/** Biển mây: thân mây mềm, tường vân ba vòng và đầu cuộn xoắn ốc rải đều để trôi vòng liền mạch. */
export function cloudSeaTile() {
  return tiled('xich-diem-cloud-sea', 512, pen => {
    for (let i = 0; i < 12; i++) pen.dot(-512 + 1024 * hash(i + 1), -512 + 1024 * hash(i + 2), 110 + 90 * hash(i + 3), 0.4);
    for (let i = 0; i < 9; i++) {
      const x = -512 + 1024 * (i % 3 + 0.25 + 0.5 * hash(i + 9)) / 3, y = -512 + 1024 * (Math.floor(i / 3) + 0.3 + 0.4 * hash(i + 11)) / 3;
      pen.cloud(x, y, 3.2 + 2.2 * hash(i + 13), 5, 0.95);
    }
    for (let i = 0; i < 8; i++) {
      spiral(pen, -512 + 1024 * hash(i + 30), -512 + 1024 * hash(i + 31), 40 + 50 * hash(i + 32), i % 2 ? 1 : -1, 4, 0.8);
    }
  });
}

/** Quầng sáng tròn mịn cho mặt phẳng lớn (ánh lửa, bóng dưới đài, quầng sau cuộn): softDot 16×16
    lọc nearest sẽ lộ ô vuông khi trải rộng vài mét. */
export function softGlow() {
  return canvasTexture('xich-diem-soft-glow', 128, pen => pen.dot(0, 0, 510, 1));
}

/** Cụm mây lửa (billboard): đáy dẹt, đỉnh nhiều múi, hai đầu cuộn xoắn ốc nhẹ. */
export function firePuff() {
  return canvasTexture('xich-diem-fire-puff', 256, pen => {
    const lobes = [[-250, 110, 220], [0, 20, 300], [250, 100, 210], [-120, 170, 230], [130, 180, 230], [-360, 220, 150], [360, 210, 150]];
    for (const [x, y, r] of lobes) pen.dot(x, y, r, 0.85);
    spiral(pen, -110, -60, 120, 1, 5, 0.45);
    spiral(pen, 170, -10, 90, -1, 5, 0.4);
  });
}
