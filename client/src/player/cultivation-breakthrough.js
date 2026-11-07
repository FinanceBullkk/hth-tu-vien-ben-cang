// Snapshot hydration never starts this clock; only a live, upward tier event does.
export function breakthroughFrame(age, tier, reduced = false) {
  const active = Number.isFinite(age) && age >= 0 && age < 8 && tier > 0;
  if (!active) return { active: false, gather: 0, compress: 0, release: 0, reveal: 1, wave: 0 };
  const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  if (reduced) return { active, gather: 0, compress: 0, release: 0, reveal: smooth(age / 2), wave: 0 };
  const gather = smooth(age / 2) * (1 - smooth((age - 4) / 1.5));
  const compress = smooth((age - 2) / 2) * (1 - smooth((age - 4) / .7));
  const release = age < 4 ? 0 : Math.sin(Math.PI * Math.min(1, (age - 4) / 1.5));
  return { active, gather, compress, release, reveal: smooth((age - 4) / 2), wave: smooth((age - 4) / 1.5) };
}
