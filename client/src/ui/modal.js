// Hộp thoại dùng chung cho Sổ, Bảng ước, viết lời ước, quẻ, chia sẻ. Đóng bằng Esc hoặc nút X.
import { $, h } from './dom.js';

const stack = [];

export function modalOpen() {
  return stack.length > 0;
}

export function closeTopModal() {
  const top = stack[stack.length - 1];
  if (top) top.close();
  return Boolean(top);
}

/** @returns {{el: HTMLElement, body: HTMLElement, close: () => void}} */
export function openModal({ title, content, wide, onClose, className }) {
  const body = h('div', { class: 'modal-body' }, content);
  const closeBtn = h('button', { class: 'modal-x', type: 'button', 'aria-label': 'Đóng' }, '✕');
  const card = h('div', { class: `modal-card${wide ? ' wide' : ''}${className ? ` ${className}` : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('header', { class: 'modal-head' }, h('h2', {}, title), closeBtn),
    body);
  const el = h('div', { class: 'modal' }, card);
  let closed = false;
  const api = {
    el,
    body,
    close() {
      if (closed) return;
      closed = true;
      const i = stack.indexOf(api);
      if (i >= 0) stack.splice(i, 1);
      el.remove();
      onClose?.();
    },
  };
  closeBtn.addEventListener('click', () => api.close());
  el.addEventListener('pointerdown', (e) => {
    if (e.target === el) api.close();
  });
  $('modals').append(el);
  stack.push(api);
  return api;
}
