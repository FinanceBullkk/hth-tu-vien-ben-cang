// Mặc, tháo đồ từ túi đồ: nhân vật đổi ngay trên máy mình, còn server nhận bộ đồ mới nhất qua "look:set".
// Server chỉ cho thay đồ mỗi giây một lần, nên bấm liên tục thì gom lại, gửi bộ cuối cùng khi tới lượt.
// Server từ chối (món chưa có, mất mạng) thì nhân vật về lại bộ server đã chốt và báo một dòng.
import { applyLook, lookOf, rememberLook } from './shop-panel.js';

// Server chặn ở 1000 ms tính từ lần thay thành công; đếm từ lúc nhận phản hồi nên chỉ cần dư một chút.
const GAP_MS = 1050;

export class LookSync {
  constructor(app) {
    this.app = app;
    this.want = null; // bộ đồ đang chờ gửi hoặc đang gửi, null khi đã khớp server
    this.timer = null;
    this.sending = false;
    this.lastDone = 0;
    this.listeners = new Set();
  }

  /** Bộ đồ đang hiện trên nhân vật mình: bộ đang chờ gửi, hoặc bộ server đã chốt. */
  get current() {
    return this.want ?? lookOf(this.app.profile);
  }

  /** Mặc bộ đồ mới: đổi nhân vật ngay, hẹn gửi server. */
  wear(look) {
    this.want = { ...look };
    applyLook(this.app.me.avatar, this.want);
    this.emit();
    this.schedule();
  }

  schedule() {
    if (this.sending || this.timer) return;
    const wait = Math.max(0, this.lastDone + GAP_MS - Date.now());
    this.timer = setTimeout(() => this.send(), wait);
  }

  async send() {
    this.timer = null;
    const look = this.want;
    if (!look) return;
    this.sending = true;
    const res = await this.app.net.call('look:set', look).catch(() => null);
    this.sending = false;
    this.lastDone = Date.now();
    if (res?.ok) rememberLook(this.app, res.look);
    if (this.want !== look) {
      // Trong lúc chờ đã bấm mặc món khác: gửi tiếp bộ mới nhất.
      this.schedule();
      return;
    }
    this.want = null;
    if (!res?.ok) {
      applyLook(this.app.me.avatar, lookOf(this.app.profile));
      this.app.hud.toast(res?.error || 'Chưa thay được đồ, thử lại nhé.');
    }
    this.emit();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this.current);
  }
}
