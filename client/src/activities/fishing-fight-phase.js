// Pha giằng co của câu cá: lái kim theo chuột, ngón tay hoặc phím, vẽ vòng cung và báo vị trí kim cho server.
// Client chỉ mô phỏng để vẽ mượt; server mới quyết định khi nào vòng đầy.
import { FISH_FIGHT, fightAdvance, fightGreen, fightNew, fightTune } from '../../../shared/fish.js';

const KEY_NEEDLE_PER_SEC = 1.3;
const NEEDLE_FOLLOW_RATE = 16;
const PULL_INTERVAL_MS = 120;
const OFF_ZONE_HINT_S = 0.7; // lệch lâu chừng này mới nhắc, để khỏi nhấp nháy khi chỉ trượt nhẹ

const clamp01 = (v) => Math.min(1, Math.max(0, v));

export class FishingFightPhase {
  constructor({ app, panel, lines, onFull }) {
    Object.assign(this, { app, panel, lines, onFull });
    this.token = 0; // đổi mỗi lượt để bỏ qua phản hồi mạng của con cá trước
    this.running = false;
    this.keyLeft = false;
    this.keyRight = false;
  }

  begin({ seed, rarity, startAt, assist, rod = 0 }, total) {
    const token = ++this.token;
    this.running = true;
    this.total = total;
    this.fight = fightNew({ seed, rarity, startAt, assist, rod });
    this.needle = 0.5;
    this.aimX = 0.5;
    this.dragX = null;
    this.lastPull = 0;
    this.offZone = 0;
    this.nudging = false;
    this.panel.setHint(this.lines.bite, { coach: true });
    this.panel.gauge.setRarity(rarity);
    this.render();
    setTimeout(() => {
      if (token === this.token && this.running) this.showHint();
    }, FISH_FIGHT.graceMs);
  }

  stop() {
    this.running = false;
    this.keyLeft = false;
    this.keyRight = false;
  }

  /** Vòng đã đầy: dừng lái kim, tô vàng vòng tiến độ trong lúc chờ server trả con cá. */
  finish() {
    this.stop();
    this.fight.progress = 1;
    this.render(true);
  }

  press(pointer) {
    this.dragX = pointer.clientX;
    if (!pointer.touch) this.aimX = this.panel.spanValue(pointer.clientX);
  }

  move(pointer) {
    if (!pointer.touch) {
      this.aimX = this.panel.spanValue(pointer.clientX);
      return;
    }
    // Cảm ứng kéo tương đối: đặt ngón ở đâu cũng được, chấm không nhảy theo chỗ đặt ngón.
    this.aimX = clamp01(this.aimX + this.panel.spanDelta(pointer.clientX - (this.dragX ?? pointer.clientX)));
    this.dragX = pointer.clientX;
  }

  /** Người mới giữ lời dẫn suốt con cá; người đã quen thì lời dẫn tự mờ. */
  showHint() {
    this.panel.setHint(this.lines.fight, this.total === 0 ? { coach: true } : { fadeAfter: 3500 });
  }

  render(ready = false) {
    const { fight, needle } = this;
    const { half } = fightTune(fight.rarity, fight.assist, fight.rod);
    const center = fightGreen(this.app.net.now() - fight.startAt, fight.seed, fight.rarity, fight.assist, fight.rod);
    this.panel.gauge.render({ center, half, needle, progress: fight.progress, ready });
    return { center, half };
  }

  update(dt) {
    if (!this.running) return;
    const { app } = this;
    const keyDir = (this.keyRight ? 1 : 0) - (this.keyLeft ? 1 : 0);
    if (keyDir) this.aimX = clamp01(this.aimX + keyDir * KEY_NEEDLE_PER_SEC * dt);
    this.needle += (this.aimX - this.needle) * (1 - Math.exp(-dt * NEEDLE_FOLLOW_RATE));
    const now = app.net.now();
    fightAdvance(this.fight, this.needle, now);
    // Giữ dưới 1 chờ server xác nhận, tránh vòng đầy mà chưa có cá.
    this.fight.progress = Math.min(0.995, Math.max(0.01, this.fight.progress));
    const { center, half } = this.render();
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
      this.showHint();
    }
  }

  async sendPull() {
    const { token } = this;
    const res = await this.app.net.call('fish:pull', { x: Math.round(this.needle * 1000) / 1000 }).catch(() => null);
    if (token !== this.token || !this.running || !res?.ok) return;
    if (res.ready) { this.onFull(); return; }
    // Kéo số bên client về gần số server; lệch ít nên không thấy giật.
    if (typeof res.progress === 'number') this.fight.progress += (res.progress - this.fight.progress) * 0.5;
  }
}
