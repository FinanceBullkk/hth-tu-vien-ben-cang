// Giữ chỗ chiếu và phát trạng thái hoa sen của minigame Nhịp sen.
import { MAT_COUNT, MATS, dist2d } from '../shared/layout.js';
import { rhythmSummary } from '../shared/rhythm.js';

export class Meditation {
  constructor({ db, io, config }) {
    this.db = db;
    this.io = io;
    this.config = config;
    this.mats = new Array(MAT_COUNT).fill(null);
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
    const mat = Number(matIndex);
    if (!Number.isInteger(mat) || mat < 0 || mat >= MAT_COUNT) return { ok: false, error: 'Chiếu này không có thật.' };
    if (this.mats[mat]) return { ok: false, error: 'Chiếu này có người ngồi rồi, chọn chiếu khác nhé.' };
    const pos = MATS[mat];
    if (dist2d(player.x, player.z, pos.x, pos.z) > 4) return { ok: false, error: 'Lại gần chiếu hơn chút nhé.' };
    this.leave(player);
    const now = Date.now();
    // Ánh sáng dùng nhịp chung; mỗi người bắt đầu phút nghỉ của mình ngay khi ngồi.
    if (!this.members().length) this.epoch = now + 1500;
    this.mats[mat] = player;
    player.mat = mat;
    player.medStart = now;
    player.medStartAt = now;
    player.medMates = new Set();
    this.io.emit('meditation:mats', this.occupancy());
    this.sync();
    return { ok: true, epoch: this.epoch, startAt: player.medStartAt, now, mat, mates: [...player.medMates] };
  }

  members() {
    return this.mats.filter(Boolean);
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
    if (player.mat === undefined || player.mat === null) return;
    this.mats[player.mat] = null;
    player.mat = null;
    this.io.emit('meditation:mats', this.occupancy());
    this.sync();
  }

}
