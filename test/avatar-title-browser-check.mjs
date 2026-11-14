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
        const previous = a.aura.points?.userData.qiOwned ? a.aura.points : a.aura.points?.getObjectByName('aura-signature');
        const resources = new Set();
        previous?.traverse(p => { if (p.geometry) resources.add(p.geometry); if (p.material?.dispose) resources.add(p.material); });
        let disposed = 0;
        resources.forEach(r => r.addEventListener('dispose', () => disposed++));
        a.setLook(0, 6, 0, 1, 1, effect);
        a.aura.update(2, 0);
        const seal = a.aura.points?.getObjectByName('aura-seal');
        const signature = a.aura.points?.getObjectByName('aura-signature');
        const swords = signature?.getObjectByName('aura-sword-formation');
        const forms = signature?.getObjectByName('aura-manifestation')?.children[0];
        const formBefore = forms && Array.from(forms.instanceMatrix.array);
        const swordBefore = swords && Array.from(swords.instanceMatrix.array);
        const positions = () => signature?.children.filter(p => p.geometry?.attributes.position)
          .map(p => Array.from(p.geometry.attributes.position.array));
        const before = JSON.stringify(positions());
        a.aura.update(3, 0);
        const animated = before !== JSON.stringify(positions());
        const swordMotion = swords && JSON.stringify(swordBefore) !== JSON.stringify(Array.from(swords.instanceMatrix.array));
        const formMotion = forms && JSON.stringify(formBefore) !== JSON.stringify(Array.from(forms.instanceMatrix.array));
        a.aura.update(2, 0);
        const qi = a.aura.points?.userData.qiOwned;
        return { title: a.titleEl.textContent, hidden: a.titleEl.hidden, qi,
          qiLayers: qi && a.aura.points.children.length,
          qiDepth: qi && a.aura.points.children.every(p => p.material.depthTest && !p.material.depthWrite),
          seal: Boolean(seal), rotation: seal?.rotation.z,
          animated, disposed: disposed === resources.size,
          swordCount: swords?.count,
          swordMotion,
          formMotion, finiteForms: !forms || Array.from(forms.instanceMatrix.array).every(Number.isFinite),
          formCount: forms?.count,
          surfaceDepth: !forms || forms.material.depthWrite,
          glowDepth: !forms || signature.getObjectByName('aura-surface-glow').material.depthWrite,
          emblemSide: signature?.getObjectByName('aura-emblem').material.side,
          finiteGeometry: !signature || positions().flat(2).every(Number.isFinite),
          finite: !a.aura.points || a.aura.points.children.every(p => Number.isFinite(p.position.y)) };
      }, effect);
      assert.equal(result.title, AURA_TITLES[effect].title);
      assert.equal(result.hidden, effect === 0);
      assert.equal(result.seal, effect !== 0);
      assert.ok(result.finite);
      assert.ok(result.disposed, 'replacing aura releases signature geometry and materials');
      assert.ok(result.finiteGeometry);
      if (result.qi) {
        assert.equal(result.qiLayers, 3, 'qi replaces old layers instead of stacking them');
        assert.ok(result.qiDepth, 'qi tests scene depth without writing transparent depth');
      }
      if (effect && !result.qi) assert.ok(result.animated, `aura ${effect} must move`);
      if (effect && !result.qi) assert.ok(result.formMotion && result.finiteForms, `aura ${effect} needs moving finite 3D forms`);
      if (effect && !result.qi) {
        assert.ok(result.surfaceDepth, 'solid aura surfaces occlude hidden layers');
        assert.equal(result.glowDepth, false, 'glow does not occlude transparent effects');
        assert.equal(result.emblemSide, 0, 'flat emblem stays on the front face');
        const motion = await page.evaluate(async () => {
          const forms = window.__hth.me.avatar.aura.points.getObjectByName('aura-manifestation').children[0];
          const flow = window.__hth.me.avatar.aura.points.getObjectByName('aura-flow');
          const flowTime = flow.children[0].material.uniforms.time.value;
          await new Promise(resolve => requestAnimationFrame(resolve));
          const before = Array.from(forms.instanceMatrix.array);
          await new Promise(resolve => setTimeout(resolve, 600));
          const after = Array.from(forms.instanceMatrix.array);
          return { finite: after.every(Number.isFinite), delta: Math.max(...after.map((v, i) => Math.abs(v - before[i]))),
            flowing: flow.children.every(p => p.material.uniforms.time.value > flowTime && !p.material.depthWrite),
            particles: flow.children[1].geometry.attributes.position.count,
            fire: flow.children[0].material.uniforms.fire.value };
        });
        assert.ok(motion.finite && motion.delta > 0.02, `aura ${effect} must visibly animate in the live render loop`);
        assert.ok(motion.flowing && motion.particles >= (effect === 4 ? 16 : 32), `aura ${effect} must advance mist and sparks together`);
        assert.equal(motion.fire, effect === 4 ? 1 : 0, 'flame motion is isolated to the fire aura');
      }
      if (effect) assert.equal(result.rotation, result.qi ? 0 : -0.18);
      if (effect === 6) {
        assert.ok(result.swordCount >= 18, 'sword formation keeps its radial silhouette on low quality');
        assert.ok(result.swordMotion, 'swords rotate and gather over time');
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
      a.aura.update(10, 0);
      return a.aura.points.getObjectByName('aura-seal').rotation.z === 0;
    }), true);
    assert.equal(await page.evaluate(() => {
      const aura = window.__hth.me.avatar.aura;
      const snapshot = () => aura.points.children.map(p => [...p.position.toArray(), ...p.rotation.toArray()]);
      aura.update(10, 0);
      const before = JSON.stringify(snapshot());
      aura.update(11, 0);
      return before !== JSON.stringify(snapshot());
    }), true, 'existing aura stays animated with reduced motion');
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
