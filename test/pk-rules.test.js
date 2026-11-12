import test from 'node:test';
import assert from 'node:assert/strict';
import { Db } from '../server/db.js';
import { PK, PK_ATTACK, PK_SKILLS, pkDamage, pkKitForEffect, pkMaxHp, pkTitleMask } from '../shared/pk.js';

test('pk stats are flat and server authoritative for P0 slice', () => {
  assert.equal(pkMaxHp(), 100);
  assert.equal(pkDamage(), 20);
  assert.equal(PK_ATTACK.damage, 20);
  assert.equal(PK_ATTACK.cooldown, 500);
  assert.equal(PK_ATTACK.range, 2.2);

  assert.equal(PK_SKILLS.slashQ.damage, 16);
  assert.equal(PK_SKILLS.slashQ.range, 8.5);
  assert.equal(PK_SKILLS.dash.distance, 3.5);
  assert.equal(PK_SKILLS.shield.reduction, 0.6);
  for (const skill of Object.values(PK_SKILLS)) assert.equal(skill.cooldown, 500);
});

test('pk kits expose clean single melee kit', () => {
  const kit = pkKitForEffect(0);
  assert.equal(kit.id, 'none');
  assert.ok(kit.skills.attack);
  assert.equal(kit.skills.attack.damage, 20);
});

test('bảo hộ hồi sinh và Sát khí có thời hạn rõ ràng', () => {
  assert.equal(PK.respawnShieldMs, 30_000);
  assert.equal(PK.satKhiMs, 60_000);
});

test('pk title thresholds and DB result are idempotent', () => {
  assert.equal(pkTitleMask(0), 0);
  assert.equal(pkTitleMask(10), 3);
  const db = new Db(':memory:');
  const now = Date.now();
  for (const id of ['a'.repeat(32), 'b'.repeat(32)]) {
    db.touchPlayer({ id, name: id[0], color: 0, hat: 0, now, isVisit: true });
  }
  const result = { id: 'match-1', winner: 'a'.repeat(32), loser: 'b'.repeat(32), date: '2026-11-08', now };
  assert.equal(db.recordPkResult(result), true);
  assert.equal(db.recordPkResult(result), false);
  assert.equal(db.pkStats(result.winner).wins, 1);
  assert.equal(db.pkStats(result.loser).losses, 1);
  assert.equal(db.book(result.winner).pk.wins, 1);
  db.close();
});
