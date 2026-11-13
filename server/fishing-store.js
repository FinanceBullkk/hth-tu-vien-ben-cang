// Lưu trữ đồ câu và đơn hàng cá trên cùng kết nối SQLite với Db: số nắm thính còn lại, tiến độ đơn từng ngày.
// Cần câu là món sở hữu vĩnh viễn nên nằm chung bảng owned_items của cửa hàng (ShopStore).
// Mọi thao tác trừ TEU nằm trong transaction để TEU không bao giờ âm và không mất thính khi lỗi giữa chừng.

const SCHEMA = `
CREATE TABLE IF NOT EXISTS fish_supplies (
  player_id TEXT PRIMARY KEY,
  thinh INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS fish_orders (
  player_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  slot INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  done_at INTEGER,
  PRIMARY KEY (player_id, local_date, slot)
);
`;

class NotEnoughTeu extends Error {}

export class FishingStore {
  /** @param {import('better-sqlite3').Database} sqlite */
  constructor(sqlite) {
    this.db = sqlite;
    this.db.exec(SCHEMA);
    const p = (sql) => this.db.prepare(sql);
    this.s = {
      thinhOf: p('SELECT thinh FROM fish_supplies WHERE player_id=?'),
      thinhAdd: p(`INSERT INTO fish_supplies (player_id,thinh) VALUES (@pid,@n)
        ON CONFLICT(player_id) DO UPDATE SET thinh=MIN(@max, thinh+@n)`),
      thinhUse: p('UPDATE fish_supplies SET thinh=thinh-1 WHERE player_id=? AND thinh>0'),
      pay: p('UPDATE players SET teu=teu-@price WHERE id=@pid AND teu>=@price'),
      teuLog: p('INSERT INTO teu_log (player_id,amount,reason,local_date,created_at) VALUES (@pid,@amount,@reason,@date,@now)'),
      ordersOf: p('SELECT slot,progress,done_at FROM fish_orders WHERE player_id=? AND local_date=?'),
      orderBump: p(`INSERT INTO fish_orders (player_id,local_date,slot,progress,done_at) VALUES (@pid,@date,@slot,1,@doneAt)
        ON CONFLICT(player_id,local_date,slot) DO UPDATE SET progress=progress+1, done_at=COALESCE(done_at,@doneAt)
        WHERE done_at IS NULL`),
    };
    this.buyThinhTx = this.db.transaction(({ pid, n, max, price, date, now }) => {
      if (this.s.pay.run({ pid, price }).changes === 0) throw new NotEnoughTeu();
      this.s.thinhAdd.run({ pid, n, max });
      this.s.teuLog.run({ pid, amount: -price, reason: 'shop:thinh', date, now });
    });
  }

  thinh(pid) {
    return this.s.thinhOf.get(pid)?.thinh ?? 0;
  }

  /** Mua một gói thính. Thiếu TEU thì không đổi gì. */
  buyThinh(pid, { n, max, price }, date, now = Date.now()) {
    try {
      this.buyThinhTx({ pid, n, max, price, date, now });
      return { ok: true };
    } catch (err) {
      if (err instanceof NotEnoughTeu) return { ok: false, poor: true };
      throw err;
    }
  }

  /** Lấy một nắm thính; false khi đã hết. */
  useThinh(pid) {
    return this.s.thinhUse.run(pid).changes > 0;
  }

  /** Tiến độ các đơn trong ngày: Map slot -> { progress, done }. */
  orders(pid, date) {
    return new Map(this.s.ordersOf.all(pid, date).map((r) => [r.slot, { progress: r.progress, done: r.done_at != null }]));
  }

  /** Cộng một con vào đơn. doneAt: mốc giờ nếu con này làm đủ đơn, không thì null. Đơn đã xong thì không cộng nữa. */
  bumpOrder(pid, date, slot, doneAt) {
    this.s.orderBump.run({ pid, date, slot, doneAt });
  }
}
