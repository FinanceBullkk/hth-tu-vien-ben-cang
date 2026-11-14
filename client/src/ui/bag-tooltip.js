// Bảng chi tiết nổi cạnh ô túi đồ (kiểu thẻ vật phẩm): tên tô màu phẩm chất, loại, chỉ số, giá, ghi chú.
// Chỉ dựng nội dung từ dữ liệu; vị trí do bag-panel.js đặt. Chuỗi SVG là hằng số trong mã nên gắn innerHTML an toàn.
import { FISH_RARITY, fishById } from '../../../shared/fish-catalog.js';
import { BAG_TAGS } from '../../../shared/fish-bag.js';
import { THINH, rodOf } from '../../../shared/fish-gear.js';
import { BAITS, fishForBait, fishHint } from '../../../shared/fish.js';
import { lookTip } from './bag-equip-tooltip.js';
import { h } from './dom.js';

const kg = (v) => `${v.toLocaleString('vi-VN')} kg`;
const pct = (v) => `${Math.round(v * 100)}%`;
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const rarityName = (r) => FISH_RARITY[r]?.name ?? FISH_RARITY[1].name;
const rarityColor = (r) => FISH_RARITY[r]?.color ?? FISH_RARITY[1].color;

/** Hình cần câu nhìn chéo, tô theo màu cần. */
export function rodGlyphSvg(tier) {
  const rod = rodOf(tier);
  return `<svg class="bag-glyph" viewBox="0 0 48 48" aria-hidden="true"><path d="M7 43 41 6" stroke="${hex(rod.color)}" stroke-width="3.4" stroke-linecap="round"/>`
    + '<path d="M41 6c3 9 2 17-3 24" stroke="#f5eeda" stroke-width="1" fill="none" opacity=".8"/><circle cx="38" cy="31" r="2.6" fill="#d94f35"/>'
    + '<circle cx="14" cy="35.5" r="4.6" fill="#2b1c13" stroke="#e7cf9a" stroke-width="1.6"/><circle cx="14" cy="35.5" r="1.4" fill="#e7cf9a"/></svg>';
}

/** Túi thính buộc miệng. */
export function thinhGlyphSvg() {
  return '<svg class="bag-glyph" viewBox="0 0 48 48" aria-hidden="true"><path d="M14 19h20l3.5 18.5c.6 3.4-1.6 5.5-4.8 5.5H15.3c-3.2 0-5.4-2.1-4.8-5.5z" fill="#c99a5b" stroke="#7a5428" stroke-width="1.6"/>'
    + '<path d="M15 19c1.5-6 16.5-6 18 0" fill="none" stroke="#7a5428" stroke-width="2.4"/><path d="M19 12.5l5 4 5-4" fill="none" stroke="#a8432a" stroke-width="2"/>'
    + '<circle cx="20" cy="29" r="1.6" fill="#f3d58a"/><circle cx="27" cy="33" r="1.6" fill="#f3d58a"/><circle cx="24" cy="26" r="1.3" fill="#f3d58a"/><circle cx="29" cy="27" r="1.2" fill="#f3d58a"/></svg>';
}

const line = (label, value, cls = '') => h('p', { class: `bag-tip-line${cls ? ` bag-tip-${cls}` : ''}` }, h('span', {}, `${label}: `), value);
const colored = (text, color) => h('b', { style: `color:${color}` }, text);

function fishTip(item) {
  const fish = fishById(item.ref);
  const rarity = fish?.rarity ?? 1;
  const color = rarityColor(rarity);
  const when = new Date(item.at);
  const tags = item.tags.map((t) => BAG_TAGS[t]).filter(Boolean);
  return [
    line('Tên', colored(fish?.name ?? 'Món lạ', color)),
    line('Phẩm chất', colored(`${rarityName(rarity)} ${'★'.repeat(rarity)}`, color)),
    line('Loại', fish?.bait === null ? 'Đồ thất lạc' : 'Cá'),
    line('Cân nặng', kg(item.weight), 'stat'),
    line('Giá bán', `${item.price} TEU`, 'stat'),
    tags.length ? h('p', { class: 'bag-tip-line bag-tip-good' }, tags.join(' · ')) : '',
    item.locked ? h('p', { class: 'bag-tip-line bag-tip-lock' }, 'Đang khoá · bán nhanh sẽ bỏ qua') : '',
    h('p', { class: 'bag-tip-line bag-tip-muted' }, `Câu lúc ${when.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${when.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`),
    fish ? h('p', { class: 'bag-tip-note' }, fishHint(fish)) : '',
  ];
}

