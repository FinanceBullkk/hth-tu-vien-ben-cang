import { h, store } from '../ui/dom.js';

export class LoginMusic {
  constructor(root) {
    this.root = root;
    this.audio = h('audio', { src: '/music/where-winds-meet-character-creation.mp3', loop: true, preload: 'metadata', hidden: true });
    const saved = store.get('musicVolume');
    const volume = saved === null ? 0.35 : Number(saved);
    this.audio.volume = (Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : 0.35) * 0.5;
    // Nút icon nhỏ ở góc thẻ chào; tên nút nằm ở aria-label/title thay vì chữ hiển thị.
    this.button = h('button', { type: 'button', class: 'welcome-music', 'aria-pressed': 'false', 'aria-label': 'Phát nhạc nền', title: 'Phát nhạc nền' }, '♫');
    this.button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.removeUnlock();
      if (this.audio.paused) this.play();
      else this.audio.pause();
    });
    const sync = () => {
      const playing = !this.audio.paused;
      const label = playing ? 'Tạm dừng nhạc nền' : 'Phát nhạc nền';
      this.button.setAttribute('aria-label', label);
      this.button.title = label;
      this.button.setAttribute('aria-pressed', String(playing));
    };
    this.audio.addEventListener('play', sync);
    this.audio.addEventListener('pause', sync);
    // Autoplay may be blocked until a trusted click or keyboard interaction.
    this.unlock = (event) => { if (event.target !== this.button) this.play(); };
    root.addEventListener('click', this.unlock);
    root.addEventListener('keydown', this.unlock);
    this.audio.addEventListener('playing', () => this.removeUnlock(), { once: true });
    this.play();
  }

  play() {
    if (!this.stopped) this.audio.play().catch(() => {}); // The play button remains available after autoplay rejection.
  }

  removeUnlock() {
    this.root.removeEventListener('click', this.unlock);
    this.root.removeEventListener('keydown', this.unlock);
  }

  stop() {
    this.stopped = true;
    this.removeUnlock();
    this.audio.pause();
  }
}
