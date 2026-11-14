import { canvasTexture, CJK_FONT } from './aura-canvas-kit.js';
import { drawSuit } from '../../scene/card-suit-paths.js';

// Texture của hào quang Thần bài, vẽ canvas có màu sẵn (tint trắng khi dùng), cache dùng chung.
// Hệ toạ độ canvasTexture: tâm (0,0), khung ±512.
const SERIF = '"Palatino Linotype", "Book Antiqua", Georgia, serif';
const RED = '#c8142c', INK = '#17141d', GOLD = '#d6a437', GOLD_HI = '#ffe08a', IVORY = '#fffaf0';

// Atlas lá bài: 4 cột × 2 hàng, ô 256×512. Thứ tự chất như shared/xidach.js: ♠0 ♣1 ♦2 ♥3.
export const CARD_ATLAS = { cols: 4, rows: 2 };
export const CARD_CELLS = { aceSpade: 0, aceHeart: 1, aceDiamond: 2, aceClub: 3, kingHeart: 4, queenSpade: 5, jackDiamond: 6, back: 7 };
const FACES = [['A', 0], ['A', 3], ['A', 2], ['A', 1], ['K', 3], ['Q', 0], ['J', 2]];
const CARD_W = 224, CARD_H = 314;

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

function cardFace(c, rank, suit) {
  const color = suit >= 2 ? RED : INK, w = CARD_W, h = CARD_H;
  roundRect(c, -w / 2, -h / 2, w, h, 18);
  c.fillStyle = IVORY; c.fill();
  c.lineWidth = 7; c.strokeStyle = GOLD; c.stroke();
  roundRect(c, -w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 10);
  c.lineWidth = 2; c.strokeStyle = 'rgba(214,164,55,.7)'; c.stroke();
  for (const flip of [false, true]) {
    c.save();
    if (flip) c.rotate(Math.PI);
    c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `700 40px ${SERIF}`;
    c.fillText(rank, -w / 2 + 34, -h / 2 + 40);
    drawSuit(c, suit, -w / 2 + 34, -h / 2 + 76, 28, color);
    c.restore();
  }
  if (rank === 'A') {
    // Át: chất lớn giữa lá, viền vàng như lá bài của thần bài.
    drawSuit(c, suit, 0, 4, 128, GOLD);
    drawSuit(c, suit, 0, 4, 112, color);
  } else {
    // Mặt người giản lược: chữ lớn đóng khung vàng, vương miện nhỏ và chất ở dưới.
    c.fillStyle = 'rgba(214,164,55,.16)'; c.fillRect(-62, -96, 124, 192);
    c.lineWidth = 3; c.strokeStyle = GOLD; c.strokeRect(-62, -96, 124, 192);
    c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `700 96px ${SERIF}`; c.fillText(rank, 0, -8);
    c.beginPath(); c.moveTo(-30, -62); c.lineTo(-30, -82); c.lineTo(-15, -70); c.lineTo(0, -88); c.lineTo(15, -70); c.lineTo(30, -82); c.lineTo(30, -62); c.closePath();
    c.fillStyle = GOLD; c.fill();
    drawSuit(c, suit, 0, 66, 34, color);
  }
}

function cardBack(c) {
  const w = CARD_W, h = CARD_H;
  roundRect(c, -w / 2, -h / 2, w, h, 18);
  c.fillStyle = '#7d0f18'; c.fill();
  c.lineWidth = 7; c.strokeStyle = GOLD; c.stroke();
  c.save(); roundRect(c, -w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 10); c.clip();
  c.strokeStyle = 'rgba(255,214,120,.45)'; c.lineWidth = 2;
  for (let k = -h; k < h; k += 22) {
    c.beginPath(); c.moveTo(-w, k); c.lineTo(w, k + w * 1.2); c.stroke();
    c.beginPath(); c.moveTo(w, k); c.lineTo(-w, k + w * 1.2); c.stroke();
  }
  c.restore();
  c.beginPath(); c.arc(0, 0, 54, 0, Math.PI * 2); c.fillStyle = '#5a0910'; c.fill();
  c.lineWidth = 4; c.strokeStyle = GOLD_HI; c.stroke();
  c.fillStyle = GOLD_HI; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `64px ${CJK_FONT}`; c.fillText('神', 0, 4);
}

