// Ngồi thiền: giữ chỗ chiếu, nhịp thở chung theo server, lưu điểm Tâm an.
import crypto from 'node:crypto';
import { MAT_COUNT, MATS, dist2d } from '../shared/layout.js';
import { BREATH } from '../shared/protocol.js';

const MIN_SESSION_MS = BREATH.cycle * (BREATH.cycles - 1);

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

  sit(player, matIndex) {
    const mat = Number(matIndex);
    if (!Number.isInteger(mat) || mat < 0 || mat >= MAT_COUNT) return { ok: false, error: 'Chiếu này không có thật.' };
    if (this.mats[mat]) return { ok: false, error: 'Chiếu này có người ngồi rồi, chọn chiếu khác nhé.' };
    const pos = MATS[mat];
    if (dist2d(player.x, player.z, pos.x, pos.z) > 4) return { ok: false, error: 'Lại gần chiếu hơn chút nhé.' };
    this.leave(player);
    const now = Date.now();
    // Người đầu tiên mở nhịp; người vào sau theo nhịp đó và bắt đầu từ chu kì kế tiếp.
    if (!this.members().length) this.epoch = now + 1500;
    this.mats[mat] = player;
    player.mat = mat;
    player.medStart = now;
    this.io.emit('meditation:mats', this.occupancy());
    this.sync();
    return { ok: true, epoch: this.epoch, now, mat };
  }

  members() {
    return this.mats.filter(Boolean);
  }

  /** Báo cho những người đang ngồi biết ai đang thiền cùng. */
  sync() {
    const members = this.members();
    const names = members.map((p) => ({ sid: p.sid, name: p.name }));
    for (const p of members) {
      p.socket?.emit('meditation:sync', { epoch: this.epoch, mates: names.filter((n) => n.sid !== p.sid).map((n) => n.name) });
    }
  }

  leave(player) {
    if (player.mat === undefined || player.mat === null) return;
    this.mats[player.mat] = null;
    player.mat = null;
    this.io.emit('meditation:mats', this.occupancy());
    this.sync();
  }

  finish(player, data) {
    if (player.mat === null || player.mat === undefined) return { ok: false };
    const now = Date.now();
    const raw = Number(data?.score);
    const score = Number.isFinite(raw) ? Math.round(Math.max(0, Math.min(100, raw))) : 0;
    // Buổi quá ngắn thì không lưu điểm, tránh gửi điểm giả.
    const valid = now - player.medStart >= MIN_SESSION_MS;
    if (valid) this.db.addMeditation(player.pid, score, now);
    return { ok: true, saved: valid, score, phrase: this.phrase(score) };
  }

  phrase(score) {
    const set = this.config.meditationPhrases || {};
    const tier = score >= 75 ? 'high' : score >= 45 ? 'mid' : 'low';
    const list = set[tier]?.length ? set[tier] : ['Một phút cho mình, vậy là đủ tốt rồi.'];
    return list[crypto.randomInt(list.length)];
  }
}
