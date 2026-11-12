// Chat bong bóng và lịch sử ngắn trong RAM của phiên chơi.
import { EMOJIS, LIMITS } from '../../../shared/protocol.js';
import { $, h } from './dom.js';

export class Chat {
  constructor(app) {
    this.app = app;
    this.form = $('chatForm');
    this.input = $('chatInput');
    this.input.maxLength = LIMITS.chatMax;
    this.toggleBtn = $('chatBtn');
    this.messages = $('chatMessages');
    this.emojiBar = $('emojiBar');
    this.open = false;

    for (let i = 0; i < EMOJIS.length; i++) {
      const b = h('button', { type: 'button', class: 'emoji-btn', 'aria-label': `Biểu cảm ${EMOJIS[i]}` }, EMOJIS[i]);
      b.addEventListener('click', () => {
        this.sendEmoji(i);
        this.setEmojiOpen(false);
      });
      this.emojiBar.append(b);
    }
    // Điện thoại: hàng biểu cảm gom vào một nút, chạm mới mở (CSS chỉ hiện nút này khi .touch).
    this.emojiToggle = $('emojiToggle');
    this.emojiToggle.addEventListener('click', () => this.setEmojiOpen(!document.body.classList.contains('emoji-open')));

    this.toggleBtn.addEventListener('click', () => {
      if (this.open) this.close();
      else this.show();
    });
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.send();
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
      }
    });
  }

  setEmojiOpen(open) {
    document.body.classList.toggle('emoji-open', open);
    this.emojiToggle.setAttribute('aria-expanded', String(open));
    this.emojiToggle.setAttribute('aria-label', open ? 'Đóng biểu cảm nhanh' : 'Mở biểu cảm nhanh');
  }

  show() {
    this.setEmojiOpen(false);
    if (this.app.chatBlocked()) {
      this.app.hud.toast('Đang thiền thì mình giữ yên lặng nhé.');
      return;
    }
    this.open = true;
    document.body.classList.add('chatting');
    this.form.hidden = false;
    this.input.value = '';
    if (document.pointerLockElement) document.exitPointerLock();
    this.input.focus();
  }

  close() {
    this.open = false;
    document.body.classList.remove('chatting');
    this.form.hidden = true;
    this.input.blur();
  }

  receive(name, text) {
    const at = new Date();
    const row = h('li', {}, h('time', { dateTime: at.toISOString(), title: at.toLocaleString('vi-VN') }, at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })), h('span', { class: 'chat-channel' }, '[1. Chung]'), h('strong', {}, `[${name}]`), h('span', { class: 'chat-text' }, text));
    this.messages.append(row);
    if (this.messages.childElementCount > 100) this.messages.firstElementChild.remove();
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  async send() {
    const text = this.input.value.trim();
    if (!text) {
      this.close();
      return;
    }
    const res = await this.app.net.call('chat', { text });
    if (res?.ok) {
      this.close();
    } else if (res?.error) {
      this.app.hud.toast(res.error);
    }
  }

  async sendEmoji(i) {
    if (this.app.chatBlocked()) {
      this.app.hud.toast('Đang thiền thì mình giữ yên lặng nhé.');
      return;
    }
    await this.app.net.call('emoji', { i });
  }
}
