// Đơn hàng cá mỗi ngày của bếp chùa: ba đơn chung cho cả tu viện, đổi theo ngày, tính thuần từ chuỗi ngày
// nên client và server ra cùng một danh sách mà không cần lưu. Server chỉ lưu tiến độ từng người.
// Mục đích: kéo người chơi đổi mồi, nhắm bóng, săn cá nặng, thay vì đứng một chỗ câu mãi một loài.
import { FISH } from './fish.js';

export const FISH_ORDER_COUNT = 3;
const REAL_FISH = FISH.filter((f) => f.bait !== null); // đồ thất lạc không ai đặt
const ALL_DAY = REAL_FISH.filter((f) => !f.time); // cá chỉ cắn ban đêm, hoàng hôn khó gom trong giờ nghỉ

function hashDate(date, salt) {
  let h = 2166136261 ^ salt;
  for (const ch of String(date)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

const pick = (list, date, salt) => list[Math.floor(hashDate(date, salt) * list.length)];
const round1 = (v) => Math.round(v * 10) / 10;

/**
 * Ba đơn của ngày date (YYYY-MM-DD): gom nhiều con cá thường, một con cá quý, một con nặng ký.
 * Mỗi đơn: { slot, fishId, need, minWeight, teu }. minWeight 0 là con nào cũng được.
 */
export function dailyOrders(date) {
  const common = pick(ALL_DAY.filter((f) => f.rarity === 1), date, 1);
  const fine = pick(ALL_DAY.filter((f) => f.rarity === 2), date, 2);
  // Đơn nặng ký chọn loài khác hai đơn kia, để một con cá không ăn trọn hai đơn.
  const heavyPool = ALL_DAY.filter((f) => f.rarity <= 2 && f !== common && f !== fine);
  const heavy = pick(heavyPool, date, 3);
  return [
    { slot: 0, fishId: common.id, need: 3, minWeight: 0, teu: 4 },
    { slot: 1, fishId: fine.id, need: 1, minWeight: 0, teu: 6 },
    { slot: 2, fishId: heavy.id, need: 1, minWeight: round1(heavy.minW + (heavy.maxW - heavy.minW) * 0.7), teu: 8 },
  ];
}

/** Con cá vừa bắt có tính cho đơn này không. */
export const orderMatches = (order, fishId, weight) => order.fishId === fishId && weight >= order.minWeight;
