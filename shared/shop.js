// Cửa hàng: danh mục món ngoại hình bán bằng TEU, dùng chung cho server (kiểm tra, trừ điểm) và client (hiển thị).
// Id món là "slot:index" theo đúng số thứ tự trong protocol.js. Món không có trong SHOP_PRICES là miễn phí.
// Đổi giá thoải mái; thêm món trả phí mới thì người đang mặc món đó sẽ rớt về mặc định ở lần vào sau.
import { ATTIRE_NAMES, EFFECT_NAMES, HAIR_NAMES, HAT_NAMES, PREMIUM_COLORS, SHIRT_COLORS, WEAPON_NAMES } from './protocol.js';
import { FISH } from './fish.js';

export const LOOK_SLOTS = ['color', 'hair', 'hat', 'attire', 'weapon', 'effect'];

/** Ngoại hình mặc định khi món đang mặc chưa sở hữu. Mũ 7 là "Không đội". */
export const LOOK_DEFAULT = { color: 0, hair: 0, hat: 7, attire: 0, weapon: 0, effect: 0 };

// Mũ id 0-2 là kiểu tóc cũ chỉ còn để di trú: không bán, không hiện trong cửa hàng.
export const HAT_SHOP_START = 3;

const PREMIUM_COLOR_START = SHIRT_COLORS.length - PREMIUM_COLORS.length;

export const SHOP_PRICES = {
  // Màu áo quý: giữ giá cũ của quầy đổi quà.
  ...Object.fromEntries(PREMIUM_COLORS.map((c, i) => [`color:${PREMIUM_COLOR_START + i}`, c.price])),
  'hair:3': 15, // Búi trâm ngọc
  'hair:4': 15, // Song loạn
  'hair:5': 25, // Bạch phát
  'hat:6': 15, // Đầu trụi băng mắt
  'hat:8': 20, // Đạo quan
  'hat:9': 35, // Kim quan
  'hat:10': 25, // Nón lá màn sa
  'attire:3': 25, // Võ tăng bang thân
  'attire:4': 30, // Hán phục vân kiêm
  'attire:5': 30, // Hàn phục đan thanh
  'attire:6': 30, // Hòa phục hồng diệp
  'attire:7': 35, // Áo dài quốc hương
  'weapon:2': 20, // Phất trần
  'weapon:3': 30, // Băng quyền
  'effect:3': 30, // Tinh hà
  'effect:7': 30, // Nguyệt bạch
  'effect:4': 40, // Hỏa diễm
  'effect:8': 40, // Hắc ám
  'effect:10': 50, // Xích diễm
  'effect:9': 60, // Long quyền
  'effect:12': 60, // Kiếm vũ
  'effect:11': 80, // Kim long
  'effect:13': 888, // Thần bài (hào quang chí tôn, cần thành tích)
  'effect:14': 888, // Vua câu cá (hào quang chí tôn, cần thành tích)
};

// Hào quang chí tôn: ngoài TEU còn phải đạt thành tích mới mua được, và không trao đổi được
// (danh hiệu trên đầu phải đúng là của người đeo). Server đếm tiến độ ở server/shop-store.js,
// client chỉ hiển thị. stat là khoá trong object tiến độ server trả về.
export const SHOP_REQUIREMENTS = {
  'effect:13': { stat: 'tableWins', need: 100, unit: 'ván thắng ở sòng', label: 'Thắng 100 ván ở bàn bầu cua, xì dách, tài xỉu hoặc cò quay' },
  'effect:14': { stat: 'fishSpecies', need: FISH.length, unit: 'loài trong Sổ cá', label: `Câu đủ ${FISH.length} loài trong Sổ cá` },
};

export const requirementOf = (id) => SHOP_REQUIREMENTS[id] ?? null;

/** Số đã đạt của một món có điều kiện (0 nếu chưa có dữ liệu tiến độ). */
export const requirementHave = (id, progress) => {
  const req = requirementOf(id);
  return req ? Math.max(0, Math.floor(Number(progress?.[req.stat]) || 0)) : 0;
};

/** Đủ điều kiện mua chưa: món thường luôn đủ. */
export const meetsRequirement = (id, progress) => {
  const req = requirementOf(id);
  return !req || requirementHave(id, progress) >= req.need;
};

/** Món gắn với thành tích thì không đưa lên trạm giao thương được. */
export const isTradable = (id) => !requirementOf(id);

export const itemId = (slot, index) => `${slot}:${index}`;

export function parseItemId(id) {
  if (typeof id !== 'string') return null;
  const m = /^([a-z]+):(\d{1,3})$/.exec(id);
  if (!m || !LOOK_SLOTS.includes(m[1])) return null;
  return { slot: m[1], index: Number(m[2]) };
}

export const priceOf = (id) => SHOP_PRICES[id] ?? 0;
export const isPaid = (id) => priceOf(id) > 0;

/** Món đã mặc được chưa: miễn phí hoặc đã có trong tập sở hữu. */
export const canWear = (owned, slot, index) => {
  const id = itemId(slot, index);
  return !isPaid(id) || owned.has(id);
};

/** Tên hiển thị của một món. */
export function itemName(slot, index) {
  if (slot === 'color') {
    const premium = PREMIUM_COLORS[index - PREMIUM_COLOR_START];
    return premium ? `Áo ${premium.name}` : `Màu áo ${index + 1}`;
  }
  const names = { hair: HAIR_NAMES, hat: HAT_NAMES, attire: ATTIRE_NAMES, weapon: WEAPON_NAMES, effect: EFFECT_NAMES }[slot];
  return names?.[index] ?? `${slot} ${index}`;
}

/** Thẻ cửa hàng: nhóm theo slot, thứ tự hiển thị. */
export const SHOP_SECTIONS = [
  { slot: 'effect', label: 'Hào quang', hanzi: '光' },
  { slot: 'attire', label: 'Trang phục', hanzi: '衣' },
  { slot: 'weapon', label: 'Vũ khí', hanzi: '劍' },
  { slot: 'hat', label: 'Mũ', hanzi: '冠' },
  { slot: 'hair', label: 'Tóc', hanzi: '髮' },
  { slot: 'color', label: 'Màu áo', hanzi: '彩' },
];

/** Các món trả phí của một slot, xếp theo giá rồi theo id. */
export function paidItems(slot) {
  return Object.entries(SHOP_PRICES)
    .map(([id, price]) => ({ id, price, ...parseItemId(id) }))
    .filter((it) => it.slot === slot)
    .sort((a, b) => a.price - b.price || a.index - b.index);
}

/** Giữ món được phép mặc; món chưa sở hữu rớt về mặc định của slot đó. */
export function sanitizeLook(look, owned) {
  const out = {};
  for (const slot of LOOK_SLOTS) out[slot] = canWear(owned, slot, look[slot]) ? look[slot] : LOOK_DEFAULT[slot];
  return out;
}
