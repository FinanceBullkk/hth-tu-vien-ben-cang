import { MELODY_ZONE } from '../../../shared/layout.js';
import { ACTIVITY } from '../../../shared/protocol.js';
import { MELODY } from '../../../shared/melody.js';
import { MelodyPerformance } from './melody-performance.js';
import { MelodyAudio } from '../audio/melody-audio.js';
import { MelodyPanel } from '../ui/melody-panel.js';

export class MelodyActivity {
  constructor(app) {
    this.app = app;
    this.lockMove = true;
    this.generation = 0;
    this.audio = new MelodyAudio(app);
    this.panel = new MelodyPanel(() => this.begin(), (lane, down, source) => this.performance?.input(lane, down, source),
      () => app.activities.exit(), (volume) => this.audio.setVolume(volume));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && app.activities.current === this) app.activities.exit();
    });
    window.addEventListener('blur', () => {
      if (this.state === 'playing' && app.activities.current === this) app.activities.exit();
    });
    app.net.on('melody:expired', () => {
      if (app.activities.current === this) { app.activities.exit(); app.hud.toast('Sân đàn đã nghỉ. Mời bạn chơi lại.'); }
    });
  }

  async start() {
    const { app } = this;
    if (!app.activities.enter(this, null)) return;
    const generation = ++this.generation;
    this.state = 'loading';
    this.panel.show();
    if (app.chat.open) app.chat.close();
    app.follow.shot = MELODY_ZONE.camera;
    try {
      await this.audio.load();
      if (generation !== this.generation) return;
      this.state = 'ready';
      this.panel.ready();
    } catch (error) {
      if (generation === this.generation) { this.state = 'error'; this.panel.error(error.message); }
    }
  }

  async begin() {
    if (!['ready', 'done', 'error', 'save-error'].includes(this.state)) return;
    if (this.state === 'save-error') return this.finish();
    const generation = ++this.generation;
    this.state = 'joining';
    this.panel.busy('Đang chuẩn bị sân đàn…');
    const { app } = this;
    try {
      await this.audio.load();
      await this.audio.resume();
      if (generation !== this.generation) return;
      // A replay leaves the previous server session before claiming the seat again.
      if (this.game) {
        const stopped = await app.net.call('action:stop');
        if (generation !== this.generation) return;
        if (!stopped?.ok) throw new Error(stopped?.error || 'Chưa kết thúc lượt trước.');
        this.game = null;
      }
      const res = await app.net.call('melody:start');
      if (generation !== this.generation) return;
      if (!res?.ok) throw new Error(res?.error || 'Chưa vào sân đàn được.');
      this.game = res.game;
      app.me.placeAt(MELODY_ZONE.seat.x, MELODY_ZONE.seat.z, MELODY_ZONE.seat.rot);
      app.me.avatar.setActivity(ACTIVITY.melody);
      this.audio.start(this.game.at, this.panel.volume());
      this.performance = new MelodyPerformance(app, this.game, this.panel, this.audio);
      this.state = 'playing';
      this.panel.begin();
    } catch (error) {
      if (generation !== this.generation) return;
      this.audio.stop();
      app.net.call('action:stop');
      app.me.avatar.setActivity(ACTIVITY.none);
      this.game = null;
      this.state = 'error';
      this.panel.error(error.message);
    }
  }

  onKey(code, down) {
    const lane = MELODY.keys.indexOf(code);
    if (lane < 0) return false;
    if (this.state === 'playing') this.performance.input(lane, down);
    return true;
  }

  update() {
    if (this.state !== 'playing') return;
    if (this.app.audio.ctx.state !== 'running') {
      this.app.activities.exit();
      this.app.hud.toast('Âm thanh bị ngắt. Mời bạn bắt đầu lại.');
      return;
    }
    const elapsed = this.performance.update();
    if (elapsed >= MELODY.durationMs && this.app.net.now() >= this.game.endsAt) this.finish();
  }

  async finish() {
    this.state = 'finishing';
    this.performance?.stop();
    this.audio.stop();
    this.panel.busy('Đang nhận kết quả…');
    const generation = this.generation;
    const res = await this.app.net.call('melody:finish', { id: this.game.id });
    if (generation !== this.generation) return;
    if (!res?.ok) {
      this.state = 'save-error';
      this.panel.error(res?.error || 'Chưa nhận được kết quả. Bấm thử lại.', 'Thử nhận kết quả');
      return;
    }
    this.state = 'done';
    this.panel.result(res);
  }

  cancel() {
    ++this.generation;
    this.state = 'idle';
    this.game = null;
    this.performance?.stop();
    this.audio.stop();
    this.panel.hide();
    this.app.follow.shot = null;
  }
}
