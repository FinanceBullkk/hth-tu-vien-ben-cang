// Câu cá ở hồ: chạm mặt nước để thả → chờ → cá cắn thì giữ chấm trong vùng xanh → đầy vòng tự kéo lên.
// File này giữ vòng trạng thái và nói chuyện với server; ngắm và giằng co nằm ở hai pha riêng.
import { SHADOW_SIZES } from '../../../shared/fish-lake-shadows.js';
import { BAITS, DEFAULT_BAIT } from '../../../shared/fish.js';
import { LAKE } from '../../../shared/layout.js';
import { FishingPanel } from '../ui/fishing-panel.js';
import { FishingAimPhase, SHADOW_TALK_FROM } from './fishing-aim-phase.js';
import { lakeShot } from './fishing-camera-shot.js';
import { baitUnlocked, catchesSoFar, coachLines, noteCatch } from './fishing-coach.js';
import { FishingFightPhase } from './fishing-fight-phase.js';

const COMPANY_INTERVAL_S = 1;
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
    this.lines = coachLines(app.isTouch);
    this.panel = new FishingPanel({
      onPress: (p) => this.press(p),
      onMove: (p) => this.move(p),
      onRelease: () => this.release(),
      onBait: (id) => this.setBait(id),
      onExit: () => app.activities.exit(),
    });
    const phase = { app, panel: this.panel, lines: this.lines };
    this.aiming = new FishingAimPhase(phase);
    this.fighting = new FishingFightPhase({ ...phase, onFull: () => this.reel() });
  }

  start() {
    const { app } = this;
    if (!app.activities.enter(this, 'fish')) return;
    ++this.generation;
    this.caught = 0;
    this.earned = 0;
    this.total = catchesSoFar();
    this.companyClock = COMPANY_INTERVAL_S;
    this.panel.show();
    this.panel.setBait(this.bait);
    this.panel.setTally(0, 0);
    this.aiming.reset();
    this.aim();
    if (app.chat.open) app.chat.close();
    const { me, world, follow } = app;
    me.rot = Math.atan2(LAKE.x - me.x, LAKE.z - me.z);
    world.fishing.setRod(app.sid, { x: me.x, z: me.z, on: true });
    follow.shot = lakeShot(me.x, me.z);
    app.audio.rustle();
  }

  aim(message) {
    this.state = 'aim';
    this.pressing = false;
    this.aiming.enter(message, this.total);
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

  press(pointer) {
    this.panel.hideCatch();
    if (this.state === 'aim') {
      this.pressing = true;
      this.aiming.aimAt(pointer);
    } else if (this.state === 'waiting') {
      this.wiggle();
    } else if (this.state === 'fighting') {
      this.fighting.press(pointer);
    }
  }

  move(pointer) {
    if (this.state === 'aim') this.aiming.aimAt(pointer);
    else if (this.state === 'fighting') this.fighting.move(pointer);
  }

  release() {
    if (this.state === 'aim' && this.pressing) this.cast();
  }

  async cast() {
    const { app } = this;
    const generation = this.generation;
    const { bx, bz } = this.aiming.target;
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
  onBite(bite) {
    if (this.state !== 'waiting' && this.state !== 'casting') return;
    const { audio } = this.app;
    this.state = 'fighting';
    this.panel.mode('fighting');
    this.fighting.begin(bite, this.total);
    audio.plop();
    audio.splash(0.6);
    buzz(180);
  }

  /** Đầy vòng là cá về tay luôn: không bắt người chơi bấm thêm một bước để rồi mất cá vì chậm tay. */
  async reel() {
    const { app } = this;
    const generation = this.generation;
    this.state = 'reeling';
    this.fighting.finish();
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
    this.aiming.hideRing();
    this.aim(this.lines.tips[this.total]);
  }

  escaped() {
    if (this.state === 'idle') return;
    this.fighting.stop();
    this.app.audio.rustle();
    this.aiming.hideRing();
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
    if (LEFT_KEYS.has(code)) { this.fighting.keyLeft = down; return true; }
    if (RIGHT_KEYS.has(code)) { this.fighting.keyRight = down; return true; }
    return false;
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
    if (this.state === 'aim') this.aiming.update();
    else if (this.state === 'fighting') this.fighting.update(dt);
  }

  cancel() {
    const { app } = this;
    ++this.generation;
    this.state = 'idle';
    this.pressing = false;
    this.fighting.stop();
    this.panel.hide();
    app.follow.shot = null;
    app.world.fishing.setAim(null);
    app.net.call('fish:cancel').catch(() => {});
    app.world.fishing.setRod(app.sid, { on: false });
    if (this.caught > 0) app.hud.toast(`Chuyến câu: ${this.caught} con, +${this.earned} TEU`);
  }
}
