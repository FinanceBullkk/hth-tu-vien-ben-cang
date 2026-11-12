// Âm thanh tạo bằng Web Audio, không dùng file: nền tu viện, nền cảng và các hiệu ứng.
import { POND } from '../../../shared/layout.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

export class AudioEngine {
  constructor(store) {
    this.store = store;
    this.ctx = null;
    this.muted = store.get('muted') === '1';
    this.timers = {};
    this.last = { x: 0, z: 0, night: 0 };
  }

  /** Chỉ được gọi từ một lần chạm của người dùng theo quy định trình duyệt. */
  unlock() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.ctx.resume();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp);
    comp.connect(this.ctx.destination);

    const len = this.ctx.sampleRate * 4;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.#startAmbience();
    this.#schedule('birds', 3, 8, () => this.#birdCall());
    this.#schedule('chimes', 16, 42, () => this.#windChime(0.12));
    this.#schedule('horn', 120, 180, () => this.#shipHorn());
    this.#schedule('crane', 38, 85, () => this.#craneSqueak());
    this.#schedule('crickets', 2, 5, () => this.#cricket());
  }

  setMuted(m) {
    this.muted = m;
    this.store.set('muted', m ? '1' : '0');
    if (this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  #schedule(name, minS, maxS, fn) {
    const go = () => {
      this.timers[name] = setTimeout(() => {
        if (!document.hidden && !this.muted) fn();
        go();
      }, rand(minS, maxS) * 1000);
    };
    go();
  }

  #noiseLoop(filterType, freq, q, gainValue) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = gainValue;
    src.connect(f);
    f.connect(g);
    g.connect(this.ambience);
    src.start();
    return { src, f, g };
  }

  #startAmbience() {
    // Keep continuous noise below music without quieting bells or interaction effects.
    this.ambience = this.ctx.createGain();
    this.ambience.gain.value = 0.1;
    this.ambience.connect(this.master);
    this.wind = this.#noiseLoop('bandpass', 420, 0.6, 0.05);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 170;
    lfo.connect(lfoGain);
    lfoGain.connect(this.wind.f.frequency);
    lfo.start();
    const lfo2 = this.ctx.createOscillator();
    lfo2.frequency.value = 0.11;
    const lfo2Gain = this.ctx.createGain();
    lfo2Gain.gain.value = 0.02;
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(this.wind.g.gain);
    lfo2.start();

    this.leaves = this.#noiseLoop('highpass', 3400, 0.4, 0.008);
    this.water = this.#noiseLoop('bandpass', 950, 1.2, 0);
    this.sea = this.#noiseLoop('lowpass', 420, 0.4, 0.01);
  }

  /** Mỗi giây vài lần: đổi âm nền theo vị trí người chơi và giờ trong game. */
  updatePosition(x, z, night) {
    this.last.x = x;
    this.last.z = z;
    this.last.night = night;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dPond = Math.hypot(x - POND.x, z - POND.z);
    this.water.g.gain.setTargetAtTime(0.03 * clamp(1 - (dPond - POND.radius) / 16), now, 0.4);
    // Càng về phía rào nhìn xuống cảng càng nghe rõ biển.
    this.sea.g.gain.setTargetAtTime(0.012 + 0.075 * clamp((x + 8) / 38), now, 0.5);
    this.leaves.g.gain.setTargetAtTime(0.009 * (1 - night * 0.5), now, 1);
  }

  #portLevel() {
    return 0.25 + 0.75 * clamp((this.last.x + 12) / 42);
  }

  #env(gainNode, t, attack, peak, release) {
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  }

  #tone(type, f0, t, attack, peak, release, { f1, bus } = {}) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + attack + release);
    const g = this.ctx.createGain();
    this.#env(g, t, attack, peak, release);
    o.connect(g);
    g.connect(bus || this.master);
    o.start(t);
    o.stop(t + attack + release + 0.05);
    return o;
  }

  #burst(filterType, freq, q, t, attack, peak, release) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    this.#env(g, t, attack, peak, release);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t, Math.random() * 3);
    src.stop(t + attack + release + 0.05);
    return f;
  }

  /**
   * Chuông đồng. quality 0..1: lệch nhịp thì ngân ngắn, đúng nhịp ngân dài.
   * intensity 0..1 (sự kiện chung): càng nhiều người càng trầm và dài.
   */
  bell({ quality = 1, intensity = 0, force = 1, volume = 1 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    const base = 196 - intensity * 78 - force * 12;
    const decay = (1.6 + quality * 5) * (1 + intensity * 1.4);
    const peak = clamp(volume) * (0.14 + quality * 0.1 + intensity * 0.1) * (0.65 + force * 0.35) / Math.sqrt(1 + intensity * 5);
    const partials = [[0.5, 1.1, 1], [1, 1, 0.8], [1.19, 0.5, 0.75], [1.5, 0.3, 0.6], [2, 0.5, 0.5], [2.74, 0.22, 0.35], [3.76, 0.12, 0.22]];
    for (const [ratio, amp, life] of partials) {
      const beat = 1 + (Math.random() - 0.5) * 0.003;
      this.#tone('sine', base * ratio * beat, t, 0.008, peak * amp, decay * life);
    }
    this.#burst('bandpass', 1700, 1, t, 0.003, peak * 0.5, 0.09);
  }

  rhythmBeat(beat, kind) {
    if (!this.ctx) return;
    const strong = beat < 0 || beat % 4 === 3;
    this.#tone('triangle', strong ? 440 : 660, this.ctx.currentTime, 0.002, strong ? 0.045 : 0.025, 0.085);
  }

  #pluckBuf(idx) {
    this.pluckCache = this.pluckCache || new Map();
    let buf = this.pluckCache.get(idx);
    if (buf) return buf;
    // Karplus–Strong: dây gảy cổ cầm — nhiễu đầu dây rồi lọc trung bình trôi dần.
    const sr = this.ctx.sampleRate;
    const freqs = [293.66, 329.63, 392, 440, 523.25];
    const f = freqs[idx % freqs.length];
    const n = Math.round(sr / f);
    const len = Math.floor(sr * 1.1);
    buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const ring = new Float32Array(n);
    for (let i = 0; i < n; i++) ring[i] = Math.random() * 2 - 1;
    let p = 0;
    for (let i = 0; i < len; i++) {
      const cur = ring[p];
      const nxt = ring[(p + 1) % n];
      const v = 0.996 * 0.5 * (cur + nxt);
      ring[p] = v;
      d[i] = cur;
      p = (p + 1) % n;
    }
    // Fade cuối cho êm.
    for (let i = 0; i < 400; i++) d[len - 1 - i] *= i / 400;
    this.pluckCache.set(idx, buf);
    return buf;
  }

  /** Gảy đàn cổ cầm: idx 0..4 chọn quãng ngũ cung. */
  pluck(idx, volume = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.005;
    const src = this.ctx.createBufferSource();
    src.buffer = this.#pluckBuf(idx);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 3200;
    const g = this.ctx.createGain();
    g.gain.value = 0.16 * clamp(volume);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  /** Còi tàu ngắn xen vào khúc nhạc chuông, gợi cảng bên cạnh. */
  hornBlip(volume = 0.05) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 380;
    f.connect(this.master);
    for (const hz of [110, 146.8]) {
      this.#tone('sawtooth', hz, t, 0.12, volume * 0.09, 0.55, { bus: f });
    }
  }

  /** Bao hàng đập vào cửa container. */
  thunk(volume = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.#tone('sine', 120, t, 0.004, 0.22 * clamp(volume), 0.14, { f1: 60 });
    this.#burst('lowpass', 900, 0.6, t, 0.003, 0.16 * clamp(volume), 0.09);
  }

  /** Cần câu vung ra. */
  rodCast() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = this.#burst('bandpass', 1200, 1.4, t, 0.16, 0.05, 0.22);
    f.frequency.linearRampToValueAtTime(2400, t + 0.3);
  }

  /** Phao rơi xuống nước. */
  plop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.#tone('sine', 380, t, 0.004, 0.1, 0.13, { f1: 140 });
    this.#burst('bandpass', 800, 1.2, t, 0.005, 0.06, 0.16);
  }

  /** Cá giật cần + văng nước. */
  splash(volume = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = clamp(volume);
    for (let i = 0; i < 3; i++) this.#burst('bandpass', rand(900, 2200), 1.1, t + i * 0.055, 0.01, 0.12 * v, 0.18);
    this.#tone('sine', 300, t + 0.02, 0.006, 0.1 * v, 0.2, { f1: 90 });
  }

  breath(inhale) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dur = inhale ? 3.6 : 5.4;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(inhale ? 650 : 1050, t);
    f.frequency.linearRampToValueAtTime(inhale ? 1100 : 600, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.022, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t, Math.random() * 3);
    src.stop(t + dur + 0.1);
  }

  paper() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) this.#burst('highpass', 2800 + i * 400, 0.5, t + i * 0.06, 0.005, 0.05, 0.06);
  }

  waterDrop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.#tone('sine', 420, t, 0.005, 0.12, 0.22, { f1: 1100 });
    this.#tone('sine', 640, t + 0.12, 0.005, 0.06, 0.16, { f1: 1300 });
    this.#burst('bandpass', 900, 1.5, t, 0.02, 0.05, 0.4);
  }

  rustle() {
    if (!this.ctx) return;
    this.#burst('highpass', 3600, 0.5, this.ctx.currentTime, 0.1, 0.05, 0.5);
  }

  rattle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      this.#burst('bandpass', rand(1800, 3200), 6, t + i * 0.045 + Math.random() * 0.02, 0.002, 0.14, 0.05);
    }
  }

  stickDrop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.#burst('bandpass', 2400, 8, t, 0.002, 0.25, 0.1);
    this.#burst('bandpass', 2000, 8, t + 0.11, 0.002, 0.14, 0.07);
  }

  meow() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t);
    o.frequency.linearRampToValueAtTime(860, t + 0.13);
    o.frequency.linearRampToValueAtTime(600, t + 0.5);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3.2;
    f.frequency.setValueAtTime(900, t);
    f.frequency.linearRampToValueAtTime(1700, t + 0.15);
    f.frequency.linearRampToValueAtTime(1000, t + 0.5);
    const g = this.ctx.createGain();
    this.#env(g, t, 0.05, 0.11, 0.46);
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.56);
  }

  pop() {
    if (!this.ctx) return;
    this.#tone('sine', 620, this.ctx.currentTime, 0.005, 0.1, 0.14, { f1: 980 });
  }

  tick() {
    if (!this.ctx) return;
    this.#tone('sine', 880, this.ctx.currentTime, 0.004, 0.05, 0.08);
  }

  /** Chuông gió, cũng dùng báo có người vào. */
  chime(volume = 0.09) {
    if (!this.ctx) return;
    this.#windChime(volume);
  }

  #windChime(volume) {
    const t = this.ctx.currentTime + 0.01;
    const notes = [1318.5, 1568, 1760, 2093, 2349.3];
    const n = 3 + Math.floor(Math.random() * 3);
    let at = t;
    for (let i = 0; i < n; i++) {
      const f = notes[Math.floor(Math.random() * notes.length)];
      this.#tone('sine', f, at, 0.003, volume * rand(0.55, 1), 1.5);
      this.#tone('sine', f * 2.71, at, 0.002, volume * 0.14, 0.45);
      at += rand(0.07, 0.3);
    }
  }

  #birdCall() {
    const level = (1 - this.last.night) * 0.04;
    if (level < 0.004) return;
    const t = this.ctx.currentTime + 0.01;
    const base = rand(2600, 4200);
    const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const at = t + i * rand(0.09, 0.15);
      this.#tone('sine', base * rand(0.9, 1.15), at, 0.012, level, 0.07, { f1: base * rand(1.1, 1.35) });
    }
  }

  #cricket() {
    const level = clamp((this.last.night - 0.35) * 1.5) * 0.012;
    if (level < 0.001) return;
    const t = this.ctx.currentTime + 0.01;
    for (let i = 0; i < 5; i++) this.#tone('sine', 4300, t + i * 0.05, 0.005, level, 0.025);
  }

  #shipHorn() {
    const t = this.ctx.currentTime + 0.01;
    const level = 0.12 * this.#portLevel();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 340;
    f.connect(this.master);
    for (const hz of [73.4, 110, 146.8]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(level / 2.6, t + 0.5);
      g.gain.setValueAtTime(level / 2.6, t + 2.8);
      g.gain.linearRampToValueAtTime(0.0001, t + 4);
      o.connect(g);
      g.connect(f);
      o.start(t);
      o.stop(t + 4.1);
    }
  }

  #craneSqueak() {
    const t = this.ctx.currentTime + 0.01;
    const level = 0.016 * this.#portLevel();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1500;
    f.Q.value = 6;
    f.connect(this.master);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(980, t);
    o.frequency.linearRampToValueAtTime(1250, t + 0.45);
    o.frequency.linearRampToValueAtTime(1030, t + 0.9);
    const g = this.ctx.createGain();
    this.#env(g, t, 0.15, level, 0.85);
    o.connect(g);
    g.connect(f);
    o.start(t);
    o.stop(t + 1.05);
  }
}
