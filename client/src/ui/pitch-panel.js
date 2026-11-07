// HUD đầu hồ toàn màn hình: đồng hồ, bảng điểm, combo, vòng ngắm và các tâm. Chỉ vẽ và nhận tay; luật nằm ở activity.
import { PITCH, clampAim } from '../../../shared/pitch.js';
import { $, h } from './dom.js';

const pct = (v) => `${((v + 1) / 2) * 100}%`;
const clock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const OUTCOME = { win: 'Thắng', lose: 'Thua', draw: 'Hoà' };

function place(el, p) {
  el.style.left = pct(p.x);
  el.style.top = pct(p.y);
}

export class PitchPanel {
  constructor({ onThrow, onExit, onChoose }) {
    this.aim = { x: 0, y: 0, bx: 0, by: 0.3 };
    this.pointerA = null;
    this.pointerB = null;
    this.onThrow = onThrow;

    const target = (cls) => {
      const fill = h('i', { class: 'pitch-target-fill' });
      const el = h('div', { class: `pitch-target ${cls}`, hidden: true }, fill);
      el.fill = fill;
      return el;
    };
    this.targetA = target('mouse');
    this.targetB = target('keys');
    this.cursorA = h('i', { class: 'pitch-cursor mouse', hidden: true });
    this.cursorB = h('i', { class: 'pitch-cursor keys', hidden: true });
    this.field = h('div', { class: 'pitch-field' }, this.targetA, this.targetB, this.cursorA, this.cursorB);

    this.timer = h('div', { class: 'pitch-clock' }, '02:00');
    this.comboWrap = h('div', { class: 'pitch-combo', hidden: true }, h('small', {}, 'Combo'), this.combo = h('b', {}, '0'));
    this.meRow = this.#scoreRow('Bạn');
    this.npcRow = this.#scoreRow('');
    this.goal = h('div', { class: 'pitch-goal' },
      h('p', {}, `Dẫn ${PITCH.leadToWin} điểm hoặc chạm ${PITCH.scoreToWin} điểm trước là thắng`),
      this.meRow.el, this.npcRow.el);
    this.exitBtn = h('button', { type: 'button', class: 'btn ghost pitch-exit', onClick: onExit }, 'Rời sân');
    this.aimTime = h('div', { class: 'pitch-aim-time', hidden: true });
    this.hint = h('div', { class: 'pitch-hint', role: 'status' });
    this.throwBtn = h('button', { type: 'button', class: 'pitch-throw', onClick: () => onThrow() }, h('span', {}, 'Ném'), h('small', {}, 'Space'));

    this.pick = h('div', { class: 'pitch-card ink-panel' },
      h('h2', { class: 'ink-title' }, 'Đầu hồ', h('span', { class: 'seal' }, '投')),
      h('p', {}, 'Đưa tâm vào vòng, giữ cho vòng đầy rồi bấm ném. Lượt khó có thêm tâm thứ hai điều khiển bằng WASD.'),
      ...PITCH.opponents.map((opp, tier) => h('button', { type: 'button', class: 'pitch-opponent', onClick: () => onChoose(tier) },
        h('b', {}, opp.name), h('small', {}, opp.blurb))),
      h('button', { type: 'button', class: 'btn ghost', onClick: onExit }, 'Để sau'));
    this.resultBody = h('div', { class: 'pitch-result-body' });
    this.result = h('div', { class: 'pitch-card ink-panel', hidden: true }, this.resultBody,
      h('button', { type: 'button', class: 'btn', onClick: () => this.showPick() }, 'Đấu trận nữa'),
      h('button', { type: 'button', class: 'btn ghost', onClick: onExit }, 'Về sân'));

    this.root = h('section', { class: 'pitch-hud', hidden: true, tabIndex: -1, 'aria-label': 'Đầu hồ' },
      this.field, this.timer, this.comboWrap, this.goal, this.exitBtn, this.aimTime, this.hint, this.throwBtn, this.pick, this.result);
    $('rhythmLayer').append(this.root);

    this.root.addEventListener('pointerdown', (e) => this.#down(e));
    this.root.addEventListener('pointermove', (e) => this.#move(e));
    for (const type of ['pointerup', 'pointercancel']) this.root.addEventListener(type, (e) => this.#up(e));
  }

  #scoreRow(name) {
    const nameEl = h('span', {}, name);
    const score = h('b', {}, '0');
    const gain = h('em', {});
    return { el: h('div', { class: 'pitch-score-row' }, nameEl, score, gain), nameEl, score, gain };
  }

  #read(e) {
    const rect = this.field.getBoundingClientRect();
    return { x: clampAim(((e.clientX - rect.left) / rect.width) * 2 - 1), y: clampAim(((e.clientY - rect.top) / rect.height) * 2 - 1) };
  }

  #setA(p) { this.aim.x = p.x; this.aim.y = p.y; }
  #setB(p) { this.aim.bx = p.x; this.aim.by = p.y; }

  #down(e) {
    if (e.target.closest('button') || !this.playing) return;
    if (e.pointerType === 'mouse') {
      if (e.button === 0) this.onThrow();
      return;
    }
    // Cảm ứng: ngón đầu lái tâm chính, ngón hai lái tâm phụ.
    if (this.pointerA === null) {
      this.pointerA = e.pointerId;
      this.#setA(this.#read(e));
    } else if (this.pointerB === null) {
      this.pointerB = e.pointerId;
      this.#setB(this.#read(e));
    }
  }

