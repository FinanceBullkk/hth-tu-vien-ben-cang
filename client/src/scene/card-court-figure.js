// Hình người trên lá J, Q, K: nửa trên khung hình, vẽ hai lần (lần sau xoay 180°) để thành lá hai đầu như bài thật.
// Vẽ tối giản kiểu khắc gỗ: áo hai màu viền vàng, mặt tròn, mũ/vương miện theo bậc, tay cầm kiếm (K) hay hoa (Q).
import { drawSuit } from './card-suit-paths.js';

const INK = '#2a1d17';
const GOLD = '#e2a72e';
const SKIN = '#f3cfa6';

function stroke(g, width = 1.6) {
  g.lineWidth = width;
  g.strokeStyle = INK;
  g.stroke();
}

function crown(g, cx, y, w, round) {
  g.beginPath();
  g.moveTo(cx - w / 2, y + 22);
  const tips = 5;
  for (let i = 0; i <= tips; i++) {
    const x = cx - w / 2 + (w * i) / tips;
    if (round) g.arc(x, y + 6, 3.4, Math.PI, 0);
    else g.lineTo(x, i % 2 ? y + 9 : y);
    if (i < tips) g.lineTo(x + w / tips / 2, y + 12);
  }
  g.lineTo(cx + w / 2, y + 22);
  g.closePath();
  g.fillStyle = GOLD;
  g.fill();
  stroke(g, 1.3);
  g.fillStyle = '#c0392b';
  for (const dx of [-w / 4, 0, w / 4]) {
    g.beginPath();
    g.arc(cx + dx, y + 17, 2.2, 0, Math.PI * 2);
    g.fill();
  }
}

function cap(g, cx, y, w, color) {
  g.beginPath();
  g.ellipse(cx, y + 18, w / 2, 9, 0, Math.PI, 0);
  g.closePath();
  g.fillStyle = color;
  g.fill();
  stroke(g, 1.3);
  g.beginPath(); // Lông chim cắm trên mũ.
  g.moveTo(cx + 6, y + 10);
  g.quadraticCurveTo(cx + 22, y - 4, cx + 30, y + 4);
  g.lineWidth = 3;
  g.strokeStyle = GOLD;
  g.stroke();
}

function face(g, cx, cy, r, rank) {
  if (rank === 11) { // Q: tóc dài hai bên.
    g.beginPath();
    g.ellipse(cx, cy + 6, r + 7, r + 12, 0, 0, Math.PI * 2);
    g.fillStyle = '#d9a441';
    g.fill();
    stroke(g, 1.2);
  }
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fillStyle = SKIN;
  g.fill();
  stroke(g, 1.4);
  g.fillStyle = INK;
  for (const dx of [-r * 0.38, r * 0.38]) {
    g.beginPath();
    g.arc(cx + dx, cy - 2, 1.7, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.moveTo(cx - 4, cy + r * 0.45);
  g.quadraticCurveTo(cx, cy + r * 0.6, cx + 4, cy + r * 0.45);
  stroke(g, 1.2);
  if (rank === 12) { // K: râu.
    g.beginPath();
    g.moveTo(cx - r * 0.85, cy + 2);
    g.quadraticCurveTo(cx, cy + r * 2, cx + r * 0.85, cy + 2);
    g.quadraticCurveTo(cx, cy + r * 1.1, cx - r * 0.85, cy + 2);
    g.fillStyle = '#8a5a2b';
    g.fill();
    stroke(g, 1);
  }
}

function robe(g, cx, top, w, hh, main, trim) {
  g.beginPath();
  g.moveTo(cx - w * 0.46, top + hh);
  g.lineTo(cx - w * 0.4, top + hh * 0.7);
  g.quadraticCurveTo(cx - w * 0.3, top + hh * 0.6, cx - w * 0.1, top + hh * 0.6);
  g.lineTo(cx + w * 0.1, top + hh * 0.6);
  g.quadraticCurveTo(cx + w * 0.3, top + hh * 0.6, cx + w * 0.4, top + hh * 0.7);
  g.lineTo(cx + w * 0.46, top + hh);
  g.closePath();
  g.fillStyle = main;
  g.fill();
  stroke(g);
  g.fillStyle = trim; // Vạt áo màu thứ hai bên phải, như bài thật.
  g.fillRect(cx + w * 0.06, top + hh * 0.66, w * 0.14, hh * 0.34);
  g.fillStyle = GOLD;
  g.fillRect(cx - w * 0.04, top + hh * 0.62, w * 0.08, hh * 0.38);
  g.beginPath(); // Cổ áo vàng.
  g.ellipse(cx, top + hh * 0.62, w * 0.17, hh * 0.06, 0, 0, Math.PI);
  g.fillStyle = GOLD;
  g.fill();
  stroke(g, 1.2);
}

/**
 * Nửa trên khung hình lá mặt người. (cx, top) là giữa mép trên khung, w rộng khung, hh nửa chiều cao khung.
 * rank 10 = J, 11 = Q, 12 = K; red quyết định màu áo.
 */
export function drawCourtHalf(g, { rank, suit, red, cx, top, w, hh }) {
  const main = red ? '#b3261e' : '#1d3557';
  const trim = red ? '#1d3557' : '#b3261e';
  robe(g, cx, top, w, hh, main, trim);
  const headY = top + hh * 0.4;
  const r = w * 0.15;
  face(g, cx, headY, r, rank);
  if (rank === 12) crown(g, cx, headY - r - 18, w * 0.4, false);
  else if (rank === 11) crown(g, cx, headY - r - 16, w * 0.34, true);
  else cap(g, cx, headY - r - 12, w * 0.46, main);
  if (rank === 12) { // Kiếm dựng bên phải.
    g.fillStyle = '#cfd6dd';
    g.fillRect(cx + w * 0.3, top + hh * 0.18, 4, hh * 0.82);
    g.fillStyle = GOLD;
    g.fillRect(cx + w * 0.3 - 6, top + hh * 0.5, 16, 4);
  } else if (rank === 11) { // Đoá hoa bên phải.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.beginPath();
      g.arc(cx + w * 0.3 + Math.cos(a) * 5, top + hh * 0.56 + Math.sin(a) * 5, 3.6, 0, Math.PI * 2);
      g.fillStyle = '#c0392b';
      g.fill();
    }
    g.beginPath();
    g.arc(cx + w * 0.3, top + hh * 0.56, 2.6, 0, Math.PI * 2);
    g.fillStyle = GOLD;
    g.fill();
  }
  drawSuit(g, suit, cx - w * 0.33, top + hh * 0.2, 18, red ? '#c0392b' : '#1f1f24');
}
