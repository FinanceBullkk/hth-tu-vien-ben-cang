// Mặt lá bài vẽ bằng canvas (không dùng ảnh ngoài): mặt ngửa có hạng + chất ở góc và chất lớn giữa lá, mặt úp hoa văn đỏ.
// Mỗi lá chỉ vẽ một lần rồi giữ lại vật liệu để dùng chung giữa các bàn và các ván.
import * as THREE from 'three';
import { RANKS, RED_SUITS, SUITS, rankOf, suitOf } from '../../../shared/xidach.js';

const W = 96;
const H = 136;
const SERIF = '"Palatino Linotype", "Book Antiqua", Georgia, serif';
const cache = new Map();

function material(draw) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  draw(canvas.getContext('2d'));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshLambertMaterial({ map });
}

function rounded(g, color, stroke) {
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(2, 2, W - 4, H - 4, 10);
  g.fill();
  g.strokeStyle = stroke;
  g.lineWidth = 3;
  g.stroke();
}

/** Vật liệu mặt ngửa của một lá (id 0..51). */
export function cardFaceMaterial(card) {
  if (!cache.has(card)) {
    cache.set(card, material((g) => {
      rounded(g, '#fbf8f1', '#c9bfa8');
      const red = RED_SUITS.has(suitOf(card));
      g.fillStyle = red ? '#c0392b' : '#1f1f24';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `700 26px ${SERIF}`;
      g.fillText(RANKS[rankOf(card)], 20, 22);
      g.font = '22px serif';
      g.fillText(SUITS[suitOf(card)], 20, 46);
      g.font = '58px serif';
      g.fillText(SUITS[suitOf(card)], W / 2, H / 2 + 12);
    }));
  }
  return cache.get(card);
}

/** Vật liệu mặt úp dùng chung. */
export function cardBackMaterial() {
  if (!cache.has('back')) {
    cache.set('back', material((g) => {
      rounded(g, '#8f1d14', '#e9c46a');
      g.strokeStyle = 'rgba(233, 196, 106, .55)';
      g.lineWidth = 2;
      for (let i = -H; i < W + H; i += 12) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + H, H);
        g.stroke();
      }
      g.strokeStyle = '#e9c46a';
      g.strokeRect(12, 12, W - 24, H - 24);
    }));
  }
  return cache.get('back');
}
