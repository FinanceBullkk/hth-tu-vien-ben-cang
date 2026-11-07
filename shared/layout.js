// Bố cục sân tu viện dùng chung client + server: ranh giới, vật cản, điểm hoạt động.
// Quy ước: mặt đất là mặt phẳng XZ, đơn vị mét. Hướng rot: (sin rot, cos rot).

export const BOUNDS = { minX: -29.5, maxX: 29.4, minZ: -29.5, maxZ: 40 };
export const LANDING = { minX: -4.2, maxX: 4.2, minZ: 30, maxZ: 40 };
export const SPAWN = { x: 0, z: 36.5, rot: Math.PI };
export const PLAYER_RADIUS = 0.4;

export const BELL = { x: -18, z: -1, radius: 3.6, yardRadius: 12 };
export const HALL = { x: 0, z: -20, halfW: 8, halfD: 6, doorHalf: 2.2, height: 4.6 };
// radius: vùng tương tác treo lời ước, nới đúng tới rìa dải lụa trên cành.
export const TREE = { x: -18, z: 11, radius: 5.4 };
// 8 cành tỏa ngang để treo dải lụa: dùng chung cho scene (monastery) và vị trí ribbon (wishes3d)
// để lời ước bám đúng cành thay vì lơ lửng. Cành nghiêng nhẹ lên về phía ngọn (0.1206/m ngang).
export const TREE_BRANCHES = Array.from({ length: 8 }, (_, i) => ({
  a: (i / 8) * Math.PI * 2,
  len: 4.3 + (i % 4) * 0.42,
  y: 4.9 + (i % 3) * 0.14,
}));
export const POND = { x: -19, z: -17, radius: 5.5, actionRadius: 7.6 };
export const CONTAINERS = { minX: 26.6, maxX: 29.2, minZ: 0, maxZ: 12, actionMargin: 2.4 };
export const TEA = { x: -18, z: 23, radius: 3.4 };
export const GARDEN = { minX: 12, maxX: 25, minZ: -12, maxZ: -6 };
// Asset võ hiệp dựng bằng Blender (tools/blender/): bảo tháp, cầu vòm, cờ băng, đèn đá, non bộ.
export const PAGODA = { x: 18, z: -21, radius: 3.9, roofY: 12.5 };
export const BRIDGE = { x1: POND.x - 5.6, x2: POND.x + 5.6, z: POND.z, halfW: 0.95, peak: 1.15 };
export const BANNERS = [
  { x: -5.6, z: 22, ry: 0 }, { x: 5.6, z: 22, ry: Math.PI },
];
// Quanh hồ sen (né dải cầu), hai bên bậc tháp, mép vườn thiền.
export const STONE_LANTERNS = [
  { x: POND.x - 4.9, z: POND.z + 4.9, ry: Math.PI * 0.25 },
  { x: POND.x + 4.9, z: POND.z - 4.9, ry: Math.PI * 1.25 },
  { x: PAGODA.x - 2.8, z: PAGODA.z + 5, ry: 0 },
  { x: PAGODA.x + 2.8, z: PAGODA.z + 5, ry: 0 },
  { x: 9.6, z: 19, ry: 0.6 }, { x: 28.4, z: 20, ry: -0.6 },
];
export const NONBO = [
  { x: -26, z: -26, s: 0.75, ry: 0.6, r: 1.5 },
  { x: 26, z: -26, s: 0.75, ry: 2.2, r: 1.5 },
];
// Thầy trụ trì đứng ở hiên thiền đường, bên phải cửa, dưới một chiếc đèn lồng.
export const ABBOT = { x: 5.2, z: -12.4, rot: 0, radius: 0.35, actionRadius: 2.6 };
// Sư chú giữ cổng: đứng trong sân cạnh tam quan, đưa câu đố cho người vào.
export const GATE_MONK = { x: 3.2, z: 28.4, rot: 0, radius: 0.35, actionRadius: 2.6 };
// Hồ câu góc đông nam sân: ba vòng tròn ghép thành bờ cong tự nhiên, đi vòng quanh được.
// Cả ba vòng nằm trong CIRCLES nên va chạm dùng chung cơ chế sẵn có. Tâm (x, z) nằm trong vòng giữa.
export const LAKE = {
  x: 19,
  z: 22.8,
  y: 0.07,
  shoreWidth: 1.6, // cách mép nước chừng này thì câu được
  lobes: [{ x: 13.6, z: 23.2, r: 4.3 }, { x: 19, z: 22.6, r: 5.4 }, { x: 24, z: 23.4, r: 4 }],
  sign: { x: 23, z: 17, r: 0.14 },
};
// Sân đầu hồ cạnh bãi container: người chơi đứng ở seat, quay về phía tây nhìn hai bình (trái của mình, phải của đối thủ).
export const PITCH_ZONE = {
  x: 25,
  z: 3,
  radius: 3.4,
  seat: { x: 23.3, z: 1.8, rot: -Math.PI / 2 },
  opponent: { x: 21.4, z: 0.3, rot: -Math.PI / 2 },
  jar: { x: 23.6, z: 4.9, r: 0.6 },
  pots: [{ x: 18.2, z: 3.7 }, { x: 18.2, z: 2.1 }],
  camera: { pos: { x: 26.2, y: 2.05, z: 2.9 }, look: { x: 18.2, y: 0.95, z: 2.9 } },
};

