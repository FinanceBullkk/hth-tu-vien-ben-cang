// HUD: đếm người, danh sách, nút góc màn hình, nút hành động, thông báo nhỏ, banner sự kiện.
import { $, h, store } from './dom.js';

export class Hud {
  constructor(app) {
    this.app = app;
    this.root = $('hud');
    this.onlineCount = $('onlineCount');
    this.visitsEl = $('visitsToday');
    this.onlineList = $('onlineList');
    this.actionBtn = $('actionBtn');
    this.actionLabel = $('actionLabel');
    this.toasts = $('toasts');
    this.banner = $('banner');
    this.muteBtn = $('muteBtn');
    this.musicBtn = $('musicBtn');
    this.musicPanel = $('musicPanel');
    this.musicAudio = $('musicAudio');
    this.musicSound = $('musicSound');
    this.musicVolume = $('musicVolume');
    this.actionFn = null;
    this.bannerTimer = null;

    $('onlineBtn').addEventListener('click', () => this.toggleOnlineList());
    this.actionBtn.addEventListener('click', () => this.runAction());
    this.muteBtn.addEventListener('click', () => {
      const next = !app.audio.muted;
      app.audio.setMuted(next);
      this.syncMute();
    });
    this.musicBtn.addEventListener('click', () => this.toggleMusic());
    this.musicSound.addEventListener('click', () => this.toggleMusicSound());
    $('musicClose').addEventListener('click', () => this.toggleMusic());
    const savedVolume = store.get('musicVolume');
    const volume = savedVolume === null ? 0.35 : Number(savedVolume);
    this.musicAudio.volume = (Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : 0.35) * 0.5;
    this.musicVolume.value = String(Math.round(this.musicAudio.volume * 200));
    $('musicVolumeValue').textContent = `${this.musicVolume.value}%`;
    this.musicVolume.addEventListener('input', () => {
      this.musicAudio.volume = Number(this.musicVolume.value) / 200;
      $('musicVolumeValue').textContent = `${this.musicVolume.value}%`;
      store.set('musicVolume', String(Number(this.musicVolume.value) / 100));
    });
    this.musicAudio.addEventListener('play', () => this.syncMusicButton());
    this.musicAudio.addEventListener('pause', () => this.syncMusicButton());
    this.musicAudio.addEventListener('loadedmetadata', () => this.syncMusicTime());
    this.syncMute();
  }

  startRadio(radio) {
    if (!Number.isSafeInteger(radio?.durationSec) || radio.durationSec < 1 || !Number.isSafeInteger(radio?.startedAt)) return;
    this.radio = radio;
    this.syncMusicTime();
  }

  toggleMusic() {
    const open = this.musicPanel.hidden;
    this.musicPanel.hidden = !open;
    this.musicBtn.setAttribute('aria-expanded', String(open));
    this.musicBtn.setAttribute('aria-label', open ? 'Đóng bảng nhạc' : 'Mở bảng nhạc');
  }

  toggleMusicSound() {
    if (this.musicAudio.paused) this.playMusic();
    else this.musicAudio.pause();
  }

  playMusic() {
    this.syncMusicTime();
    this.musicAudio.play().catch(() => this.syncMusicButton());
  }

  pauseMusic() {
    this.musicAudio.pause();
  }

  syncMusicTime() {
    if (!this.radio || this.musicAudio.readyState < 1) return;
    const duration = Number.isFinite(this.musicAudio.duration) ? this.musicAudio.duration : this.radio.durationSec;
    const elapsed = Math.max(0, (this.app.net.now() - this.radio.startedAt) / 1000);
    this.musicAudio.currentTime = elapsed % duration;
  }

  syncMusicButton() {
    const playing = !this.musicAudio.paused;
    this.musicSound.setAttribute('aria-pressed', String(playing));
    this.musicSound.textContent = playing ? 'Tạm dừng' : 'Phát nhạc';
  }

  show() {
    this.root.hidden = false;
  }

  syncMute() {
    const muted = this.app.audio.muted;
    this.muteBtn.textContent = muted ? '🔇' : '🔊';
    const label = muted ? 'Mở tiếng game' : 'Tắt tiếng game';
    this.muteBtn.title = label;
    this.muteBtn.setAttribute('aria-label', label);
  }

  setPresence(online, visits) {
    this.onlineCount.textContent = String(online);
    this.visitsEl.textContent = String(visits);
    if (!this.onlineList.hidden) this.renderOnlineList();
  }

  toggleOnlineList() {
    this.onlineList.hidden = !this.onlineList.hidden;
    if (!this.onlineList.hidden) this.renderOnlineList();
  }

  renderOnlineList() {
    const names = [this.app.myName, ...[...this.app.remotes.map.values()].map((r) => r.name)];
    this.onlineList.replaceChildren(
      ...names.map((name, i) => h('li', { class: i === 0 ? 'me' : '' }, i === 0 ? `${name} (bạn)` : name)),
    );
  }

  /** Nút hành động to: chỉ hiện khi ở gần điểm hoạt động. */
  setAction(label, fn) {
    this.actionFn = fn;
    if (!fn) {
      this.actionBtn.hidden = true;
      return;
    }
    this.actionLabel.textContent = label;
    this.actionBtn.hidden = false;
  }

  runAction() {
    if (this.actionFn) this.actionFn();
  }

  toast(text, { ms = 3400, kind = '' } = {}) {
    const el = h('div', { class: `toast ${kind}` }, text);
    this.toasts.append(el);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 400);
    }, ms);
  }

  /** Banner trên cùng: đếm ngược và kết quả sự kiện chuông. */
  setBanner(text, sub = '', { ms = 0, big = false } = {}) {
    clearTimeout(this.bannerTimer);
    if (!text) {
      this.banner.hidden = true;
      return;
    }
    this.banner.hidden = false;
    this.banner.classList.toggle('big', big);
    if (this.bannerText !== text) {
      this.bannerText = text;
      $('bannerText').textContent = text;
    }
    $('bannerSub').textContent = sub;
    if (ms) {
      this.bannerTimer = setTimeout(() => {
        this.banner.hidden = true;
        this.bannerText = null;
      }, ms);
    }
  }
}
