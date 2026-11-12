// Chạy sau npm run build: node test/pk-browser-check.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MATS } from '../shared/layout.js';

async function chromium() {
  for (const path of [process.env.PLAYWRIGHT_MODULE, 'playwright',
    'C:/Users/anhha/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs'].filter(Boolean)) {
    try { return (await import(path.includes('/') ? pathToFileURL(path).href : path)).chromium; } catch {}
  }
  throw new Error('Playwright not found');
}

const browser = await (await chromium()).launch({ headless: true, args: ['--no-sandbox'] });
const baseUrl = process.env.PK_TEST_URL ?? 'http://127.0.0.1:3943';
const errors = [];
let server;
let testDir;
try {
  if (!process.env.PK_TEST_URL) {
    testDir = await mkdtemp(path.join(os.tmpdir(), 'hth-pk-browser-'));
    await writeFile(path.join(testDir, 'config.json'), JSON.stringify({ port: 3943, joinCode: '',
      adminKey: 't'.repeat(32), bellSchedule: [] }));
    server = spawn(process.execPath, ['server/index.js'], { cwd: path.resolve(import.meta.dirname, '..'),
      env: { ...process.env, PORT: '3943', HTH_CONFIG: path.join(testDir, 'config.json'),
        DB_PATH: path.join(testDir, 'test.db') }, stdio: 'ignore' });
    for (let i = 0; i < 50; i++) {
      if (await fetch(`${baseUrl}/api/health`).then((r) => r.ok).catch(() => false)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(await fetch(`${baseUrl}/api/health`).then((r) => r.ok).catch(() => false), 'test server did not start');
  }
  const make = async (name) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route(/\.(mp3|glb)(\?|$)/, (route) => route.abort());
    await page.addInitScript(() => localStorage.setItem('hth.tutorialDone', '1'));
    await page.goto(baseUrl);
    await page.waitForTimeout(1000);
    if (errors.length) throw new Error(`Page errors: ${errors.join('; ')}`);
    await page.locator('#nameInput').fill(name);
    await page.locator('#enterBtn').click();
    await page.waitForFunction(() => window.__hth?.sid && window.__hth?.net.ready && document.querySelector('#welcome')?.hidden);
    await page.locator('.tutorial').evaluateAll((els) => els.forEach((e) => e.remove()));
    return page;
  };
  const a = await make('Kiếm A');
  const b = await make('Kiếm B');
  await a.evaluate(() => { window.__hth.me.placeAt(-16.5, 9, 0); return window.__hth.net.call('move', [-16.5, 9, 0, 0]); });
  await b.evaluate(() => { window.__hth.me.placeAt(-16.5, 11, Math.PI); return window.__hth.net.call('move', [-16.5, 11, Math.PI, 0]); });
  const bSid = await b.evaluate(() => window.__hth.sid);
  await a.waitForFunction((sid) => window.__hth.remotes.map.has(sid), bSid);
  await a.evaluate(() => { window.__hth.follow.yaw = Math.PI; });
  await a.waitForTimeout(500);
  const cursor = await a.evaluate((sid) => {
    const { remotes, camera } = window.__hth;
    const ndc = remotes.map.get(sid).avatar.root.position.clone().project(camera);
    return { x: (ndc.x + 1) * innerWidth / 2, y: (1 - ndc.y) * innerHeight / 2 };
  }, bSid);
  assert.ok(cursor.x > 0 && cursor.x < 1280 && cursor.y > 0 && cursor.y < 800);
  await a.mouse.move(cursor.x, cursor.y);
  await a.keyboard.press('1');
  await b.waitForFunction(() => window.__hth.activities.pk.status.hp === 80);
  assert.equal(await b.locator('.pk-hp-text').textContent(), '80 / 100');
  assert.equal(await a.locator('text=Khiêu chiến').count(), 0);
  await b.evaluate(() => { window.__hth.me.placeAt(-16.5, 7.5, 0); return window.__hth.net.call('move', [-16.5, 7.5, 0, 0]); });
  await a.evaluate(() => { window.__hth.follow.yaw = 0; });
  await a.waitForTimeout(550);
  const behind = await a.evaluate((sid) => {
    const { remotes, camera } = window.__hth;
    const ndc = remotes.map.get(sid).avatar.root.position.clone().project(camera);
    return { x: (ndc.x + 1) * innerWidth / 2, y: (1 - ndc.y) * innerHeight / 2 };
  }, bSid);
  assert.ok(behind.x > 0 && behind.x < 1280 && behind.y > 0 && behind.y < 800);
  await a.mouse.move(behind.x, behind.y);
  await a.locator('.vlcm-slot-1').click();
  await b.waitForFunction(() => window.__hth.activities.pk.status.hp === 60);
  assert.ok(Math.abs(await a.evaluate(() => window.__hth.me.rot)) > 2.5);
  await a.waitForTimeout(550);
  await a.evaluate(() => { window.__hth.input.pointerLocked = true; window.__hth.input.onTap(640, 400); window.__hth.input.pointerLocked = false; });
  await b.waitForFunction(() => window.__hth.activities.pk.status.hp === 40);
  for (let i = 0; i < 2; i++) {
    await a.waitForTimeout(550);
    assert.equal((await a.evaluate(() => window.__hth.net.call('pk:attack', { type: 'strike' }))).ok, true);
  }
  await b.waitForFunction(() => window.__hth.activities.pk.status.protectedUntil > Date.now());
  assert.equal(await b.evaluate(() => window.__hth.activities.pk.status.hp), 100);
  assert.equal(await b.evaluate(() => window.__hth.me.avatar.statusEl.hidden), false);
  assert.match(await b.evaluate(() => window.__hth.me.avatar.statusEl.textContent), /Bảo hộ/);
  await b.evaluate(() => window.__hth.net.call('pk:attack', { type: 'strike' }));
  await b.waitForFunction(() => window.__hth.activities.pk.status.satKhiUntil > Date.now());
  assert.equal(await b.evaluate(() => window.__hth.activities.pk.status.protectedUntil), 0);
  assert.match(await b.evaluate(() => window.__hth.me.avatar.statusEl.textContent), /Sát khí/);
  await b.evaluate(() => { window.__hth.me.placeAt(-16.5, 7.5, 0); return window.__hth.net.call('move', [-16.5, 7.5, 0, 0]); });
  await a.waitForFunction((sid) => Math.abs(window.__hth.remotes.map.get(sid)?.z - 7.5) < 0.1, bSid);
  const aoeAim = await a.evaluate((sid) => {
    const { remotes, camera } = window.__hth;
    const point = remotes.map.get(sid).avatar.root.position.clone();
    point.z -= 2.5;
    const ndc = point.project(camera);
    return { x: (ndc.x + 1) * innerWidth / 2, y: (1 - ndc.y) * innerHeight / 2 };
  }, bSid);
  assert.ok(aoeAim.x > 0 && aoeAim.x < 1280 && aoeAim.y > 0 && aoeAim.y < 800);
  await a.mouse.move(aoeAim.x, aoeAim.y);
  await a.keyboard.press('2');
  await a.waitForFunction(() => window.__hth.world.pkVfx.aoeFields.length > 0);
  const center = await a.evaluate(() => {
    const { me, world } = window.__hth;
    const { x, z } = world.pkVfx.aoeFields.at(-1).mesh.position;
    return { x, z, casterZ: me.z };
  });
  assert.ok(Math.abs(center.x + 16.5) < 0.5 && center.casterZ - center.z > 2);
  await b.waitForFunction(() => window.__hth.activities.pk.status.hp === 84);
  assert.deepEqual(await a.evaluate(() => Object.keys(window.__hth.activities.pk.panel.keyMap)),
    ['Digit1', 'Digit2', 'Digit3', 'Digit4']);
  await a.keyboard.press('3');
  await a.waitForFunction(() => window.__hth.world.pkVfx.shields.length > 0);
  await a.keyboard.press('4');
  await a.waitForFunction(() => window.__hth.world.pkVfx.dashes.length > 0);
  if (process.env.PK_SCREENSHOT) {
    await a.waitForTimeout(120);
    await a.screenshot({ path: process.env.PK_SCREENSHOT });
    for (const skill of ['strike', 'shield', 'dash']) {
      await a.evaluate((name) => {
        const { world, me } = window.__hth;
        world.pkVfx.clear();
        if (name === 'strike') world.pkVfx.slash({ x: me.x, y: me.y, z: me.z, rot: Math.PI });
        if (name === 'shield') world.pkVfx.shield({ x: me.x, y: me.y, z: me.z });
        if (name === 'dash') world.pkVfx.dash({ fromX: me.x, fromY: me.y, fromZ: me.z,
          toX: me.x + 3.5, toY: me.y, toZ: me.z, rot: Math.PI / 2 });
      }, skill);
      await a.waitForTimeout(80);
      assert.ok(await a.evaluate((name) => window.__hth.world.pkVfx[
        { strike: 'slashes', shield: 'shields', dash: 'dashes' }[name]
      ].length > 0, skill));
      await a.screenshot({ path: process.env.PK_SCREENSHOT.replace(/\.png$/, `-${skill}.png`) });
    }
  }
  await a.evaluate((mat) => { window.__hth.me.placeAt(mat.x, mat.z, mat.rot);
    return window.__hth.net.call('move', [mat.x, mat.z, mat.rot, 0]); }, MATS[0]);
  await a.keyboard.press('Space');
  await a.waitForFunction(() => window.__hth.activities.current === window.__hth.activities.meditation);
  await a.evaluate(() => window.__hth.activities.exit());
  await a.waitForFunction(() => Boolean(window.__hth.hud.actionFn));
  await a.keyboard.press('e');
  await a.waitForFunction(() => window.__hth.activities.current === window.__hth.activities.meditation);
  assert.deepEqual(errors, []);
  console.log('PASS: hai client, phím 1–4, Space thiền, E tương tác, hồi sinh, AOE VFX');
} finally {
  await browser.close();
  server?.kill();
  if (testDir) await rm(testDir, { recursive: true, force: true, maxRetries: 5 });
}
