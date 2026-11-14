import { canvasTexture } from './aura-canvas-kit.js';

// Texture của hào quang Vua câu cá, vẽ canvas có màu sẵn (tint trắng khi dùng), cache dùng chung.
// Hệ toạ độ canvasTexture: tâm (0,0), khung ±512.
const GOLD = '#f2b632', GOLD_HI = '#ffe39a', AQUA = '#5fe3f0', FOAM = '#e9fdff';

/** Trận biển dưới chân: vành sóng vảy (seigaiha), tám lưỡi câu vàng, chữ 漁王, la bàn tám hướng. */
export function seaSealTexture() {
  return canvasTexture('vua-cau-ca-sea-seal', 1024, ({ c, around, ring, star, glyph }) => {
    const disc = c.createRadialGradient(0, 0, 60, 0, 0, 500);
    disc.addColorStop(0, 'rgba(18,96,128,.85)'); disc.addColorStop(0.8, 'rgba(9,56,80,.85)'); disc.addColorStop(1, 'rgba(9,56,80,0)');
    c.fillStyle = disc; c.beginPath(); c.arc(0, 0, 500, 0, Math.PI * 2); c.fill();
    // Vành sóng vảy: ba lớp bán nguyệt lồng nhau, xếp quanh vòng.
    c.strokeStyle = FOAM; c.lineWidth = 4;
    around(40, () => {
      for (const r of [34, 22, 10]) { c.beginPath(); c.arc(0, -440, r, Math.PI, 0); c.stroke(); }
    });
    c.strokeStyle = GOLD;
    ring(480, 2.2); ring(400, 2); ring(388, 1, 0.6);
    // Tám lưỡi câu vàng hướng ra ngoài.
    around(8, () => {
      c.save(); c.lineWidth = 12; c.strokeStyle = GOLD_HI; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -250); c.lineTo(0, -340); c.arc(-26, -250, 26, 0, Math.PI * 0.95); c.stroke();
      c.beginPath(); c.moveTo(-52, -252); c.lineTo(-40, -276); c.stroke();
      c.beginPath(); c.arc(0, -350, 12, 0, Math.PI * 2); c.stroke();
      c.restore();
    }, 0.5);
    c.strokeStyle = AQUA;
    ring(220, 1.6, 0.9); star(8, 3, 205, 1.2, 0.7);
    c.fillStyle = GOLD_HI;
    glyph('漁', 120, 150, 1);
    c.save(); c.rotate(Math.PI); glyph('王', 120, 150, 1); c.restore();
    c.fillStyle = AQUA;
    ['東', '南', '西', '北'].forEach((ch, i) => { c.save(); c.rotate(Math.PI / 4 + i * Math.PI / 2); glyph(ch, 315, 64, 0.85); c.restore(); });
  });
}

/** Gợn nước: vòng trắng mảnh, mép mềm (tô màu bằng tint). */
export function rippleTexture() {
  return canvasTexture('vua-cau-ca-ripple', 256, ({ c }) => {
    for (const [r, w, a] of [[430, 40, 0.25], [430, 14, 0.9], [330, 8, 0.45]]) {
      c.globalAlpha = a; c.lineWidth = w; c.strokeStyle = '#fff';
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = 1;
  });
}

/** Bọt nước: vòng trong suốt có đốm sáng ở góc. */
export function bubbleTexture() {
  return canvasTexture('vua-cau-ca-bubble', 128, ({ c }) => {
    const g = c.createRadialGradient(0, 0, 250, 0, 0, 470);
    g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(0.85, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 470, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(-170, -170, 90, 0, Math.PI * 2); c.fill();
  });
}
