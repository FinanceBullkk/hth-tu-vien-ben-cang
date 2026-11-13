// Mức đồ hoạ người chơi tự chọn trong bảng "Đồ hoạ".
// 'auto': bắt đầu ở mức Cao, máy giật thì AdaptiveQuality tự hạ, chạy mượt trở lại thì tự nâng.
// Các mức cố định thì không tự hạ nữa; "Rất nét" chỉ có khi chọn tay vì tốn GPU gấp vài lần.

export const GRAPHICS_MODES = [
  { id: 'auto', label: 'Tự động', hint: 'Bắt đầu ở mức Cao, máy giật thì tự hạ, mượt lại thì tự nâng.' },
  { id: 'low', level: 0, label: 'Thấp', hint: 'Ảnh thô, tắt bóng đổ và ánh sáng rực. Cho máy yếu.' },
  { id: 'medium', level: 1, label: 'Vừa', hint: 'Tối đa 1280×720, bóng đổ nhẹ.' },
  { id: 'high', level: 2, label: 'Cao', hint: 'Tối đa Full HD, bóng đổ và ánh sáng rực.' },
  { id: 'ultra', level: 3, label: 'Rất nét', hint: 'Theo độ phân giải màn hình (tới 4K), bóng đổ mịn. Cần card đồ hoạ khá.' },
];

/** Tên mức theo số, để báo "Tự động đang ở mức Vừa". */
export const LEVEL_LABELS = ['Thấp', 'Vừa', 'Cao', 'Rất nét'];

/** Giá trị lưu trong localStorage có thể hỏng hoặc cũ; lạ thì về 'auto'. */
export function readGraphicsMode(saved) {
  return GRAPHICS_MODES.some((m) => m.id === saved) ? saved : 'auto';
}

/** Mức cố định của chế độ, hoặc null với 'auto'. */
export function modeLevel(id) {
  return GRAPHICS_MODES.find((m) => m.id === id)?.level ?? null;
}

/**
 * Những gì bật ở mỗi mức. Bloom và cỡ bóng đổi không phải biên dịch lại shader;
 * bật/tắt hẳn bóng thì phải, nên chỉ tắt ở mức thấp nhất.
 */
export function qualityFeatures(level, touch = false) {
  let shadowSize = 1024;
  if (level >= 3) shadowSize = touch ? 2048 : 4096;
  else if (level === 2 && !touch) shadowSize = 2048;
  return { bloom: level >= 2, shadows: level >= 1, shadowSize };
}
