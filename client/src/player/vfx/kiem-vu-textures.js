import { canvasTexture } from './kiem-vu-canvas-kit.js';

// Hoa văn Vạn Kiếm Quy Tông của Kiếm Vũ. Đơn vị px trong khung 1024 (bán kính 512).
// Bố cục pháp luân sau lưng (khớp kiếm 3D: vòng ngoài từ ~160 tới ~395 px):
//   0–92 kiếm tâm 劍 · 110–360 mười hai kiếm hoa xen giữa kiếm 3D · 365–425 vành mây ·
//   vành phù văn tách riêng 430–505 (quay ngược chiều).
const INSCRIPTION = '青風劍舞萬劍歸宗';
const SEAL_TEXT = '劍陣八方御氣乘風';
// Thứ tự Hậu Thiên bát quái: Ly, Khôn, Đoài, Càn, Khảm, Cấn, Chấn, Tốn (bit 0 = hào dưới).
const TRIGRAMS = [0b101, 0b000, 0b110, 0b111, 0b010, 0b001, 0b100, 0b011];

export function kiemVuMandala() {
  return canvasTexture('kiem-vu-mandala', 1024, p => {
    const { c, stroke, ring, around, star, sword, cloud, glyph } = p;
    // Lưới đan xen mờ phía sau: bát giác sao + thập nhị giác sao.
    star(8, 3, 250, 0.7, 0.16); star(12, 5, 372, 0.7, 0.2);
    // Mười hai kiếm hoa (xen giữa các kiếm 3D), gân sáng giữa lưỡi.
    around(12, () => sword(118, 352, 20, 1.5, 0.85), 0.5);
    // Vảy cung nối mũi kiếm hoa thành vành hoa ở 352–372.
    around(12, () => stroke(() => c.arc(0, -330, 70, Math.PI * 0.32, Math.PI * 0.68), 1, 0.45));
    ring(365, 1.6); ring(372, 0.8, 0.6);
    around(12, () => cloud(0, -398, 0.85, 1, 0.55), 0.5);
    ring(425, 1.1, 0.75);
    // Kiếm tâm: vòng kép, tám tia, chữ 劍.
    ring(92, 1.8); ring(102, 0.8, 0.6);
    around(8, () => stroke(() => { c.moveTo(0, -36); c.lineTo(0, -78); }, 1.3, 0.6));
    glyph('劍', 0, 112, 0.95);
  });
}

export function kiemVuRim() {
  return canvasTexture('kiem-vu-rim', 1024, p => {
    const { c, stroke, ring, around, diamond } = p;
    ring(436, 1); ring(470, 2.4); ring(500, 1);
    // Gió Thanh Phong: mười hai lọn gió cuộn nối các mũi kiếm.
    around(12, () => stroke(() => {
      c.moveTo(0, -410); c.bezierCurveTo(60, -440, 110, -400, 128, -420); c.arc(118, -432, 10, 0.8, Math.PI * 1.9);
    }, 1.1, 0.6));
    // Hai mươi bốn chữ phù văn nằm trong dải 452–490, xen hình thoi.
    around(24, i => { c.save(); c.translate(0, -470); glyphAt(c, INSCRIPTION[i % 8]); c.restore(); });
    around(24, () => diamond(470, 9, 1.1), 0.5);
    around(72, () => stroke(() => { c.moveTo(0, -440); c.lineTo(0, -448); }, 0.8, 0.6));
    around(24, () => stroke(() => c.arc(0, -500, 9, Math.PI * 0.15, Math.PI * 0.85), 1, 0.7), 0.5);
  });
}

// Chữ trong dải phù văn (vẽ trực tiếp tại gốc toạ độ đã dời).
function glyphAt(c, text) {
  c.globalAlpha = 0.9; c.font = '30px "KaiTi", "STKaiti", "SimSun", serif';
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#fff'; c.shadowBlur = 6;
  c.fillText(text, 0, 1);
}

