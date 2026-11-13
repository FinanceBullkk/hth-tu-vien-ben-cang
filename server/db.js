// Lớp dữ liệu SQLite: người chơi, lời ước, quẻ, điểm Tâm an, sự kiện chuông, thống kê ngày.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { pkTitleMask } from '../shared/pk.js';
import { cultivationProgress, QI_INTERVAL_MS } from '../shared/cultivation.js';
import { TABLE_GAMES, TableStakeStore } from './table-stake-store.js';
import { ShopStore } from './shop-store.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color INTEGER NOT NULL DEFAULT 0,
  hat INTEGER NOT NULL DEFAULT 0,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  bell_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS wishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  place TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  local_date TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_wishes_place ON wishes(place, hidden, id DESC);
CREATE INDEX IF NOT EXISTS idx_wishes_player ON wishes(player_id, local_date);
CREATE TABLE IF NOT EXISTS wish_likes (
  wish_id INTEGER NOT NULL REFERENCES wishes(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  PRIMARY KEY (wish_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_player ON wish_likes(player_id);
CREATE TABLE IF NOT EXISTS fortunes (
  player_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  text TEXT NOT NULL,
  bl_number TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, local_date)
);
CREATE TABLE IF NOT EXISTS meditations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_med_player ON meditations(player_id, id DESC);
CREATE TABLE IF NOT EXISTS bell_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  participants INTEGER NOT NULL,
  on_beat INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS bell_event_players (
  event_id INTEGER NOT NULL REFERENCES bell_events(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  PRIMARY KEY (event_id, player_id)
);
CREATE TABLE IF NOT EXISTS daily_stats (
  local_date TEXT PRIMARY KEY,
  visits INTEGER NOT NULL DEFAULT 0,
  wishes INTEGER NOT NULL DEFAULT 0,
  bells INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS fish_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  fish_id TEXT NOT NULL,
  weight REAL NOT NULL,
  grade TEXT NOT NULL,
  local_date TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fish_log_week ON fish_log(local_date, weight DESC);
CREATE TABLE IF NOT EXISTS fish_caught (
  player_id TEXT NOT NULL,
  fish_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  best_weight REAL NOT NULL DEFAULT 0,
  first_caught_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, fish_id)
);
CREATE TABLE IF NOT EXISTS pitch_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  rank TEXT NOT NULL,
  local_date TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pitch_week ON pitch_scores(local_date, score DESC);
CREATE TABLE IF NOT EXISTS teu_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  local_date TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_teu_week ON teu_log(local_date, player_id);
CREATE TABLE IF NOT EXISTS riddle_daily (
  player_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, local_date)
);
CREATE TABLE IF NOT EXISTS pk_matches (
  id TEXT PRIMARY KEY,
  winner_id TEXT,
  loser_id TEXT,
  draw INTEGER NOT NULL DEFAULT 0,
  local_date TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pk_matches_week ON pk_matches(local_date, winner_id);
`;

function publicWish(row, playerId) {
  return {
    id: row.id,
    place: row.place,
    text: row.text,
    author: row.author,
    likes: row.likes,
    createdAt: row.created_at,
    mine: row.player_id === playerId,
    liked: Boolean(row.liked),
  };
}

export class Db {
  constructor(file) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    // Ghi ít, chỉ vài chục người: giữ journal mặc định để backup chỉ cần copy một file .db.
    this.db.pragma('journal_mode = DELETE');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA);
    this.#migrate();
    this.#prepare();
    this.shop = new ShopStore(this.db);
    this.baucua = new TableStakeStore(this.db, 'baucua');
    this.xidach = new TableStakeStore(this.db, 'xidach');
    this.taixiu = new TableStakeStore(this.db, 'taixiu');
    this.coquay = new TableStakeStore(this.db, 'coquay');
    /** Gán từ Room: báo số dư TEU mới để đẩy ví cho người chơi. */
    this.onTeu = null;
  }

  // CREATE TABLE IF NOT EXISTS không thêm cột cho DB cũ: kiểm tra rồi ALTER từng cột cosmetic.
  #migrate() {
    const have = new Set(this.db.pragma('table_info(players)').map((c) => c.name));
    for (const col of ['hair', 'attire', 'weapon', 'effect', 'teu', 'riddle_correct', 'pitch_best', 'unlocked', 'cultivation_ms', 'cultivation_tier', 'pk_wins', 'pk_losses', 'pk_title_mask', 'pk_title']) {
      if (!have.has(col)) this.db.exec(`ALTER TABLE players ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 0`);
    }
  }

  #prepare() {
    const p = (sql) => this.db.prepare(sql);
    this.s = {
      upsertPlayer: p(`INSERT INTO players (id,name,color,hair,hat,attire,weapon,effect,first_seen,last_seen,visits)
        VALUES (@id,@name,@color,@hair,@hat,@attire,@weapon,@effect,@now,@now,@inc)
        ON CONFLICT(id) DO UPDATE SET name=@name,color=@color,hair=@hair,hat=@hat,attire=@attire,weapon=@weapon,effect=@effect,last_seen=@now,visits=visits+@inc`),
      player: p('SELECT * FROM players WHERE id=?'),
      cultivate: p('UPDATE players SET cultivation_ms=cultivation_ms+? WHERE id=? RETURNING cultivation_ms'),
      bumpBell: p('UPDATE players SET bell_count=bell_count+1 WHERE id=?'),
      stat: p(`INSERT INTO daily_stats (local_date,visits,wishes,bells) VALUES (@d,@v,@w,@b)
        ON CONFLICT(local_date) DO UPDATE SET visits=visits+@v,wishes=wishes+@w,bells=bells+@b`),
      statGet: p('SELECT * FROM daily_stats WHERE local_date=?'),
      wishInsert: p(`INSERT INTO wishes (player_id,author,text,place,created_at,local_date)
        VALUES (@playerId,@author,@text,@place,@now,@date)`),
      wishCountToday: p('SELECT COUNT(*) c FROM wishes WHERE player_id=? AND local_date=?'),
      wishCountAllToday: p('SELECT COUNT(*) c FROM wishes WHERE local_date=?'),
      playerExists: p('SELECT 1 FROM players WHERE id=?'),
      wishById: p('SELECT * FROM wishes WHERE id=?'),
      wishDelete: p('DELETE FROM wishes WHERE id=? AND player_id=?'),
      wishLatestByPlace: p(`SELECT w.*, (l.player_id IS NOT NULL) liked FROM wishes w
        LEFT JOIN wish_likes l ON l.wish_id=w.id AND l.player_id=@playerId
        WHERE w.place=@place AND w.hidden=0 ORDER BY w.id DESC LIMIT @limit`),
      wishPage: p(`SELECT w.*, (l.player_id IS NOT NULL) liked FROM wishes w
        LEFT JOIN wish_likes l ON l.wish_id=w.id AND l.player_id=@playerId
        WHERE w.hidden=0 AND w.id<@before ORDER BY w.id DESC LIMIT @limit`),
      wishesOf: p(`SELECT * FROM wishes WHERE player_id=? ORDER BY id DESC LIMIT 200`),
      likeInsert: p('INSERT OR IGNORE INTO wish_likes (wish_id,player_id) VALUES (?,?)'),
      likeBump: p('UPDATE wishes SET likes=likes+1 WHERE id=?'),
      setHidden: p('UPDATE wishes SET hidden=? WHERE id=?'),
      adminWishes: p(`SELECT id,author,text,place,created_at,likes,hidden FROM wishes
        WHERE (@q='' OR author LIKE @like ESCAPE '\\') ORDER BY id DESC LIMIT @limit`),
      wishTotal: p('SELECT COUNT(*) c FROM wishes'),
      fortuneGet: p('SELECT * FROM fortunes WHERE player_id=? AND local_date=?'),
      fortuneInsert: p(`INSERT INTO fortunes (player_id,local_date,text,bl_number,created_at)
        VALUES (@playerId,@date,@text,@bl,@now)`),
      fortunesOf: p('SELECT local_date,text,bl_number FROM fortunes WHERE player_id=? ORDER BY local_date DESC LIMIT 100'),
      medInsert: p('INSERT INTO meditations (player_id,score,created_at) VALUES (?,?,?)'),
      medStats: p(`SELECT COUNT(*) sessions, MAX(score) best, COALESCE(SUM(score), 0) points,
        (SELECT score FROM meditations m2 WHERE m2.player_id=m.player_id ORDER BY id DESC LIMIT 1) last
        FROM meditations m WHERE player_id=?`),
      bellEventInsert: p('INSERT INTO bell_events (at,participants,on_beat) VALUES (?,?,?)'),
      bellEventPlayer: p('INSERT OR IGNORE INTO bell_event_players (event_id,player_id) VALUES (?,?)'),
      bellEventsOf: p('SELECT COUNT(*) c FROM bell_event_players WHERE player_id=?'),
      // TEU: mỗi lần cộng/trừ đều ghi log; bảng tuần cộng phần kiếm được (số dương), tiêu ở sạp không bị trừ hạng.
      // Riêng các bàn đỏ đen (lý do "baucua:...", "xidach:...") tính đủ cả cược, hoàn và thắng, tức lãi/lỗ ròng cả tuần:
      // nếu chỉ cộng ván thắng thì cứ cược nhiều là lên hạng dù TEU đang hao.
      teuInsert: p('INSERT INTO teu_log (player_id,amount,reason,local_date,created_at) VALUES (@pid,@amount,@reason,@date,@now)'),
      teuBump: p('UPDATE players SET teu=teu+@amount WHERE id=@pid'),
      teuDayReason: p('SELECT COALESCE(SUM(amount), 0) teu FROM teu_log WHERE player_id=? AND local_date=? AND reason=?'),
      teuWeekTop: p(`SELECT t.player_id, pl.name, SUM(t.amount) teu FROM teu_log t
        JOIN players pl ON pl.id = t.player_id
        WHERE t.local_date >= @since AND t.reason <> 'welcome' AND (t.amount > 0 ${TABLE_GAMES.map((g) => `OR t.reason LIKE '${g}:%'`).join(' ')})
        GROUP BY t.player_id HAVING teu > 0 ORDER BY teu DESC, pl.name LIMIT 10`),
      // Cá: log từng con + tổng hợp bộ sưu tập.
      fishLogInsert: p(`INSERT INTO fish_log (player_id,fish_id,weight,grade,local_date,created_at)
        VALUES (@pid,@fishId,@weight,@grade,@date,@now)`),
      fishCaughtUpsert: p(`INSERT INTO fish_caught (player_id,fish_id,count,best_weight,first_caught_at)
        VALUES (@pid,@fishId,1,@weight,@now)
        ON CONFLICT(player_id,fish_id) DO UPDATE SET count=count+1,
          best_weight=MAX(best_weight,@weight)`),
      fishHasCaught: p('SELECT 1 FROM fish_caught WHERE player_id=? AND fish_id=?'),
      fishCaughtOf: p('SELECT fish_id,count,best_weight,first_caught_at FROM fish_caught WHERE player_id=? ORDER BY first_caught_at'),
      fishWeekTop: p(`SELECT f.player_id, pl.name, f.fish_id, f.weight, f.local_date FROM fish_log f
        JOIN players pl ON pl.id = f.player_id
        WHERE f.local_date >= @since ORDER BY f.weight DESC, f.id ASC LIMIT 10`),
      // Đầu hồ: điểm theo trận.
      pitchInsert: p(`INSERT INTO pitch_scores (player_id,score,rank,local_date,created_at)
        VALUES (@pid,@score,@rank,@date,@now)`),
      pitchBestBump: p('UPDATE players SET pitch_best=MAX(pitch_best,@score) WHERE id=@pid'),
      pitchBest: p('SELECT MAX(score) best, COUNT(*) plays FROM pitch_scores WHERE player_id=?'),
      pitchWeekTop: p(`SELECT s.player_id, pl.name, MAX(s.score) score FROM pitch_scores s
        JOIN players pl ON pl.id = s.player_id
        WHERE s.local_date >= @since GROUP BY s.player_id ORDER BY score DESC, pl.name LIMIT 10`),
      // Đố: đếm lượt trong ngày.
      riddleDayUpsert: p(`INSERT INTO riddle_daily (player_id,local_date,attempts,correct) VALUES (@pid,@date,@att,@cor)
        ON CONFLICT(player_id,local_date) DO UPDATE SET attempts=attempts+@att, correct=correct+@cor`),
      riddleDayGet: p('SELECT attempts, correct FROM riddle_daily WHERE player_id=? AND local_date=?'),
      riddleCorrectBump: p('UPDATE players SET riddle_correct=riddle_correct+1 WHERE id=?'),
      pkMatchInsert: p(`INSERT OR IGNORE INTO pk_matches (id,winner_id,loser_id,draw,local_date,created_at)
        VALUES (@id,@winner,@loser,@draw,@date,@now)`),
      pkWin: p('UPDATE players SET pk_wins=pk_wins+1, pk_title_mask=@mask WHERE id=@pid'),
      pkLoss: p('UPDATE players SET pk_losses=pk_losses+1 WHERE id=?'),
      pkStats: p('SELECT pk_wins wins,pk_losses losses,pk_title_mask titleMask,pk_title title,cultivation_tier tier FROM players WHERE id=?'),
      pkTitle: p('UPDATE players SET pk_title=? WHERE id=? AND (pk_title_mask & ?) != 0'),
      pkWeekTop: p(`SELECT p.id player_id,p.name,p.pk_wins wins,p.pk_losses losses,
        SUM(CASE WHEN m.winner_id=p.id THEN 1 ELSE 0 END) weekWins,
        SUM(CASE WHEN m.loser_id=p.id THEN 1 ELSE 0 END) weekLosses
        FROM players p JOIN pk_matches m ON m.winner_id=p.id OR m.loser_id=p.id
        WHERE m.local_date>=@since GROUP BY p.id ORDER BY weekWins DESC, weekLosses ASC, p.name LIMIT 10`),
    };
    this.teuTx = this.db.transaction((pid, amount, reason, date, now) => {
      if (amount > 0) {
        this.s.teuInsert.run({ pid, amount, reason, date, now });
        this.s.teuBump.run({ pid, amount });
      }
    });
    this.likeTx = this.db.transaction((wishId, playerId) => {
      const res = this.s.likeInsert.run(wishId, playerId);
      if (res.changes) this.s.likeBump.run(wishId);
      return res.changes > 0;
    });
    this.bellEventTx = this.db.transaction((at, players, onBeat) => {
      const id = this.s.bellEventInsert.run(at, players.length, onBeat).lastInsertRowid;
      for (const pid of players) this.s.bellEventPlayer.run(id, pid);
      return id;
    });
    this.pkResultTx = this.db.transaction((result) => {
      const inserted = this.s.pkMatchInsert.run(result).changes > 0;
      if (!inserted || result.draw) return inserted;
      const wins = (this.s.pkStats.get(result.winner)?.wins ?? 0) + 1;
      this.s.pkWin.run({ pid: result.winner, mask: pkTitleMask(wins) });
      this.s.pkLoss.run(result.loser);
      return true;
    });
  }

  touchPlayer({ id, name, color, hair = 0, hat, attire = 0, weapon = 0, effect = 0, now, isVisit }) {
    this.s.upsertPlayer.run({ id, name, color, hair, hat, attire, weapon, effect, now, inc: isVisit ? 1 : 0 });
  }

  playerRow(id) {
    return this.s.player.get(id);
  }

  bumpStat(date, { visits = 0, wishes = 0, bells = 0 }) {
    this.s.stat.run({ d: date, v: visits, w: wishes, b: bells });
  }

  statsFor(date) {
    return this.s.statGet.get(date) || { local_date: date, visits: 0, wishes: 0, bells: 0 };
  }

  addWish(w) {
    const id = this.s.wishInsert.run(w).lastInsertRowid;
    return this.s.wishById.get(id);
  }

  wishCountToday(playerId, date) {
    return this.s.wishCountToday.get(playerId, date).c;
  }

  wishCountAllToday(date) {
    return this.s.wishCountAllToday.get(date).c;
  }

  hasPlayer(id) {
    return Boolean(this.s.playerExists.get(id));
  }

  getWish(id) {
    return this.s.wishById.get(id);
  }

  deleteWish(id, playerId) {
    return this.s.wishDelete.run(id, playerId).changes > 0;
  }

  latestWishes(place, limit, playerId) {
    return this.s.wishLatestByPlace.all({ place, limit, playerId: playerId ?? '' }).map((r) => publicWish(r, playerId));
  }

  wishPage(before, limit, playerId) {
    return this.s.wishPage.all({ before, limit, playerId: playerId ?? '' }).map((r) => publicWish(r, playerId));
  }

  publicWish(row, playerId) {
    return publicWish(row, playerId);
  }

  likeWish(wishId, playerId) {
    return this.likeTx(wishId, playerId);
  }

  setWishHidden(id, hidden) {
    return this.s.setHidden.run(hidden ? 1 : 0, id).changes > 0;
  }

  adminWishes(q, limit) {
    const escaped = q.replace(/[\\%_]/g, '\\$&');
    return this.s.adminWishes.all({ q, like: `%${escaped}%`, limit });
  }

  wishTotal() {
    return this.s.wishTotal.get().c;
  }

  getFortune(playerId, date) {
    return this.s.fortuneGet.get(playerId, date);
  }

  addFortune(f) {
    this.s.fortuneInsert.run(f);
  }

  addMeditation(playerId, score, now) {
    this.s.medInsert.run(playerId, score, now);
  }

  cultivation(playerId) {
    return cultivationProgress(this.s.medStats.get(playerId).points);
  }

  addCultivation(playerId, ms) {
    if (!Number.isSafeInteger(ms) || ms < 0) throw new RangeError('Invalid cultivation interval');
    const row = this.s.cultivate.get(ms, playerId);
    if (!row) throw new Error('Cultivation player missing');
    return row.cultivation_ms;
  }

  bumpBell(playerId) {
    this.s.bumpBell.run(playerId);
  }

  recordBellEvent(at, players, onBeat) {
    return this.bellEventTx(at, players, onBeat);
  }

  addTeu(playerId, amount, reason, date, now = Date.now()) {
    this.teuTx(playerId, amount, reason, date, now);
    if (amount > 0) this.onTeu?.(playerId, this.shop.teu(playerId));
  }

  /** Tổng TEU nhận trong một ngày theo một lý do (vd. "meditate"), dùng cho trần mỗi ngày. */
  teuToday(playerId, reason, date) {
    return this.s.teuDayReason.get(playerId, date, reason)?.teu ?? 0;
  }

  fishCatch(playerId, fishId, weight, grade, date, now = Date.now()) {
    this.s.fishLogInsert.run({ pid: playerId, fishId, weight, grade, date, now });
    this.s.fishCaughtUpsert.run({ pid: playerId, fishId, weight, now });
  }

  hasCaught(playerId, fishId) {
    return Boolean(this.s.fishHasCaught.get(playerId, fishId));
  }

  fishCollection(playerId) {
    return this.s.fishCaughtOf.all(playerId);
  }

  addPitchScore(playerId, score, rank, date, now = Date.now()) {
    this.s.pitchInsert.run({ pid: playerId, score, rank, date, now });
    this.s.pitchBestBump.run({ pid: playerId, score });
  }

  pitchBest(playerId) {
    return this.s.pitchBest.get(playerId) || { best: null, plays: 0 };
  }

  riddleAttemptsToday(playerId, date) {
    return this.s.riddleDayGet.get(playerId, date)?.attempts ?? 0;
  }

  addRiddleAttempt(playerId, date) {
    this.s.riddleDayUpsert.run({ pid: playerId, date, att: 1, cor: 0 });
  }

  addRiddleCorrect(playerId, date) {
    this.s.riddleDayUpsert.run({ pid: playerId, date, att: 0, cor: 1 });
    this.s.riddleCorrectBump.run(playerId);
  }

  /** Bảng xếp hạng tuần: tính từ thứ Hai của tuần hiện tại theo múi giờ game. */
  weekly(weekStart) {
    // playerId là bí mật (ai biết là vào được tài khoản): bảng công khai chỉ giữ tên và điểm.
    const pub = (rows) => rows.map(({ player_id: _secret, ...row }) => row);
    return {
      teu: pub(this.s.teuWeekTop.all({ since: weekStart })),
      fish: pub(this.s.fishWeekTop.all({ since: weekStart })),
      pitch: pub(this.s.pitchWeekTop.all({ since: weekStart })),
      pk: pub(this.s.pkWeekTop.all({ since: weekStart })),
    };
  }

  /** Toàn bộ dữ liệu cho "Sổ an của tôi". */
  book(playerId) {
    const player = this.s.player.get(playerId);
    if (!player) return null;
    const med = this.s.medStats.get(playerId);
    const pitch = this.s.pitchBest.get(playerId) || { best: null, plays: 0 };
    return {
      name: player.name,
      visits: player.visits,
      bellCount: player.bell_count,
      bellEvents: this.s.bellEventsOf.get(playerId).c,
      teu: player.teu ?? 0,
      qi: Math.floor((player.cultivation_ms ?? 0) / QI_INTERVAL_MS),
      riddleCorrect: player.riddle_correct ?? 0,
      pitch: { best: pitch.best, plays: pitch.plays },
      pk: this.pkStats(playerId),
      fish: this.s.fishCaughtOf.all(playerId).map((f) => ({ id: f.fish_id, count: f.count, best: f.best_weight, firstAt: f.first_caught_at })),
      meditation: { sessions: med.sessions, best: med.best, last: med.last },
      cultivation: cultivationProgress(med.points),
      wishes: this.s.wishesOf.all(playerId).map((r) => ({
        id: r.id,
        text: r.text,
        place: r.place,
        likes: r.likes,
        createdAt: r.created_at,
        hidden: Boolean(r.hidden),
      })),
      fortunes: this.s.fortunesOf.all(playerId).map((f) => ({
        date: f.local_date,
        text: f.text,
        bl: f.bl_number,
      })),
    };
  }

  pkStats(playerId) {
    return this.s.pkStats.get(playerId) ?? { wins: 0, losses: 0, titleMask: 0, title: 0, tier: 0 };
  }

  recordPkResult({ id, winner = null, loser = null, draw = false, date, now = Date.now() }) {
    return this.pkResultTx({ id, winner, loser, draw: draw ? 1 : 0, date, now });
  }

  setPkTitle(playerId, bit) {
    const n = Number(bit);
    if (![0, 1, 2, 4, 8].includes(n)) return false;
    if (n === 0) return this.db.prepare('UPDATE players SET pk_title=0 WHERE id=?').run(playerId).changes > 0;
    return this.s.pkTitle.run(n, playerId, n).changes > 0;
  }

  close() {
    this.db.close();
  }
}
