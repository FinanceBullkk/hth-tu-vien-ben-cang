// Phần HUD câu cá cho đồ câu và đơn hàng: danh sách đơn hôm nay ở góc, nút rắc thính cạnh chọn mồi,
// sạp đồ câu (cần câu, thính) mở từ nút góc phải. Chỉ hiển thị; mua bán do activity gọi server.
import { FISH } from '../../../shared/fish.js';
import { FISH_RODS, THINH } from '../../../shared/fish-gear.js';
import { h } from './dom.js';

const fishName = (id) => FISH.find((f) => f.id === id)?.name ?? id;
const kg = (v) => v.toLocaleString('vi-VN');

export class FishingSuppliesView {
  constructor({ onBuy, onThinh }) {
    this.onBuy = onBuy;
    this.state = { rod: 0, rods: [], thinh: 0, orders: [], teu: 0 };
    this.orders = h('ul', { class: 'fish-orders', 'aria-label': 'Đơn cá hôm nay' });
    this.thinhBtn = h('button', { type: 'button', class: 'fish-thinh', 'aria-pressed': 'false', onClick: () => onThinh() });
    this.list = h('div', { class: 'fish-shop-list' });
    this.shop = h('div', { class: 'fish-shop', hidden: true, role: 'dialog', 'aria-label': 'Sạp đồ câu' },
      h('div', { class: 'fish-shop-head' },
        h('b', {}, 'Sạp đồ câu'),
        h('button', { type: 'button', class: 'fish-shop-close', 'aria-label': 'Đóng sạp', onClick: () => this.toggleShop(false) }, '×')),
      this.list);
    this.shopBtn = h('button', { type: 'button', class: 'fish-shop-open', onClick: () => this.toggleShop() }, 'Sạp đồ câu');
  }

  apply(info) {
    if (!info) return;
    for (const key of ['rod', 'rods', 'thinh', 'orders', 'teu']) if (info[key] != null) this.state[key] = info[key];
    this.renderOrders();
    this.renderShop();
  }

  setThinh(on) {
    const { thinh } = this.state;
    this.thinhBtn.textContent = `Thính ×${thinh}`;
    this.thinhBtn.classList.toggle('on', on);
    this.thinhBtn.setAttribute('aria-pressed', String(on));
    this.thinhBtn.title = thinh ? 'Rắc thính trước khi quăng: cá cắn nhanh, dễ ra cá quý' : 'Hết thính, mua ở Sạp đồ câu';
    this.thinhBtn.disabled = thinh <= 0;
  }

  renderOrders() {
    const { orders } = this.state;
    this.orders.replaceChildren(
      orders.length ? h('li', { class: 'fish-orders-title' }, 'Bếp chùa đặt hôm nay') : '',
      ...orders.map((o) => h('li', { class: o.done ? 'done' : '' },
        h('span', {}, `${o.done ? '✓ ' : ''}${fishName(o.fishId)}${o.minWeight ? ` ≥ ${kg(o.minWeight)} kg` : ''}`),
        h('small', {}, o.done ? `+${o.teu} TEU` : `${o.progress}/${o.need} · +${o.teu}`))),
    );
  }

  renderShop() {
    const { rod, teu, thinh } = this.state;
    const row = (name, note, action) => h('div', { class: 'fish-shop-row' }, h('div', {}, h('b', {}, name), h('small', {}, note)), action);
    const buyBtn = (item, price) => h('button', { type: 'button', disabled: teu < price, onClick: () => this.onBuy(item) }, `${price} TEU`);
    this.list.replaceChildren(
      h('p', { class: 'fish-shop-teu' }, `Đang có ${teu} TEU`),
      ...FISH_RODS.filter((r) => r.tier > 0).map((r) => row(
        r.name,
        `Vùng xanh +${Math.round((r.half - 1) * 100)}%, cá tụt chậm ${Math.round((1 - r.drain) * 100)}%, cá sử thi ×${r.luck?.[4] ?? 1}, huyền thoại ×${r.luck?.[5] ?? 1}`,
        r.tier <= rod ? h('span', { class: 'fish-shop-owned' }, r.tier === rod ? 'Đang dùng' : 'Đã có') : buyBtn(r.item, r.price),
      )),
      row(`${THINH.name} ×${THINH.pack}`, `Cá cắn nhanh, dễ ra cá quý và hiếm. Còn ${thinh} nắm`, buyBtn(THINH.item, THINH.price)),
    );
  }

  toggleShop(open = this.shop.hidden) {
    this.shop.hidden = !open;
    if (open) this.renderShop();
  }
}
