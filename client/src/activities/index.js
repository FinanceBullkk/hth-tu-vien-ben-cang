// Điều phối hoạt động: phát hiện điểm gần người chơi, bật/tắt hoạt động, khoá di chuyển.
import { ABBOT, BELL, CONTAINERS, GATE_MONK, LAKE, PITCH_ZONE, POND, TEA, TREE, dist2d, inBox, isInsideHall, lakeDistance } from '../../../shared/layout.js';
import { BellEvent } from './bell-event.js';
import { FishingActivity } from './fishing.js';
import { FortuneActivity } from './fortune.js';
import { PitchActivity } from './pitch.js';
import { RiddleActivity } from './riddle.js';
import { RhythmActivity } from './rhythm.js';
import { MeditationActivity } from './meditation.js';
import { WishActivity } from './wish.js';

const KIND_CODE = { bell: 2, write: 3, shake: 4, fish: 5, pitch: 6 };

export class Activities {
  constructor(app) {
    this.app = app;
    this.current = null;
    this.bell = new RhythmActivity(app, 'bell');
    this.bellEvent = new BellEvent(app);
    this.meditation = new MeditationActivity(app);
    this.lotus = new RhythmActivity(app, 'meditate');
    this.wish = new WishActivity(app);
    this.fortune = new FortuneActivity(app);
    this.fishing = new FishingActivity(app);
    this.pitch = new PitchActivity(app);
    this.riddle = new RiddleActivity(app);
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
    }
    if (dist2d(x, z, ABBOT.x, ABBOT.z) < ABBOT.actionRadius) {
      return { key: 'abbot', label: 'Xin thầy một lời', run: () => this.app.world.abbot.advise() };
    }
    if (dist2d(x, z, GATE_MONK.x, GATE_MONK.z) < GATE_MONK.actionRadius) {
      return { key: 'riddle', label: 'Xin sư chú một câu đố', run: () => this.riddle.start() };
    }
    if (dist2d(x, z, BELL.x, BELL.z) < BELL.radius) {
      return { key: 'bell', label: 'Chơi nhịp chuông', run: () => this.bell.start() };
    }
    if (lakeDistance(x, z) < LAKE.shoreWidth) {
      return { key: 'fish', label: 'Câu cá', run: () => this.fishing.start() };
    }
    // Dải sát tường container ưu tiên dán lời ước trước vòng ném hàng,
    // để hai hoạt động dùng chung một bức tường không giành chỗ của nhau.
    if (x > CONTAINERS.minX - 1.9 && z >= CONTAINERS.minZ - 1.2 && z <= CONTAINERS.maxZ + 1.2) {
      return { key: 'container', label: 'Dán lời ước lên container', run: () => this.wish.start('container') };
    }
    if (dist2d(x, z, PITCH_ZONE.x, PITCH_ZONE.z) < PITCH_ZONE.radius) {
      return { key: 'pitch', label: 'Chơi đầu hồ', run: () => this.pitch.start() };
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
    return { key: 'meditate-anywhere', label: 'Thiền tại chỗ', run: () => this.meditation.start() };
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
    if (!this.current) return false;
    return this.current.onKey?.(code, isDown) ?? false;
  }
}