// Menu "Chơi gì?": mỗi trò một chỗ đứng hợp lệ, chọn là được đưa tới và bắt đầu luôn.
export const PLACES = [
  { key: 'fish', icon: '🎣', name: 'Câu cá', desc: 'Thả câu ở hồ, gom đủ các loài cá', x: 19, z: 16.7 },
  { key: 'bell', icon: '🔔', name: 'Thỉnh chuông', desc: 'Bấm theo nhịp để chuông ngân', x: BELL.x, z: BELL.z + 3.2 },
  { key: 'mat', icon: '🪷', name: 'Ngồi thiền', desc: 'Bấm theo nhịp cho sen nở', x: 0, z: -15.6 },
  { key: 'pitch', icon: '🏺', name: 'Đầu hồ', desc: 'Ném tên vào bình, đấu với sư trong chùa', x: 23.4, z: 3 },
  { key: 'riddle', icon: '📜', name: 'Câu đố của sư chú', desc: 'Đoán vui về nghề logistics', x: 3.2, z: 26.6 },
  { key: 'tea', icon: '🍵', name: 'Rút quẻ vận đơn', desc: 'Lắc ống quẻ xin lời chúc hôm nay', x: TEA.x, z: TEA.z - 2.4 },
  { key: 'tree', icon: '🌳', name: 'Treo lời ước', desc: 'Viết điều mong muốn lên cây bồ đề', x: TREE.x + 3, z: TREE.z },
];

export const MAT_COUNT = 12;
export const MAT_RADIUS = 3.4;
export const MATS = Array.from({ length: MAT_COUNT }, (_, i) => {
  const a = (i / MAT_COUNT) * Math.PI * 2;
  const x = HALL.x + Math.sin(a) * MAT_RADIUS;
  const z = HALL.z + Math.cos(a) * MAT_RADIUS;
  // Ngồi quay mặt vào tâm vòng tròn.
  return { x, z, rot: Math.atan2(HALL.x - x, HALL.z - z) };
});

export const LANTERN_POSTS = [
  ...[26, 14, 2, -8].flatMap((z) => [{ x: -4.2, z }, { x: 4.2, z }]),
  { x: -11.5, z: 20 }, { x: -11.5, z: -4 },
  { x: 11.5, z: 14 }, { x: 24.5, z: 14 },
];

export const COURT_TREES = [
  { x: -7.5, z: 26, s: 0.8 }, { x: 7.5, z: 26, s: 0.8 },
  { x: -7.5, z: 15, s: 0.85 }, { x: 7.5, z: 15, s: 0.85 },
  { x: -7.5, z: 3, s: 0.85 }, { x: 7.5, z: 3, s: 0.85 },
  { x: -27, z: 11, s: 1 }, { x: -27, z: -4, s: 0.9 },
  { x: -13, z: -27, s: 0.8 }, { x: 27, z: -14, s: 0.8 },
  { x: 26, z: 17.6, s: 0.85 },
];

export const GARDEN_ROCKS = [
  { x: 15, z: -9, r: 1.2 }, { x: 22, z: -9, r: 0.9 },
];

export const TEA_TABLES = [[0, 0], [-3.4, 2.6], [3.4, 2.6]]
  .map(([dx, dz]) => ({ x: TEA.x + dx, z: TEA.z + dz }));

