// Đồ câu và đơn hàng trong lúc câu: tải từ server khi ra hồ, bật/tắt rắc thính, mua ở sạp.
// Tách khỏi fishing.js để vòng trạng thái câu cá gọn; HUD hiển thị nằm ở ui/fishing-supplies.js.
export class FishingSuppliesControl {
  constructor({ app, panel }) {
    Object.assign(this, { app, panel });
    this.useThinh = false; // lần quăng tới có rắc thính không
  }

  get view() {
    return this.panel.supplies;
  }

  /** Cần đang dùng, số thính, đơn hôm nay. stillHere(): người chơi chưa rời hồ trong lúc chờ mạng. */
  async load(stillHere) {
    const info = await this.app.net.call('fish:gear').catch(() => null);
    if (stillHere() && info?.ok) this.apply(info);
  }

  apply(info) {
    const { app, view } = this;
    view.apply(info);
    app.bag.apply({ rod: info.rod, thinh: info.thinh }); // túi đồ cũng hiện đúng cần, số thính
    if (Number.isFinite(info.teu)) app.wallet.apply({ teu: info.teu });
    if (info.rod != null) app.world.fishing.setRodTier(app.sid, info.rod);
    if (!view.state.thinh) this.useThinh = false;
    view.setThinh(this.useThinh);
  }

  toggle() {
    if (!this.view.state.thinh) return;
    this.useThinh = !this.useThinh;
    this.view.setThinh(this.useThinh);
    this.app.audio.tick();
  }

  async buy(item) {
    const { app } = this;
    const res = await app.net.call('fish:buy', { item }).catch(() => null);
    if (res?.rod != null) {
      // Vừa mua thính thì bật luôn cho lần quăng tới: mua là để dùng.
      if (res.ok && item === 'thinh') this.useThinh = true;
      this.apply(res);
    }
    if (res?.ok) {
      app.audio.chime(0.05);
      app.hud.toast(item === 'thinh' ? 'Đã mua thính, lần quăng tới sẽ rắc.' : 'Đã thay cần mới!');
    } else app.hud.toast(res?.error || 'Chưa mua được, thử lại nhé.');
  }
}
