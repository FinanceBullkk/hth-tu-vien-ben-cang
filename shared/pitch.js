// Luật đầu hồ dùng chung client + server: đấu theo lượt với đối thủ, giữ tâm trong vòng đang trôi cho đầy rồi ném.
// Mọi vị trí tính được từ seed + đồng hồ server, nên client chỉ gửi vị trí chuột/phím, server tự chấm.
export const PITCH = {
  matchMs: 120_000,
  leadToWin: 50,
  scoreToWin: 250,
  aimMs: 10_000, // Hết "thời gian ngắm" mà chưa ném thì tính trượt.
  firstAimDelayMs: 1800,
  turnGapMs: 3600, // Mũi tên bay, đối thủ ném, rồi mới tới lượt ngắm kế.
  npcThrowDelayMs: 1500,
  flightMs: 900,
  aspect: 16 / 9, // Sân ngắm 16:9; x, y đều trong [-1, 1], bán kính vòng tính theo nửa chiều cao.
  hitFill: 0.85, // Server chấp nhận sớm hơn một chút để bù độ trễ mạng.
  serverSlack: 1.15,
  fillDecay: 1.8, // Lệch khỏi vòng thì tụt hết trong fillDecay lần thời gian làm đầy, để lỡ tay không mất trắng.
  maxLagMs: 300, // Server chấm theo giờ client gửi mẫu, nhưng chỉ tin lùi tối đa ngần này.
  maxSampleGapMs: 300,
  sampleMs: 100,
  comboPoints: [10, 15, 15, 20, 25, 30, 35, 45, 50], // Điểm cho combo 1, 2, 3...; từ combo 9 giữ mức 50.
  opponents: [
    { name: 'Chú tiểu Mõ', blurb: 'Mới học ném, hay trượt.', hitChance: 0.55, radius: 0.2, fillMs: 1300, drift: 0.16, wobble: 0.025, dualChance: 0.3, rank: 'B' },
    { name: 'Sư huynh Thẻ', blurb: 'Tay chắc, ném đều.', hitChance: 0.72, radius: 0.165, fillMs: 1500, drift: 0.24, wobble: 0.04, dualChance: 0.5, rank: 'A' },
    { name: 'Lão tăng Mười Năm', blurb: 'Mười năm chưa gặp đối thủ.', hitChance: 0.8, radius: 0.125, dualRadius: 0.165, fillMs: 1400, drift: 0.34, wobble: 0.055, dualChance: 0.5, rank: 'S' },
  ],
};

const DRIFT_PERIOD_MS = 5500;
const TAU = Math.PI * 2;

