// Họa tiết bàn bầu cua vẽ bằng canvas: mặt xúc xắc và mặt bàn sáu ô. Không dùng ảnh ngoài (CSP chỉ cho cùng nguồn).
import * as THREE from 'three';
import { BAUCUA_SYMBOLS } from '../../../shared/baucua.js';

const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Mặt xúc xắc: nền ngà, biểu tượng lớn và tên nhỏ bên dưới (tên giúp đọc được cả khi máy không có font emoji màu). */
export function diceFaceTexture(symbol) {
  const s = BAUCUA_SYMBOLS[symbol];
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f4ead2';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = s.color;
  g.lineWidth = 6;
  g.strokeRect(5, 5, 118, 118);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `66px ${EMOJI_FONT}`;
  g.fillStyle = '#222';
  g.fillText(s.icon, 64, 58);
  g.font = '700 20px "Palatino Linotype", Georgia, serif';
  g.fillStyle = s.color;
  g.fillText(s.name.toUpperCase(), 64, 108);
  return canvasTexture(canvas);
}

/**
 * Mặt bàn tròn chia sáu ô như cái đĩa: ô nào đang trúng (winners) sáng vàng.
 * Vẽ lại vào đúng canvas cũ để khỏi tạo texture mới mỗi ván.
 */
export function drawTableTop(canvas, winners = new Set()) {
  const size = canvas.width;
  const c = size / 2;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, size, size);
  g.save();
  g.beginPath();
  g.arc(c, c, c - 2, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = '#6e1f18';
  g.fillRect(0, 0, size, size);
  const slice = (Math.PI * 2) / BAUCUA_SYMBOLS.length;
  BAUCUA_SYMBOLS.forEach((s, i) => {
    const a0 = i * slice - Math.PI / 2 - slice / 2;
    g.beginPath();
    g.moveTo(c, c);
    g.arc(c, c, c, a0, a0 + slice);
    g.closePath();
    const win = winners.has(i);
    g.fillStyle = win ? 'rgba(255, 214, 120, .5)' : i % 2 ? 'rgba(0, 0, 0, .14)' : 'rgba(255, 255, 255, .05)';
    g.fill();
    g.strokeStyle = 'rgba(232, 195, 120, .75)';
    g.lineWidth = 3;
    g.stroke();
    const mid = a0 + slice / 2;
    const x = c + Math.cos(mid) * size * 0.31;
    const y = c + Math.sin(mid) * size * 0.31;
    g.save();
    g.translate(x, y);
    g.rotate(mid + Math.PI / 2);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `${size * 0.13}px ${EMOJI_FONT}`;
    g.fillStyle = '#fff';
    g.fillText(s.icon, 0, -size * 0.015);
    g.font = `700 ${size * 0.04}px "Palatino Linotype", Georgia, serif`;
    g.fillStyle = win ? '#fff3c4' : '#e8c378';
    g.fillText(s.name, 0, size * 0.075);
    g.restore();
  });
  g.restore();
  g.strokeStyle = '#e8c378';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(c, c, c - 5, 0, Math.PI * 2);
  g.stroke();
}

/** Canvas + texture mặt bàn; gọi drawTableTop(canvas, winners) rồi texture.needsUpdate = true để đổi ô sáng. */
export function createTableTop() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  drawTableTop(canvas);
  return { canvas, texture: canvasTexture(canvas) };
}
