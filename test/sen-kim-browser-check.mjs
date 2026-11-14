// PUPPETEER_MODULE may point to an installed Puppeteer ESM entry. No game server/DB needed.
// Kiểm tra aura Sen kim (effect 1) trên trang Bộ sưu tập hào quang: module mới chạy qua vòng
// render thật, mờ dần không loang sang avatar khác, dispose đủ, và chụp khung các góc.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE || 'puppeteer');
const port = 5186, base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config',
  'plans/261113-aura-gallery/vite.config.mjs', '--port', String(port)],
{ cwd: new URL('..', import.meta.url), stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error('Preview server exited');
    if (await fetch(base).then(() => true).catch(() => false)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGL/i.test(m.text())) errors.push(m.text()); });
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${base}/plans/261113-aura-gallery/index.html`);
  await page.waitForFunction(() => window.__gallery?.entries?.[0]?.avatar?.aura);
  const checks = await page.evaluate(async () => {
    const { createEffect } = await import('/client/src/player/avatar-effect.js');
    const { petalGeometry, dishGeometry } = await import('/client/src/player/vfx/sen-kim-petal-geometry.js');
    const result = [];
    const entry = window.__gallery.entries[0]; // effect 1 — Sen kim
    if (!entry || entry.effect !== 1) throw Error('Gallery Sen kim entry missing');
    if (entry.avatar.aura.points?.name !== 'sen-kim-aura') throw Error('Gallery avatar does not use sen-kim module');
    const op = m => m.uniforms ? m.uniforms.opacity.value : m.opacity;
    for (const low of [false, true]) {
      const aura = createEffect(1, low), other = createEffect(1, low);
      for (const time of [0, .8, 2.7, 5, 8, 1234567]) {
        aura.update(time);
        aura.points.traverse(o => {
          if (o.instanceMatrix && ![...o.instanceMatrix.array].every(Number.isFinite)) throw Error('Non-finite instances');
          for (const attr of Object.values(o.geometry?.attributes || {})) {
            if (![...attr.array].every(Number.isFinite)) throw Error('Non-finite geometry');
          }
        });
      }
      // Tắt một avatar không làm tắt avatar kia.
      aura.points.material.opacity = 0; aura.update(4);
      if (op(aura.points.getObjectByName('sen-kim-petals').material) > 0.001) throw Error('Fade did not propagate');
      other.update(4);
      if (op(other.points.getObjectByName('sen-kim-petals').material) <= 0) throw Error('Fade leaked to other avatar');
      // Dispose giải phóng đúng phần riêng, giữ hình cánh và đế đài dùng chung (cả biến thể low).
      const shared = new Set([petalGeometry(), petalGeometry(true), dishGeometry(), dishGeometry(true)]);
      const owned = new Set([aura.points.material]);
      aura.points.traverse(o => {
        if (o.isInstancedMesh && o.geometry.attributes.position.count === 4) shared.add(o.geometry);
        else if (o.geometry && !shared.has(o.geometry)) owned.add(o.geometry);
        if (o.material) owned.add(o.material);
        for (const u of Object.values(o.material?.uniforms ?? {})) if (u.value?.isTexture) shared.add(u.value);
        if (o.material?.map) shared.add(o.material.map);
      });
      let disposed = 0;
      owned.forEach(o => o.addEventListener('dispose', () => disposed++));
      aura.dispose(); other.dispose();
      if (disposed !== owned.size) throw Error(`Disposal mismatch ${disposed}/${owned.size}`);
      result.push({ low, resources: disposed });
    }
    const match = globalThis.matchMedia;
    const { store } = await import('/client/src/ui/dom.js');
    try {
      // Trang gallery bật fullFx=1 để khỏi dính giảm chuyển động của hệ điều hành — tắt tạm
      // để đi đúng nhánh wrapper trong createEffect, xong trả lại như cũ.
      store.set('fullFx', '0');
      globalThis.matchMedia = () => ({ matches: true });
      const reduced = createEffect(1);
      globalThis.matchMedia = () => ({ matches: false });
      const normal = createEffect(1);
      reduced.update(10); normal.update(3.5);
      const t = a => a.points.getObjectByName('sen-kim-dish').material.uniforms.time.value;
      if (Math.abs(t(reduced) - 10 / 3) > 1e-9 || t(normal) !== 3.5) throw Error('Reduced motion timing');
      reduced.dispose(); normal.dispose();
    } finally {
      globalThis.matchMedia = match;
      store.set('fullFx', '1');
    }
    return result;
  });
  if (process.env.AVATAR_SCREENSHOT_DIR) await mkdir(process.env.AVATAR_SCREENSHOT_DIR, { recursive: true });
  for (const [name, angle, sit] of [
    ['front', '0', false], ['side', '1.5708', false], ['rear', '3.14159', false], ['seated', '0.6', true],
  ]) {
    await page.evaluate(({ angle, sit }) => {
      document.getElementById('angle').value = String(angle);
      document.getElementById('sit').checked = sit;
      document.getElementById('sit').dispatchEvent(new Event('change'));
      document.getElementById('solo').value = '1';
      document.getElementById('solo').dispatchEvent(new Event('change'));
    }, { angle, sit });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (process.env.AVATAR_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.AVATAR_SCREENSHOT_DIR}/sen-kim-${name}.png` });
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser?.close();
  server.kill();
}
