import { canvasTexture } from './aura-canvas-kit.js';

// Hoa văn Lưu Ly Vân Thủy (effect 2). Đơn vị px trong khung 1024 (bán kính 512), góc 0 = hướng lên.
// Pháp luân sau lưng (khớp giọt lưu ly 3D: vòng ngoài ~235–370 px, vòng trong ~150 px):
//   0–102 tâm 水 · 110–300 sáu nhánh băng tinh + lục mang tinh · 300–350 tám sóng cuộn ·
//   365–425 dải sóng vảy (thanh hải ba) · vành phù văn tách riêng 436–505 quay ngược chiều.
const INSCRIPTION = '琉璃雲水上善若水';
const SEAL_TEXT = '坎水潤下雲行雨施';

// --- nét riêng của Lưu Ly, vẽ trong khung đã xoay (điểm (0,-r) là hướng ra ngoài) ---
/** Ngọn sóng cuộn: thân sóng dâng rồi cuộn xoáy vào trong như nét bút lông. */
function waveCurl({ c, stroke }, r, s, width = 1.3, alpha = 0.8) {
  stroke(() => {
    c.moveTo(-70 * s, -r + 14 * s);
    c.bezierCurveTo(-46 * s, -r - 30 * s, 6 * s, -r - 44 * s, 34 * s, -r - 18 * s);
    c.arc(18 * s, -r - 14 * s, 16 * s, -0.25, Math.PI * 1.35, false);
    c.arc(22 * s, -r - 18 * s, 8 * s, Math.PI * 1.35, Math.PI * 2.6, false);
  }, width, alpha);
  stroke(() => { c.moveTo(-58 * s, -r + 18 * s); c.bezierCurveTo(-34 * s, -r - 14 * s, 0, -r - 24 * s, 16 * s, -r - 6 * s); }, width * 0.6, alpha * 0.55);
}
/** Dải sóng vảy: các cung bán nguyệt lồng nhau, mở ra ngoài. */
function scallops({ around, stroke, c }, n, r, rad, alpha = 0.6) {
  around(n, () => { for (let k = 0; k < 3; k++) stroke(() => c.arc(0, -r, rad * (1 - k * 0.3), Math.PI, Math.PI * 2), k ? 0.7 : 1.1, alpha * (1 - k * 0.25)); });
}
/** Nhánh băng tinh: trục chính kèm ba cặp nhánh chữ V, đầu nhánh có hạt thoi. */
function dendrite({ c, stroke, diamond }, r0, r1, width = 1.1, alpha = 0.7) {
  stroke(() => { c.moveTo(0, -r0); c.lineTo(0, -r1); }, width, alpha);
  for (const [k, b] of [[0.3, 34], [0.55, 42], [0.78, 26]]) {
    const y = r0 + (r1 - r0) * k;
    stroke(() => { c.moveTo(-b, -y - b); c.lineTo(0, -y); c.lineTo(b, -y - b); }, width * 0.75, alpha * 0.8);
  }
  diamond(r1 + 10, 10, width, alpha);
}
/** Giọt nước viền nét, đầu nhọn hướng ra ngoài. */
function droplet({ c, stroke }, r, s, width = 1, alpha = 0.8) {
  stroke(() => {
    c.moveTo(0, -r - s);
    c.bezierCurveTo(s * 0.55, -r - s * 0.2, s * 0.6, -r + s * 0.75, 0, -r + s * 0.75);
    c.bezierCurveTo(-s * 0.6, -r + s * 0.75, -s * 0.55, -r - s * 0.2, 0, -r - s);
  }, width, alpha);
}
function hexagram(p, r, width, alpha) { p.star(3, 1, r, width, alpha); p.at(Math.PI / 3, () => p.star(3, 1, r, width, alpha)); }
function glyphAt(c, text, px = 30) {
  c.globalAlpha = 0.9; c.font = `${px}px "KaiTi", "STKaiti", "SimSun", serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#fff'; c.shadowBlur = 6;
  c.fillText(text, 0, 1);
}

export function luuLyMandala() {
  return canvasTexture('luu-ly-mandala', 1024, p => {
    const { ring, around, star, glyph } = p;
    hexagram(p, 300, 0.8, 0.22); star(12, 5, 360, 0.7, 0.16);
    around(6, () => dendrite(p, 112, 290, 1.2, 0.75));
    around(6, () => dendrite(p, 150, 230, 0.8, 0.4), 0.5);
    around(8, () => waveCurl(p, 318, 1, 1.3, 0.8), 0.5);
    ring(365, 1.5); scallops(p, 36, 392, 22, 0.55); ring(425, 1.1, 0.75);
    ring(92, 1.8); ring(102, 0.8, 0.6);
    around(12, () => droplet(p, 76, 12, 0.9, 0.6));
    glyph('水', 0, 112, 0.95);
  });
}

export function luuLyRim() {
  return canvasTexture('luu-ly-rim', 1024, p => {
    const { c, stroke, ring, around } = p;
    ring(438, 1); ring(472, 2.2, 0.85); ring(503, 1);
    around(24, i => { c.save(); c.translate(0, -456); glyphAt(c, INSCRIPTION[i % 8], 26); c.restore(); });
    around(24, () => droplet(p, 456, 10, 1, 0.8), 0.5);
    around(24, () => stroke(() => c.arc(0, -503, 14, Math.PI * 1.1, Math.PI * 1.9), 1, 0.7), 0.5);
    around(72, () => stroke(() => { c.moveTo(0, -480); c.lineTo(0, -490); }, 0.7, 0.55));
  });
}

export function luuLyGlow() {
  return canvasTexture('luu-ly-glow', 512, ({ dot }) => {
    for (let i = 0; i < 8; i++) { const a = (i + 0.5) * Math.PI / 4; dot(Math.sin(a) * 330, -Math.cos(a) * 330, 30, 0.85); }
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; dot(Math.sin(a) * 300, -Math.cos(a) * 300, 20, 0.8); }
    for (let i = 0; i < 24; i++) { const a = (i + 0.5) * Math.PI / 12; dot(Math.sin(a) * 456, -Math.cos(a) * 456, 14, 0.7); }
    dot(0, 0, 70, 0.5);
  });
}

/** Trận thủy văn dưới chân (đứng yên): 24 chữ, sóng cuộn, lục mang tinh, băng tinh. */
export function luuLySealOuter() {
  return canvasTexture('luu-ly-seal-outer', 1024, p => {
    const { c, ring, around, star } = p;
    ring(505, 1); ring(492, 2); ring(452, 1.2); ring(440, 0.8, 0.6);
    around(24, i => { c.save(); c.translate(0, -472); glyphAt(c, SEAL_TEXT[i % 8], 30); c.restore(); });
    around(24, () => droplet(p, 472, 9, 1, 0.85), 0.5);
    hexagram(p, 430, 0.9, 0.3); star(12, 5, 400, 0.6, 0.16);
    around(12, () => waveCurl(p, 385, 0.95, 1.4, 0.8), 0.5);
    scallops(p, 30, 320, 24, 0.5); ring(292, 1.2);
    around(6, () => dendrite(p, 180, 280, 1.2, 0.7));
    ring(170, 1.2); ring(160, 0.7, 0.6);
  });
}

/** Thủy liên sáu cánh giọt nước dưới chân, quẻ Khảm ở tâm, quay ngược trận ngoài. */
export function luuLySealInner() {
  return canvasTexture('luu-ly-seal-inner', 512, p => {
    const { c, stroke, ring, around, trigram } = p;
    around(6, () => {
      stroke(() => { c.moveTo(0, -140); c.bezierCurveTo(120, -230, 90, -360, 0, -410); c.bezierCurveTo(-90, -360, -120, -230, 0, -140); }, 2.2, 0.85);
      stroke(() => { c.moveTo(0, -170); c.lineTo(0, -370); }, 1, 0.5);
    });
    around(12, () => droplet(p, 300, 40, 1.4, 0.55), 0.5);
    ring(420, 2.2); ring(440, 1, 0.7); ring(130, 2);
    trigram(0b010, -13, 3, 0.9);
  });
}

// ===== Texture billboard "bay bổng" =====

/** Vân thủy: thân sương mềm + hai ngọn sóng cuộn viền sáng. */
export function luuLyCloud() {
  return canvasTexture('luu-ly-cloud', 256, p => {
    const { c, stroke } = p;
    for (const [x, y, r] of [[-260, 70, 180], [-40, -20, 230], [190, 40, 200], [360, 100, 120]]) {
      const g = c.createRadialGradient(x, y, r * 0.1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.6, 'rgba(255,255,255,0.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#fff';
    c.save(); c.translate(-120, 180); waveCurl(p, 0, 3.2, 6, 0.85); c.restore();
    c.save(); c.translate(170, 160); waveCurl(p, 0, 2.4, 5, 0.75); c.restore();
    stroke(() => { c.moveTo(-460, 200); c.bezierCurveTo(-200, 240, 150, 160, 450, 210); }, 5, 0.6);
  });
}

/** Giọt nước trong: viền sáng, lõi trong, đốm phản quang — đầu nhọn hướng lên. */
export function luuLyDrop() {
  return canvasTexture('luu-ly-drop', 128, ({ c, dot }) => {
    const shape = () => { c.beginPath(); c.moveTo(0, -470); c.bezierCurveTo(260, -120, 300, 330, 0, 330); c.bezierCurveTo(-300, 330, -260, -120, 0, -470); };
    const g = c.createRadialGradient(0, 120, 20, 0, 80, 320);
    g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(0.8, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0.95)');
    c.fillStyle = g; shape(); c.fill();
    c.lineWidth = 34; c.strokeStyle = '#fff'; shape(); c.stroke();
    dot(-90, 40, 110, 1);
  });
}

/** Bọt nước: vòng mảnh + vệt phản quang. */
export function luuLyBubble() {
  return canvasTexture('luu-ly-bubble', 64, ({ c, ring, dot }) => {
    ring(380, 14, 0.9);
    c.lineWidth = 50; c.globalAlpha = 0.8; c.beginPath(); c.arc(0, 0, 300, Math.PI * 1.1, Math.PI * 1.45); c.stroke(); c.globalAlpha = 1;
    dot(0, 0, 360, 0.25);
  });
}

/** Lấp lánh sáu tia như tinh thể băng. */
export function luuLySparkle() {
  return canvasTexture('luu-ly-sparkle', 128, ({ c, dot }) => {
    for (let i = 0; i < 3; i++) {
      c.save(); c.rotate(i * Math.PI / 3);
      const g = c.createLinearGradient(0, -500, 0, 500);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, i ? 18 : 30, i ? 340 : 500, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    dot(0, 0, 170, 1);
  });
}

/** Mảnh lưu ly: hình thoi dài có mặt cắt, gân sáng chéo. */
export function luuLyShard() {
  return canvasTexture('luu-ly-shard', 128, ({ c, stroke }) => {
    const g = c.createLinearGradient(-200, -460, 200, 460);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0.75)');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, -470); c.lineTo(190, -60); c.lineTo(0, 470); c.lineTo(-190, -60); c.closePath(); c.fill();
    stroke(() => { c.moveTo(0, -470); c.lineTo(0, 470); c.moveTo(-190, -60); c.lineTo(190, -60); }, 9, 0.8);
  });
}
