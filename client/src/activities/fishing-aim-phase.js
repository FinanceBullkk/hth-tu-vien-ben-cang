// Pha ngắm của câu cá: chỗ phao sẽ rơi, vòng ngắm trên mặt nước và dòng lời dẫn lúc chuẩn bị thả.
import { SHADOW_SIZES } from '../../../shared/fish-lake-shadows.js';
import { castSpot } from '../../../shared/fish.js';
import { baitUnlocked } from './fishing-coach.js';

export const SHADOW_TALK_FROM = 2; // chỉ gọi tên bóng cá sau khi đã giới thiệu khái niệm này

export class FishingAimPhase {
  constructor({ app, panel, lines }) {
    Object.assign(this, { app, panel, lines });
    this.showRing = false;
  }

  /** Vừa ra tới bờ: mặc định thả về phía tâm hồ, vòng ngắm chưa hiện tới khi người chơi trỏ vào nước. */
  reset() {
    const { me } = this.app;
    this.target = castSpot(me.x, me.z);
    this.showRing = false;
  }

  hideRing() {
    this.showRing = false;
  }

  /** message là lời nhắc ở lại tới khi người chơi thả câu tiếp (tip, cá vừa thoát). */
  enter(message, total) {
    this.total = total;
    this.message = message ?? null;
    this.lastHint = null;
    this.panel.mode('aim', baitUnlocked(total));
    this.panel.setHint(message ?? this.lines.aim, { coach: total === 0 });
  }

  /** Đổi điểm trên màn hình sang chỗ phao sẽ rơi; chạm đâu cũng ra một điểm trên mặt nước. */
  aimAt({ x, y }) {
    const { app } = this;
    const point = app.world.fishing.waterPoint(x, y, app.camera);
    this.target = castSpot(app.me.x, app.me.z, point?.x, point?.z);
    this.showRing = true;
  }

  /** Vòng ngắm đổi màu khi chạm bóng cá. Bóng di chuyển nên phải dò lại mỗi khung hình. */
  update() {
    const { app } = this;
    const shadow = app.world.fishing.setAim(this.showRing ? this.target : null, app.net.now());
    if (this.message || this.total < SHADOW_TALK_FROM) return;
    const hint = shadow ? `${SHADOW_SIZES[shadow.size].label} ở đây, thả đi!` : this.lines.aim;
    if (hint === this.lastHint) return;
    this.lastHint = hint;
    this.panel.setHint(hint);
  }
}
