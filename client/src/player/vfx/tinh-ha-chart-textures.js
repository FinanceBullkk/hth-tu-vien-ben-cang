import { canvasTexture } from './aura-canvas-kit.js';

// Bàn tinh đồ (thiên văn đồ) dưới chân Tinh Hà, theo dáng bàn astrolabe cổ: vòng hoàng đạo lệch
// tâm, vạch độ, chòm sao chấm-nối, khung sao kim chỉ. Chỉ MỘT vòng chữ là Nhị Thập Bát Tú; không bát
// quái. Đơn vị px trong khung 1024 (bán kính 512).
export const XIU = '角亢氐房心尾箕斗牛女虛危室壁奎婁胃昴畢觜參井鬼柳星張翼軫';
// Chòm sao nhỏ (toạ độ px quanh gốc đã dời): nối liền theo thứ tự, sao đầu sáng nhất.
const ASTERISMS = [
  [[-40, 12], [-16, -16], [12, -6], [38, -30]],
  [[-34, 20], [-10, -4], [18, 8], [30, -22], [6, -36]],
  [[-30, -18], [0, -32], [30, -18], [14, 18], [-14, 18], [-30, -18]],
  [[-38, 0], [-12, -22], [14, -10], [38, 14], [12, 28]],
];

/** Bút riêng của tinh đồ, dựng trên bút chung của aura-canvas-kit. */
function chartPen(p) {
  const { c, stroke } = p;
  const starDot = (x, y, r, a = 1) => {
    c.save(); c.globalAlpha = a; c.shadowColor = '#fff'; c.shadowBlur = r * 3;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.restore();
  };
  return {
    starDot,
    /** Chòm sao chấm-nối đặt ở bán kính r (trong khung đã xoay), co giãn s. */
    asterism(k, r, s = 1, alpha = 0.6) {
      const pts = ASTERISMS[k % ASTERISMS.length].map(([x, y]) => [x * s, y * s - r]);
      stroke(() => pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))), 0.7, alpha * 0.8);
      pts.forEach(([x, y], i) => starDot(x, y, i ? 3.5 * s : 5.5 * s, alpha + 0.3));
    },
    /** Vòng hoàng đạo lệch tâm (tâm 0,cy) kèm vạch chia — dáng nhận diện của bàn tinh đồ. */
    ecliptic(cy, R, ticks, width = 1.2, alpha = 0.8) {
      stroke(() => c.arc(0, cy, R, 0, Math.PI * 2), width, alpha);
      stroke(() => c.arc(0, cy, R - 16, 0, Math.PI * 2), width * 0.5, alpha * 0.6);
      for (let i = 0; i < ticks; i++) {
        const a = i / ticks * Math.PI * 2, x = Math.sin(a), y = -Math.cos(a), d = i % 3 ? 7 : 15;
        stroke(() => { c.moveTo(x * R, cy + y * R); c.lineTo(x * (R - d), cy + y * (R - d)); }, 0.6, alpha * 0.7);
      }
    },
    /** Vạch độ quanh tâm từ r0 vào trong; mỗi `major` vạch có một vạch dài. */
    ticks(n, r0, len, major = 5, alpha = 0.6) {
      p.around(n, i => stroke(() => { c.moveTo(0, -r0); c.lineTo(0, -r0 + (i % major ? len : len * 2.2)); }, 0.7, alpha));
    },
    /** Sao bốn cánh nét mảnh (hình thoi lõm) ở bán kính r. */
    sparkle(r, s, alpha = 0.85) {
      stroke(() => {
        c.moveTo(0, -r - s); c.quadraticCurveTo(0, -r, s * 0.7, -r); c.quadraticCurveTo(0, -r, 0, -r + s);
        c.quadraticCurveTo(0, -r, -s * 0.7, -r); c.quadraticCurveTo(0, -r, 0, -r - s);
      }, 1, alpha);
    },
  };
}

/** Bàn tinh đồ ngoài (đứng yên): vành 28 tú, sao định vị từng tú, hoàng đạo lệch tâm, vạch độ,
    bảy chòm sao chấm-nối và lưới sao thất giác mờ. */
export function tinhHaSealOuter() {
  return canvasTexture('tinh-ha-seal-outer', 1024, p => {
    const { ring, around, star, glyph, diamond } = p, k = chartPen(p);
    ring(505, 1); ring(494, 2); ring(448, 1.2); ring(438, 0.8, 0.6);
    around(28, i => glyph(XIU[i], 471, 28, 0.9));
    around(28, () => diamond(471, 6, 1), 0.5);
    around(28, () => k.starDot(0, -428, 3, 0.85));
    k.ticks(140, 418, 7, 5, 0.5); ring(418, 1);
    star(7, 3, 400, 0.7, 0.2); star(14, 5, 330, 0.5, 0.14);
    k.ecliptic(-80, 300, 72, 1.3, 0.7);
    around(7, i => k.asterism(i, 300, 1.15, 0.55), 0.5);
    around(14, () => k.sparkle(372, 12), 0.25);
    ring(190, 1.2); ring(180, 0.7, 0.6);
  });
}

/** Khung sao kim chỉ (rete) quay ngược trận ngoài: chín mũi lửa chỉ sao + hoàng đạo lệch tâm. */
export function tinhHaSealInner() {
  return canvasTexture('tinh-ha-seal-inner', 512, p => {
    const { c, stroke, ring, around, glyph } = p, k = chartPen(p);
    around(9, () => {
      stroke(() => { c.moveTo(-16, -150); c.quadraticCurveTo(-34, -290, 0, -384); c.quadraticCurveTo(-8, -280, 16, -150); }, 1.6, 0.85);
      k.starDot(0, -398, 9, 1);
    });
    k.ecliptic(-60, 250, 36, 1.8, 0.8);
    ring(420, 2.2); ring(440, 1, 0.7); ring(130, 2);
    glyph('斗', 0, 150, 0.85);
  });
}
