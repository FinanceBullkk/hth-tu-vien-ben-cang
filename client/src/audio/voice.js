import { store } from '../ui/dom.js';
import { voicePanel } from '../ui/voice-panel.js';
import { VoicePeer } from './voice-peer.js';
import { MicTest } from './mic-test.js';

export class ProximityVoice {
  constructor(app) {
    this.app = app;
    this.peers = new Map();
    this.active = false;
    this.starting = false;
    this.mode = 'ptt';
    this.holding = false;
    this.deafened = false;
    this.generation = 0;
    this.pendingSignals = [];
    const saved = store.get('voiceVolume');
    this.volume = saved === null ? 0.8 : Math.max(0, Math.min(1, Number(saved) || 0));
    this.micTest = new MicTest(this);
    this.ui = voicePanel(this);
    app.net.on('voice:peers', (list) => { if (this.active) this.setPeers(list); });
    app.net.on('voice:signal', (data) => {
      if (this.starting && !this.active && this.pendingSignals.length < 128) { this.pendingSignals.push(data); return; }
      const peer = this.peers.get(data.from);
      if (this.active && peer?.token === data.token) peer.signal(data);
    });
    app.net.socket.on('disconnect', () => this.stop());
    window.addEventListener('blur', () => { this.holding = false; this.update(); });
    window.addEventListener('pagehide', () => this.stop());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); });
    window.addEventListener('focusin', () => { this.holding = false; this.update(); });
    window.addEventListener('keydown', (e) => {
      const typing = e.target?.closest?.('input, textarea, select, [contenteditable]');
      if (e.code !== 'KeyV' || typing || e.ctrlKey || e.altKey || e.metaKey || !this.active || this.mode !== 'ptt') return;
      e.preventDefault();
      this.holding = true;
      this.update();
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyV') { this.holding = false; this.update(); }
    });
  }

  async start() {
    if (this.starting || this.active || this.micTest.busy || !this.app.net.ready) return;
    this.micTest.message = '';
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.app.hud.toast('Mic cần HTTPS hoặc localhost. Mở game bằng link HTTPS nhé.', { ms: 6500 });
      return;
    }
    if (!globalThis.RTCPeerConnection) {
      this.app.hud.toast('Trình duyệt chưa hỗ trợ voice. Dùng Chrome, Edge hoặc Safari mới.');
      return;
    }
    const generation = ++this.generation;
    this.starting = true;
    this.ui.render('Cho phép mic để vào voice. Mặc định giữ V hoặc nút để nói.');
    try {
      this.app.audio.unlock();
      if (!this.app.audio.ctx) throw new Error('AudioUnavailable');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      // Permission prompts may outlive cancellation, disconnect, or a hidden tab.
      if (generation !== this.generation || !this.app.net.ready || document.hidden) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      for (const track of stream.getTracks()) {
        track.enabled = false;
        track.onended = () => this.stop();
      }
      const res = await this.app.net.call('voice:enable', { enabled: true }, 12000);
      if (generation !== this.generation) return;
      if (!res?.ok) throw new Error(res?.error || 'VoiceUnavailable');
      this.iceServers = res.iceServers;
      this.active = true;
      this.setPeers(res.peers || []);
      for (const data of this.pendingSignals.splice(0)) {
        const peer = this.peers.get(data.from);
        if (peer?.token === data.token) peer.signal(data);
      }
      this.update();
    } catch (err) {
      if (generation === this.generation) {
        this.stop();
        const text = err.name === 'NotAllowedError' ? 'Mic bị chặn. Cho phép mic trong cài đặt trang rồi bật lại voice.' :
          err.name === 'NotFoundError' ? 'Không tìm thấy mic. Cắm mic rồi thử lại nhé.' :
            err.name === 'NotReadableError' ? 'Mic đang bận hoặc không mở được. Kiểm tra ứng dụng khác đang dùng mic.' : 'Chưa mở được voice. Kiểm tra mic và kết nối rồi thử lại.';
        this.app.hud.toast(text, { ms: 6500 });
      }
    } finally {
      if (generation === this.generation) { this.starting = false; this.update(); }
    }
  }

  stop() {
    this.micTest.cancel();
    this.generation++;
    this.active = false;
    this.starting = false;
    this.pendingSignals.length = 0;
    this.holding = false;
    for (const track of this.stream?.getTracks() || []) track.stop();
    this.stream = null;
    for (const peer of this.peers.values()) peer.close();
    this.peers.clear();
    if (this.app.net.socket.connected) this.app.net.socket.emit('voice:enable', { enabled: false });
    this.update();
  }

  setPeers(list) {
    const wanted = new Map(list.map((p) => [p.sid, p]));
    for (const [sid, peer] of this.peers) {
      if (wanted.get(sid)?.token !== peer.token) { peer.close(); this.peers.delete(sid); }
    }
    for (const [sid, info] of wanted) {
      if (!this.peers.has(sid)) this.peers.set(sid, new VoicePeer(this, info));
    }
  }

  update() {
    const activity = this.app.activities?.current;
    this.blocked = Boolean(document.hidden || !document.hasFocus() || activity?.isRhythm ||
      this.app.modalBusy() || document.activeElement?.matches('input:not([type="range"]), textarea, [contenteditable]'));
    this.transmitting = this.active && !this.blocked && !this.deafened && (this.mode === 'open' || this.holding);
    for (const track of this.stream?.getAudioTracks() || []) track.enabled = this.transmitting;
    for (const peer of this.peers.values()) peer.update();
    const connected = [...this.peers.values()].filter((p) => p.pc.connectionState === 'connected');
    const speaking = connected.filter((p) => p.speaking).map((p) => p.name);
    const state = !this.active ? 'Voice tắt · nghe người trong 18 m' : this.deafened ? 'Đã tắt nghe và mic' :
      this.blocked ? 'Mic tạm tắt khi chơi nhịp, nhập chữ hoặc rời game' : this.transmitting ? 'Mic đang mở' : 'Mic tắt · giữ V hoặc nút để nói';
    this.ui?.render(this.micTest.message || `${state}${this.active ? ` · ${connected.length}/${this.peers.size} kết nối gần` : ''}${speaking.length ? ` · Đang nói: ${speaking.join(', ')}` : ''}`);
  }
}
