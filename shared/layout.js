// Bố cục sân tu viện dùng chung client + server: ranh giới, vật cản, điểm hoạt động.
// Quy ước: mặt đất là mặt phẳng XZ, đơn vị mét. Hướng rot: (sin rot, cos rot).

// Tường bao gò (tâm tường): phía đông là tường chắn dốc xuống cảng nên giữ nguyên, gò nới về tây và bắc.
// Nội viện tu ở trục giữa và phía bắc, Kim Ngân Phường (sòng) phía tây, phố chợ tây nam, hồ câu phía đông.
export const SITE = { minX: -66.3, maxX: 30.1, minZ: -46.3, maxZ: 30 };
export const BOUNDS = { minX: SITE.minX + 0.8, maxX: 29.4, minZ: SITE.minZ + 0.8, maxZ: 40 };
export const LANDING = { minX: -4.2, maxX: 4.2, minZ: 30, maxZ: 40 };
export const SPAWN = { x: 0, z: 36.5, rot: Math.PI };
export const PLAYER_RADIUS = 0.4;

export const BELL = { x: -15, z: 4, radius: 3.6, yardRadius: 12 };
export const HALL = { x: 0, z: -32, halfW: 8, halfD: 6, doorHalf: 2.2, height: 4.6 };
// Đài cẩm thạch dưới thiền đường: cao TERRACE.y, có lan can quanh mép, bậc lớn giữa mặt trước theo trục chính.
// Thiền đường, hiên và lối đi vòng quanh điện đều nằm trên đài. Bậc chạy từ chân (stairFootZ) lên mép đài (frontZ).
export const TERRACE = {
  halfW: HALL.halfW + 2.5,
  backZ: HALL.z - HALL.halfD - 2,
  frontZ: HALL.z + HALL.halfD + 3.4,
  y: 1.6,
  stairHalf: 3,
  stairRun: 3.6,
  rail: 0.15, // nửa bề dày lan can
};
TERRACE.stairFootZ = TERRACE.frontZ + TERRACE.stairRun;
// radius: vùng tương tác treo lời ước, nới đúng tới rìa dải lụa trên cành.
export const TREE = { x: -14, z: 19, radius: 5.4 };
// 8 cành tỏa ngang để treo dải lụa: dùng chung cho scene (monastery) và vị trí ribbon (wishes3d)
// để lời ước bám đúng cành thay vì lơ lửng. Cành nghiêng nhẹ lên về phía ngọn (0.1206/m ngang).
export const TREE_BRANCHES = Array.from({ length: 8 }, (_, i) => ({
  a: (i / 8) * Math.PI * 2,
  len: 4.3 + (i % 4) * 0.42,
  y: 4.9 + (i % 3) * 0.14,
}));
export const POND = { x: -21, z: -34, radius: 5.5, actionRadius: 7.6 };
export const CONTAINERS = { minX: 26.6, maxX: 29.2, minZ: 0, maxZ: 12, actionMargin: 2.4 };
// Quán trà rút xăm đứng đầu phố chợ, cạnh cây bồ đề.
export const TEA = { x: -30, z: 22, radius: 3.4 };
export const GARDEN = { minX: 15, maxX: 27, minZ: -26, maxZ: -18 };
// Asset võ hiệp dựng bằng Blender (tools/blender/): bảo tháp, cầu vòm, cờ băng, đèn đá, non bộ.
export const PAGODA = { x: 21, z: -36, radius: 3.9, roofY: 12.5 };
export const BRIDGE = { x1: POND.x - 5.6, x2: POND.x + 5.6, z: POND.z, halfW: 0.95, peak: 1.15 };
export const BANNERS = [
  { x: -5.6, z: 28, ry: 0 }, { x: 5.6, z: 28, ry: Math.PI },
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
  { x: -62, z: -42, s: 0.75, ry: 0.6, r: 1.5 },
  { x: 26, z: -42, s: 0.75, ry: 2.2, r: 1.5 },
];
// Thầy trụ trì đứng ở hiên thiền đường, bên phải cửa, dưới một chiếc đèn lồng.
export const ABBOT = { x: 5.2, z: HALL.z + 7.6, rot: 0, radius: 0.35, actionRadius: 2.6 };
export const ZOEYY = { x: -5.2, z: HALL.z + 7.6, rot: 0, radius: 0.35, actionRadius: 2.6 };
// Sư chú giữ cổng: đứng trong sân cạnh tam quan, đưa câu đố cho người vào.
// Sạp Kim Bảo ở phố chợ: bà chủ đứng sau quầy, quầy quay về phía phố; khách đứng phía phố bấm E mở cửa hàng.
const SHOP_X = -42;
const SHOP_Z = 23;
export const SHOP = {
  x: SHOP_X, z: SHOP_Z, rot: Math.PI, radius: 0.35, actionRadius: 2.9,
  counter: { minX: SHOP_X - 1.3, maxX: SHOP_X + 1.3, minZ: SHOP_Z - 1.3, maxZ: SHOP_Z - 0.7 },
  shelf: { minX: SHOP_X - 1.3, maxX: SHOP_X + 1.3, minZ: SHOP_Z + 0.6, maxZ: SHOP_Z + 1 },
};
// Trạm giao thương: bảng gỗ có mái nhỏ ở cuối phố chợ, gần cổng nam Kim Ngân Phường, mặt bảng quay về phía nam.
// Hai người cùng đứng trong radius quanh bảng thì mời nhau trao đổi đồ và TEU; board là vật cản.
const TRADE_X = -50;
const TRADE_Z = 18;
export const TRADE_POST = {
  x: TRADE_X, z: TRADE_Z, rot: 0, radius: 3.2,
  board: { minX: TRADE_X - 0.9, maxX: TRADE_X + 0.9, minZ: TRADE_Z - 0.12, maxZ: TRADE_Z + 0.12 },
};
export const GATE_MONK = { x: 3.2, z: 28.4, rot: 0, radius: 0.35, actionRadius: 2.6 };
// Hai sư tử đá giữ cổng, ngồi trên bậc thềm ngoài tam quan, chừa giữa thềm cho người lên xuống.
export const GATE_LIONS = [-1, 1].map((side) => ({ x: side * 3.6, z: 31.5, r: 0.55, side }));

