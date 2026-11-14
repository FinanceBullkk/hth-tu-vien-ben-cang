// Câu cá ở hồ trong sân, dùng chung client + server: danh mục cá, mồi, roll loài và mô phỏng pha giằng co.
// Cùng một hàm mô phỏng: client vẽ cho mượt, server tính thật và quyết định đầy hay tuột.
import { BAITS, DEFAULT_BAIT, FISH } from './fish-catalog.js';
import { THINH, rodOf } from './fish-gear.js';
import { LAKE, lakeDistance } from './layout.js';

export const FISH_BITE = {
  minMs: 3000,
  maxMs: 9000,
  wigglePullMs: 400, // mỗi lần lắc đẩy giờ cá cắn sớm đi tương ứng
  wiggleMaxPullMs: 2500,
};

export const FISH_FIGHT = {
  graceMs: 900, // cá vừa cắn: chờ một nhịp để người chơi kịp nhìn lên vòng cung
  maxMs: 45000,
  readyMs: 8000, // client tự kéo cá ngay khi đầy; chừng này chỉ để dọn lượt khi người chơi đã mất mạng
  assistSpecies: 3, // chưa bắt đủ chừng này loài thì vẫn là người mới, được chế độ dễ
  stepMs: 50,
  startProgress: 0.25,
  serverSlack: 0.03, // bù trễ mạng: gói lên server chậm hơn lúc người chơi nhìn thấy vùng xanh
  perfectRatio: 0.8, // tỉ lệ thời gian nằm trong vùng để tính "câu đẹp"
  byRarity: {
    1: { half: 0.2, speed: 0.7, gain: 0.15, drain: 0.06 },
    2: { half: 0.14, speed: 0.95, gain: 0.115, drain: 0.08 },
    3: { half: 0.095, speed: 1.25, gain: 0.085, drain: 0.1 },
    4: { half: 0.08, speed: 1.4, gain: 0.075, drain: 0.11 },
    5: { half: 0.068, speed: 1.55, gain: 0.068, drain: 0.12 },
  },
};

export { BAITS, DEFAULT_BAIT, FISH, FISH_RARITY, MAX_RARITY } from './fish-catalog.js';

const RARITY_WEIGHT = { 1: 58, 2: 32, 3: 10, 4: 3, 5: 1.2 };
const WRONG_BAIT_FACTOR = 0.12;
const JUNK_FACTOR = 0.25; // đồ thất lạc mồi nào cũng vướng nên phải hiếm hơn cá, kẻo người mới toàn kéo lên dép
// Quăng trúng bóng nào thì loài cắn nghiêng theo cỡ bóng đó; thả vào chỗ trống vẫn có cá, nhưng hiếm khi quý.
// Cá sử thi, huyền thoại gần như chỉ rình bóng lớn.
const SHADOW_BIAS = {
  none: { 1: 1.3, 2: 0.6, 3: 0.2, 4: 0.08, 5: 0.03 },
  s: { 1: 1.3, 2: 0.8, 3: 0.3, 4: 0.12, 5: 0.04 },
  m: { 1: 0.7, 2: 1.8, 3: 1, 4: 0.6, 5: 0.25 },
  l: { 1: 0.2, 2: 1.2, 3: 5, 4: 3, 5: 2.5 },
};
export const SHADOW_WAIT = { none: 1, s: 0.75, m: 0.7, l: 0.6 }; // có bóng thì cá cắn sớm hơn
export const CAST_MAX_REACH = 12; // quăng xa nhất từ chỗ đứng, đủ tới phần lớn mặt hồ

// Mốc Sổ cá: bắt đủ số loài thì được thưởng thêm một lần.
export const FISH_BOOK_MILESTONES = [{ count: 5, teu: 5 }, { count: 10, teu: 10 }, { count: FISH.length, teu: 25 }];

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Tên các loài hay cắn một loại mồi, để gợi ý ngay trên HUD. */
export const fishForBait = (baitId) => FISH.filter((f) => f.bait === baitId).map((f) => f.name);

