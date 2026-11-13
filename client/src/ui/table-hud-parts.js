// Mảnh giao diện dùng chung cho hai bàn bầu cua và xì dách, theo lối các trang cược: vòng đếm ngược to ở đầu bảng,
// chữ báo pha lớn giữa màn hình ("Đặt cược!", "Ngừng cược"), chip bay từ khay tới chỗ đặt, số dư ví chạy số.
// Chỉ vẽ, không giữ luật; CSS ở table-hud.css.
import { h } from './dom.js';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Mệnh giá chip -> màu (ngà / đỏ / vàng), dùng chung cho khay chip, chồng chip trên ô và chip bay. */
export const chipTier = (amount) => (amount >= 10 ? 'gold' : amount >= 5 ? 'red' : 'ivory');

/** Vòng đếm ngược: viền vàng chạy lùi quanh số giây, đỏ dần khi còn dưới 3 giây. */
export class TimerRing {
  constructor() {
    this.num = h('b');
    this.el = h('div', { class: 'tbl-ring', 'aria-hidden': 'true' }, this.num);
  }

  /** leftMs: còn lại; spanMs: cả quãng. leftMs null là không đếm (ẩn số, vòng mờ). */
  set(leftMs, spanMs) {
    const on = leftMs != null;
    const text = on ? String(Math.ceil(leftMs / 1000)) : '';
    if (this.num.textContent !== text) this.num.textContent = text;
    this.el.style.setProperty('--p', on ? Math.max(0, Math.min(1, leftMs / spanMs)).toFixed(3) : '0');
    this.el.classList.toggle('idle', !on);
    this.el.classList.toggle('urgent', on && leftMs <= 3000);
  }
}

/** Chữ báo pha giữa màn hình: hiện một nhịp rồi tự tắt. Không nhận bấm. */
export class Callout {
  constructor() {
    this.el = h('div', { class: 'tbl-callout', hidden: true, 'aria-live': 'polite' });
    document.body.append(this.el);
    this.timer = 0;
  }

  /** tone: go (xanh, mời cược) | stop (đỏ, khoá cược) | turn (vàng, tới lượt). */
  show(text, tone = 'go', ms = 1300) {
    clearTimeout(this.timer);
    this.el.textContent = text;
    this.el.dataset.tone = tone;
    this.el.hidden = true;
    void this.el.offsetWidth; // Gắn lại để hoạt ảnh chạy từ đầu khi hai chữ liền nhau.
    this.el.hidden = false;
    this.timer = setTimeout(() => this.hide(), ms);
  }

  hide() {
    clearTimeout(this.timer);
    this.el.hidden = true;
  }
}

/** Một đồng chip bay từ phần tử from tới phần tử to (khay chip -> ô cược, hoặc ô cược -> ví khi thắng). */
export function flyChip(from, to, amount) {
  if (!from || !to || reduceMotion()) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  if (!a.width || !b.width) return; // Phần tử đang ẩn.
  const chip = h('i', { class: `tbl-flychip ${chipTier(amount)}` }, String(amount));
  document.body.append(chip);
  const x0 = a.left + a.width / 2;
  const y0 = a.top + a.height / 2;
  const x1 = b.left + b.width / 2;
  const y1 = b.top + b.height / 2;
  const lift = Math.min(80, Math.abs(x1 - x0) * 0.25 + 30); // Bay vòng lên như tung chip.
  chip.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
    { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - lift}px) scale(1.15)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${x1}px, ${y1}px) scale(.7)`, opacity: 0.2 },
  ], { duration: 420, easing: 'cubic-bezier(.3, .7, .4, 1)' }).finished.finally(() => chip.remove());
}

/** Số dư chạy từ số cũ tới số mới trong ~0,5 giây; tăng thì nháy vàng, giảm thì nháy đỏ nhạt. */
export function countTo(el, value) {
  const from = Number(el.dataset.value ?? value);
  el.dataset.value = String(value);
  cancelAnimationFrame(Number(el.dataset.raf || 0));
  if (from === value || reduceMotion()) {
    el.textContent = String(value);
    return;
  }
  el.classList.remove('up', 'down');
  void el.offsetWidth;
  el.classList.add(value > from ? 'up' : 'down');
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 500);
    el.textContent = String(Math.round(from + (value - from) * (1 - (1 - t) ** 3)));
    if (t < 1) el.dataset.raf = String(requestAnimationFrame(step));
  };
  el.dataset.raf = String(requestAnimationFrame(step));
}
