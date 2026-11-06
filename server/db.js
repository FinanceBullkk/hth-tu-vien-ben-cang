// Lớp dữ liệu SQLite: người chơi, lời ước, quẻ, điểm Tâm an, sự kiện chuông, thống kê ngày.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

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
    this.#prepare();
  }

  #prepare() {
    const p = (sql) => this.db.prepare(sql);
    this.s = {
      upsertPlayer: p(`INSERT INTO players (id,name,color,hat,first_seen,last_seen,visits)
        VALUES (@id,@name,@color,@hat,@now,@now,@inc)
        ON CONFLICT(id) DO UPDATE SET name=@name,color=@color,hat=@hat,last_seen=@now,visits=visits+@inc`),
      player: p('SELECT * FROM players WHERE id=?'),
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
      medStats: p(`SELECT COUNT(*) sessions, MAX(score) best,
        (SELECT score FROM meditations m2 WHERE m2.player_id=m.player_id ORDER BY id DESC LIMIT 1) last
        FROM meditations m WHERE player_id=?`),
      bellEventInsert: p('INSERT INTO bell_events (at,participants,on_beat) VALUES (?,?,?)'),
      bellEventPlayer: p('INSERT OR IGNORE INTO bell_event_players (event_id,player_id) VALUES (?,?)'),
      bellEventsOf: p('SELECT COUNT(*) c FROM bell_event_players WHERE player_id=?'),
    };
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
  }

  touchPlayer({ id, name, color, hat, now, isVisit }) {
    this.s.upsertPlayer.run({ id, name, color, hat, now, inc: isVisit ? 1 : 0 });
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

  bumpBell(playerId) {
    this.s.bumpBell.run(playerId);
  }

  recordBellEvent(at, players, onBeat) {
    return this.bellEventTx(at, players, onBeat);
  }

  /** Toàn bộ dữ liệu cho "Sổ an của tôi". */
  book(playerId) {
    const player = this.s.player.get(playerId);
    if (!player) return null;
    const med = this.s.medStats.get(playerId);
    return {
      name: player.name,
      visits: player.visits,
      bellCount: player.bell_count,
      bellEvents: this.s.bellEventsOf.get(playerId).c,
      meditation: { sessions: med.sessions, best: med.best, last: med.last },
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

  close() {
    this.db.close();
  }
}