/** Atlas 8 ô: 7 mặt bài (bốn Át, K♥, Q♠, J♦) và mặt lưng đỏ chỉ vàng. */
export function cardAtlas() {
  return canvasTexture('than-bai-cards', 1024, ({ c }) => {
    for (let cell = 0; cell < 8; cell++) {
      const col = cell % 4, row = Math.floor(cell / 4);
      c.save(); c.translate(-512 + 128 + col * 256, -512 + 256 + row * 512);
      if (cell === CARD_CELLS.back) cardBack(c); else cardFace(c, ...FACES[cell]);
      c.restore();
    }
  });
}

/** Phỉnh sòng nhìn thẳng: đỏ son, tám vạch trắng quanh mép, vòng vàng, chữ 財 giữa. */
export function chipTexture() {
  return canvasTexture('than-bai-chip', 256, ({ c }) => {
    c.beginPath(); c.arc(0, 0, 470, 0, Math.PI * 2); c.fillStyle = '#b3121f'; c.fill();
    for (let i = 0; i < 8; i++) {
      c.save(); c.rotate(i * Math.PI / 4); c.fillStyle = IVORY; c.fillRect(-48, -470, 96, 120); c.restore();
    }
    c.beginPath(); c.arc(0, 0, 300, 0, Math.PI * 2); c.lineWidth = 34; c.strokeStyle = GOLD_HI; c.stroke();
    c.beginPath(); c.arc(0, 0, 270, 0, Math.PI * 2); c.fillStyle = '#7d0f18'; c.fill();
    c.fillStyle = GOLD_HI; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `360px ${CJK_FONT}`; c.fillText('財', 0, 20);
  });
}

/** Hào quang tia sau quạt Át: 28 tia vàng xen dài ngắn, tan dần ra ngoài. */
export function sunburstTexture() {
  return canvasTexture('than-bai-sunburst', 512, ({ c }) => {
    for (let i = 0; i < 28; i++) {
      const long = i % 2 === 0, len = long ? 500 : 340, half = long ? 0.05 : 0.035;
      const g = c.createLinearGradient(0, 0, 0, -len);
      g.addColorStop(0, 'rgba(255,240,190,.95)'); g.addColorStop(0.45, 'rgba(255,205,90,.5)'); g.addColorStop(1, 'rgba(255,190,60,0)');
      c.save(); c.rotate(i * Math.PI * 2 / 28);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(half) * len, -len); c.lineTo(-Math.sin(half) * len, -len); c.closePath();
      c.fillStyle = g; c.fill(); c.restore();
    }
    const core = c.createRadialGradient(0, 0, 0, 0, 0, 260);
    core.addColorStop(0, 'rgba(255,248,220,.9)'); core.addColorStop(1, 'rgba(255,210,100,0)');
    c.fillStyle = core; c.beginPath(); c.arc(0, 0, 260, 0, Math.PI * 2); c.fill();
  });
}

/** Trận bàn sòng dưới chân: vành ô đỏ đen như cò quay, bốn chất lớn, chữ 賭神財運, sao tám cánh ở tâm. */
export function tableSealTexture() {
  return canvasTexture('than-bai-table-seal', 1024, ({ c, around, ring, star, glyph }) => {
    // Vành ô đỏ đen xen kẽ.
    const n = 36;
    for (let i = 0; i < n; i++) {
      const a0 = i * Math.PI * 2 / n - Math.PI / 2, a1 = a0 + Math.PI * 2 / n;
      c.beginPath(); c.arc(0, 0, 500, a0, a1); c.arc(0, 0, 420, a1, a0, true); c.closePath();
      c.fillStyle = i % 2 ? 'rgba(30,12,16,.9)' : 'rgba(176,18,31,.9)'; c.fill();
    }
    c.strokeStyle = GOLD; c.fillStyle = GOLD;
    ring(500, 2.4); ring(420, 2.2); ring(400, 1.2, 0.7);
    around(n, () => { c.beginPath(); c.moveTo(0, -420); c.lineTo(0, -500); c.lineWidth = 3; c.stroke(); });
    // Bốn chất lớn ở bốn hướng, chữ ở bốn góc chéo.
    [0, 3, 1, 2].forEach((suit, i) => {
      c.save(); c.rotate(i * Math.PI / 2);
      drawSuit(c, suit, 0, -300, 120, GOLD_HI);
      c.restore();
    });
    c.fillStyle = GOLD_HI;
    ['賭', '神', '財', '運'].forEach((ch, i) => { c.save(); c.rotate(Math.PI / 4 + i * Math.PI / 2); glyph(ch, 300, 96, 0.95); c.restore(); });
    ring(200, 2, 0.9); ring(186, 1, 0.6);
    star(8, 3, 180, 1.4, 0.8);
    c.fillStyle = GOLD_HI; glyph('神', 0, 150, 1);
  });
}
