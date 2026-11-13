import * as THREE from 'three';
import { canvasTexture, CJK_FONT } from './aura-canvas-kit.js';
import { hash } from './aura-billboard-layer.js';

// Texture canvas của Bích Ngọc (không mandala, không vòng chữ, không trận đồ). Khung vẽ 1024,
// tâm (0, 0). Nét trắng thì shader tô màu; nền đất vẽ màu thật (normal blend).
const TAU = Math.PI * 2;

/** Lá trúc phẳng (cho bóng đổ, lá rụng trên đất): thuôn mũi giáo, chóp nhọn dài. */
export function leafPath(c, len, width) {
  c.moveTo(0, 0);
  c.bezierCurveTo(width, -len * 0.18, width * 0.8, -len * 0.55, 0, -len);
  c.bezierCurveTo(-width * 0.8, -len * 0.55, -width, -len * 0.18, 0, 0);
}

/** Vân gió trên dải gió xoáy: ba đường gió uốn lượn song song, mỗi quãng một xoắn mây cuộn ở
    đầu nét, gạch gió mảnh chen giữa. Lặp liền mạch theo chiều ngang (wrapS = Repeat). */
export function bichNgocWindBand() {
  const tex = canvasTexture('bich-ngoc-wind-band', 512, ({ c, stroke }) => {
    const wave = (y0, amp, ph) => x => y0 + Math.sin(x / 1024 * TAU * 2 + ph) * amp;
    for (const [y0, amp, ph, w, al] of [[-250, 40, 0, 7, 0.95], [0, 55, 1.6, 10, 1], [250, 40, 3.1, 7, 0.9]]) {
      const f = wave(y0, amp, ph);
      stroke(() => { c.moveTo(-520, f(-520)); for (let x = -520; x <= 520; x += 16) c.lineTo(x, f(x)); }, w, al);
    }
    // Xoắn mây gió ở bốn chỗ (đối xứng tịnh tiến để nối liền khi lặp).
    for (const [x, y, s] of [[-384, -120, 1], [-128, 150, 0.85], [128, -140, 1.05], [384, 130, 0.9]]) {
      stroke(() => {
        for (let k = 0; k <= 40; k++) {
          const a = k / 40 * TAU * 1.3, r = 70 * s * (1 - k / 48);
          const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
          if (k) c.lineTo(px, py); else c.moveTo(px - 180 * s, py);
        }
      }, 6, 0.95);
    }
    for (let i = 0; i < 10; i++) {
      const x = -480 + i * 100, y = (hash(i + 3) - 0.5) * 760;
      stroke(() => { c.moveTo(x, y); c.lineTo(x + 70, y + 6); }, 2, 0.6);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Vệt gió billboard: nét quét ngang thuôn hai đầu, đầu nét cuộn một vòng xoắn nhỏ. */
export function bichNgocWindStreak() {
  return canvasTexture('bich-ngoc-wind-streak', 256, ({ c, stroke }) => {
    stroke(() => { c.moveTo(-480, 40); c.quadraticCurveTo(-60, -40, 260, -10); }, 9, 0.9);
    stroke(() => { c.moveTo(-380, 110); c.quadraticCurveTo(0, 50, 330, 70); }, 5, 0.6);
    stroke(() => {
      for (let k = 0; k <= 30; k++) {
        const a = -Math.PI / 2 + k / 30 * TAU * 1.1, r = 90 * (1 - k / 36);
        c.lineTo(260 + Math.cos(a) * r, 80 + Math.sin(a) * r);
      }
    }, 7, 0.9);
  });
}

/** Thẻ ngọc treo chuông gió: nền ngọc bích viền vàng nhạt, chữ 風 trắng ngọc. Khung dán lên tấm
    TAG_SIZE nên chữ vẽ giãn ngang cho đúng tỉ lệ. */
export const TAG_SIZE = [0.09, 0.2];
export function bichNgocWindTag() {
  return canvasTexture('bich-ngoc-wind-tag', 256, ({ c }) => {
    c.fillStyle = 'rgba(26,104,74,0.96)'; c.fillRect(-470, -500, 940, 1000);
    c.strokeStyle = 'rgba(222,240,150,0.95)'; c.lineWidth = 40; c.strokeRect(-430, -460, 860, 920);
    c.scale(TAG_SIZE[1] / TAG_SIZE[0], 1);
    c.fillStyle = 'rgba(236,255,244,1)'; c.font = `300px ${CJK_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(160,255,200,1)'; c.shadowBlur = 20; c.fillText('風', 0, 10);
  });
}

/** Thảm rêu dưới các cụm trúc (màu thật): mảng rêu loang không đều quanh gốc từng cụm, cỏ lún
    phún, lá trúc khô rụng và sỏi. `spots` = [[x, y, bán kính] px] — tâm các cụm. */
export function bichNgocMossCarpet(spots) {
  return canvasTexture('bich-ngoc-moss-carpet', 1024, ({ c }) => {
    for (let i = 0; i < 420; i++) {
      const [sx, sy, sr] = spots[i % spots.length], a = hash(i + 1) * TAU, r = Math.sqrt(hash(i + 2)) * sr;
      const x = sx + Math.cos(a) * r, y = sy + Math.sin(a) * r * 0.8, tone = hash(i + 3);
      c.globalAlpha = (0.35 + 0.4 * hash(i + 4)) * (1 - 0.6 * r / sr);
      c.fillStyle = tone < 0.5 ? 'rgb(84,138,56)' : tone < 0.8 ? 'rgb(112,160,70)' : 'rgb(58,104,52)';
      c.beginPath(); c.arc(x, y, 14 + 26 * hash(i + 5), 0, TAU); c.fill();
    }
    c.strokeStyle = 'rgb(70,128,60)'; c.lineCap = 'round'; c.lineWidth = 3;
    for (let i = 0; i < 160; i++) {
      const [sx, sy, sr] = spots[i % spots.length], a = hash(i + 200) * TAU, r = (0.4 + 0.7 * hash(i + 201)) * sr;
      const x = sx + Math.cos(a) * r, y = sy + Math.sin(a) * r * 0.8;
      c.globalAlpha = 0.7;
      for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + k * 8, y - 16 - 8 * hash(i + k + 202)); c.stroke(); }
    }
    for (let i = 0; i < 40; i++) {
      const [sx, sy, sr] = spots[i % spots.length], a = hash(i + 300) * TAU, r = (0.5 + 0.8 * hash(i + 301)) * sr;
      c.save(); c.translate(sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.8); c.rotate(hash(i + 302) * TAU);
      c.globalAlpha = 0.85; c.fillStyle = hash(i + 303) < 0.6 ? 'rgb(196,184,112)' : 'rgb(128,186,96)';
      c.beginPath(); leafPath(c, 60, 10); c.fill(); c.restore();
    }
    for (let i = 0; i < 30; i++) {
      const [sx, sy, sr] = spots[i % spots.length], a = hash(i + 400) * TAU, r = (0.3 + 0.9 * hash(i + 401)) * sr;
      c.globalAlpha = 0.8; c.fillStyle = 'rgb(150,156,146)';
      c.beginPath(); c.ellipse(sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.8, 7 + 6 * hash(i + 402), 5 + 3 * hash(i + 403), a, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  });
}

/** Bóng trúc đổ: `culms` = [[x0, y0, x1, y1, bề rộng] px], `sprays` = [[x, y, góc] px] — bóng
    thân thẳng và bóng chùm lá nhọn, mực xanh rêu mờ, mép nhoè. */
export function bichNgocShadow(culms, sprays) {
  return canvasTexture('bich-ngoc-bamboo-shadow', 1024, ({ c }) => {
    const ink = 'rgb(16,54,40)';
    c.strokeStyle = ink; c.fillStyle = ink; c.lineCap = 'round'; c.shadowColor = ink; c.shadowBlur = 12;
    for (const [x0, y0, x1, y1, w] of culms) {
      c.globalAlpha = 0.85; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      // Đốt trúc: gờ ngang nhỏ dọc bóng thân.
      for (let k = 1; k < 7; k++) {
        const t = k / 7, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        c.lineWidth = 3; c.beginPath(); c.moveTo(x - w, y); c.lineTo(x + w, y); c.stroke();
      }
    }
    sprays.forEach(([x, y, a], i) => {
      for (let j = 0; j < 4; j++) {
        c.save(); c.translate(x, y); c.rotate(a + (j - 1.5) * 0.45 + (hash(i * 4 + j) - 0.5) * 0.3);
        c.globalAlpha = 0.6; c.beginPath(); leafPath(c, 70 + 20 * hash(i + j + 7), 11); c.fill(); c.restore();
      }
    });
    c.globalAlpha = 1;
  });
}
