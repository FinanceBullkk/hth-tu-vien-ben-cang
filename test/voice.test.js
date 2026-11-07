import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { Voice, voiceIce } from '../server/voice.js';
import { VOICE, voiceVolume } from '../shared/voice.js';

function fixture(count = 2) {
  const players = new Map();
  const messages = [];
  for (let sid = 1; sid <= count; sid++) players.set(sid, {
    sid, name: `Player ${sid}`, x: 0, z: 0,
    socket: { emit: (event, data) => messages.push({ sid, event, data }) },
  });
  const voice = new Voice(players);
  const [a, b] = players.values();
  const enable = (p) => voice.enable(p, { enabled: true });
  const offer = () => ({ to: b.sid, token: voice.peers(a.sid)[0]?.token, description: { type: 'offer', sdp: 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n' } });
  return { players, messages, voice, a, b, enable, offer };
}

test('voice volume fades to silence at hearing limit', () => {
  assert.equal(voiceVolume(0), 1);
  assert.equal(voiceVolume(VOICE.fullDistance), 1);
  assert.ok(voiceVolume(10) > 0 && voiceVolume(10) < 1);
  assert.equal(voiceVolume(VOICE.hearDistance), 0);
  assert.equal(voiceVolume(Infinity), 0);
  assert.equal(voiceVolume(NaN), 0);
});

test('ICE is opt-in; temporary TURN credential does not reveal shared secret', () => {
  assert.deepEqual(voiceIce({}), []);
  const env = { VOICE_STUN_URLS: 'stun:ice.example:3478', VOICE_TURN_URLS: 'turn:ice.example:3478?transport=udp,turns:ice.example:5349', VOICE_TURN_SECRET: 'test-secret' };
  const result = voiceIce(env, 7, 100000);
  assert.equal(result[1].username, '86500:7');
  assert.equal(result[1].credential, crypto.createHmac('sha1', env.VOICE_TURN_SECRET).update('86500:7').digest('base64'));
  assert.equal(JSON.stringify(result).includes('test-secret'), false);
  assert.throws(() => voiceIce({ VOICE_STUN_URLS: 'https://example.com' }));
  assert.throws(() => voiceIce({ VOICE_TURN_URLS: 'turn:ice.example:3478' }));
});

test('voice requires both opt-ins, pairs are symmetric and tokenized, peers expose no playerId', () => {
  const f = fixture();
  assert.equal(f.voice.signal(f.a, f.offer()).ok, false);
  assert.equal(f.voice.enable(f.a, { enabled: 'true' }).ok, false);
  f.enable(f.a);
  assert.equal(f.voice.links.size, 0);
  const res = f.enable(f.b);
  assert.equal(res.peers[0].sid, f.a.sid);
  assert.equal(res.peers[0].offerer, false);
  assert.deepEqual(Object.keys(res.peers[0]).sort(), ['name', 'offerer', 'sid', 'token']);
  assert.equal(f.voice.peers(f.a.sid)[0].token, res.peers[0].token);
  assert.equal(f.voice.signal(f.a, f.offer()).ok, true);
  assert.equal(f.messages.at(-1).data.from, f.a.sid);
});

test('voice rejects wrong targets, stale tokens, video, invalid SDP and malformed ICE', () => {
  const f = fixture(); f.enable(f.a); f.enable(f.b);
  const valid = f.offer();
  for (const invalid of [null, {}, { ...valid, to: 100 }, { ...valid, to: f.a.sid }, { ...valid, token: 'old' },
    { ...valid, description: { type: 'offer', sdp: 'x'.repeat(16001) } },
    { ...valid, description: { type: 'offer', sdp: 'm=video 9 RTP/AVP 96' } },
    { ...valid, description: { type: 'offer', sdp: '' } },
    { ...valid, description: { type: 'rollback', sdp: 'v=0' } },
    { ...valid, description: undefined, candidate: { candidate: 3 } },
    { ...valid, description: undefined, candidate: { candidate: 'candidate:x', sdpMid: 3, sdpMLineIndex: -1 } },
  ]) assert.equal(f.voice.signal(f.a, invalid).ok, false);
  assert.equal(f.voice.signal(f.b, { ...valid, to: f.a.sid }).ok, false, 'only lower sid may offer');
  const candidate = { candidate: 'candidate:x', sdpMid: '0', sdpMLineIndex: 0, playerId: 'private' };
  f.a.voiceSignals = 0;
  assert.equal(f.voice.signal(f.a, { ...valid, description: undefined, candidate }).ok, true);
  assert.equal(f.messages.at(-1).data.candidate.playerId, undefined);
});

test('voice bounds fanout and signal rate, retains existing links to avoid churn', () => {
  const f = fixture(20);
  for (const p of f.players.values()) f.enable(p);
  for (const p of f.players.values()) assert.ok(f.voice.peers(p.sid).length <= VOICE.maxPeers);
  const old = [...f.voice.links.entries()];
  f.voice.sync();
  assert.deepEqual([...f.voice.links.entries()].sort(), old.sort());
  for (let i = 0; i < 40; i++) assert.equal(f.voice.signal(f.a, f.offer()).ok, true);
  assert.equal(f.voice.signal(f.a, f.offer()).ok, false);
});

test('distance revokes authorization immediately; reconnection gets fresh token', () => {
  const f = fixture(); f.enable(f.a); f.enable(f.b);
  const old = f.offer();
  f.b.x = VOICE.disconnectDistance + 1;
  assert.equal(f.voice.signal(f.a, old).ok, false, 'rejected even before periodic sync');
  f.voice.sync();
  assert.equal(f.voice.links.size, 0);
  assert.deepEqual(f.messages.at(-1).data, []);
  f.b.x = 0; f.voice.sync();
  assert.notEqual(f.offer().token, old.token);
  assert.equal(f.voice.signal(f.a, old).ok, false);
  f.voice.leave(f.b);
  assert.equal(f.voice.links.size, 0);
  assert.equal(f.b.voice, false);
});

test('mic disable is immediate even during toggle cooldown, ghost sockets never pair', () => {
  const f = fixture(); f.enable(f.a); f.enable(f.b);
  assert.equal(f.voice.enable(f.b, { enabled: false }).ok, true);
  assert.equal(f.voice.links.size, 0);
  assert.equal(f.enable(f.b).ok, false);
  f.b.voice = true; f.b.socket = null;
  f.voice.sync();
  assert.equal(f.voice.links.size, 0);
});
