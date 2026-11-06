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

export const AVATAR = { colors: 8, hats: 6 };

export const SHIRT_COLORS = [
  '#c0392b', '#e67e22', '#d4a017', '#3f8f5f', '#2d7f8f', '#3b5ea8', '#7d4a9e', '#8a5a3c',
];

export const HAT_NAMES = ['Tóc ngắn', 'Tóc dài', 'Tóc búi', 'Mũ lưỡi trai', 'Nón lá', 'Mũ bảo hộ'];

export const EMOJIS = ['🙏', '🌸', '😊', '❤️', '👋', '🍵'];

export const WISH_PLACES = ['tree', 'pond', 'container'];
export const PLACE_LABELS = {
  tree: 'Dải lụa trên cây bồ đề',
  pond: 'Đèn hoa đăng trên hồ sen',
  container: 'Thẻ giấy dán lên container',
};

// Mã trạng thái chuyển động và hoạt động (gửi dạng số cho gọn).
export const ANIM = { idle: 0, walk: 1 };
export const ACTIVITY = { none: 0, meditate: 1, bell: 2, write: 3, shake: 4 };
export const ACTIVITY_BY_NAME = { meditate: 1, bell: 2, write: 3, shake: 4 };
export const ACTIVITY_LABEL = {
  1: 'đang ngồi thiền',
  2: 'đang thỉnh chuông',
  3: 'đang viết lời ước',
  4: 'đang rút quẻ',
};

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
