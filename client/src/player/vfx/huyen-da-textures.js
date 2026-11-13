import * as THREE from 'three';
import { canvasTexture } from './aura-canvas-kit.js';
import { hash } from './aura-billboard-layer.js';

// Hoa văn canvas của Huyền Dạ (vẽ trắng, shader tô màu). Texture "lát gạch" dùng cho xoáy hút
// toạ độ cực (vortexFragment): trục x = góc, trục y = log bán kính. Nét DỌC trên texture thành nhánh
// xoắn ốc khi trải ra, nên vệt mực và tia corona đều vẽ dọc. Mỗi nét vẽ ở 9 vị trí lệch ±1024 để
// liền mép khi lặp.
const TAU = Math.PI * 2;
const OFFSETS = [-1024, 0, 1024];

function tiled(key, size, draw) {
  const tex = canvasTexture(key, size, pen => {
    for (const dx of OFFSETS) for (const dy of OFFSETS) { pen.c.save(); pen.c.translate(dx, dy); draw(pen.c); pen.c.restore(); }
  });
  // Toạ độ cực có chỗ nối góc ±π: tắt mipmap để không lộ đường chỉ ở chỗ nối.
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  return tex;
}

/** Nét bút lông dọc: thân thuôn hai đầu, uốn nhẹ, mép khô (vài sợi lông bút tách ra). */
function brush(c, x, y, len, width, bend, alpha, dry = 0) {
  const n = 18, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, w = width * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.6) * (1 - 0.35 * t);
    pts.push([x + bend * Math.sin(t * Math.PI * 0.9) + bend * 0.4 * t, y - len / 2 + len * t, w]);
  }
  c.globalAlpha = alpha; c.beginPath();
  pts.forEach(([px, py, w], i) => (i ? c.lineTo(px - w, py) : c.moveTo(px - w, py)));
  for (let i = n; i >= 0; i--) c.lineTo(pts[i][0] + pts[i][2], pts[i][1]);
  c.closePath(); c.fill();
  // Mép khô: sợi lông bút mảnh chạy dọc hai bên, đứt quãng.
  for (let k = 0; k < dry; k++) {
    const side = k % 2 ? 1 : -1, off = side * width * (1.05 + 0.5 * hash(x + k)), from = 0.15 + 0.3 * hash(y + k);
    c.globalAlpha = alpha * 0.5; c.lineWidth = 1.5 + 2 * hash(k + x); c.beginPath();
    for (let i = Math.floor(from * n); i <= n * 0.85; i++) {
      const [px, py, w] = pts[i];
      if (i === Math.floor(from * n)) c.moveTo(px + off * w / width, py); else c.lineTo(px + off * w / width, py);
    }
    c.stroke();
  }
}

/** Vệt mực xoáy: nhánh mực đậm nhạt xen kẽ, giọt mực bắn — dùng cho xoáy sau nhật thực và nền đất. */
export function inkStreaks() {
  return tiled('huyen-da-ink-streaks', 512, c => {
    c.shadowColor = '#fff'; c.shadowBlur = 10;
    for (let i = 0; i < 9; i++) {
      const x = -512 + 1024 * (i + 0.3 * hash(i + 1)) / 9;
      brush(c, x, -512 + 1024 * hash(i + 20), 520 + 420 * hash(i + 2), 26 + 46 * hash(i + 3), (hash(i + 4) - 0.5) * 140,
        0.55 + 0.45 * hash(i + 5), 4);
    }
    for (let i = 0; i < 40; i++) {
      c.globalAlpha = 0.4 + 0.5 * hash(i + 60); c.beginPath();
      c.arc(-512 + 1024 * hash(i + 61), -512 + 1024 * hash(i + 62), 3 + 9 * hash(i + 63) ** 2, 0, TAU); c.fill();
    }
  });
}

/** Tia corona: nhiều sợi tia mảnh như lông vũ, dài ngắn xen kẽ, uốn nhẹ. */
export function coronaRays() {
  return tiled('huyen-da-corona-rays', 512, c => {
    c.shadowColor = '#fff'; c.shadowBlur = 6;
    for (let i = 0; i < 46; i++) {
      const x = -512 + 1024 * (i + 0.5 * hash(i + 100)) / 46;
      brush(c, x, -512 + 1024 * hash(i + 101), 260 + 620 * hash(i + 102), 3 + 7 * hash(i + 103), (hash(i + 104) - 0.5) * 50,
        0.45 + 0.55 * hash(i + 105));
    }
  });
}

/** Vũng mực loang: khối mực mép răng cưa mềm + giọt bắn quanh. */
export function inkSplat() {
  return canvasTexture('huyen-da-ink-splat', 256, ({ c }) => {
    c.shadowColor = '#fff'; c.shadowBlur = 18;
    c.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = i / 48 * TAU, r = 250 + 70 * Math.sin(a * 5 + 1) * 0.5 + 60 * hash(i % 48 + 7) - 30;
      if (i) c.lineTo(Math.sin(a) * r, -Math.cos(a) * r); else c.moveTo(Math.sin(a) * r, -Math.cos(a) * r);
    }
    c.globalAlpha = 0.85; c.fill();
    for (let i = 0; i < 16; i++) {
      const a = hash(i + 30) * TAU, r = 330 + 140 * hash(i + 31);
      c.globalAlpha = 0.7; c.beginPath(); c.arc(Math.sin(a) * r, -Math.cos(a) * r, 10 + 26 * hash(i + 32), 0, TAU); c.fill();
    }
  });
}

/** Cụm khói mực mềm (billboard): vài quầng tròn chồng lệch, mép tan. */
export function inkWisp() {
  return canvasTexture('huyen-da-ink-wisp', 128, ({ c }) => {
    for (let i = 0; i < 6; i++) {
      const x = (hash(i + 40) - 0.5) * 380, y = (hash(i + 41) - 0.5) * 380, r = 200 + 160 * hash(i + 42);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
  });
}
