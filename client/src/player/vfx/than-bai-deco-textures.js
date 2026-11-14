import { canvasTexture } from './aura-canvas-kit.js';
import { drawSuit } from '../../scene/card-suit-paths.js';

// Texture Art Deco của Thần bài (vẽ canvas, cache dùng chung). Hệ toạ độ canvasTexture: tâm (0,0), khung ±512.
// Nguyên tắc: hình học đối xứng, vàng trên nền trong suốt (shader tự lót sơn mài đen), nét dài–ngắn xen kẽ,
// nhiều khoảng trống — không vẽ chi tiết vụn.
const GOLD = '#e9b844';

/** Đĩa medallion dưới chân: các vòng bậc, tia nắng dài ngắn xen kẽ, vòng chữ V, bốn chất ở bốn hướng, hạt thoi. */
export function decoMedallionTexture() {
  return canvasTexture('than-bai-deco-medallion', 1024, ({ c }) => {
    c.strokeStyle = GOLD; c.fillStyle = GOLD; c.lineCap = 'butt';
    const ring = (r, w) => { c.lineWidth = w; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); };
    // Vòng bậc ngoài: viền đôi kiểu khung cửa Art Deco.
    ring(500, 10); ring(478, 3); ring(400, 6); ring(388, 2);
    // Vòng chữ V giữa hai viền.
    for (let i = 0; i < 48; i++) {
      c.save(); c.rotate(i * Math.PI * 2 / 48);
      c.lineWidth = 4; c.beginPath(); c.moveTo(-18, -470); c.lineTo(0, -410); c.lineTo(18, -470); c.stroke();
      c.restore();
    }
    // Tia nắng dài ngắn xen kẽ từ vòng trong ra.
    for (let i = 0; i < 32; i++) {
      const long = i % 2 === 0, r0 = 150, r1 = long ? 380 : 300, half = long ? 0.028 : 0.018;
      c.save(); c.rotate(i * Math.PI * 2 / 32);
      c.beginPath(); c.moveTo(-Math.sin(half) * r0, -r0); c.lineTo(0, -r1); c.lineTo(Math.sin(half) * r0, -r0); c.closePath(); c.fill();
      c.restore();
    }
    ring(150, 8); ring(132, 2); ring(60, 4);
    // Bốn chất ở bốn hướng trên vòng bậc, hạt thoi ở bốn góc chéo.
    [0, 3, 1, 2].forEach((suit, i) => {
      c.save(); c.rotate(i * Math.PI / 2);
      c.fillStyle = '#0d0a0c'; c.beginPath(); c.arc(0, -440, 44, 0, Math.PI * 2); c.fill();
      c.lineWidth = 4; c.strokeStyle = GOLD; c.stroke();
      drawSuit(c, suit, 0, -440, 56, i % 2 ? '#d11f35' : GOLD);
      c.restore();
    });
    for (let i = 0; i < 4; i++) {
      c.save(); c.rotate(Math.PI / 4 + i * Math.PI / 2);
      c.beginPath(); c.moveTo(0, -470); c.lineTo(14, -440); c.lineTo(0, -410); c.lineTo(-14, -440); c.closePath(); c.fill();
      c.restore();
    }
  });
}

/** Sao lóe bốn cánh: lõi trắng, hai gai dài ngang dọc, hai gai chéo ngắn, quầng mềm. */
export function starFlareTexture() {
  return canvasTexture('than-bai-star-flare', 256, ({ c }) => {
    const halo = c.createRadialGradient(0, 0, 0, 0, 0, 260);
    halo.addColorStop(0, 'rgba(255,255,255,1)'); halo.addColorStop(0.15, 'rgba(255,240,200,.55)'); halo.addColorStop(1, 'rgba(255,220,150,0)');
    c.fillStyle = halo; c.beginPath(); c.arc(0, 0, 260, 0, Math.PI * 2); c.fill();
    const spike = (len, w, rot, a) => {
      c.save(); c.rotate(rot);
      const g = c.createLinearGradient(0, -len, 0, len);
      g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(0.5, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -len); c.lineTo(w, 0); c.lineTo(0, len); c.lineTo(-w, 0); c.closePath(); c.fill();
      c.restore();
    };
    spike(510, 26, 0, 1); spike(510, 26, Math.PI / 2, 1); spike(260, 14, Math.PI / 4, 0.6); spike(260, 14, -Math.PI / 4, 0.6);
  });
}
