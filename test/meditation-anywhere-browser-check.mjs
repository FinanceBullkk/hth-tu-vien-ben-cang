// Run after build. PLAYWRIGHT_MODULE may point to an existing Playwright index.mjs.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-anywhere-'));
const cfg = JSON.parse(fs.readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
Object.assign(cfg, { port: 3995, joinCode: '', bellSchedule: [], adminKey: 't'.repeat(32) });
fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(cfg));
const proc = spawn(process.execPath, ['server/index.js'], {
  cwd: path.resolve(import.meta.dirname, '..'),
  env: { ...process.env, PORT: '3995', HTH_CONFIG: path.join(dir, 'config.json'), DB_PATH: path.join(dir, 'test.db') },
  stdio: ['ignore', 'pipe', 'inherit'],
});
let browser;
try {
  await Promise.race([
    new Promise((resolve) => proc.stdout.on('data', (d) => { if (String(d).includes('đang chạy')) resolve(); })),
    once(proc, 'exit').then(([code]) => { throw Error(`Server exited ${code}`); }),
    new Promise((_, reject) => setTimeout(() => reject(Error('Server startup timeout')), 15000).unref()),
  ]);
  browser = await chromium.launch({ headless: true });
  for (const mobile of [false, true]) {
    const page = await browser.newPage(mobile
      ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('hth.tutorialDone', '1'));
    await page.goto('http://localhost:3995/');
    await page.getByRole('button', { name: 'Mặc bộ Lee Sin · Long quyền', exact: true }).click();
    await page.locator('#nameInput').fill(mobile ? 'Lee Sin mobile' : 'Lee Sin desktop');
    await page.locator('#enterBtn').click();
    await page.waitForFunction(() => window.__hth?.net.ready);
    const look = await page.evaluate(() => {
      const { color, hat, attire, weapon, effect } = JSON.parse(localStorage.getItem('hth.profile'));
      return { color, hat, attire, weapon, effect };
    });
    assert.deepEqual(look, { color: 0, hat: 6, attire: 3, weapon: 3, effect: 9 });
    const before = await page.evaluate(() => {
      const { x, z } = window.__hth.me;
      return { x, z };
    });
    await page.locator('#playBtn').click();
    await page.getByRole('button', { name: /Thiền tại chỗ/ }).click();
    await page.waitForFunction(() => window.__hth.activities.meditation.ready);
    assert.equal(await page.getByRole('button', { name: 'Chơi Nhịp sen', exact: true }).isVisible(), false);
    await page.waitForFunction(() => window.__hth.me.avatar.qi >= 1, null, { timeout: 12000 });
    assert.deepEqual(await page.evaluate(() => {
      const { x, z } = window.__hth.me;
      return { x, z };
    }), before);
    const screenshot = path.join(os.tmpdir(), `hth-anywhere-${mobile ? 'mobile' : 'desktop'}.png`);
    await page.screenshot({ path: screenshot });
    await page.getByRole('button', { name: 'Đứng dậy', exact: true }).click();
    await page.waitForFunction(() => !window.__hth.activities.current && !window.__hth.me.locked);
    await page.reload();
    await page.locator('#enterBtn').click();
    await page.waitForFunction(() => window.__hth?.net.ready);
    const saved = await page.evaluate(() => {
      const a = window.__hth.me.avatar;
      return { attire: a.attireIndex, weapon: a.weaponIndex, effect: a.effectIndex, qi: a.qi };
    });
    assert.deepEqual(saved, { attire: 3, weapon: 3, effect: 9, qi: 1 });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ mobile, look, saved, screenshot, errors }));
    await page.close();
  }
} finally {
  await browser?.close();
  const exited = once(proc, 'exit');
  proc.kill();
  await exited;
  fs.rmSync(dir, { recursive: true, force: true });
}