// Lối chính 6 m, đường dạo 2.4 m; mặt đường cao tối đa 0.04 m như floorHeight.
export const COURT_PATHS = [
  { x: 0, z: 9, w: 6, d: 42 },
  { x: 0, z: 35, w: 4.6, d: 10 },
  { x: -10, z: 5.5, w: 2.4, d: 45 },
  { x: 10, z: 1, w: 2.4, d: 36 },
  { x: 0, z: 8, w: 49, d: 3 },
  { x: 0, z: -8, w: 22.4, d: 3 },
  { x: -14, z: 18, w: 8, d: 2.4 },
  { x: -14, z: BELL.z, w: 8, d: 2.4 },
  { x: -11.7, z: BRIDGE.z, w: 3.4, d: 1.4 },
  { x: 17, z: 16, w: 14, d: 2.4 },
  { x: 14, z: -14, w: 8, d: 2.4 },
  { x: PAGODA.x, z: -11.5, w: 2.4, d: 11 },
];

const WALL_T = 0.4;
const h = HALL;

/** Hộp va chạm. cam: true thì camera cũng không xuyên qua. */
export const BOXES = [
  // Tường rào nam, hai bên cổng
  { minX: -31, maxX: -4.6, minZ: 30 - WALL_T, maxZ: 30 + WALL_T, cam: true },
  { minX: 4.6, maxX: 31, minZ: 30 - WALL_T, maxZ: 30 + WALL_T, cam: true },
  // Thiền đường: tường bắc, đông, tây, hai mảng tường trước (chừa cửa)
  { minX: h.x - h.halfW, maxX: h.x + h.halfW, minZ: h.z - h.halfD - 0.25, maxZ: h.z - h.halfD + 0.25, cam: true },
  { minX: h.x - h.halfW - 0.25, maxX: h.x - h.halfW + 0.25, minZ: h.z - h.halfD, maxZ: h.z + h.halfD, cam: true },
  { minX: h.x + h.halfW - 0.25, maxX: h.x + h.halfW + 0.25, minZ: h.z - h.halfD, maxZ: h.z + h.halfD, cam: true },
  { minX: h.x - h.halfW, maxX: h.x - h.doorHalf, minZ: h.z + h.halfD - 0.25, maxZ: h.z + h.halfD + 0.25, cam: true },
  { minX: h.x + h.doorHalf, maxX: h.x + h.halfW, minZ: h.z + h.halfD - 0.25, maxZ: h.z + h.halfD + 0.25, cam: true },
  // Giữ một container làm bảng ước, mở lối đi ra bờ hồ phía nam.
  { minX: CONTAINERS.minX, maxX: 30, minZ: CONTAINERS.minZ, maxZ: CONTAINERS.maxZ },
  // Lan can cầu vòm qua hồ sen: giữ người chơi trên dải cầu.
  { minX: BRIDGE.x1, maxX: BRIDGE.x2, minZ: BRIDGE.z - 0.98, maxZ: BRIDGE.z - 0.72, cam: true },
  { minX: BRIDGE.x1, maxX: BRIDGE.x2, minZ: BRIDGE.z + 0.72, maxZ: BRIDGE.z + 0.98, cam: true },
];

