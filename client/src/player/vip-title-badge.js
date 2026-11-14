// Huy hiệu danh hiệu chí tôn và khung bảng tên cho người đeo hào quang chí tôn (Thần bài, Vua câu cá).
// Ảnh vẽ bằng SVG có bộ lọc ánh sáng (vàng đúc gờ nổi, sơn mài bóng, ngọc có điểm sáng), dùng làm ẢNH data URL:
// trình duyệt raster một lần rồi tái dùng cho mọi nhân vật cùng huy hiệu; phần chuyển động (vệt sáng lướt, quầng
// thở, sao lóe) là lớp CSS rẻ phủ lên trên (client/src/ui/vip-name-board.css). Mọi nội dung là hằng số của game.
import { sharedDefs, wings, plaque, pendant, titleText, gemDiamond } from './vip-badge-art-parts.js';
import { cardFanCrest, leapingCarpCrest } from './vip-badge-art-crests.js';

const W = 300, H = 124;

const THEMES = {
  'than-bai': {
    lacquer: ['#3a0710', '#1c0306', '#0b0103'], gem: ['#ffb3bf', '#d3122f', '#4d0010'], glow: '#ff9a2e',
    text: { size: 22, spacing: 2.4 }, crest: cardFanCrest,
  },
  'vua-cau-ca': {
    lacquer: ['#0a3a4c', '#041c27', '#010a10'], gem: ['#effdff', '#38c4dc', '#04485a'], glow: '#42d8f0',
    text: { size: 18.5, spacing: 1.2 }, crest: leapingCarpCrest,
  },
};

const svgDoc = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;

/** SVG huy hiệu danh hiệu (chuỗi) cho chủ đề board; '' nếu board không có. title là hằng số trong AURA_TITLES. */
export function titleBadgeSvg(board, title) {
  const t = THEMES[board];
  if (!t) return '';
  return svgDoc(W, H, `<defs>${sharedDefs(t)}</defs>${t.crest()}${wings(W)}${plaque()}${pendant()}${titleText(title, t.text, t.glow)}`);
}

/** SVG khung bảng tên 120×32 dùng cho border-image (cắt 30px hai đầu, giữa kéo giãn); '' nếu board không có. */
export function nameFrameSvg(board) {
  const t = THEMES[board];
  if (!t) return '';
  const shape = 'M20 3.5H100L113 16L100 28.5H20L7 16Z';
  const tip = 'M8 16L0 12.6L2.6 16L0 19.4Z';
  return svgDoc(120, 32, `<defs>${sharedDefs(t)}</defs>
  <path d="${shape}" fill="url(#lq)" fill-opacity=".94"/><path d="${shape}" fill="url(#gloss)"/>
  <g filter="url(#mS)" fill="url(#au)" stroke="url(#au)" stroke-linejoin="round">
    <path d="${shape}" fill="none" stroke-width="2.6"/><path d="M21 6.4H99L109.4 16L99 25.6H21L10.6 16Z" fill="none" stroke-width=".6"/>
    <path d="${tip}" stroke="none"/><path d="${tip}" transform="translate(120 0) scale(-1 1)" stroke="none"/></g>
  ${gemDiamond(17.5, 16, 4)}${gemDiamond(102.5, 16, 4)}`);
}

const urls = new Map();
const dataUrl = (key, make) => {
  if (!urls.has(key)) urls.set(key, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(make()).replace(/'/g, '%27')}`);
  return urls.get(key);
};

/** Giá trị CSS url(...) của khung bảng tên, gán vào biến --nb-frame trên .tag; '' nếu board không có. */
export function nameFrameCss(board) {
  return THEMES[board] ? `url("${dataUrl(`frame:${board}`, () => nameFrameSvg(board))}")` : '';
}

/** Phần tử huy hiệu: ảnh tĩnh + vệt sáng lướt (mask theo chính ảnh) + ba sao lóe. Chỉ gọi trong trình duyệt. */
export function createTitleBadge(board, title) {
  if (!THEMES[board]) return null;
  const src = dataUrl(`badge:${board}:${title}`, () => titleBadgeSvg(board, title));
  const root = document.createElement('span');
  root.className = 'vtb';
  root.style.setProperty('--vtb-art', `url("${src}")`);
  const img = document.createElement('img');
  img.className = 'vtb-art';
  img.alt = '';
  img.src = src;
  img.draggable = false;
  const shine = document.createElement('i');
  shine.className = 'vtb-shine';
  root.append(img, shine);
  for (let i = 1; i <= 3; i++) {
    const star = document.createElement('i');
    star.className = `vtb-star s${i}`;
    root.append(star);
  }
  return root;
}

