import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloudflareTurn } from '../server/cloudflare-turn.js';
import { Voice } from '../server/voice.js';

const env = { VOICE_CLOUDFLARE_KEY_ID: 'a'.repeat(32), VOICE_CLOUDFLARE_API_TOKEN: 'private-test-token' };
const iceServers = [{ urls: ['turn:turn.cloudflare.com:3478?transport=udp'], username: 'temporary-user', credential: 'temporary-password' }];

test('Cloudflare credentials use fixed HTTPS endpoint, timeout, TTL, and strip extra fields', async () => {
  assert.equal(cloudflareTurn({}), null);
  assert.throws(() => cloudflareTurn({ VOICE_CLOUDFLARE_KEY_ID: env.VOICE_CLOUDFLARE_KEY_ID }));
  assert.throws(() => cloudflareTurn({ ...env, VOICE_CLOUDFLARE_KEY_ID: '../bad' }));
  const get = cloudflareTurn(env, async (url, options) => {
    assert.equal(url, `https://rtc.live.cloudflare.com/v1/turn/keys/${env.VOICE_CLOUDFLARE_KEY_ID}/credentials/generate-ice-servers`);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, `Bearer ${env.VOICE_CLOUDFLARE_API_TOKEN}`);
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.deepEqual(JSON.parse(options.body), { ttl: 86400 });
    return Response.json({ iceServers: iceServers.map((s) => ({ ...s, secret: 'discard' })) });
  });
  assert.deepEqual(await get(), iceServers);
});

test('Cloudflare rejects provider errors and malformed/untrusted relay responses', async () => {
  for (const body of [{}, { iceServers: [] }, { iceServers: [{ urls: ['https://evil.example'] }] },
    { iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }] },
    { iceServers: [{ ...iceServers[0], credential: env.VOICE_CLOUDFLARE_API_TOKEN }] },
    { iceServers: [{ ...iceServers[0], username: '' }] }]) {
    await assert.rejects(cloudflareTurn(env, async () => Response.json(body))());
  }
  await assert.rejects(cloudflareTurn(env, async () => new Response('private error', { status: 401 }))(), /unavailable/);
});

function fixture(turn) {
  const p = { sid: 1, name: 'One', x: 0, z: 0, socket: { emit() {} } };
  const q = { sid: 2, name: 'Two', x: 0, z: 0, voice: true, socket: { emit() {} } };
  const voice = new Voice(new Map([[1, p], [2, q]]), { turn });
  return { p, voice, enable: () => voice.enable(p, { enabled: true }) };
}

test('TURN enable waits for credentials, prevents duplicate requests and reuses unexpired credentials', async () => {
  let resolve, calls = 0;
  const f = fixture(() => { calls++; return new Promise((r) => { resolve = r; }); });
  const pending = f.enable();
  assert.equal(f.voice.links.size, 0);
  assert.equal((await f.enable()).ok, false);
  resolve(iceServers);
  assert.deepEqual((await pending).iceServers, iceServers);
  assert.equal(f.voice.links.size, 1);
  f.voice.enable(f.p, { enabled: false });
  assert.equal(f.voice.links.size, 0);
  f.p.voiceChanged = 0;
  assert.equal((await f.enable()).ok, true);
  assert.equal(calls, 1);
});

test('disable, leave or replaced socket during TURN fetch cannot rejoin voice', async () => {
  for (const cancel of [(f) => f.voice.enable(f.p, { enabled: false }), (f) => f.voice.leave(f.p),
    (f) => { f.p.socket = { emit() {} }; }]) {
    let resolve;
    const f = fixture(() => new Promise((r) => { resolve = r; }));
    const pending = f.enable();
    cancel(f);
    resolve(iceServers);
    assert.equal((await pending).ok, false);
    assert.ok(!f.p.voice);
    assert.equal(f.voice.links.size, 0);
    assert.equal(f.p.voiceIce, undefined);
  }
});

test('TURN failures stay private, remain disabled, and expire cached credentials', async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; throw new Error('private provider error'); });
  f.p.voiceIce = iceServers; f.p.voiceIceExpires = 0;
  const result = await f.enable();
  assert.equal(result.ok, false);
  assert.ok(!result.error.includes('private'));
  assert.ok(!f.p.voice);
  assert.equal(f.voice.links.size, 0);
  assert.equal((await f.enable()).ok, false);
  assert.equal(calls, 1);
});
