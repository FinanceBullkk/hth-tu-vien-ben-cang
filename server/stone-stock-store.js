// Kho đá thường của bãi đá trên cùng kết nối SQLite với Db: mỗi người một dòng (số tảng đã lưu và mốc lưu),
// số tảng hiện có tính lại theo giờ bằng freeStock nên không cần chạy định kỳ. Người chưa có dòng coi như kho đầy.
// Lấy đá và cộng TEU của đá thường đều nằm trong transaction: không lấy quá số tảng đang có, không cộng hai lần.
// Đá quý mua bằng TEU đi qua TableStakeStore "stone" (db.stone) như máy gạt cần, không qua kho này.
import { STONE, freeStock } from '../shared/stone.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS stone_stock (
  player_id TEXT PRIMARY KEY,
  stock INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export class StoneStockStore {
  /** @param {import('better-sqlite3').Database} sqlite */
  constructor(sqlite) {
    this.db = sqlite;
    this.db.exec(SCHEMA);
    const p = (sql) => this.db.prepare(sql);
    this.s = {
      get: p('SELECT stock, updated_at FROM stone_stock WHERE player_id=?'),
      save: p(`INSERT INTO stone_stock (player_id,stock,updated_at) VALUES (@pid,@stock,@at)
        ON CONFLICT(player_id) DO UPDATE SET stock=@stock, updated_at=@at`),
      earn: p('UPDATE players SET teu=teu+@amount WHERE id=@pid'),
      teuLog: p('INSERT INTO teu_log (player_id,amount,reason,local_date,created_at) VALUES (@pid,@amount,@reason,@date,@now)'),
      teuOf: p('SELECT teu FROM players WHERE id=?'),
    };
    this.takeTx = this.db.transaction(({ pid, now }) => {
      const cur = this.#current(pid, now);
      if (cur.stock < 1) return { ok: false, ...cur };
      const stock = cur.stock - 1;
      // Lấy từ kho đầy thì đồng hồ bắt đầu chạy từ lúc này; kho chưa đầy thì giữ nguyên phần thời gian lẻ.
      this.s.save.run({ pid, stock, at: cur.at });
      return { ok: true, stock, nextAt: cur.at + STONE.freeRegenMs };
    });
    this.creditTx = this.db.transaction(({ pid, amount, date, now }) => {
      this.s.earn.run({ pid, amount });
      this.s.teuLog.run({ pid, amount, reason: 'stone:free', date, now });
    });
  }

  #current(pid, now) {
    const row = this.s.get.get(pid);
    return row ? freeStock(row.stock, row.updated_at, now) : freeStock(STONE.freeMax, now, now);
  }

  /** Số tảng đá thường hiện có và lúc có tảng kế tiếp (0 khi kho đầy). */
  stock(pid, now = Date.now()) {
    const { stock, nextAt } = this.#current(pid, now);
    return { stock, nextAt };
  }

  /** Lấy một tảng đá thường; hết đá thì không đổi gì. */
  take(pid, now = Date.now()) {
    return this.takeTx({ pid, now });
  }

  /** Cộng TEU của ngọc trong đá thường. Không đẩy ví ngay: client chờ đá vỡ trên màn hình mới cộng. */
  credit(pid, amount, date, now = Date.now()) {
    if (amount > 0) this.creditTx({ pid, amount, date, now });
    return this.s.teuOf.get(pid)?.teu ?? 0;
  }
}
