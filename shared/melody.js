import { MASTER_AN_NOTES } from './melody-chart.js';

export const MELODY = {
  title: 'Melancholy of Master An',
  subtitle: 'An công tử · Độc tấu đàn nhị',
  audio: '/music/melancholy-master-an.m4a',
  durationMs: 115000,
  leadMs: 3000,
  approachMs: 1800,
  perfectMs: 110,
  greatMs: 175,
  goodMs: 240,
  lateMs: 360,
  releaseMs: 90,
  maxLagMs: 150,
  keys: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'],
  labels: ['S', 'D', 'F', 'J', 'K', 'L'],
};
export const MELODY_NOTES = MASTER_AN_NOTES.map(([at, lane, duration = 0]) => ({ at, lane, duration }));
export const MELODY_POINTS = { perfect: 100, great: 80, good: 60, miss: 0 };

// These forgiving windows belong to this arrangement, not the original game's scoring rules.
export function melodyGrade(delta, correct = true) {
  const error = Math.abs(delta);
  if (!correct || !Number.isFinite(error)) return 'miss';
  return error <= MELODY.perfectMs ? 'perfect' : error <= MELODY.greatMs ? 'great' : error <= MELODY.goodMs ? 'good' : 'miss';
}

export function melodySummary(results) {
  const summary = { points: 0, score: 0, perfect: 0, great: 0, good: 0, miss: 0, combo: 0, maxCombo: 0 };
  const judged = results.filter((grade) => Object.hasOwn(MELODY_POINTS, grade));
  for (const grade of judged) {
    summary[grade]++;
    summary.points += MELODY_POINTS[grade];
    summary.combo = grade === 'miss' ? 0 : summary.combo + 1;
    summary.maxCombo = Math.max(summary.maxCombo, summary.combo);
  }
  summary.score = judged.length ? Math.round(summary.points / judged.length) : 0;
  return summary;
}

// Empty presses never consume a note from another lane.
export function melodyCandidate(elapsed, lane, results) {
  const due = MELODY_NOTES.map((n, i) => ({ ...n, i }))
    .filter((n) => n.lane === lane && results[n.i] == null && Math.abs(n.at - elapsed) <= MELODY.goodMs)
    .sort((a, b) => Math.abs(a.at - elapsed) - Math.abs(b.at - elapsed));
  return due[0]?.i ?? -1;
}
