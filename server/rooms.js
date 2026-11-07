// Phòng chung duy nhất: người online, gói vị trí 20 lần/giây, chat, emoji, vẫy tay, kết nối lại.
import crypto from 'node:crypto';
import { MATS, SPAWN, clampToWalkable } from '../shared/layout.js';
import { ACTIVITY, ACTIVITY_BY_NAME, AVATAR, EMOJIS, LIMITS, MOTION, PLAYER_ID_RE, PREMIUM_COLORS, SHIRT_COLORS } from '../shared/protocol.js';
import { cleanText } from './filter.js';
import { WindowCounter, clientIp } from './limits.js';
import { localDate } from './time.js';
import { Voice } from './voice.js';

/** Chỉ socket đã qua bước hello mới ở trong nhóm này và mới nhận tin phát chung. */
export const PLAYERS_ROOM = 'players';

const TICK_MS = MOTION.tickMs;
const ticksIn = (ms) => Math.round(ms / TICK_MS);
const FULL_STATE_EVERY = ticksIn(1000); // Mỗi giây gửi đủ, phòng khi gói volatile bị rơi.
const DAY_CHECK_EVERY = ticksIn(1000);
const SWEEP_EVERY = ticksIn(500);
const GHOST_MS = 10_000;
const KICK_BLOCK_MS = 60_000;
const HELLO_TIMEOUT_MS = 20_000; // Kết nối mà không vào phòng thì ngắt, tránh chiếm chỗ.
const MAX_EVENTS_PER_SEC = 60; // Người chơi thật khoảng 25/giây; vượt thì bỏ gói.
const DISCONNECT_EVENTS_PER_SEC = 180; // Vượt mức này chắc chắn là dội, ngắt luôn.
const SIT_INTERVAL_MS = 1000; // Ngồi xuống phát tin cho cả phòng nên phải giới hạn riêng.

const round2 = (n) => Math.round(n * 100) / 100;

export class Room {
  constructor({ io, db, filter, config, wishes, bell, meditation, rhythm, riddle, fishing, pitch }) {
    this.io = io;
    this.broadcast = io.to(PLAYERS_ROOM);
    this.db = db;
    this.filter = filter;
    this.config = config;
    this.wishes = wishes;
    this.bell = bell;
    this.meditation = meditation;
    this.rhythm = rhythm;
    this.riddle = riddle;
    this.fishing = fishing;
    this.pitch = pitch;
    this.players = new Map(); // sid -> player
    this.voice = new Voice(this.players);
    this.byPid = new Map();
    this.kicked = new Map(); // pid -> hết hạn chặn
    this.newPlayers = new WindowCounter(60_000);
    this.nextSid = 1;
    this.tickCount = 0;
    this.lastDate = this.today();
  }

  today() {
    return localDate(Date.now(), this.config.timezone);
  }

  start() {
    this.io.on('connection', (socket) => this.onConnection(socket));
    this.interval = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    clearInterval(this.interval);
    for (const p of this.players.values()) clearTimeout(p.ghostTimer);
  }

  onlineCount() {
    return this.players.size;
  }

  publicPlayer(p) {
    return {
      sid: p.sid,
      name: p.name,
      color: p.color,
      hair: p.hair,
      hat: p.hat,
      attire: p.attire,
      weapon: p.weapon,
      effect: p.effect,
      cultivationTier: p.cultivationTier ?? 0,
      x: p.x,
      z: p.z,
      rot: p.rot,
      anim: p.anim,
      activity: p.activity,
    };
  }

  tick() {
    this.tickCount++;
    const full = this.tickCount % FULL_STATE_EVERY === 0;
    const now = Date.now();
    const rows = [];
    for (const p of this.players.values()) {
      if (!p.dirty && !full) continue;
      p.dirty = false;
      // Cột cuối: tuổi của vị trí (ms). Client phát lại theo lúc mẫu được lấy, không theo lúc tick.
      rows.push([p.sid, p.x, p.z, p.rot, p.anim, p.activity, now - p.moveAt]);
    }
    if (rows.length) this.broadcast.volatile.emit('state', { t: now, p: rows });

    if (this.tickCount % DAY_CHECK_EVERY === 0) {
      const d = this.today();
      if (d !== this.lastDate) {
        this.lastDate = d; // Qua 0h: bộ đếm "Hôm nay" về 0.
        this.broadcastPresence();
      }
    }
    // Quét minigame 2 lần/giây: giờ cá cắn, cá tuột, lượt đầu hồ hết giờ.
    if (this.tickCount % SWEEP_EVERY === 0) {
      this.voice.sync();
      this.fishing.sweep(this.players);
      this.pitch.sweep(this.players);
    }
  }

