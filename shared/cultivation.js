export const CULTIVATION_TIERS = [
  { name: 'Khởi khí', points: 0 },
  { name: 'Tụ linh', points: 300 },
  { name: 'Kết đan', points: 1000 },
  { name: 'Hóa cảnh', points: 2500 },
];

export function cultivationProgress(value = 0) {
  const points = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const tier = CULTIVATION_TIERS.findLastIndex((entry) => points >= entry.points);
  return { points, tier, name: CULTIVATION_TIERS[tier].name, next: CULTIVATION_TIERS[tier + 1]?.points ?? null };
}
