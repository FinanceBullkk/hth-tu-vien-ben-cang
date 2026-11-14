import { canvasTexture } from './aura-canvas-kit.js';

// Texture của hào quang Vua câu cá, vẽ canvas có màu sẵn (tint trắng khi dùng), cache dùng chung.
// Hệ toạ độ canvasTexture: tâm (0,0), khung ±512.
const GOLD = '#f2b632', GOLD_HI = '#ffe39a', AQUA = '#5fe3f0', FOAM = '#e9fdff';

// Atlas cá: 1 cột × 2 hàng (ô 1024×512, tỉ lệ 2:1), đầu cá quay về +x (bên phải ô).
export const FISH_ATLAS = { cols: 1, rows: 2 };
export const FISH_CELLS = { goldCarp: 0, silver: 1 };

function fish(c, body, belly, fin, scale) {
  // Đuôi chẻ đôi.
  c.beginPath(); c.moveTo(-250, 0);
  c.quadraticCurveTo(-330, -40, -430, -150); c.quadraticCurveTo(-380, -20, -400, 0);
  c.quadraticCurveTo(-380, 20, -430, 150); c.quadraticCurveTo(-330, 40, -250, 0);
  c.fillStyle = fin; c.fill();
  // Vây lưng và vây bụng.
  c.beginPath(); c.moveTo(-120, -120); c.quadraticCurveTo(0, -230, 120, -128); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-40, 110); c.quadraticCurveTo(10, 190, 70, 112); c.closePath(); c.fill();
  // Thân thoi: lưng đậm, bụng sáng.
  c.beginPath(); c.moveTo(330, 0);
  c.bezierCurveTo(260, -150, -80, -170, -260, -20); c.lineTo(-260, 20);
  c.bezierCurveTo(-80, 170, 260, 150, 330, 0); c.closePath();
  const g = c.createLinearGradient(0, -150, 0, 150);
  g.addColorStop(0, body); g.addColorStop(0.55, belly); g.addColorStop(1, '#fffdf4');
  c.fillStyle = g; c.fill();
  c.lineWidth = 8; c.strokeStyle = scale; c.stroke();
  // Vảy hình vòng cung.
  c.save(); c.clip(); c.lineWidth = 4; c.strokeStyle = scale; c.globalAlpha = 0.45;
  for (let x = -220; x < 240; x += 52) for (let y = -130; y < 140; y += 52) {
    c.beginPath(); c.arc(x + (Math.round(y / 52) % 2) * 26, y, 30, -Math.PI / 2, Math.PI / 2); c.stroke();
  }
  c.restore();
  // Mang, mắt, râu.
  c.beginPath(); c.arc(190, 0, 90, -0.9, 0.9); c.lineWidth = 6; c.strokeStyle = scale; c.stroke();
  c.beginPath(); c.arc(250, -40, 22, 0, Math.PI * 2); c.fillStyle = '#14100c'; c.fill();
  c.beginPath(); c.arc(256, -46, 7, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
}

/** Atlas hai loài: cá chép vàng (ô 0) và cá bạc ánh lam (ô 1). */
export function fishAtlas() {
  return canvasTexture('vua-cau-ca-fish', 1024, ({ c }) => {
    c.save(); c.translate(0, -256); c.scale(0.95, 0.95);
    fish(c, '#e07a10', GOLD, '#ffb43a', '#8a3d05');
    c.restore();
    c.save(); c.translate(0, 256); c.scale(0.95, 0.95);
    fish(c, '#2c6f9a', '#9fd8ef', '#7fc6e6', '#123f5c');
    c.restore();
  });
}

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
