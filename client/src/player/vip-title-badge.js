// Danh hiệu chí tôn kiểu Võ Lâm Chi Mộng (Thần bài, Vua câu cá). Chồng nhãn trên đầu, từ trên xuống:
//   1. Danh hiệu "ảnh": chữ viết tay tô chuyển màu viền tối dày, kẹp giữa hai cánh lông vũ nằm ngang có đầu cuộn
//      xoáy, sao lấp lánh, vệt sáng chạy qua chữ;
//   2. dòng hiệu phụ chữ xanh ngọc viền đen, ô ấn vàng chữ đỏ treo lệch bên trái;
//   3. (ngoài module này) tên chữ trắng viền đen, không khung.
// Kiểu ở client/src/ui/vip-name-board.css. Nội dung là hằng số của game, không chứa dữ liệu người chơi.

const THEMES = {
  'than-bai': {
    epithet: 'Đổ Thánh Vô Song', seal: 'Bài',
    wing: ['#fff6f6', '#ff7896', '#d20f3c', '#3c0010'], gem: ['#fffbe0', '#ffc21a', '#8a4a00'],
  },
  'vua-cau-ca': {
    epithet: 'Tứ Hải Ngư Vương', seal: 'Ngư',
    wing: ['#ffffff', '#8fe9ff', '#1479d0', '#02213f'], gem: ['#ffffff', '#7fe8ff', '#0a5a8a'],
  },
};
export const TITLE_BOARDS = Object.keys(THEMES);

// Cánh trái gắn vào mép trái chữ (bên phải lật gương sẵn): năm lông vũ xoè quạt (chếch lên, ngang, chếch xuống),
// lông giữa dài nhất kết thúc bằng cuộn xoáy chữ S, lông trên có cuộn nhỏ; lông sáng trắng sát chữ, đậm dần ra
// ngoài, gân trắng trên lông; viên ngọc tròn ở gốc cánh sát chữ.
const FEATHERS = [
  'M64 12C54 4 42 0 28 1C36 4 46 8 58 15Z',
  'M64 17C56 21 48 25 38 28C46 23 54 20 61 17Z',
  'M64 13C50 7 36 5 20 7C32 9 46 12 62 16Z',
  'M64 17C52 19 40 22 26 24C38 20 50 18 62 16Z',
  'M64 14C48 11 30 11 10 13C28 15.5 46 17.5 64 18Z',
];
const CURLS = ['M24 12.5C15 8.5 6 9.5 4 14.5C2 20.5 9 23.5 12 18.5C13.5 16 10.5 14 8.5 16', 'M30 2.6C25.5 0 21.5 1.5 22 4.5C22.4 6.6 25.4 6.4 25.6 4.6'];

function wingSvg(board, mirror) {
  const { wing: [c0, c1, c2, edge], gem: [g0, g1, g2] } = THEMES[board];
  const id = `vttw-${board}`; // cùng nội dung cho mọi nhân vật nên id trùng vẫn vẽ đúng; gradient lật theo hình
  const curls = CURLS.map((d, i) => `<path d="${d}" fill="none" stroke="${edge}" stroke-width="${i ? 3 : 4.4}" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="url(#${id})" stroke-width="${i ? 1.5 : 2.6}" stroke-linecap="round"/>`).join('');
  return `<svg class="vtt-wing" viewBox="0 0 64 28" aria-hidden="true" focusable="false">
  <defs><linearGradient id="${id}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${c0}"/><stop offset=".35" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <radialGradient id="${id}-g" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="${g0}"/><stop offset=".5" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></radialGradient></defs>
  <g${mirror ? ' transform="translate(64 0) scale(-1 1)"' : ''}>
    <g fill="url(#${id})" stroke="${edge}" stroke-width=".9" stroke-linejoin="round">${FEATHERS.map(d => `<path d="${d}"/>`).join('')}</g>
    ${curls}
    <path d="M60 12.5C52 7 42 4 31 3.5M61 14C50 10 37 8.5 24 9M60 16C46 14.5 31 14 16 14.5M60 17.5C50 20 41 22 31 23.5" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".75" stroke-linecap="round"/>
    <circle cx="57.5" cy="15.5" r="3.6" fill="url(#${id}-g)" stroke="${edge}" stroke-width="1"/>
    <circle cx="56.4" cy="14.3" r="1" fill="#fff"/>
  </g>
</svg>`;
}

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
};

/** Phần tử danh hiệu chí tôn cho board (null nếu không phải board chí tôn). Chỉ gọi trong trình duyệt. */
export function createTitleBadge(board, title) {
  const theme = THEMES[board];
  if (!theme) return null;
  // 1. Danh hiệu: cánh trái, chữ hai lớp (viền tối dưới, chữ màu trên), cánh phải, sao.
  const art = el('span', 'vtt-art');
  const word = el('span', 'vtt-word');
  const outline = el('span', 'vtt-outline', title);
  outline.setAttribute('aria-hidden', 'true');
  word.append(outline, el('span', 'vtt-text', title));
  const left = el('span', 'vtt-side l');
  const right = el('span', 'vtt-side r');
  left.innerHTML = wingSvg(board, false); // chuỗi hằng số, không có dữ liệu người chơi
  right.innerHTML = wingSvg(board, true);
  art.append(left, word, right);
  for (let i = 1; i <= 3; i++) art.append(el('i', `vtt-star s${i}`));
  // 2. Hiệu phụ xanh ngọc, ô ấn vàng treo bên trái (không đẩy chữ lệch tâm).
  const epithet = el('span', 'vtt-epithet');
  epithet.append(el('span', 'vtt-seal', theme.seal), el('span', 'vtt-epithet-text', theme.epithet));
  const root = el('span', 'vtt');
  root.append(art, epithet);
  return root;
}
