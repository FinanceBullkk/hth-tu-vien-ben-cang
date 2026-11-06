// Đọc và ghi config.json; biến môi trường ghi đè port, admin key, đường dẫn DB.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = path.resolve(import.meta.dirname, '..');
const CONFIG_PATH = path.resolve(process.env.HTH_CONFIG || path.join(ROOT, 'config.json'));
const EXAMPLE_PATH = path.join(ROOT, 'config.example.json');

const MIN_KEY_LENGTH = 24;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch (err) {
    console.error(`\nKhông đọc được ${file}: ${err.message}`);
    console.error('Kiểm tra lại dấu phẩy, ngoặc kép trong file rồi chạy lại nhé.\n');
    process.exit(1);
  }
}

function writeAtomic(file, data) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

const example = readJson(EXAMPLE_PATH);
const fileConfig = fs.existsSync(CONFIG_PATH) ? readJson(CONFIG_PATH) : structuredClone(example);
// Bổ sung khoá mới từ bản mẫu nếu file cũ thiếu.
for (const key of Object.keys(example)) {
  if (fileConfig[key] === undefined) fileConfig[key] = example[key];
}

let keyWasGenerated = false;
if (!process.env.ADMIN_KEY && String(fileConfig.adminKey || '').length < MIN_KEY_LENGTH) {
  fileConfig.adminKey = crypto.randomBytes(24).toString('base64url');
  keyWasGenerated = true;
}
// "auto" nghĩa là tự tạo mã vào cửa ở lần chạy đầu; để trống "" thì tắt mã (dùng khi chỉ chạy trong LAN).
let codeWasGenerated = false;
if (fileConfig.joinCode === 'auto') {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Bỏ các ký tự dễ nhầm như O/0, I/1/L.
  fileConfig.joinCode = Array.from({ length: 6 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  codeWasGenerated = true;
}
if (!fs.existsSync(CONFIG_PATH) || keyWasGenerated || codeWasGenerated) writeAtomic(CONFIG_PATH, fileConfig);

if (process.env.ADMIN_KEY && process.env.ADMIN_KEY.length < MIN_KEY_LENGTH) {
  console.error(`ADMIN_KEY phải dài ít nhất ${MIN_KEY_LENGTH} ký tự.`);
  process.exit(1);
}

/** Cấu hình đang chạy. Các trường nội dung sửa được qua trang admin. */
export const config = {
  ...fileConfig,
  port: Number(process.env.PORT) || fileConfig.port || 3000,
  adminKey: process.env.ADMIN_KEY || fileConfig.adminKey,
  dbPath: path.resolve(ROOT, process.env.DB_PATH || fileConfig.dbPath),
  timezone: process.env.TZ_GAME || fileConfig.timezone || 'Asia/Ho_Chi_Minh',
  // Chỉ bật khi server đứng sau proxy tin cậy (Tailscale Funnel), nếu không IP có thể bị giả.
  trustProxy: process.env.TRUST_PROXY === '1',
};

export const adminKeyWasGenerated = keyWasGenerated;
export const joinCodeWasGenerated = codeWasGenerated;

const EDITABLE = ['welcomeMessage', 'bellSchedule', 'fortunes', 'meditationPhrases', 'bannedWords', 'joinCode'];

/** Lưu các trường nội dung xuống config.json, không ghi các giá trị đến từ biến môi trường. */
export function saveContent(patch) {
  for (const key of EDITABLE) {
    if (patch[key] !== undefined) {
      config[key] = patch[key];
      fileConfig[key] = patch[key];
    }
  }
  writeAtomic(CONFIG_PATH, fileConfig);
}
