// Chuỗi phím và cửa sổ chấm nhịp dùng chung; server tự chấm theo giờ nhận gói.
// Kiểu WWM (Graceful Melody): nốt rơi về vạch theo từng phím, bấm sai mất nốt đó — chống spam.
export const RHYTHM = { bpm: 96, beatMs: 625, barMs: 2500, perfectMs: 110, goodMs: 240, lateMs: 360 };
export const ARROWS = ['←', '↑', '↓', '→'];
export const RHYTHM_ROUNDS = { bell: 16, meditate: 24 };

export function rhythmPattern(at, round, kind) {
  let seed = ((at / RHYTHM.barMs) ^ (round * 2654435761) ^ (kind === 'bell' ? 19 : 71)) >>> 0;
  // 3 nốt cho rounds đầu, 4 nốt từ round 6: nốt nằm trên beat 0..3 của ô nhịp.
  return Array.from({ length: 3 + (round >= 6 ? 1 : 0) }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed >>> 30;
  });
}

/** Thời điểm nốt idx của round chạm vạch: nốt rải trên beat 0, 1, 2… trong ô nhịp. */
export function noteTargetAt(at, round, idx) {
  return at + round * RHYTHM.barMs + idx * RHYTHM.beatMs;
}

export function rhythmGrade(delta, correct) {
  if (!correct) return 'miss';
  const error = Math.abs(delta);
  return error <= RHYTHM.perfectMs ? 'perfect' : error <= RHYTHM.goodMs ? 'good' : 'miss';
}

/** Gộp mảng grade từng nốt (phẳng) thành điểm/combo. */
export function rhythmSummary(results) {
  let combo = 0;
  let maxCombo = 0;
  let perfect = 0;
  let good = 0;
  for (const grade of results) {
    if (grade === 'perfect') perfect++;
    if (grade === 'good') good++;
    combo = grade === 'perfect' || grade === 'good' ? combo + 1 : 0;
    maxCombo = Math.max(maxCombo, combo);
  }
  const points = perfect * 100 + good * 60;
  return { points, score: results.length ? Math.round(points / results.length) : 0, perfect, good, miss: results.length - perfect - good, combo, maxCombo };
}

/** Grade gộp của một round: một nốt trượt làm cả chuỗi không còn "perfect". */
export function roundGrade(noteGrades) {
  if (!noteGrades.length) return null;
  if (noteGrades.some((g) => g === 'miss' || g == null)) return 'miss';
  return noteGrades.some((g) => g === 'good') ? 'good' : 'perfect';
}
