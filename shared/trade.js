// Trạm giao thương: hai người đứng ở trạm trao đổi trực tiếp đồ ngoại hình và TEU, cả hai cùng chốt thì đổi.
// Luật dùng chung cho server (kiểm tra) và client (hiển thị). Giao dịch miễn phí, không thu thuế.
import { isPaid, parseItemId } from './shop.js';

export const TRADE = {
  maxItems: 6, // Mỗi bên đặt tối đa chừng này món.
  maxTeu: 999, // Mỗi bên đặt tối đa chừng này TEU.
  inviteMs: 30_000, // Lời mời hết hạn sau 30 giây.
  idleMs: 180_000, // Phiên không ai đụng tới 3 phút thì tự huỷ.
  leaveMargin: 1.5, // Đi xa quá bán kính trạm + khoảng này thì huỷ phiên.
  inviteIntervalMs: 1500,
  offerIntervalMs: 200,
};

/**
 * Chuẩn hoá đề nghị client gửi lên: danh sách id món (không trùng, đã sắp xếp) và số TEU.
 * Chỉ kiểm tra hình thức; quyền sở hữu và số dư do server kiểm tra riêng.
 * @returns {{items: string[], teu: number} | {error: string}}
 */
export function readOffer(data) {
  const raw = data?.items ?? [];
  if (!Array.isArray(raw) || raw.length > TRADE.maxItems * 2) return { error: 'Đề nghị không hợp lệ.' };
  const items = [...new Set(raw)];
  if (items.length > TRADE.maxItems) return { error: `Mỗi lần đổi tối đa ${TRADE.maxItems} món thôi.` };
  if (!items.every((id) => parseItemId(id) && isPaid(id))) return { error: 'Món này không giao dịch được.' };
  const teu = data?.teu ?? 0;
  if (!Number.isInteger(teu) || teu < 0 || teu > TRADE.maxTeu) return { error: `TEU đặt vào từ 0 đến ${TRADE.maxTeu}.` };
  return { items: items.sort(), teu };
}

export const offerEmpty = (offer) => !offer.items.length && !offer.teu;
