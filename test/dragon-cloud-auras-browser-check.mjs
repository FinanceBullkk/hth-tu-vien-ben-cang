// Run after npm run build. Uses an installed Puppeteer via PUPPETEER_MODULE.
// Kiểm tra ba aura 9–11 (Long Quyền, Xích Diễm, Kim Long) chạy trong trình duyệt thật, không lỗi shader.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AVATAR } from '../shared/protocol.js';
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE || 'puppeteer');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-auras-'));
const cfg = JSON.parse(fs.readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
Object.assign(cfg, { port: 3942, joinCode: '', bellSchedule: [], adminKey: 't'.repeat(32) });
fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(cfg));
const server = spawn(process.execPath, ['server/index.js'], {
  cwd: path.resolve(import.meta.dirname, '..'), stdio: 'ignore',
  env: { ...process.env, PORT: '3942', HTH_CONFIG: path.join(dir, 'config.json'), DB_PATH: path.join(dir, 'test.db') },
});
let browser;
try {
  for (let i = 0; i < 100; i++) {
    if (await fetch('http://localhost:3942/').then(r => r.ok).catch(() => false)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await puppeteer.launch({ headless: true });
  const errors = [];
  for (const mobile of [false, true]) {
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && /shader|WebGL/i.test(m.text())) errors.push(m.text()); });
    await page.setViewport({ width: mobile ? 390 : 1280, height: 844, isMobile: mobile });
    await page.evaluateOnNewDocument(() => localStorage.setItem('hth.tutorialDone', '1'));
    await page.goto('http://localhost:3942/');
    await page.waitForFunction(() => window.__hth);
    await page.click('.welcome-more summary');
    assert.equal(await page.$$eval('[aria-label="Hiệu ứng hào quang"] button', bs => bs.length), AVATAR.effects);
    await page.click('[aria-label="Hiệu ứng hào quang"] button:last-child');
    await page.type('#nameInput', 'Vân An');
    await page.click('#enterBtn');
    await page.waitForFunction(() => window.__hth.net.ready);
    const names = { 9: 'long-quyen-aura', 10: 'xich-diem-aura', 11: 'kim-long-aura' };
    for (const effect of [9, 10, 11]) {
      await page.evaluate(effect => {
        const app = window.__hth, a = app.me.avatar;
        a.setLook(0, 6, 0, 1, 0, effect);
        app.follow.update = () => {
          const root = a.root, angle = root.rotation.y;
          app.camera.position.set(root.position.x + Math.sin(angle) * 5.8, root.position.y + 2.7, root.position.z + Math.cos(angle) * 5.8);
          app.camera.lookAt(root.position.x, root.position.y + 1.3, root.position.z);
        };
      }, effect);
      await new Promise(resolve => setTimeout(resolve, 200));
      assert.equal(await page.evaluate(() => window.__hth.me.avatar.aura.points.name), names[effect]);
      if (!mobile && process.env.AVATAR_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.AVATAR_SCREENSHOT_DIR, `aura-${effect}.png`) });
    }
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: auras 9-11, desktop/mobile, selector, shaders, reduced motion');
} finally {
  await browser?.close();
  server.kill();
}