/** Số giả ngẫu nhiên [0, 1) cố định theo seed + n, để client và server ra cùng một lượt. */
function mix(seed, n) {
  let t = (Math.imul(seed | 0, 31) + Math.imul(n + 1, 0x6d2b79f5)) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const clampAim = (v) => Math.min(1, Math.max(-1, Number(v) || 0));
export const pitchTier = (v) => (Number.isInteger(v) && PITCH.opponents[v] ? v : 0);

/** Bán kính vòng của lượt: đối thủ có dualRadius thì lượt hai tâm dùng vòng rộng hơn, vì phải chia mắt cho hai tay. */
export function pitchRadius(tier, stage) {
  const opp = PITCH.opponents[tier];
  return stage.dual ? opp.dualRadius ?? opp.radius : opp.radius;
}

/** Điểm của cú trúng khi combo (đã tính cú này) bằng combo. */
export function pitchPoints(combo) {
  const table = PITCH.comboPoints;
  return table[Math.min(combo, table.length) - 1];
}

/** Bên thắng ngay: dẫn đủ điểm hoặc chạm mốc trước. Trả về 'me', 'npc' hoặc null. */
export function pitchWinner(me, npc) {
  if (me >= PITCH.scoreToWin || me - npc >= PITCH.leadToWin) return 'me';
  if (npc >= PITCH.scoreToWin || npc - me >= PITCH.leadToWin) return 'npc';
  return null;
}

/** Hình của lượt: ba lượt đầu dạy dần (một tâm, hai tâm gần, hai tâm xa), sau đó bốc theo độ khó. */
export function pitchStage(seed, turn, tier) {
  const r = (k) => mix(seed, turn * 8 + k);
  let kind = 'single';
  if (turn === 1) kind = 'near';
  else if (turn === 2) kind = 'far';
  else if (turn > 2 && r(0) < PITCH.opponents[tier].dualChance) kind = r(1) < 0.5 ? 'near' : 'far';

  const side = r(2) < 0.5 ? -1 : 1;
  const a = { x: side * (0.15 + r(3) * 0.45), y: -0.45 + r(4) * 0.95 };
  const stage = { dual: kind !== 'single', a, b: null, phaseA: r(5) * TAU, phaseB: r(6) * TAU };
  if (stage.dual) {
    const gap = kind === 'near' ? 0.42 + r(7) * 0.1 : 0.85 + r(7) * 0.25;
    stage.b = { x: Math.max(-0.75, Math.min(0.75, a.x - side * gap)), y: kind === 'near' ? Math.max(-0.45, a.y - 0.25) : -a.y * 0.8 };
  }
  return stage;
}

function driftPoint(anchor, phase, amp, elapsedMs) {
  const w = (elapsedMs / DRIFT_PERIOD_MS) * TAU;
  return {
    x: anchor.x + (amp / PITCH.aspect) * Math.sin(w + phase),
    y: anchor.y + amp * Math.sin(w * 0.73 + phase * 1.7),
  };
}

/** Tâm ngắm "say": vị trí tay người chơi cộng độ lắc chung cho cả client lẫn server. */
function wobbled(x, y, nowMs, seed, amp, phase) {
  const p = (seed % 6283) / 1000 + phase;
  const t = nowMs / 1000;
  return {
    x: x + (amp / PITCH.aspect) * (0.62 * Math.sin((TAU * t) / 1.9 + p) + 0.38 * Math.sin((TAU * t) / 3.1 + p * 1.3)),
    y: y + amp * (0.62 * Math.cos((TAU * t) / 2.3 + p * 1.1) + 0.38 * Math.sin((TAU * t) / 3.4 + p * 0.7)),
  };
}

const within = (c, t, radius) => Math.hypot((c.x - t.x) * PITCH.aspect, c.y - t.y) <= radius;

/** Toàn bộ trạng thái ngắm tại một thời điểm. slack > 1 nới vòng để bù độ trễ mạng (chỉ server dùng). */
export function pitchAimState({ seed, tier, stage, aimAt, aim, now, slack = 1 }) {
  const opp = PITCH.opponents[tier];
  const elapsed = Math.max(0, now - aimAt);
  const radius = pitchRadius(tier, stage) * slack;
  const targetA = driftPoint(stage.a, stage.phaseA, opp.drift, elapsed);
  const cursorA = wobbled(aim.x, aim.y, now, seed, opp.wobble, 0);
  const insideA = within(cursorA, targetA, radius);
  if (!stage.dual) return { targetA, cursorA, insideA, targetB: null, cursorB: null, insideB: true, inside: insideA };
  const targetB = driftPoint(stage.b, stage.phaseB, opp.drift, elapsed);
  const cursorB = wobbled(aim.bx, aim.by, now, seed, opp.wobble, 2.4);
  const insideB = within(cursorB, targetB, radius);
  return { targetA, cursorA, insideA, targetB, cursorB, insideB, inside: insideA && insideB };
}

/** Vòng đầy dần khi mọi tâm nằm trong vòng, tụt chậm hơn khi lệch ra ngoài. */
export function pitchFillStep(fill, inside, dtMs, tier) {
  const { fillMs } = PITCH.opponents[tier];
  return inside ? Math.min(1, fill + dtMs / fillMs) : Math.max(0, fill - dtMs / (fillMs * PITCH.fillDecay));
}
