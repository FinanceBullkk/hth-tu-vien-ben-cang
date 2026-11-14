// Mặt lá bài vẽ bằng canvas (không dùng ảnh ngoài), dùng chung cho bàn 3D và bảng chơi DOM:
// góc trên trái và góc dưới phải có hạng + chất, lá số bày chất đúng bố cục bài thật, J Q K có hình người hai đầu,
// Át có chất lớn giữa lá. Mặt lưng đỏ viền trắng, lưới hoa văn vàng, ấn "HTH" giữa lá.
// Góc lá bo tròn trong suốt (alphaTest ở vật liệu 3D, PNG trong suốt ở DOM). Mỗi lá chỉ vẽ một lần rồi giữ lại.
import * as THREE from 'three';
import { RANKS, RED_SUITS, rankOf, suitOf } from '../../../shared/xidach.js';
import { drawCourtHalf } from './card-court-figure.js';
import { drawSuit } from './card-suit-paths.js';

const W = 200;
const H = 280;
export const CARD_SIZE = { w: W, h: H };
const R = 16; // Bo góc.
const SERIF = '"Palatino Linotype", "Book Antiqua", Georgia, serif';
const RED = '#c0392b';
const BLACK = '#1f1f24';
const canvases = new Map();
const materials = new Map();
const urls = new Map();

// Bố cục chất của lá 2..10 theo cột (L, M, R) và hàng (0 = trên, 1 = dưới), như bài Tây thật.
const L = 0.3;
const M = 0.5;
const Rt = 0.7;
const side = (rows) => rows.flatMap((y) => [[L, y], [Rt, y]]);
const PIPS = {
  1: [[M, 0.2], [M, 0.8]],
  2: [[M, 0.2], [M, 0.5], [M, 0.8]],
  3: side([0.2, 0.8]),
  4: [...side([0.2, 0.8]), [M, 0.5]],
  5: side([0.2, 0.5, 0.8]),
  6: [...side([0.2, 0.5, 0.8]), [M, 0.35]],
  7: [...side([0.2, 0.5, 0.8]), [M, 0.35], [M, 0.65]],
  8: [...side([0.2, 0.4, 0.6, 0.8]), [M, 0.5]],
  9: [...side([0.2, 0.4, 0.6, 0.8]), [M, 0.3], [M, 0.7]],
};

function cardShape(g, fill, stroke) {
  g.beginPath();
  g.roundRect(1.5, 1.5, W - 3, H - 3, R);
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = stroke;
  g.stroke();
}

/** Hạng + chất ở góc trên trái; vẽ lại xoay 180° cho góc dưới phải. */
function corners(g, rank, suit, color) {
  for (const flip of [false, true]) {
    g.save();
    if (flip) {
      g.translate(W, H);
      g.rotate(Math.PI);
    }
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `700 ${rank === 9 ? 30 : 36}px ${SERIF}`;
    g.fillText(RANKS[rank], 24, 30);
    drawSuit(g, suit, 24, 60, 22, color);
    g.restore();
  }
}

/** Vẽ mặt ngửa lá card (0..51) lên context g trong khung CARD_SIZE (200×280); dùng chung cho bàn và hào quang Thần bài. */
export function paintFace(g, card) {
  const rank = rankOf(card);
  const suit = suitOf(card);
  const red = RED_SUITS.has(suit);
  const color = red ? RED : BLACK;
  const paper = g.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, '#fffdf7');
  paper.addColorStop(1, '#f1ead9');
  cardShape(g, paper, '#cfc4ab');
  corners(g, rank, suit, color);
  if (rank === 0) {
    drawSuit(g, suit, W / 2, H / 2, suit === 0 ? 110 : 84, color);
    if (suit === 0) { // Át bích: viền trang trí như bài thật.
      g.beginPath();
      g.arc(W / 2, H / 2, 70, 0, Math.PI * 2);
      g.lineWidth = 1.5;
      g.strokeStyle = 'rgba(31, 31, 36, .35)';
      g.stroke();
    }
    return;
  }
  if (rank >= 10) {
    const x0 = 44;
    const y0 = 30;
    const w = W - 2 * x0;
    const hh = (H - 2 * y0) / 2;
    g.fillStyle = '#fbf3df';
    g.fillRect(x0, y0, w, hh * 2);
    for (const flip of [false, true]) {
      g.save();
      if (flip) {
        g.translate(W, H);
        g.rotate(Math.PI);
      }
      g.beginPath();
      g.rect(x0, y0, w, hh);
      g.clip();
      drawCourtHalf(g, { rank, suit, red, cx: W / 2, top: y0, w, hh });
      g.restore();
    }
    g.lineWidth = 2; // Khung hình.
    g.strokeStyle = color;
    g.strokeRect(x0, y0, w, hh * 2);
    return;
  }
  for (const [px, py] of PIPS[rank]) drawSuit(g, suit, px * W, (0.12 + py * 0.76) * H, 36, color, py > 0.5);
}

function paintBack(g) {
  cardShape(g, '#fbf8f1', '#cfc4ab');
  const m = 11;
  g.beginPath();
  g.roundRect(m, m, W - 2 * m, H - 2 * m, 8);
  g.fillStyle = '#8f1d14';
  g.fill();
  g.save();
  g.clip();
  g.strokeStyle = 'rgba(233, 196, 106, .5)';
  g.lineWidth = 1.5;
  for (let i = -H; i < W + H; i += 14) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + H, H);
    g.moveTo(i + H, 0);
    g.lineTo(i, H);
    g.stroke();
  }
  g.restore();
  g.strokeStyle = '#e9c46a';
  g.lineWidth = 2;
  g.strokeRect(m + 7, m + 7, W - 2 * m - 14, H - 2 * m - 14);
  g.beginPath(); // Ấn tròn giữa lá.
  g.arc(W / 2, H / 2, 38, 0, Math.PI * 2);
  g.fillStyle = '#7a1510';
  g.fill();
  g.lineWidth = 3;
  g.stroke();
  g.beginPath();
  g.arc(W / 2, H / 2, 31, 0, Math.PI * 2);
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = '#ffe8a8';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 24px ${SERIF}`;
  g.fillText('HTH', W / 2, H / 2 + 1);
}

/** Canvas đã vẽ của một lá; key là id 0..51 hoặc 'back'. */
function cardCanvas(key) {
  if (!canvases.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    if (key === 'back') paintBack(g);
    else paintFace(g, key);
    canvases.set(key, canvas);
  }
  return canvases.get(key);
}

function material(key) {
  if (!materials.has(key)) {
    const map = new THREE.CanvasTexture(cardCanvas(key));
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    materials.set(key, new THREE.MeshLambertMaterial({ map, alphaTest: 0.5 }));
  }
  return materials.get(key);
}

/** Vật liệu mặt ngửa của một lá (id 0..51). */
export const cardFaceMaterial = (card) => material(card);

/** Vật liệu mặt úp dùng chung. */
export const cardBackMaterial = () => material('back');

/** Ảnh PNG (data URL) của một lá cho bảng DOM; id âm là mặt lưng. */
export function cardImageUrl(card) {
  const key = card >= 0 ? card : 'back';
  if (!urls.has(key)) urls.set(key, cardCanvas(key).toDataURL('image/png'));
  return urls.get(key);
}
