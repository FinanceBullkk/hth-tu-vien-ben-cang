// Nhập lời ước xuất từ bản deploy (qua admin API /admin/api/wishes) vào DB local.
// Cách lấy dữ liệu:
//   curl -s -H "x-admin-key: KEY_DEPLOY" "https://<deploy>/admin/api/wishes?q=" -o wishes-export.json
// Cách nhập:
//   node scripts/import-wishes.js wishes-export.json [--db data/hth.db]
// An toàn khi chạy lại: trùng id thì bỏ qua, không ghi đè.
import fs from 'node:fs';
import process from 'node:process';
import Database from 'better-sqlite3';
import { localDate } from '../server/time.js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const dbArg = args.includes('--db') ? args[args.indexOf('--db') + 1] : 'data/hth.db';
if (!file) {
  console.error('Dùng: node scripts/import-wishes.js wishes-export.json [--db data/hth.db]');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const items = Array.isArray(raw) ? raw : raw.items;
if (!Array.isArray(items) || !items.length) {
  console.error('File không có lời ước nào (cần mảng hoặc { items: [...] }).');
  process.exit(1);
}

let timezone = 'Asia/Ho_Chi_Minh';
try {
  timezone = JSON.parse(fs.readFileSync('config.json', 'utf8')).timezone ?? timezone;
} catch { /* Không có config.json thì dùng múi giờ mặc định. */ }

const db = new Database(dbArg);
const insert = db.prepare(`INSERT OR IGNORE INTO wishes (id, player_id, author, text, place, created_at, local_date, likes, hidden)
  VALUES (@id, 'imported', @author, @text, @place, @created_at, @local_date, @likes, @hidden)`);
const tx = db.transaction((rows) => {
  let added = 0;
  for (const w of rows) {
    const row = {
      id: Number(w.id),
      author: String(w.author ?? 'Bạn cũ'),
      text: String(w.text ?? ''),
      place: String(w.place ?? 'tree'),
      created_at: Number(w.created_at ?? Date.now()),
      local_date: w.local_date ?? localDate(Number(w.created_at ?? Date.now()), timezone),
      likes: Number(w.likes ?? 0),
      hidden: Number(w.hidden ?? 0),
    };
    if (!Number.isInteger(row.id) || !row.text || !['tree', 'pond', 'container'].includes(row.place)) continue;
    added += insert.run(row).changes;
  }
  return added;
});
const added = tx(items);
const total = db.prepare('SELECT COUNT(*) c FROM wishes').get().c;
db.close();
console.log(`Đã nhập ${added}/${items.length} lời ước vào ${dbArg} (tổng hiện có: ${total}).`);
