import { bell, sstep } from './aura-rhythm.js';

// Dòng thời gian "ÁT CHỦ BÀI" của Thần bài trên một nhịp (phase 0..1 của chu kỳ 12 giây). Mọi lớp đọc chung
// bảng này nên tụ – bùng – giữ – vỡ khớp nhau tuyệt đối:
//   0.30–0.42  TỤ LỰC   lá kình lực xoáy dồn về sau đầu, hào quang nén lại, chỉ vàng dưới chân sáng dồn vào tâm
//   0.42–0.46  BÙNG     lá Át bích khổng lồ lật hiện, sao lóe bốn cánh, hào quang bật xoè, sóng chấn loang
//   0.46–0.62  GIỮ      lá Át lơ lửng nghiêng nhẹ, tia vàng sau lưng
//   0.62–0.86  VỠ       lá Át vỡ thành mảnh bài vàng lật lả tả rơi; lá kình lực tái sinh từ chỗ vỡ bay về quỹ đạo
export const ACE = { x: 0, y: 1.68, z: -0.36 };

export function aceTimeline(phase) {
  return {
    /** Tụ lực (lên tới đỉnh lúc lá Át sắp hiện rồi tắt). */
    charge: sstep(0.3, 0.42, phase) * (1 - sstep(0.44, 0.48, phase)),
    /** Lá kình lực bị hút về lá Át (0 = bay trên quỹ đạo, 1 = ở ngay tâm lá Át). */
    converge: sstep(0.3, 0.43, phase) * (1 - sstep(0.62, 0.78, phase)),
    /** Lá Át đang hiện. */
    present: sstep(0.42, 0.45, phase) * (1 - sstep(0.62, 0.635, phase)),
    /** Tiến độ lật hiện của lá Át (0 úp → 1 ngửa). */
    reveal: sstep(0.42, 0.47, phase),
    /** Hào quang bật xoè, ánh sáng bùng. */
    burst: sstep(0.42, 0.46, phase) * (1 - sstep(0.62, 0.74, phase)),
    /** Chớp sáng đúng khoảnh khắc lá Át hiện. */
    flash: bell(0.435, 0.018, phase),
    /** Sóng chấn dưới chân (âm = chưa có). */
    shock: (phase - 0.43) / 0.25,
    /** Tiến độ mảnh vỡ (âm hoặc > 1 = không có). */
    shatter: (phase - 0.62) / 0.24,
  };
}
