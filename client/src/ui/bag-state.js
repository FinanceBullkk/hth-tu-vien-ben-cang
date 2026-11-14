// Túi đồ phía client: bản sao trạng thái server gửi (snapshot lúc vào, kết quả kéo cá, bán, khoá, mua đồ câu).
// Chỉ để hiển thị; mọi thay đổi thật đều đi qua server. Nút "Túi đồ" trên HUD hiện số món đang có.
import { BAG } from '../../../shared/fish-bag.js';
import { $ } from './dom.js';

const FIELDS = ['capacity', 'rod', 'thinh', 'species', 'caught'];

export class BagState {
  constructor() {
    this.items = [];
    this.capacity = BAG.capacity;
    this.rod = 0;
    this.thinh = 0;
    this.species = 0;
    this.caught = 0;
    this.listeners = new Set();
    this.badge = $('bagCount');
  }

  /** Áp dữ liệu mới; trường nào thiếu thì giữ nguyên. */
  apply(data = {}) {
    if (!data) return;
    for (const key of FIELDS) if (Number.isFinite(data[key])) this[key] = data[key];
    if (Array.isArray(data.items)) this.items = data.items;
    this.emit();
  }

  /** Con cá vừa kéo lên: thêm vào túi và cộng số đã câu. */
  addCatch(item, species) {
    if (item && !this.items.some((it) => it.id === item.id)) this.items = [...this.items, item];
    if (Number.isFinite(species)) this.species = species;
    this.caught += 1;
    this.emit();
  }

  remove(ids) {
    const gone = new Set(ids);
    this.items = this.items.filter((it) => !gone.has(it.id));
    this.emit();
  }

  setLocked(id, locked) {
    this.items = this.items.map((it) => (it.id === id ? { ...it, locked } : it));
    this.emit();
  }

  get full() {
    return this.items.length >= this.capacity;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    if (this.badge) {
      this.badge.textContent = this.items.length ? String(this.items.length) : '';
      this.badge.classList.toggle('full', this.full);
    }
    for (const fn of this.listeners) fn(this);
  }
}
