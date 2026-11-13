import { canvasTexture, CJK_FONT } from './aura-canvas-kit.js';
import { hash } from './aura-billboard-layer.js';

// Texture canvas của Nguyệt Bạch Tri Âm (vẽ một lần, cache dùng chung mọi nhân vật).
// Hệ toạ độ của canvasTexture: tâm (0,0), khung ±512.
const TAU = Math.PI * 2;
const INK = 'rgba(64,86,130,0.62)', INK_SOFT = 'rgba(96,120,165,0.22)';

// Quảng Hàn cung: ba tầng mái cong vút đầu đao, cột, bậc thềm — bóng mực trên mặt trăng.
function palace(c, x, y, s) {
  c.fillStyle = INK; c.strokeStyle = INK; c.lineWidth = 3 * s;
  const roof = (cy, w, h) => {
    c.beginPath(); c.moveTo(x - w * 1.18, cy - h * 0.55);
    c.quadraticCurveTo(x - w * 0.8, cy - h * 0.1, x - w * 0.42, cy - h); c.lineTo(x + w * 0.42, cy - h);
    c.quadraticCurveTo(x + w * 0.8, cy - h * 0.1, x + w * 1.18, cy - h * 0.55);
    c.quadraticCurveTo(x + w * 0.9, cy - h * 0.05, x + w * 0.8, cy); c.lineTo(x - w * 0.8, cy);
    c.quadraticCurveTo(x - w * 0.9, cy - h * 0.05, x - w * 1.18, cy - h * 0.55); c.fill();
  };
  const hall = (cy, w, h) => {
    c.fillRect(x - w * 0.72, cy, w * 1.44, h * 0.12);
    for (let i = 0; i <= 4; i++) c.fillRect(x - w * 0.7 + i * w * 0.35 - 3 * s, cy, 6 * s, h);
  };
  hall(y - 20 * s, 110 * s, 62 * s); roof(y - 20 * s, 110 * s, 38 * s);
  hall(y - 96 * s, 78 * s, 46 * s); roof(y - 96 * s, 78 * s, 32 * s);
  roof(y - 150 * s, 50 * s, 34 * s);
  c.fillRect(x - 7 * s, y - 210 * s, 14 * s, 30 * s); // bảo đỉnh
  for (let i = 0; i < 3; i++) c.fillRect(x - (130 + i * 22) * s, y + 42 * s + i * 11 * s, (260 + i * 44) * s, 7 * s);
}

// Cây quế cung trăng: thân xoắn, cành toả, tán từng cụm tròn, điểm hoa quế vàng.
function osmanthus(c, x, y, s) {
  c.strokeStyle = INK; c.lineCap = 'round';
  const limb = (pts, w) => { c.lineWidth = w * s; c.beginPath(); c.moveTo(x + pts[0] * s, y + pts[1] * s);
    c.bezierCurveTo(...pts.slice(2).map((v, i) => (i % 2 ? y : x) + v * s)); c.stroke(); };
  limb([0, 0, -30, -90, 40, -160, 10, -250], 22);
  limb([8, -170, 60, -200, 100, -230, 130, -290], 10);
  limb([0, -210, -50, -240, -80, -260, -110, -300], 9);
  limb([12, -120, 60, -130, 90, -150, 120, -170], 7);
  const crowns = [[10, -300, 70], [-90, -300, 52], [120, -300, 56], [130, -190, 46], [-40, -240, 48], [70, -240, 50]];
  for (const [cx, cy, r] of crowns) {
    c.fillStyle = INK_SOFT; c.beginPath(); c.arc(x + cx * s, y + cy * s, r * s, 0, TAU); c.fill();
    c.fillStyle = 'rgba(70,92,138,0.3)';
    for (let k = 0; k < 7; k++) { const a = k * 0.9 + cx; c.beginPath(); c.arc(x + (cx + Math.cos(a) * r * 0.6) * s, y + (cy + Math.sin(a) * r * 0.6) * s, r * 0.32 * s, 0, TAU); c.fill(); }
  }
  c.fillStyle = 'rgba(214,176,92,0.9)';
  for (let i = 0; i < 60; i++) {
    const [cx, cy, r] = crowns[i % crowns.length], a = hash(i + 40) * TAU, d = Math.sqrt(hash(i + 41)) * r;
    c.beginPath(); c.arc(x + (cx + Math.cos(a) * d) * s, y + (cy + Math.sin(a) * d) * s, 3.2 * s, 0, TAU); c.fill();
  }
}

