// Lời ước: tạo, thả tim, xoá, ẩn; quẻ vận đơn cũng ở đây vì cùng giới hạn theo ngày.
import crypto from 'node:crypto';
import { LIMITS, WISH_PLACES } from '../shared/protocol.js';
import { cleanText } from './filter.js';
import { WindowCounter } from './limits.js';
import { localDate } from './time.js';

export class Wishes {
  constructor({ db, io, filter, config }) {
    this.db = db;
    this.io = io;
    this.filter = filter;
    this.config = config;
    this.ipWishes = new WindowCounter(24 * 60 * 60_000);
  }

  today(now = Date.now()) {
    return localDate(now, this.config.timezone);
  }

  /** Lời ước mới nhất mỗi nơi treo, gửi kèm snapshot khi vào phòng. */
  snapshot(playerId) {
    return WISH_PLACES.flatMap((place) => this.db.latestWishes(place, LIMITS.wishesShownPerPlace, playerId));
  }

  create(player, data) {
    const now = Date.now();
    const text = cleanText(data?.text, LIMITS.wishMax);
    const place = data?.place;
    if (!text) return { ok: false, error: 'Viết vài chữ rồi hãy gửi nhé.' };
    if (!WISH_PLACES.includes(place)) return { ok: false, error: 'Chọn nơi treo lời ước nhé.' };
    if (this.filter.isBad(text)) return { ok: false, error: 'Lời ước nên nhẹ nhàng hơn nhé.' };
    const date = this.today(now);
    // Giới hạn tổng: playerId tự tạo được nên giới hạn theo người chưa đủ để chặn spam từ internet.
    // Đếm lời ước còn lại, để một người tạo rồi xoá liên tục không làm hết chỗ của cả công ty.
    if (this.db.wishCountAllToday(date) >= this.config.wishesPerDayTotal) {
      return { ok: false, error: 'Hôm nay cả nhà đã ước nhiều lắm rồi, mai quay lại nhé.' };
    }
    const used = this.db.wishCountToday(player.pid, date);
    if (used >= LIMITS.wishesPerDay) {
      return { ok: false, error: `Hôm nay bạn đã viết đủ ${LIMITS.wishesPerDay} lời ước rồi, mai quay lại nhé.` };
    }
    if (!this.ipWishes.take(player.ip, this.config.wishesPerIpPerDay, now)) {
      return { ok: false, error: 'Hôm nay mạng này đã gửi nhiều lời ước lắm rồi, mai quay lại nhé.' };
    }
    const row = this.db.addWish({ playerId: player.pid, author: player.name, text, place, now, date });
    this.db.bumpStat(date, { wishes: 1 });
    // Bản phát cho mọi người không có playerId: mine do client tự đánh dấu từ ack.
    this.io.emit('wish:new', this.db.publicWish(row, null));
    return { ok: true, id: row.id, remaining: LIMITS.wishesPerDay - used - 1 };
  }

  like(player, data) {
    const id = Number(data?.id);
    if (!Number.isInteger(id)) return { ok: false };
    const wish = this.db.getWish(id);
    if (!wish || wish.hidden) return { ok: false, error: 'Lời ước này không còn nữa.' };
    if (wish.player_id === player.pid) return { ok: false, error: 'Tim này để dành cho đồng nghiệp nhé.' };
    if (this.db.likeWish(id, player.pid)) {
      this.io.emit('wish:update', { id, likes: wish.likes + 1 });
      return { ok: true, likes: wish.likes + 1 };
    }
    return { ok: true, likes: wish.likes };
  }

  remove(player, data) {
    const id = Number(data?.id);
    if (!Number.isInteger(id)) return { ok: false };
    if (!this.db.deleteWish(id, player.pid)) return { ok: false, error: 'Không xoá được lời ước này.' };
    this.io.emit('wish:removed', { id });
    return { ok: true };
  }

  /** Admin ẩn/bỏ ẩn: biến mất hoặc hiện lại ngay trên mọi máy. */
  setHidden(id, hidden) {
    if (!this.db.setWishHidden(id, hidden)) return false;
    if (hidden) this.io.emit('wish:removed', { id });
    else this.io.emit('wish:new', this.db.publicWish(this.db.getWish(id), null));
    return true;
  }

  drawFortune(player) {
    const now = Date.now();
    const date = this.today(now);
    const existing = this.db.getFortune(player.pid, date);
    if (existing) {
      return { ok: true, already: true, date, text: existing.text, bl: existing.bl_number, consignee: player.name };
    }
    const list = this.config.fortunes;
    if (!Array.isArray(list) || !list.length) return { ok: false, error: 'Ống xăm đang trống, nhờ HR thêm câu chúc nhé.' };
    const text = list[crypto.randomInt(list.length)];
    const serial = String(crypto.randomInt(10000)).padStart(4, '0');
    const bl = `HTH-${date.slice(0, 4)}-${serial}`;
    this.db.addFortune({ playerId: player.pid, date, text, bl, now });
    return { ok: true, already: false, date, text, bl, consignee: player.name };
  }
}
