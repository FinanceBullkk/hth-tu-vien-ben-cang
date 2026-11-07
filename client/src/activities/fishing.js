// Câu cá ở hồ: chạm mặt nước để thả → chờ → cá cắn thì giữ chấm trong vùng xanh → đầy vòng tự kéo lên.
// Client mô phỏng để vẽ mượt; server mới là bên quyết định bóng nào, cá nào, đầy hay tuột.
import { SHADOW_SIZES } from '../../../shared/fish-lake-shadows.js';
import { BAITS, DEFAULT_BAIT, FISH_FIGHT, castSpot, fightAdvance, fightGreen, fightNew, fightTune } from '../../../shared/fish.js';
import { LAKE } from '../../../shared/layout.js';
import { FishingPanel } from '../ui/fishing-panel.js';
import { lakeShot } from './fishing-camera-shot.js';
import { baitUnlocked, catchesSoFar, coachLines, noteCatch } from './fishing-coach.js';

const KEY_NEEDLE_PER_SEC = 1.3;
const NEEDLE_FOLLOW_RATE = 16;
const PULL_INTERVAL_MS = 120;
const COMPANY_INTERVAL_S = 1;
const OFF_ZONE_HINT_S = 0.7; // lệch lâu chừng này mới nhắc, để khỏi nhấp nháy khi chỉ trượt nhẹ
const SHADOW_TALK_FROM = 2; // chỉ gọi tên bóng cá sau khi đã giới thiệu khái niệm này
const LEFT_KEYS = new Set(['KeyA', 'ArrowLeft']);
const RIGHT_KEYS = new Set(['KeyD', 'ArrowRight']);
const WALK_KEYS = new Set([...LEFT_KEYS, ...RIGHT_KEYS, 'KeyW', 'KeyS', 'ArrowUp', 'ArrowDown']);

const buzz = (pattern) => {
  try {
    navigator.vibrate?.(pattern);
  } catch { /* Trình duyệt chặn rung thì thôi, đây chỉ là phụ. */ }
};

export class FishingActivity {
  constructor(app) {
    this.app = app;
    this.lockMove = true;
    this.generation = 0;
    this.state = 'idle';
    this.bait = DEFAULT_BAIT;
    this.aimX = 0.5;
    this.lines = coachLines(app.isTouch);
    this.panel = new FishingPanel({
      onPress: (p) => this.press(p),
      onMove: (p) => this.move(p),
      onRelease: () => this.release(),
      onBait: (id) => this.setBait(id),
      onExit: () => app.activities.exit(),
    });
  }

  start() {
    const { app } = this;
    if (!app.activities.enter(this, 'fish')) return;
    ++this.generation;
    this.caught = 0;
    this.earned = 0;
    this.total = catchesSoFar();
    this.companyClock = COMPANY_INTERVAL_S;
    this.showRing = false;
    this.panel.show();
    this.panel.setBait(this.bait);
    this.panel.setTally(0, 0);
    const { me, world, follow } = app;
    this.target = castSpot(me.x, me.z);
    this.aim();
    if (app.chat.open) app.chat.close();
    me.rot = Math.atan2(LAKE.x - me.x, LAKE.z - me.z);
    world.fishing.setRod(app.sid, { x: me.x, z: me.z, on: true });
    follow.shot = lakeShot(me.x, me.z);
    app.audio.rustle();
  }

  /** message là lời nhắc ở lại tới khi người chơi thả câu tiếp (tip, cá vừa thoát). */
  aim(message) {
    this.state = 'aim';
    this.pressing = false;
    this.aimMessage = message ?? null;
    this.lastAimHint = null;
    this.panel.mode('aim', baitUnlocked(this.total));
    this.panel.setHint(message ?? this.lines.aim, { coach: this.total === 0 });
  }

  setBait(id) {
    if (this.state !== 'aim' || !BAITS.some((b) => b.id === id)) return;
    this.bait = id;
    this.panel.setBait(id, true);
    this.app.audio.tick();
  }

  cycleBait() {
    if (!baitUnlocked(this.total)) return;
    const index = BAITS.findIndex((b) => b.id === this.bait);
    this.setBait(BAITS[(index + 1) % BAITS.length].id);
  }

  /** Đổi điểm trên màn hình sang chỗ phao sẽ rơi; chạm đâu cũng ra một điểm trên mặt nước. */
  aimAt({ x, y }) {
    const { app } = this;
    const point = app.world.fishing.waterPoint(x, y, app.camera);
    this.target = castSpot(app.me.x, app.me.z, point?.x, point?.z);
    this.showRing = true;
  }

  press(pointer) {
    this.panel.hideCatch();
    if (this.state === 'aim') {
      this.pressing = true;
      this.aimAt(pointer);
    } else if (this.state === 'waiting') {
      this.wiggle();
    } else if (this.state === 'fighting') {
      this.dragX = pointer.clientX;
      if (!pointer.touch) this.aimX = this.panel.spanValue(pointer.clientX);
    }
  }

