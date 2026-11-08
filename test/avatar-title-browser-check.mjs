// Run after npm run build; PUPPETEER_MODULE may point to an existing puppeteer ESM entry.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AURA_TITLES } from '../client/src/player/avatar-title.js';
import { AVATAR } from '../shared/protocol.js';

const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE || 'puppeteer');
assert.equal(AURA_TITLES.length, AVATAR.effects);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-avatar-'));
const cfg = JSON.parse(fs.readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
Object.assign(cfg, { port: 3941, joinCode: '', bellSchedule: [], adminKey: 't'.repeat(32) });
fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(cfg));
const server = spawn(process.execPath, ['server/index.js'], {
  cwd: path.resolve(import.meta.dirname, '..'),
  env: { ...process.env, PORT: '3941', HTH_CONFIG: path.join(dir, 'config.json'), DB_PATH: path.join(dir, 'test.db') },
  stdio: 'ignore',
});
let browser;
try {
  for (let i = 0; i < 50; i++) {
    if (await fetch('http://localhost:3941/').then(r => r.ok).catch(() => false)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await puppeteer.launch({ headless: true });
  const errors = [];
  for (const mobile of [false, true]) {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', message => {
      if (message.type() === 'error' && /shader|WebGL/i.test(message.text())) errors.push(message.text());
    });
    await page.setViewport({ width: mobile ? 390 : 1280, height: 844, isMobile: mobile, hasTouch: mobile });
    await page.evaluateOnNewDocument(() => localStorage.setItem('hth.tutorialDone', '1'));
    await page.goto('http://localhost:3941/');
    await page.waitForFunction(() => window.__hth);
    await page.type('#nameInput', mobile ? 'Ngọc An' : 'Minh Hải');
    await page.click('#enterBtn');
    await page.waitForFunction(() => window.__hth.net.ready);
    for (let effect = 0; effect < AVATAR.effects; effect++) {
      const result = await page.evaluate(effect => {
        const a = window.__hth.me.avatar;
        const previous = a.aura.points;
        const resources = new Set();
        previous?.traverse(p => { if (p.geometry) resources.add(p.geometry); if (p.material?.dispose) resources.add(p.material); });
        let disposed = 0;
        resources.forEach(r => r.addEventListener('dispose', () => disposed++));
        a.setLook(0, 6, 0, 1, 1, effect);
        a.aura.update(2, 0);
        const qi = Boolean(a.aura.points?.userData.qiOwned);
        const streams = a.aura.points?.getObjectByName('qi-streams');
        const seal = a.aura.points?.getObjectByName('aura-seal');
        const motes = a.aura.points?.getObjectByName('qi-motes');
        const u = streams?.material.uniforms;
        a.aura.update(3, 0);
        const timeAdvances = Boolean(u) && u.time.value === 3;
        a.aura.update(2, 0);
        return { title: a.titleEl.textContent, hidden: a.titleEl.hidden, qi,
          layers: a.aura.points ? a.aura.points.children.length : 0,
          depth: !a.aura.points || a.aura.points.children.every(p => p.material.depthTest && !p.material.depthWrite),
          seal: Boolean(seal), rotation: seal?.rotation.z,
          flavor: u?.flavor.value, timeAdvances, disposed: disposed === resources.size,
          motes: motes ? motes.geometry.attributes.seed.count : 0,
          finiteUniforms: u ? Object.values(u).every(x => Number.isFinite(x.value) || x.value.isVector3 || x.value.isVector4 || Array.isArray(x.value)) : true,
          finite: !a.aura.points || a.aura.points.children.every(p => Number.isFinite(p.position.y)) };
      }, effect);
      assert.equal(result.title, AURA_TITLES[effect].title);
      assert.equal(result.hidden, effect === 0);
      assert.equal(result.seal, effect !== 0);
      assert.ok(result.finite && result.finiteUniforms);
      assert.ok(result.disposed, 'replacing aura releases owned geometry and materials');
      if (effect) {
        assert.ok(result.qi, `aura ${effect} runs on the shared qi system`);
        assert.equal(result.layers, 3, 'qi replaces old layers instead of stacking them');
        assert.ok(result.depth, 'qi tests scene depth without writing transparent depth');
        assert.equal(result.rotation, 0);
        assert.equal(result.flavor, effect - 1, `aura ${effect} maps to its own flavor`);
        assert.ok(result.timeAdvances, `aura ${effect} advances its clock`);
        if (effect === 2 || effect === 4) assert.ok(result.motes >= 24, `aura ${effect} keeps its approved particle count`);
      }
      if (effect && !mobile && process.env.AVATAR_SCREENSHOT_DIR) {
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.screenshot({ path: path.join(process.env.AVATAR_SCREENSHOT_DIR, `aura-${effect}.png`) });
        for (const [angle, yaw] of [['front', 0], ['side', Math.PI / 2], ['rear', Math.PI]]) {
          await page.evaluate(yaw => {
            const app = window.__hth, root = app.me.avatar.root;
            app.follow.update = () => {
              const a = root.rotation.y + yaw;
              app.camera.position.set(root.position.x + Math.sin(a) * 5.8,
                root.position.y + 2.7, root.position.z + Math.cos(a) * 5.8);
              app.camera.lookAt(root.position.x, root.position.y + 1.4, root.position.z);
            };
          }, yaw);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          await page.screenshot({ path: path.join(process.env.AVATAR_SCREENSHOT_DIR, `aura-${effect}-${angle}.png`) });
        }
      }
    }
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.evaluate(() => {
      const a = window.__hth.me.avatar;
      a.setLook(0, 6, 0, 1, 1, 4);
      a.aura.update(2, 0);
      const seal = a.aura.points.getObjectByName('aura-seal');
      const u = a.aura.points.getObjectByName('qi-streams').material.uniforms;
      return seal.visible === true && seal.rotation.z === 0 && u.time.value === 0 && u.bloom.value === 0;
    }), true, 'reduced motion keeps only the static seal with a frozen clock');
    await page.evaluate(() => {
      const a = window.__hth.me.avatar;
      a.setLook(0, 6, 0, 1, 1, 1);
      a.say('Chúc bạn một ngày bình an');
      document.querySelectorAll('.tutorial').forEach(el => el.remove());
    });
    if (process.env.AVATAR_SCREENSHOT_DIR) {
      await page.screenshot({ path: path.join(process.env.AVATAR_SCREENSHOT_DIR, `avatar-${mobile ? 'mobile' : 'desktop'}.png`) });
    }
    await page.evaluate(() => {
      const a = window.__hth.me.avatar;
      a.setLook(0, 6, 0, 1, 1, 0);
    });
    assert.equal(await page.evaluate(() => window.__hth.me.avatar.titleEl.hidden), true);
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: all 9 aura/title states, desktop/mobile, surface depth, reduced motion, clearing title, no page errors');
} finally {
  await browser?.close();
  const stopped = new Promise(resolve => server.once('exit', resolve));
  if (server.exitCode === null) { server.kill(); await stopped; }
  fs.rmSync(dir, { recursive: true, force: true });
}
