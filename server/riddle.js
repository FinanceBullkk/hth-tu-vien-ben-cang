// Đố thuật ngữ: sư chú giữ cổng đưa câu, server giữ đáp án, trả lời đúng nhận TEU.
import crypto from 'node:crypto';
import { RIDDLE } from '../shared/protocol.js';
import { localDate } from './time.js';

export class Riddle {
  constructor({ db, io, config }) {
    Object.assign(this, { db, io, config });
  }

  list() {
    return Array.isArray(this.config.riddles) ? this.config.riddles.filter((r) => r && r.q && Array.isArray(r.a) && r.a.length) : [];
  }

  /** Chuẩn hoá đáp án: bỏ dấu, bỏ ký tự lạ, thường hoá — "B/L" và "bl" là một. */
  normalize(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  draw(player) {
    const list = this.list();
    if (!list.length) return { ok: false, error: 'Sư chú hôm nay chưa mang câu đố ra cổng.' };
    const now = Date.now();
    if (player.riddle && now - player.riddle.askedAt < RIDDLE.intervalMs) {
      return { ok: false, wait: RIDDLE.intervalMs - (now - player.riddle.askedAt), error: 'Từ từ thôi, sư chú đang trầm ngâm.' };
    }
    const date = localDate(now, this.config.timezone);
    if (this.db.riddleAttemptsToday(player.pid, date) >= RIDDLE.attemptsPerDay) {
      return { ok: false, error: 'Hôm nay hết lượt đố rồi, mai quay lại nhé.' };
    }
    const index = crypto.randomInt(list.length);
    const riddle = list[index];
    player.riddle = { index, misses: 0, askedAt: now };
    this.db.addRiddleAttempt(player.pid, date);
    return { ok: true, riddle: { q: riddle.q, tier: riddle.tier || 1 } };
  }

  answer(player, data) {
    const current = player.riddle;
    if (!current) return { ok: false, error: 'Xin câu đố trước đã nhé.' };
    const now = Date.now();
    const list = this.list();
    const riddle = list[current.index];
    if (!riddle) return { ok: false, error: 'Câu đố này không còn nữa, xin câu khác nhé.' };
    const guess = this.normalize(data?.text).slice(0, 60);
    if (!guess) return { ok: false, error: 'Gõ đáp án vào ô trống nhé.' };
    if (riddle.a.some((a) => this.normalize(a) === guess)) {
      const tier = riddle.tier || 1;
      const teu = RIDDLE.teuByTier[tier] ?? 2;
      const date = localDate(now, this.config.timezone);
      this.db.addTeu(player.pid, teu, 'riddle', date);
      this.db.addRiddleCorrect(player.pid, date);
      player.riddle = null;
      return { ok: true, correct: true, teu };
    }
    current.misses++;
    const hint = current.misses >= RIDDLE.hintAfterMisses ? riddle.hint : undefined;
    return { ok: true, correct: false, misses: current.misses, hint };
  }

  /** Rời mạng/kick: bỏ câu đang hỏi, không giữ trạng thái. */
  leave(player) {
    player.riddle = null;
  }
}