export function kiemVuGlow() {
  return canvasTexture('kiem-vu-glow', 512, ({ dot }) => {
    for (let i = 0; i < 12; i++) { const a = (i + 0.5) * Math.PI / 6; dot(Math.sin(a) * 352, -Math.cos(a) * 352, 26, 0.9); }
    for (let i = 0; i < 24; i++) { const a = (i + 0.5) * Math.PI / 12; dot(Math.sin(a) * 470, -Math.cos(a) * 470, 16, 0.75); }
    dot(0, 0, 60, 0.5);
  });
}

export function kiemVuSealOuter() {
  return canvasTexture('kiem-vu-seal-outer', 1024, p => {
    const { c, stroke, ring, around, star, sword, cloud, trigram, diamond } = p;
    ring(505, 1); ring(492, 2); ring(452, 1.2); ring(440, 0.8, 0.6);
    around(24, i => { c.save(); c.translate(0, -472); glyphAt(c, SEAL_TEXT[i % 8]); c.restore(); });
    around(24, () => diamond(472, 7, 1), 0.5);
    star(8, 3, 432, 0.9, 0.32); star(16, 7, 380, 0.6, 0.16);
    around(8, i => trigram(TRIGRAMS[i], 392, 1.7, 0.85), 0.5);
    around(8, () => sword(168, 372, 24, 1.6, 0.9));
    around(8, () => cloud(0, -300, 1, 1, 0.5), 0.5);
    ring(170, 1.2); ring(160, 0.7, 0.6);
  });
}

export function kiemVuSealInner() {
  return canvasTexture('kiem-vu-seal-inner', 512, p => {
    const { c, stroke, ring, around, sword, glyph } = p;
    // Kiếm liên mười sáu cánh dưới chân, quay ngược trận ngoài.
    around(16, () => sword(150, 400, 22, 2.2, 0.85));
    around(16, () => stroke(() => c.arc(0, -380, 70, Math.PI * 0.3, Math.PI * 0.7), 1.6, 0.45), 0.5);
    ring(420, 2.2); ring(440, 1, 0.7); ring(130, 2);
    glyph('劍', 0, 150, 0.85);
  });
}

// ===== Texture billboard "bay bổng" (vẽ trong khung 1024, tâm giữa) =====

/** Tường vân: thân mây đầy mềm (gradient) + ba cuộn xoắn viền sáng kiểu mây lành. */
export function kiemVuCloud() {
  return canvasTexture('kiem-vu-cloud', 256, ({ c, stroke }) => {
    const puff = (x, y, r, a) => {
      const g = c.createRadialGradient(x, y, r * 0.1, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.6, `rgba(255,255,255,${a * 0.55})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    };
    for (const [x, y, r] of [[-250, 60, 190], [-60, -40, 240], [170, 30, 210], [330, 90, 140], [-380, 120, 120]]) puff(x, y, r, 0.55);
    c.fillStyle = '#fff';
    for (const [x, y, r, a0] of [[-170, -10, 95, 0.4], [60, -110, 120, 0.2], [270, -10, 85, 0.6]]) {
      stroke(() => {
        c.arc(x, y, r, Math.PI * (1 + a0), Math.PI * (2.55 + a0));
        c.arc(x + r * 0.32, y + r * 0.05, r * 0.55, Math.PI * (0.55 + a0), Math.PI * (2.3 + a0), false);
      }, 6, 0.85);
    }
    stroke(() => { c.moveTo(-460, 190); c.bezierCurveTo(-200, 230, 150, 150, 450, 200); }, 5, 0.6);
  });
}

/** Sao bốn cánh lấp lánh: hai tia chéo mảnh + lõi tròn. */
export function kiemVuStar() {
  return canvasTexture('kiem-vu-star', 128, ({ c, dot }) => {
    for (const [w, h] of [[38, 500], [500, 38], [16, 300], [300, 16]]) {
      c.save(); if (w === 16 || w === 300) c.rotate(Math.PI / 4);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h));
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    dot(0, 0, 160, 1);
  });
}

/** Vệt khí thẳng đứng: đầu trên sáng, thân mảnh tan dần xuống dưới. */
export function kiemVuStreak() {
  return canvasTexture('kiem-vu-streak', 128, ({ c }) => {
    const g = c.createLinearGradient(0, -512, 0, 512);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.15, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 160, 512, 0, 0, Math.PI * 2); c.fill();
  });
}
