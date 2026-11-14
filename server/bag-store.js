// Lưu trữ túi đồ trên cùng kết nối SQLite với Db: mỗi dòng là một món (hiện chỉ có cá) kèm giá bán đã chốt lúc câu.
// Giá nằm sẵn trong dòng nên bán là cộng thẳng, đổi bảng giá về sau không làm đổi giá cá người chơi đang giữ.
// Bán và cộng TEU chung một transaction: không bao giờ mất cá mà không nhận tiền, hay bán một con hai lần.

const SCHEMA = `
CREATE TABLE IF NOT EXISTS bag_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  ref TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  price INTEGER NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  locked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bag_items_player ON bag_items(player_id, id);
`;

/** Dòng DB thành món gửi client. Không kèm player_id: id món chỉ có nghĩa trong túi của chính người đó. */
export const publicBagItem = (row) => ({
  id: row.id,
  kind: row.kind,
  ref: row.ref,
  weight: row.weight,
  price: row.price,
  tags: row.tags ? row.tags.split(',') : [],
  locked: Boolean(row.locked),
  at: row.created_at,
});

export class BagStore {
  /** @param {import('better-sqlite3').Database} sqlite */
  constructor(sqlite) {
    this.db = sqlite;
    this.db.exec(SCHEMA);
    const p = (sql) => this.db.prepare(sql);
    this.s = {
      list: p('SELECT * FROM bag_items WHERE player_id=? ORDER BY id'),
      count: p('SELECT COUNT(*) c FROM bag_items WHERE player_id=?'),
      add: p(`INSERT INTO bag_items (player_id,kind,ref,weight,price,tags,created_at)
        VALUES (@pid,@kind,@ref,@weight,@price,@tags,@now) RETURNING *`),
      take: p('DELETE FROM bag_items WHERE id=@id AND player_id=@pid AND locked=0 RETURNING price'),
      lock: p('UPDATE bag_items SET locked=@locked WHERE id=@id AND player_id=@pid'),
      earn: p('UPDATE players SET teu=teu+@amount WHERE id=@pid'),
      teuLog: p('INSERT INTO teu_log (player_id,amount,reason,local_date,created_at) VALUES (@pid,@amount,@reason,@date,@now)'),
    };
    this.sellTx = this.db.transaction(({ pid, ids, date, now }) => {
      const sold = [];
      let gained = 0;
      for (const id of ids) {
        const row = this.s.take.get({ id, pid });
        if (!row) continue; // không phải của mình, đã bán, hoặc đang khoá
        sold.push(id);
        gained += row.price;
      }
      if (gained > 0) {
        this.s.earn.run({ pid, amount: gained });
        this.s.teuLog.run({ pid, amount: gained, reason: 'fish:sell', date, now });
      }
      return { sold, gained };
    });
  }

  list(pid) {
    return this.s.list.all(pid).map(publicBagItem);
  }

  count(pid) {
    return this.s.count.get(pid).c;
  }

  /** Bỏ một món vào túi; trả về món đã lưu (có id). Kiểm tra sức chứa là việc của nơi gọi. */
  add(pid, { kind = 'fish', ref, weight = 0, price, tags = [], now = Date.now() }) {
    return publicBagItem(this.s.add.get({ pid, kind, ref, weight, price, tags: tags.join(','), now }));
  }

  /** Bán các món theo id: bỏ qua món không có, của người khác hoặc đang khoá. */
  sell(pid, ids, date, now = Date.now()) {
    return this.sellTx({ pid, ids, date, now });
  }

  /** Khoá để không lỡ tay bán; trả false nếu món không có trong túi người này. */
  setLocked(pid, id, locked) {
    return this.s.lock.run({ pid, id, locked: locked ? 1 : 0 }).changes > 0;
  }
}
