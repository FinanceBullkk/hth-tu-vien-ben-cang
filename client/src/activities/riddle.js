// Đố thuật ngữ của sư chú giữ cổng: modal câu hỏi, gõ đáp án, sai hai lần có gợi ý.
import { h } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';

export class RiddleActivity {
  constructor(app) {
    this.app = app;
    this.lockMove = true;
    this.generation = 0;
    this.state = 'idle';
  }

  start() {
    const { app } = this;
    if (!app.activities.enter(this, 'write')) return;
    const generation = ++this.generation;
    this.state = 'loading';
    this.body = h('div', { class: 'riddle-stage' }, h('p', { class: 'muted' }, 'Mặc Vũ đang lật sổ câu đố…'));
    this.modal = openModal({
      title: 'Đố của Mặc Vũ',
      content: this.body,
      onClose: () => {
        if (app.activities.current === this) app.activities.exit();
      },
    });
    this.#draw(generation);
    app.audio.paper();
  }

  async #draw(generation) {
    const { app } = this;
    const res = await app.net.call('riddle:draw');
    if (generation !== this.generation || !this.modal?.el.isConnected) return;
    if (!res?.ok) {
      this.state = 'done';
      this.body.replaceChildren(h('p', {}, res?.error || 'Chưa xin được câu đố, thử lại nhé.'));
      return;
    }
    this.state = 'asking';
    this.riddle = res.riddle;
    this.#render('');
  }

  #render(feedback) {
    const { app } = this;
    this.input = h('input', { class: 'field-input riddle-input', placeholder: 'Gõ đáp án vào đây…', maxLength: 60, autocomplete: 'off' });
    this.submit = h('button', { class: 'btn primary', type: 'button' }, 'Trả lời');
    this.submit.addEventListener('click', () => this.#answer());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.#answer();
      }
    });
    const other = h('button', { class: 'btn ghost', type: 'button' }, 'Xin câu khác');
    other.addEventListener('click', () => {
      this.state = 'loading';
      this.body.replaceChildren(h('p', { class: 'muted' }, 'Mặc Vũ lật sang câu khác…'));
      this.#draw(this.generation);
    });
    this.body.replaceChildren(
      h('p', { class: 'riddle-question' }, this.riddle.q),
      h('div', { class: 'field' }, this.input),
      h('p', { class: 'form-error', role: 'status' }, feedback),
      h('div', { class: 'row-center' }, this.submit, other),
      h('p', { class: 'muted small center' }, 'Trả lời đúng nhận TEU theo bậc câu · sai hai lần có gợi ý'),
    );
    setTimeout(() => this.input?.focus({ preventScroll: true }), 60);
  }

  async #answer() {
    if (this.state !== 'asking') return;
    const text = this.input.value.trim();
    if (!text) return;
    const generation = this.generation;
    this.submit.disabled = true;
    const res = await this.app.net.call('riddle:answer', { text });
    if (generation !== this.generation || !this.modal?.el.isConnected) return;
    this.submit.disabled = false;
    if (!res?.ok) {
      this.body.replaceChildren(h('p', {}, res?.error || 'Có lỗi nhỏ, thử lại nhé.'));
      this.state = 'done';
      return;
    }
    if (res.correct) {
      this.state = 'done';
      this.app.audio.chime(0.09);
      this.app.hud.setBanner(`+${res.teu} TEU`, 'Mặc Vũ gật đầu: "Tâm thông lắm"', { ms: 5000 });
      this.body.replaceChildren(
        h('p', { class: 'riddle-question' }, this.riddle.q),
        h('div', { class: 'fish-card' },
          h('b', { class: 'fish-name' }, 'Chính xác!'),
          h('span', { class: 'teu-chip' }, `+${res.teu} TEU`)),
        h('div', { class: 'row-center' }, h('button', {
          class: 'btn primary', type: 'button',
          onClick: () => { this.state = 'loading'; this.body.replaceChildren(h('p', { class: 'muted' }, 'Mặc Vũ lật sang câu khác…')); this.#draw(this.generation); },
        }, 'Xin câu nữa')),
      );
      return;
    }
    const hint = res.hint ? `Gợi ý: ${res.hint}` : 'Chưa đúng, thử lại nhé. Sai thêm một lần sẽ có gợi ý.';
    this.app.audio.rustle();
    this.#render(hint);
  }

  onKey(code) {
    return false; // để modal tự nhận phím
  }

  cancel() {
    ++this.generation;
    this.state = 'idle';
    this.modal?.close();
    this.modal = null;
  }
}
