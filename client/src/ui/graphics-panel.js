// Hộp "Đồ hoạ": chọn mức vẽ, áp dụng ngay, và cho biết game đang vẽ ở bao nhiêu điểm ảnh
// (để người chơi hiểu vì sao hình mờ khi chế độ Tự động đã hạ mức).
import { GRAPHICS_MODES, LEVEL_LABELS } from '../scene/graphics-settings.js';
import { h } from './dom.js';
import { openModal } from './modal.js';

/**
 * @param {{
 *   getState: () => {mode: string, level: number, width: number, height: number, shadows: boolean},
 *   onPick: (mode: string) => void,
 * }} opts
 */
export function openGraphicsPanel({ getState, onPick }) {
  const status = h('p', { class: 'graphics-status', role: 'status' });
  const options = GRAPHICS_MODES.map((mode) => {
    const input = h('input', { type: 'radio', name: 'graphicsMode', value: mode.id });
    input.addEventListener('change', () => {
      onPick(mode.id);
      render();
    });
    const el = h('label', { class: 'graphics-option' }, input,
      h('span', {}, h('b', {}, mode.label), h('small', {}, mode.hint)));
    return { mode, input, el };
  });

  function render() {
    const s = getState();
    for (const o of options) o.input.checked = o.mode.id === s.mode;
    const level = LEVEL_LABELS[s.level] ?? '';
    const prefix = s.mode === 'auto' ? `Tự động đang ở mức ${level}` : `Mức ${level}`;
    status.textContent = `${prefix} · vẽ ${s.width}×${s.height} điểm ảnh · bóng đổ ${s.shadows ? 'bật' : 'tắt'}`;
  }

  render();
  return openModal({
    title: 'Đồ hoạ',
    className: 'graphics-modal',
    content: [
      h('fieldset', { class: 'graphics-options' }, h('legend', {}, 'Chất lượng hình'), options.map((o) => o.el)),
      status,
      h('p', { class: 'graphics-note' }, 'Hình bị mờ thì chọn Cao hoặc Rất nét. Máy giật thì hạ xuống Vừa hoặc Thấp. Lựa chọn được nhớ cho lần sau.'),
    ],
  });
}
