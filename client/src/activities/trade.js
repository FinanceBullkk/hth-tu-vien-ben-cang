// Trạm giao thương phía client: giữ lời mời đang chờ và phiên đang mở, gọi server, mở bảng giao dịch.
// Server là nguồn sự thật: đề nghị, trạng thái chốt và kết quả đều là bản server gửi về (trade:state, trade:done).
// Không phải hoạt động khoá di chuyển như câu cá: chỉ là một bảng, giống Sạp Kim Bảo.
import { TRADE_POST, dist2d } from '../../../shared/layout.js';
import { itemName, parseItemId } from '../../../shared/shop.js';
import { applyLook, rememberLook } from '../ui/shop-panel.js';
import { openTradePanel } from '../ui/trade-panel.js';

const listNames = (offer) => [
  ...offer.items.map((id) => {
    const it = parseItemId(id);
    return it ? itemName(it.slot, it.index) : id;
  }),
  ...(offer.teu ? [`${offer.teu} TEU`] : []),
].join(', ') || 'không gì';

export class TradeController {
  constructor(app) {
    this.app = app;
    this.state = null; // Bản trade:state mới nhất của phiên đang mở.
    this.invites = new Map(); // sid người mời -> { name, expires }
    this.panel = null;
    this.listeners = new Set();
  }

  inZone(x, z) {
    return dist2d(x, z, TRADE_POST.x, TRADE_POST.z) < TRADE_POST.radius;
  }

  /** Người khác đang đứng ở trạm, theo vị trí hiện trên máy mình (server vẫn kiểm tra lại khi mời). */
  nearby() {
    const out = [];
    for (const [sid, r] of this.app.remotes.map) {
      const { x, z } = r.avatar.root.position;
      if (this.inZone(x, z)) out.push({ sid, name: r.name });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Lời mời còn hạn, mới nhất trước. */
  pendingInvites(now = Date.now()) {
    for (const [sid, inv] of this.invites) if (inv.expires < now) this.invites.delete(sid);
    return [...this.invites].map(([sid, inv]) => ({ sid, ...inv })).reverse();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  changed() {
    for (const fn of this.listeners) fn();
  }

  open() {
    if (!this.panel) this.panel = openTradePanel(this.app, this, () => { this.panel = null; });
    return this.panel;
  }

  async call(event, data) {
    const res = await this.app.net.call(event, data);
    if (!res?.ok && res?.error) this.app.hud.toast(res.error);
    return res;
  }

  async invite(sid) {
    const res = await this.call('trade:invite', { to: sid });
    if (res?.ok) this.app.hud.toast('Đã gửi lời mời, chờ người ta nhận nhé.');
  }

  async respond(sid, accept) {
    this.invites.delete(sid);
    this.changed();
    await this.call('trade:respond', { from: sid, accept });
  }

  offer(items, teu) {
    return this.call('trade:offer', { items, teu });
  }

  ready(on) {
    if (this.state) return this.call('trade:ready', { rev: this.state.rev, ready: on });
    return null;
  }

  cancel() {
    if (this.state) this.app.net.call('trade:cancel');
    this.state = null;
    this.changed();
  }

  // ---------- sự kiện từ server (main.js nối) ----------

  onInvite({ from, name, ttl }) {
    this.invites.set(from, { name, expires: Date.now() + ttl });
    this.app.audio.pop?.();
    this.app.hud.toast(`${name} mời bạn giao dịch ở Trạm giao thương.`);
    if (!this.app.activities.current) this.open();
    this.changed();
  }

  onDeclined({ name }) {
    this.app.hud.toast(`${name} chưa muốn giao dịch lúc này.`);
  }

  onState(state) {
    this.state = state;
    if (!this.app.activities.current) this.open();
    this.changed();
  }

  onDone(res) {
    const { app } = this;
    this.state = null;
    app.wallet.apply({ teu: res.teu, owned: res.owned });
    if (res.look) {
      applyLook(app.me.avatar, res.look);
      rememberLook(app, res.look);
    }
    app.audio.pop?.();
    app.hud.toast(`Đổi xong với ${res.partner}: nhận ${listNames(res.got)}, đưa ${listNames(res.gave)}.`, { ms: 6000 });
    this.panel?.close();
    this.changed();
  }

  onClosed({ reason }) {
    this.state = null;
    this.app.hud.toast(reason);
    this.changed();
  }

  /** Mất kết nối: server đã huỷ phiên, xoá trạng thái trên máy. */
  reset() {
    this.state = null;
    this.invites.clear();
    this.panel?.close();
  }
}