/** Đoạn cá này cắn khi nào, mồi gì, cho Sổ cá gợi ý loài chưa bắt được. */
export function fishHint(fish) {
  const bait = BAITS.find((b) => b.id === fish.bait);
  const parts = [bait ? bait.name : 'Mồi nào cũng vướng'];
  if (fish.time === 'night') parts.push('chỉ cắn ban đêm');
  if (fish.time === 'dusk') parts.push('chỉ cắn lúc hoàng hôn');
  if (fish.rarity === 5) parts.push('rình bóng lớn, cần trúc đen trở lên');
  else if (fish.rarity >= 3) parts.push('rình bóng lớn');
  else if (fish.rarity === 2) parts.push('rình bóng vừa');
  return parts.join(' · ');
}

/** Đêm hay hoàng hôn theo cùng vòng ngày đêm của bầu trời (xem scene/sky.js). */
export function isLakeNight(now, cycleMs) {
  const t = (now % cycleMs) / cycleMs;
  return t >= 0.3 && t < 0.9;
}

/**
 * Chỗ phao rơi khi người chơi chạm vào điểm (tx, tz). Chạm đâu cũng được và luôn ra một điểm trên mặt nước:
 * chạm trúng nước thì rơi đúng đó, quá tầm hoặc trúng bờ thì lấy điểm nước gần nhất trên cùng hướng.
 * Không có điểm chạm (bấm phím) thì thả ra phía tâm hồ.
 */
export function castSpot(x, z, tx, tz) {
  const spotAt = (ux, uz, t) => ({ bx: Math.round((x + ux * t) * 100) / 100, bz: Math.round((z + uz * t) * 100) / 100 });
  const hasTarget = Number.isFinite(tx) && Number.isFinite(tz) && Math.hypot(tx - x, tz - z) > 0.01;
  const toLake = Math.hypot(LAKE.x - x, LAKE.z - z) || 1;
  if (hasTarget) {
    const len = Math.hypot(tx - x, tz - z);
    const ux = (tx - x) / len;
    const uz = (tz - z) / len;
    const inside = (t) => lakeDistance(x + ux * t, z + uz * t) < -0.25;
    const wanted = Math.min(len, CAST_MAX_REACH);
    // Lùi dần về phía người chơi trước, không có nước thì tiến ra xa hơn (chạm vào bờ ngay trước mặt).
    for (let t = wanted; t > 0; t -= 0.1) if (inside(t)) return spotAt(ux, uz, t);
    for (let t = wanted; t <= CAST_MAX_REACH; t += 0.1) if (inside(t)) return spotAt(ux, uz, t);
  }
  const ux = (LAKE.x - x) / toLake;
  const uz = (LAKE.z - z) / toLake;
  return spotAt(ux, uz, Math.min(toLake, 5.5));
}

/**
 * Roll loài + cân nặng deterministic. Mồi đúng, bóng to, đúng giờ, có rắc thính và cần xịn làm tăng tỉ lệ cá quý.
 * rod: bậc cần câu; luck của cần nhân thêm vào từng phẩm chất, luck 0 là cần đó không kéo nổi loài ấy.
 */
