// Sạp đồ câu và đơn hàng cá: mua cần, mua thính, rắc thính khi quăng, chấm đơn khi kéo cá lên.
// Server là nguồn sự thật: giá, quyền sở hữu, số thính và tiến độ đơn đều tính ở đây, client chỉ gửi id món.
import { FISH_RODS, THINH, rodTierOf } from '../shared/fish-gear.js';
import { dailyOrders, orderMatches } from '../shared/fish-orders.js';
import { localDate } from './time.js';

const BUY_INTERVAL_MS = 300;

export class FishingSupplies {
  constructor({ db, config }) {
    Object.assign(this, { db, config });
  }

  date(now = Date.now()) {
    return localDate(now, this.config.timezone);
  }

  rodTier(pid) {
    return rodTierOf(this.db.shop.owned(pid));
  }

  /** Đơn trong ngày kèm tiến độ của người này. */
  orders(pid, date = this.date()) {
    const progress = this.db.fishing.orders(pid, date);
    return dailyOrders(date).map((order) => {
      const row = progress.get(order.slot);
      return { ...order, progress: Math.min(order.need, row?.progress ?? 0), done: row?.done ?? false };
    });
  }

  /** Mọi thứ HUD câu cá cần lúc mở: cần đang dùng, cần đã có, số thính, đơn hôm nay. */
  info(p) {
    const owned = this.db.shop.owned(p.pid);
    return {
      ok: true,
      rod: rodTierOf(owned),
      rods: FISH_RODS.filter((r) => r.item && owned.has(r.item)).map((r) => r.tier),
      thinh: this.db.fishing.thinh(p.pid),
      orders: this.orders(p.pid),
      teu: this.db.shop.teu(p.pid),
    };
  }

  buy(p, data) {
    const now = Date.now();
    if (now - (p.lastBuy ?? 0) < BUY_INTERVAL_MS) return { ok: false, error: 'Từ từ thôi, chủ sạp đang gói đồ.' };
    p.lastBuy = now;
    const item = typeof data?.item === 'string' ? data.item : '';
    const date = this.date(now);
    if (item === THINH.item) {
      if (this.db.fishing.thinh(p.pid) + THINH.pack > THINH.maxStock) return { ok: false, error: 'Giỏ thính đầy rồi, dùng bớt đã.' };
      const res = this.db.fishing.buyThinh(p.pid, { n: THINH.pack, max: THINH.maxStock, price: THINH.price }, date, now);
      return this.#bought(p, res, THINH.price);
    }
    const rod = FISH_RODS.find((r) => r.item && r.item === item);
    if (!rod) return { ok: false, error: 'Sạp không bán món này.' };
    if (rod.tier <= this.rodTier(p.pid)) return { ok: false, error: 'Bạn đã có cần tốt bằng hoặc hơn rồi.' };
    const res = this.db.shop.buy(p.pid, rod.item, rod.price, date, now);
    if (res.owned) return { ...this.info(p), already: true };
    return this.#bought(p, res, rod.price);
  }

  #bought(p, res, price) {
    const info = this.info(p);
    if (res.poor) return { ...info, ok: false, error: `Còn thiếu ${price - info.teu} TEU, câu thêm vài con đã nhé.` };
    return { ...info, ok: true, price };
  }

  /** Rắc một nắm thính nếu người chơi muốn và còn thính. */
  takeThinh(p, wanted) {
    return Boolean(wanted) && this.db.fishing.useThinh(p.pid);
  }

  /**
   * Con cá vừa kéo lên: cộng vào đơn khớp, đơn nào vừa đủ thì trả về để cộng TEU.
   * Mỗi con chỉ tính cho một đơn (đơn đầu tiên còn dở mà nó khớp).
   */
  recordCatch(pid, date, fishId, weight, now = Date.now()) {
    const order = this.orders(pid, date).find((o) => !o.done && orderMatches(o, fishId, weight));
    if (!order) return { orderDone: null, orders: null };
    const done = order.progress + 1 >= order.need;
    this.db.fishing.bumpOrder(pid, date, order.slot, done ? now : null);
    return { orderDone: done ? { slot: order.slot, teu: order.teu } : null, orders: this.orders(pid, date) };
  }
}
