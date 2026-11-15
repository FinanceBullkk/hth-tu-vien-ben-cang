// Lưu trữ thú cưng trên cùng kết nối SQLite với Db: thú đã nở và độ thân thiết, thú đang dắt, bộ đếm bảo hiểm trứng.
// Ấp trứng (trừ TEU + bốc thú + lưu) và cho ăn (bỏ cá khỏi túi + cộng thân thiết) đều trong một transaction:
// không bao giờ mất TEU mà không có thú, hay mất cá mà thú không được ăn.
import { fishById } from '../shared/fish-catalog.js';
import { PET, PETS, PET_RARITY, clampBond, feedGain, nextPity } from '../shared/pets.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS pets (
  player_id TEXT NOT NULL,
  kind INTEGER NOT NULL,
  bond INTEGER NOT NULL DEFAULT 0,
  hatched INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, kind)
);
`;

class NotEnoughTeu extends Error {}

export class PetStore {
  /** @param {import('better-sqlite3').Database} sqlite */
  constructor(sqlite) {
    this.db = sqlite;
    this.db.exec(SCHEMA);
    // players.pet: thú đang dắt + 1 (0 là không dắt). players.pet_pity: số trứng liền chưa ra Linh thú trở lên.
    const have = new Set(this.db.pragma('table_info(players)').map((c) => c.name));
    for (const col of ['pet', 'pet_pity']) {
      if (!have.has(col)) this.db.exec(`ALTER TABLE players ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 0`);
    }
    const p = (sql) => this.db.prepare(sql);
    this.s = {
      list: p('SELECT kind,bond,hatched FROM pets WHERE player_id=? ORDER BY kind'),
      get: p('SELECT bond FROM pets WHERE player_id=? AND kind=?'),
      insert: p('INSERT INTO pets (player_id,kind,bond,hatched,created_at) VALUES (@pid,@kind,0,1,@now)'),
      bump: p('UPDATE pets SET bond=MIN(@max,bond+@gain), hatched=hatched+1 WHERE player_id=@pid AND kind=@kind'),
      addBond: p('UPDATE pets SET bond=MIN(@max,bond+@gain) WHERE player_id=@pid AND kind=@kind'),
      pay: p('UPDATE players SET teu=teu-@price WHERE id=@pid AND teu>=@price'),
      teuLog: p('INSERT INTO teu_log (player_id,amount,reason,local_date,created_at) VALUES (@pid,@amount,@reason,@date,@now)'),
      meta: p('SELECT pet,pet_pity FROM players WHERE id=?'),
      setPity: p('UPDATE players SET pet_pity=@pity WHERE id=@pid'),
      setActive: p('UPDATE players SET pet=@pet WHERE id=@pid'),
      takeFish: p("DELETE FROM bag_items WHERE id=@id AND player_id=@pid AND locked=0 AND kind='fish' RETURNING ref"),
    };

    this.hatchTx = this.db.transaction(({ pid, price, date, now, pick }) => {
      if (this.s.pay.run({ pid, price }).changes === 0) throw new NotEnoughTeu();
      this.s.teuLog.run({ pid, amount: -price, reason: 'pet:egg', date, now });
      const pity = this.s.meta.get(pid)?.pet_pity ?? 0;
      const kind = pick(pity);
      const had = this.s.get.get(pid, kind);
      const gained = had ? Math.min(PET_RARITY[PETS[kind].rarity].dup, PET.bondMax - had.bond) : 0;
      if (had) this.s.bump.run({ pid, kind, gain: gained, max: PET.bondMax });
      else this.s.insert.run({ pid, kind, now });
      const after = nextPity(pity, kind);
      this.s.setPity.run({ pid, pity: after });
      return { kind, dup: Boolean(had), gained, bond: this.s.get.get(pid, kind).bond, pity: after };
    });

    this.feedTx = this.db.transaction(({ pid, kind, id }) => {
      const had = this.s.get.get(pid, kind);
      if (!had) return { ok: false, reason: 'notOwned' };
      if (had.bond >= PET.bondMax) return { ok: false, reason: 'full' };
      const fish = this.s.takeFish.get({ id, pid });
      if (!fish) return { ok: false, reason: 'noFish' };
      const rarity = fishById(fish.ref)?.rarity ?? 1;
      const gained = Math.min(feedGain(rarity), PET.bondMax - had.bond);
      this.s.addBond.run({ pid, kind, gain: gained, max: PET.bondMax });
      return { ok: true, rarity, ref: fish.ref, gained, bond: had.bond + gained };
    });
  }

  /** Thú đã nở của một người: [{ kind, bond, hatched }], bỏ qua id lạ (thú đã bỏ khỏi bảng). */
  list(pid) {
    return this.s.list.all(pid).filter((r) => PETS[r.kind]).map((r) => ({ kind: r.kind, bond: clampBond(r.bond), hatched: r.hatched }));
  }

  bond(pid, kind) {
    return this.s.get.get(pid, kind)?.bond ?? null;
  }

  /** Thú đang dắt (-1 nếu không dắt, hoặc thú không còn sở hữu) và bộ đếm bảo hiểm. */
  meta(pid) {
    const row = this.s.meta.get(pid);
    const kind = (row?.pet ?? 0) - 1;
    const active = kind >= 0 && this.bond(pid, kind) !== null ? kind : -1;
    return { active, pity: row?.pet_pity ?? 0 };
  }

  setActive(pid, kind) {
    this.s.setActive.run({ pid, pet: kind + 1 });
  }

  /**
   * Ấp một trứng giá price. pick(pity) trả về id thú (server bốc ngẫu nhiên, test dựng sẵn).
   * Thiếu TEU thì không trừ gì và trả { poor: true }.
   */
  hatch(pid, price, date, pick, now = Date.now()) {
    try {
      return { ok: true, ...this.hatchTx({ pid, price, date, now, pick }) };
    } catch (err) {
      if (err instanceof NotEnoughTeu) return { ok: false, poor: true };
      throw err;
    }
  }

  /** Cho thú kind ăn con cá id trong túi. reason khi lỗi: notOwned, full, noFish. */
  feed(pid, kind, id) {
    return this.feedTx({ pid, kind, id });
  }
}
