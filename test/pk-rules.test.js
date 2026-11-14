import test from 'node:test';
import assert from 'node:assert/strict';
import { Db } from '../server/db.js';
import { PK, PK_ATTACK, PK_KITS, PK_SKILLS, PK_KIT_BY_EFFECT, pkDamage, pkKitForEffect, pkMaxHp, pkTitleMask } from '../shared/pk.js';
import { EFFECT_NAMES } from '../shared/protocol.js';

// Mọi aura trong EFFECT_NAMES (kể cả hào quang chí tôn 13–14) đều phải có kit riêng.
const AURA_COUNT = EFFECT_NAMES.length - 1;

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

test('mỗi aura một kit rebuild: số liệu riêng trong biên độ cân bằng', () => {
  assert.equal(PK_KIT_BY_EFFECT.length, EFFECT_NAMES.length, 'aura nào trong EFFECT_NAMES cũng phải có kit');
  for (let effect = 1; effect <= AURA_COUNT; effect++) {
    const kit = pkKitForEffect(effect);
    assert.equal(kit.effect, effect);
    assert.ok(kit.name);
    assert.match(kit.color, /^#[0-9a-f]{6}$/i);
    const { attack, strike, slashQ, shield, dash } = kit.skills;
    // Đòn thường: 12–26 sát thương, hồi 300–900ms, tầm 1.8–3.2m, góc nón 0.5–0.9.
    for (const s of [attack, strike]) {
      assert.ok(s.damage >= 12 && s.damage <= 26, `${kit.id} strike damage ${s.damage}`);
      assert.ok(s.cooldown >= 300 && s.cooldown <= 900, `${kit.id} strike cooldown ${s.cooldown}`);
      assert.ok(s.range >= 1.8 && s.range <= 3.2, `${kit.id} strike range ${s.range}`);
      assert.ok(s.coneAngleCos >= .5 && s.coneAngleCos <= .9);
    }
    // Tuyệt kỹ: 11–30 sát thương, tầm 6–10.5m, bán kính 2–5m, hồi 500–1200ms.
    assert.ok(slashQ.damage >= 11 && slashQ.damage <= 30, `${kit.id} slashQ damage ${slashQ.damage}`);
    assert.ok(slashQ.range >= 6 && slashQ.range <= 10.5, `${kit.id} slashQ range ${slashQ.range}`);
    assert.ok(slashQ.burstRadius >= 2 && slashQ.burstRadius <= 5);
    assert.ok(slashQ.cooldown >= 500 && slashQ.cooldown <= 1200);
    // Khiên: giảm 50–75% trong 1.0–1.8s.
    assert.ok(shield.reduction >= .5 && shield.reduction <= .75);
    assert.ok(shield.duration >= 1000 && shield.duration <= 1800);
    // Thân pháp: 3.0–4.2m, bất khả xâm phạm 200–400ms.
    assert.ok(dash.distance >= 3 && dash.distance <= 4.2);
    assert.ok(dash.iframe >= 200 && dash.iframe <= 400);
    // Cơ chế đặc biệt trong biên độ an toàn.
    assert.ok((strike.lifesteal ?? 0) <= .4 && (slashQ.lifesteal ?? 0) <= .4);
    assert.ok((slashQ.pull ?? 0) <= 2.5);
    assert.ok((shield.reflect ?? 0) <= .35);
    assert.ok((dash.damage ?? 0) <= 15);
    assert.ok((strike.maxTargets ?? 1) <= 2);
    for (const skill of [strike, slashQ, shield, dash]) {
      assert.ok(skill.name && skill.shortLabel && skill.type && skill.desc,
        `kit ${kit.id} thiếu tên/phân loại/mô tả`);
    }
  }
  const names = new Set(PK_KIT_BY_EFFECT.slice(1).map((kit) => kit.name));
  assert.equal(names.size, AURA_COUNT);
  const skillNames = new Set(PK_KIT_BY_EFFECT.slice(1).flatMap((kit) =>
    ['strike', 'slashQ', 'shield', 'dash'].map((type) => kit.skills[type].name)));
  assert.equal(skillNames.size, AURA_COUNT * 4, 'tên chiêu không được trùng giữa các kit');
});

test('hai hào quang chí tôn có kit riêng, không rơi về Vô Môn', () => {
  const thanBai = pkKitForEffect(13);
  const vuaCauCa = pkKitForEffect(14);
  assert.equal(EFFECT_NAMES[13], 'Thần bài');
  assert.equal(EFFECT_NAMES[14], 'Vua câu cá');
  assert.deepEqual([thanBai.id, thanBai.effect, thanBai.color], ['than-bai', 13, '#ffcf3f']);
  assert.deepEqual([vuaCauCa.id, vuaCauCa.effect, vuaCauCa.color], ['vua-cau-ca', 14, '#5fe3f0']);
  for (const kit of [thanBai, vuaCauCa]) {
    assert.notEqual(kit, PK_KITS.none);
    assert.notEqual(kit.skills.strike.name, PK_SKILLS.strike.name);
    assert.ok(Object.isFrozen(kit) && Object.isFrozen(kit.skills.slashQ));
  }
  // Cơ chế đúng chủ đề: Thần bài quạt bài hai mục tiêu, tất tay hút máu, bài tẩy phản đòn.
  assert.equal(thanBai.skills.strike.maxTargets, 2);
  assert.ok(thanBai.skills.slashQ.lifesteal > 0);
  assert.ok(thanBai.skills.shield.reflect > 0);
  assert.match(thanBai.skills.slashQ.name, /Tất Tay/);
  // Vua câu cá giật dây kéo địch về tâm và quất cần tầm xa hơn baseline.
  assert.ok(vuaCauCa.skills.slashQ.pull > 0);
  assert.ok(vuaCauCa.skills.strike.range > PK_SKILLS.strike.range);
  assert.match(vuaCauCa.skills.slashQ.name, /Vũ Môn/);
});

test('mỗi kit lệch baseline ở ít nhất một chiêu — rebuild thật, không chỉ đổi tên', () => {
  const base = PK_SKILLS;
  const same = (a, b) =>
    a.damage === b.damage && a.cooldown === b.cooldown && a.range === b.range
    && a.duration === b.duration && a.distance === b.distance && a.reduction === b.reduction;
  for (let effect = 1; effect <= AURA_COUNT; effect++) {
    const kit = pkKitForEffect(effect).skills;
    const differs = ['strike', 'slashQ', 'shield', 'dash'].some((key) => !same(kit[key], base[key]));
    assert.ok(differs, `kit ${effect} trùng baseline ở cả 4 chiêu`);
  }
});

test('aura ngoài bảng thì rơi về kit Vô Môn', () => {
  for (const effect of [undefined, 0, 15, 99, -1, 1.5, '3', '13']) {
    assert.equal(pkKitForEffect(effect).id, 'none');
  }
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
