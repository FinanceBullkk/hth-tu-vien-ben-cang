// Bố cục sân tu viện dùng chung client + server: ranh giới, vật cản, điểm hoạt động.
// Quy ước: mặt đất là mặt phẳng XZ, đơn vị mét. Hướng rot: (sin rot, cos rot).

export const BOUNDS = { minX: -29.5, maxX: 29.4, minZ: -29.5, maxZ: 40 };
export const LANDING = { minX: -4.2, maxX: 4.2, minZ: 30, maxZ: 40 };
export const SPAWN = { x: 0, z: 36.5, rot: Math.PI };
export const PLAYER_RADIUS = 0.4;

export const BELL = { x: 0, z: 2, radius: 3.6, yardRadius: 12 };
export const HALL = { x: 0, z: -20, halfW: 8, halfD: 6, doorHalf: 2.2, height: 4.6 };
export const TREE = { x: -18, z: 6, radius: 4.2 };
export const POND = { x: -19, z: -12, radius: 5.5, actionRadius: 7.6 };
export const CONTAINERS = { minX: 26.6, maxX: 29.2, minZ: 0, maxZ: 12, actionMargin: 2.4 };
export const TEA = { x: -18, z: 22, radius: 3.4 };
export const GARDEN = { minX: 10, maxX: 26, minZ: -28, maxZ: -12 };
// Thầy trụ trì đứng ở hiên thiền đường, bên phải cửa, dưới một chiếc đèn lồng.
export const ABBOT = { x: 5.2, z: -12.4, rot: 0, radius: 0.35, actionRadius: 2.6 };

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
  ...[26, 20, 14, 8].flatMap((z) => [{ x: -3.4, z }, { x: 3.4, z }]),
  ...[-5, -10].flatMap((z) => [{ x: -3.4, z }, { x: 3.4, z }]),
  ...[-9, -14].map((x) => ({ x, z: 5.4 })),
  ...[-9, -14].map((x) => ({ x, z: -1.4 })),
  ...[9, 15, 21].map((x) => ({ x, z: 5.4 })),
  ...[9, 15, 21].map((x) => ({ x, z: -1.4 })),
];

export const COURT_TREES = [
  { x: 24, z: 24, s: 1.1 }, { x: 16, z: 26, s: 0.9 }, { x: 25, z: 17, s: 0.85 },
  { x: 8, z: 25, s: 0.7 }, { x: -8, z: 26, s: 0.8 },
  { x: -26, z: -25, s: 1.1 }, { x: -13, z: -27, s: 0.8 }, { x: -26, z: -2, s: 0.9 },
  { x: 25, z: -7, s: 0.8 }, { x: -26, z: 14, s: 0.9 },
];

export const GARDEN_ROCKS = [
  { x: 16, z: -22, r: 1.7 }, { x: 21.5, z: -16.5, r: 1.15 }, { x: 13, z: -16, r: 0.9 },
];

export const TEA_TABLES = [
  { x: -18, z: 22 }, { x: -21.4, z: 24.6 }, { x: -14.6, z: 24.6 },
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
  // Container cũ sát rào: gộp cả hai và kéo tới rào để không còn khe, túi không gian phía sau.
  { minX: CONTAINERS.minX, maxX: 30, minZ: CONTAINERS.minZ, maxZ: 18.3 },
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
  // Cây bồ đề, hồ sen
  { x: TREE.x, z: TREE.z, r: 1.4 },
  { x: POND.x, z: POND.z, r: POND.radius },
  // Quán trà: cột + bàn
  ...[[-4.4, -3.2], [4.4, -3.2], [-4.4, 3.8], [4.4, 3.8]].map(([dx, dz]) => ({ x: TEA.x + dx, z: TEA.z + dz, r: 0.28 })),
  ...TEA_TABLES.map((t) => ({ x: t.x, z: t.z, r: 0.75 })),
  // Đá vườn thiền
  ...GARDEN_ROCKS.map((r) => ({ x: r.x, z: r.z, r: r.r })),
  // Cây trong sân, cột đèn lồng
  ...COURT_TREES.map((t) => ({ x: t.x, z: t.z, r: 0.45 * t.s })),
  ...LANTERN_POSTS.map((p) => ({ x: p.x, z: p.z, r: 0.16 })),
];

/** Vùng có mái: camera không được cao hơn mái khi người chơi đứng trong đó. */
export const ROOF_ZONES = [
  { minX: h.x - h.halfW, maxX: h.x + h.halfW, minZ: h.z - h.halfD, maxZ: h.z + h.halfD, y: 4.2 },
  { minX: BELL.x - 3.2, maxX: BELL.x + 3.2, minZ: BELL.z - 3.2, maxZ: BELL.z + 3.2, y: 4.3 },
  { minX: TEA.x - 5, maxX: TEA.x + 5, minZ: TEA.z - 3.8, maxZ: TEA.z + 4.4, y: 3.7 },
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

/** Độ cao nền chỗ người chơi đứng: thiền đường, hiên, gác chuông, quán trà cao hơn mặt sân. */
export function floorHeight(x, z) {
  if (Math.abs(x - HALL.x) < HALL.halfW + 0.8 && z > HALL.z - HALL.halfD && z < HALL.z + HALL.halfD + 3.4) return 0.3;
  if (Math.abs(x - BELL.x) < 3.5 && Math.abs(z - BELL.z) < 3.5) return 0.2;
  if (Math.abs(x - TEA.x) < 5 && z > TEA.z - 3.8 && z < TEA.z + 4.4) return 0.16;
  return 0.04;
}

export function dist2d(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function inBox(x, z, b, margin = 0) {
  return x >= b.minX - margin && x <= b.maxX + margin && z >= b.minZ - margin && z <= b.maxZ + margin;
}

export function isInsideHall(x, z) {
  return Math.abs(x - HALL.x) < HALL.halfW && Math.abs(z - HALL.z) < HALL.halfD;
}
