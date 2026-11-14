// Run after npm run build; PUPPETEER_MODULE may point to an existing puppeteer ESM entry.
// Mỗi hệ aura có pháp tướng riêng trong client/src/player/vfx/ (hệ 1 Sen kim là nền inline +
// aura-signature) — kiểm tra chung: danh hiệu đi theo hệ, đổi hệ không lỗi, dữ liệu hữu hạn,
// có chuyển động, và giảm chuyển động của hệ điều hành làm chậm mà không tắt hình.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AURA_TITLES } from '../client/src/player/avatar-title.js';
import { AVATAR, EFFECT_NAMES } from '../shared/protocol.js';

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
        a.setLook(0, 6, 0, 1, 1, effect);
        a.aura.update(2, 0);
        // Ảnh chụp trạng thái: vị trí/xoay từng khối, ma trận instance, đồng hồ shader và
        // thuộc tính động — đủ bắt mọi kiểu chuyển động của các pháp tướng riêng.
        const snapshot = () => {
          const out = [];
          a.aura.points?.traverse(o => {
            out.push(...o.position.toArray(), ...o.rotation.toArray());
            if (o.isInstancedMesh) out.push(...Array.from(o.instanceMatrix.array));
            if (o.material?.uniforms?.time) out.push(o.material.uniforms.time.value);
            const pos = o.geometry?.attributes.position;
            if (pos && pos.usage !== 35044) out.push(...Array.from(pos.array).slice(0, 720));
          });
          return JSON.stringify(out);
        };
        const before = snapshot();
        a.aura.update(3, 0);
        const animated = before !== snapshot();
        a.aura.update(2, 0);
        let finite = true;
        a.aura.points?.traverse(o => {
          if (o.isInstancedMesh && ![...o.instanceMatrix.array].every(Number.isFinite)) finite = false;
          for (const attr of Object.values(o.geometry?.attributes || {})) {
            if (![...attr.array].every(Number.isFinite)) finite = false;
          }
        });
        return { title: a.titleEl.textContent, hidden: a.titleEl.hidden,
          name: a.aura.points?.name ?? null, animated,
          finite, standing: !a.aura.points || a.aura.points.children.every(p => Number.isFinite(p.position.y)) };
      }, effect);
      assert.equal(result.title, AURA_TITLES[effect].title);
      // Hệ không có danh hiệu (Long quyền) hoặc hệ 0: titleEl ẩn.
      assert.equal(result.hidden, !AURA_TITLES[effect].title);
      assert.ok(result.finite);
      assert.ok(result.standing);
      if (effect) {
        // Hệ 1 dùng nền inline + aura-signature (không đặt tên group); hệ khác có module riêng.
        assert.ok(['', 'aura-signature'].includes(result.name) || result.name?.endsWith('-aura'),
          `aura ${effect} renders (${JSON.stringify(result.name)})`);
        assert.ok(result.animated, `aura ${effect} must move`);
      } else {
        assert.equal(result.name, null);
        assert.equal(result.animated, false);
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
    // Giảm chuyển động: aura vẫn hiện và vẫn chuyển động chậm, không đứng hình.
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.evaluate(() => {
      const a = window.__hth.me.avatar;
      a.setLook(0, 6, 0, 1, 1, 1);
      a.aura.update(10, 0);
      return a.aura.points?.visible !== false && Boolean(a.aura.points?.children.length);
    }), true);
    assert.equal(await page.evaluate(() => {
      const aura = window.__hth.me.avatar.aura;
      const snapshot = () => {
        const out = [];
        aura.points?.traverse(o => {
          out.push(...o.position.toArray(), ...o.rotation.toArray());
          if (o.isInstancedMesh) out.push(...Array.from(o.instanceMatrix.array));
          if (o.material?.uniforms?.time) out.push(o.material.uniforms.time.value);
        });
        return JSON.stringify(out);
      };
      aura.update(10, 0);
      const before = JSON.stringify(snapshot());
      aura.update(11, 0);
      return before !== JSON.stringify(snapshot());
    }), true, 'existing aura stays animated with reduced motion');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await page.evaluate(() => {
      const a = window.__hth.me.avatar;
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
  console.log(`PASS: all ${EFFECT_NAMES.length} aura/title states, desktop/mobile, finite data, reduced motion, clearing title, no page errors`);
} finally {
  await browser?.close();
  const stopped = new Promise(resolve => server.once('exit', resolve));
  if (server.exitCode === null) { server.kill(); await stopped; }
  fs.rmSync(dir, { recursive: true, force: true });
}
