import { voiceVolume } from '../../../shared/voice.js';

export class VoicePeer {
  constructor(owner, info) {
    Object.assign(this, info);
    this.owner = owner;
    this.queue = Promise.resolve();
    this.candidates = [];
    this.pc = new RTCPeerConnection({ iceServers: owner.iceServers });
    this.pc.addTrack(owner.stream.getAudioTracks()[0], owner.stream);
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.send({ candidate: candidate.toJSON() });
    };
    this.pc.ontrack = ({ track }) => this.receive(track);
    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'failed') owner.app.hud.toast(`Chưa nối được voice với ${this.name}. Thử tắt/bật voice; khác mạng có thể cần TURN.`, { ms: 6500 });
    };
    if (this.offerer) this.enqueue(async () => {
      await this.pc.setLocalDescription(await this.pc.createOffer());
      this.send({ description: this.pc.localDescription.toJSON() });
    });
  }

  send(payload) {
    if (this.pc.signalingState !== 'closed') this.owner.app.net.socket.emit('voice:signal', { to: this.sid, token: this.token, ...payload });
  }

  enqueue(fn) {
    this.queue = this.queue.then(() => {
      if (this.pc.signalingState !== 'closed') return fn();
    }).catch(() => {
      if (this.pc.signalingState !== 'closed') this.owner.app.hud.toast(`Kết nối voice với ${this.name} lỗi. Thử tắt/bật voice.`, { ms: 4000 });
    });
  }

  signal(data) {
    this.enqueue(async () => {
      if (data.description) {
        await this.pc.setRemoteDescription(data.description);
        for (const c of this.candidates.splice(0)) await this.pc.addIceCandidate(c);
        if (data.description.type === 'offer') {
          await this.pc.setLocalDescription(await this.pc.createAnswer());
          this.send({ description: this.pc.localDescription.toJSON() });
        }
      } else if (this.pc.remoteDescription) await this.pc.addIceCandidate(data.candidate);
      else if (this.candidates.length < 64) this.candidates.push(data.candidate);
    });
  }

  receive(track) {
    if (this.closed) return;
    const ctx = this.owner.app.audio.ctx;
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.gain?.disconnect();
    this.source = ctx.createMediaStreamSource(new MediaStream([track]));
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.samples = new Float32Array(256);
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.source.connect(this.analyser).connect(this.gain).connect(ctx.destination);
    // Safari needs a playing media element to keep remote WebRTC audio flowing.
    this.audio ??= document.createElement('audio');
    this.audio.autoplay = true;
    this.audio.muted = true;
    this.audio.srcObject = new MediaStream([track]);
    this.audio.play().catch(() => {});
  }

  update() {
    const { app, deafened, volume } = this.owner;
    const remote = app.remotes.map.get(this.sid);
    const distance = remote ? Math.hypot(app.me.x - remote.x, app.me.z - remote.z) : Infinity;
    const level = deafened || document.hidden || !app.net.ready ? 0 : volume * voiceVolume(distance);
    this.gain?.gain.setTargetAtTime(level, app.audio.ctx.currentTime, 0.06);
    this.speaking = false;
    if (this.analyser && level > 0) {
      this.analyser.getFloatTimeDomainData(this.samples);
      this.speaking = this.samples.reduce((sum, x) => sum + x * x, 0) / this.samples.length > 0.00015;
    }
    if (remote) {
      remote.avatar.nameEl.classList.toggle('voice-speaking', this.speaking);
      remote.avatar.nameEl.classList.toggle('voice-nearby', level > 0);
    }
  }

  close() {
    this.closed = true;
    this.pc.close();
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.gain?.disconnect();
    if (this.audio) { this.audio.pause(); this.audio.srcObject = null; }
    const label = this.owner.app.remotes.map.get(this.sid)?.avatar.nameEl;
    label?.classList.remove('voice-speaking', 'voice-nearby');
  }
}
