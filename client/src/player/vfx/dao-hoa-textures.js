import { canvasTexture } from './aura-canvas-kit.js';
import { daoHoaMotifs, petalPath as petal } from './dao-hoa-canvas-motifs.js';

// Hoa văn nét (trắng, shader tô màu) của Đào Hoa — cố ý KHÔNG theo khuôn mandala/trận chữ tròn của
// các aura khác. Đơn vị px trong khung 1024 (bán kính 512).
//  Nguyệt môn (mặt phẳng 2.7 m, tâm cao 1.32 m): vành cổng nét bút lông khô ở r 494, hở hai chỗ nơi
//    cành đào 3D vắt qua; bên trong là bức thủy mặc (dao-hoa-garden-painting.js).
//  Dưới chân: mặt ao — bờ nước nét bút lượn hở, gợn loang nơi cánh rơi chạm nước, cánh đào trôi.
const TAU = Math.PI * 2;

/** Nguyệt môn: vành cổng tròn nét bút lông khô, hở ở hai bên (chỗ cành đào 3D vắt qua). */
export function daoHoaMoonGate() {
  return canvasTexture('dao-hoa-moon-gate', 1024, p => {
    const m = daoHoaMotifs(p);
    m.brushArc(494, 26, Math.PI * 0.58, Math.PI * 1.4, 0.95, 11, 12);
    m.brushArc(494, 24, Math.PI * 1.58, Math.PI * 2.42, 0.95, 23, 12);
    // Nét kép mảnh bên trong, hở lệch nhịp với nét chính như hai lần chấm bút.
    m.brushArc(474, 4, Math.PI * 0.66, Math.PI * 1.08, 0.6, 31, 3);
    m.brushArc(474, 4, Math.PI * 1.68, Math.PI * 2.22, 0.6, 37, 3);
  });
}

/** Quầng trăng cộng sáng (khớp vị trí trăng trong bức thủy mặc). */
export function daoHoaMoonGlow() {
  return canvasTexture('dao-hoa-moon-glow', 512, ({ dot }) => { dot(0, -190, 210, 0.45); dot(0, -190, 125, 0.35); });
}

/** Mặt ao dưới chân (đứng yên): bờ nước lượn hở, các cụm gợn loang, cánh đào rơi rải rác. */
export function daoHoaPond() {
  return canvasTexture('dao-hoa-pond', 1024, p => {
    const { c, stroke } = p, m = daoHoaMotifs(p);
    // Bờ nước: đường lượn không tròn đều, đứt thành bốn nét.
    for (let k = 0; k < 4; k++) stroke(() => {
      for (let i = 0; i <= 40; i++) {
        const a = (k + 0.06 + i / 40 * 0.82) * TAU / 4, r = 470 + 16 * Math.sin(a * 5 + 1) + 9 * Math.sin(a * 13);
        const [x, y] = m.polar(r, a); if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
    }, 2.2 - k * 0.2, 0.75);
    // Gợn loang nơi cánh rơi chạm nước: ba vòng cung hở, nhạt dần ra ngoài.
    for (let i = 0; i < 7; i++) {
      const [x, y] = m.polar(200 + 230 * m.rand(i + 4), i * TAU / 7 + m.rand(i) * 0.6);
      for (let k = 0; k < 3; k++) {
        const a0 = m.rand(i * 9 + k) * TAU;
        stroke(() => c.arc(x, y, 18 + k * 22, a0, a0 + TAU * 0.78), 1.2 - k * 0.25, 0.75 - k * 0.2);
      }
      m.blossom(x, y, 9, 0.8, 0.8, m.rand(i + 2) * 6, false);
    }
    // Vòng gợn lớn quanh chân, hở hai chỗ.
    m.brushArc(236, 6, 0.2, Math.PI * 0.95, 0.65, 51, 4); m.brushArc(236, 6, Math.PI * 1.2, Math.PI * 1.95, 0.65, 53, 4);
    // Cánh đào rải rác trên mặt nước.
    for (let i = 0; i < 44; i++) {
      const [x, y] = m.polar(260 + 200 * m.rand(i + 60), m.rand(i + 70) * TAU);
      c.save(); c.translate(x, y); c.rotate(m.rand(i + 80) * TAU);
      stroke(() => petal(c, 18 + 12 * m.rand(i + 90)), 0.9, 0.7); c.restore();
    }
  });
}

/** Vòng hoa trôi trên ao (quay rất chậm): năm bông đào nổi và cánh vụn quanh chân. */
export function daoHoaDriftingPetals() {
  return canvasTexture('dao-hoa-drifting-petals', 512, p => {
    const { c, stroke, around } = p, m = daoHoaMotifs(p);
    around(5, () => m.blossom(0, -330, 64, 1.5, 0.9, 0.3), 0.2);
    around(5, () => m.leaf(40, -250, 60, 0.9, 1.2, 0.7), 0.2);
    for (let i = 0; i < 30; i++) {
      const [x, y] = m.polar(170 + 290 * m.rand(i + 7), m.rand(i + 17) * TAU);
      c.save(); c.translate(x, y); c.rotate(m.rand(i + 27) * TAU); stroke(() => petal(c, 28 + 14 * m.rand(i + 37)), 1.2, 0.75); c.restore();
    }
  });
}

// ===== Texture billboard =====

/** Cánh đào rơi: một cánh khía tim, gốc nhạt, mép đậm, gân mảnh. */
export function daoHoaPetalSprite() {
  return canvasTexture('dao-hoa-petal-sprite', 128, ({ c, stroke }) => {
    c.translate(0, 470);
    const g = c.createLinearGradient(0, 0, 0, -940);
    g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(0.6, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0.85)');
    c.fillStyle = g; c.beginPath(); petal(c, 940); c.fill();
    stroke(() => { c.moveTo(0, -60); c.lineTo(0, -700); }, 6, 0.5);
  });
}

/** Bông đào nguyên bông nhỏ cho lớp hoa rơi. */
export function daoHoaBlossomSprite() {
  return canvasTexture('dao-hoa-blossom-sprite', 128, ({ c, dot }) => {
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 5; i++) { c.save(); c.rotate(i * TAU / 5); c.beginPath(); petal(c, 480); c.fill(); c.restore(); }
    dot(0, 0, 110, 1);
  });
}

/** Đồng tâm kết: nút thắt hình thoi đan lưới, bốn khuyên tai ở bốn góc. */
export function daoHoaKnotSprite() {
  return canvasTexture('dao-hoa-knot-sprite', 128, ({ c, stroke }) => {
    c.rotate(Math.PI / 4);
    stroke(() => c.rect(-210, -210, 420, 420), 16, 1);
    for (const k of [-1, 0, 1]) {
      stroke(() => { c.moveTo(k * 105, -210); c.lineTo(k * 105, 210); }, 11, 0.9);
      stroke(() => { c.moveTo(-210, k * 105); c.lineTo(210, k * 105); }, 11, 0.9);
    }
    for (const [x, y] of [[-210, -210], [210, -210], [210, 210], [-210, 210]]) {
      stroke(() => c.arc(x * 1.28, y * 1.28, 70, 0, TAU), 12, 0.95);
    }
  });
}