/** Mặt trăng (màu thật): ngọc trai sáng lệch trên-trái, biển trăng lam mờ, Quảng Hàn cung, cây quế. */
export function nguyetBachMoonFace() {
  return canvasTexture('nguyet-bach-moon-face', 1024, ({ c }) => {
    const R = 508, g = c.createRadialGradient(-130, -150, 30, 0, 0, R);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#f0f5fc'); g.addColorStop(0.88, '#d3def0'); g.addColorStop(1, '#b4c4e0');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.arc(0, 0, R - 6, 0, TAU); c.clip();
    for (let i = 0; i < 11; i++) {
      const x = (hash(i + 1) - 0.5) * 760, y = (hash(i + 2) - 0.5) * 760, r = 60 + hash(i + 3) * 120;
      const b = c.createRadialGradient(x, y, 4, x, y, r);
      b.addColorStop(0, 'rgba(150,170,208,0.22)'); b.addColorStop(1, 'rgba(150,170,208,0)');
      c.fillStyle = b; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    palace(c, -170, 250, 1);
    osmanthus(c, 210, 330, 0.95);
    // Mây mỏng vắt ngang chân cung điện.
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 7;
    for (const [x, y, w] of [[-330, 310, 260], [-60, 345, 220]]) {
      c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + w * 0.3, y - 30, x + w * 0.6, y + 26, x + w, y - 6); c.stroke();
      c.beginPath(); c.arc(x + w, y - 26, 20, Math.PI * 0.5, Math.PI * 2.1); c.stroke();
    }
    c.restore();
  });
}

/** Quầng trăng: đốm sáng trắng mềm (lớp cộng màu sau trăng). */
export function nguyetBachMoonGlow() {
  return canvasTexture('nguyet-bach-moon-glow', 256, ({ dot }) => { dot(0, 0, 510, 1); dot(0, 0, 300, 0.6); });
}

/** Dải mây bạc vắt chéo dưới trăng (nét trắng cho emblem kit, có lớp mực). */
export function nguyetBachCloudBand() {
  return canvasTexture('nguyet-bach-cloud-band', 1024, ({ stroke, cloud, c }) => {
    for (const [y, w, a] of [[150, 2.4, 0.95], [190, 1.4, 0.7], [118, 1, 0.5]]) {
      stroke(() => { c.moveTo(-500, y + 40); c.bezierCurveTo(-250, y - 40, 0, y + 50, 250, y - 10); c.bezierCurveTo(360, y - 30, 440, y + 10, 500, y - 20); }, w, a);
    }
    for (const [x, y, s] of [[-330, 150, 2.6], [-80, 165, 3.2], [170, 140, 2.4], [380, 125, 2]]) cloud(x, y, s, 1.6, 0.9);
  });
}

/** Atlas 2×2 nốt nhạc cổ cầm (giảm tự phổ): 勾 挑 散 泛, chữ trắng có quầng. */
export function nguyetBachNotes() {
  return canvasTexture('nguyet-bach-notes', 512, ({ c }) => {
    c.font = `300px ${CJK_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#fff'; c.shadowBlur = 18; c.fillStyle = '#fff';
    ['勾', '挑', '散', '泛'].forEach((ch, i) => c.fillText(ch, (i % 2 ? 256 : -256), (i < 2 ? 256 : -256)));
  });
}

/** Sương mỏng: cụm đốm mềm (normal blend, phủ mép gương nước). */
export function nguyetBachMist() {
  return canvasTexture('nguyet-bach-mist', 256, ({ dot }) => {
    for (let i = 0; i < 7; i++) dot((hash(i + 70) - 0.5) * 520, (hash(i + 71) - 0.5) * 220, 200 + hash(i + 72) * 120, 0.5);
  });
}

/** Lạc khoản mặt sau đàn (màu thật): "高山流水" khắc vàng ngà dọc thân, triện đỏ 知音. */
export function nguyetBachInscription() {
  return canvasTexture('nguyet-bach-inscription', 512, ({ c }) => {
    c.font = `92px ${CJK_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#ecdcaa'; c.shadowColor = 'rgba(236,220,170,0.6)'; c.shadowBlur = 6;
    ['高', '山', '流', '水'].forEach((ch, i) => c.fillText(ch, 0, -330 + i * 120));
    c.shadowBlur = 0; c.fillStyle = '#b8323a'; c.fillRect(-58, 180, 116, 116);
    c.fillStyle = '#fff3e8'; c.font = `50px ${CJK_FONT}`; c.fillText('知', 0, 212); c.fillText('音', 0, 266);
  });
}
