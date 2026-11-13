// Họa tiết bàn bầu cua vẽ bằng canvas: mặt xúc xắc và tấm bạt 3×2 như bạt bầu cua ngoài chợ Tết.
// Không dùng ảnh ngoài (CSP chỉ cho cùng nguồn); emoji vẽ bằng font hệ thống, tên in kèm để máy thiếu font vẫn đọc được.
import * as THREE from 'three';
import { BAUCUA_SYMBOLS } from '../../../shared/baucua.js';

const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
const SERIF = '"Palatino Linotype", "Book Antiqua", Georgia, serif';

// Camera khoá nhìn thẳng bàn nên bạt chiếm gần cả màn hình: vẽ gấp đôi số điểm ảnh để emoji và chữ không nhoè.
const SCALE = 2;

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Canvas có kích thước logic w×h nhưng thật sự nhiều điểm ảnh gấp SCALE lần mỗi chiều. */
function scaledCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w * SCALE;
  canvas.height = h * SCALE;
  return canvas;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Mặt xúc xắc: nền ngà, viền màu của con vật, biểu tượng chiếm gần hết mặt. */
export function diceFaceTexture(symbol) {
  const s = BAUCUA_SYMBOLS[symbol];
  const canvas = scaledCanvas(128, 128);
  const g = canvas.getContext('2d');
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  g.fillStyle = '#efe4c8';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#fbf5e6';
  roundRect(g, 8, 8, 112, 112, 18);
  g.fill();
  g.strokeStyle = s.color;
  g.lineWidth = 7;
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `76px ${EMOJI_FONT}`;
  g.fillText(s.icon, 64, 60);
  g.font = `700 15px ${SERIF}`;
  g.fillStyle = s.color;
  g.fillText(s.name.toUpperCase(), 64, 108);
  return canvasTexture(canvas);
}

const CELL = 256;
export const MAT_COLS = 3;
export const MAT_ROWS = 2;

/** Vẽ tấm bạt: nền đỏ, khung vàng, sáu ô theo thứ tự mặt (hàng trên Nai Bầu Gà, hàng dưới Cá Cua Tôm). Ô trúng sáng vàng. */
export function drawMat(canvas, winners = new Set()) {
  const g = canvas.getContext('2d');
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const w = canvas.width / SCALE;
  const h = canvas.height / SCALE;
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#a3241a');
  bg.addColorStop(1, '#7c1711');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  // Sợi vải mờ cho đỡ phẳng.
  g.globalAlpha = 0.08;
  g.fillStyle = '#000';
  for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
  g.globalAlpha = 1;
  g.strokeStyle = '#e9c46a';
  g.lineWidth = 10;
  g.strokeRect(8, 8, w - 16, h - 16);

  BAUCUA_SYMBOLS.forEach((s, i) => {
    const x = (i % MAT_COLS) * CELL;
    const y = Math.floor(i / MAT_COLS) * CELL;
    const win = winners.has(i);
    g.fillStyle = win ? '#ffe7a3' : '#f6ecd4';
    roundRect(g, x + 22, y + 22, CELL - 44, CELL - 44, 22);
    g.fill();
    g.lineWidth = win ? 12 : 6;
    g.strokeStyle = win ? '#ffb703' : '#c99a3c';
    g.stroke();
    g.fillStyle = s.color;
    g.globalAlpha = 0.18;
    g.beginPath();
    g.arc(x + CELL / 2, y + CELL / 2 - 14, 76, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `118px ${EMOJI_FONT}`;
    g.fillText(s.icon, x + CELL / 2, y + CELL / 2 - 14);
    g.font = `700 34px ${SERIF}`;
    g.fillStyle = '#7c1711';
    g.fillText(s.name.toUpperCase(), x + CELL / 2, y + CELL - 48);
  });
}

/** Canvas + texture tấm bạt; gọi drawMat(canvas, winners) rồi texture.needsUpdate = true để đổi ô sáng. */
export function createMat() {
  const canvas = scaledCanvas(CELL * MAT_COLS, CELL * MAT_ROWS);
  drawMat(canvas);
  return { canvas, texture: canvasTexture(canvas) };
}
