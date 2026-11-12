// Hằng số giao thức dùng chung client + server: giới hạn, mã trạng thái, nhịp thiền.

export const LIMITS = {
  nameMax: 20,
  chatMax: 80,
  chatIntervalMs: 2000,
  emojiIntervalMs: 500,
  waveIntervalMs: 1000,
  wishMax: 120,
  wishesPerDay: 3,
  bellCooldownMs: 30_000,
  wishesShownPerPlace: 60,
  moveMaxPerSec: 20,
};

export const AVATAR = { colors: 10, hairs: 6, hats: 10, attires: 7, weapons: 3, effects: 12 };

// Màu áo: 4 màu đầu là màu cơ bản ai cũng có; phần sau là màu quý mở bằng TEU,
// bitmask theo thứ tự trong PREMIUM_COLORS. Hai màu quý đầu giữ nguyên vị trí
// để bitmask của người đã mở khoá không bị lệch nghĩa.
export const SHIRT_COLORS = [
  // Cơ bản
  '#c0392b', // đỏ
  '#d4a017', // hoàng
  '#3f8f5f', // lục
  '#3b5ea8', // lam
  // Quý
  '#e8c34a', // Vàng kim
  '#3aa8a0', // Lam ngọc
  '#d9767f', // Hồng đào
  '#7d4a9e', // Tử vi
  '#e3e6ea', // Bạch ngân
  '#23202e', // Huyền hắc
];

// Tóc và mũ là hai slot riêng, kết hợp tự do. Id là số thứ tự lưu trong DB:
// chỉ được nối tiếp, không đổi chỗ hay đổi tên option đã có.
export const HAIR_NAMES = ['Tóc ngắn', 'Tóc dài', 'Tóc búi', 'Búi trâm ngọc', 'Song loạn', 'Bạch phát'];
// 3 id đầu là id cũ trộn tóc vào mũ: bản mới không cho chọn nữa nhưng server vẫn
// nhận để kiểu tóc của người chơi cũ không mất nghĩa khi di trú sang slot tóc.
export const HAT_NAMES = [
  'Tóc ngắn', 'Tóc dài', 'Tóc búi', // id cũ, chỉ còn để di trú
  'Mũ lưỡi trai', 'Nón lá', 'Mũ bảo hộ',
  'Không đội', 'Đạo quan', 'Kim quan', 'Nón lá màn sa',
];

// Trang phục tiên hiệp, vũ khí và hào quang: chọn ở màn vào game, đồng bộ qua server.
// 3 bộ mới từ 4 nước: Hán phục (Trung), hanbok (Hàn), kimono (Nhật), áo dài (Việt).
export const ATTIRE_NAMES = [
  'Lữ khách', 'Đạo bào vân thủy', 'Bạch y hiệp khách',
  'Hán phục vân kiêm', 'Hàn phục đan thanh', 'Hòa phục hồng diệp', 'Áo dài quốc hương',
];
export const WEAPON_NAMES = ['Không', 'Kiếm', 'Phất trần'];
export const EFFECT_NAMES = ['Không', 'Sen kim', 'Lưu ly', 'Tinh hà', 'Hỏa diễm', 'Đào hoa', 'Bích ngọc', 'Nguyệt bạch', 'Hắc ám', 'Xích diễm', 'Kim long', 'Kiếm vũ'];

export const EMOJIS = ['🙏', '🌸', '😊', '❤️', '👋', '🍵'];

export const WISH_PLACES = ['tree', 'pond'];
export const PLACE_LABELS = {
  tree: 'Dải lụa trên cây bồ đề',
  pond: 'Đèn hoa đăng trên hồ sen',
};

// Mã trạng thái chuyển động và hoạt động (gửi dạng số cho gọn).
export const ANIM = { idle: 0, walk: 1 };
export const ACTIVITY = { none: 0, meditate: 1, bell: 2, write: 3, shake: 4, fish: 5, pitch: 6, melody: 7, pk: 8 };
export const ACTIVITY_BY_NAME = { meditate: 1, bell: 2, write: 3, shake: 4, fish: 5, pitch: 6 };
export const ACTIVITY_LABEL = {
  7: 'đang tấu nhạc',
  1: 'đang ngồi thiền',
  2: 'đang thỉnh chuông',
  3: 'đang viết',
  4: 'đang rút quẻ',
  5: 'đang câu cá',
  6: 'đang chơi đầu hồ',
  8: 'đang luận kiếm',
};

// Đố thuật ngữ: nhà sư ở cổng đưa câu đố, trả lời đúng nhận TEU theo bậc.
export const RIDDLE = {
  attemptsPerDay: 10,
  intervalMs: 3000,
  hintAfterMisses: 2,
  teuByTier: { 1: 2, 2: 3, 3: 5 },
};

// TEU — điểm chung của tu viện: làm gì cũng tích, cuối tuần lên bảng.
export const TEU = {
  fishByRarity: { 1: 1, 2: 2, 3: 4 },
  fishPerfectBonus: 1,
  pitchRank: { S: 8, A: 5, B: 3, C: 1 },
  rhythmPer25: 1, // floor(score / 25)
  bellEventOnBeat: 1,
};

// Màu áo quý: mở khoá bằng TEU ở Sổ an, bitmask theo thứ tự trong mảng.
export const PREMIUM_COLORS = [
  { hex: '#e8c34a', name: 'Vàng kim', price: 25 },
  { hex: '#3aa8a0', name: 'Lam ngọc', price: 25 },
  { hex: '#d9767f', name: 'Hồng đào', price: 25 },
  { hex: '#7d4a9e', name: 'Tử vi', price: 35 },
  { hex: '#e3e6ea', name: 'Bạch ngân', price: 35 },
  { hex: '#23202e', name: 'Huyền hắc', price: 40 },
];

// Nhịp thở: hít 4s, giữ 2s, thở 6s; 5 chu kì khoảng 1 phút.
export const BREATH = { inhale: 4000, hold: 2000, exhale: 6000, cycle: 12000, cycles: 5 };

// Mốc sự kiện chuông: đúng giờ hiện vòng sáng, 5s sau là nhịp chạm chung.
export const BELL_EVENT = {
  announceMs: 120_000,
  hitDelayMs: 5000,
  tapLateMs: 1000,
  onBeatMs: 600,
  resultDelayMs: 6500,
  ringNowLeadMs: 8000,
};

export const PLAYER_ID_RE = /^[a-f0-9]{32}$/;
