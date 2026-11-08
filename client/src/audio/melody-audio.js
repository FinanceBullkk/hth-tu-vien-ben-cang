import { MELODY } from '../../../shared/melody.js';

export class MelodyAudio {
  constructor(app) { this.app = app; }

  async load() {
    this.app.audio.unlock();
    const ctx = this.app.audio.ctx;
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ âm thanh của trò chơi.');
    if (!this.buffer) {
      const res = await fetch(MELODY.audio, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error('Chưa tải được bản nhạc. Thử lại nhé.');
      this.buffer = await ctx.decodeAudioData(await res.arrayBuffer());
    }
  }

  async resume() {
    const ctx = this.app.audio.ctx;
    await ctx.resume();
    if (ctx.state !== 'running') throw new Error('Bấm Bắt đầu để cho phép phát nhạc.');
  }

  start(at, volume) {
    this.stop();
    const { app, buffer } = this;
    const ctx = app.audio.ctx;
    if (ctx.state !== 'running') throw new Error('Âm thanh bị tạm dừng. Bấm chơi lại nhé.');
    this.source = ctx.createBufferSource();
    this.source.buffer = buffer;
    this.gain = ctx.createGain();
    this.gain.gain.value = volume;
    this.source.connect(this.gain).connect(ctx.destination);
    const delay = (at - app.net.now()) / 1000;
    this.startedAt = ctx.currentTime + delay;
    this.source.start(ctx.currentTime + Math.max(0, delay), Math.max(0, -delay));
    this.radioMuted = app.hud.musicAudio.muted;
    app.hud.musicAudio.muted = true;
  }

  setVolume(value) { if (this.gain) this.gain.gain.value = value; }

  elapsed() { return (this.app.audio.ctx.currentTime - this.startedAt) * 1000; }

  cue(grade, volume) {
    if (!volume || grade === 'miss' || !this.source) return;
    const ctx = this.app.audio.ctx, at = ctx.currentTime;
    // ponytail: original synthesized cue; replace with a licensed sample if exact timbre is needed.
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume * 0.12, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    gain.connect(ctx.destination);
    const tone = ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(grade === 'perfect' ? 1046.5 : grade === 'great' ? 880 : 784, at);
    tone.connect(gain);
    tone.start(at); tone.stop(at + 0.2);
    this.cues ??= new Set();
    this.cues.add(tone);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); this.cues.delete(tone); };
  }

  stop() {
    for (const tone of this.cues ?? []) { try { tone.stop(); } catch {} }
    if (!this.source) return;
    this.source.stop();
    this.source.disconnect();
    this.gain.disconnect();
    this.source = null;
    this.app.hud.musicAudio.muted = this.radioMuted;
  }
}
