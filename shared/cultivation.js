// Hai thước tu luyện: công pháp (điểm Nhịp sen) và chân khí (thời gian ngồi thiền).
export const QI_INTERVAL_MS = 6000;

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

export const QI_TIERS = [
  { name: 'Tụ khí', qi: 0, color: '#b9dfce' },
  { name: 'Dẫn khí', qi: 50, color: '#83d9ce' },
  { name: 'Ngưng khí', qi: 150, color: '#a8cfee' },
  { name: 'Hóa khí', qi: 350, color: '#e9cd88' },
  { name: 'Viên mãn', qi: 750, color: '#ffe4a3' },
];

export function cultivation(qi = 0) {
  qi = Number.isFinite(qi) ? Math.max(0, Math.floor(qi)) : 0;
  const index = QI_TIERS.findLastIndex((tier) => qi >= tier.qi);
  const tier = QI_TIERS[index];
  const next = QI_TIERS[index + 1];
  return {
    ...tier, qi, level: index + 1, next: next?.qi ?? null,
    progress: next ? (qi - tier.qi) / (next.qi - tier.qi) : 1,
    scale: 0.7 + 0.95 * (1 - Math.exp(-qi / 500)),
  };
}
