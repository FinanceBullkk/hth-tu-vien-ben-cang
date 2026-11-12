// Lưu trữ bầu cua trên cùng kết nối SQLite với Db: trừ tiền cược và trả thưởng bằng TEU.
// Không có bảng riêng: số dư nằm ở players.teu, mọi lần cộng/trừ ghi vào teu_log như cửa hàng.
// Mọi thao tác nằm trong transaction nên TEU không bao giờ âm và không bị trừ hai lần.
import { BAUCUA } from '../shared/baucua.js';

export class BauCuaStore {
  /** @param {import('better-sqlite3').Database} sqlite */
  constructor(sqlite) {
    this.db = sqlite;
    const p = (sql) => this.db.prepare(sql);
    this.s = {
      pay: p('UPDATE players SET teu=teu-@amount WHERE id=@pid AND teu>=@amount'),
      bump: p('UPDATE players SET teu=teu+@amount WHERE id=@pid'),
      teuLog: p('INSERT INTO teu_log (player_id,amount,reason,local_date,created_at) VALUES (@pid,@amount,@reason,@date,@now)'),
      teuOf: p('SELECT teu FROM players WHERE id=?'),
    };
    this.stakeTx = this.db.transaction(({ pid, amount, date, now }) => {
      if (this.s.pay.run({ pid, amount }).changes === 0) return false;
      this.s.teuLog.run({ pid, amount: -amount, reason: 'baucua:bet', date, now });
      return true;
    });
    this.creditTx = this.db.transaction(({ pid, returned, profit, date, now }) => {
      if (returned > 0) {
        this.s.bump.run({ pid, amount: returned });
        this.s.teuLog.run({ pid, amount: returned, reason: BAUCUA.returnReason, date, now });
      }
      if (profit > 0) {
        this.s.bump.run({ pid, amount: profit });
        this.s.teuLog.run({ pid, amount: profit, reason: 'baucua:win', date, now });
      }
    });
  }

  teu(pid) {
    return this.s.teuOf.get(pid)?.teu ?? 0;
  }

  /** Trừ tiền cược; không đủ TEU thì không đổi gì. */
  stake(pid, amount, date, now = Date.now()) {
    const ok = this.stakeTx({ pid, amount, date, now });
    return { ok, teu: this.teu(pid) };
  }

  /**
   * Trả tiền sau ván. returned là phần tiền cược hoàn lại (không lên bảng tuần),
   * profit là phần lãi ròng (lên bảng tuần như TEU kiếm được ở các hoạt động khác).
   */
  credit(pid, returned, profit, date, now = Date.now()) {
    if (returned <= 0 && profit <= 0) return this.teu(pid);
    this.creditTx({ pid, returned, profit, date, now });
    return this.teu(pid);
  }
}
