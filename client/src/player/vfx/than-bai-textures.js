import { canvasTexture, CJK_FONT } from './aura-canvas-kit.js';
import { drawSuit } from '../../scene/card-suit-paths.js';
import { CARD_SIZE, paintFace } from '../../scene/card-textures.js';

// Texture của hào quang Thần bài, vẽ canvas (cache dùng chung). Hệ toạ độ canvasTexture: tâm (0,0), khung ±512.
const GOLD = '#d6a437', GOLD_HI = '#ffe08a';

// Atlas lá bài 4 cột × 3 hàng (ô 256×341, lá 240×336). Mặt bài dùng đúng hình của bàn xì dách
// (paintFace), thêm viền vàng kép cho ra lá "thần bài". Id lá: chất × 13 + hạng (♠0 ♣1 ♦2 ♥3, Át = 0).
export const CARD_ATLAS = { cols: 4, rows: 3 };
const CELL_CARDS = [9, 10, 11, 12, 0, 39, 26, 13, 51, 37, 23]; // 10♠ J♠ Q♠ K♠ A♠ · A♥ A♦ A♣ · K♥ Q♦ J♣
export const CARD_CELLS = {
  tenSpade: 0, jackSpade: 1, queenSpade: 2, kingSpade: 3, aceSpade: 4,
  aceHeart: 5, aceDiamond: 6, aceClub: 7, kingHeart: 8, queenDiamond: 9, jackClub: 10, back: 11,
};
const CW = 240, CH = 336;

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

function goldFrame(c) {
  roundRect(c, -CW / 2 + 3, -CH / 2 + 3, CW - 6, CH - 6, 18);
  c.lineWidth = 6; c.strokeStyle = GOLD; c.stroke();
  roundRect(c, -CW / 2 + 9, -CH / 2 + 9, CW - 18, CH - 18, 13);
  c.lineWidth = 1.5; c.strokeStyle = 'rgba(214,164,55,.85)'; c.stroke();
  // Hoa văn góc: bốn ô trám vàng.
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    c.save(); c.translate(sx * (CW / 2 - 9), sy * (CH / 2 - 9)); c.rotate(Math.PI / 4);
    c.fillStyle = GOLD_HI; c.fillRect(-5, -5, 10, 10); c.restore();
  }
}

/** Mặt lưng thần bài: sơn mài đen, lưới trám chỉ vàng, viền đỏ son, huy hiệu tròn chữ 神, bốn chất ở góc. */
function cardBack(c) {
  roundRect(c, -CW / 2, -CH / 2, CW, CH, 18);
  const g = c.createLinearGradient(0, -CH / 2, 0, CH / 2);
  g.addColorStop(0, '#2a0c10'); g.addColorStop(0.5, '#14070a'); g.addColorStop(1, '#2a0c10');
  c.fillStyle = g; c.fill();
  c.save(); roundRect(c, -CW / 2 + 18, -CH / 2 + 18, CW - 36, CH - 36, 10); c.clip();
  c.strokeStyle = 'rgba(255,214,120,.35)'; c.lineWidth = 1.5;
  for (let k = -CH; k < CH; k += 20) {
    c.beginPath(); c.moveTo(-CW, k); c.lineTo(CW, k + CW * 1.3); c.stroke();
    c.beginPath(); c.moveTo(CW, k); c.lineTo(-CW, k + CW * 1.3); c.stroke();
  }
  c.restore();
  roundRect(c, -CW / 2 + 14, -CH / 2 + 14, CW - 28, CH - 28, 12);
  c.lineWidth = 4; c.strokeStyle = '#b3121f'; c.stroke();
  goldFrame(c);
  const halo = c.createRadialGradient(0, 0, 10, 0, 0, 80);
  halo.addColorStop(0, 'rgba(255,224,138,.55)'); halo.addColorStop(1, 'rgba(255,224,138,0)');
  c.fillStyle = halo; c.beginPath(); c.arc(0, 0, 80, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(0, 0, 50, 0, Math.PI * 2); c.fillStyle = '#7d0f18'; c.fill();
  c.lineWidth = 4; c.strokeStyle = GOLD_HI; c.stroke();
  c.beginPath(); c.arc(0, 0, 42, 0, Math.PI * 2); c.lineWidth = 1.5; c.stroke();
  c.fillStyle = GOLD_HI; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `58px ${CJK_FONT}`; c.fillText('神', 0, 3);
  [[0, -1, -1], [3, 1, -1], [2, -1, 1], [1, 1, 1]].forEach(([suit, sx, sy]) => drawSuit(c, suit, sx * 82, sy * 130, 26, GOLD_HI));
}

/** Atlas 12 ô: Thùng Phá Sảnh ♠ (10 J Q K A), ba Át còn lại, K♥ Q♦ J♣ và mặt lưng thần bài. */
export function cardAtlas() {
  return canvasTexture('than-bai-cards-v2', 1024, ({ c }) => {
    const cellW = 1024 / CARD_ATLAS.cols, cellH = 1024 / CARD_ATLAS.rows;
    for (let cell = 0; cell < CARD_ATLAS.cols * CARD_ATLAS.rows; cell++) {
      const col = cell % CARD_ATLAS.cols, row = Math.floor(cell / CARD_ATLAS.cols);
      c.save(); c.translate(-512 + cellW * (col + 0.5), -512 + cellH * (row + 0.5));
      if (cell === CARD_CELLS.back) cardBack(c);
      else {
        c.save(); c.scale(CW / CARD_SIZE.w, CH / CARD_SIZE.h); c.translate(-CARD_SIZE.w / 2, -CARD_SIZE.h / 2);
        paintFace(c, CELL_CARDS[cell]);
        c.restore();
        goldFrame(c);
      }
      c.restore();
    }
  });
}

// Mặt xúc xắc: atlas 3×3 (dùng 6 ô). Nền trắng = thân vàng, chấm đỏ = hồng ngọc (shader tô màu).
export const DICE_ATLAS = 3;
const PIPS = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
export function diceAtlas() {
  return canvasTexture('than-bai-dice', 512, ({ c }) => {
    const cell = 1024 / DICE_ATLAS;
    c.fillStyle = '#ffffff'; c.fillRect(-512, -512, 1024, 1024);
    for (let face = 1; face <= 6; face++) {
      const i = face - 1, cx = -512 + cell * (i % 3 + 0.5), cy = -512 + cell * (Math.floor(i / 3) + 0.5);
      for (const [px, py] of PIPS[face]) {
        c.beginPath(); c.arc(cx + px * cell * 0.27, cy + py * cell * 0.27, face === 1 ? cell * 0.17 : cell * 0.1, 0, Math.PI * 2);
        c.fillStyle = '#ff0000'; c.fill();
      }
    }
  });
}

/** Sao lóe bốn cánh: lõi trắng, hai gai dài ngang dọc, hai gai chéo ngắn, quầng mềm (lấp lánh trên mép vàng). */
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

/** Hào quang tia sau quạt bài: 36 tia vàng xen dài ngắn, lõi sáng, tan dần ra ngoài. */
export function sunburstTexture() {
  return canvasTexture('than-bai-sunburst-v2', 512, ({ c }) => {
    for (let i = 0; i < 36; i++) {
      const long = i % 2 === 0, len = long ? 510 : 330, half = long ? 0.045 : 0.03;
      const g = c.createLinearGradient(0, 0, 0, -len);
      g.addColorStop(0, 'rgba(255,244,200,1)'); g.addColorStop(0.4, 'rgba(255,205,90,.55)'); g.addColorStop(1, 'rgba(255,190,60,0)');
      c.save(); c.rotate(i * Math.PI * 2 / 36);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(half) * len, -len); c.lineTo(-Math.sin(half) * len, -len); c.closePath();
      c.fillStyle = g; c.fill(); c.restore();
    }
    const core = c.createRadialGradient(0, 0, 0, 0, 0, 300);
    core.addColorStop(0, 'rgba(255,250,225,1)'); core.addColorStop(0.35, 'rgba(255,220,120,.6)'); core.addColorStop(1, 'rgba(255,200,90,0)');
    c.fillStyle = core; c.beginPath(); c.arc(0, 0, 300, 0, Math.PI * 2); c.fill();
  });
}

