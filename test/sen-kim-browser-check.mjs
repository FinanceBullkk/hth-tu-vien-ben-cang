// PUPPETEER_MODULE may point to an installed Puppeteer ESM entry. No game server/DB needed.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE || 'puppeteer');
const port = 5186, base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config',
  'plans/261107-2204-vfx-phase-0/audit-vite.config.mjs', '--port', String(port)],
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
  await page.goto(`${base}/plans/261107-2225-qi-vertical-slice/preview.html`);
  await page.waitForFunction(() => window.__avatars?.()[0]?.aura);
  const checks = await page.evaluate(async () => {
    const { createEffect } = await import('/client/src/player/avatar-effect.js');
    const result = [];
    for (const low of [false, true]) {
      const aura = createEffect(1, low), other = createEffect(1, low);
      const signature = aura.points.getObjectByName('aura-signature');
      const streams = signature.children.filter(o => o.name === 'aura-streams');
      if (streams.length !== 2 || streams[0].geometry === streams[1].geometry) throw Error('Shared stream geometry');
      for (const stream of streams) {
        const { position, uv } = stream.geometry.attributes;
        if (uv.itemSize !== 2 || uv.count !== position.count) throw Error('Invalid stream UVs');
      }
      for (const time of [0, .8, 2.7, 5, 8, 1234567]) {
        aura.update(time, 0);
        aura.points.updateMatrixWorld(true);
        aura.points.traverse(o => {
          for (const attr of Object.values(o.geometry?.attributes || {})) {
            if (![...attr.array].every(Number.isFinite)) throw Error('Non-finite geometry');
          }
          if (o.instanceMatrix && ![...o.instanceMatrix.array].every(Number.isFinite)) throw Error('Non-finite instances');
        });
        if (streams[0].geometry.attributes.position.getX(0) >= 0 ||
            streams[1].geometry.attributes.position.getX(0) <= 0) throw Error('Streams must flank player');
      }
      const lower = signature.getObjectByName('aura-heart-lower');
      const upper = signature.getObjectByName('aura-heart-upper');
      if (!(lower.position.y < upper.position.y && lower.rotation.z > 0 && upper.rotation.z < 0)) throw Error('Tier ordering/rotation');
      let cylinders = 0;
      aura.points.traverse(o => { if (o.geometry?.type === 'CylinderGeometry') cylinders++; });
      if (cylinders) throw Error('Closed dome retained');
      aura.beginFade(); aura.points.material.opacity = 0; aura.update(4, 0);
      // V10.3: haloMat là ShaderMaterial — opacity nằm ở uniform, property .opacity vô hiệu.
      const haloOpacity = m => m.uniforms ? m.uniforms.opacity.value : m.opacity;
      if (haloOpacity(lower.material) !== 0 || streams[0].material.uniforms.fade.value !== 0) throw Error('Fade did not propagate');
      other.update(4, 0); other.update(9, 0);   // V10.2: update đầu mở state Summon (lớp = 0) — qua nó mới so fade
      if (haloOpacity(other.points.getObjectByName('aura-heart-lower').material) <= 0) throw Error('Fade leaked to other avatar');
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
    try {
      globalThis.matchMedia = () => ({ matches: true });
      const reduced = createEffect(1);
      globalThis.matchMedia = () => ({ matches: false });
      const normal = createEffect(1);
      reduced.update(10, 0); normal.update(3.5, 0);
      const ring = aura => aura.points.getObjectByName('aura-heart-lower');
      if (Math.abs(ring(reduced).rotation.z - ring(normal).rotation.z) > 1e-8) throw Error('Reduced motion timing');
      reduced.dispose(); normal.dispose();
    } finally { globalThis.matchMedia = match; }
    return result;
  });
  if (process.env.AVATAR_SCREENSHOT_DIR) await mkdir(process.env.AVATAR_SCREENSHOT_DIR, { recursive: true });
  for (const [name, angle, night, low] of [
    ['front', '0', false, false], ['side', '1.5708', false, false],
    ['rear', '3.14159', false, false], ['night', '0', true, false], ['low', '0', false, true],
  ]) {
    await page.evaluate(({ angle, night, low }) => {
      document.getElementById('angle').value = String(angle);
      document.getElementById('night').checked = night;
      document.getElementById('low').checked = low;
      document.getElementById('bloom').checked = false;
      const timeline = document.getElementById('timeline'); timeline.value = '3';
      timeline.dispatchEvent(new Event('input'));
    }, { angle, night, low });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (process.env.AVATAR_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.AVATAR_SCREENSHOT_DIR}/sen-kim-${name}.png` });
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors, report: await page.$eval('#report', e => e.textContent) }));
} finally {
  await browser?.close();
  server.kill();
}
