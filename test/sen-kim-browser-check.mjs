// PUPPETEER_MODULE may point to an installed Puppeteer ESM entry. No game server/DB needed.
// Kiểm tra aura Sen kim (effect 1) trên trang Bộ sưu tập hào quang: nền inline + aura-signature
// chạy qua vòng render thật, mờ dần không loang sang avatar khác, dispose đủ, giảm chuyển động
// đúng nhịp, và chụp khung các góc.
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
    const result = [];
    const entry = window.__gallery.entries[0]; // effect 1 — Sen kim
    if (!entry || entry.effect !== 1) throw Error('Gallery Sen kim entry missing');
    const op = m => m.uniforms ? m.uniforms.opacity.value : m.opacity;
    for (const low of [false, true]) {
      const aura = createEffect(1, low), other = createEffect(1, low);
      const signature = aura.points.getObjectByName('aura-signature');
      if (!signature) throw Error('aura-signature missing');
      if (!aura.points.getObjectByName('aura-seal')) throw Error('aura-seal missing');
      const streams = signature.children.filter(o => o.name === 'aura-streams');
      if (streams.length !== 2 || streams[0].geometry === streams[1].geometry) throw Error('Shared stream geometry');
      for (const time of [0, .8, 2.7, 5, 8, 1234567]) {
        aura.update(time, 0);
        aura.points.updateMatrixWorld(true);
        aura.points.traverse(o => {
          for (const attr of Object.values(o.geometry?.attributes || {})) {
            if (![...attr.array].every(Number.isFinite)) throw Error('Non-finite geometry');
          }
          if (o.instanceMatrix && ![...o.instanceMatrix.array].every(Number.isFinite)) throw Error('Non-finite instances');
        });
      }
      let cylinders = 0;
      aura.points.traverse(o => { if (o.geometry?.type === 'CylinderGeometry') cylinders++; });
      if (cylinders) throw Error('Closed dome retained');
      // Tắt một avatar không làm tắt avatar kia (V10.3: halo là ShaderMaterial — opacity nằm ở uniform).
      aura.beginFade(); aura.points.material.opacity = 0; aura.update(4, 0);
      if (op(signature.getObjectByName('aura-heart-lower').material) !== 0
        || streams[0].material.uniforms.fade.value !== 0) throw Error('Fade did not propagate');
      other.update(4, 0); other.update(9, 0);
      if (op(other.points.getObjectByName('aura-heart-lower').material) <= 0) throw Error('Fade leaked to other avatar');
      const owned = new Set();
      // Three.js owns one shared quad geometry for every Sprite.
      aura.points.traverse(o => { if (o.geometry && !o.isSprite) owned.add(o.geometry); if (o.material) owned.add(o.material); });
      let disposed = 0;
      owned.forEach(o => o.addEventListener('dispose', () => disposed++));
      aura.dispose(); other.dispose();
      if (disposed !== owned.size) throw Error(`Disposal mismatch ${disposed}/${owned.size}`);
      result.push({ low, resources: disposed });
    }
    const match = globalThis.matchMedia;
    const { store } = await import('/client/src/ui/dom.js');
    try {
      // Trang gallery bật fullFx=1 — tắt tạm để đi đúng nhánh wrapper trong createEffect.
      store.set('fullFx', '0');
      globalThis.matchMedia = () => ({ matches: true });
      const reduced = createEffect(1);
      globalThis.matchMedia = () => ({ matches: false });
      const normal = createEffect(1);
      reduced.update(10, 0); normal.update(3.5, 0);
      const ring = a => a.points.getObjectByName('aura-heart-lower');
      if (Math.abs(ring(reduced).rotation.z - ring(normal).rotation.z) > 1e-8) throw Error('Reduced motion timing');
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
