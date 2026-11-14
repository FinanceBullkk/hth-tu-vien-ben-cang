// Lưu trữ cửa hàng trên cùng kết nối SQLite với Db: món đã sở hữu, mua bằng TEU, lưu ngoại hình từ tủ đồ.
// Tách khỏi db.js cho gọn; mọi thao tác trừ điểm đều nằm trong transaction nên TEU không bao giờ âm.
import { LOOK_SLOTS, isPaid, itemId } from '../shared/shop.js';
import { PREMIUM_COLORS, SHIRT_COLORS } from '../shared/protocol.js';
import { FISH } from '../shared/fish.js';

// Ván thắng tính cho hào quang Thần bài: các bàn có ván và nhà cái (lý do "<trò>:win" trong teu_log,
// chỉ ghi khi lãi ròng > 0). Không tính máy gạt cần: quay vài giây một lần nên cày quá dễ.
const TABLE_WIN_REASONS = ['baucua', 'xidach', 'taixiu', 'coquay'].map((game) => `${game}:win`);
const FISH_IDS = new Set(FISH.map((f) => f.id));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS owned_items (
  player_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_teu_player_reason ON teu_log(player_id, reason);
`;

// Tăng khi cần một lần di trú dữ liệu mới. Lưu trong PRAGMA user_version của file DB.
const SHOP_DB_VERSION = 1;

export class ShopStore {
  /** @param {import('better-sqlite3').Database} sqlite */
  constructor(sqlite, now = Date.now()) {
    this.db = sqlite;
    this.db.exec(SCHEMA);
    const p = (sql) => this.db.prepare(sql);
    this.s = {
      ownedOf: p('SELECT item_id FROM owned_items WHERE player_id=?'),
      grant: p('INSERT OR IGNORE INTO owned_items (player_id,item_id,source,created_at) VALUES (@pid,@item,@source,@now)'),
      pay: p('UPDATE players SET teu=teu-@price WHERE id=@pid AND teu>=@price'),
      teuLog: p('INSERT INTO teu_log (player_id,amount,reason,local_date,created_at) VALUES (@pid,@amount,@reason,@date,@now)'),
      teuOf: p('SELECT teu FROM players WHERE id=?'),
      setLook: p('UPDATE players SET color=@color,hair=@hair,hat=@hat,attire=@attire,weapon=@weapon,effect=@effect WHERE id=@pid'),
      tableWins: p(`SELECT COUNT(*) n FROM teu_log WHERE player_id=? AND reason IN (${TABLE_WIN_REASONS.map(() => '?').join(',')})`),
      fishSpecies: p('SELECT fish_id FROM fish_caught WHERE player_id=?'),
    };
    this.buyTx = this.db.transaction(({ pid, item, price, date, now: at }) => {
      if (this.s.grant.run({ pid, item, source: 'shop', now: at }).changes === 0) return { ok: false, owned: true };
      if (this.s.pay.run({ pid, price }).changes === 0) {
        // Không đủ TEU: huỷ cả lượt, kể cả dòng sở hữu vừa thêm.
        throw new NotEnoughTeu();
      }
      this.s.teuLog.run({ pid, amount: -price, reason: `shop:${item}`, date, now: at });
      return { ok: true };
    });
    this.#migrate(now);
  }

  // Một lần: màu quý đã mở bằng bitmask cũ thành món sở hữu; món nay trả phí mà ai đang mặc thì giữ cho người đó.
  #migrate(now) {
    const version = this.db.pragma('user_version', { simple: true });
    if (version >= SHOP_DB_VERSION) return;
    const premiumStart = SHIRT_COLORS.length - PREMIUM_COLORS.length;
    const rows = this.db.prepare('SELECT id,color,hair,hat,attire,weapon,effect,unlocked FROM players').all();
    this.db.transaction(() => {
      for (const row of rows) {
        PREMIUM_COLORS.forEach((_, i) => {
          if ((row.unlocked ?? 0) & (1 << i)) this.s.grant.run({ pid: row.id, item: itemId('color', premiumStart + i), source: 'unlock', now });
        });
        for (const slot of LOOK_SLOTS) {
          const item = itemId(slot, row[slot] ?? 0);
          if (isPaid(item)) this.s.grant.run({ pid: row.id, item, source: 'legacy', now });
        }
      }
      this.db.pragma(`user_version = ${SHOP_DB_VERSION}`);
    })();
  }

  /** @returns {Set<string>} */
  owned(pid) {
    return new Set(this.s.ownedOf.all(pid).map((r) => r.item_id));
  }

  teu(pid) {
    return this.s.teuOf.get(pid)?.teu ?? 0;
  }

  /** Tiến độ thành tích cho món có điều kiện (SHOP_REQUIREMENTS): số ván thắng ở sòng, số loài trong Sổ cá. */
  progress(pid) {
    const tableWins = this.s.tableWins.get(pid, ...TABLE_WIN_REASONS).n;
    const fishSpecies = this.s.fishSpecies.all(pid).filter((r) => FISH_IDS.has(r.fish_id)).length;
    return { tableWins, fishSpecies };
  }

  /** Mua một món: idempotent khi đã có, không trừ điểm khi thiếu TEU. */
  buy(pid, item, price, date, now = Date.now()) {
    try {
      const res = this.buyTx({ pid, item, price, date, now });
      return { ...res, teu: this.teu(pid) };
    } catch (err) {
      if (err instanceof NotEnoughTeu) return { ok: false, poor: true, teu: this.teu(pid) };
      throw err;
    }
  }

  saveLook(pid, look) {
    this.s.setLook.run({ pid, ...look });
  }
}

class NotEnoughTeu extends Error {}
