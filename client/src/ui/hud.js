// HUD: đếm người, danh sách, nút góc màn hình, nút hành động, thông báo nhỏ, banner sự kiện.
import { $, h } from './dom.js';

export class Hud {
  constructor(app) {
    this.app = app;
    this.root = $('hud');
    this.onlineCount = $('onlineCount');
    this.visitsEl = $('visitsToday');
    this.onlineList = $('onlineList');
    this.actionBtn = $('actionBtn');
    this.actionLabel = $('actionLabel');
    this.toasts = $('toasts');
    this.banner = $('banner');
    this.muteBtn = $('muteBtn');
    this.actionFn = null;
    this.bannerTimer = null;

    $('onlineBtn').addEventListener('click', () => this.toggleOnlineList());
    this.actionBtn.addEventListener('click', () => this.runAction());
    this.muteBtn.addEventListener('click', () => {
      const next = !app.audio.muted;
      app.audio.setMuted(next);
      this.syncMute();
    });
    this.syncMute();
  }

  show() {
    this.root.hidden = false;
  }

  syncMute() {
    const muted = this.app.audio.muted;
    this.muteBtn.textContent = muted ? '🔇' : '🔊';
    const label = muted ? 'Mở tiếng' : 'Tắt tiếng';
    this.muteBtn.title = label;
    this.muteBtn.setAttribute('aria-label', label);
  }

  setPresence(online, visits) {
    this.onlineCount.textContent = String(online);
    this.visitsEl.textContent = String(visits);
    if (!this.onlineList.hidden) this.renderOnlineList();
  }

  toggleOnlineList() {
    this.onlineList.hidden = !this.onlineList.hidden;
    if (!this.onlineList.hidden) this.renderOnlineList();
  }

  renderOnlineList() {
    const names = [this.app.myName, ...[...this.app.remotes.map.values()].map((r) => r.name)];
    this.onlineList.replaceChildren(
      ...names.map((name, i) => h('li', { class: i === 0 ? 'me' : '' }, i === 0 ? `${name} (bạn)` : name)),
    );
  }

  /** Nút hành động to: chỉ hiện khi ở gần điểm hoạt động. */
  setAction(label, fn) {
    this.actionFn = fn;
    if (!fn) {
      this.actionBtn.hidden = true;
      return;
    }
    this.actionLabel.textContent = label;
    this.actionBtn.hidden = false;
  }

  runAction() {
    if (this.actionFn) this.actionFn();
  }

  toast(text, { ms = 3400, kind = '' } = {}) {
    const el = h('div', { class: `toast ${kind}` }, text);
    this.toasts.append(el);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 400);
    }, ms);
  }

  /** Banner trên cùng: đếm ngược và kết quả sự kiện chuông. */
  setBanner(text, sub = '', { ms = 0, big = false } = {}) {
    clearTimeout(this.bannerTimer);
    if (!text) {
      this.banner.hidden = true;
      return;
    }
    this.banner.hidden = false;
    this.banner.classList.toggle('big', big);
    if (this.bannerText !== text) {
      this.bannerText = text;
      $('bannerText').textContent = text;
    }
    $('bannerSub').textContent = sub;
    if (ms) {
      this.bannerTimer = setTimeout(() => {
        this.banner.hidden = true;
        this.bannerText = null;
      }, ms);
    }
  }
}