// Kim Ngân Phường: khu sòng có tường riêng phía tây, hai cổng (đông nhìn sang gác chuông, nam ra phố chợ).
// aisle là lối giữa chạy bắc–nam; hai cột bàn hai bên lối, khách luôn đứng phía lối, nhà cái đứng mép ngoài.
export const CASINO = {
  minX: -64, maxX: -28, minZ: -28, maxZ: 10, wallT: 0.4, wallTop: 2.15,
  aisleX: -46,
  gateEast: { z: -4, half: 3 },
  gateSouth: { x: -46, half: 3 },
};
// Bàn là vật cản tròn; ai đứng trong radius quanh bàn thì bấm E để chơi, đứng đâu quanh bàn cũng được.
// seat là chỗ menu "Chơi gì?" đưa tới. Cột tây (bầu cua, tài xỉu): khách phía đông, nhà cái phía tây.
// Cột đông (xì dách, cò quay): khách phía tây, nhà cái phía đông. Bầu cua: đĩa xóc phía nhà cái, bạt phía khách.
function casinoTable(x, z, tableRadius, radius, seatGap, dealerGap) {
  // dir = +1 khi khách đứng phía đông bàn (cột tây), -1 khi khách đứng phía tây (cột đông).
  const dir = x < CASINO.aisleX ? 1 : -1;
  return {
    x, z, radius, tableRadius,
    seat: { x: x + dir * seatGap, z, rot: -dir * Math.PI / 2 },
    dealer: { x: x - dir * dealerGap, z, rot: dir * Math.PI / 2, radius: 0.35 },
  };
}
export const BAUCUA_ZONE = casinoTable(-52, -14, 0.95, 2.6, 1.45, 1.35);
// Xì dách: tối đa 5 khách, bài từng người chia ra trước chỗ họ theo hình cung phía khách; bài nhà cái ở phía nhà cái.
export const XIDACH_ZONE = casinoTable(-40, -14, 0.95, 2.6, 1.45, 1.35);
export const TAIXIU_ZONE = casinoTable(-52, 0, 0.95, 2.6, 1.45, 1.35);
// Bàn cò quay to hơn vì có bánh xe và mặt bạt số.
export const COQUAY_ZONE = casinoTable(-40, 0, 1.15, 2.8, 1.65, 1.55);
// Tụ Bảo Bồn: chậu tụ bảo giữa lối, giữa bốn bàn; vật cản tròn.
export const TREASURE_BASIN = { x: CASINO.aisleX, z: -7, r: 1.5 };
// Kim Ngân Lâu: lầu hai tầng mái lưu ly vàng sát tường bắc khu sòng, mặt quay về lối giữa. Chỉ để nhìn, không vào được.
export const CASINO_HALL = { x: CASINO.aisleX, z: CASINO.minZ + 3.5, halfW: 8, halfD: 2.6 };
// Cột cờ treo dây đèn lồng vắt ngang sân sòng (hai dây đông–tây), đứng sát tường đông và tây, né hành lang máy gạt cần.
export const CASINO_POLES = [-18, 5].flatMap((z) => [
  { x: CASINO.minX + 1.4, z, r: 0.2 }, { x: CASINO.maxX - 1.4, z, r: 0.2 },
]);

