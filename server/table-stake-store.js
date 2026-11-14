// Tiền cược của các bàn đỏ đen (bầu cua, xì dách, tài xỉu, cò quay) và máy gạt cần trên cùng kết nối SQLite với Db: giữ tiền cược, trả thưởng, hoàn cược.
// Số dư nằm ở players.teu, mọi lần cộng/trừ ghi vào teu_log với lý do "<trò>:bet|return|win".
// Cược chưa chấm còn ghi ở bảng <trò>_pending: server sập giữa ván thì lần khởi động sau hoàn lại, không ai mất TEU oan.
// Mọi thao tác nằm trong transaction nên TEU không bao giờ âm và không bị trừ hay hoàn hai lần.

/** Các trò dùng kho này. Tên trò là tiền tố lý do trong teu_log; bảng tuần tính lãi/lỗ ròng theo tiền tố này. */
export const TABLE_GAMES = ['baucua', 'xidach', 'taixiu', 'coquay', 'slot', 'stone'];

export class TableStakeStore {
  /**
   * @param {import('better-sqlite3').Database} sqlite
   * @param {'baucua'|'xidach'|'taixiu'|'coquay'|'slot'|'stone'} game tên trò, đồng thời là tên bảng giữ tiền (<trò>_pending)
   */
  constructor(sqlite, game) {
    if (!TABLE_GAMES.includes(game)) throw new Error(`Trò không có trong TABLE_GAMES: ${game}`);
    this.db = sqlite;
    this.game = game;
    const table = `${game}_pending`;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${table} (
        player_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        local_date TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_${table} ON ${table}(player_id);
    `);
    const p = (sql) => this.db.prepare(sql);
    this.s = {
      pay: p('UPDATE players SET teu=teu-@amount WHERE id=@pid AND teu>=@amount'),
      bump: p('UPDATE players SET teu=teu+@amount WHERE id=@pid'),
      teuLog: p('INSERT INTO teu_log (player_id,amount,reason,local_date,created_at) VALUES (@pid,@amount,@reason,@date,@now)'),
      teuOf: p('SELECT teu FROM players WHERE id=?'),
      hold: p(`INSERT INTO ${table} (player_id,amount,local_date,created_at) VALUES (@pid,@amount,@date,@now)`),
      heldOf: p(`SELECT COALESCE(SUM(amount),0) total FROM ${table} WHERE player_id=?`),
      heldAll: p(`SELECT player_id, SUM(amount) total, MIN(local_date) date FROM ${table} GROUP BY player_id`),
      release: p(`DELETE FROM ${table} WHERE player_id=?`),
    };
    this.stakeTx = this.db.transaction(({ pid, amount, date, now }) => {
      if (this.s.pay.run({ pid, amount }).changes === 0) return false;
      this.s.teuLog.run({ pid, amount: -amount, reason: `${game}:bet`, date, now });
      this.s.hold.run({ pid, amount, date, now });
      return true;
    });
    this.settleTx = this.db.transaction(({ pid, returned, profit, date, now }) => {
      this.#credit(pid, returned, `${game}:return`, date, now);
      this.#credit(pid, profit, `${game}:win`, date, now);
      this.s.release.run(pid);
    });
    // Hoàn đúng số đang giữ trong DB (không tin số trong bộ nhớ), rồi xoá phần giữ.
    this.refundTx = this.db.transaction(({ pid, date, now }) => {
      const held = this.s.heldOf.get(pid).total;
      this.#credit(pid, held, `${game}:return`, date, now);
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

  /** Trừ tiền và giữ lại chờ chấm; không đủ TEU thì không đổi gì. */
  stake(pid, amount, date, now = Date.now()) {
    const ok = this.stakeTx({ pid, amount, date, now });
    return { ok, teu: this.teu(pid) };
  }

  /**
   * Chấm xong một người: returned là phần đang giữ được hoàn lại, profit là phần lãi ròng.
   * Thua trắng thì cả hai bằng 0, chỉ xoá phần giữ (tiền đã trừ lúc đặt).
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