  #move(e) {
    if (e.pointerType === 'mouse') this.#setA(this.#read(e));
    else if (e.pointerId === this.pointerA) this.#setA(this.#read(e));
    else if (e.pointerId === this.pointerB) this.#setB(this.#read(e));
  }

  #up(e) {
    if (e.pointerId === this.pointerA) this.pointerA = null;
    else if (e.pointerId === this.pointerB) this.pointerB = null;
  }

  get touching() {
    return this.pointerA !== null;
  }

  showPick() {
    this.root.hidden = false;
    this.pick.hidden = false;
    this.result.hidden = true;
    this.setPlaying(false);
    this.goal.hidden = true;
    this.timer.hidden = true;
    this.comboWrap.hidden = true;
    this.hint.textContent = '';
    this.root.focus({ preventScroll: true });
    document.body.classList.add('rhythm-playing');
  }

  /** Vào trận: bảng điểm về số hiện tại của server (kể cả khi nối lại giữa trận). */
  begin(game) {
    this.pick.hidden = true;
    this.goal.hidden = false;
    this.timer.hidden = false;
    this.npcRow.nameEl.textContent = PITCH.opponents[game.tier].name;
    this.setScores(game.me, game.npc);
    this.setPlaying(true);
  }

  setPlaying(on) {
    this.playing = on;
    this.throwBtn.hidden = !on;
    this.exitBtn.hidden = !on; // Bảng chọn và bảng kết quả đã có nút rời riêng.
    if (!on) this.showAim(null);
  }

  setScores(me, npc) {
    if (me) {
      this.meRow.score.textContent = me.score;
      this.combo.textContent = me.combo;
      this.comboWrap.hidden = me.combo < 1;
    }
    if (npc) this.npcRow.score.textContent = npc.score;
  }

  /** Số "+50" bay cạnh tên bên vừa ném; trượt thì ghi rõ. */
  gain(which, { hit, pts }) {
    const { gain } = which === 'me' ? this.meRow : this.npcRow;
    gain.textContent = hit ? `+${pts}` : 'trượt';
    gain.classList.toggle('miss', !hit);
    gain.classList.remove('go');
    void gain.offsetWidth; // Khởi động lại animation.
    gain.classList.add('go');
  }

  setClock(ms) { this.timer.textContent = clock(ms); }
  setHint(text) { this.hint.textContent = text; }

  /** Vẽ một khung ngắm, hoặc giấu hết khi state là null (cảnh rõ lại lúc tên bay). */
  showAim(state, fill = 0, aimRemainMs = 0, radius = 0) {
    const on = Boolean(state);
    this.root.classList.toggle('aiming', on);
    this.targetA.hidden = !on;
    this.cursorA.hidden = !on;
    this.aimTime.hidden = !on;
    const dual = on && Boolean(state.targetB);
    this.targetB.hidden = !dual;
    this.cursorB.hidden = !dual;
    if (!on) return;
    const size = `${radius * 100}%`;
    for (const t of [this.targetA, this.targetB]) t.style.height = size;
    place(this.targetA, state.targetA);
    place(this.cursorA, state.cursorA);
    if (dual) {
      place(this.targetB, state.targetB);
      place(this.cursorB, state.cursorB);
    }
    const ready = fill >= 1;
    for (const t of [this.targetA, this.targetB]) {
      t.fill.style.transform = `scale(${fill})`;
      t.classList.toggle('ready', ready);
    }
    this.targetA.classList.toggle('on', state.insideA);
    this.targetB.classList.toggle('on', state.insideB);
    this.aimTime.textContent = `Thời gian ngắm ${Math.max(0, Math.ceil(aimRemainMs / 1000))}`;
  }

  showResult(over, opponentName) {
    this.setPlaying(false);
    this.goal.hidden = true;
    this.timer.hidden = true;
    this.comboWrap.hidden = true;
    this.hint.textContent = '';
    this.resultBody.replaceChildren(
      h('h2', { class: `pitch-outcome ${over.outcome}` }, OUTCOME[over.outcome]),
      h('div', { class: 'pitch-versus' },
        h('div', {}, h('small', {}, 'Bạn'), h('b', {}, over.score), h('small', {}, `Combo ${over.combo}`)),
        h('div', {}, h('small', {}, opponentName), h('b', {}, over.npcScore), h('small', {}, `Combo ${over.npcCombo}`))),
      h('p', { class: 'pitch-reward' }, h('span', { class: 'rank-badge', 'data-rank': over.rank }, over.rank), ` +${over.teu} TEU`),
      h('p', { class: 'muted small' }, over.best?.best != null ? `Kỷ lục của bạn: ${over.best.best} điểm` : ''));
    this.result.hidden = false;
  }

  hide() {
    this.root.hidden = true;
    this.pointerA = null;
    this.pointerB = null;
    document.body.classList.remove('rhythm-playing');
  }
}
