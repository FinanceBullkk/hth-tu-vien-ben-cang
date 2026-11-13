import { canvasTexture } from './aura-canvas-kit.js';
import { WING, PRIMARIES, SECONDARIES, COVERTS } from './hong-lien-wing-frame.js';

// Hoa văn riêng của Chu Tước Hồng Liên. Đơn vị px trong khung 1024 (bán kính 512), góc 0 hướng lên.
// Cố ý KHÔNG có đĩa mandala, vòng tròn sau lưng, vành chữ hay bát quái (khuôn của Kiếm Vũ):
//  quầng cánh vẽ theo đúng bố cục lông cánh; dưới chân là đóa sen lửa nhìn từ trên xuống,
//  viền ngoài là mũi cánh sen chứ không phải vòng tròn.

// Cánh sen nhọn từ r0 tới r1, rộng w, kèm gân lông vũ chéo hai bên trục.
function lotusPetal(p, r0, r1, w, width, alpha, barbs = 6, fill = 0) {
  const { c, stroke } = p, len = r1 - r0;
  if (fill) {
    // Lòng cánh tô lửa: đậm ở chân, nhạt dần ra mũi.
    const g = c.createLinearGradient(0, -r0, 0, -r1);
    g.addColorStop(0, `rgba(255,255,255,${fill})`); g.addColorStop(1, 'rgba(255,255,255,0.02)');
    c.save(); c.fillStyle = g; c.beginPath(); c.moveTo(0, -r0);
    c.bezierCurveTo(w * 1.2, -(r0 + len * 0.3), w * 0.9, -(r0 + len * 0.75), 0, -r1);
    c.bezierCurveTo(-w * 0.9, -(r0 + len * 0.75), -w * 1.2, -(r0 + len * 0.3), 0, -r0); c.fill(); c.restore();
  }
  stroke(() => {
    c.moveTo(0, -r0); c.bezierCurveTo(w * 1.2, -(r0 + len * 0.3), w * 0.9, -(r0 + len * 0.75), 0, -r1);
    c.bezierCurveTo(-w * 0.9, -(r0 + len * 0.75), -w * 1.2, -(r0 + len * 0.3), 0, -r0);
  }, width, alpha);
  stroke(() => { c.moveTo(0, -(r0 + len * 0.08)); c.lineTo(0, -(r1 - len * 0.1)); }, width * 0.6, alpha * 0.8);
  for (let i = 1; i <= barbs; i++) {
    const y = r0 + len * (0.12 + 0.72 * i / (barbs + 1)), half = w * 0.85 * Math.sin(Math.PI * (y - r0) / len);
    for (const s of [-1, 1]) stroke(() => { c.moveTo(0, -y); c.quadraticCurveTo(s * half * 0.5, -(y + 6), s * half, -(y + 18)); }, width * 0.4, alpha * 0.5);
  }
}

/** Đóa hồng liên dưới chân (nhìn từ trên): 16 cánh ngoài + 12 cánh giữa xen kẽ, mép ngoài là mũi cánh. */
export function hongLienBloom() {
  return canvasTexture('hong-lien-bloom', 1024, p => {
    p.around(16, () => lotusPetal(p, 180, 505, 70, 1.6, 0.85, 7, 0.32));
    p.around(12, () => lotusPetal(p, 150, 390, 58, 1.3, 0.7, 5, 0.4), 0.5);
    p.around(32, () => p.stroke(() => { p.c.moveTo(0, -470); p.c.quadraticCurveTo(10, -490, 0, -508); }, 0.8, 0.4), 0.25);
  });
}

/** Lõi sen quay ngược: 8 cánh trong + đài gương sen có hạt. */
export function hongLienBloomInner() {
  return canvasTexture('hong-lien-bloom-inner', 512, p => {
    const { ring, around, stroke, c } = p;
    around(8, () => lotusPetal(p, 170, 500, 90, 2.2, 0.85, 5, 0.45));
    ring(165, 2.4); ring(150, 1, 0.6);
    for (const [x, y] of [[0, 0], ...Array.from({ length: 6 }, (_, i) => [Math.sin(i * Math.PI / 3) * 90, -Math.cos(i * Math.PI / 3) * 90])]) {
      stroke(() => c.arc(x, y, 22, 0, Math.PI * 2), 1.6, 0.85);
    }
  });
}

/** Quầng sáng đóa sen: đốm mềm ở mũi 16 cánh ngoài và lõi. */
export function hongLienBloomGlow() {
  return canvasTexture('hong-lien-bloom-glow', 512, ({ dot }) => {
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; dot(Math.sin(a) * 430, -Math.cos(a) * 430, 40, 0.7); }
    dot(0, 0, 200, 0.5);
  });
}

// Quầng cánh: gốc vai đặt tại WING_GLOW_ROOT (px) trong khung 1024; 320 px = 1 m khi mặt phẳng rộng 3.2 m.
export const WING_GLOW_ROOT = [-440, 200], WING_GLOW_SIZE = 3.2;
/** Quầng lửa mềm theo đúng bố cục lông cánh phải ở tư thế gốc (bên trái lật gương). */
export function hongLienWingGlow() {
  return canvasTexture('hong-lien-wing-glow', 512, ({ c, stroke, dot }) => {
    const px = 1024 / WING_GLOW_SIZE, [rx, ry] = WING_GLOW_ROOT;
    const ax = Math.sin(WING.base), ay = -Math.cos(WING.base);
    for (const [s, ang, len] of [...PRIMARIES, ...SECONDARIES, ...COVERTS]) {
      const x0 = rx + ax * s * WING.arm * px, y0 = ry + ay * s * WING.arm * px;
      const x1 = x0 + Math.sin(ang) * len * px * 0.92, y1 = y0 - Math.cos(ang) * len * px * 0.92;
      stroke(() => { c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + 12, (y0 + y1) / 2 - 12, x1, y1); }, 7, 0.22);
    }
    dot(rx + ax * 0.5 * px, ry + ay * 0.5 * px, 170, 0.35);
  });
}
