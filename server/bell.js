// Thỉnh chuông: lượt cá nhân (nghỉ 30 giây) và sự kiện hẹn giờ cả công ty.
import { BELL, dist2d } from '../shared/layout.js';
import { BELL_EVENT, LIMITS } from '../shared/protocol.js';
import { localDate, partOfDay, zonedToTs } from './time.js';

const DEFAULT_MESSAGE = '{time} cả nhà cùng thỉnh chuông — ra gác chuông nhé';

function clock(ts, tz) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(ts);
}

export class Bell {
  constructor({ db, io, config }) {
    this.db = db;
    this.io = io;
    this.config = config;
    this.event = null;
    this.fired = new Set();
    this.timers = [];
  }

  start() {
    this.interval = setInterval(() => this.tick(), 1000);
    this.tick();
  }

  stop() {
    clearInterval(this.interval);
    this.timers.forEach(clearTimeout);
  }

  /** Lượt chuông cá nhân. Mọi người đều nghe; client giảm âm lượng theo khoảng cách. */
  strike(player, data) {
    const now = Date.now();
    const wait = player.lastBell + LIMITS.bellCooldownMs - now;
    if (wait > 0) return { ok: false, wait, error: `Chuông đang nghỉ, đợi thêm ${Math.ceil(wait / 1000)} giây nhé.` };
    if (dist2d(player.x, player.z, BELL.x, BELL.z) > BELL.radius + 1.5) {
      return { ok: false, error: 'Lại gần gác chuông hơn chút nhé.' };
    }
    const q = Number(data?.quality);
    const quality = Number.isFinite(q) ? Math.max(0, Math.min(1, q)) : 0;
    player.lastBell = now;
    this.db.bumpBell(player.pid);
    this.db.bumpStat(localDate(now, this.config.timezone), { bells: 1 });
    this.io.emit('bell:ring', { sid: player.sid, quality });
    return { ok: true, cooldown: LIMITS.bellCooldownMs };
  }

  /** Mỗi giây: tìm lịch sắp đến giờ để mở sự kiện trước 2 phút. */
  tick() {
    if (this.event) return;
    const now = Date.now();
    const tz = this.config.timezone;
    const today = localDate(now, tz);
    for (const item of this.config.bellSchedule || []) {
      if (item.enabled === false || !/^\d{1,2}:\d{2}$/.test(item.time || '')) continue;
      const date = item.repeat === 'daily' ? today : item.date;
      if (!date) continue;
      const at = zonedToTs(date, item.time, tz);
      const key = `${date}|${item.time}`;
      if (this.fired.has(key)) continue;
      if (at > now && at - now <= BELL_EVENT.announceMs) {
        this.fired.add(key);
        this.begin(at, item.message);
        return;
      }
    }
    // Dọn dấu đã chạy của ngày cũ.
    if (this.fired.size > 200) this.fired.clear();
  }

  /** Nút "Đánh chuông ngay" của admin: mở ngay với đếm ngược ngắn. */
  ringNow(message) {
    if (this.event) return false;
    this.begin(Date.now() + BELL_EVENT.ringNowLeadMs, message || 'Cả nhà ra gác chuông, thỉnh chuông ngay bây giờ nào!');
    return true;
  }

  begin(at, message) {
    const tz = this.config.timezone;
    const text = (message || DEFAULT_MESSAGE).replace('{time}', clock(at, tz));
    this.event = {
      at,
      hitAt: at + BELL_EVENT.hitDelayMs,
      message: text,
      phase: 'announce',
      taps: new Map(),
    };
    this.broadcast();
    const delay = (fn, ms) => this.timers.push(setTimeout(fn, Math.max(0, ms)));
    delay(() => {
      this.event.phase = 'open';
      this.broadcast();
    }, at - Date.now());
    delay(() => this.finish(), at + BELL_EVENT.resultDelayMs - Date.now());
  }

  publicEvent() {
    const e = this.event;
    if (!e) return null;
    return { phase: e.phase, at: e.at, hitAt: e.hitAt, message: e.message, now: Date.now() };
  }

  broadcast() {
    this.io.emit('bell:event', this.publicEvent());
  }

  /** Nhịp chạm chung. Dùng giờ server lúc nhận, không tin giờ client gửi lên. */
  tap(player) {
    const e = this.event;
    if (!e || e.phase !== 'open') return { ok: false };
    const now = Date.now();
    if (now > e.hitAt + BELL_EVENT.tapLateMs) return { ok: false };
    if (dist2d(player.x, player.z, BELL.x, BELL.z) > BELL.yardRadius) {
      return { ok: false, error: 'Vào sân chuông rồi chạm nhé.' };
    }
    if (e.taps.has(player.pid)) return { ok: true, repeat: true };
    const onBeat = Math.abs(now - e.hitAt) <= BELL_EVENT.onBeatMs;
    e.taps.set(player.pid, onBeat);
    return { ok: true, onBeat };
  }

  finish() {
    const e = this.event;
    if (!e) return;
    const now = Date.now();
    const participants = [...e.taps.keys()];
    const onBeat = [...e.taps.values()].filter(Boolean).length;
    const tz = this.config.timezone;
    if (participants.length) {
      this.db.recordBellEvent(e.at, participants, onBeat);
      this.db.bumpStat(localDate(now, tz), { bells: 1 });
    }
    // Càng đông càng trầm và dài; 1 người vẫn có tiếng ngân rõ.
    const intensity = participants.length ? Math.min(1, 0.25 + (1 - Math.exp(-onBeat / 4)) * 0.75) : 0;
    this.io.emit('bell:event', {
      phase: 'result',
      count: participants.length,
      onBeat,
      intensity,
      when: partOfDay(now, tz),
    });
    this.event = null;
  }
}