// Hành lang có mái của Kim Ngân Phường, sát tường tây; dãy máy gạt cần đứng giữa hai cột ở khoang giữa:
// lưng máy sát mép ngoài hành lang, mặt máy quay về phía đông nhìn ra sân sòng.
// Khách đứng giữa lối hành lang trước máy (stand), quay mặt về phía tây.
// Máy là vật cản tròn; ai đứng trong useRadius quanh chỗ đứng của một máy thì bấm E để chơi máy đó.
const SLOT_GALLERY = { x: -62, z: -7 };
const SLOT_STAND_GAP = 0.95; // Chỗ đứng cách tâm máy chừng này về phía đông.
const SLOT_MACHINE_X = SLOT_GALLERY.x - SLOT_STAND_GAP;
export const SLOT_ZONE = {
  x: SLOT_MACHINE_X + SLOT_STAND_GAP, z: SLOT_GALLERY.z, rot: -Math.PI / 2,
  useRadius: 0.9, machineRadius: 0.42,
  machines: [-1.2, 0, 1.2].map((dz) => SLOT_GALLERY.z + dz).map((z) => ({
    x: SLOT_MACHINE_X, z, rot: Math.PI / 2,
    stand: { x: SLOT_MACHINE_X + SLOT_STAND_GAP, z, rot: -Math.PI / 2 },
  })),
};

