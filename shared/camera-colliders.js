// Vật cản 3D cho camera theo sau, kiểu spring arm (Unreal) / Deoccluder (Cinemachine):
// quét một quả cầu từ điểm xoay sau đầu nhân vật ra vị trí camera mong muốn, gặp vật cản thì co lại.
// Chỉ những khối to đủ che nhân vật mới chặn camera. Lan can cầu, cột, cây, đèn đá cố tình không có
// ở đây: chặn những vật thấp/mảnh đó làm camera sập vào người mỗi lần xoay qua ("vướng").
import { CASINO, CASINO_HALL, CASINO_WALLS, HALL, PAGODA, ROOF_ZONES, SITE, TERRACE } from './layout.js';

/** Bán kính quả cầu quét: camera luôn cách mặt vật cản chừng này, không thấy xuyên qua mép tường. */
export const CAMERA_RADIUS = 0.3;

const h = HALL;
// Chân tường thiền đường nằm trên mặt đài.
const HY = TERRACE.y;
// Tường rào gạch quanh sân cao ~2.1 m (thân 1.8 m + gờ mái), dày 0.6 m (xem scene/monastery.js).
const YARD_WALL_TOP = 2.15;
// Mái nhô ra ngoài vùng ROOF_ZONES một chút (đầu hồi, diềm mái).
const EAVE = 0.4;

const box = (minX, maxX, minY, maxY, minZ, maxZ) => ({ minX, maxX, minY, maxY, minZ, maxZ });

export const CAMERA_COLLIDERS = [
  // Tường rào nam hai bên cổng tam quan: thấp, camera trên cao nhìn qua được.
  box(SITE.minX - 0.7, -4.6, -1, YARD_WALL_TOP, 29.7, 30.3),
  box(4.6, 31, -1, YARD_WALL_TOP, 29.7, 30.3),
  // Tường Kim Ngân Phường, cao ngang tường rào.
  ...CASINO_WALLS.map((w) => box(w.minX, w.maxX, -1, CASINO.wallTop, w.minZ, w.maxZ)),
  // Kim Ngân Lâu: khối lầu hai tầng cao tới nóc mái trên.
  box(CASINO_HALL.x - CASINO_HALL.halfW, CASINO_HALL.x + CASINO_HALL.halfW, -1, 9.5,
    CASINO_HALL.z - CASINO_HALL.halfD, CASINO_HALL.z + CASINO_HALL.halfD),
  // Thân đài cẩm thạch: đứng dưới sân xoay camera qua đài thì camera không chui vào khối đá.
  box(h.x - TERRACE.halfW, h.x + TERRACE.halfW, -1, TERRACE.y, TERRACE.backZ, TERRACE.frontZ),
  // Thiền đường trên đài: tường bắc, tây, đông và hai mảng tường trước chừa cửa.
  box(h.x - h.halfW, h.x + h.halfW, HY - 1, HY + h.height, h.z - h.halfD - 0.25, h.z - h.halfD + 0.25),
  box(h.x - h.halfW - 0.25, h.x - h.halfW + 0.25, HY - 1, HY + h.height, h.z - h.halfD, h.z + h.halfD),
  box(h.x + h.halfW - 0.25, h.x + h.halfW + 0.25, HY - 1, HY + h.height, h.z - h.halfD, h.z + h.halfD),
  box(h.x - h.halfW, h.x - h.doorHalf, HY - 1, HY + h.height, h.z + h.halfD - 0.25, h.z + h.halfD + 0.25),
  box(h.x + h.doorHalf, h.x + h.halfW, HY - 1, HY + h.height, h.z + h.halfD - 0.25, h.z + h.halfD + 0.25),
  // Lanh tô trên cửa thiền đường.
  box(h.x - h.doorHalf, h.x + h.doorHalf, HY + h.height - 1.1, HY + h.height, h.z + h.halfD - 0.25, h.z + h.halfD + 0.25),
  // Mái chồng hai tầng của đại điện, gồm cả mái hiên phía trước.
  box(h.x - h.halfW - 2.2, h.x + h.halfW + 2.2, HY + h.height - 0.05, HY + h.height + 6.4, h.z - h.halfD - 2.6, h.z + h.halfD + 3.2),
  // Thân bảo tháp: không cho camera chui vào trong tháp.
  box(PAGODA.x - 2.4, PAGODA.x + 2.4, -1, PAGODA.roofY, PAGODA.z - 2.4, PAGODA.z + 2.4),
  // Tấm mái hành lang, gác chuông, quán trà: ROOF_ZONES.y là trần camera cũ, mái thật ở ngay trên.
  ...ROOF_ZONES.map((z) => box(z.minX - EAVE, z.maxX + EAVE, z.y + CAMERA_RADIUS, z.y + 2.6, z.minZ - EAVE, z.maxZ + EAVE)),
];

// Tia o + t*d (t trong [t0, t1]) cắt dải [min, max] trên một trục: trả về [t0, t1] mới, hoặc null nếu trượt.
function clipAxis(o, d, min, max, range) {
  if (Math.abs(d) < 1e-9) return o >= min && o <= max ? range : null;
  let a = (min - o) / d;
  let c = (max - o) / d;
  if (a > c) [a, c] = [c, a];
  range[0] = Math.max(range[0], a);
  range[1] = Math.min(range[1], c);
  return range[0] <= range[1] ? range : null;
}

const range = [0, 0];

/**
 * Quét cầu bán kính radius từ (ox, oy, oz) theo hướng đơn vị (dx, dy, dz), xa tối đa maxDist.
 * Trả về quãng đi được trước khi quả cầu chạm vật cản (maxDist nếu thông).
 * Cầu chạm hộp ~ tâm cầu chạm hộp nới thêm radius; hộp đã chứa điểm xoay thì bỏ qua (nhân vật sát tường).
 */
export function cameraProbe(ox, oy, oz, dx, dy, dz, maxDist, radius = CAMERA_RADIUS, colliders = CAMERA_COLLIDERS) {
  let best = maxDist;
  for (const b of colliders) {
    const minX = b.minX - radius;
    const maxX = b.maxX + radius;
    const minY = b.minY - radius;
    const maxY = b.maxY + radius;
    const minZ = b.minZ - radius;
    const maxZ = b.maxZ + radius;
    if (ox > minX && ox < maxX && oy > minY && oy < maxY && oz > minZ && oz < maxZ) continue;
    range[0] = 0;
    range[1] = best;
    if (!clipAxis(ox, dx, minX, maxX, range)) continue;
    if (!clipAxis(oy, dy, minY, maxY, range)) continue;
    if (!clipAxis(oz, dz, minZ, maxZ, range)) continue;
    best = range[0];
  }
  return best;
}
