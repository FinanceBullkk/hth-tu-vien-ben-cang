import crypto from 'node:crypto';
import { VOICE } from '../shared/voice.js';
import { cloudflareTurn } from './cloudflare-turn.js';

// Only configured ICE services are contacted. TURN shared secret never reaches clients.
export function voiceIce(env = process.env, sid = 0, now = Date.now()) {
  const urls = (key, scheme) => (env[key] || '').split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    if (!scheme.test(s) || s.length > 512) throw new Error(`${key}: URL ICE không hợp lệ.`);
    return s;
  });
  const stun = urls('VOICE_STUN_URLS', /^stuns?:[^\s]+$/);
  const turn = urls('VOICE_TURN_URLS', /^turns?:[^\s]+$/);
  if (turn.length && !env.VOICE_TURN_SECRET) throw new Error('VOICE_TURN_SECRET cần cho TURN.');
  const iceServers = stun.length ? [{ urls: stun }] : [];
  if (turn.length) {
    const username = `${Math.floor(now / 1000) + 86400}:${sid}`;
    const credential = crypto.createHmac('sha1', env.VOICE_TURN_SECRET).update(username).digest('base64');
    iceServers.push({ urls: turn, username, credential });
  }
  return iceServers;
}

export class Voice {
  constructor(players, { turn = cloudflareTurn() } = {}) {
    voiceIce(); // Fail early for invalid operator configuration.
    this.turn = turn;
    this.players = players;
    this.links = new Map();
  }

  enable(p, data) {
    if (typeof data?.enabled !== 'boolean') return { ok: false };
    if (!data.enabled) p.voiceRequest = null;
    if (data.enabled && this.turn && !p.voice) return this.enableTurn(p);
    if (p.voice !== data.enabled) {
      if (data.enabled && Date.now() - (p.voiceChanged ?? 0) < 500) return { ok: false, error: 'Đợi một nhịp rồi thử lại nhé.' };
      p.voiceChanged = Date.now();
      p.voice = data.enabled;
      this.sync();
    }
    return { ok: true, iceServers: p.voice ? (this.turn ? p.voiceIce : voiceIce(process.env, p.sid)) : [], peers: this.peers(p.sid) };
  }

  async enableTurn(p) {
    if (p.voiceRequest || Date.now() - (p.voiceChanged ?? 0) < 5000) return { ok: false, error: 'Đợi vài giây rồi bật lại voice nhé.' };
    p.voiceChanged = Date.now();
    const request = p.voiceRequest = Symbol();
    const socket = p.socket;
    try {
      const cached = p.voiceIce && Date.now() < p.voiceIceExpires;
      const iceServers = cached ? p.voiceIce : await this.turn();
      // A delayed API response must not re-enable capture after leave/disable/reconnect.
      if (p.voiceRequest !== request || !socket || p.socket !== socket) return { ok: false };
      p.voiceIce = iceServers;
      if (!cached) p.voiceIceExpires = Date.now() + 23 * 60 * 60 * 1000;
      p.voice = true;
      this.sync();
      return { ok: true, iceServers: p.voiceIce, peers: this.peers(p.sid) };
    } catch {
      return { ok: false, error: 'Chưa kết nối được dịch vụ voice. Đợi vài giây rồi thử lại.' };
    } finally {
      if (p.voiceRequest === request) p.voiceRequest = null;
    }
  }

  leave(p) {
    p.voiceRequest = null;
    p.voice = false;
    p.voiceChanged = 0;
    this.sync();
  }

  sync() {
    // ponytail: bounded six-peer mesh; use an SFU if dense room-wide voice becomes necessary.
    const active = [...this.players.values()].filter((p) => p.voice && p.socket);
    const candidates = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const [a, b] = [active[i], active[j]].sort((x, y) => x.sid - y.sid);
        const key = `${a.sid}:${b.sid}`;
        const distance = Math.hypot(a.x - b.x, a.z - b.z);
        const old = this.links.get(key);
        if (distance < (old ? VOICE.disconnectDistance : VOICE.hearDistance)) candidates.push({ key, a, b, distance, old });
      }
    }
    candidates.sort((a, b) => Number(Boolean(b.old)) - Number(Boolean(a.old)) || a.distance - b.distance || a.a.sid - b.a.sid || a.b.sid - b.b.sid);
    const next = new Map();
    const counts = new Map();
    for (const pair of candidates) {
      if ((counts.get(pair.a.sid) || 0) >= VOICE.maxPeers || (counts.get(pair.b.sid) || 0) >= VOICE.maxPeers) continue;
      next.set(pair.key, pair.old || { a: pair.a.sid, b: pair.b.sid, token: crypto.randomUUID() });
      for (const p of [pair.a, pair.b]) counts.set(p.sid, (counts.get(p.sid) || 0) + 1);
    }
    const changed = new Set();
    for (const [key, link] of this.links) if (!next.has(key)) { changed.add(link.a); changed.add(link.b); }
    for (const [key, link] of next) if (!this.links.has(key)) { changed.add(link.a); changed.add(link.b); }
    this.links = next;
    for (const sid of changed) this.players.get(sid)?.socket?.emit('voice:peers', this.peers(sid));
  }

  peers(sid) {
    return [...this.links.values()].filter((l) => l.a === sid || l.b === sid).map((l) => {
      const other = l.a === sid ? l.b : l.a;
      return { sid: other, name: this.players.get(other)?.name, token: l.token, offerer: sid === l.a };
    });
  }

  signal(p, data) {
    const other = this.players.get(data?.to);
    if (!p.voice || !other?.voice || !other.socket || other === p) return { ok: false };
    const key = [p.sid, other.sid].sort((a, b) => a - b).join(':');
    const link = this.links.get(key);
    if (!link || data.token !== link.token || Math.hypot(p.x - other.x, p.z - other.z) >= VOICE.disconnectDistance) return { ok: false };
    const now = Date.now();
    if (now - (p.voiceWindow || 0) >= 1000) { p.voiceWindow = now; p.voiceSignals = 0; }
    if ((p.voiceSignals = (p.voiceSignals || 0) + 1) > 40) return { ok: false };
    let signal;
    if (['offer', 'answer'].includes(data?.description?.type)) {
      const { type, sdp } = data.description;
      if (typeof sdp !== 'string' || !sdp.length || sdp.length > 16000 || /^m=(?!audio )/m.test(sdp)) return { ok: false };
      if ((type === 'offer') !== (p.sid === link.a)) return { ok: false };
      signal = { description: { type, sdp } };
    } else {
      const c = data?.candidate;
      if (!c || typeof c.candidate !== 'string' || c.candidate.length > 1500 ||
          !(c.sdpMid === null || (typeof c.sdpMid === 'string' && c.sdpMid.length < 64)) ||
          !(c.sdpMLineIndex === null || (Number.isInteger(c.sdpMLineIndex) && c.sdpMLineIndex >= 0 && c.sdpMLineIndex < 8))) return { ok: false };
      signal = { candidate: { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex } };
    }
    other.socket.emit('voice:signal', { from: p.sid, token: link.token, ...signal });
    return { ok: true };
  }
}