  broadcastPresence() {
    this.broadcast.emit('presence', {
      online: this.onlineCount(),
      visitsToday: this.db.statsFor(this.today()).visits,
    });
  }

  dedupeName(base, ownPid) {
    const taken = new Set();
    for (const p of this.players.values()) if (p.pid !== ownPid) taken.add(p.name.toLowerCase());
    if (!taken.has(base.toLowerCase())) return base;
    for (let i = 2; ; i++) {
      const candidate = `${base} (${i})`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  onConnection(socket) {
    // Giới hạn tần suất cho mọi sự kiện, kể cả tên sự kiện không tồn tại.
    const rate = { start: 0, count: 0 };
    socket.use((_packet, next) => {
      const now = Date.now();
      if (now - rate.start >= 1000) {
        rate.start = now;
        rate.count = 0;
      }
      rate.count++;
      if (rate.count > DISCONNECT_EVENTS_PER_SEC) {
        socket.disconnect(true);
        return;
      }
      if (rate.count <= MAX_EVENTS_PER_SEC) next();
    });

    const helloTimer = setTimeout(() => {
      if (!socket.data.player) socket.disconnect(true);
    }, this.config.helloTimeoutMs ?? HELLO_TIMEOUT_MS);
    socket.on('disconnect', () => clearTimeout(helloTimer));

    const on = (event, handler) => {
      socket.on(event, (...args) => {
        const ack = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        try {
          const player = socket.data.player;
          if (event !== 'hello' && event !== 'time:sync' && !player) {
            ack?.({ ok: false, error: 'Chưa vào phòng.' });
            return;
          }
          const result = handler(player, args[0]);
          ack?.(result ?? { ok: true });
        } catch (err) {
          console.error(`Lỗi xử lý ${event}:`, err);
          ack?.({ ok: false, error: 'Có lỗi nhỏ, thử lại nhé.' });
        }
      });
    };

    on('time:sync', () => ({ now: Date.now() }));
    on('hello', (_, data) => this.onHello(socket, data));

    on('move', (p, data) => this.onMove(p, data));
    on('chat', (p, data) => this.onChat(p, data));
    on('emoji', (p, data) => this.onEmoji(p, data));
    on('wave', (p, data) => this.onWave(p, data));
    on('voice:enable', (p, data) => this.voice.enable(p, data));
    on('voice:signal', (p, data) => this.voice.signal(p, data));
    on('action:start', (p, data) => this.onActionStart(p, data));
    on('action:stop', (p) => this.onActionStop(p));

    on('rhythm:start', (p, data) => this.rhythm.start(p, data));
    on('rhythm:hit', (p, data) => this.rhythm.hit(p, data));
    on('rhythm:finish', (p, data) => this.rhythm.finish(p, data));
    on('bell:tap', (p) => this.bell.tap(p));
    on('riddle:draw', (p) => this.riddle.draw(p));
    on('riddle:answer', (p, data) => this.riddle.answer(p, data));
    on('fish:cast', (p, data) => this.fishing.cast(p, data));
    on('fish:wiggle', (p) => this.fishing.wiggle(p));
    on('fish:pull', (p, data) => this.fishing.pull(p, data));
    on('fish:reel', (p) => this.fishing.reel(p));
    on('fish:cancel', (p) => this.fishing.cancel(p));
    on('pitch:start', (p, data) => this.pitch.start(p, data));
    on('pitch:aim', (p, data) => this.pitch.aim(p, data));
    on('pitch:throw', (p, data) => this.pitch.throw(p, data));
    on('wish:create', (p, data) => this.wishes.create(p, data));
    on('wish:like', (p, data) => this.wishes.like(p, data));
    on('wish:delete', (p, data) => this.wishes.remove(p, data));
    on('fortune:draw', (p) => this.wishes.drawFortune(p));
    on('cosmetic:unlock', (p, data) => this.onUnlock(p, data));

    socket.on('disconnect', () => this.onDisconnect(socket));
  }

  onHello(socket, data) {
    const now = Date.now();
    // Mỗi kết nối chỉ vào phòng một lần. Nếu cho lặp, người chơi cũ mất dấu socket và không bao giờ bị dọn.
    if (socket.data.player) return { ok: false, error: 'Bạn đã ở trong tu viện rồi.' };

    const ip = clientIp(socket.handshake, this.config.trustProxy);

    const baseName = cleanText(data?.name, LIMITS.nameMax);
    if (!baseName) return { ok: false, error: 'Nhập tên hiển thị nhé.' };
    if (this.filter.isBad(baseName)) return { ok: false, error: 'Chọn một cái tên nhẹ nhàng hơn nhé.' };

    let pid = typeof data?.playerId === 'string' && PLAYER_ID_RE.test(data.playerId) ? data.playerId : null;
    if (pid && (this.kicked.get(pid) ?? 0) > now) {
      return { ok: false, kicked: true, error: 'Bạn vừa được mời ra khỏi tu viện, thử lại sau một phút nhé.' };
    }
    if (!pid) pid = crypto.randomBytes(16).toString('hex');

    let color = clampInt(data?.color, AVATAR.colors);
    const hat = clampInt(data?.hat, AVATAR.hats);
    // Client bản cũ không có slot tóc: id hat 0-2 là kiểu tóc, di trú sang slot tóc
    // để người chơi cũ giữ nguyên ngoại hình; hair lệch phạm vi thì rớt về tóc ngắn.
    const hair = data?.hair === undefined ? (hat <= 2 ? hat : 0) : clampInt(data.hair, AVATAR.hairs);
    const attire = clampInt(data?.attire, AVATAR.attires);
    const weapon = clampInt(data?.weapon, AVATAR.weapons);
    const effect = clampInt(data?.effect, AVATAR.effects);
    let player = this.byPid.get(pid);
    const isResume = Boolean(player);
    // Màu áo quý phải mở khoá bằng TEU trước, không thì rớt về màu mặc định.
    const premiumStart = SHIRT_COLORS.length - PREMIUM_COLORS.length;
    if (color >= premiumStart) {
      const unlockedRow = this.db.playerRow(pid);
      const mask = 1 << (color - premiumStart);
      if (!((unlockedRow?.unlocked ?? 0) & mask)) color = 0;
    }

    // Người đang kết nối lại luôn được vào; chỉ chặn lượt vào mới khi phòng đầy hoặc bị spam.
    if (!isResume) {
      if (this.players.size >= this.config.maxPlayers) {
        return { ok: false, error: 'Tu viện đang đông quá, chờ một lát rồi lên nhé.' };
      }
      if (!this.newPlayers.take(ip, this.config.newPlayersPerMinute, now)) {
        return { ok: false, error: 'Nhiều người vào cùng lúc quá, thử lại sau một phút nhé.' };
      }
    }

    if (player) {
      // Kết nối lại, hoặc mở tab mới cùng người chơi: tab cũ nhường chỗ.
      clearTimeout(player.ghostTimer);
      player.ghostTimer = null;
      const old = player.socket;
      if (old && old.id !== socket.id) {
        this.voice.leave(player);
        old.data.player = null;
        old.emit('session:replaced');
        old.disconnect(true);
      }
      player.socket = socket;
      // Nhân vật có thể đổi đồ giữa hai lần vào: cập nhật luôn ngoại hình mới.
      player.color = color;
      player.hair = hair;
      player.hat = hat;
      player.attire = attire;
      player.weapon = weapon;
      player.effect = effect;
      player.dirty = true;
    } else {
      player = {
        sid: this.nextSid++,
        pid,
        name: this.dedupeName(baseName, pid),
        color,
        hair,
        hat,
        attire,
        weapon,
        effect,
        x: SPAWN.x,
        z: SPAWN.z,
        rot: SPAWN.rot,
        anim: 0,
        moveAt: now,
        activity: ACTIVITY.none,
        dirty: true,
        socket,
        mat: null,
        medStart: 0,
        lastChat: 0,
        lastEmoji: 0,
        lastWave: 0,
        lastBell: 0,
        lastSit: 0,
        moveWindow: 0,
        moveCount: 0,
        ghostTimer: null,
      };
      this.players.set(player.sid, player);
      this.byPid.set(pid, player);
    }
    socket.data.player = player;
    player.ip = ip;
    socket.join(PLAYERS_ROOM);

    const date = localDate(now, this.config.timezone);
    this.db.touchPlayer({ id: pid, name: player.name, color: player.color, hair: player.hair, hat: player.hat, attire: player.attire, weapon: player.weapon, effect: player.effect, now, isVisit: !isResume });
    player.cultivationTier = this.db.cultivation(pid).tier;
    if (!isResume) {
      this.db.bumpStat(date, { visits: 1 });
      socket.to(PLAYERS_ROOM).emit('player:join', this.publicPlayer(player));
      this.broadcastPresence();
    }

    return {
      ok: true,
      playerId: pid,
      sid: player.sid,
      name: player.name,
      resumed: isResume,
      snapshot: {
        now,
        me: this.publicPlayer(player),
        players: [...this.players.values()].filter((p) => p !== player).map((p) => this.publicPlayer(p)),
        online: this.onlineCount(),
        visitsToday: this.db.statsFor(date).visits,
        wishes: this.wishes.snapshot(pid),
        wishesLeftToday: LIMITS.wishesPerDay - this.db.wishCountToday(pid, date),
        mats: this.meditation.occupancy(),
        bellEvent: this.bell.publicEvent(),
        meditationScene: this.meditation.scene(),
        bellWait: Math.max(0, player.lastBell + LIMITS.bellCooldownMs - now),
        fishers: this.fishing.snapshot(this.players),
        fishShadowsTaken: this.fishing.takenShadowIds(),
        unlocked: this.db.playerRow(pid)?.unlocked ?? 0,
        dayCycleMs: (this.config.dayCycleMinutes || 20) * 60_000,
        radio: { durationSec: 1758, startedAt: this.config.radioStartedAt },
        welcome: this.config.welcomeMessage,
      },
    };
  }

  onMove(p, data) {
    if (!Array.isArray(data) || data.length < 4) return undefined;
    // Chặn gửi quá dày: quá giới hạn trong cửa sổ 1 giây thì bỏ gói.
    const now = Date.now();
    if (now - p.moveWindow > 1000) {
      p.moveWindow = now;
      p.moveCount = 0;
    }
    if (++p.moveCount > LIMITS.moveMaxPerSec) return undefined;
    if (p.mat !== null && p.mat !== undefined) return undefined; // Đang ngồi thiền thì đứng yên.
    if (p.rod) return undefined; // Đã buông cần: rút mồi trước khi đi (client tự gửi fish:cancel).

    const [x, z, rot, anim, sampledAt] = data.map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(rot)) return undefined;
    const [cx, cz] = clampToWalkable(x, z);
    const nx = round2(cx);
    const nz = round2(cz);
    const nr = round2(rot);
    const na = anim === 1 ? 1 : 0;
    if (nx !== p.x || nz !== p.z || nr !== p.rot || na !== p.anim) {
      p.x = nx;
      p.z = nz;
      p.rot = nr;
      p.anim = na;
      p.dirty = true;
      // Mốc của client chỉ để phát lại cho mượt nên chỉ cần kẹp: không ở tương lai, không quá cũ, không lùi.
      const stamp = Number.isFinite(sampledAt) ? Math.min(now, Math.max(sampledAt, now - MOTION.stampMaxAgeMs)) : now;
      p.moveAt = Math.max(p.moveAt, stamp);
    }
    return undefined;
  }

  onChat(p, data) {
    const now = Date.now();
    if (p.mat !== null && p.mat !== undefined) return { ok: false, error: 'Đang thiền thì mình giữ yên lặng nhé.' };
    if (now - p.lastChat < LIMITS.chatIntervalMs) return { ok: false, error: 'Từ từ thôi, đợi 2 giây nhé.' };
    const text = cleanText(data?.text, LIMITS.chatMax);
    if (!text) return { ok: false };
    if (this.filter.isBad(text)) return { ok: false, error: 'Mình nói nhẹ nhàng hơn nhé.' };
    p.lastChat = now;
    // Không lưu chat ở đâu cả: chỉ phát rồi quên.
    this.broadcast.emit('chat', { sid: p.sid, text });
    return { ok: true };
  }

  onEmoji(p, data) {
    const now = Date.now();
    const i = Number(data?.i);
    if (!Number.isInteger(i) || i < 0 || i >= EMOJIS.length) return { ok: false };
    if (now - p.lastEmoji < LIMITS.emojiIntervalMs) return { ok: false };
    p.lastEmoji = now;
    this.broadcast.emit('emoji', { sid: p.sid, i });
    return { ok: true };
  }

  onWave(p, data) {
    const now = Date.now();
    const to = Number(data?.to);
    if (!this.players.has(to) || to === p.sid) return { ok: false };
    if (now - p.lastWave < LIMITS.waveIntervalMs) return { ok: false };
    p.lastWave = now;
    this.broadcast.emit('wave', { from: p.sid, to, name: p.name });
    return { ok: true };
  }

  onActionStart(p, data) {
    const code = ACTIVITY_BY_NAME[data?.kind];
    if (!code) return { ok: false };
    if (code === ACTIVITY.meditate) {
      const now = Date.now();
      if (now - p.lastSit < SIT_INTERVAL_MS) return { ok: false, error: 'Từ từ thôi, thở một nhịp đã nhé.' };
      const res = this.meditation.sit(p, data?.mat);
      if (!res.ok) return res;
      p.lastSit = now;
      const mat = MATS[res.mat];
      p.x = round2(mat.x);
      p.z = round2(mat.z);
      p.rot = round2(mat.rot);
      p.anim = 0;
      p.moveAt = now;
      p.activity = code;
      p.dirty = true;
      return res;
    }
    p.activity = code;
    p.dirty = true;
    return { ok: true };
  }

  onActionStop(p) {
    p.rhythm = null;
    this.meditation.leave(p);
    this.fishing.cancel(p);
    this.riddle.leave(p);
    this.pitch.leave(p);
    if (p.activity !== ACTIVITY.none) {
      p.activity = ACTIVITY.none;
      p.dirty = true;
    }
    return { ok: true };
  }

  /** Mở khoá màu áo quý bằng TEU; idempotent, trừ điểm trong SQL nên không âm được. */
  onUnlock(p, data) {
    const i = Number(data?.color);
    if (!Number.isInteger(i) || i < 0 || i >= PREMIUM_COLORS.length) return { ok: false, error: 'Màu không có thật.' };
    const mask = 1 << i;
    const row = this.db.playerRow(p.pid);
    if ((row?.unlocked ?? 0) & mask) return { ok: true, already: true, unlocked: row.unlocked };
    const price = PREMIUM_COLORS[i].price;
    if (!this.db.unlockPremium(p.pid, mask, price)) return { ok: false, error: 'Chưa đủ TEU, chơi thêm đã nhé.' };
    return { ok: true, unlocked: (row?.unlocked ?? 0) | mask };
  }

  onDisconnect(socket) {
    const p = socket.data.player;
    if (!p || p.socket !== socket) return;
    this.voice.leave(p);
    p.socket = null;
    // Rời chiếu ngay để người khác ngồi được; nhân vật giữ lại 10 giây chờ kết nối lại.
    this.onActionStop(p);
    p.ghostTimer = setTimeout(() => this.removePlayer(p), GHOST_MS);
  }

  removePlayer(p) {
    this.voice.leave(p);
    clearTimeout(p.ghostTimer);
    this.players.delete(p.sid);
    this.byPid.delete(p.pid);
    this.broadcast.emit('player:leave', { sid: p.sid, name: p.name });
    this.broadcastPresence();
  }

  /** Admin: ngắt một người chơi, chặn vào lại trong 1 phút để client không tự kết nối lại ngay. */
  kick(pid) {
    const p = this.byPid.get(pid);
    if (!p) return false;
    this.kicked.set(pid, Date.now() + KICK_BLOCK_MS);
    this.voice.leave(p);
    const socket = p.socket;
    if (socket) {
      socket.emit('kicked');
      socket.data.player = null;
      socket.disconnect(true);
    }
    this.meditation.leave(p);
    this.fishing.cancel(p);
    this.riddle.leave(p);
    this.pitch.leave(p);
    this.removePlayer(p);
    return true;
  }

  adminList() {
    return [...this.players.values()].map((p) => ({ playerId: p.pid, name: p.name, connected: Boolean(p.socket) }));
  }
}

function clampInt(v, max) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n < max ? n : 0;
}
