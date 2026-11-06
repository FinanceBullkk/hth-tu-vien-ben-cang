// Điều phối hoạt động: phát hiện điểm gần người chơi, bật/tắt hoạt động, khoá di chuyển.
import { ABBOT, BELL, CONTAINERS, POND, TEA, TREE, dist2d, inBox, isInsideHall } from '../../../shared/layout.js';
import { BellActivity, BellEvent } from './bell.js';
import { FortuneActivity } from './fortune.js';
import { MeditationActivity } from './meditation.js';
import { WishActivity } from './wish.js';

const KIND_CODE = { bell: 2, write: 3, shake: 4 };

export class Activities {
  constructor(app) {
    this.app = app;
    this.current = null;
    this.bell = new BellActivity(app);
    this.bellEvent = new BellEvent(app);
    this.meditation = new MeditationActivity(app);
    this.wish = new WishActivity(app);
    this.fortune = new FortuneActivity(app);
    this.zoneKey = '';
  }

  /** Bắt đầu một hoạt động. kind là trạng thái báo cho người khác; thiền tự gửi riêng. */
  enter(activity, kind) {
    if (this.current) return false;
    this.current = activity;
    const { app } = this;
    app.me.locked = activity.lockMove !== false;
    app.hud.setAction('', null);
    app.input.keys.clear();
    if (kind) {
      app.net.call('action:start', { kind });
      app.me.avatar.setActivity(KIND_CODE[kind]);
    }
    return true;
  }

  exit() {
    const activity = this.current;
    if (!activity) return;
    this.current = null;
    activity.cancel();
    const { app } = this;
    app.me.locked = false;
    app.me.avatar.setActivity(0);
    app.net.call('action:stop');
    this.zoneKey = '';
  }

  /** Mất kết nối giữa chừng: dừng hoạt động, không gửi gì lên server. */
  abort() {
    const activity = this.current;
    if (!activity) return;
    this.current = null;
    activity.cancel();
    this.app.me.locked = false;
    this.app.me.avatar.setActivity(0);
    this.zoneKey = '';
  }

  /** Điểm hoạt động ở gần người chơi. */
  zoneAt(x, z) {
    if (isInsideHall(x, z)) {
      const mat = this.meditation.nearestFreeMat(x, z);
      if (mat >= 0) return { key: `mat${mat}`, label: 'Ngồi thiền', run: () => this.meditation.start(mat) };
      return null;
    }
    if (dist2d(x, z, ABBOT.x, ABBOT.z) < ABBOT.actionRadius) {
      return { key: 'abbot', label: 'Xin thầy một lời', run: () => this.app.world.abbot.advise() };
    }
    if (dist2d(x, z, BELL.x, BELL.z) < BELL.radius) {
      return { key: 'bell', label: 'Thỉnh chuông', run: () => this.bell.start() };
    }
    if (dist2d(x, z, TREE.x, TREE.z) < TREE.radius) {
      return { key: 'tree', label: 'Treo lời ước lên cây', run: () => this.wish.start('tree') };
    }
    if (dist2d(x, z, POND.x, POND.z) < POND.actionRadius) {
      return { key: 'pond', label: 'Thả đèn lời ước', run: () => this.wish.start('pond') };
    }
    if (inBox(x, z, CONTAINERS, CONTAINERS.actionMargin)) {
      return { key: 'container', label: 'Dán lời ước lên container', run: () => this.wish.start('container') };
    }
    if (dist2d(x, z, TEA.x, TEA.z) < TEA.radius) {
      return { key: 'tea', label: 'Rút quẻ vận đơn', run: () => this.fortune.start() };
    }
    return null;
  }

  update(dt) {
    const { app } = this;
    this.bellEvent.update();
    if (this.current) {
      this.current.update(dt);
      return;
    }
    const busy = app.modalBusy();
    const zone = busy ? null : this.zoneAt(app.me.x, app.me.z);
    const key = zone?.key ?? '';
    if (key !== this.zoneKey) {
      this.zoneKey = key;
      app.hud.setAction(zone?.label ?? '', zone?.run ?? null);
    }
  }

  /** @returns {boolean} true nếu phím đã được hoạt động dùng. */
  onKey(code, isDown) {
    if (this.bellEvent.ringShown && isDown && this.bellEvent.onKey(code)) return true;
    if (!this.current) return false;
    if (this.current === this.bell && !isDown) return false;
    return this.current.onKey?.(code, isDown) ?? false;
  }
}
