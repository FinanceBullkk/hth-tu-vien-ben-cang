// Hào quang võ hiệp quanh nhân vật — mỗi hệ một pháp tướng riêng trong vfx/.
// Cả 12 hệ đều đã có pháp tướng độc lập: hệ 1 Sen kim là hệ cuối chuyển sang module riêng
// (Cửu Phẩm Kim Liên); khối inline vẽ tay canvas và lớp aura-signature của các phiên trước
// đã được thanh lý vì chỉ còn hệ 1 dùng.
import { createSenKimAura } from './vfx/sen-kim-aura.js';
import { createKiemVuAura } from './vfx/kiem-vu-aura.js';
import { createTinhHaAura } from './vfx/tinh-ha-aura.js';
import { createLuuLyAura } from './vfx/luu-ly-aura.js';
import { createDaoHoaAura } from './vfx/dao-hoa-aura.js';
import { createHongLienAura } from './vfx/hong-lien-aura.js';
import { createNguyetBachAura } from './vfx/nguyet-bach-aura.js';
import { createBichNgocAura } from './vfx/bich-ngoc-aura.js';
import { createHuyenDaAura } from './vfx/huyen-da-aura.js';
import { createLongQuyenAura } from './vfx/long-quyen-aura.js';
import { createXichDiemAura } from './vfx/xich-diem-aura.js';
import { createKimLongAura } from './vfx/kim-long-aura.js';
import { store } from '../ui/dom.js';

export function createEffect(effect, lowQuality = false) {
  if (!effect) return { points: null, update() {}, setColor() {} };
  // Người chơi đè "giảm chuyển động" của hệ điều hành bằng toggle "Hiệu ứng động đầy đủ"
  // trong Đổi trang phục (localStorage fullFx=1) — đọc lại mỗi khung nên đổi là áp ngay.
  const reduceQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reducedMotion = reduceQuery ? {
    get matches() { return reduceQuery.matches && store.get('fullFx') !== '1'; },
  } : null;
  // 1: Sen kim có pháp tướng riêng (đài sen ba tầng nở lệch nhịp, bồ nhụy, hoạt lộ, bụi vàng).
  if (effect === 1) return createSenKimAura(lowQuality, reducedMotion);
  // 3: Tinh Hà có pháp tướng riêng (Chu Thiên Tinh Đồ, Bắc Đẩu, lưu tinh, tinh bàn).
  if (effect === 3) return createTinhHaAura(lowQuality, reducedMotion);
  // 2: Lưu Ly Vân Thủy có pháp tướng riêng (thủy luân xoáy nước, song lý, mặt hồ).
  if (effect === 2) return createLuuLyAura(lowQuality, reducedMotion);
  // 5: Đào Hoa Tri Kỷ có pháp tướng riêng (nguyệt môn ngọc, cành đào 3D, cánh đào rơi).
  if (effect === 5) return createDaoHoaAura(lowQuality, reducedMotion);
  // 4: Hồng Liên Hỏa Vũ có pháp tướng riêng (cánh chu tước giang ngang, phượng vĩ, sen lửa).
  if (effect === 4) return createHongLienAura(lowQuality, reducedMotion);
  // 7: Nguyệt Bạch Tri Âm có pháp tướng riêng (trăng tròn lệch vai, cổ cầm ngân, gương nước).
  if (effect === 7) return createNguyetBachAura(lowQuality, reducedMotion);
  // 8: Huyền Dạ Du Hành có pháp tướng riêng (nhật thực đen, lông quạ, xoáy mực hút vào tâm).
  if (effect === 8) return createHuyenDaAura(lowQuality, reducedMotion);
  // 6: Bích Ngọc Thanh Phong có pháp tướng riêng (rừng trúc ngọc, gió xoáy cuốn lá, đá rêu).
  if (effect === 6) return createBichNgocAura(lowQuality, reducedMotion);
  // 9: Long Quyền có pháp tướng riêng (hỏa long xoắn ốc từ chân vươn quyền, ấn quyền, vết nứt chấn địa).
  if (effect === 9) return createLongQuyenAura(lowQuality, reducedMotion);
  // 10: Xích Diễm Lưu Vân có pháp tướng riêng (đài mây lửa thấp rộng, vòng lửa ngang eo).
  if (effect === 10) return createXichDiemAura(lowQuality, reducedMotion);
  // 11: Kim Long Nguyệt Ảnh có pháp tướng riêng (rồng vàng vắt vòm qua đầu, long châu, nửa trăng, biển mây).
  if (effect === 11) return createKimLongAura(lowQuality, reducedMotion);
  // 12: Thanh Phong Kiếm Vũ có pháp tướng riêng (kiếm luân, phi kiếm, trận đồ).
  if (effect === 12) return createKiemVuAura(lowQuality, reducedMotion);
  // Mã hệ lạ (bản cũ hơn gửi sang): không dựng hào quang thay vì lỗi.
  return { points: null, update() {}, setColor() {} };
}

/** main.js vẫn gọi mỗi khung; độ sáng ngày/đêm nay nằm trong từng pháp tướng riêng nên đây
    là chốt trống giữ hợp đồng để khỏi sửa main.js. */
export function setAuraNight() {}