/** Ấn triện 賭神: khung vuông đỏ son viền vàng, chữ vàng — đóng xuống sau đầu lúc "tất tay". */
export function sealStampTexture() {
  return canvasTexture('than-bai-seal-stamp', 512, ({ c }) => {
    c.save(); c.rotate(-0.06);
    c.fillStyle = '#b3121f'; c.fillRect(-400, -400, 800, 800);
    c.lineWidth = 34; c.strokeStyle = GOLD_HI; c.strokeRect(-360, -360, 720, 720);
    c.lineWidth = 10; c.strokeRect(-315, -315, 630, 630);
    c.fillStyle = GOLD_HI; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `300px ${CJK_FONT}`;
    c.fillText('賭', 0, -140); c.fillText('神', 0, 160);
    c.restore();
  });
}

/** Trận bàn sòng dưới chân: vành ô đỏ đen như cò quay, bốn chất lớn, chữ 賭神財運, sao tám cánh ở tâm. */
export function tableSealTexture() {
  return canvasTexture('than-bai-table-seal', 1024, ({ c, around, ring, star, glyph }) => {
    const n = 37;
    for (let i = 0; i < n; i++) {
      const a0 = i * Math.PI * 2 / n - Math.PI / 2, a1 = a0 + Math.PI * 2 / n;
      c.beginPath(); c.arc(0, 0, 500, a0, a1); c.arc(0, 0, 400, a1, a0, true); c.closePath();
      c.fillStyle = i === 0 ? 'rgba(10,110,70,.95)' : i % 2 ? 'rgba(24,10,14,.95)' : 'rgba(176,18,31,.95)'; c.fill();
    }
    c.strokeStyle = GOLD; c.fillStyle = GOLD;
    ring(500, 2.6); ring(400, 2.4); ring(382, 1.2, 0.7);
    around(n, () => { c.beginPath(); c.moveTo(0, -400); c.lineTo(0, -500); c.lineWidth = 4; c.stroke(); });
    [0, 3, 1, 2].forEach((suit, i) => {
      c.save(); c.rotate(i * Math.PI / 2);
      drawSuit(c, suit, 0, -285, 120, GOLD_HI);
      c.restore();
    });
    c.fillStyle = GOLD_HI;
    ['賭', '神', '財', '運'].forEach((ch, i) => { c.save(); c.rotate(Math.PI / 4 + i * Math.PI / 2); glyph(ch, 285, 96, 0.95); c.restore(); });
    ring(190, 2, 0.9); ring(176, 1, 0.6);
    star(8, 3, 170, 1.4, 0.8);
  });
}
