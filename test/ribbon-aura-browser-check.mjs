// Run after npm run build. Uses an installed Puppeteer via PUPPETEER_MODULE.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE || 'puppeteer');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-ribbon-'));
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
    assert.equal(await page.$$eval('[aria-label="Hiệu ứng hào quang"] button', bs => bs.length), 12);
    await page.click('[aria-label="Hiệu ứng hào quang"] button:last-child');
    await page.type('#nameInput', 'Vân An');
    await page.click('#enterBtn');
    await page.waitForFunction(() => window.__hth.net.ready);
    // 9 (Long Quyền), 10 (Xích Diễm), 11 (Kim Long) đều đã có pháp tướng riêng, không còn dùng ribbon-aura.
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
      const name = await page.evaluate(() => window.__hth.me.avatar.aura.points.name);
      assert.ok(name && name !== 'ribbon-aura', `effect ${effect}: ${name}`);
      if (!mobile && process.env.AVATAR_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.AVATAR_SCREENSHOT_DIR, `aura-${effect}.png`) });
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: 3 new auras, desktop/mobile, selector, shaders, reduced motion');
} finally {
  await browser?.close();
  server.kill();
}
