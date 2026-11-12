import test from 'node:test';
import assert from 'node:assert/strict';
import { PkGame } from '../server/pk.js';
import { PK, PK_ATTACK } from '../shared/pk.js';
import { SPAWN } from '../shared/layout.js';
import { ACTIVITY } from '../shared/protocol.js';

function fixture() {
  const events = [];
  const pk = new PkGame({ io: { emit: (name, data) => events.push([name, data]) } });
  const a = { sid: 1, pid: 'secret-a', x: 0, z: 0, rot: 0, activity: ACTIVITY.none, socket: {}, dirty: false };
  const b = { sid: 2, pid: 'secret-b', x: 0, z: 1.5, rot: Math.PI, activity: ACTIVITY.none, socket: {}, dirty: false };
  pk.bind(new Map([[1, a], [2, b]]));
  return { pk, a, b, events };
}

test('đánh tự do trừ HP, kiểm hướng, tầm và cooldown trên server', () => {
  const { pk, a, b, events } = fixture();
  assert.equal(pk.attack(a, { type: 'strike', targetSid: 999, damage: 999 }).isHit, true);
  assert.equal(pk.state(b).hp, 80);
  assert.equal(pk.attack(a, { type: 'strike' }).ok, false);
  assert.equal(JSON.stringify(events).includes('secret-'), false);
  a.combat.cooldowns.strike = 0;
  a.rot = Math.PI;
  assert.equal(pk.attack(a, { type: 'strike', rot: 0 }).isHit, true);
  assert.equal(pk.state(b).hp, 60);
  a.combat.cooldowns.strike = 0;
  assert.equal(pk.attack(a, { type: 'strike', rot: Infinity }).ok, false);
  assert.equal(pk.state(b).hp, 60);
  b.x = 20;
  a.combat.cooldowns.strike = 0;
  a.rot = 0;
  assert.equal(pk.attack(a, { type: 'strike' }).isHit, false);
  assert.equal(pk.state(b).hp, 60);
  assert.equal(pk.attack(a, { type: 'poison' }).ok, false);
});

test('hồi sinh đầy HP, bảo hộ 30 giây; tấn công phá khiên và gắn Sát khí', () => {
  const { pk, a, b, events } = fixture();
  b.combat = { hp: PK_ATTACK.damage, cooldowns: {}, shieldUntil: 0, iframeUntil: 0, protectedUntil: 0, satKhiUntil: 0 };
  const start = Date.now();
  assert.equal(pk.attack(a, { type: 'strike' }).isHit, true);
  assert.equal(pk.state(b).hp, PK.baseHp);
  assert.deepEqual([b.x, b.z, b.rot], [SPAWN.x, SPAWN.z, SPAWN.rot]);
  assert.ok(b.combat.protectedUntil >= start + 30_000);
  assert.equal(events.find(([name]) => name === 'pk:respawn')[1].sid, b.sid);
  assert.deepEqual(events.find(([name]) => name === 'pk:strike')[1].hits[0],
    { sid: b.sid, x: 0, z: 1.5, damage: 20, targetHp: 0 });
  a.x = SPAWN.x; a.z = SPAWN.z + 1.5; a.rot = Math.PI;
  a.combat.cooldowns.strike = 0;
  assert.equal(pk.attack(a, { type: 'strike' }).isHit, false);
  assert.equal(pk.state(b).hp, PK.baseHp);
  b.combat.cooldowns.strike = 0;
  b.rot = 0;
  pk.attack(b, { type: 'strike' });
  assert.equal(b.combat.protectedUntil, 0);
  assert.ok(b.combat.satKhiUntil > Date.now());
  pk.sweep(b.combat.satKhiUntil + 1);
  assert.equal(b.combat.satKhiUntil, 0);
});

test('hộ thể giảm sát thương, lướt né tránh đòn và không phá bảo hộ', () => {
  const { pk, a, b } = fixture();
  b.combat = { hp: 100, cooldowns: {}, shieldUntil: 0, iframeUntil: 0, protectedUntil: Date.now() + 30_000, satKhiUntil: 0 };
  assert.equal(pk.attack(b, { type: 'shield' }).ok, true);
  assert.ok(b.combat.protectedUntil > Date.now());
  b.combat.protectedUntil = 0;
  assert.equal(pk.attack(a, { type: 'slashQ', aimDistance: 1.5 }).isHit, true);
  assert.equal(b.combat.hp, 94);
  b.combat.iframeUntil = Date.now() + 1000;
  a.combat.cooldowns.strike = 0;
  assert.equal(pk.attack(a, { type: 'strike' }).isHit, false);
  assert.equal(b.combat.hp, 94);
  b.rot = Math.PI;
  assert.equal(pk.attack(b, { type: 'dash', rot: 0 }).ok, true);
  assert.ok(b.z > 1.5);
});

test('kiếm khí AOE quét nhiều người và nổ cuối đường, vẫn tôn trọng khiên', () => {
  const { pk, a, b, events } = fixture();
  const players = pk.players;
  const make = (sid, x, z) => ({ sid, pid: `secret-${sid}`, x, z, rot: 0,
    activity: ACTIVITY.none, socket: {}, dirty: false });
  const c = make(3, 2, 8.5); // Chỉ nằm trong vùng nổ cuối đường.
  const d = make(4, -2, 7.5);
  const outside = make(5, 4.2, 8.5);
  const behind = make(6, 0, -2);
  for (const p of [c, d, outside, behind]) players.set(p.sid, p);
  pk.state(d);
  d.combat.protectedUntil = Date.now() + 30_000;
  a.rot = Math.PI;

  const result = pk.attack(a, { type: 'slashQ', rot: 0, targets: [outside.sid], damage: 999 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.hits.map((hit) => hit.sid), [d.sid, c.sid]);
  assert.equal(pk.state(b).hp, 100);
  assert.equal(pk.state(c).hp, 84);
  assert.equal(pk.state(d).hp, 100);
  assert.equal(pk.state(outside).hp, 100);
  assert.equal(pk.state(behind).hp, 100);
  assert.equal(result.hits.find((hit) => hit.sid === d.sid).damage, 0);
  assert.equal(pk.attack(a, { type: 'slashQ' }).ok, false);
  a.combat.cooldowns.slashQ = 0;
  const near = pk.attack(a, { type: 'slashQ', rot: 0, aimDistance: 1.5 });
  assert.ok(near.hits.some((hit) => hit.sid === b.sid));
  assert.equal(pk.state(b).hp, 84);
  a.combat.cooldowns.slashQ = 0;
  assert.equal(pk.attack(a, { type: 'slashQ', aimDistance: Infinity }).ok, false);
  a.combat.cooldowns.slashQ = 0;
  pk.attack(a, { type: 'slashQ', aimDistance: 9999 });
  assert.equal(events.filter(([name]) => name === 'pk:skill').at(-1)[1].toZ, 8.5);
  assert.equal(JSON.stringify(events).includes('secret-'), false);
});
