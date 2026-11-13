// Câu cá ở hồ trong sân: quăng cần, lắc dụ cá, giằng co rồi kéo lên.
// Server định giờ cắn, roll loài và tự mô phỏng tiến độ từ vị trí kim client gửi lên.
import { LAKE, lakeDistance } from '../shared/layout.js';
import { ACTIVITY, TEU } from '../shared/protocol.js';
import { BAITS, DEFAULT_BAIT, FISH_BITE, FISH_BOOK_MILESTONES, FISH_FIGHT, SHADOW_WAIT, castSpot, fightAdvance, fightGrade, fightNew, fightSeed, fishRoll, isLakeNight } from '../shared/fish.js';
import { THINH } from '../shared/fish-gear.js';
import { LAKE_SHADOW, shadowNear } from '../shared/fish-lake-shadows.js';
import { FishingSupplies } from './fishing-supplies.js';
import { localDate } from './time.js';

export class Fishing {
  constructor({ db, io, config }) {
    Object.assign(this, { db, io, config });
    this.takenShadows = new Map(); // id bóng -> giờ hết hạn: bóng đã có người quăng trúng
    this.supplies = new FishingSupplies({ db, config });
  }

  nearSpot(player) {
    return lakeDistance(player.x, player.z) <= LAKE.shoreWidth + 1;
  }

  cast(player, data) {
    if (player.mat != null || player.activity === ACTIVITY.meditate) return { ok: false, error: 'Đang ngồi thiền thì không câu cá được nhé.' };
    if (!this.nearSpot(player)) return { ok: false, error: 'Ra bờ hồ góc đông nam sân để câu cá nhé.' };
    if (player.rod) return { ok: true, repeat: true };
    const now = Date.now();
    const bait = BAITS.some((b) => b.id === data?.bait) ? data.bait : DEFAULT_BAIT;
    // Number(null) là 0: chỉ nhận số thật để gửi thiếu toạ độ không thành quăng về góc (0, 0).
    const coord = (v) => (typeof v === 'number' ? v : NaN);
    const { bx, bz } = castSpot(player.x, player.z, coord(data?.tx), coord(data?.tz));
    const shadow = this.takeShadow(bx, bz, now, player.sid);
    const thinh = this.supplies.takeThinh(player, data?.thinh);
    const tier = this.supplies.rodTier(player.pid);
    player.rod = {
      castAt: now,
      biteAt: now + (FISH_BITE.minMs + Math.random() * (FISH_BITE.maxMs - FISH_BITE.minMs)) * SHADOW_WAIT[shadow ?? 'none'] * (thinh ? THINH.waitFactor : 1),
      shadow,
      thinh,
      tier,
      pulled: 0,
      state: 'waiting', // waiting -> fighting -> ready -> (reel | escape)
      bait,
      bx,
      bz,
    };
    player.activity = ACTIVITY.fish;
    player.dirty = true;
    // Người khác thấy cần câu và phao nổi của bạn.
    this.io.emit('fish:bobber', { sid: player.sid, bx, bz, castAt: now, rod: tier, thinh });
    return { ok: true, castAt: now, bx, bz, shadow, thinh, thinhLeft: this.db.fishing.thinh(player.pid) };
  }

  /** Phao rơi trúng bóng còn trống: giữ bóng đó cho người này, cả phòng thấy bóng biến mất. */
  takeShadow(bx, bz, now, sid) {
    const shadow = shadowNear(now, bx, bz, this.takenShadows);
    if (!shadow) return null;
    this.takenShadows.set(shadow.id, now + LAKE_SHADOW.periodMs);
    this.io.emit('fish:shadow', { id: shadow.id, sid });
    return shadow.size;
  }

  takenShadowIds() {
    return [...this.takenShadows.keys()];
  }

  /** Lắc cần dụ cá: đẩy giờ cắn sớm lại, tổng cộng tối đa wiggleMaxPullMs. */
  wiggle(player) {
    const rod = player.rod;
    if (!rod || rod.state !== 'waiting') return { ok: false };
    const now = Date.now();
    if (now - (rod.lastWiggle || 0) < 500) return { ok: false };
    rod.lastWiggle = now;
    const pull = Math.min(FISH_BITE.wiggleMaxPullMs - rod.pulled, FISH_BITE.wigglePullMs);
    if (pull > 0) {
      rod.pulled += pull;
      rod.biteAt -= pull;
      if (now >= rod.biteAt) this.bite(player, rod);
    }
    return { ok: true };
  }

  /** Cá cắn: chốt loài ngay để độ khó vòng cung khớp với con cá, nhưng chưa cho biết tên. */
  bite(player, rod) {
    if (rod.state !== 'waiting') return;
    const now = Date.now();
    const night = isLakeNight(now, (this.config.dayCycleMinutes || 20) * 60_000);
    rod.catch = fishRoll(rod.castAt, player.sid, { bait: rod.bait, shadow: rod.shadow, night, thinh: rod.thinh });
    const seed = fightSeed(rod.castAt, player.sid);
    const { rarity } = rod.catch.fish;
    const startAt = now + FISH_FIGHT.graceMs;
    rod.state = 'fighting';
    rod.needle = 0.5;
    // Chưa bắt đủ vài loài thì còn là người mới: mấy con cá đầu phải dễ để họ có niềm vui ngay.
    const assist = this.db.fishCollection(player.pid).length < FISH_FIGHT.assistSpecies;
    rod.fight = fightNew({ seed, rarity, startAt, assist, rod: rod.tier });
    rod.fightEndsAt = startAt + FISH_FIGHT.maxMs;
    player.socket?.emit('fish:bite', { seed, rarity, startAt, assist, rod: rod.tier });
    this.io.emit('fish:struck', { sid: player.sid, rarity }); // cả phòng thấy bóng cá to nhỏ dưới phao
  }