function luckText(rod) {
  const parts = [3, 4, 5].map((r) => {
    const v = rod.luck?.[r] ?? 1;
    return v === 1 ? '' : `${rarityName(r)} ${v === 0 ? 'không kéo nổi' : `×${v}`}`;
  }).filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Bình thường';
}

/** owned: đã có; inUse: đang dùng (cần xịn nhất). */
function rodTip(tier, { owned, inUse }) {
  const rod = rodOf(tier);
  const color = rarityColor(rod.rarity);
  const status = inUse ? 'Đang dùng' : owned ? 'Đã có · cần xịn hơn đang được dùng' : `Giá ${rod.price} TEU`;
  return [
    line('Tên', colored(rod.name, color)),
    line('Phẩm chất', colored(rarityName(rod.rarity), color)),
    line('Loại', 'Cần câu'),
    line('Vùng xanh', rod.half > 1 ? `+${pct(rod.half - 1)}` : 'Gốc', 'stat'),
    line('Cá tụt chậm', rod.drain < 1 ? pct(1 - rod.drain) : 'Gốc', 'stat'),
    line('May mắn', luckText(rod), 'stat'),
    h('p', { class: `bag-tip-line bag-tip-${owned ? 'good' : 'warn'}` }, status),
    h('p', { class: 'bag-tip-note' }, 'Lúc câu tự dùng cây cần xịn nhất bạn có. Cần càng xịn càng hay dính cá sử thi, huyền thoại.'),
  ];
}

function thinhTip(count) {
  return [
    line('Tên', colored(THINH.name, rarityColor(2))),
    line('Phẩm chất', colored(rarityName(2), rarityColor(2))),
    line('Loại', 'Mồi rắc'),
    line('Còn', `${count} nắm`, 'stat'),
    line('Tác dụng', `cá cắn nhanh hơn ${pct(1 - THINH.waitFactor)}, dễ ra cá quý`, 'stat'),
    h('p', { class: 'bag-tip-note' }, `Bật nút "Thính" ở hồ trước khi quăng. Gói ${THINH.pack} nắm · ${THINH.price} TEU.`),
  ];
}

function baitTip(baitId) {
  const bait = BAITS.find((b) => b.id === baitId) ?? BAITS[0];
  return [
    line('Tên', colored(bait.name, rarityColor(1))),
    line('Loại', 'Mồi câu · miễn phí'),
    line('Hay cắn', fishForBait(bait.id).join(', '), 'stat'),
    h('p', { class: 'bag-tip-note' }, 'Đổi mồi ở hồ (phím Q) để gặp loài khác.'),
  ];
}

/**
 * Nội dung bảng chi tiết cho một ô: { kind: 'fish', item } | { kind: 'rod', tier, owned, inUse } | { kind: 'thinh', count }
 * | { kind: 'bait', bait } | { kind: 'look', slot, index, ... } (đồ ngoại hình, xem bag-equip-tooltip.js).
 */
export function tipContent(entry) {
  if (entry.kind === 'look') return lookTip(entry);
  if (entry.kind === 'rod') return rodTip(entry.tier, entry);
  if (entry.kind === 'bait') return baitTip(entry.bait);
  if (entry.kind === 'thinh') return thinhTip(entry.count);
  return fishTip(entry.item);
}

/**
 * Đặt bảng chi tiết cạnh ô neo, toạ độ tính trong host (khung cuộn có position: relative):
 * ưu tiên bên phải ô, hết chỗ thì lật sang trái; luôn nằm trong phần host đang nhìn thấy kể cả khi đã cuộn.
 */
export function placeTooltip(tip, host, anchor) {
  const a = anchor.getBoundingClientRect();
  const b = host.getBoundingClientRect();
  const w = tip.offsetWidth;
  const hgt = tip.offsetHeight;
  const gap = 10;
  let left = a.right - b.left + gap;
  if (left + w > host.clientWidth - 6) left = a.left - b.left - w - gap;
  left = Math.max(6, Math.min(left, host.clientWidth - w - 6)) + host.scrollLeft;
  const visibleTop = host.scrollTop + 6;
  const visibleBottom = host.scrollTop + host.clientHeight - hgt - 6;
  const top = Math.max(visibleTop, Math.min(a.top - b.top + host.scrollTop, visibleBottom));
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

export { rarityColor, rarityName };
