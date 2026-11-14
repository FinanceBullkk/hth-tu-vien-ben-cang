// Danh hiệu chí tôn kiểu MMO 2D (Thần bài, Vua câu cá): chữ viết tay nghiêng tô chuyển màu, viền tối dày,
// hai cánh vuốt hai bên chữ, sao lấp lánh, vệt sáng chạy qua chữ. Không bảng, không khung.
// Kiểu ở client/src/ui/vip-name-board.css. Nội dung là hằng số của game, không chứa dữ liệu người chơi.

export const TITLE_BOARDS = ['than-bai', 'vua-cau-ca'];

// Cánh trái (cánh phải lật gương sẵn trong SVG): ba lưỡi vuốt cong toả ra từ mép chữ, đầu lưỡi giữa cuộn xoáy.
// Màu theo chủ đề: lửa vàng→đỏ hoặc nước trắng→xanh, viền tối như chữ.
const WING_COLORS = {
  'than-bai': ['#fff6b0', '#ffb21e', '#e2380c', '#3a0800'],
  'vua-cau-ca': ['#ffffff', '#86ecff', '#1d86d6', '#03213c'],
};
function wingSvg(board, mirror) {
  const [c0, c1, c2, edge] = WING_COLORS[board];
  const id = `vttw-${board}`; // cùng nội dung cho mọi nhân vật nên id trùng vẫn vẽ đúng; gradient lật theo hình
  return `<svg class="vtt-wing" viewBox="0 0 60 40" aria-hidden="true" focusable="false">
  <defs><linearGradient id="${id}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${c0}"/><stop offset=".45" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <g${mirror ? ' transform="translate(60 0) scale(-1 1)"' : ''}><g fill="url(#${id})" stroke="${edge}" stroke-width="1.3" stroke-linejoin="round">
    <path d="M58 19C45 17 30 10 15 1C22 11 34 19 55 25Z"/>
    <path d="M58 31C45 34 31 37 16 39C29 33 42 30 55 28Z"/>
    <path d="M59 25C44 25 27 22 11 14C6 11 2 13 3 17C5 14 9 15 10 18C24 27 42 30 59 29Z"/>
  </g>
  <path d="M52 22C42 21 30 18 20 14" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1" stroke-linecap="round"/></g>
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
  if (!TITLE_BOARDS.includes(board)) return null;
  const root = el('span', 'vtt');
  const word = el('span', 'vtt-word');
  const outline = el('span', 'vtt-outline', title); // lớp viền tối + quầng, nằm dưới chữ màu
  outline.setAttribute('aria-hidden', 'true');
  word.append(outline, el('span', 'vtt-text', title));
  const left = el('span', 'vtt-side l');
  const right = el('span', 'vtt-side r');
  left.innerHTML = wingSvg(board, false); // chuỗi hằng số, không có dữ liệu người chơi
  right.innerHTML = wingSvg(board, true);
  root.append(left, word, right);
  for (let i = 1; i <= 3; i++) root.append(el('i', `vtt-star s${i}`));
  return root;
}
