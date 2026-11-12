// Bot đấu tập chỉ chạy trên server loopback: node scripts/pk-test-bot.js
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { resolveCollision, SPAWN } from '../shared/layout.js';

const url = new URL(process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://127.0.0.1:3942');
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.port !== '3942') {
  throw new Error('Bot thử nghiệm chỉ được nối localhost:3942.');
}

function approach(from, target, step = 0.23) {
  const dx = target.x - from.x, dz = target.z - from.z;
  const distance = Math.hypot(dx, dz);
  const rot = Math.atan2(dx, dz);
  if (distance <= 1.8) return { x: from.x, z: from.z, rot, moving: false };
  const travel = Math.min(step, distance - 1.8);
  const pos = resolveCollision(from.x + dx / distance * travel, from.z + dz / distance * travel);
  return { x: pos.x, z: pos.z, rot, moving: true };
}

if (process.argv.includes('--self-check')) {
  const next = approach({ x: 0, z: 0 }, { x: 0, z: 5 });
  assert.ok(next.z > 0 && next.z <= 0.23 && next.rot === 0);
  assert.equal(approach({ x: 0, z: 0 }, { x: 0, z: 1.5 }).moving, false);
  console.log('PASS: bot giữ tầm đánh và hướng mục tiêu');
  process.exit(0);
}

const socket = io(url.origin, { transports: ['websocket'], reconnectionDelay: 700 });
const others = new Map();
let sid = 0;
let me = { x: SPAWN.x, z: SPAWN.z, rot: SPAWN.rot };
let attackAt = 0, slashAt = 0, shieldAt = 0;

socket.on('connect', async () => {
  try {
    const entered = await socket.timeout(5000).emitWithAck('hello', {
      name: 'Đối thủ tập luyện', color: 2, hair: 1, attire: 0, weapon: 1,
    });
    if (!entered.ok) throw new Error(entered.error);
    sid = entered.sid;
    me = { x: entered.snapshot.me.x, z: entered.snapshot.me.z, rot: entered.snapshot.me.rot };
    others.clear();
    for (const player of entered.snapshot.players) others.set(player.sid, player);
    console.log(`Bot vào phòng: sid ${sid}, thấy ${others.size} người.`);
  } catch (error) {
    console.error(`Bot chưa vào được: ${error.message}`);
    socket.disconnect();
  }
});

socket.on('player:join', (player) => others.set(player.sid, player));
socket.on('player:leave', ({ sid: left }) => others.delete(left));
socket.on('state', ({ p }) => {
  for (const [id, x, z, rot, , activity] of p) {
    if (id === sid) { me.x = x; me.z = z; me.rot = rot; }
    else if (others.has(id)) Object.assign(others.get(id), { x, z, rot, activity });
  }
});
socket.on('pk:respawn', ({ sid: who, x, z, rot }) => {
  if (who === sid) me = { x, z, rot };
  else if (others.has(who)) Object.assign(others.get(who), { x, z, rot });
});
socket.on('disconnect', () => { sid = 0; others.clear(); });

setInterval(() => {
  if (!sid || !socket.connected) return;
  const target = [...others.values()].filter((p) => !p.name.startsWith('Đối thủ tập luyện'))
    .sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
  if (!target) return;
  const next = approach(me, target);
  me = { x: next.x, z: next.z, rot: next.rot };
  socket.volatile.emit('move', [me.x, me.z, me.rot, next.moving ? 1 : 0]);
  const distance = Math.hypot(target.x - me.x, target.z - me.z);
  const now = Date.now();
  if (distance < 2.5 && now >= attackAt) {
    attackAt = now + 1100;
    socket.emit('pk:attack', { type: 'strike' });
  } else if (distance < 7 && now >= slashAt) {
    slashAt = now + 5000;
    socket.emit('pk:attack', { type: 'slashQ', aimDistance: distance });
  }
  if (distance < 3 && now >= shieldAt) {
    shieldAt = now + 8000;
    socket.emit('pk:attack', { type: 'shield' });
  }
}, 100);

process.on('SIGINT', () => { socket.disconnect(); process.exit(0); });
