// Trang admin tối giản qua link bí mật: lịch chuông, lời ước, từ lọc, nội dung, thống kê, kích.
import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import { BELL_EVENT } from '../shared/protocol.js';
import { cleanText } from './filter.js';
import { normalizeCode } from './limits.js';
import { localDate } from './time.js';

const UI_DIR = path.join(import.meta.dirname, 'admin-ui');

function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

function strList(value, maxLen, maxItems = 500) {
  if (!Array.isArray(value)) return null;
  return value
    .map((s) => cleanText(s, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

/** Kiểm tra và chuẩn hoá một dòng lịch chuông. Trả về null nếu sai định dạng. */
function normalizeSchedule(item) {
  const time = String(item?.time ?? '').trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  const out = {
    time: `${m[1].padStart(2, '0')}:${m[2]}`,
    repeat: item.repeat === 'daily' ? 'daily' : 'once',
    message: cleanText(item.message, 160),
    enabled: item.enabled !== false,
  };
  if (out.repeat === 'once') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date ?? '')) return null;
    out.date = item.date;
  }
  return out;
}

export function createAdminRouter({ config, saveContent, db, room, wishes, bell, filter }) {
  const router = express.Router();
  const noStore = (res) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
  };

  router.get('/admin', (req, res) => {
    noStore(res);
    if (!safeEqual(req.query.key ?? '', config.adminKey)) {
      res.status(403).type('text/plain; charset=utf-8').send('Link admin không đúng.');
      return;
    }
    res.sendFile('admin.html', { root: UI_DIR });
  });
  router.get('/admin/admin.js', (_req, res) => res.sendFile('admin-client.js', { root: UI_DIR }));
  router.get('/admin/admin.css', (_req, res) => res.sendFile('admin.css', { root: UI_DIR }));

  const api = express.Router();
  api.use((req, res, next) => {
    noStore(res);
    if (!safeEqual(req.get('x-admin-key') ?? '', config.adminKey)) {
      res.status(403).json({ error: 'Sai khoá admin' });
      return;
    }
    next();
  });

  let lastCpu = process.cpuUsage();
  let lastCpuAt = Date.now();

  api.get('/state', (_req, res) => {
    const now = Date.now();
    const usage = process.cpuUsage();
    const elapsedMs = Math.max(1, now - lastCpuAt);
    const cpuPercent = ((usage.user - lastCpu.user + usage.system - lastCpu.system) / 1000 / elapsedMs) * 100;
    lastCpu = usage;
    lastCpuAt = now;
    const today = db.statsFor(localDate(now, config.timezone));
    res.json({
      stats: {
        online: room.onlineCount(),
        visitsToday: today.visits,
        wishesToday: today.wishes,
        bellsToday: today.bells,
        wishesTotal: db.wishTotal(),
        cpuPercent: Math.round(cpuPercent * 10) / 10,
      },
      online: room.adminList(),
      bellSchedule: config.bellSchedule,
      bannedWords: config.bannedWords,
      fortunes: config.fortunes,
      meditationPhrases: config.meditationPhrases,
      riddles: config.riddles,
      welcomeMessage: config.welcomeMessage,
      joinCode: config.joinCode,
      activeBell: bell.publicEvent(),
    });
  });

  // Đổi mã: người đang chơi vẫn ở lại, nhưng kết nối lại hoặc vào mới đều phải dùng mã mới.
  api.put('/join-code', (req, res) => {
    const code = normalizeCode(req.body?.joinCode);
    if (code && !/^[A-Z0-9-]{4,32}$/.test(code)) {
      res.status(400).json({ error: 'Mã gồm 4 đến 32 chữ cái không dấu hoặc số. Để trống là tắt mã.' });
      return;
    }
    saveContent({ joinCode: code });
    res.json({ ok: true, joinCode: code });
  });

  api.put('/schedule', (req, res) => {
    const list = Array.isArray(req.body?.bellSchedule) ? req.body.bellSchedule.map(normalizeSchedule) : null;
    if (!list || list.some((x) => !x)) {
      res.status(400).json({ error: 'Giờ phải theo dạng HH:MM, lịch một lần cần chọn ngày.' });
      return;
    }
    saveContent({ bellSchedule: list });
    res.json({ ok: true, bellSchedule: list });
  });

  api.post('/ring-now', (req, res) => {
    const ok = bell.ringNow(cleanText(req.body?.message, 160));
    res.json({ ok, leadMs: BELL_EVENT.ringNowLeadMs, error: ok ? undefined : 'Đang có sự kiện chuông rồi.' });
  });

  api.get('/wishes', (req, res) => {
    const q = cleanText(req.query.q, 40);
    res.json({ items: db.adminWishes(q, 200) });
  });

  api.post('/wishes/:id/hidden', (req, res) => {
    const ok = wishes.setHidden(Number(req.params.id), Boolean(req.body?.hidden));
    res.status(ok ? 200 : 404).json({ ok });
  });

  api.put('/banned-words', (req, res) => {
    const list = strList(req.body?.bannedWords, 40, 2000);
    if (!list) {
      res.status(400).json({ error: 'Danh sách không hợp lệ.' });
      return;
    }
    saveContent({ bannedWords: list });
    filter.setWords(list);
    res.json({ ok: true, count: list.length });
  });

  api.put('/content', (req, res) => {
    const patch = {};
    const body = req.body ?? {};
    if (body.fortunes !== undefined) {
      const fortunes = strList(body.fortunes, 200);
      if (!fortunes?.length) {
        res.status(400).json({ error: 'Cần ít nhất một câu chúc.' });
        return;
      }
      patch.fortunes = fortunes;
    }
    if (body.meditationPhrases !== undefined) {
      const m = body.meditationPhrases;
      const tiers = { high: strList(m?.high, 200), mid: strList(m?.mid, 200), low: strList(m?.low, 200) };
      if (!tiers.high?.length || !tiers.mid?.length || !tiers.low?.length) {
        res.status(400).json({ error: 'Mỗi mức điểm cần ít nhất một câu.' });
        return;
      }
      patch.meditationPhrases = tiers;
    }
    if (body.welcomeMessage !== undefined) patch.welcomeMessage = cleanText(body.welcomeMessage, 300);
    if (body.riddles !== undefined) {
      const list = Array.isArray(body.riddles) ? body.riddles.map((r) => {
        const a = strList(r?.a, 60, 6);
        if (!a?.length) return null;
        return {
          q: cleanText(r.q, 200),
          a,
          hint: cleanText(r.hint, 120),
          tier: [1, 2, 3].includes(r.tier) ? r.tier : 1,
        };
      }).filter((r) => r && r.q) : null;
      if (!list?.length) {
        res.status(400).json({ error: 'Mỗi câu đố cần câu hỏi và ít nhất một đáp án.' });
        return;
      }
      patch.riddles = list;
    }
    saveContent(patch);
    res.json({ ok: true });
  });

  api.post('/kick', (req, res) => {
    res.json({ ok: room.kick(String(req.body?.playerId ?? '')) });
  });

  router.use('/admin/api', express.json({ limit: '256kb' }), api);
  return router;
}
