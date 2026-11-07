import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Db } from '../server/db.js';
import { cultivationProgress } from '../shared/cultivation.js';
import { createCultivation, cultivationPoint } from '../client/src/player/avatar-cultivation.js';

test('cultivation thresholds, invalid inputs and maximum tier', () => {
  for (const [points, tier] of [[0, 0], [299, 0], [300, 1], [999, 1], [1000, 2], [2499, 2], [2500, 3], [99999, 3]]) {
    assert.equal(cultivationProgress(points).tier, tier);
  }
  for (const value of [-100, NaN, Infinity, '300', null]) assert.equal(cultivationProgress(value).points, 0);
  assert.equal(cultivationProgress(2500).next, null);
});

test('saved meditation scores survive reopening and remain private to each player', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-cultivation-'));
  const file = path.join(dir, 'test.db');
  let db = new Db(file);
  t.after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  for (const id of ['one', 'two']) db.touchPlayer({ id, name: id, color: 0, hat: 0, now: 1, isVisit: true });
  for (let i = 0; i < 3; i++) db.addMeditation('one', 100, i);
  db.addMeditation('one', 0, 4);
  assert.equal(db.cultivation('one').tier, 1);
  assert.equal(db.book('one').cultivation.points, 300);
  assert.equal(db.cultivation('two').points, 0);
  db.touchPlayer({ id: 'one', name: 'one', color: 0, hat: 0, effect: 8, now: 10, isVisit: true });
  assert.equal(db.cultivation('one').points, 300);
  db.close();
  db = new Db(file);
  assert.equal(db.cultivation('one').tier, 1);
});

test('eight aura paths differ, remain bounded and release GPU resources', () => {
  const signatures = new Set();
  for (let effect = 1; effect <= 8; effect++) {
    signatures.add(JSON.stringify(cultivationPoint(effect, 0.37, 2, 5)));
    for (const lowQuality of [false, true]) {
      for (let tier = 0; tier <= 3; tier++) {
        const fx = createCultivation(effect, tier, lowQuality);
        const geometry = fx.points.geometry;
        assert.equal(geometry.attributes.position.count, tier * (lowQuality ? 48 : 96));
        for (const time of [0, 1, 1000]) {
          fx.update(time, true, 0.5);
          assert.ok([...geometry.attributes.position.array].every((v) => Number.isFinite(v) && Math.abs(v) < 3));
        }
        let disposed = 0;
        geometry.addEventListener('dispose', () => disposed++);
        fx.points.material.addEventListener('dispose', () => disposed++);
        fx.dispose();
        assert.equal(disposed, 2);
      }
    }
  }
  assert.equal(signatures.size, 8);
  const none = createCultivation(0, 3);
  assert.equal(none.points.visible, false);
  assert.equal(none.points.geometry.attributes.position.count, 0);
  none.dispose();
});