/** Vật cản tròn: cột, cây, đá, hồ, bàn... */
export const CIRCLES = [
  // Cổng tam quan
  ...[-4.4, -1.8, 1.8, 4.4].map((x) => ({ x, z: 30, r: 0.3 })),
  // Gác chuông
  ...[[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]].map(([dx, dz]) => ({ x: BELL.x + dx, z: BELL.z + dz, r: 0.35 })),
  { x: BELL.x, z: BELL.z, r: 1.0 },
  // Hiên thiền đường
  ...[-7, -3.4, 3.4, 7].map((x) => ({ x, z: h.z + h.halfD + 1.8, r: 0.28 })),
  { x: ABBOT.x, z: ABBOT.z, r: ABBOT.radius },
  // Sư chú giữ cổng; chum lớn, đối thủ và hai bình ở sân đầu hồ
  { x: GATE_MONK.x, z: GATE_MONK.z, r: GATE_MONK.radius },
  { x: PITCH_ZONE.jar.x, z: PITCH_ZONE.jar.z, r: PITCH_ZONE.jar.r },
  { x: PITCH_ZONE.opponent.x, z: PITCH_ZONE.opponent.z, r: 0.35 },
  ...PITCH_ZONE.pots.map((p) => ({ x: p.x, z: p.z, r: 0.28 })),
  // Cây bồ đề, hồ sen (chừa dải cầu vòm đi ngang qua)
  { x: TREE.x, z: TREE.z, r: 1.4 },
  { x: POND.x, z: POND.z, r: POND.radius, gapZ: BRIDGE.z, gapHalf: 1.0 },
  // Hồ câu và bảng tên trên bờ
  ...LAKE.lobes,
  LAKE.sign,
  // Quán trà: cột + bàn
  ...[[-4.4, -3.2], [4.4, -3.2], [-4.4, 3.8], [4.4, 3.8]].map(([dx, dz]) => ({ x: TEA.x + dx, z: TEA.z + dz, r: 0.28 })),
  ...TEA_TABLES.map((t) => ({ x: t.x, z: t.z, r: 0.75 })),
  // Đá vườn thiền
  ...GARDEN_ROCKS.map((r) => ({ x: r.x, z: r.z, r: r.r })),
  // Cây trong sân, cột đèn lồng, tháp + cờ + đèn đá + non bộ
  ...COURT_TREES.map((t) => ({ x: t.x, z: t.z, r: 0.45 * t.s })),
  ...LANTERN_POSTS.map((p) => ({ x: p.x, z: p.z, r: 0.16 })),
  { x: PAGODA.x, z: PAGODA.z, r: PAGODA.radius },
  ...BANNERS.map((b) => ({ x: b.x, z: b.z, r: 0.16 })),
  ...STONE_LANTERNS.map((l) => ({ x: l.x, z: l.z, r: 0.35 })),
  ...NONBO.map((n) => ({ x: n.x, z: n.z, r: n.r })),
];

/** Vùng có mái: camera không được cao hơn mái khi người chơi đứng trong đó. */
export const ROOF_ZONES = [
  { minX: h.x - h.halfW, maxX: h.x + h.halfW, minZ: h.z - h.halfD, maxZ: h.z + h.halfD, y: 4.2 },
  { minX: BELL.x - 3.2, maxX: BELL.x + 3.2, minZ: BELL.z - 3.2, maxZ: BELL.z + 3.2, y: 4.3 },
  { minX: TEA.x - 5, maxX: TEA.x + 5, minZ: TEA.z - 3.8, maxZ: TEA.z + 4.4, y: 3.7 },
  { minX: PAGODA.x - 4.4, maxX: PAGODA.x + 4.4, minZ: PAGODA.z - 4.4, maxZ: PAGODA.z + 4.4, y: PAGODA.roofY },
];

/** Kẹp vị trí vào vùng được đi: sân chính + bậc thềm trước cổng. Server cũng dùng. */
export function clampToWalkable(x, z) {
  let cz = Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, z));
  let cx;
  if (cz > 30.4) cx = Math.min(LANDING.maxX, Math.max(LANDING.minX, x));
  else cx = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, x));
  return [cx, cz];
}

/** Đẩy một vòng tròn bán kính r ra khỏi mọi vật cản. Ghi kết quả vào out và trả về out. */
export function resolveCollision(x, z, r = PLAYER_RADIUS, out = { x: 0, z: 0 }) {
  let px = x;
  let pz = z;
  for (let iter = 0; iter < 3; iter++) {
    for (let i = 0; i < CIRCLES.length; i++) {
      const c = CIRCLES[i];
      // Vòng có "khe" (hồ sen dưới cầu): bỏ qua khi người chơi đứng trên dải cầu.
      if (c.gapZ !== undefined && Math.abs(pz - c.gapZ) <= c.gapHalf) continue;
      const dx = px - c.x;
      const dz = pz - c.z;
      const min = c.r + r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 1e-4;
      px = c.x + (dx / d) * min;
      pz = c.z + (dz / d) * min;
    }
    for (let i = 0; i < BOXES.length; i++) {
      const b = BOXES[i];
      const nx = Math.max(b.minX, Math.min(px, b.maxX));
      const nz = Math.max(b.minZ, Math.min(pz, b.maxZ));
      const dx = px - nx;
      const dz = pz - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        px = nx + (dx / d) * r;
        pz = nz + (dz / d) * r;
      } else {
        // Tâm lọt vào trong hộp: đẩy ra phía gần nhất mà vẫn còn trong ranh giới sân.
        const left = b.minX - r >= BOUNDS.minX ? px - b.minX : Infinity;
        const right = b.maxX + r <= BOUNDS.maxX ? b.maxX - px : Infinity;
        const top = b.minZ - r >= BOUNDS.minZ ? pz - b.minZ : Infinity;
        const bottom = b.maxZ + r <= BOUNDS.maxZ ? b.maxZ - pz : Infinity;
        const m = Math.min(left, right, top, bottom);
        if (m === left) px = b.minX - r;
        else if (m === right) px = b.maxX + r;
        else if (m === top) pz = b.minZ - r;
        else pz = b.maxZ + r;
      }
    }
    [px, pz] = clampToWalkable(px, pz);
  }
  out.x = px;
  out.z = pz;
  return out;
}

