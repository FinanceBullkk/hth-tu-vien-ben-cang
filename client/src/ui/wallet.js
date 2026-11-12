// Ví TEU và tủ đồ đã sở hữu của người chơi: số liệu từ server (snapshot, sự kiện "wallet", kết quả mua),
// hiển thị ở chip trên HUD. Danh sách món lưu lại trên máy để màn chào biết món nào đã mở trước khi vào phòng.
import { $, store } from './dom.js';

export class Wallet {
  constructor() {
    this.teu = 0;
    this.owned = new Set(store.getJson('owned') ?? []);
    this.listeners = new Set();
    this.chip = $('walletBtn');
    this.valueEl = $('walletValue');
  }

  /** Áp dữ liệu mới; trường nào thiếu thì giữ nguyên. Số TEU tăng thì chip nảy nhẹ kèm "+N". */
  apply({ teu, owned } = {}) {
    if (Array.isArray(owned)) {
      this.owned = new Set(owned.filter((id) => typeof id === 'string'));
      store.setJson('owned', [...this.owned]);
    }
    if (Number.isFinite(teu)) {
      const gain = teu - this.teu;
      this.teu = teu;
      if (gain > 0 && this.ready) this.pulse(gain);
      this.ready = true;
    }
    this.render();
    for (const fn of this.listeners) fn(this);
  }

  grant(item) {
    this.owned.add(item);
    this.apply({ owned: [...this.owned] });
  }

  has(item) {
    return this.owned.has(item);
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  render() {
    if (this.valueEl) this.valueEl.textContent = String(this.teu);
  }

  pulse(gain) {
    if (!this.chip) return;
    this.chip.dataset.gain = `+${gain}`;
    this.chip.classList.remove('gain');
    void this.chip.offsetWidth; // Khởi động lại animation khi được cộng liên tiếp.
    this.chip.classList.add('gain');
  }
}
