// Điểm vào server: Express + Socket.IO cùng một process, phục vụ luôn client đã build.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { PLAYER_ID_RE } from '../shared/protocol.js';
import { ROOT, adminKeyWasGenerated, config, saveContent } from './config.js';
import { createAdminRouter } from './admin.js';
import { Bell } from './bell.js';
import { Db } from './db.js';
import { WordFilter } from './filter.js';
import { clientIp } from './limits.js';
import { Meditation } from './meditation.js';
import { RhythmGame } from './rhythm.js';
import { PitchGame } from './pitch.js';
import { MelodyGame } from './melody.js';
import { PkGame } from './pk.js';
import { Shop } from './shop.js';
import { BauCua } from './baucua.js';
import { XiDach } from './xidach.js';
import { TaiXiu } from './taixiu.js';
import { CoQuay } from './coquay.js';
import { Slot } from './slot.js';
import { StoneYard } from './stone.js';
import { Trade } from './trade.js';
import { PLAYERS_ROOM, Room } from './rooms.js';
import { Riddle } from './riddle.js';
import { Fishing } from './fishing.js';
import { Wishes } from './wishes.js';
import { localWeekStart } from './time.js';

const app = express();
app.disable('x-powered-by');
const httpServer = createServer(app);

// Đếm kết nối theo IP ở tầng engine: client có thể giữ kết nối mà không vào namespace nào,
// nên middleware của Socket.IO không thấy được.
const connectionsByIp = new Map();
const requestIp = (req) => clientIp({ address: req.socket?.remoteAddress, headers: req.headers }, config.trustProxy);

const io = new Server(httpServer, {
  serveClient: false,
  pingInterval: 3000,
  pingTimeout: 4000,
  connectTimeout: 5000,
  maxHttpBufferSize: 32 * 1024,
  // Chỉ nhận kết nối từ chính trang của game, và không để một IP chiếm hết chỗ.
  allowRequest: (req, callback) => {
    if (io.engine.clientsCount >= config.maxConnections) return callback('Quá nhiều kết nối', false);
    if ((connectionsByIp.get(requestIp(req)) ?? 0) >= config.maxConnectionsPerIp) {
      return callback('Quá nhiều kết nối từ một địa chỉ', false);
    }
    const origin = req.headers.origin;
    if (!origin) return callback(null, true);
    try {
      callback(null, new URL(origin).host === req.headers.host);
    } catch {
      callback(null, false);
    }
    return undefined;
  },
});

io.engine.on('connection', (raw) => {
  const ip = requestIp(raw.request);
  connectionsByIp.set(ip, (connectionsByIp.get(ip) ?? 0) + 1);
  raw.once('close', () => {
    const left = (connectionsByIp.get(ip) ?? 1) - 1;
    if (left > 0) connectionsByIp.set(ip, left);
    else connectionsByIp.delete(ip);
  });
});

const db = new Db(config.dbPath);
const filter = new WordFilter(config.bannedWords);
// Các dịch vụ chỉ phát tin cho người đã vào phòng, không phát cho kết nối chưa qua cửa.
const players = io.to(PLAYERS_ROOM);
const wishes = new Wishes({ db, io: players, filter, config });
const meditation = new Meditation({ db, io: players, config });
const bell = new Bell({ db, io: players, config });
const rhythm = new RhythmGame({ db, io: players, config });
const riddle = new Riddle({ db, io: players, config });
const fishing = new Fishing({ db, io: players, config });
const pitch = new PitchGame({ db, io: players, config });
const melody = new MelodyGame({ db, config });
const pk = new PkGame({ db, io: players, config });
const shop = new Shop({ db, config });
const baucua = new BauCua({ db, io: players, config });
const xidach = new XiDach({ db, io: players, config });
const taixiu = new TaiXiu({ db, io: players, config });
const coquay = new CoQuay({ db, io: players, config });
const slot = new Slot({ db, io: players, config });
const stone = new StoneYard({ db, io: players, config });
const trade = new Trade({ db, config });
const room = new Room({ io, db, filter, config, wishes, bell, meditation, rhythm, riddle, fishing, pitch, melody, pk, shop, baucua, xidach, taixiu, coquay, slot, stone, trade });

// Tài nguyên trang cùng nguồn; WebRTC có đường media riêng và ICE do người vận hành cấu hình.
app.use((_req, res, next) => {
  res.set(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self' ws: wss:; media-src 'self' blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
  res.set('Permissions-Policy', 'microphone=(self), camera=()');
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(createAdminRouter({ config, saveContent, db, room, wishes, bell, filter }));

// REST của người chơi: playerId đi qua header, không đặt trên URL để khỏi lộ trong log.
const pidOf = (req) => {
  const id = req.get('x-player-id');
  return id && PLAYER_ID_RE.test(id) ? id : null;
};

app.get('/api/me', (req, res) => {
  const pid = pidOf(req);
  const book = pid ? db.book(pid) : null;
  if (!book) {
    res.status(404).json({ error: 'Chưa có dữ liệu.' });
    return;
  }
  res.json(book);
});

// Bảng ước có tên thật: chỉ người đã từng vào được game mới đọc được.
app.get('/api/wishes', (req, res) => {
  const viewer = pidOf(req);
  if (!(viewer && db.hasPlayer(viewer))) {
    res.status(403).json({ error: 'Vào tu viện trước đã nhé.' });
    return;
  }
  const before = Number(req.query.before);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30));
  const cursor = Number.isInteger(before) && before > 0 ? before : Number.MAX_SAFE_INTEGER;
  const items = db.wishPage(cursor, limit, pidOf(req));
  res.json({ items, next: items.length === limit ? items[items.length - 1].id : null });
});

// Bảng tuần: từ thứ Hai của tuần hiện tại theo múi giờ game.
app.get('/api/weekly', (req, res) => {
  const viewer = pidOf(req);
  if (!(viewer && db.hasPlayer(viewer))) {
    res.status(403).json({ error: 'Vào tu viện trước đã nhé.' });
    return;
  }
  res.json(db.weekly(localWeekStart(Date.now(), config.timezone)));
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const distDir = path.join(ROOT, 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(distDir, { maxAge: 0 }));
  app.get(/^\/(?!api|admin|socket\.io).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
} else {
  app.get('/', (_req, res) => {
    res.type('text/plain; charset=utf-8').send('Chưa build client. Chạy: npm run build');
  });
}

room.start();
bell.start();

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address);
}

httpServer.listen(config.port, () => {
  console.log(`\nHTH – Tu viện bên cảng đang chạy ở cổng ${config.port}`);
  console.log(`  Trên máy này: http://localhost:${config.port}`);
  for (const ip of lanAddresses()) console.log(`  Trong LAN:    http://${ip}:${config.port}`);
  console.log(`  Dữ liệu:      ${config.dbPath}`);
  if (adminKeyWasGenerated) {
    console.log(`  Đã tạo khoá admin mới trong config.json.`);
    console.log(`  Trang admin:  http://localhost:${config.port}/admin?key=${config.adminKey}`);
  } else {
    console.log('  Trang admin:  /admin?key=<adminKey trong config.json>');
  }
  console.log('');
});

function shutdown() {
  room.stop();
  bell.stop();
  io.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
