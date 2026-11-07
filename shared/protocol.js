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

export const AVATAR = { colors: 10, hats: 7, attires: 4, weapons: 4, effects: 10 };

export const SHIRT_COLORS = [
  '#c0392b', '#e67e22', '#d4a017', '#3f8f5f', '#2d7f8f', '#3b5ea8', '#7d4a9e', '#8a5a3c',
  '#e8c34a', '#3aa8a0',
];

export const HAT_NAMES = ['Tóc ngắn', 'Tóc dài', 'Tóc búi', 'Mũ lưỡi trai', 'Nón lá', 'Mũ bảo hộ', 'Đầu trụi băng mắt'];

// Trang phục tiên hiệp, vũ khí và hào quang: chọn ở màn vào game, đồng bộ qua server.
export const ATTIRE_NAMES = ['Lữ khách', 'Đạo bào vân thủy', 'Bạch y hiệp khách', 'Võ tăng bang thân'];
export const WEAPON_NAMES = ['Không', 'Kiếm', 'Phất trần', 'Băng quyền'];
export const EFFECT_NAMES = ['Không', 'Sen kim', 'Lưu ly', 'Tinh hà', 'Hỏa diễm', 'Đào hoa', 'Bích ngọc', 'Nguyệt bạch', 'Hắc ám', 'Long quyền'];

export const EMOJIS = ['🙏', '🌸', '😊', '❤️', '👋', '🍵'];

export const WISH_PLACES = ['tree', 'pond', 'container'];
export const PLACE_LABELS = {
  tree: 'Dải lụa trên cây bồ đề',
  pond: 'Đèn hoa đăng trên hồ sen',
  container: 'Thẻ giấy dán lên container',
};

// Mã trạng thái chuyển động và hoạt động (gửi dạng số cho gọn).
export const ANIM = { idle: 0, walk: 1 };
export const ACTIVITY = { none: 0, meditate: 1, bell: 2, write: 3, shake: 4, fish: 5, pitch: 6 };
export const ACTIVITY_BY_NAME = { meditate: 1, bell: 2, write: 3, shake: 4, fish: 5, pitch: 6 };
export const ACTIVITY_LABEL = {
  1: 'đang ngồi thiền',
  2: 'đang thỉnh chuông',
  3: 'đang viết',
  4: 'đang rút quẻ',
  5: 'đang câu cá',
  6: 'đang chơi đầu hồ',
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
