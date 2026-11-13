import * as THREE from 'three';
import { canvasTexture } from './aura-canvas-kit.js';

// Texture canvas của Long Quyền, vẽ một lần, dùng chung mọi nhân vật (không dispose).
// Hệ toạ độ của canvasTexture: tâm (0,0), khung −512..512.

/** Vảy giáp lát gạch (lặp cả hai chiều): nền đen đặc, kênh đỏ = lòng vảy sáng dần vào giữa,
    kênh lục = viền vảy. Mép tròn tự do của vảy hướng xuống canvas = hướng về đuôi rồng. */
export function scaleTile() {
  const tex = canvasTexture('long-quyen-scales', 256, ({ c }) => {
    c.fillStyle = '#000'; c.fillRect(-512, -512, 1024, 1024);
    for (let k = -1; k <= 4; k++) for (let col = -1; col <= 4; col++) {
      const x = -512 + col * 256 + (k % 2 ? 128 : 0), y = -512 + k * 256;
      const shape = () => {
        c.beginPath(); c.moveTo(x - 128, y - 40);
        c.quadraticCurveTo(x - 132, y + 150, x, y + 212); c.quadraticCurveTo(x + 132, y + 150, x + 128, y - 40);
      };
      const g = c.createRadialGradient(x, y + 70, 10, x, y + 70, 230);
      g.addColorStop(0, 'rgb(255,0,0)'); g.addColorStop(0.7, 'rgb(150,0,0)'); g.addColorStop(1, 'rgb(60,0,0)');
      shape(); c.closePath(); c.fillStyle = g; c.fill();
      shape(); c.strokeStyle = 'rgb(0,255,0)'; c.lineWidth = 22; c.stroke();
      c.beginPath(); c.moveTo(x, y + 30); c.lineTo(x, y + 150); c.strokeStyle = 'rgb(0,130,0)'; c.lineWidth = 9; c.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Khe nứt chấn địa: chín đường nứt chính gãy khúc toả từ tâm, mỗi đường hai nhánh phụ, quanh tâm có
// cung nứt vỡ do va chạm. Cùng hạt giống nên bản mép (rộng, nhoè) và bản lõi (mảnh) trùng nhau.
function drawCracks(c, widthScale, blur) {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = blur;
  const crack = (a0, r0, r1, w0, depth) => {
    let a = a0, r = r0, x = Math.sin(a) * r, y = -Math.cos(a) * r;
    while (r < r1) {
      const step = 26 + rnd() * 30, nr = Math.min(r1, r + step);
      a += (rnd() - 0.5) * 0.22;
      const nx = Math.sin(a) * nr, ny = -Math.cos(a) * nr;
      c.lineWidth = Math.max(1.2, w0 * (1 - (r - r0) / (r1 - r0)) ** 0.8) * widthScale;
      c.beginPath(); c.moveTo(x, y); c.lineTo(nx, ny); c.stroke();
      if (depth < 1 && rnd() < 0.09) crack(a + (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.35), nr, Math.min(500, nr + 90 + rnd() * 130), w0 * 0.45, depth + 1);
      x = nx; y = ny; r = nr;
    }
  };
  for (let k = 0; k < 9; k++) crack(k / 9 * Math.PI * 2 + (rnd() - 0.5) * 0.4, 50, 380 + rnd() * 110, 13, 0);
  for (let k = 0; k < 7; k++) {
    const a = rnd() * Math.PI * 2, r = 95 + rnd() * 40, len = 0.35 + rnd() * 0.4;
    c.lineWidth = 3 * widthScale;
    c.beginPath(); c.arc(0, 0, r, a, a + len); c.stroke();
  }
}
export const crackRim = () => canvasTexture('long-quyen-crack-rim', 1024, ({ c }) => drawCracks(c, 2.6, 10));
export const crackCore = () => canvasTexture('long-quyen-crack-core', 1024, ({ c }) => drawCracks(c, 1, 6));

/** Ấn quyền: triện vuông hai lớp viền, góc cuộn vân lửa, lưỡi lửa nhỏ dọc cạnh, chữ 拳 ở giữa. */
export function fistSeal() {
  return canvasTexture('long-quyen-fist-seal', 512, ({ stroke, c, cloud, glyph, dot }) => {
    const square = (h, w, a) => stroke(() => c.rect(-h, -h, h * 2, h * 2), w, a);
    square(450, 5, 1); square(410, 2, 0.85); square(300, 1, 0.5);
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      c.save(); c.translate(sx * 360, sy * 360); c.rotate(Math.atan2(sy, sx) + Math.PI / 4);
      cloud(0, 0, 1.4, 1.4, 0.9); c.restore();
    }
    for (let side = 0; side < 4; side++) {
      c.save(); c.rotate(side * Math.PI / 2);
      for (let i = -3; i <= 3; i++) stroke(() => {
        const x = i * 80; c.moveTo(x - 22, -452); c.quadraticCurveTo(x - 6, -500, x + 12, -510); c.quadraticCurveTo(x + 2, -480, x + 22, -452);
      }, 1.4, 0.8);
      c.restore();
    }
    dot(0, 0, 330, 0.25);
    glyph('拳', 0, 470, 1);
  });
}

/** Vòng sóng quyền bát giác: viền đậm, viền mảnh trong và vạch khắc ở tám đỉnh. */
export function octagonRing() {
  return canvasTexture('long-quyen-octagon', 256, ({ stroke, c, around }) => {
    const oct = (r, w, a) => stroke(() => {
      for (let i = 0; i <= 8; i++) {
        const t = (i + 0.5) * Math.PI / 4;
        if (i) c.lineTo(Math.sin(t) * r, -Math.cos(t) * r); else c.moveTo(Math.sin(t) * r, -Math.cos(t) * r);
      }
    }, w, a);
    oct(470, 7, 1); oct(420, 2.5, 0.7);
    around(8, () => stroke(() => { c.moveTo(0, -400); c.lineTo(0, -490); }, 2, 0.8), 0.5);
  });
}
