// Điều phối hoạt động: phát hiện điểm gần người chơi, bật/tắt hoạt động, khoá di chuyển.
import { ABBOT, BAUCUA_ZONE, BELL, COQUAY_ZONE, LAKE, PITCH_ZONE, POND, SHOP, TAIXIU_ZONE, TEA, TREE, XIDACH_ZONE, ZOEYY, dist2d, isInsideHall, lakeDistance } from '../../../shared/layout.js';
import { openShop } from '../ui/shop-panel.js';
import { BauCuaActivity } from './baucua.js';
import { XiDachActivity } from './xidach.js';
import { createTaiXiuActivity } from './taixiu.js';
import { createCoQuayActivity } from './coquay.js';
import { BellEvent } from './bell-event.js';
import { FishingActivity } from './fishing.js';
import { FortuneActivity } from './fortune.js';
import { PitchActivity } from './pitch.js';
import { RhythmActivity } from './rhythm.js';
import { MeditationActivity } from './meditation.js';
import { WishActivity } from './wish.js';
import { MELODY_ZONE } from '../../../shared/layout.js';
import { MelodyActivity } from './melody.js';
import { PkActivity } from './pk.js';
import { TradeController } from './trade.js';

const KIND_CODE = { bell: 2, write: 3, shake: 4, fish: 5, pitch: 6, baucua: 9, xidach: 10, taixiu: 11, coquay: 12 };

// Lớp CSS báo đang trong một hoạt động: khung chiến đấu (thanh máu, thanh chiêu) tự cất đi để không che bảng hoạt động.
const markInActivity = (on) => document.body.classList.toggle('in-activity', on);

export class Activities {
  constructor(app) {
    this.app = app;
    this.current = null;
    this.bell = new RhythmActivity(app, 'bell');
    this.bellEvent = new BellEvent(app);
    this.meditation = new MeditationActivity(app);
    this.wish = new WishActivity(app);
    this.fortune = new FortuneActivity(app);
    this.fishing = new FishingActivity(app);
    this.pitch = new PitchActivity(app);
    this.baucua = new BauCuaActivity(app);
    this.xidach = new XiDachActivity(app);
    this.taixiu = createTaiXiuActivity(app);
    this.coquay = createCoQuayActivity(app);
    this.melody = new MelodyActivity(app);
    this.pk = new PkActivity(app);
    this.pk.bind();
    // Trạm giao thương chỉ là một bảng (như Sạp Kim Bảo), không khoá di chuyển nên không đi qua enter/exit.
    this.trade = new TradeController(app);
    this.zoneKey = '';
  }

  /** Bắt đầu một hoạt động. kind là trạng thái báo cho người khác; thiền tự gửi riêng. */
  enter(activity, kind) {
    if (this.current) return false;
    this.current = activity;
    markInActivity(true);
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
    markInActivity(false);
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
    markInActivity(false);
    activity.cancel();
    this.app.me.locked = false;
    this.app.me.avatar.setActivity(0);
    this.zoneKey = '';
  }

  /** Điểm hoạt động ở gần người chơi. */
  zoneAt(x, z) {
    if (dist2d(x, z, MELODY_ZONE.x, MELODY_ZONE.z) < MELODY_ZONE.radius) {
      return { key: 'melody', label: 'Tấu nhạc bên hồ', run: () => this.melody.start() };
    }
    const meditateHere = { key: 'meditate-here', label: 'Ngồi thiền tại chỗ', run: () => this.meditation.start() };
    if (isInsideHall(x, z)) {
      const mat = this.meditation.nearestFreeMat(x, z);
      if (mat >= 0) return { key: `mat${mat}`, label: 'Ngồi thiền', run: () => this.meditation.start(mat) };
      return meditateHere;
    }
    if (dist2d(x, z, ABBOT.x, ABBOT.z) < ABBOT.actionRadius) {
      return { key: 'abbot', label: 'Xin thầy một lời', run: () => this.app.world.abbot.advise() };
    }
    // Hai bàn đỏ đen ở sân trước thiền đường, hai bên trục chính.
    if (dist2d(x, z, BAUCUA_ZONE.x, BAUCUA_ZONE.z) < BAUCUA_ZONE.radius) {
      return { key: 'baucua', label: 'Chơi bầu cua', run: () => this.baucua.start() };
    }
    if (dist2d(x, z, XIDACH_ZONE.x, XIDACH_ZONE.z) < XIDACH_ZONE.radius) {
      return { key: 'xidach', label: 'Chơi xì dách', run: () => this.xidach.start() };
    }
    if (dist2d(x, z, TAIXIU_ZONE.x, TAIXIU_ZONE.z) < TAIXIU_ZONE.radius) {
      return { key: 'taixiu', label: 'Chơi tài xỉu', run: () => this.taixiu.start() };
    }
    if (dist2d(x, z, COQUAY_ZONE.x, COQUAY_ZONE.z) < COQUAY_ZONE.radius) {
      return { key: 'coquay', label: 'Chơi cò quay', run: () => this.coquay.start() };
    }
    if (dist2d(x, z, SHOP.x, SHOP.z) < SHOP.actionRadius) {
      return { key: 'shop', label: 'Ghé Sạp Kim Bảo', run: () => openShop(this.app, 'shop') };
    }
    if (this.trade.inZone(x, z)) {
      return { key: 'trade', label: 'Mở Trạm giao thương', run: () => this.trade.open() };
    }
    if (dist2d(x, z, ZOEYY.x, ZOEYY.z) < ZOEYY.actionRadius) {
      return { key: 'zoeyy', label: 'Hỏi Zoeyy Gay', run: () => this.app.world.zoeyy.advise() };
    }
    if (dist2d(x, z, BELL.x, BELL.z) < BELL.radius) {
      return { key: 'bell', label: 'Chơi Audition chuông', run: () => this.bell.start() };
    }
    if (lakeDistance(x, z) < LAKE.shoreWidth) {
      return { key: 'fish', label: 'Câu cá', run: () => this.fishing.start() };
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
    if (dist2d(x, z, TEA.x, TEA.z) < TEA.radius) {
      return { key: 'tea', label: 'Rút xăm', run: () => this.fortune.start() };
    }
    return meditateHere;
  }

  update(dt) {
    const { app } = this;
    this.bellEvent.update();
    this.pk.update(dt);
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
    if (!this.current) return this.pk.onKey(code, isDown);
    return this.current.onKey?.(code, isDown) ?? false;
  }
}
