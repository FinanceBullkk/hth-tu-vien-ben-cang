// Danh hiệu chí tôn kiểu Võ Lâm Chi Mộng (Thần bài, Vua câu cá). Chồng nhãn trên đầu, từ trên xuống:
//   1. Danh hiệu "ảnh": chữ viết tay tô chuyển màu viền tối dày, hai bên là đồ trang trí đúng chủ đề
//      (vip-title-side-ornaments.js: xấp bài + phỉnh / cá chép nhảy sóng), sao lấp lánh, vệt sáng chạy qua chữ;
//   2. dòng hiệu phụ chữ xanh ngọc viền đen, ô ấn vàng chữ đỏ treo lệch bên trái;
//   3. (ngoài module này) tên chữ trắng viền đen, không khung.
// Kiểu ở client/src/ui/vip-name-board.css. Nội dung là hằng số của game, không chứa dữ liệu người chơi.
import { sideOrnamentSvg } from './vip-title-side-ornaments.js';

const THEMES = {
  'than-bai': { epithet: 'Đổ Thánh Vô Song', seal: 'Bài' },
  'vua-cau-ca': { epithet: 'Tứ Hải Ngư Vương', seal: 'Ngư' },
};
export const TITLE_BOARDS = Object.keys(THEMES);

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
  // 1. Danh hiệu: trang trí trái, chữ hai lớp (viền tối dưới, chữ màu trên), trang trí phải, sao.
  const art = el('span', 'vtt-art');
  const word = el('span', 'vtt-word');
  const outline = el('span', 'vtt-outline', title);
  outline.setAttribute('aria-hidden', 'true');
  word.append(outline, el('span', 'vtt-text', title));
  const left = el('span', 'vtt-side l');
  const right = el('span', 'vtt-side r');
  left.innerHTML = sideOrnamentSvg(board, false); // chuỗi hằng số, không có dữ liệu người chơi
  right.innerHTML = sideOrnamentSvg(board, true);
  art.append(left, word, right);
  for (let i = 1; i <= 3; i++) art.append(el('i', `vtt-star s${i}`));
  // 2. Hiệu phụ xanh ngọc, ô ấn vàng treo bên trái (không đẩy chữ lệch tâm).
  const epithet = el('span', 'vtt-epithet');
  epithet.append(el('span', 'vtt-seal', theme.seal), el('span', 'vtt-epithet-text', theme.epithet));
  const root = el('span', 'vtt');
  root.append(art, epithet);
  return root;
}
