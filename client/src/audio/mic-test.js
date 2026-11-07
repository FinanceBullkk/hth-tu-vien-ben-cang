// Local-only three-second recording. Never attaches capture to voice peers or a network request.
export class MicTest {
  constructor(voice) {
    this.voice = voice;
    this.generation = 0;
    this.busy = false;
    this.message = '';
    this.audio = document.createElement('audio');
    this.audio.controls = true;
    this.audio.hidden = true;
    this.audio.setAttribute('aria-label', 'Nghe lại bản thử mic');
    this.audio.addEventListener('ended', () => {
      this.cancel();
      this.message = 'Đã phát lại mic. Bật voice để nói với người khác.';
      voice.update();
    });
    this.audio.addEventListener('error', () => {
      this.cancel();
      this.message = 'Không phát được bản thử mic. Thử lại bằng Chrome hoặc Edge.';
      voice.update();
    });
  }

  async start() {
    if (this.busy) return this.cancel();
    this.voice.stop(); // Testing must never transmit even when open-mic mode was selected.
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) {
      this.message = 'Thử mic cần HTTPS hoặc localhost và trình duyệt hỗ trợ ghi âm.';
      this.voice.update();
      return;
    }
    const generation = ++this.generation;
    this.busy = true;
    this.message = 'Cho phép mic. Bản thử chỉ nằm tạm trên máy bạn.';
    this.voice.update();
    try {
      this.voice.app.audio.unlock();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (generation !== this.generation || document.hidden) { stream.getTracks().forEach((t) => t.stop()); return; }
      this.stream = stream;
      const recorder = this.recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = ({ data }) => { if (data.size && generation === this.generation) chunks.push(data); };
      recorder.onerror = () => this.fail(generation);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (generation !== this.generation) return;
        this.stream = null;
        const blob = new Blob(chunks, { type: recorder.mimeType });
        if (!blob.size) return this.fail(generation);
        this.url = URL.createObjectURL(blob);
        this.audio.src = this.url;
        this.audio.volume = this.voice.volume;
        this.audio.hidden = false;
        this.message = 'Đang phát lại giọng bạn. Không gửi cho người khác.';
        this.voice.update();
        try { await this.audio.play(); }
        catch {
          if (generation === this.generation) { this.message = 'Bấm Phát bên dưới để nghe lại mic.'; this.voice.update(); }
        }
      };
      recorder.start();
      this.message = 'Đang thu 3 giây — nói thử nhé. Sau đó tự phát lại.';
      this.voice.update();
      this.timer = setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 3000);
    } catch (err) {
      if (generation === this.generation) this.fail(generation, err.name === 'NotAllowedError' ? 'Mic bị chặn. Cho phép mic trong cài đặt trang rồi thử lại.' : undefined);
    }
  }

  fail(generation, message = 'Không thu được mic. Kiểm tra mic rồi thử lại nhé.') {
    if (generation !== this.generation) return;
    this.cancel();
    this.message = message;
    this.voice.update();
  }

  cancel() {
    this.generation++;
    this.busy = false;
    this.message = '';
    clearTimeout(this.timer);
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.recorder = null;
    for (const track of this.stream?.getTracks() || []) track.stop();
    this.stream = null;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.hidden = true;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
    this.voice.update();
  }
}
