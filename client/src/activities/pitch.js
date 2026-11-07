// Đầu hồ: mỗi lượt đưa tâm vào vòng đang trôi, giữ cho đầy rồi ném; đối thủ ném sau. Server chấm, client chỉ dự đoán để vẽ.
import { PITCH_ZONE } from '../../../shared/layout.js';
import { PITCH, clampAim, pitchAimState, pitchFillStep, pitchRadius, pitchStage } from '../../../shared/pitch.js';
import { PitchPanel } from '../ui/pitch-panel.js';

const KEY_DIRS = {
  KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
};
const KEY_SPEED = 0.95; // Nửa chiều cao sân mỗi giây.
const RESULT_DELAY_MS = PITCH.flightMs + 500;

export class PitchActivity {
  constructor(app) {
    this.app = app;
    this.lockMove = true;
    this.generation = 0;
    this.state = 'idle';
    this.held = new Set();
    this.timers = [];
    this.panel = new PitchPanel({
      onThrow: () => this.throw(),
      onExit: () => app.activities.exit(),
      onChoose: (tier) => this.choose(tier),
    });
  }

  start() {
    const { app } = this;
    if (!app.activities.enter(this, 'pitch')) return;
    const { seat, camera } = PITCH_ZONE;
    app.me.placeAt(seat.x, seat.z, seat.rot);
    app.follow.shot = camera;
    if (app.chat.open) app.chat.close();
    this.state = 'pick';
    this.panel.showPick();
  }

  async choose(tier) {
    if (this.state === 'joining') return;
    const generation = ++this.generation;
    this.state = 'joining';
    const { app } = this;
    const res = await app.net.call('pitch:start', { tier });
    if (generation !== this.generation) return;
    if (!res?.ok) {
      app.hud.toast(res?.error || 'Chưa vào trận được, thử lại nhé.');
      app.activities.exit();
      return;
    }
    this.#beginMatch(res.game);
  }

  #beginMatch(game) {
    this.game = game;
    this.#setTurn(game.turn, game.aimAt, game.aimEndsAt);
    this.panel.begin(game);
    this.panel.setHint('Sẵn sàng…');
    this.app.world.pitchCourt.opponent.present(game.tier);
    this.state = 'playing';
  }

  #setTurn(turn, aimAt, aimEndsAt) {
    const { game } = this;
    Object.assign(game, { turn, aimAt, aimEndsAt });
    game.stage = pitchStage(game.seed, turn, game.tier);
    this.fill = 0;
    this.sampleAt = 0;
    this.thrown = false;
    this.wasReady = false;
    this.panel.aim.bx = 0;
    this.panel.aim.by = 0.3;
  }

  onKey(code, down) {
    if (code === 'Space') {
      if (down && this.state === 'playing') this.throw();
      return true;
    }
    if (!KEY_DIRS[code]) return false;
    if (down) this.held.add(code);
    else this.held.delete(code);
    return true;
  }

  /** Bấm ném khi vòng chưa đầy cũng là một cú ném: server sẽ tính trượt và mất combo. */
  throw() {
    if (this.state !== 'playing' || this.thrown || this.app.net.now() < this.game.aimAt) return;
    this.thrown = true;
    this.panel.showAim(null);
    this.panel.setHint('');
    this.app.net.call('pitch:throw', { ...this.panel.aim, t: this.app.net.now() }).then((res) => {
      if (res?.ok === false) this.thrown = false; // Gói tới muộn sau khi lượt đã đóng: chờ lượt mới.
    });
  }

  /** Server báo xong một lượt (ném hoặc hết giờ ngắm). */
  onTurn({ me, npc, turn, aimAt, aimEndsAt, over }) {
    if (this.state !== 'playing' || !this.game) return;
    const { panel, app } = this;
    const generation = this.generation;
    const later = (ms, fn) => this.timers.push(setTimeout(() => {
      if (generation === this.generation) fn();
    }, ms));
    this.#setTurn(turn, aimAt, aimEndsAt);
    panel.showAim(null);
    if (me) {
      panel.setScores(me, null);
      later(PITCH.flightMs, () => {
        panel.gain('me', me);
        if (me.hit) app.audio.thunk(0.8);
        else app.audio.rustle();
      });
      panel.setHint(me.hit ? '' : 'Lệch rồi, combo về 0');
    }
    if (npc) {
      later(PITCH.npcThrowDelayMs + PITCH.flightMs, () => {
        panel.setScores(null, npc);
        panel.gain('npc', npc);
        if (npc.hit) app.audio.thunk(0.5);
      });
    }
    if (over) {
      this.state = 'done';
      later(RESULT_DELAY_MS + (npc ? PITCH.npcThrowDelayMs : 0), () => this.#showResult(over));
    }
  }

  #showResult(over) {
    const name = PITCH.opponents[this.game.tier].name;
    this.panel.showResult(over, name);
    if (over.outcome === 'win') this.app.audio.chime(0.09);
  }

  update(dt) {
    if (this.state !== 'playing') return;
    const { game, panel, app } = this;
    const now = app.net.now();
    panel.setClock(game.endsAt - now);
    if (now < game.aimAt || this.thrown) return; // Tên đang bay hoặc đã ném, chờ lượt sau.
    this.#tickAim(dt, now);
  }

  #tickAim(dt, now) {
    const { game, panel, app } = this;
    const { aim } = panel;
    for (const code of this.held) {
      const [dx, dy] = KEY_DIRS[code];
      aim.bx = clampAim(aim.bx + (dx * KEY_SPEED * dt) / PITCH.aspect);
      aim.by = clampAim(aim.by + dy * KEY_SPEED * dt);
    }
    const state = pitchAimState({ seed: game.seed, tier: game.tier, stage: game.stage, aimAt: game.aimAt, aim, now });
    this.fill = pitchFillStep(this.fill, state.inside, dt * 1000, game.tier);
    panel.showAim(state, this.fill, game.aimEndsAt - now, pitchRadius(game.tier, game.stage));

    const ready = this.fill >= 1;
    if (ready && !this.wasReady) app.audio.pop();
    this.wasReady = ready;
    if (ready) panel.setHint(panel.touching ? 'Ném!' : 'Đầy rồi — bấm chuột hoặc Space để ném!');
    else if (game.stage.dual) panel.setHint('Đưa cả hai tâm vào vòng: chuột và WASD');
    else panel.setHint('Giữ tâm trong vòng cho đầy');

    if (now - this.sampleAt >= PITCH.sampleMs) {
      this.sampleAt = now;
      app.net.socket.emit('pitch:aim', { ...aim, t: now });
    }
    // Cảm ứng không có tay rảnh để bấm: đầy là tự ném.
    if (ready && panel.touching) this.throw();
  }

  cancel() {
    ++this.generation;
    this.state = 'idle';
    this.game = null;
    this.held.clear();
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
    this.panel.hide();
    this.app.follow.shot = null;
  }
}
