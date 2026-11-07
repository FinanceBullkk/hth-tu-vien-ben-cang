// Optional: PLAYWRIGHT_MODULE points to an existing Playwright installation.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ configFile: false, appType: 'custom', root: process.cwd(), publicDir: 'client/public', server: { host: '127.0.0.1', port: 0 } });
server.middlewares.use('/aura-preview', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end('<html><head><title>Aura cultivation</title><link rel="icon" href="data:,"></head><body style="margin:0;background:#17232b"></body></html>');
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(`${server.resolvedUrls.local[0]}aura-preview`);
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { Avatar } = await import('/client/src/player/avatar.js');
    const { EFFECT_NAMES } = await import('/shared/protocol.js');
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(1280, 800);
    document.body.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#17232b');
    scene.add(new THREE.HemisphereLight(0xffffff, 0x71867a, 3));
    const camera = new THREE.PerspectiveCamera(35, 1.6, 0.1, 100);
    camera.position.set(0, 8, 17);
    camera.lookAt(0, 0.8, 0);
    const avatars = [];
    for (let effect = 1; effect <= 8; effect++) {
      const avatar = new Avatar({ name: EFFECT_NAMES[effect], effect, lowQuality: true });
      avatar.root.position.set(((effect - 1) % 4 - 1.5) * 3.2, 0, effect <= 4 ? -2 : 2);
      avatar.setCultivation(3);
      avatar.setActivity(1);
      avatar.update(1 / 60, false);
      avatars.push(avatar);
      scene.add(avatar.root);
    }
    renderer.render(scene, camera);
    const geometryCount = renderer.info.memory.geometries;
    const shaderErrors = renderer.info.programs.some((p) => p.diagnostics?.runnable === false);
    for (let tier = 0; tier <= 3; tier++) {
      for (const avatar of avatars) {
        avatar.setCultivation(tier);
        avatar.update(1 / 60, false);
      }
      renderer.render(scene, camera);
    }
    return { shaderErrors, stableGeometry: renderer.info.memory.geometries <= geometryCount, calls: renderer.info.render.calls };
  });
  assert.deepEqual(errors, []);
  assert.equal(result.shaderErrors, false);
  assert.equal(result.stableGeometry, true);
  const screenshot = path.join(os.tmpdir(), 'hth-cultivation-preview.png');
  await page.screenshot({ path: screenshot });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ...result, screenshot }));
} finally {
  await browser?.close();
  await server.close();
}
