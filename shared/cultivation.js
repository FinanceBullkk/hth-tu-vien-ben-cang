export const QI_INTERVAL_MS = 6000;
export const CULTIVATION_TIERS = [
  { name: 'Tụ khí', qi: 0, color: '#b9dfce' },
  { name: 'Dẫn khí', qi: 50, color: '#83d9ce' },
  { name: 'Ngưng khí', qi: 150, color: '#a8cfee' },
  { name: 'Hóa khí', qi: 350, color: '#e9cd88' },
  { name: 'Viên mãn', qi: 750, color: '#ffe4a3' },
];

export function cultivation(qi = 0) {
  qi = Number.isFinite(qi) ? Math.max(0, Math.floor(qi)) : 0;
  const index = CULTIVATION_TIERS.findLastIndex((tier) => qi >= tier.qi);
  const tier = CULTIVATION_TIERS[index];
  const next = CULTIVATION_TIERS[index + 1];
  return {
    ...tier, qi, level: index + 1, next: next?.qi ?? null,
    progress: next ? (qi - tier.qi) / (next.qi - tier.qi) : 1,
    // ponytail: aura stops growing at 1.65x; add visual tiers instead of unbounded size.
    scale: 0.7 + 0.95 * (1 - Math.exp(-qi / 500)),
  };
}
