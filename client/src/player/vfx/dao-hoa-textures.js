import { canvasTexture, CJK_FONT } from './aura-canvas-kit.js';
import { daoHoaMotifs, petalPath as petal } from './dao-hoa-canvas-motifs.js';

// Texture của Đào Hoa (nguyệt môn kiến trúc, không mandala/vòng chữ/trận đồ). Đơn vị px khung 1024.
const TAU = Math.PI * 2;

/** Hoa văn chạm trên mặt trước vòng cổng ngọc (mặt phẳng 2.6 m — mặt cổng nằm ở r ≈ 410–492 px):
    hai rãnh chỉ, dây hoa đào nổi chạy vòng, lá non xen giữa. Nét trắng, shader tô màu. */
export function daoHoaGateCarving() {
  return canvasTexture('dao-hoa-gate-carving', 1024, p => {
    const { ring, around, stroke, c } = p, m = daoHoaMotifs(p);
    ring(420, 1.1, 0.8); ring(484, 1.1, 0.8);
    around(20, () => m.blossom(0, -452, 15, 1, 0.9, 0.2, false));
    around(20, () => {
      stroke(() => c.arc(0, -478, 52, Math.PI * 0.42, Math.PI * 0.58), 0.9, 0.6);
      m.leaf(-10, -446, 18, -1.2, 0.8, 0.7); m.leaf(10, -458, 16, 1.6, 0.8, 0.7);
    }, 0.5);
  });
}

/** Biển đề trên đỉnh cổng: gỗ hồng gụ viền mơ, hai chữ 桃源 màu ngà. Khung vuông dán lên tấm
    PLAQUE_SIZE nên chữ vẽ giãn dọc cho đúng tỉ lệ. */
export const PLAQUE_SIZE = [0.56, 0.21];
export function daoHoaPlaque() {
  return canvasTexture('dao-hoa-plaque', 512, ({ c }) => {
    c.fillStyle = 'rgba(112,44,70,0.95)'; c.fillRect(-512, -512, 1024, 1024);
    c.strokeStyle = 'rgba(255,205,176,0.95)'; c.lineWidth = 22; c.strokeRect(-492, -460, 984, 920);
    c.lineWidth = 8; c.strokeRect(-452, -330, 904, 660);
    c.scale(1, PLAQUE_SIZE[0] / PLAQUE_SIZE[1]);
    c.fillStyle = 'rgba(255,243,232,1)'; c.font = `150px ${CJK_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(255,190,210,1)'; c.shadowBlur = 10; c.fillText('桃 源', 0, 4);
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
