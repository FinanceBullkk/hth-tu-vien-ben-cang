// Thanh nút dưới lưới túi đồ: nút cho ô đang chọn (bán, khoá, mua cần hay thính) và hàng bán nhanh.
// Chỉ dựng nút theo trạng thái được truyền vào; gửi lệnh và vẽ lại là việc của bag-panel.js.
import { bagValue, quickSellable } from '../../../shared/fish-bag.js';
import { FISH_RODS, THINH } from '../../../shared/fish-gear.js';
import { h } from './dom.js';

const HINT = {
  equip: 'Bấm đúp để mặc hay tháo.',
  fish: 'Rê chuột vào ô để xem, bấm để chọn bán hoặc khoá.',
  gear: 'Rê chuột để xem, bấm để chọn cần hay thính muốn mua.',
};

/**
 * Các nút cho ô đang chọn.
 * ctx: { entry, tab, armed, busy, bag, wallet, sell(ids, confirmKey), lock(item), buy(itemId), wear(entry), toShop(), canStrip }
 */
export function selectionButtons({ entry, tab, armed, busy, bag, wallet, sell, lock, buy, wear, toShop, canStrip }) {
  const btn = (label, cls, onClick, disabled = false) => h('button', { type: 'button', class: `bagx-btn ${cls}`, disabled: busy || disabled, onClick }, label);
  if (!entry) {
    const hint = h('p', { class: 'bagx-hint' }, HINT[tab] ?? HINT.fish);
    return tab === 'equip' ? [hint, btn('Thêm đồ ở Cửa hàng', 'cool', toShop)] : [hint];
  }
  if (entry.kind === 'look') {
    if (entry.empty) return [h('p', { class: 'bagx-hint' }, 'Ô đang trống, bấm đúp món trong túi để mặc.')];
    return entry.worn
      ? [btn(canStrip ? 'Tháo' : 'Đồ gốc, không tháo được', 'cool', () => wear(entry), !canStrip)]
      : [btn('Mặc', 'warm', () => wear(entry))];
  }
  if (entry.kind === 'fish') {
    const { item } = entry;
    // Cá sử thi, huyền thoại phải bấm hai lần mới bán, khỏi lỡ tay.
    const needConfirm = entry.rarity >= 4;
    const sellLabel = armed === entry.key ? 'Bấm lần nữa để bán' : `Bán · ${item.price} TEU`;
    return [
      btn(item.locked ? 'Mở khoá' : 'Khoá', 'cool', () => lock(item)),
      btn(sellLabel, armed === entry.key ? 'hot' : 'warm', () => sell([item.id], needConfirm ? entry.key : null), item.locked),
    ];
  }
  if (entry.kind === 'thinh') {
    const full = bag.thinh + THINH.pack > THINH.maxStock;
    return [btn(full ? 'Giỏ thính đầy' : `Mua ${THINH.pack} nắm · ${THINH.price} TEU`, 'warm', () => buy(THINH.item), full || wallet.teu < THINH.price)];
  }
  const rod = FISH_RODS[entry.tier];
  if (entry.inUse || rod.tier <= bag.rod) return [btn(entry.inUse ? 'Đang dùng' : 'Đã có cần xịn hơn', 'cool', null, true)];
  const poor = wallet.teu < rod.price;
  return [btn(poor ? `Thiếu ${rod.price - wallet.teu} TEU` : `Mua · ${rod.price} TEU`, 'warm', () => buy(rod.item), poor)];
}

/** Cập nhật nút bán nhanh: đếm món, tổng tiền; bán nhiều hay có cá hiếm thì bấm hai lần. */
export function updateQuickSell(button, { items, maxRarity, armed, busy, sell }) {
  const list = quickSellable(items, maxRarity);
  const key = `quick${maxRarity}`;
  button.textContent = armed === key ? `Bán ${list.length} món?` : `${list.length} món · ${bagValue(list)} TEU`;
  button.classList.toggle('hot', armed === key);
  button.disabled = busy || list.length === 0;
  button.onclick = () => sell(list.map((it) => it.id), maxRarity >= 3 || list.length > 10 ? key : null);
}
