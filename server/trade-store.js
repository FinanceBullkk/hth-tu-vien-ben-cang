// Kho giao dịch trên cùng kết nối SQLite với Db: hoán đổi món sở hữu và TEU giữa hai người trong một transaction.
// Thiếu món, bên nhận đã có món, hay thiếu TEU thì huỷ cả lượt: không ai mất đồ hay mất TEU oan, TEU không bao giờ âm.
// TEU ghi teu_log với lý do "trade:give" (số âm) và "trade:get" (số dương); bảng tuần bỏ qua tiền tố "trade:".

export class TradeStore {
  /** @param {import('better-sqlite3').Database} sqlite */
  constructor(sqlite) {
    this.db = sqlite;
    const p = (sql) => this.db.prepare(sql);
    this.s = {
      take: p('DELETE FROM owned_items WHERE player_id=? AND item_id=?'),
      give: p("INSERT OR IGNORE INTO owned_items (player_id,item_id,source,created_at) VALUES (?,?,'trade',?)"),
      pay: p('UPDATE players SET teu=teu-@amount WHERE id=@pid AND teu>=@amount'),
      bump: p('UPDATE players SET teu=teu+@amount WHERE id=@pid'),
      teuLog: p('INSERT INTO teu_log (player_id,amount,reason,local_date,created_at) VALUES (@pid,@amount,@reason,@date,@now)'),
    };
    this.swapTx = this.db.transaction((a, b, date, now) => {
      for (const [from, to] of [[a, b], [b, a]]) {
        for (const item of from.items) {
          if (this.s.take.run(from.pid, item).changes === 0) throw new TradeFail('missing', from.pid, item);
          if (this.s.give.run(to.pid, item, now).changes === 0) throw new TradeFail('owned', to.pid, item);
        }
        if (from.teu > 0) {
          if (this.s.pay.run({ pid: from.pid, amount: from.teu }).changes === 0) throw new TradeFail('poor', from.pid);
          this.s.bump.run({ pid: to.pid, amount: from.teu });
          this.s.teuLog.run({ pid: from.pid, amount: -from.teu, reason: 'trade:give', date, now });
          this.s.teuLog.run({ pid: to.pid, amount: from.teu, reason: 'trade:get', date, now });
        }
      }
    });
  }

  /**
   * Đổi đề nghị của a lấy đề nghị của b.
   * @param {{pid: string, items: string[], teu: number}} a
   * @param {{pid: string, items: string[], teu: number}} b
   * @returns {{ok: true} | {ok: false, reason: 'missing'|'owned'|'poor', pid: string, item?: string}}
   */
  swap(a, b, date, now = Date.now()) {
    try {
      this.swapTx(a, b, date, now);
      return { ok: true };
    } catch (err) {
      if (err instanceof TradeFail) return { ok: false, reason: err.reason, pid: err.pid, item: err.item };
      throw err;
    }
  }
}

class TradeFail extends Error {
  constructor(reason, pid, item) {
    super(reason);
    this.reason = reason;
    this.pid = pid;
    this.item = item;
  }
}
