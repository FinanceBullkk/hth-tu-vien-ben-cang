// Danh hiệu đi cùng aura. Phần lớn chỉ để trang trí; riêng hào quang chí tôn (vip) phải đạt thành tích
// mới mua được (SHOP_REQUIREMENTS) nên danh hiệu của chúng chạy ánh kim để người khác nhận ra, và cả nhãn
// tên đổi kiểu riêng theo chủ đề kiểu MMO 2D: danh hiệu là chữ viết tay tô màu viền tối có cánh hai bên
// (vip-title-badge.js), tên là chữ vàng viền đen có ô huy hiệu, không đóng hộp (client/src/ui/vip-name-board.css).
import { createTitleBadge } from './vip-title-badge.js';

export const AURA_TITLES = [
  { title: '', color: '#e9d6ab' },
  { title: 'Kim Liên Tĩnh Tâm', color: '#ffd98a' },
  { title: 'Lưu Ly Vân Thủy', color: '#7ee8e0' },
  { title: 'Tinh Hà Lữ Khách', color: '#cdd8ff' },
  { title: 'Hồng Liên Hỏa Vũ', color: '#ffba87' },
  { title: 'Đào Hoa Tri Kỷ', color: '#ffa8cc' },
  { title: 'Bích Ngọc Thanh Phong', color: '#7ee8a0' },
  { title: 'Nguyệt Bạch Tri Âm', color: '#f6f7ff' },
  { title: 'Huyền Dạ Du Hành', color: '#d2afff' },
  { title: '', color: '#ffad60' }, // Long quyền (bản prod), không kèm danh hiệu
  { title: 'Xích Diễm Lưu Vân', color: '#ffad60' },
  { title: 'Kim Long Nguyệt Ảnh', color: '#ffe4a0' },
  { title: 'Thanh Phong Kiếm Vũ', color: '#a9f0e9' },
  { title: 'Thần Bài', color: '#ffcf3f', vip: true, board: 'than-bai' },
  { title: 'Vua Câu Cá', color: '#5fe3f0', vip: true, board: 'vua-cau-ca' },
];

export function applyAvatarTitle(tag, title, effect) {
  const theme = AURA_TITLES[effect] ?? AURA_TITLES[0];
  tag.style.setProperty('--tag-accent', theme.color);
  if (theme.board) {
    // Danh hiệu chí tôn: dựng từ hằng số của game (không chứa dữ liệu người chơi).
    title.replaceChildren(createTitleBadge(theme.board, theme.title));
    title.setAttribute('aria-label', theme.title);
  } else {
    title.textContent = theme.title;
    title.removeAttribute('aria-label');
  }
  title.hidden = !theme.title;
  title.classList.toggle('vip', Boolean(theme.vip));
  // Kiểu chí tôn cho cả nhãn (màu quầng, tên sáng) theo chủ đề.
  if (theme.board) tag.dataset.board = theme.board;
  else delete tag.dataset.board;
}
