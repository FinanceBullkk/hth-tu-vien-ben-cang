// Hiệu ứng nhỏ của túi đồ cho có cảm giác "game": số TEU chạy lên, chữ +TEU bay lên từ ví,
// ô vừa bán loé vàng rồi thu lại. Chỉ là trang trí: tắt chuyển động trong hệ điều hành thì chạy ngay tức khắc.
import { h } from './dom.js';

const reduced = () => {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** Đếm số từ from tới to trong ms mili giây. Gọi lại giữa chừng thì lần cũ tự dừng. */
export function countTo(el, from, to, ms = 520) {
  const token = (el.dataset.countToken = String(Number(el.dataset.countToken ?? 0) + 1));
  if (from === to || reduced()) { el.textContent = String(to); return; }
  const start = performance.now();
  const step = (now) => {
    if (el.dataset.countToken !== token) return;
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = String(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Chữ bay lên từ phía trên phần tử anchor, nằm trong host (khung có position). */
export function floatText(host, anchor, text) {
  if (!anchor || reduced()) return;
  const a = anchor.getBoundingClientRect();
  const b = host.getBoundingClientRect();
  const el = h('span', { class: 'bagx-float', style: `left:${a.left - b.left + a.width / 2 + host.scrollLeft}px;top:${a.top - b.top + host.scrollTop}px` }, text);
  host.append(el);
  setTimeout(() => el.remove(), 1200);
}

/** Cho các ô (theo key) loé lên rồi thu lại; đợi xong hiệu ứng mới trả về để túi vẽ lại. */
export function playSold(host, keys, ms = 280) {
  if (reduced()) return Promise.resolve();
  let any = false;
  for (const key of keys.slice(0, 49)) {
    const slot = host.querySelector(`.bagx-grid [data-key="${key}"]`);
    if (slot) { slot.classList.add('selling'); any = true; }
  }
  return any ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}
