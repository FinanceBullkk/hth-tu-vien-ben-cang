// Sự kiện hẹn giờ: tới sân để cùng nghe, không cần canh nhịp hay bấm vòng sáng.
import { BELL, dist2d } from '../../../shared/layout.js';

export class BellEvent {
  constructor(app) {
    this.app = app;
    this.event = null;
    this.tapped = false;
  }

  apply(payload) {
    if (!payload) {
      this.event = null;
      this.app.hud.setBanner(null);
      return;
    }
    if (payload.phase === 'result') { this.finish(payload); return; }
    if (payload.phase === 'announce' && !this.event) {
      this.app.audio.chime(0.1);
      this.tapped = false;
    }
    this.event = payload;
  }

  update() {
    const e = this.event;
    if (!e) return;
    const { app } = this;
    const now = app.net.now();
    const inYard = dist2d(app.me.x, app.me.z, BELL.x, BELL.z) <= BELL.yardRadius;
    if (now < e.hitAt) {
      const left = Math.max(0, Math.ceil((e.hitAt - now) / 1000));
      app.hud.setBanner(e.message, inYard ? `Tiếng chuông sẽ ngân sau ${left} giây` : 'Tới sân chuông để cùng nghe với cả nhà');
      return;
    }
    if (inYard && !this.tapped && now <= e.hitAt + 1000) {
      this.tapped = true;
      app.net.call('bell:tap');
    }
    app.hud.setBanner(e.message, 'Dành một khoảng lặng, cùng nghe chuông ngân');
  }

  finish(result) {
    const { app } = this;
    this.event = null;
    this.tapped = false;
    if (result.count > 0) {
      app.audio.bell({ quality: 1, intensity: result.intensity, volume: 1 });
      app.world.celebrate(result.intensity);
      app.follow.shake(0.02 + result.intensity * 0.04);
      app.hud.setBanner(`${result.count} người cùng nghe chuông ${result.when}`, '', { ms: 9000, big: true });
    } else {
      app.hud.setBanner('Hẹn cả nhà lần sau cùng nghe chuông.', '', { ms: 6000 });
    }
  }
}
