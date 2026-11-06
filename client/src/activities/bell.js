// Thỉnh chuông cá nhân và sự kiện chuông hẹn giờ của cả công ty.
import { BELL, dist2d } from '../../../shared/layout.js';
import { LIMITS } from '../../../shared/protocol.js';

const RING_START = 2.8;
const RING_DURATION = 2.5;
const HIT_TIME = 1.9; // Giây kể từ lúc bắt đầu, khi vòng sáng chạm vạch.
const PERFECT_WINDOW = 0.6;

export class BellActivity {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.nextAllowed = 0;
    this.done = false;
    this.lockMove = true;
  }

  waitMs() {
    return Math.max(0, this.nextAllowed - performance.now());
  }

  setWait(ms) {
    this.nextAllowed = performance.now() + ms;
  }

  start() {
    const { app } = this;
    const wait = this.waitMs();
    if (wait > 0) {
      app.hud.toast(`Chuông đang nghỉ, đợi thêm ${Math.ceil(wait / 1000)} giây nhé.`);
      return;
    }
    if (!app.activities.enter(this, 'bell')) return;
    this.t = 0;
    this.done = false;
    app.me.rot = Math.atan2(BELL.x - app.me.x, BELL.z - app.me.z);
    app.ring.show('Chạm khi vòng sáng khớp vạch', {
      onTap: () => this.strike(),
      onCancel: () => app.activities.exit(),
    });
    app.ring.setScale(RING_START);
  }

  onKey(code) {
    if (['Space', 'KeyE', 'Enter'].includes(code)) {
      this.strike();
      return true;
    }
    return false;
  }

  update(dt) {
    if (this.done) return;
    this.t += dt;
    const scale = RING_START + ((1 - RING_START) * this.t) / HIT_TIME;
    this.app.ring.setScale(Math.max(0.25, scale));
    if (this.t >= RING_DURATION) this.strike();
  }

  async strike() {
    if (this.done) return;
    this.done = true;
    const { app } = this;
    const quality = Math.max(0, 1 - Math.abs(this.t - HIT_TIME) / PERFECT_WINDOW);
    app.ring.flash(quality > 0.45);
    app.ring.setHint(quality > 0.8 ? 'Ngân dài lắm!' : quality > 0.3 ? 'Chuông ngân rồi.' : 'Hơi lệch, chuông vẫn kêu nhé.');
    const res = await app.net.call('bell:strike', { quality });
    if (res?.ok) {
      this.setWait(LIMITS.bellCooldownMs);
    } else {
      if (res?.wait) this.setWait(res.wait);
      if (res?.error) app.hud.toast(res.error);
    }
    setTimeout(() => {
      if (app.activities.current === this) app.activities.exit();
    }, 900);
  }

  cancel() {
    this.app.ring.hide();
  }
}

/** Nhận sự kiện chuông từ server: banner, đếm ngược, vòng sáng chung, kết quả. */
export class BellEvent {
  constructor(app) {
    this.app = app;
    this.event = null;
    this.ringShown = false;
    this.tapped = false;
    this.lastBanner = '';
  }

  apply(payload) {
    if (!payload) {
      this.event = null;
      this.hideRing();
      if (!this.resultShowing) this.app.hud.setBanner(null);
      return;
    }
    if (payload.phase === 'result') {
      this.finish(payload);
      return;
    }
    if (payload.phase === 'announce' && !this.event) {
      this.app.audio.chime(0.1);
      this.tapped = false;
    }
    this.event = payload;
  }

  inYard() {
    const { me } = this.app;
    return dist2d(me.x, me.z, BELL.x, BELL.z) <= BELL.yardRadius;
  }

  hideRing() {
    if (this.ringShown) {
      this.ringShown = false;
      this.app.ring.hide();
    }
  }

  update() {
    const e = this.event;
    if (!e) return;
    const { app } = this;
    const now = app.net.now();
    if (now < e.at) {
      const left = Math.max(0, Math.ceil((e.at - now) / 1000));
      const mm = Math.floor(left / 60);
      const ss = String(left % 60).padStart(2, '0');
      app.hud.setBanner(e.message, `Còn ${mm}:${ss}`);
      return;
    }
    // Đến giờ: ai trong sân chuông thấy vòng sáng chung.
    const scale = 1 + ((e.hitAt - now) / 5000) * 2;
    const blocked = app.activities.current && app.activities.current.lockMove;
    if (this.inYard() && !blocked && !this.tapped) {
      if (!this.ringShown) {
        this.ringShown = true;
        app.ring.show('Cả nhà cùng chạm khi vòng sáng khớp vạch', { onTap: () => this.tap(), onCancel: null });
      }
      app.ring.setScale(Math.max(0.3, scale));
      app.hud.setBanner(e.message, 'Chạm đúng nhịp nào!');
    } else if (!this.inYard()) {
      this.hideRing();
      app.hud.setBanner(e.message, 'Ra sân chuông để cùng thỉnh nhé!');
    }
    if (now > e.hitAt + 1000) this.hideRing();
  }

  onKey(code) {
    if (this.ringShown && ['Space', 'KeyE', 'Enter'].includes(code)) {
      this.tap();
      return true;
    }
    return false;
  }

  async tap() {
    if (this.tapped) return;
    this.tapped = true;
    const { app } = this;
    app.audio.tick();
    const res = await app.net.call('bell:tap');
    app.ring.flash(res?.onBeat);
    app.ring.setHint(res?.onBeat ? 'Đúng nhịp!' : 'Đã chạm, chờ chuông ngân nhé.');
    setTimeout(() => this.hideRing(), 650);
    if (res?.error) app.hud.toast(res.error);
  }

  finish(result) {
    const { app } = this;
    this.event = null;
    this.tapped = false;
    this.hideRing();
    if (result.count > 0) {
      app.audio.bell({ quality: 1, intensity: result.intensity, volume: 1 });
      app.world.celebrate(result.intensity);
      app.follow.shake(0.02 + result.intensity * 0.04);
      const who = result.count === 1 ? '1 người' : `${result.count} người`;
      app.hud.setBanner(`${who} cùng thỉnh chuông ${result.when}`, '', { ms: 9000, big: true });
    } else {
      app.hud.setBanner('Lần này chuông ngủ quên rồi, hẹn cả nhà lần sau nhé.', '', { ms: 6000 });
    }
  }
}
