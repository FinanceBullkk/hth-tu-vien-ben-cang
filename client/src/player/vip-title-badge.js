// Danh hiệu chí tôn kiểu Võ Lâm Chi Mộng (Thần bài, Vua câu cá). Chồng nhãn trên đầu, từ trên xuống:
//   1. Danh hiệu "ảnh": chữ viết tay tô chuyển màu viền tối dày, kẹp giữa hai cánh lông vũ nằm ngang có đầu cuộn
//      xoáy, sao lấp lánh, vệt sáng chạy qua chữ;
//   2. dòng hiệu phụ chữ xanh ngọc viền đen, ô ấn vàng chữ đỏ treo lệch bên trái;
//   3. (ngoài module này) tên chữ trắng viền đen, không khung.
// Kiểu ở client/src/ui/vip-name-board.css. Nội dung là hằng số của game, không chứa dữ liệu người chơi.

const THEMES = {
  'than-bai': { epithet: 'Đổ Thánh Vô Song', seal: 'Bài', wing: ['#ffffff', '#ff9aae', '#dc1840', '#4a0010'] },
  'vua-cau-ca': { epithet: 'Tứ Hải Ngư Vương', seal: 'Ngư', wing: ['#ffffff', '#a2efff', '#1b8ad6', '#03264a'] },
};
export const TITLE_BOARDS = Object.keys(THEMES);

// Cánh trái gắn vào mép trái chữ (bên phải lật gương sẵn): ba lông vũ xoè hơi chếch lên, đầu ngoài cuộn xoáy
// chữ S; lông sáng trắng sát chữ, đậm dần ra ngoài; gân trắng mảnh trên lông.
function wingSvg(board, mirror) {
  const [c0, c1, c2, edge] = THEMES[board].wing;
  const id = `vttw-${board}`; // cùng nội dung cho mọi nhân vật nên id trùng vẫn vẽ đúng; gradient lật theo hình
  const curl = 'M25 10C17 7 8 8 6 13C4 18 10 21 13 17C14.5 14.5 11.5 12.5 9.5 14.5';
  return `<svg class="vtt-wing" viewBox="0 0 56 24" aria-hidden="true" focusable="false">
  <defs><linearGradient id="${id}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${c0}"/><stop offset=".4" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <g${mirror ? ' transform="translate(56 0) scale(-1 1)"' : ''}>
    <g fill="url(#${id})" stroke="${edge}" stroke-width=".8" stroke-linejoin="round">
      <path d="M56 12C46 5 36 2 23 3C32 6 41 9 51 14Z"/>
      <path d="M56 14C48 17 40 20 29 22C37 18 45 16 52 14Z"/>
      <path d="M56 13C44 9 31 8 17 10C29 12 42 14 55 16Z"/>
    </g>
    <path d="${curl}" fill="none" stroke="${edge}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="${curl}" fill="none" stroke="url(#${id})" stroke-width="2" stroke-linecap="round"/>
    <path d="M52 11C45 7 37 5 29 5M53 13C43 11 33 10.5 23 11" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width=".7" stroke-linecap="round"/>
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
