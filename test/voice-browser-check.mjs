// Run after build: node test/voice-browser-check.mjs. Optional PLAYWRIGHT_MODULE points to installed index.mjs.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { MELODY_ZONE } from '../shared/layout.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = process.env.VOICE_TEST_URL || 'http://localhost:3938';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hth-voice-'));
const cfg = JSON.parse(fs.readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
Object.assign(cfg, { port: 3938, bellSchedule: [], adminKey: 'v'.repeat(32) });
fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(cfg));
const proc = process.env.VOICE_TEST_URL ? null : spawn(process.execPath, ['server/index.js'], {
  cwd: path.resolve(import.meta.dirname, '..'),
  env: { ...process.env, PORT: '3938', HTH_CONFIG: path.join(dir, 'config.json'), DB_PATH: path.join(dir, 'voice.db') },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const browsers = [];
const errors = [];
try {
  if (proc) await Promise.race([
    new Promise((resolve) => proc.stdout.on('data', (d) => { if (String(d).includes('đang chạy')) resolve(); })),
    once(proc, 'exit').then(([code]) => { throw new Error(`Server exited ${code}`); }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Server startup timeout')), 15000).unref()),
  ]);
  const makePage = async (name, mobile = false) => {
    const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    browsers.push(browser);
    const page = await browser.newPage(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (err) => errors.push(err.message));
    await page.addInitScript((relayOnly) => {
      if (relayOnly) {
        const PeerConnection = window.RTCPeerConnection;
        window.RTCPeerConnection = class extends PeerConnection {
          constructor(config) { super({ ...config, iceTransportPolicy: 'relay' }); }
        };
      }
      // Synthetic source, not a physical microphone. Audio still crosses real WebRTC connections.
      navigator.mediaDevices.getUserMedia = async () => {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain(); gain.gain.value = 0.1;
        const dest = ctx.createMediaStreamDestination();
        oscillator.connect(gain).connect(dest); oscillator.start(); await ctx.resume();
        window.__testCapture = { ctx, stream: dest.stream };
        return dest.stream;
      };
      localStorage.setItem('hth.tutorialDone', '1');
    }, process.env.VOICE_RELAY_ONLY === '1');
    await page.goto(baseUrl);
    if (!mobile) await page.getByRole('button', { name: 'Mặc bộ Lee Sin · Long quyền', exact: true }).click();
    await page.locator('#nameInput').fill(name);
    // Other in-progress HUDs may overlay the welcome screen in this shared checkout.
    await page.locator('#enterBtn').evaluate((el) => el.click());
    await page.waitForFunction(() => window.__hth?.net.ready);
    await page.evaluate(() => {
      const net = window.__hth.net, call = net.call.bind(net);
      net.call = async (...args) => {
        const result = await call(...args);
        if (args[0] === 'voice:enable' && args[1]?.enabled) window.__voiceJoinResult = { ok: result?.ok, error: result?.error };
        return result;
      };
    });
    await page.waitForFunction(() => window.__hth.voice.active);
    assert.equal(await page.evaluate(() => window.__hth.voice.mode), 'ptt');
    assert.equal(await page.evaluate(() => window.__testCapture.stream.getAudioTracks()[0].enabled), false);
    await page.locator('#musicPanel').evaluate((el) => { el.hidden = true; });
    await page.locator('.tutorial').evaluateAll((els) => els.forEach((el) => el.remove()));
    return page;
  };
  const a = await makePage('Voice browser A');
  const b = await makePage('Voice browser B', true);
  const openVoice = async (page) => {
    await page.evaluate(() => { if (document.pointerLockElement) document.exitPointerLock(); });
    if (!(await page.locator('.voice-details').evaluate((el) => el.open))) await page.getByLabel('Cài đặt voice', { exact: true }).click();
  };
  for (const page of [a, b]) {
    assert.equal(await page.getByRole('button', { name: 'Bật voice', exact: true }).isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Bật mic', exact: true }).getAttribute('aria-pressed'), 'false');
    await openVoice(page);
    assert.equal(await page.getByRole('button', { name: 'Tắt voice', exact: true }).isVisible(), true);
    await page.getByLabel('Cài đặt voice', { exact: true }).press('Escape');
    assert.equal(await page.locator('.voice-details').evaluate((el) => el.open), false);
    await openVoice(page);
  }
  console.log('PASS: entering auto-connects voice with push-to-talk and a silent mic');
  for (const page of [a, b]) {
    await page.getByRole('button', { name: 'Tắt voice', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__hth.voice.active), false);
  }
  console.log('PASS: icon-only default, accessible expansion and Escape on desktop/mobile');
  await a.getByRole('button', { name: 'Thử mic', exact: true }).click();
  await a.waitForFunction(() => window.__hth.voice.micTest.recorder?.state === 'recording');
  assert.equal(await a.evaluate(() => window.__hth.voice.active), false);
  assert.equal(await a.evaluate(() => window.__hth.voice.peers.size), 0);
  await a.waitForFunction(() => window.__hth.voice.micTest.audio.currentTime > 0);
  assert.equal(await a.evaluate(() => window.__testCapture.stream.getAudioTracks()[0].readyState), 'ended');
  await a.waitForFunction(() => !window.__hth.voice.micTest.busy);
  assert.equal(await a.evaluate(() => window.__hth.voice.micTest.audio.getAttribute('src')), null);
  await a.getByRole('button', { name: 'Thử mic', exact: true }).click();
  await a.waitForFunction(() => window.__hth.voice.micTest.recorder?.state === 'recording');
  await a.getByRole('button', { name: 'Hủy thử mic', exact: true }).click();
  assert.equal(await a.evaluate(() => window.__testCapture.stream.getAudioTracks()[0].readyState), 'ended');
  console.log('PASS: local mic test records, plays, discards and cancels without joining voice');
  for (const page of [a, b]) {
    assert.equal(await page.evaluate(() => window.__hth.voice.active), false);
    await page.getByRole('button', { name: 'Bật voice', exact: true }).click();
    await page.waitForFunction(() => window.__hth.voice.active || !window.__hth.voice.starting);
    assert.equal(await page.evaluate(() => window.__hth.voice.active), true, JSON.stringify(await page.evaluate(() => window.__voiceJoinResult)));
    assert.equal(await page.evaluate(() => window.__testCapture.stream.getAudioTracks()[0].enabled), false);
    await page.getByRole('button', { name: 'Bật mic', exact: true }).click();
    await page.waitForFunction(() => window.__hth.voice.transmitting);
    assert.equal(await page.getByRole('button', { name: 'Tắt mic', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Tắt mic', exact: true }).click();
    await page.waitForFunction(() => !window.__hth.voice.transmitting);
    await page.getByRole('button', { name: 'Bật mic', exact: true }).click();
    await page.getByRole('combobox', { name: 'Chế độ mic' }).selectOption('ptt');
  }
  for (const page of [a, b]) await page.waitForFunction(() => [...window.__hth.voice.peers.values()].some((p) => p.pc.connectionState === 'connected'), { timeout: 20000 });
  console.log('PASS: two isolated browsers negotiate WebRTC audio, default mic silent');
  if (process.env.VOICE_RELAY_ONLY === '1') {
    for (const page of [a, b]) assert.equal(await page.evaluate(async () => {
      const peer = [...window.__hth.voice.peers.values()][0];
      const stats = await peer.pc.getStats();
      const transport = [...stats.values()].find((s) => s.type === 'transport' && s.selectedCandidatePairId);
      const pair = stats.get(transport?.selectedCandidatePairId);
      return stats.get(pair?.localCandidateId)?.candidateType;
    }), 'relay');
    console.log('PASS: both browsers use actual TURN relay candidates');
  }
  await a.locator('#scene').click({ position: { x: 900, y: 400 } });
  await a.keyboard.down('v');
  await a.waitForFunction(() => window.__hth.voice.transmitting);
  await b.waitForFunction(() => [...window.__hth.voice.peers.values()].some((p) => p.speaking));
  assert.match(await b.locator('.voice-speakers').innerText(), /Voice browser A/);
  const bytes = await b.evaluate(async () => {
    const stats = await [...window.__hth.voice.peers.values()][0].pc.getStats();
    return [...stats.values()].filter((s) => s.type === 'inbound-rtp' && s.kind === 'audio').reduce((sum, s) => sum + s.bytesReceived, 0);
  });
  assert.ok(bytes > 0);
  await a.keyboard.up('v');
  await a.waitForFunction(() => !window.__hth.voice.transmitting);
  console.log('PASS: push-to-talk sends real audio packets and remote speech meter responds');
  await openVoice(a);
  await a.getByRole('combobox', { name: 'Chế độ mic' }).selectOption('open');
  await a.waitForFunction(() => window.__hth.voice.transmitting);
  await a.evaluate(() => {
    const input = document.createElement('input'); input.id = 'voiceTypingCheck'; document.body.append(input); input.focus();
  });
  await a.waitForFunction(() => !window.__hth.voice.transmitting);
  await a.evaluate(() => document.getElementById('voiceTypingCheck').remove());
  await a.waitForFunction(() => window.__hth.voice.transmitting);
  await a.getByRole('combobox', { name: 'Chế độ mic' }).selectOption('ptt');
  await a.waitForFunction(() => !window.__hth.voice.transmitting);
  await b.getByRole('button', { name: 'Tắt nghe', exact: true }).click();
  await b.waitForFunction(() => [...window.__hth.voice.peers.values()].every((p) => p.gain.gain.value < 0.001));
  await b.getByRole('button', { name: 'Bật nghe', exact: true }).click();
  // Mobile press/release and lost pointer capture cannot leave mic on.
  const talk = b.getByRole('button', { name: 'Giữ để nói · V', exact: true });
  const rect = await talk.boundingBox();
  const cdp = await b.context().newCDPSession(b);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }] });
  await b.waitForFunction(() => window.__hth.voice.transmitting);
  await a.waitForFunction(() => [...window.__hth.voice.peers.values()].some((p) => p.speaking));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  assert.equal(await b.evaluate(() => window.__hth.voice.transmitting), false);
  await a.evaluate(() => { window.__hth.me.x = 0; window.__hth.me.z = 5; });
  for (const page of [a, b]) await page.waitForFunction(() => window.__hth.voice.peers.size === 0);
  console.log('PASS: deafen, mobile release, server distance revocation');
  fs.mkdirSync(path.join(import.meta.dirname, '../plans/reports'), { recursive: true });
  await b.getByLabel('Cài đặt voice', { exact: true }).click();
  await b.screenshot({ path: path.join(import.meta.dirname, '../plans/reports/voice-mic-icon-mobile.png') });
  await openVoice(b);
  await b.screenshot({ path: path.join(import.meta.dirname, '../plans/reports/voice-mobile.png') });
  await b.getByRole('button', { name: 'Tắt voice', exact: true }).click();
  assert.equal(await b.evaluate(() => window.__testCapture.stream.getAudioTracks()[0].readyState), 'ended');
  // Cancellation while browser permission is pending must stop the eventual stream.
  await b.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () => new Promise((resolve) => { window.__resolveCapture = resolve; });
  });
  await b.getByRole('button', { name: 'Bật voice', exact: true }).click();
  await b.getByRole('button', { name: 'Hủy mở mic', exact: true }).click();
  await b.evaluate(() => {
    const ctx = new AudioContext(); const dest = ctx.createMediaStreamDestination();
    window.__lateCapture = dest.stream; window.__resolveCapture(dest.stream);
  });
  await b.waitForFunction(() => window.__lateCapture.getTracks()[0].readyState === 'ended');
  assert.equal(await b.evaluate(() => window.__hth.voice.active), false);
  await b.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('denied', 'NotAllowedError'); };
  });
  await b.getByRole('button', { name: 'Bật voice', exact: true }).click();
  await b.waitForFunction(() => !window.__hth.voice.starting);
  assert.equal(await b.evaluate(() => window.__hth.voice.active), false);
  assert.match(await b.locator('#toasts').innerText(), /Mic bị chặn/);
  await a.evaluate(() => window.__hth.net.socket.disconnect());
  await a.waitForFunction(() => window.__testCapture.stream.getAudioTracks()[0].readyState === 'ended');
  await b.evaluate(async () => {
    const app = window.__hth;
    for (const effect of [1, 2, 8, 9]) {
      const avatar = app.me.avatar;
      avatar.setLook(avatar.color, avatar.hatIndex, avatar.hairIndex, avatar.attireIndex, avatar.weaponIndex, effect);
      avatar.update(0.1, false, 3);
    }
    await app.activities.meditation.start();
  });
  await b.waitForFunction(() => window.__hth.activities.meditation.ready && window.__hth.me.avatar.qi > 0);
  await b.evaluate(async (zone) => {
    const app = window.__hth;
    app.activities.exit();
    app.me.placeAt(zone.x, zone.z, 0);
    await app.net.call('move', [zone.x, zone.z, 0, 0]);
    await app.activities.melody.start();
  }, MELODY_ZONE);
  await b.waitForFunction(() => window.__hth.activities.melody.state === 'ready');
  await b.evaluate(() => window.__hth.activities.melody.begin());
  await b.waitForFunction(() => window.__hth.activities.melody.state === 'playing' && window.__hth.me.avatar.instrument.group.visible);
  await b.evaluate(() => window.__hth.activities.exit());
  console.log('PASS: Lee Sin entry, aura effects 1/2/8/9, meditation qi, melody start/audio/instrument/exit preserved');
  assert.deepEqual(errors, []);
  console.log('PASS: open mic/text-input mute, touch cancel, denied/late permission, disconnect cleanup; no browser exceptions');
} catch (error) {
  for (const browser of browsers) for (const context of browser.contexts()) for (const page of context.pages()) {
    console.error('Voice diagnostics:', await page.evaluate(() => {
      const app = window.__hth;
      return { ready: app?.net.ready, active: app?.voice.active, admission: window.__voiceJoinResult,
        position: app?.me && { x: app.me.x, z: app.me.z },
        peers: [...(app?.voice.peers.values() || [])].map((p) => ({
          connection: p.pc.connectionState, ice: p.pc.iceConnectionState,
          gathering: p.pc.iceGatheringState, signaling: p.pc.signalingState,
        })) };
    }).catch(() => 'Page unavailable'));
  }
  throw error;
} finally {
  await Promise.all(browsers.map((browser) => browser.close()));
  if (proc && proc.exitCode === null) { const stopped = once(proc, 'exit'); proc.kill(); await stopped; }
  fs.rmSync(dir, { recursive: true, force: true });
}
