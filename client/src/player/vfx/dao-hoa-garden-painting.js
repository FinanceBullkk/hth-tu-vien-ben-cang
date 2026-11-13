import { canvasTexture, CJK_FONT } from './aura-canvas-kit.js';

// Bức thủy mặc nhìn qua nguyệt môn — thứ không aura nào khác có: trời hồng ngà, trăng tròn treo
// trên đầu nhân vật, ba lớp núi xa nhạt dần, dải sương, rừng đào li ti trên sườn núi, đôi chim yến.
// Vẽ màu thật (không tô lại bằng shader), cắt tròn khít trong vành cổng (r 468 / 512).
const TAU = Math.PI * 2;
const ridgeY = (x, base, amp, seed) =>
  base - amp * (0.55 * Math.sin(x * 0.008 + seed) + 0.3 * Math.sin(x * 0.021 + seed * 2.3) + 0.15 * Math.sin(x * 0.047 + seed * 5.1));

export function daoHoaGardenView() {
  return canvasTexture('dao-hoa-garden-view', 1024, ({ c }) => {
    c.save(); c.beginPath(); c.arc(0, 0, 468, 0, TAU); c.clip();
    // Trời: hồng ngà quanh trăng, nhạt dần ra vành.
    let g = c.createRadialGradient(0, -180, 40, 0, -60, 480);
    g.addColorStop(0, 'rgba(255,241,232,0.7)'); g.addColorStop(0.55, 'rgba(250,210,224,0.45)'); g.addColorStop(1, 'rgba(240,180,204,0.25)');
    c.fillStyle = g; c.fillRect(-512, -512, 1024, 1024);
    // Trăng tròn ngà phía trên đầu nhân vật.
    g = c.createRadialGradient(0, -190, 0, 0, -190, 118);
    g.addColorStop(0, 'rgba(255,251,242,0.95)'); g.addColorStop(0.82, 'rgba(255,244,232,0.88)'); g.addColorStop(1, 'rgba(255,240,230,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, -190, 118, 0, TAU); c.fill();
    // Ba lớp núi xa → gần, chân núi tan vào sương.
    const ridges = [[40, 80, 1, '176,122,152', 0.42], [150, 64, 4, '150,92,124', 0.55], [262, 52, 7, '118,62,94', 0.68]];
    for (const [base, amp, seed, rgb, a] of ridges) {
      g = c.createLinearGradient(0, base - amp * 1.2, 0, base + 160);
      g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.beginPath(); c.moveTo(-520, 520);
      for (let x = -520; x <= 520; x += 16) c.lineTo(x, ridgeY(x, base, amp, seed));
      c.lineTo(520, 520); c.closePath(); c.fill();
      // Dải sương trắng vắt ngang chân núi.
      g = c.createLinearGradient(0, base + 10, 0, base + 70);
      g.addColorStop(0, 'rgba(255,248,244,0)'); g.addColorStop(0.5, 'rgba(255,248,244,0.32)'); g.addColorStop(1, 'rgba(255,248,244,0)');
      c.fillStyle = g; c.fillRect(-520, base + 10, 1040, 60);
    }
    // Rừng đào li ti trên sườn núi giữa: thân mảnh + tán hồng.
    for (let i = 0; i < 28; i++) {
      const x = -450 + i * 33 + 10 * Math.sin(i * 7.3), y = ridgeY(x, 150, 64, 4) + 8 + 6 * Math.sin(i * 3.1), r = 12 + 6 * Math.abs(Math.sin(i * 1.7));
      c.strokeStyle = 'rgba(110,60,80,0.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + r * 1.4); c.lineTo(x, y); c.stroke();
      g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,170,202,0.9)'); g.addColorStop(1, 'rgba(255,176,204,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    // Đôi chim yến bay ngang trăng.
    c.strokeStyle = 'rgba(96,52,72,0.6)'; c.lineWidth = 3;
    for (const [x, y, s] of [[-230, -250, 1], [-175, -222, 0.75]]) {
      c.beginPath(); c.moveTo(x - 22 * s, y - 6 * s); c.quadraticCurveTo(x - 8 * s, y - 2 * s, x, y + 6 * s);
      c.quadraticCurveTo(x + 8 * s, y - 2 * s, x + 24 * s, y - 10 * s); c.stroke();
    }
    c.restore();
  });
}

/** Biển đề trên đỉnh nguyệt môn: khung gỗ hồng gụ viền mơ, hai chữ 桃源 (Đào Nguyên) màu ngà.
    Khung vuông được dán lên tấm 0.62 × 0.23 m nên chữ vẽ giãn dọc PLAQUE_STRETCH lần để ra đúng tỉ lệ. */
export const PLAQUE_SIZE = [0.62, 0.23];
const PLAQUE_STRETCH = PLAQUE_SIZE[0] / PLAQUE_SIZE[1];
export function daoHoaPlaque() {
  return canvasTexture('dao-hoa-plaque', 512, ({ c }) => {
    c.fillStyle = 'rgba(112,44,70,0.92)'; c.fillRect(-512, -512, 1024, 1024);
    c.strokeStyle = 'rgba(255,205,176,0.95)'; c.lineWidth = 22; c.strokeRect(-492, -460, 984, 920);
    c.lineWidth = 8; c.strokeRect(-452, -330, 904, 660);
    c.scale(1, PLAQUE_STRETCH);
    c.fillStyle = 'rgba(255,243,232,1)'; c.font = `150px ${CJK_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(255,190,210,1)'; c.shadowBlur = 10; c.fillText('桃 源', 0, 4);
  });
}