  /** Cập nhật mô phỏng tới hiện tại. Trả false nếu cá đã tuột và cần đã được dọn. */
  settle(player, rod, now) {
    fightAdvance(rod.fight, rod.needle, now, FISH_FIGHT.serverSlack);
    if (rod.fight.progress >= 1) {
      rod.state = 'ready';
      rod.readyUntil = now + FISH_FIGHT.readyMs;
      return true;
    }
    if (rod.fight.progress <= 0 || now > rod.fightEndsAt) {
      this.clear(player, true);
      player.socket?.emit('fish:escaped', { reason: 'fight' });
      return false;
    }
    return true;
  }

  /** Client báo vị trí kim. Đoạn đã qua tính theo vị trí cũ, rồi mới nhận vị trí mới. */
  pull(player, data) {
    const rod = player.rod;
    if (!rod) return { ok: false };
    if (rod.state === 'ready') return { ok: true, progress: 1, ready: true };
    if (rod.state !== 'fighting') return { ok: false };
    if (!this.settle(player, rod, Date.now())) return { ok: true, escaped: true };
    const x = Number(data?.x);
    if (Number.isFinite(x)) rod.needle = Math.min(1, Math.max(0, x));
    return { ok: true, progress: Math.round(rod.fight.progress * 1000) / 1000, ready: rod.state === 'ready' };
  }

  /** Kéo cá lên: chỉ được khi server đã thấy đầy vòng. Rút sớm lúc đang chờ thì cá bỏ đi. */
  reel(player) {
    const rod = player.rod;
    if (!rod) return { ok: false, error: 'Chưa thả cần mà.' };
    if (rod.state === 'waiting') {
      this.clear(player, true);
      return { ok: true, escaped: true, reason: 'early', error: 'Cá chưa cắn đã rút, nó bỏ đi rồi.' };
    }
    if (rod.state !== 'ready') return { ok: false, error: 'Cá còn khoẻ, giữ thêm chút nữa.' };
    const { fish, weight } = rod.catch;
    const grade = fightGrade(rod.fight);
    const date = localDate(Date.now(), this.config.timezone);
    const owned = this.db.fishCollection(player.pid);
    const before = owned.find((row) => row.fish_id === fish.id);
    const isNew = !before;
    const species = owned.length + (isNew ? 1 : 0);
    // Mốc Sổ cá chỉ tính đúng lúc loài mới làm đủ số, nên mỗi mốc được thưởng đúng một lần.
    const milestone = isNew ? FISH_BOOK_MILESTONES.find((m) => m.count === species) ?? null : null;
    const record = Boolean(before) && weight > before.best_weight;
    this.db.fishCatch(player.pid, fish.id, weight, grade, date, Date.now());
    // Đơn hàng: thưởng đơn cộng chung vào TEU con cá này, ghi riêng lí do để còn tra.
    const { orderDone, orders } = this.supplies.recordCatch(player.pid, date, fish.id, weight);
    const teu = (TEU.fishByRarity[fish.rarity] ?? 1) + (grade === 'perfect' ? TEU.fishPerfectBonus : 0) + (milestone?.teu ?? 0);
    this.db.addTeu(player.pid, teu, 'fish', date);
    if (orderDone) this.db.addTeu(player.pid, orderDone.teu, 'fish-order', date);
    // Báo trước khi dọn để mọi máy còn thấy nước văng đúng chỗ phao.
    this.io.emit('fish:caught', { sid: player.sid, id: fish.id, name: fish.name, rarity: fish.rarity, weight });
    this.clear(player, true);
    return { ok: true, grade, fish: { id: fish.id, name: fish.name, rarity: fish.rarity, weight }, teu: teu + (orderDone?.teu ?? 0), isNew, record, species, milestone, orderDone, orders };
  }

  /** Về bờ hẳn. Người đang cầm cần chờ quăng tiếp không có rod nên phải xét cả tư thế. */
  cancel(player) {
    if (player.rod || player.activity === ACTIVITY.fish) this.clear(player);
    return { ok: true };
  }

  /** Dọn phao. stillFishing: hết lượt nhưng còn đứng câu, mọi người vẫn thấy cần trên tay và tư thế. */
  clear(player, stillFishing = false) {
    player.rod = null;
    this.io.emit('fish:rodoff', { sid: player.sid, idle: stillFishing });
    if (!stillFishing && player.activity === ACTIVITY.fish) {
      player.activity = ACTIVITY.none;
      player.dirty = true;
    }
  }

  /** Quét theo tick của Room (500ms một lần): cá cắn, cá tuột, người bỏ đi quá xa. */
  sweep(players) {
    const now = Date.now();
    for (const [id, until] of this.takenShadows) if (now > until) this.takenShadows.delete(id);
    for (const player of players.values()) {
      const rod = player.rod;
      if (!rod) continue;
      if (!this.nearSpot(player)) { this.clear(player); continue; }
      if (rod.state === 'waiting' && now >= rod.biteAt) this.bite(player, rod);
      else if (rod.state === 'fighting') this.settle(player, rod, now);
      else if (rod.state === 'ready' && now > rod.readyUntil) {
        this.clear(player, true);
        player.socket?.emit('fish:escaped', { reason: 'slack' });
      }
    }
  }

  /** Snapshot cho người vừa vào: ai đang buông cần ở đâu. */
  snapshot(players) {
    const out = [];
    for (const player of players.values()) {
      if (player.rod) out.push({ sid: player.sid, bx: player.rod.bx, bz: player.rod.bz, castAt: player.rod.castAt });
    }
    return out;
  }
}
