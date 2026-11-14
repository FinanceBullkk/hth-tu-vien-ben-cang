// Cửa hàng và tủ đồ: mua món ngoại hình bằng TEU, thay đồ ngay trong game.
// Server là nguồn sự thật: client chỉ gửi id món hoặc bộ đồ muốn mặc, giá và quyền sở hữu do server kiểm tra.
import { AVATAR } from '../shared/protocol.js';
import { LOOK_SLOTS, canWear, meetsRequirement, parseItemId, priceOf, requirementHave, requirementOf } from '../shared/shop.js';
import { localDate } from './time.js';

const LOOK_INTERVAL_MS = 1000;
const BUY_INTERVAL_MS = 300;

const SLOT_COUNT = { color: AVATAR.colors, hair: AVATAR.hairs, hat: AVATAR.hats, attire: AVATAR.attires, weapon: AVATAR.weapons, effect: AVATAR.effects };

export class Shop {
  constructor({ db, config }) {
    this.db = db;
    this.config = config;
  }

  owned(pid) {
    return this.db.shop.owned(pid);
  }

  /** Danh sách món sở hữu gửi cho client (mảng id). */
  ownedList(pid) {
    return [...this.owned(pid)];
  }

  buy(p, data) {
    const now = Date.now();
    if (now - (p.lastBuy ?? 0) < BUY_INTERVAL_MS) return { ok: false, error: 'Từ từ thôi, chưởng quầy đang gói đồ.' };
    p.lastBuy = now;
    const item = typeof data?.item === 'string' ? data.item : '';
    const parsed = parseItemId(item);
    const price = priceOf(item);
    if (!parsed || price <= 0 || parsed.index >= SLOT_COUNT[parsed.slot]) return { ok: false, error: 'Món này không bán.' };
    // Hào quang chí tôn: phải đạt thành tích trước (người đã có thì để db trả "đã có" như thường).
    const req = requirementOf(item);
    if (req && !this.owned(p.pid).has(item)) {
      const progress = this.db.shop.progress(p.pid);
      if (!meetsRequirement(item, progress)) {
        return { ok: false, error: `Chưa đủ điều kiện: ${req.label} (đang ${requirementHave(item, progress)}/${req.need}).`, progress };
      }
    }
    const res = this.db.shop.buy(p.pid, item, price, localDate(now, this.config.timezone), now);
    if (res.owned) return { ok: true, already: true, item, teu: res.teu };
    if (res.poor) return { ok: false, error: `Còn thiếu ${price - res.teu} TEU, chơi thêm đã nhé.`, teu: res.teu };
    return { ok: true, item, price, teu: res.teu };
  }

  /** Tiến độ thành tích để sạp hiện "37/100" cho hào quang chí tôn. */
  status(p) {
    return { ok: true, progress: this.db.shop.progress(p.pid) };
  }

  /**
   * Đọc bộ đồ client gửi lên. Trả về null nếu dữ liệu sai hoặc có món chưa sở hữu,
   * để tủ đồ không âm thầm đổi thành món khác người chơi không chọn.
   */
  readLook(pid, data) {
    const look = {};
    for (const slot of LOOK_SLOTS) {
      const v = Number(data?.[slot]);
      if (!Number.isInteger(v) || v < 0 || v >= SLOT_COUNT[slot]) return { error: 'Món đồ không có thật.' };
      look[slot] = v;
    }
    const owned = this.owned(pid);
    const missing = LOOK_SLOTS.find((slot) => !canWear(owned, slot, look[slot]));
    if (missing) return { error: 'Món này chưa có trong tủ, ghé cửa hàng mua trước nhé.' };
    return { look };
  }

  /** Thay đồ trong game; trả về bộ đồ đã lưu hoặc lỗi. */
  setLook(p, data) {
    const now = Date.now();
    if (now - (p.lastLook ?? 0) < LOOK_INTERVAL_MS) return { error: 'Thay đồ chậm lại chút nhé.' };
    const res = this.readLook(p.pid, data);
    if (res.error) return res;
    p.lastLook = now;
    this.db.shop.saveLook(p.pid, res.look);
    return res;
  }
}
