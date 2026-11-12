// Danh hiệu trang trí đi cùng aura, không biểu thị cấp bậc hay thành tích.
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
];

export function applyAvatarTitle(tag, title, effect) {
  const theme = AURA_TITLES[effect] ?? AURA_TITLES[0];
  tag.style.setProperty('--tag-accent', theme.color);
  title.textContent = theme.title;
  title.hidden = !theme.title;
}
