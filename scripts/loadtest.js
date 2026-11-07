// Test tải: giả lập N người chơi đi lại và chat, đo CPU server và độ trễ chat.
// Cách chạy: node scripts/loadtest.js --bots 20 --seconds 30 --url http://localhost:3000 --admin <adminKey>
import { io } from 'socket.io-client';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const BOTS = Number(arg('bots', 20));
const SECONDS = Number(arg('seconds', 30));
const URL_BASE = arg('url', 'http://localhost:3000');
const ADMIN = arg('admin', process.env.ADMIN_KEY || '');
const MOVE_HZ = 20;

const bots = [];
const latencies = [];
let received = 0;

function startBot(i) {
  return new Promise((resolve, reject) => {
    const s = io(URL_BASE, { transports: ['websocket'], forceNew: true });
    const bot = { s, x: -20 + Math.random() * 40, z: Math.random() * 25, a: Math.random() * 6.28, timers: [] };
    s.on('connect_error', reject);
    s.on('state', () => {
      received++;
    });
    s.on('chat', ({ text }) => {
      const m = /^t(\d+)$/.exec(text);
      if (m) latencies.push(Date.now() - Number(m[1]));
    });
    s.on('connect', async () => {
      const res = await s.timeout(5000).emitWithAck('hello', { name: `Bot ${i + 1}`, color: i % 8, hat: i % 6 });
      if (!res.ok) reject(new Error(res.error));
      bot.sid = res.sid;
      bot.timers.push(setInterval(() => {
        bot.a += (Math.random() - 0.5) * 0.5;
        bot.x = Math.max(-25, Math.min(25, bot.x + Math.sin(bot.a) * 0.35));
        bot.z = Math.max(-5, Math.min(28, bot.z + Math.cos(bot.a) * 0.35));
        s.volatile.emit('move', [bot.x, bot.z, bot.a, 1]);
      }, 1000 / MOVE_HZ));
      bot.timers.push(setInterval(() => {
        s.emit('chat', { text: `t${Date.now()}` });
      }, 5000 + Math.random() * 5000));
      resolve(bot);
    });
  });
}

async function adminState() {
  if (!ADMIN) return null;
  const res = await fetch(`${URL_BASE}/admin/api/state`, { headers: { 'x-admin-key': ADMIN } });
  return res.ok ? res.json() : null;
}

async function main() {
  console.log(`Khởi động ${BOTS} kết nối giả tới ${URL_BASE} trong ${SECONDS} giây…`);
  for (let i = 0; i < BOTS; i++) bots.push(await startBot(i));
  await new Promise((r) => setTimeout(r, 3000));
  await adminState(); // Đặt mốc đo CPU sau giai đoạn khởi động.

  const cpu = [];
  const started = Date.now();
  while (Date.now() - started < SECONDS * 1000) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await adminState();
    if (s) {
      cpu.push(s.stats.cpuPercent);
      console.log(`  online ${s.stats.online}, CPU server ${s.stats.cpuPercent}%`);
    }
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  console.log('\nKết quả');
  console.log(`  Gói state nhận được / bot / giây: ${(received / BOTS / (SECONDS + 3)).toFixed(1)}`);
  if (sorted.length) console.log(`  Độ trễ chat: trung vị ${p(0.5)} ms, p95 ${p(0.95)} ms, tối đa ${sorted[sorted.length - 1]} ms (${sorted.length} mẫu)`);
  if (cpu.length) {
    const avg = cpu.reduce((a, b) => a + b, 0) / cpu.length;
    console.log(`  CPU server: trung bình ${avg.toFixed(1)}%, cao nhất ${Math.max(...cpu)}% của một nhân`);
    console.log(avg <= 50 ? '  ĐẠT tiêu chí dưới 50% một nhân.' : '  CHƯA ĐẠT tiêu chí dưới 50% một nhân.');
  } else {
    console.log('  Không có --admin nên không đo được CPU server.');
  }
  for (const b of bots) {
    b.timers.forEach(clearInterval);
    b.s.disconnect();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
