// Lưu trữ bầu cua trên cùng kết nối SQLite với Db: trừ tiền cược, trả thưởng và hoàn cược bằng TEU.
// Số dư nằm ở players.teu, mọi lần cộng/trừ ghi vào teu_log (lý do bắt đầu bằng "baucua:").
// Cược chưa chấm còn ghi ở baucua_pending: server sập giữa ván thì lần khởi động sau hoàn lại, không ai mất TEU oan.
// Mọi thao tác nằm trong transaction nên TEU không bao giờ âm và không bị trừ hay hoàn hai lần.

/** Tiền tố lý do trong teu_log của mọi dòng bầu cua; bảng tuần dựa vào đây để tính lãi/lỗ ròng. */
export const BAUCUA_REASON = 'baucua:';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS baucua_pending (
  player_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  local_date TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_baucua_pending ON baucua_pending(player_id);
`;

export class BauCuaStore {
  /** @param {import('better-sqlite3').Database} sqlite */
  constructor(sqlite) {
    this.db = sqlite;
    this.db.exec(SCHEMA);
    const p = (sql) => this.db.prepare(sql);
    this.s = {
      pay: p('UPDATE players SET teu=teu-@amount WHERE id=@pid AND teu>=@amount'),
      bump: p('UPDATE players SET teu=teu+@amount WHERE id=@pid'),
      teuLog: p('INSERT INTO teu_log (player_id,amount,reason,local_date,created_at) VALUES (@pid,@amount,@reason,@date,@now)'),
      teuOf: p('SELECT teu FROM players WHERE id=?'),
      hold: p('INSERT INTO baucua_pending (player_id,amount,local_date,created_at) VALUES (@pid,@amount,@date,@now)'),
      heldOf: p('SELECT COALESCE(SUM(amount),0) total FROM baucua_pending WHERE player_id=?'),
      heldAll: p('SELECT player_id, SUM(amount) total, MIN(local_date) date FROM baucua_pending GROUP BY player_id'),
      release: p('DELETE FROM baucua_pending WHERE player_id=?'),
    };
    this.stakeTx = this.db.transaction(({ pid, amount, date, now }) => {
      if (this.s.pay.run({ pid, amount }).changes === 0) return false;
      this.s.teuLog.run({ pid, amount: -amount, reason: 'baucua:bet', date, now });
      this.s.hold.run({ pid, amount, date, now });
      return true;
    });
    this.settleTx = this.db.transaction(({ pid, returned, profit, date, now }) => {
      this.#credit(pid, returned, 'baucua:return', date, now);
      this.#credit(pid, profit, 'baucua:win', date, now);
      this.s.release.run(pid);
    });
    // Hoàn đúng số đang giữ trong DB (không tin số trong bộ nhớ), rồi xoá phần giữ.
    this.refundTx = this.db.transaction(({ pid, date, now }) => {
      const held = this.s.heldOf.get(pid).total;
      this.#credit(pid, held, 'baucua:return', date, now);
      this.s.release.run(pid);
      return held;
    });
  }

  #credit(pid, amount, reason, date, now) {
    if (amount <= 0) return;
    this.s.bump.run({ pid, amount });
    this.s.teuLog.run({ pid, amount, reason, date, now });
  }

  teu(pid) {
    return this.s.teuOf.get(pid)?.teu ?? 0;
  }

  /** TEU đang giữ cho cược chưa chấm của một người. */
  held(pid) {
    return this.s.heldOf.get(pid).total;
  }

  /** Trừ tiền cược và giữ lại chờ chấm; không đủ TEU thì không đổi gì. */
  stake(pid, amount, date, now = Date.now()) {
    const ok = this.stakeTx({ pid, amount, date, now });
    return { ok, teu: this.teu(pid) };
  }

  /**
   * Chấm xong một người: returned là phần tiền cược hoàn lại, profit là phần lãi ròng.
   * Thua trắng thì cả hai bằng 0, chỉ xoá phần giữ (tiền cược đã trừ lúc đặt).
   */
  settle(pid, returned, profit, date, now = Date.now()) {
    this.settleTx({ pid, returned, profit, date, now });
    return this.teu(pid);
  }

  /** Rút cược hoặc huỷ ván: hoàn toàn bộ phần đang giữ. */
  refund(pid, date, now = Date.now()) {
    const amount = this.refundTx({ pid, date, now });
    return { amount, teu: this.teu(pid) };
  }

  /** Khởi động lại sau khi sập giữa ván: hoàn mọi cược còn treo. Trả về số người được hoàn. */
  recover(now = Date.now()) {
    const rows = this.s.heldAll.all();
    for (const row of rows) this.refundTx({ pid: row.player_id, date: row.date, now });
    return rows.length;
  }
}