/** Cắt đoạn thẳng (ax,az)->(bx,bz) với các hộp cam, trả về t nhỏ nhất trong [0,1]. */
export function cameraSegmentT(ax, az, bx, bz) {
  let best = 1;
  const dx = bx - ax;
  const dz = bz - az;
  for (let i = 0; i < BOXES.length; i++) {
    const b = BOXES[i];
    if (!b.cam) continue;
    let t0 = 0;
    let t1 = best;
    if (Math.abs(dx) < 1e-6) {
      if (ax < b.minX || ax > b.maxX) continue;
    } else {
      let a = (b.minX - ax) / dx;
      let c = (b.maxX - ax) / dx;
      if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, c);
      if (t0 > t1) continue;
    }
    if (Math.abs(dz) < 1e-6) {
      if (az < b.minZ || az > b.maxZ) continue;
    } else {
      let a = (b.minZ - az) / dz;
      let c = (b.maxZ - az) / dz;
      if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, c);
      if (t0 > t1) continue;
    }
    if (t0 < best) best = t0;
  }
  return best;
}

/** Độ cao nền chỗ người chơi đứng: thiền đường, hiên, gác chuông, quán trà cao hơn mặt sân;
 *  cầu vòm dâng lên theo độ cong. */
export function floorHeight(x, z) {
  if (Math.abs(x - HALL.x) < HALL.halfW + 0.8 && z > HALL.z - HALL.halfD && z < HALL.z + HALL.halfD + 3.4) return 0.3;
  if (Math.abs(x - BELL.x) < 3.5 && Math.abs(z - BELL.z) < 3.5) return 0.2;
  if (Math.abs(x - TEA.x) < 5 && z > TEA.z - 3.8 && z < TEA.z + 4.4) return 0.16;
  if (Math.abs(z - BRIDGE.z) < BRIDGE.halfW && x > BRIDGE.x1 && x < BRIDGE.x2) {
    const t = (x - (BRIDGE.x1 + BRIDGE.x2) / 2) / ((BRIDGE.x2 - BRIDGE.x1) / 2);
    return Math.max(0.05, 0.06 + BRIDGE.peak * (1 - t * t));
  }
  return 0.04;
}

export function dist2d(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Khoảng cách tới mép hồ: âm là đang ở trên mặt nước. */
export function lakeDistance(x, z) {
  let best = Infinity;
  for (const lobe of LAKE.lobes) best = Math.min(best, dist2d(x, z, lobe.x, lobe.z) - lobe.r);
  return best;
}

/** Từ tâm hồ đi theo hướng angle (sin, cos như rot) bao xa thì tới bờ: tia cắt xa nhất với các vòng. */
export function lakeEdgeRadius(angle) {
  const ux = Math.sin(angle);
  const uz = Math.cos(angle);
  let far = 0;
  for (const { x, z, r } of LAKE.lobes) {
    const ox = LAKE.x - x;
    const oz = LAKE.z - z;
    const along = ox * ux + oz * uz;
    const disc = along * along - (ox * ox + oz * oz - r * r);
    if (disc > 0) far = Math.max(far, -along + Math.sqrt(disc));
  }
  return far;
}

export function inBox(x, z, b, margin = 0) {
  return x >= b.minX - margin && x <= b.maxX + margin && z >= b.minZ - margin && z <= b.maxZ + margin;
}

export function isInsideHall(x, z) {
  return Math.abs(x - HALL.x) < HALL.halfW && Math.abs(z - HALL.z) < HALL.halfD;
}
