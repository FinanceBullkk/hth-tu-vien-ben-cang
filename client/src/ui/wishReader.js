// Thẻ đọc lời ước: hiện khi đứng gần và nhìn vào dải lụa/đèn/thẻ, hoặc khi bấm trực tiếp vào.
import { PLACE_LABELS } from '../../../shared/protocol.js';
import { $, h, timeAgo } from './dom.js';

export class WishReader {
  constructor(app) {
    this.app = app;
    this.el = $('wishReader');
    this.current = null;
    this.pinned = false;
    this.pinPos = { x: 0, z: 0 };
    this.timer = 0;

    this.textEl = h('p', { class: 'reader-text' });
    this.metaEl = h('p', { class: 'reader-meta' });
    this.heartBtn = h('button', { class: 'btn heart', type: 'button' });
    this.heartBtn.addEventListener('click', () => this.like());
    this.closeBtn = h('button', { class: 'reader-x', type: 'button', 'aria-label': 'Đóng' }, '✕');
    this.closeBtn.addEventListener('click', () => this.unpin());
    this.el.append(this.closeBtn, this.textEl, this.metaEl, this.heartBtn);
  }

  pin(entry) {
    this.pinned = true;
    this.pinPos.x = this.app.me.x;
    this.pinPos.z = this.app.me.z;
    this.setCurrent(entry);
  }

  unpin() {
    this.pinned = false;
    this.setCurrent(null);
    this.suppressUntil = performance.now() + 4000;
  }

  setCurrent(entry) {
    if (entry === this.current && entry) {
      this.renderHeart();
      return;
    }
    this.current = entry;
    this.el.hidden = !entry;
    if (!entry) return;
    this.textEl.textContent = `“${entry.text}”`;
    this.metaEl.textContent = `${entry.author} · ${timeAgo(entry.createdAt)} · ${PLACE_LABELS[entry.place]}`;
    this.renderHeart();
  }

  renderHeart() {
    const w = this.current;
    if (!w) return;
    this.heartBtn.textContent = w.liked ? `❤️ ${w.likes}` : `🤍 ${w.likes}`;
    this.heartBtn.disabled = w.mine || w.liked;
    this.heartBtn.title = w.mine ? 'Lời ước của bạn' : w.liked ? 'Bạn đã thả tim' : 'Thả tim (phím F)';
  }

  async like() {
    const w = this.current;
    if (!w || w.mine || w.liked) return;
    const res = await this.app.net.call('wish:like', { id: w.id });
    if (res?.ok) {
      w.liked = true;
      w.likes = res.likes;
      this.renderHeart();
      this.app.audio.pop();
    } else if (res?.error) {
      this.app.hud.toast(res.error);
    }
  }

  /** Lời ước bị ẩn hoặc xoá trong lúc đang đọc. */
  onRemoved(id) {
    if (this.current?.id === id) {
      this.pinned = false;
      this.setCurrent(null);
    }
  }

  onUpdate(id) {
    if (this.current?.id === id) this.renderHeart();
  }

  update(dt) {
    this.timer += dt;
    if (this.timer < 0.2) return;
    this.timer = 0;
    const { app } = this;
    if (app.isBusy()) {
      this.pinned = false;
      this.setCurrent(null);
      return;
    }
    if (this.pinned) {
      if (Math.hypot(app.me.x - this.pinPos.x, app.me.z - this.pinPos.z) > 3) this.pinned = false;
      else return;
    }
    if (performance.now() < (this.suppressUntil ?? 0)) return;
    this.setCurrent(app.world.wishes.nearestInView(app.me.x, app.me.z, app.camera, app.follow.forward));
  }
}
