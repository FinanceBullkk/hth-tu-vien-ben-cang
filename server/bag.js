// Túi đồ: xem túi, bán cá lấy TEU, khoá món quý để không lỡ tay bán.
// Server là nguồn sự thật: client chỉ gửi id món; giá đã chốt trong DB lúc câu, quyền sở hữu kiểm tra theo người chơi.
import { BAG, readItemIds } from '../shared/fish-bag.js';
import { rodTierOf } from '../shared/fish-gear.js';
import { localDate } from './time.js';

export class Bag {
  constructor({ db, config }) {
    Object.assign(this, { db, config });
  }

  /** Toàn bộ túi kèm vài số cho bảng Thông tin: gửi trong snapshot lúc vào phòng. */
  state(pid) {
    const caught = this.db.fishCollection(pid);
    return {
      capacity: BAG.capacity,
      items: this.db.bag.list(pid),
      rod: rodTierOf(this.db.shop.owned(pid)),
      thinh: this.db.fishing.thinh(pid),
      species: caught.length,
      caught: caught.reduce((sum, row) => sum + row.count, 0),
    };
  }

  /** Bán một hay nhiều món. Món đang khoá, không có hay của người khác thì bỏ qua, không báo lỗi cả lượt. */
  sell(p, data) {
    const now = Date.now();
    if (now - (p.lastBagSell ?? 0) < BAG.sellIntervalMs) return { ok: false, error: 'Từ từ thôi, thương lái đang đếm tiền.' };
    p.lastBagSell = now;
    const ids = readItemIds(data?.ids);
    if (!ids) return { ok: false, error: 'Chọn món muốn bán đã nhé.' };
    const { sold, gained } = this.db.bag.sell(p.pid, ids, localDate(now, this.config.timezone), now);
    const teu = this.db.shop.teu(p.pid);
    if (!sold.length) return { ok: false, error: 'Không có món nào bán được, có thể đang khoá.', sold, teu };
    return { ok: true, sold, gained, teu };
  }

  lock(p, data) {
    const now = Date.now();
    if (now - (p.lastBagLock ?? 0) < BAG.lockIntervalMs) return { ok: false, error: 'Chậm lại chút nhé.' };
    p.lastBagLock = now;
    const id = data?.id;
    if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, error: 'Món này không có trong túi.' };
    const locked = data?.locked === true;
    if (!this.db.bag.setLocked(p.pid, id, locked)) return { ok: false, error: 'Món này không có trong túi.' };
    return { ok: true, id, locked };
  }
}