  move(pointer) {
    if (this.state === 'aim') {
      this.aimAt(pointer);
    } else if (this.state === 'fighting') {
      // Cảm ứng kéo tương đối: đặt ngón ở đâu cũng được, chấm không nhảy theo chỗ đặt ngón.
      if (pointer.touch) {
        this.aimX = Math.min(1, Math.max(0, this.aimX + this.panel.spanDelta(pointer.clientX - (this.dragX ?? pointer.clientX))));
        this.dragX = pointer.clientX;
      } else {
        this.aimX = this.panel.spanValue(pointer.clientX);
      }
    }
  }

  release() {
    if (this.state === 'aim' && this.pressing) this.cast();
  }

  async cast() {
    const { app } = this;
    const generation = this.generation;
    const { bx, bz } = this.target;
    this.state = 'casting';
    this.pressing = false;
    this.panel.hideCatch();
    this.panel.mode('casting');
    this.panel.setHint('');
    app.world.fishing.setAim(null);
    app.me.rot = Math.atan2(bx - app.me.x, bz - app.me.z);
    app.audio.rodCast();
    const res = await app.net.call('fish:cast', { tx: bx, tz: bz, bait: this.bait }).catch(() => null);
    if (generation !== this.generation) return;
    if (!res?.ok) {
      this.aim(res?.error ?? 'Chưa thả được, thử lại nhé');
      return;
    }
    this.state = 'waiting';
    this.panel.mode('waiting');
    const waiting = this.lines.waiting(this.total);
    this.panel.setHint(res.shadow && this.total >= SHADOW_TALK_FROM ? `${SHADOW_SIZES[res.shadow].label} đang lại gần…` : waiting);
    setTimeout(() => { if (generation === this.generation) app.audio.plop(); }, 550);
  }

  async wiggle() {
    this.app.world.fishing.shake(this.app.sid);
    const res = await this.app.net.call('fish:wiggle').catch(() => null);
    if (res?.ok) this.app.audio.tick();
  }

  /** Cá cắn: không có pha canh giờ móc, vòng cung chạy ngay sau một nhịp chuẩn bị. */
  onBite({ seed, rarity, startAt, assist }) {
    if (this.state !== 'waiting' && this.state !== 'casting') return;
    const { app } = this;
    const generation = this.generation;
    this.state = 'fighting';
    this.fight = fightNew({ seed, rarity, startAt, assist });
    this.needle = 0.5;
    this.aimX = 0.5;
    this.dragX = null;
    this.lastPull = 0;
    this.offZone = 0;
    this.nudging = false;
    this.panel.mode('fighting');
    this.panel.setHint(this.lines.bite, { coach: true });
    this.panel.gauge.setRarity(rarity);
    this.renderFight();
    app.audio.plop();
    app.audio.splash(0.6);
    buzz(180);
    setTimeout(() => {
      if (generation === this.generation && this.state === 'fighting') this.showFightHint();
    }, FISH_FIGHT.graceMs);
  }

  /** Người mới giữ lời dẫn suốt con cá; người đã quen thì lời dẫn tự mờ. */
  showFightHint() {
    this.panel.setHint(this.lines.fight, this.total === 0 ? { coach: true } : { fadeAfter: 3500 });
  }

  async sendPull() {
    const generation = this.generation;
    const res = await this.app.net.call('fish:pull', { x: Math.round(this.needle * 1000) / 1000 }).catch(() => null);
    if (generation !== this.generation || this.state !== 'fighting' || !res?.ok) return;
    if (res.ready) { this.reel(); return; }
    // Kéo số bên client về gần số server; lệch ít nên không thấy giật.
    if (typeof res.progress === 'number') this.fight.progress += (res.progress - this.fight.progress) * 0.5;
  }

  /** Đầy vòng là cá về tay luôn: không bắt người chơi bấm thêm một bước để rồi mất cá vì chậm tay. */
  async reel() {
    const { app } = this;
    const generation = this.generation;
    this.state = 'reeling';
    this.fight.progress = 1;
    this.renderFight();
    this.panel.mode('reeling');
    this.panel.setHint('');
    const res = await app.net.call('fish:reel').catch(() => null);
    if (generation !== this.generation) return;
    if (!res?.ok || res.escaped) {
      this.aim(res?.error ?? this.lines.escaped);
      return;
    }
    this.caught += 1;
    this.earned += res.teu;
    this.total = noteCatch();
    this.panel.setTally(this.caught, this.earned);
    this.panel.showCatch(res);
    app.audio.splash(1);
    app.audio.chime(0.06);
    buzz([60, 40, 90]);
    this.showRing = false;
    this.aim(this.lines.tips[this.total]);
  }