export function fishRoll(castAt, salt = 0, { bait = DEFAULT_BAIT, shadow = null, night = false, thinh = false, rod = 0 } = {}) {
  const shadowBias = SHADOW_BIAS[shadow ?? 'none'];
  const luck = rodOf(rod).luck ?? {};
  const bias = (r) => shadowBias[r] * (thinh ? THINH.rareBias[r] : 1) * (luck[r] ?? 1);
  const period = night ? 'night' : 'dusk';
  const rand = lcg((Math.imul(castAt, 2246822519) ^ Math.imul(salt + 1, 3266489917)) >>> 0);
  const weightOf = (f) => (f.time && f.time !== period ? 0 : RARITY_WEIGHT[f.rarity])
    * (f.bait === null ? JUNK_FACTOR : f.bait !== bait ? WRONG_BAIT_FACTOR : 1)
    * bias(f.rarity);
  const total = FISH.reduce((sum, f) => sum + weightOf(f), 0);
  let pick = rand() * total;
  let fish = FISH[0];
  for (const f of FISH) {
    const w = weightOf(f);
    if (w <= 0) continue;
    fish = f;
    pick -= w;
    if (pick <= 0) break;
  }
  // Bóng lớn thì con cá cũng thuộc nửa nặng của loài.
  const heft = shadow === 'l' ? 0.5 + rand() * 0.5 : rand();
  const weight = fish.minW === fish.maxW ? fish.minW : Math.round((fish.minW + heft * (fish.maxW - fish.minW)) * 100) / 100;
  return { fish, weight };
}

export const fightSeed = (castAt, salt = 0) => (Math.imul(castAt, 2654435761) ^ Math.imul(salt + 1, 40503)) >>> 0;

/**
 * Thông số giằng co của một con cá. assist là chế độ cho người mới: vùng xanh rộng hơn, chạy chậm hơn,
 * đầy nhanh và tụt rất chậm, để những con cá đầu tiên gần như chắc chắn về tay.
 * rod: bậc cần câu (shared/fish-gear.js), cần xịn thì vùng xanh rộng hơn và tụt chậm hơn.
 */
export function fightTune(rarity, assist = false, rod = 0) {
  const base = FISH_FIGHT.byRarity[rarity];
  const gear = rodOf(rod);
  const tune = assist
    ? { half: base.half * 1.35, speed: base.speed * 0.75, gain: base.gain * 1.3, drain: base.drain * 0.35 }
    : { ...base };
  tune.half = Math.min(0.32, tune.half * gear.half);
  tune.drain *= gear.drain;
  return tune;
}

/** Tâm vùng xanh 0..1 theo thời gian: hai lớp sóng chậm, hạt giống riêng cho từng con cá. */
export function fightGreen(elapsedMs, seed, rarity, assist = false, rod = 0) {
  const { half, speed } = fightTune(rarity, assist, rod);
  const t = (Math.max(0, elapsedMs) / 1000) * speed;
  const p1 = (seed % 6283) / 1000;
  const p2 = ((seed >>> 9) % 6283) / 1000;
  const wave = 0.6 * Math.sin((2 * Math.PI * t) / 5.2 + p1) + 0.4 * Math.sin((2 * Math.PI * t) / 2.9 + p2);
  return half + ((wave + 1) / 2) * (1 - 2 * half);
}

export function fightNew({ seed, rarity, startAt, assist = false, rod = 0 }) {
  return { seed, rarity, assist, rod, startAt, at: startAt, progress: FISH_FIGHT.startProgress, inMs: 0, totalMs: 0 };
}

/** Tích phân tiến độ tới nowMs với kim đứng ở needle; dừng ngay khi đầy hoặc cạn. */
export function fightAdvance(fight, needle, nowMs, slack = 0) {
  const { half, gain, drain } = fightTune(fight.rarity, fight.assist, fight.rod);
  const { stepMs } = FISH_FIGHT;
  while (fight.at + stepMs <= nowMs && fight.progress > 0 && fight.progress < 1) {
    fight.at += stepMs;
    const center = fightGreen(fight.at - fight.startAt, fight.seed, fight.rarity, fight.assist, fight.rod);
    const inZone = Math.abs(needle - center) <= half + slack;
    fight.progress = clamp01(fight.progress + ((inZone ? gain : -drain) * stepMs) / 1000);
    fight.totalMs += stepMs;
    if (inZone) fight.inMs += stepMs;
  }
  return fight;
}

export const fightGrade = (fight) => (fight.totalMs > 0 && fight.inMs / fight.totalMs >= FISH_FIGHT.perfectRatio ? 'perfect' : 'good');