/** Máy gần chỗ (x, z) nhất mà còn trong tầm chơi (useRadius + margin quanh chỗ đứng), hoặc -1. */
export function slotMachineAt(x, z, margin = 0) {
  let best = -1;
  let bestD = SLOT_ZONE.useRadius + margin;
  SLOT_ZONE.machines.forEach((m, i) => {
    const d = Math.hypot(x - m.stand.x, z - m.stand.z);
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}
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
export const MELODY_ZONE = {
  x: 8, z: 21.5, radius: 2,
  seat: { x: 8, z: 21.5, rot: -Math.PI / 2 },
  camera: { pos: { x: 4.1, y: 1.9, z: 19.4 }, look: { x: 8, y: 0.5, z: 21.5 } },
};
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
  { key: 'melody', icon: '♫', name: 'Tấu nhạc', desc: 'Độc tấu đàn nhị · sáu phím theo nhạc', x: 8, z: 21.5 },
  { key: 'fish', icon: '🎣', name: 'Câu cá', desc: 'Thả câu ở hồ, gom đủ các loài cá', x: 19, z: 16.7 },
  { key: 'bell', icon: '🔔', name: 'Audition chuông', desc: 'Nhập chuỗi mũi tên, chốt đúng nhịp', x: BELL.x, z: BELL.z + 3.2 },
  { key: 'mat', icon: '🪷', name: 'Ngồi thiền', desc: 'Ngồi yên, thở chậm và tích Chân khí', x: HALL.x, z: HALL.z + 4.4 },
  { key: 'pitch', icon: '🏺', name: 'Đầu hồ', desc: 'Ném tên vào bình, so tài cùng cao thủ', x: 23.4, z: 3 },
  { key: 'baucua', icon: '🎲', name: 'Bầu cua', desc: 'Đặt TEU, xóc đĩa cùng cả sân', x: BAUCUA_ZONE.seat.x, z: BAUCUA_ZONE.seat.z },
  { key: 'xidach', icon: '🃏', name: 'Xì dách', desc: 'Rút bài đấu nhà cái, luật miền Nam', x: XIDACH_ZONE.seat.x, z: XIDACH_ZONE.seat.z },
  { key: 'taixiu', icon: '🎲', name: 'Tài xỉu', desc: 'Đoán tài hay xỉu, tay to nhất được tung', x: TAIXIU_ZONE.seat.x, z: TAIXIU_ZONE.seat.z },
  { key: 'coquay', icon: '🎡', name: 'Cò quay', desc: 'Đặt số, đỏ đen; tay to nhất búng bi', x: COQUAY_ZONE.seat.x, z: COQUAY_ZONE.seat.z },
  { key: 'slot', icon: '🎰', name: 'Gạt cần', desc: 'Kéo cần quay ba ô; ba Rồng nổ hũ ×200', x: SLOT_ZONE.x, z: SLOT_ZONE.z },
  { key: 'trade', icon: '⚖️', name: 'Giao thương', desc: 'Trao đổi đồ và TEU với người khác', x: TRADE_POST.x, z: TRADE_POST.z + 1.5 },
  { key: 'tea', icon: '🍵', name: 'Rút xăm', desc: 'Lắc ống xăm xin lời chúc hôm nay', x: TEA.x, z: TEA.z - 2.4 },
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
  { x: -3, z: 25 }, { x: 6, z: 20 }, { x: 4, z: 9.6 },
  { x: -3.5, z: 11.5 }, { x: -6, z: -6 }, { x: 6, z: -6 },
  { x: -22, z: 10 }, { x: -24, z: -8 }, { x: -36, z: 16.6 }, { x: 26, z: 14 },
];

export const COURT_TREES = [
  { x: -9, z: 26, s: 1.2 }, { x: 7.5, z: 27, s: 1.4, blossom: '#e8b9b1' },
  { x: 8, z: 11, s: 1.15 }, { x: -24, z: 4, s: 1.3 }, { x: -22, z: -14, s: 1.1 },
  { x: -12, z: -42, s: 1.5, blossom: '#e8b9b1' }, { x: 13, z: -42, s: 1.4, blossom: '#e8b9b1' },
  { x: -36, z: -38, s: 1.4 }, { x: -50, z: -40, s: 1.2 }, { x: 27, z: -14, s: 1.3 },
  { x: -58, z: 24, s: 1.2 }, { x: 26, z: 17.6, s: 0.85 },
];

export const GARDEN_ROCKS = [
  { x: 16.5, z: -21, r: 1.6 }, { x: 25, z: -25, r: 1.1 },
  { x: 24.5, z: -17, r: 1.0 }, { x: 7.8, z: 14, r: 1.1 },
];

export const TEA_TABLES = [[0, 0], [-3.4, 2.6], [3.4, 2.6]]
  .map(([dx, dz]) => ({ x: TEA.x + dx, z: TEA.z + dz }));

// Đường men theo cụm cảnh; tọa độ được kiểm tra với va chạm dùng chung.
const CASINO_EAST_GATE_X = CASINO.maxX;
export const COURT_PATHS = [
  // Trục chính từ tam quan tới chân sân đạo trường.
  { width: 3.8, paved: true, points: [[0, 40], [0, 30], [0, 16], [0, 4], [0, -3]] },
  // Lối ngang phía tây: trục chính → cổng đông Kim Ngân Phường → Tụ Bảo Bồn.
  { width: 2.6, points: [[0, -4], [-8, -3.5], [-16, -3], [-22, -4], [CASINO_EAST_GATE_X - 1, -4], [-36, -4.5], [TREASURE_BASIN.x + 2.4, TREASURE_BASIN.z + 0.4]] },
  // Lối vào gác chuông.
  { width: 2.2, points: [[0, 7], [-7, 7.4], [BELL.x + 3.6, BELL.z + 3.2]] },
  // Phố chợ: trục chính → quán trà, sạp, trạm → cổng nam Kim Ngân Phường.
  { width: 2.6, points: [[0, 14], [-8, 14.5], [-20, 13.8], [-30, 14], [-40, 14], [CASINO.gateSouth.x, 13], [CASINO.gateSouth.x, 7]] },
  // Lên hồ sen, qua cầu vòm.
  { width: 2.1, points: [[-16, -3], [-17, -12], [-16, -22], [-14.6, -29], [BRIDGE.x2 + 1, BRIDGE.z]] },
  { width: 2.3, points: [[0, 16], [8, 17], [13, 15.7], [19, 15.7], [24, 14]] },
  { width: 2.6, points: [[0, 8], [9, 6], [14, 5.5], [19, 6.6], [24.8, 6.4], [25, 3]] },
  // Lên vườn đá và bảo tháp.
  { width: 2.1, points: [[14, 4], [18, -1], [20, -7], [21, -13], [21, -24], [PAGODA.x, PAGODA.z + 5]] },
];

// Hai hành lang có mái kẹp sân đạo trường, và một hành lang máy gạt cần trong Kim Ngân Phường.
const GALLERY_BASE = { w: 3.2, d: 14, floor: 0.16, roof: 3.15 };
export const GALLERIES = [
  { x: -11.6, z: HALL.z + 17 },
  { x: 11.6, z: HALL.z + 17 },
  { ...SLOT_GALLERY, gold: true }, // Hành lang trong Kim Ngân Phường lợp lưu ly vàng.
].map((g) => ({ ...GALLERY_BASE, ...g }));
export const GALLERY_POSTS = GALLERIES.flatMap(g => [-1.1, 1.1].flatMap(dx =>
  [-6, -2, 2, 6].map(dz => ({ x: g.x + dx, z: g.z + dz, r: 0.19 }))));
export const BAMBOO_CLUMPS = [
  { x: -21, z: 26, r: 0.8 }, { x: -23, z: 27.8, r: 0.8 },
  { x: -7, z: 22, r: 0.7 }, { x: -5, z: 24, r: 0.7 },
  { x: 16, z: -15, r: 0.8 }, { x: 17, z: -12, r: 0.7 },
  { x: 26, z: -4, r: 0.8 }, { x: 27, z: -7, r: 0.7 },
];

const WALL_T = 0.4;
const h = HALL;

/** Lan can quanh đài: chặn cả hai phía nên không ai bước hụt xuống hay trèo lên từ cạnh đài. */
function terraceRailBoxes() {
  const { halfW, backZ, frontZ, stairHalf, stairFootZ, rail } = TERRACE;
  const x0 = HALL.x - halfW;
  const x1 = HALL.x + halfW;
  return [
    { minX: x0, maxX: x1, minZ: backZ - rail, maxZ: backZ + rail },
    { minX: x0 - rail, maxX: x0 + rail, minZ: backZ, maxZ: frontZ },
    { minX: x1 - rail, maxX: x1 + rail, minZ: backZ, maxZ: frontZ },
    { minX: x0, maxX: HALL.x - stairHalf, minZ: frontZ - rail, maxZ: frontZ + rail },
    { minX: HALL.x + stairHalf, maxX: x1, minZ: frontZ - rail, maxZ: frontZ + rail },
    { minX: HALL.x - stairHalf - 2 * rail, maxX: HALL.x - stairHalf, minZ: frontZ, maxZ: stairFootZ },
    { minX: HALL.x + stairHalf, maxX: HALL.x + stairHalf + 2 * rail, minZ: frontZ, maxZ: stairFootZ },
  ];
}

/** Tường Kim Ngân Phường thành các đoạn hộp, chừa cổng đông và cổng nam. */
function casinoWallBoxes() {
  const { minX, maxX, minZ, maxZ, wallT: t, gateEast: ge, gateSouth: gs } = CASINO;
  const half = t / 2;
  return [
    { minX, maxX, minZ: minZ - half, maxZ: minZ + half },
    { minX: minX - half, maxX: minX + half, minZ, maxZ },
    { minX, maxX: gs.x - gs.half, minZ: maxZ - half, maxZ: maxZ + half },
    { minX: gs.x + gs.half, maxX, minZ: maxZ - half, maxZ: maxZ + half },
    { minX: maxX - half, maxX: maxX + half, minZ, maxZ: ge.z - ge.half },
    { minX: maxX - half, maxX: maxX + half, minZ: ge.z + ge.half, maxZ },
  ];
}
export const CASINO_WALLS = casinoWallBoxes();
// Hai cột son mỗi cổng, đứng ở đầu đoạn tường chừa cổng.
export const CASINO_GATE_POSTS = [
  [CASINO.maxX, CASINO.gateEast.z - CASINO.gateEast.half], [CASINO.maxX, CASINO.gateEast.z + CASINO.gateEast.half],
  [CASINO.gateSouth.x - CASINO.gateSouth.half, CASINO.maxZ], [CASINO.gateSouth.x + CASINO.gateSouth.half, CASINO.maxZ],
].map(([x, z]) => ({ x, z, r: 0.3 }));

/** Hộp va chạm. cam: true thì camera cũng không xuyên qua. */
export const BOXES = [
  // Tường rào nam, hai bên cổng
  { minX: SITE.minX - 0.7, maxX: -4.6, minZ: 30 - WALL_T, maxZ: 30 + WALL_T, cam: true },
  { minX: 4.6, maxX: 31, minZ: 30 - WALL_T, maxZ: 30 + WALL_T, cam: true },
  // Tường Kim Ngân Phường và thân Kim Ngân Lâu
  ...CASINO_WALLS.map((w) => ({ ...w, cam: true })),
  {
    minX: CASINO_HALL.x - CASINO_HALL.halfW, maxX: CASINO_HALL.x + CASINO_HALL.halfW,
    minZ: CASINO_HALL.z - CASINO_HALL.halfD, maxZ: CASINO_HALL.z + CASINO_HALL.halfD, cam: true,
  },
  // Thiền đường: tường bắc, đông, tây, hai mảng tường trước (chừa cửa)
  { minX: h.x - h.halfW, maxX: h.x + h.halfW, minZ: h.z - h.halfD - 0.25, maxZ: h.z - h.halfD + 0.25, cam: true },
  { minX: h.x - h.halfW - 0.25, maxX: h.x - h.halfW + 0.25, minZ: h.z - h.halfD, maxZ: h.z + h.halfD, cam: true },
  { minX: h.x + h.halfW - 0.25, maxX: h.x + h.halfW + 0.25, minZ: h.z - h.halfD, maxZ: h.z + h.halfD, cam: true },
  { minX: h.x - h.halfW, maxX: h.x - h.doorHalf, minZ: h.z + h.halfD - 0.25, maxZ: h.z + h.halfD + 0.25, cam: true },
  { minX: h.x + h.doorHalf, maxX: h.x + h.halfW, minZ: h.z + h.halfD - 0.25, maxZ: h.z + h.halfD + 0.25, cam: true },
  // Giữ một container làm bảng ước, mở lối đi ra bờ hồ phía nam.
  { minX: CONTAINERS.minX, maxX: 30, minZ: CONTAINERS.minZ, maxZ: CONTAINERS.maxZ },
  // Quầy và kệ hàng của Sạp Kim Bảo.
  SHOP.counter,
  SHOP.shelf,
  // Bảng của Trạm giao thương.
  TRADE_POST.board,
  // Lan can đài cẩm thạch quanh thiền đường (chừa bậc giữa mặt trước) và lan can hai bên bậc.
  ...terraceRailBoxes(),
  // Lan can cầu vòm qua hồ sen: giữ người chơi trên dải cầu.
  { minX: BRIDGE.x1, maxX: BRIDGE.x2, minZ: BRIDGE.z - 0.98, maxZ: BRIDGE.z - 0.72, cam: true },
  { minX: BRIDGE.x1, maxX: BRIDGE.x2, minZ: BRIDGE.z + 0.72, maxZ: BRIDGE.z + 0.98, cam: true },
];

/** Vật cản tròn: cột, cây, đá, hồ, bàn... */
export const CIRCLES = [
  ...GALLERY_POSTS,
  ...BAMBOO_CLUMPS,
  // Cổng tam quan
  ...[-4.4, -1.8, 1.8, 4.4].map((x) => ({ x, z: 30, r: 0.3 })),
  // Gác chuông
  ...[[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]].map(([dx, dz]) => ({ x: BELL.x + dx, z: BELL.z + dz, r: 0.35 })),
  { x: BELL.x, z: BELL.z, r: 1.0 },
  // Hiên thiền đường
  ...[-7, -3.4, 3.4, 7].map((x) => ({ x, z: h.z + h.halfD + 1.8, r: 0.28 })),
  { x: ABBOT.x, z: ABBOT.z, r: ABBOT.radius },
  { x: ZOEYY.x, z: ZOEYY.z, r: ZOEYY.radius },
  // Sư chú giữ cổng; chum lớn, đối thủ và hai bình ở sân đầu hồ
  { x: GATE_MONK.x, z: GATE_MONK.z, r: GATE_MONK.radius },
  ...GATE_LIONS,
  { x: SHOP.x, z: SHOP.z, r: SHOP.radius },
  { x: BAUCUA_ZONE.x, z: BAUCUA_ZONE.z, r: BAUCUA_ZONE.tableRadius },
  { x: BAUCUA_ZONE.dealer.x, z: BAUCUA_ZONE.dealer.z, r: BAUCUA_ZONE.dealer.radius },
  { x: XIDACH_ZONE.x, z: XIDACH_ZONE.z, r: XIDACH_ZONE.tableRadius },
  { x: XIDACH_ZONE.dealer.x, z: XIDACH_ZONE.dealer.z, r: XIDACH_ZONE.dealer.radius },
  ...SLOT_ZONE.machines.map((m) => ({ x: m.x, z: m.z, r: SLOT_ZONE.machineRadius })),
  ...[TAIXIU_ZONE, COQUAY_ZONE].flatMap((t) => [{ x: t.x, z: t.z, r: t.tableRadius }, { x: t.dealer.x, z: t.dealer.z, r: t.dealer.radius }]),
  TREASURE_BASIN,
  ...CASINO_GATE_POSTS,
  ...CASINO_POLES,
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
  ...GALLERIES.map(g => ({ minX: g.x - g.w / 2, maxX: g.x + g.w / 2, minZ: g.z - g.d / 2, maxZ: g.z + g.d / 2, y: g.roof - 0.35 })),
  { minX: h.x - h.halfW, maxX: h.x + h.halfW, minZ: h.z - h.halfD, maxZ: h.z + h.halfD, y: TERRACE.y + 4.2 },
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
  for (const g of GALLERIES) {
    if (Math.abs(x - g.x) < g.w / 2 && Math.abs(z - g.z) < g.d / 2) return g.floor;
  }
  // Mặt đài cẩm thạch (cả trong điện), rồi bậc dốc đều từ chân bậc lên mép đài.
  if (Math.abs(x - HALL.x) < TERRACE.halfW && z > TERRACE.backZ && z <= TERRACE.frontZ) return TERRACE.y;
  if (Math.abs(x - HALL.x) < TERRACE.stairHalf && z > TERRACE.frontZ && z < TERRACE.stairFootZ) {
    return Math.max(0.04, TERRACE.y * (TERRACE.stairFootZ - z) / TERRACE.stairRun);
  }
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