  escaped() {
    if (this.state === 'idle') return;
    this.app.audio.rustle();
    this.showRing = false;
    this.aim(this.lines.escaped);
  }

  onKey(code, down) {
    if (code === 'Space') {
      if (!down) return true;
      this.panel.hideCatch();
      if (this.state === 'aim') this.cast();
      else if (this.state === 'waiting') this.wiggle();
      return true;
    }
    if (code === 'KeyQ') {
      if (down) this.cycleBait();
      return true;
    }
    // Đang rảnh tay mà bấm phím đi: người chơi muốn đi chỗ khác, cho về bờ luôn thay vì đứng im như bị đơ.
    if (this.state === 'aim' && down && WALK_KEYS.has(code)) {
      this.app.activities.exit();
      return false;
    }
    if (LEFT_KEYS.has(code)) { this.keyLeft = down; return true; }
    if (RIGHT_KEYS.has(code)) { this.keyRight = down; return true; }
    return false;
  }

  renderFight() {
    const { fight, needle } = this;
    const { half } = fightTune(fight.rarity, fight.assist);
    const center = fightGreen(this.app.net.now() - fight.startAt, fight.seed, fight.rarity, fight.assist);
    this.panel.gauge.render({ center, half, needle, progress: fight.progress, ready: this.state === 'reeling' });
    return { center, half };
  }

  /** Vòng ngắm đổi màu khi chạm bóng cá. Bóng di chuyển nên phải dò lại mỗi khung hình. */
  updateAim() {
    const { app } = this;
    const shadow = app.world.fishing.setAim(this.showRing ? this.target : null, app.net.now());
    if (this.aimMessage || this.total < SHADOW_TALK_FROM) return;
    const hint = shadow ? `${SHADOW_SIZES[shadow.size].label} ở đây, thả đi!` : this.lines.aim;
    if (hint === this.lastAimHint) return;
    this.lastAimHint = hint;
    this.panel.setHint(hint);
  }

  updateFight(dt) {
    const { app } = this;
    const keyDir = (this.keyRight ? 1 : 0) - (this.keyLeft ? 1 : 0);
    if (keyDir) this.aimX = Math.min(1, Math.max(0, this.aimX + keyDir * KEY_NEEDLE_PER_SEC * dt));
    this.needle += (this.aimX - this.needle) * (1 - Math.exp(-dt * NEEDLE_FOLLOW_RATE));
    const now = app.net.now();
    fightAdvance(this.fight, this.needle, now);
    // Giữ dưới 1 chờ server xác nhận, tránh vòng đầy mà chưa có cá.
    this.fight.progress = Math.min(0.995, Math.max(0.01, this.fight.progress));
    const { center, half } = this.renderFight();
    app.world.fishing.struggle(app.sid, center - 0.5, this.needle - 0.5);
    this.updateDirectionHint(dt, center, half, now);
    if (now - this.lastPull >= PULL_INTERVAL_MS) {
      this.lastPull = now;
      this.sendPull();
    }
  }

  /** Lệch khỏi vùng xanh một lúc thì nói thẳng phải kéo về bên nào. */
  updateDirectionHint(dt, center, half, now) {
    if (now < this.fight.startAt) return;
    const off = Math.abs(this.needle - center) > half;
    this.offZone = off ? this.offZone + dt : 0;
    if (this.offZone >= OFF_ZONE_HINT_S) {
      this.nudging = true;
      this.panel.setHint(center < this.needle ? this.lines.pullLeft : this.lines.pullRight, { coach: true });
    } else if (this.nudging && !off) {
      this.nudging = false;
      this.showFightHint();
    }
  }

  /** Ai khác đang cầm cần quanh hồ: rods giữ cả lúc giữa hai lượt nên danh sách không nhấp nháy. */
  updateCompany(dt) {
    this.companyClock += dt;
    if (this.companyClock < COMPANY_INTERVAL_S) return;
    this.companyClock = 0;
    const { app } = this;
    const names = [...app.world.fishing.rods.keys()]
      .filter((sid) => sid !== app.sid)
      .map((sid) => app.remotes.map.get(sid)?.name)
      .filter(Boolean);
    this.panel.setCompany(names);
  }

  update(dt) {
    this.updateCompany(dt);
    if (this.state === 'aim') this.updateAim();
    else if (this.state === 'fighting') this.updateFight(dt);
  }

  cancel() {
    const { app } = this;
    ++this.generation;
    this.state = 'idle';
    this.pressing = false;
    this.keyLeft = false;
    this.keyRight = false;
    this.panel.hide();
    app.follow.shot = null;
    app.world.fishing.setAim(null);
    app.net.call('fish:cancel').catch(() => {});
    app.world.fishing.setRod(app.sid, { on: false });
    if (this.caught > 0) app.hud.toast(`Chuyến câu: ${this.caught} con, +${this.earned} TEU`);
  }
}
