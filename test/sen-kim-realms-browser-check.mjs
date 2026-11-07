// Start the preview with the config in plans/261108-sen-kim-realms first.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const { default: puppeteer } = await import(process.env.PUPPETEER_MODULE || 'puppeteer');
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGL/i.test(m.text())) errors.push(m.text()); });
  await page.setViewport({ width: 1440, height: 860 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto('http://127.0.0.1:5188/plans/261108-sen-kim-realms/index.html');
  await page.waitForFunction(() => window.__realmPreview);
  const frame = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await frame();
  await page.screenshot({ path: 'plans/261108-sen-kim-realms/comparison.png' });
  const state = await page.evaluate(async () => {
    const { ACTIVITY } = await import('/shared/protocol.js');
    const { avatars, scenes } = window.__realmPreview;
    const first = avatars()[0];
    first.setCultivation(2);
    if (first.cultivation.points.getObjectByName('sen-kim-cultivation').userData.breakthrough) throw Error('Snapshot started breakthrough');
    first.setCultivation(3, true); first.update(.1, false, 4);
    const live = first.cultivation;
    if (!live.points.getObjectByName('sen-kim-cultivation').userData.breakthrough) throw Error('Live upgrade missed breakthrough');
    first.setCultivation(3, true);
    if (first.cultivation !== live) throw Error('Duplicate tier restarted breakthrough');
    first.time += 8; first.update(0, false, 4);
    if (live.points.getObjectByName('sen-kim-cultivation').userData.breakthrough) throw Error('Breakthrough repeated');
    for (const a of avatars()) {
      if (a.aura.points) throw Error('Legacy Sen Kim still overlays realm');
      if (a.cultivation.points.getObjectByName('sen-kim-cultivation').userData.tier !== a.cultivationTier) throw Error('Wrong realm');
    }
    for (const tier of [1, 2, 3, 0, 3]) {
      first.setCultivation(tier); first.update(.016, false, 4);
      if (first.cultivation.points.getObjectByName('sen-kim-cultivation').userData.tier !== tier) throw Error('Tier update failed');
    }
    first.setLook(1, 6, 0, 1, 0, 2);
    if (!first.aura.points || first.cultivation.points.getObjectByName('sen-kim-cultivation')) throw Error('Other aura changed');
    first.setLook(1, 6, 0, 1, 0, 1);
    if (first.aura.points || first.cultivationTier !== 3) throw Error('Realm lost after look change');
    first.setActivity(ACTIVITY.meditate);
    first.setQi(750);
    first.update(.1, false, 4);
    if (first.cultivationTier !== 3) throw Error('Qi altered realm');
    const ownedMaterial = first.cultivation.points.getObjectByName('sen-kim-lotus').material;
    first.fadeOut(); first.update(.3, false, 4);
    if (first.cultivation.points.getObjectByName('sen-kim-lotus').material !== ownedMaterial) throw Error('Fade cloned owned shader');
    if (!(ownedMaterial.uniforms.fade.value > 0 && ownedMaterial.uniforms.fade.value < 1)) throw Error('Fade not applied');
    first.dispose(scenes[0]);
    return { tierUpdates: 5, lookChanges: 2, qiIndependent: true, fading: true, liveOnlyBreakthrough: true };
  });
  await page.click('#low'); await page.click('#night'); await frame();
  await page.screenshot({ path: 'plans/261108-sen-kim-realms/seated-low.png' });
  await page.setViewport({ width: 390, height: 1100 }); await frame();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'plans/261108-sen-kim-realms/mobile.png', fullPage: true });
  await page.setViewport({ width: 1440, height: 1000 });
  await page.click('#low'); await page.click('#night');
  for (const tier of [1, 2, 3]) {
    await page.click(`[data-tier="${tier}"]`);
    for (const age of [1, 3.5, 4.7, 8]) {
      await page.$eval('#timeline', (el, value) => { el.value = value; el.dispatchEvent(new Event('input')); }, String(age));
      await frame();
      assert.ok(await page.evaluate(() => window.__realmPreview.avatars().every(a => a.root.position.y === 0)));
      if (tier === 2) await page.screenshot({ path: `plans/261108-sen-kim-realms/breakthrough-${age}.png` });
    }
  }
  await page.click('#orbit'); await page.click('#pause');
  // Deterministic orbit sampling avoids relying on elapsed browser time.
  for (const [name, angle] of [['front', 0], ['side', Math.PI / 2], ['rear', Math.PI], ['diagonal', Math.PI * 1.25]]) {
    await page.evaluate(angle => {
      const { renderer, scenes, cameras, avatars } = window.__realmPreview;
      document.getElementById('pause').checked = true;
      const width = renderer.domElement.clientWidth / 4, height = renderer.domElement.clientHeight;
      cameras.forEach((camera, i) => {
        camera.position.set(Math.sin(angle) * 7.5, 3.2, Math.cos(angle) * 7.5); camera.lookAt(0, 1.05, 0);
        renderer.setViewport(i * width, 0, width, height); renderer.setScissor(i * width, 0, width, height);
        avatars()[i].update(0, false, 7.5); renderer.render(scenes[i], camera);
      });
    }, angle);
    // Render loop would overwrite cameras; freeze it for screenshot capture via canvas data.
    const shot = await page.evaluate(angle => {
      const { renderer, scenes, cameras } = window.__realmPreview;
      const w = renderer.domElement.clientWidth / 4, h = renderer.domElement.clientHeight;
      cameras.forEach((c, i) => { c.position.set(Math.sin(angle) * 7.5, 3.2, Math.cos(angle) * 7.5); c.lookAt(0, 1.05, 0);
        renderer.setViewport(i * w, 0, w, h); renderer.setScissor(i * w, 0, w, h); renderer.render(scenes[i], c); });
      return renderer.domElement.toDataURL('image/png').split(',')[1];
    }, angle);
    await writeFile(`plans/261108-sen-kim-realms/orbit-${name}.png`, Buffer.from(shot, 'base64'));
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ...state, mobile: true, shaderErrors: errors }));
} finally { await browser.close(); }
