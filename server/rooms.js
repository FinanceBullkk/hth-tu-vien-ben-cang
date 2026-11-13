// Phòng chung duy nhất: người online, gói vị trí 20 lần/giây, chat, emoji, vẫy tay, kết nối lại.
import crypto from 'node:crypto';
import { MATS, SPAWN, clampToWalkable } from '../shared/layout.js';
import { ACTIVITY, ACTIVITY_BY_NAME, AVATAR, EMOJIS, LIMITS, MOTION, PLAYER_ID_RE, TEU } from '../shared/protocol.js';
import { LOOK_SLOTS, sanitizeLook } from '../shared/shop.js';
import { cleanText } from './filter.js';
import { WindowCounter, clientIp } from './limits.js';
import { localDate } from './time.js';
import { Voice } from './voice.js';
import { QI_INTERVAL_MS } from '../shared/cultivation.js';

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
  constructor({ io, db, filter, config, wishes, bell, meditation, rhythm, riddle, fishing, pitch, melody, pk, shop, baucua, xidach, taixiu, coquay, slot, trade }) {
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
    this.melody = melody;
    this.pk = pk;
    this.shop = shop;
    this.baucua = baucua;
    this.xidach = xidach;
    this.slot = slot; // Máy gạt cần: mỗi lần gạt chấm ngay, không có ván chung nên không cần sweep hay snapshot.
    // Tài xỉu, cò quay: cùng lõi CasinoRoundTable, sự kiện <trò>:bet|clear|throw.
    this.casinoTables = [taixiu, coquay].filter(Boolean);
    // Kết quả các bàn đỏ đen gửi riêng cho từng người cược (theo pid); người đã rời thì bỏ qua, tiền vẫn vào ví.
    const toPid = (event) => (pid, data) => this.byPid.get(pid)?.socket?.emit(event, data);
    if (this.baucua) this.baucua.onPayout = toPid('baucua:payout');
    if (this.xidach) {
      this.xidach.onPayout = toPid('xidach:payout');
      this.xidach.onHand = toPid('xidach:hand'); // Bài của mình chỉ gửi cho mình.
    }
    for (const table of this.casinoTables) table.onPayout = toPid(`${table.rules.name}:payout`);
    // Mỗi lần kiếm được TEU, đẩy số dư mới cho đúng người để ví trên HUD luôn khớp.
    this.db.onTeu = (pid, teu) => this.byPid.get(pid)?.socket?.emit('wallet', { teu });
    if (this.pk) this.pk.onKnockout = (player) => this.onActionStop(player);
    this.players = new Map(); // sid -> player
    this.pk?.bind(this.players);
    // Trạm giao thương: cần danh sách người chơi để tìm người được mời; ai cho đi món đang mặc thì cả phòng thấy đổi đồ.
    this.trade = trade;
    this.trade?.bind(this.players);
    if (this.trade) this.trade.onLook = (p, look) => this.broadcast.emit('player:look', { sid: p.sid, ...look });
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
    this.baucua?.stop(); // Hoàn cược ván đang dở trước khi tắt.
    this.xidach?.stop();
    for (const table of this.casinoTables) table.stop();
    for (const p of this.players.values()) {
      this.meditation.leave(p);
      clearTimeout(p.ghostTimer);
    }
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
      qi: p.qi ?? 0,
      x: p.x,
      z: p.z,
      rot: p.rot,
      anim: p.anim,
      activity: p.activity,
      combat: this.pk?.state(p),
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
      // Cột 8: chân khí, client vẽ hào quang thiền theo qi.
      rows.push([p.sid, p.x, p.z, p.rot, p.anim, p.activity, now - p.moveAt, p.qi ?? 0]);
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
      this.meditation.sweep();
      this.fishing.sweep(this.players);
      this.pitch.sweep(this.players);
      this.melody?.sweep();
      this.pk?.sweep();
      this.baucua?.sweep();
      this.xidach?.sweep();
      for (const table of this.casinoTables) table.sweep();
      this.trade?.sweep();
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
      socket.on(event, async (...args) => {
        const ack = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        try {
          const player = socket.data.player;
          if (event !== 'hello' && event !== 'time:sync' && !player) {
            ack?.({ ok: false, error: 'Chưa vào phòng.' });
            return;
          }
          if (player?.melody && /^(action:start|rhythm:|fish:|pitch:|riddle:|baucua:|xidach:|taixiu:|coquay:|slot:)/.test(event)) {
            ack?.({ ok: false, error: 'Rời sân đàn trước nhé.' });
            return;
          }
          const result = await handler(player, args[0]);
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
    on('fish:gear', (p) => this.fishing.supplies.info(p));
    on('fish:buy', (p, data) => this.fishing.supplies.buy(p, data));
    on('bag:sell', (p, data) => this.fishing.bag.sell(p, data));
    on('bag:lock', (p, data) => this.fishing.bag.lock(p, data));
    on('melody:start', (p) => this.melody.start(p));
    on('melody:hit', (p, data) => this.melody.hit(p, data));
    on('melody:finish', (p, data) => this.melody.finish(p, data));
    on('pitch:start', (p, data) => this.pitch.start(p, data));
    on('pitch:aim', (p, data) => this.pitch.aim(p, data));
    on('pitch:throw', (p, data) => this.pitch.throw(p, data));
    on('wish:create', (p, data) => this.wishes.create(p, data));
    on('wish:like', (p, data) => this.wishes.like(p, data));
    on('wish:delete', (p, data) => this.wishes.remove(p, data));
    on('fortune:draw', (p) => this.wishes.drawFortune(p));
    on('baucua:bet', (p, data) => this.baucua.bet(p, data));
    on('baucua:rebet', (p, data) => this.baucua.rebet(p, data));
    on('baucua:clear', (p) => this.baucua.clear(p));
    on('xidach:bet', (p, data) => this.xidach.bet(p, data));
    on('xidach:clear', (p) => this.xidach.clear(p));
    on('xidach:hit', (p) => this.xidach.hit(p));
    on('xidach:stand', (p) => this.xidach.stand(p));
    for (const table of this.casinoTables) {
      const { name } = table.rules;
      on(`${name}:bet`, (p, data) => table.bet(p, data));
      on(`${name}:clear`, (p) => table.clear(p));
      on(`${name}:throw`, (p, data) => table.throw(p, data));
    }
    on('slot:spin', (p, data) => this.slot.spin(p, data));
    on('shop:buy', (p, data) => this.onBuy(p, data));
    on('look:set', (p, data) => this.onLook(p, data));
    on('trade:invite', (p, data) => this.trade.invite(p, data));
    on('trade:respond', (p, data) => this.trade.respond(p, data));
    on('trade:offer', (p, data) => this.trade.offer(p, data));
    on('trade:ready', (p, data) => this.trade.ready(p, data));
    on('trade:cancel', (p) => this.trade.cancel(p));
    on('pk:attack', (p, data) => this.pk.attack(p, data));
    on('pk:skill', (p, data) => this.pk.skill(p, data));

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

    const rawColor = clampInt(data?.color, AVATAR.colors);
    const rawHat = clampInt(data?.hat, AVATAR.hats);
    // Client bản cũ không có slot tóc: id hat 0-2 là kiểu tóc, di trú sang slot tóc
    // để người chơi cũ giữ nguyên ngoại hình; hair lệch phạm vi thì rớt về tóc ngắn.
    const rawHair = data?.hair === undefined ? (rawHat <= 2 ? rawHat : 0) : clampInt(data.hair, AVATAR.hairs);
    // Món trả phí chưa mua (hoặc mua ở máy khác chưa đồng bộ) rớt về mặc định của slot đó.
    const owned = this.shop.owned(pid);
    const { color, hair, hat, attire, weapon, effect } = sanitizeLook({
      color: rawColor,
      hair: rawHair,
      hat: rawHat,
      attire: clampInt(data?.attire, AVATAR.attires),
      weapon: clampInt(data?.weapon, AVATAR.weapons),
      effect: clampInt(data?.effect, AVATAR.effects),
    }, owned);
    let player = this.byPid.get(pid);
    const isResume = Boolean(player);

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
        this.onActionStop(player);
        this.trade?.leave(player); // Tab cũ đang giao dịch dở: huỷ, tab mới bắt đầu lại sạch.
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
    // Chưa có dòng trong DB tức là lần đầu vào: tặng quà nhập môn đúng một lần (join chạy đồng bộ nên không bị cấp đôi).
    const isNewcomer = !this.db.playerRow(pid);
    this.db.touchPlayer({ id: pid, name: player.name, color: player.color, hair: player.hair, hat: player.hat, attire: player.attire, weapon: player.weapon, effect: player.effect, now, isVisit: !isResume });
    if (isNewcomer) this.db.addTeu(pid, TEU.welcomeGift, 'welcome', date, now);
    player.cultivationTier = this.db.cultivation(pid).tier;
    player.qi = Math.floor((this.db.playerRow(pid)?.cultivation_ms ?? 0) / QI_INTERVAL_MS);
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
        owned: [...owned],
        teu: this.db.shop.teu(pid),
        bag: this.fishing.bag.state(pid),
        welcomeGift: isNewcomer ? TEU.welcomeGift : 0,
        baucua: this.baucua.snapshot(pid),
        xidach: this.xidach.snapshot(pid),
        ...Object.fromEntries(this.casinoTables.map((t) => [t.rules.name, t.snapshot(pid)])),
        dayCycleMs: (this.config.dayCycleMinutes || 20) * 60_000,
        radio: { durationSec: 1758, startedAt: this.config.radioStartedAt },
        welcome: this.config.welcomeMessage,
      },
    };
  }

  onMove(p, data) {
    if (p.melody) return undefined;
    if (!Array.isArray(data) || data.length < 4) return undefined;

    // Chặn gửi quá dày: quá giới hạn trong cửa sổ 1 giây thì bỏ gói.
    const now = Date.now();
    if (now - p.moveWindow > 1000) {
      p.moveWindow = now;
      p.moveCount = 0;
    }
    if (++p.moveCount > LIMITS.moveMaxPerSec) return undefined;
    if (p.activity === ACTIVITY.meditate) return undefined; // Đang ngồi thiền thì đứng yên.
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
      if (p.rod || p.pitch || p.rhythm || (p.activity !== ACTIVITY.none && p.activity !== ACTIVITY.meditate)) {
        return { ok: false, error: 'Kết thúc hoạt động hiện tại trước khi ngồi thiền nhé.' };
      }
      const now = Date.now();
      if (now - p.lastSit < SIT_INTERVAL_MS) return { ok: false, error: 'Từ từ thôi, thở một nhịp đã nhé.' };
      const res = this.meditation.sit(p, data?.mat);
      if (!res.ok) return res;
      p.lastSit = now;
      const mat = MATS[res.mat];
      if (mat) {
        p.x = round2(mat.x);
        p.z = round2(mat.z);
        p.rot = round2(mat.rot);
      }
      p.anim = 0;
      p.moveAt = now;
      p.activity = code;
      p.dirty = true;
      return { ...res, x: p.x, z: p.z, rot: p.rot };
    }
    if (p.activity === ACTIVITY.meditate) return { ok: false, error: 'Đứng dậy trước khi bắt đầu hoạt động khác nhé.' };
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
    this.melody?.leave(p);
    if (p.activity !== ACTIVITY.none) {
      p.activity = ACTIVITY.none;
      p.dirty = true;
    }
    return { ok: true };
  }

  /** Mua món ở cửa hàng; trả về số TEU mới để client cập nhật ví ngay. */
  onBuy(p, data) {
    return this.shop.buy(p, data);
  }

  /** Tủ đồ: thay đồ đang mặc, cả phòng thấy ngay. */
  onLook(p, data) {
    const res = this.shop.setLook(p, data);
    if (res.error) return { ok: false, error: res.error };
    for (const slot of LOOK_SLOTS) p[slot] = res.look[slot];
    this.broadcast.emit('player:look', { sid: p.sid, ...res.look });
    return { ok: true, look: res.look };
  }

  onDisconnect(socket) {
    const p = socket.data.player;
    if (!p || p.socket !== socket) return;
    this.voice.leave(p);
    p.socket = null;
    // Rời chiếu ngay để người khác ngồi được; nhân vật giữ lại 10 giây chờ kết nối lại.
    this.onActionStop(p);
    this.trade?.leave(p); // Giao dịch dở thì huỷ ngay, không bắt đối phương chờ.
    p.ghostTimer = setTimeout(() => this.removePlayer(p), GHOST_MS);
  }

  removePlayer(p) {
    this.voice.leave(p);
    this.trade?.leave(p);
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
    this.melody?.leave(p);
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
