// Tích khí khi thiền tại chỗ; giữ chiếu và hoa sen riêng cho Nhịp sen.
import { MAT_COUNT, MATS, dist2d } from '../shared/layout.js';
import { rhythmSummary } from '../shared/rhythm.js';
import { QI_GAIN_RATE, QI_INTERVAL_MS } from '../shared/cultivation.js';

export class Meditation {
  constructor({ db, io, config }) {
    this.db = db;
    this.io = io;
    this.config = config;
    this.mats = new Array(MAT_COUNT).fill(null);
    this.sitters = new Set();
    this.epoch = 0;
  }

  /** Danh sách chiếu đang có người, gửi kèm snapshot. */
  occupancy() {
    return this.mats.map((p) => (p ? p.sid : 0));
  }

  scene() {
    return { epoch: this.epoch, seats: this.mats.flatMap((p, mat) => {
      if (!p) return [];
      const game = p.rhythm;
      const judged = game?.kind === 'meditate' ? game.notes.flat().filter((g) => g != null) : [];
      const score = rhythmSummary(judged);
      return [{ mat, startAt: p.medStartAt, bloom: judged.length ? (score.perfect + score.good) * 5 / judged.length : 0 }];
    }) };
  }

  sit(player, matIndex) {
    const mat = matIndex === undefined ? null : matIndex;
    if (matIndex !== undefined) {
      if (!Number.isInteger(mat) || mat < 0 || mat >= MAT_COUNT) return { ok: false, error: 'Chiếu này không có thật.' };
      if (this.mats[mat]) return { ok: false, error: 'Chiếu này có người ngồi rồi, chọn chiếu khác nhé.' };
      const pos = MATS[mat];
      if (dist2d(player.x, player.z, pos.x, pos.z) > 4) return { ok: false, error: 'Lại gần chiếu hơn chút nhé.' };
    }
    if (this.sitters.has(player)) return { ok: false, error: 'Đứng dậy trước khi đổi chỗ thiền nhé.' };
    const now = Date.now();
    // Ánh sáng dùng nhịp chung; mỗi người bắt đầu phút nghỉ của mình ngay khi ngồi.
    if (!this.members().length) this.epoch = now + 1500;
    if (mat != null) this.mats[mat] = player;
    this.sitters.add(player);
    player.mat = mat;
    player.medStart = now;
    player.medStartAt = now;
    player.medMates = new Set();
    player.qiAt = now;
    player.qiPendingMs = 0;
    player.cultivationMs = this.db.playerRow(player.pid)?.cultivation_ms ?? 0;
    player.qi = Math.floor(player.cultivationMs / QI_INTERVAL_MS);
    this.io.emit('meditation:mats', this.occupancy());
    this.sync();
    return { ok: true, epoch: this.epoch, startAt: player.medStartAt, now, mat, qi: player.qi, mates: [...player.medMates] };
  }

  accrue(player, now = Date.now(), flush = false) {
    if (!this.sitters.has(player)) return;
    const elapsed = Math.max(0, now - player.qiAt);
    player.qiAt = Math.max(now, player.qiAt);
    // A suspended server is not online meditation time.
    if (elapsed <= 15_000) player.qiPendingMs += elapsed * QI_GAIN_RATE;
    if (!player.qiPendingMs || (!flush && player.qiPendingMs < QI_INTERVAL_MS)) return;
    player.cultivationMs = this.db.addCultivation(player.pid, player.qiPendingMs);
    player.qiPendingMs = 0;
    player.qi = Math.floor(player.cultivationMs / QI_INTERVAL_MS);
    player.dirty = true;
    this.io.emit('cultivation:progress', { sid: player.sid, qi: player.qi });
  }

  sweep() {
    const now = Date.now();
    for (const player of this.members()) {
      if (player.socket) this.accrue(player, now);
    }
  }

  members() {
    return [...this.sitters];
  }

  /** Báo cho những người đang ngồi biết ai đang thiền cùng. */
  sync() {
    const members = this.members();
    const names = members.map((p) => ({ sid: p.sid, name: p.name }));
    for (const p of members) {
      const mates = names.filter((n) => n.sid !== p.sid).map((n) => n.name);
      for (const name of mates) p.medMates.add(name);
      p.socket?.emit('meditation:sync', { epoch: this.epoch, mates });
    }
    this.io.emit('meditation:scene', this.scene());
  }

  leave(player) {
    if (!this.sitters.has(player)) return;
    this.accrue(player, Date.now(), true);
    if (player.mat != null) this.mats[player.mat] = null;
    this.sitters.delete(player);
    player.mat = null;
    this.io.emit('meditation:mats', this.occupancy());
    this.sync();
  }

}
