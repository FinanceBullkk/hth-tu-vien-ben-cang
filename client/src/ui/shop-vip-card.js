// Thẻ hào quang chí tôn trong Sạp Kim Bảo (Thần bài, Vua câu cá): chiếm cả hàng, nền sơn mài, ấn triện
// hai chữ, kèm điều kiện thành tích và thanh tiến độ. Số liệu tiến độ do server đếm (sự kiện shop:progress);
// thẻ chỉ hiển thị, nút Mua vẫn do server quyết.
import { itemName, requirementHave, requirementOf } from '../../../shared/shop.js';
import { h } from './dom.js';

// Ấn triện và tông nền của từng món: Thần bài sơn mài đỏ son, Vua câu cá sơn mài xanh biển.
const VIP_LOOK = {
  'effect:13': { seal: '賭神', theme: 'gold' },
  'effect:14': { seal: '漁王', theme: 'sea' },
};

/** Đã đạt bao nhiêu (không vượt mốc), hoặc null khi chưa tải xong tiến độ. */
function haveOf(id, progress) {
  const req = requirementOf(id);
  return progress && req ? Math.min(requirementHave(id, progress), req.need) : null;
}

/** Câu trạng thái dưới chân sạp khi đang thử món chưa đủ điều kiện. */
export function requirementStatus(id, progress) {
  const req = requirementOf(id);
  if (!req) return '';
  const have = haveOf(id, progress);
  return have === null ? `Cần: ${req.label}.` : `Cần: ${req.label} · đang ${have}/${req.need}.`;
}

/**
 * Thẻ một món chí tôn. owned/on/poor như thẻ thường; progress là tiến độ server trả về (có thể null).
 * @param {{ id: string, slot: string, index: number, price: number }} it
 */
export function vipCard(it, { owned, on, poor, progress, onPick }) {
  const req = requirementOf(it.id);
  const look = VIP_LOOK[it.id] ?? { seal: '寶', theme: 'gold' };
  const have = haveOf(it.id, progress);
  const met = owned || (have !== null && have >= req.need);
  const cls = ['shopx-card', 'vip', `vip-${look.theme}`];
  if (owned) cls.push('owned');
  if (on) cls.push('on');
  if (!met) cls.push('locked');
  else if (!owned && poor) cls.push('poor');
  const card = h('button', { class: cls.join(' '), type: 'button', 'aria-pressed': on ? 'true' : 'false' },
    h('span', { class: 'shopx-vip-seal', 'aria-hidden': 'true' }, owned ? '✓' : look.seal),
    h('span', { class: 'shopx-vip-body' },
      h('span', { class: 'shopx-vip-tag' }, 'Chí tôn'),
      h('span', { class: 'shopx-name' }, itemName(it.slot, it.index)),
      h('span', { class: 'shopx-vip-req' }, owned ? 'Danh hiệu đã thuộc về bạn.' : req.label),
      owned ? null : h('span', { class: 'shopx-vip-bar', style: `--p:${have === null ? 0 : have / req.need}` }, h('i')),
      owned ? null : h('span', { class: 'shopx-vip-progress' }, have === null ? 'Đang xem tiến độ…' : `${have}/${req.need} ${req.unit}`)),
    h('span', { class: 'shopx-price' }, owned ? 'Đã có' : `${it.price} TEU`));
  card.addEventListener('click', onPick);
  return card;
}
