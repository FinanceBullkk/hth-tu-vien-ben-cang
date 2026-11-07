// Kết nối Socket.IO: đồng bộ đồng hồ với server, vào phòng, tự kết nối lại.
import { io } from 'socket.io-client';

export class Net {
  constructor() {
    this.socket = io({ autoConnect: false, transports: ['websocket', 'polling'], reconnectionDelay: 700, reconnectionDelayMax: 3000 });
    this.ready = false;
    this.offset = 0;
    this.bestRtt = Infinity;
    this.profileFn = null;
    this.onEnter = null;
    this.onLost = null;
    this.onFatal = null;
    this.onRefused = null;
    this.syncTimer = null;
    this.entered = false;

    this.socket.on('connect', () => this.#afterConnect());
    this.socket.on('disconnect', (reason) => {
      this.ready = false;
      clearInterval(this.syncTimer);
      if (this.entered && reason !== 'io client disconnect') this.onLost?.();
    });
    this.socket.on('session:replaced', () => this.#fatal('Bạn vừa mở game ở một tab khác, tab này tạm nghỉ nhé.'));
    this.socket.on('kicked', () => this.#fatal('Bạn đã được mời ra khỏi tu viện. Tải lại trang sau một phút để vào lại nhé.'));
    this.socket.on('connect_error', () => {
      if (!this.entered) this.onRefused?.('Chưa kết nối được tới server, đang thử lại…');
    });
  }

  /** Giờ server ước lượng (ms). */
  now() {
    return Date.now() + this.offset;
  }

  #fatal(message) {
    this.ready = false;
    this.entered = false;
    this.socket.io.opts.reconnection = false;
    this.socket.disconnect();
    this.onFatal?.(message);
  }

  connect(profileFn) {
    this.profileFn = profileFn;
    if (this.socket.connected) this.#afterConnect();
    else this.socket.connect();
  }

  async #afterConnect() {
    await this.syncClock(5);
    const res = await this.call('hello', this.profileFn());
    if (!res?.ok) {
      if (res?.kicked) {
        this.#fatal(res.error);
      } else if (this.entered && res?.timedOut) {
        // Đang chơi mà mạng chậm: thử kết nối lại thay vì đẩy người chơi ra ngoài.
        this.socket.disconnect();
        this.socket.connect();
      } else if (this.entered) {
        // Đang chơi mà bị từ chối khi kết nối lại, ví dụ bị mời ra khỏi tu viện.
        this.#fatal(res?.error || 'Chưa vào lại được, tải lại trang nhé.');
      } else {
        this.onRefused?.(res?.error || 'Chưa vào được, thử lại nhé.', res);
      }
      return;
    }
    this.ready = true;
    this.entered = true;
    this.onEnter?.(res);
    clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => this.syncClock(1), 30_000);
  }

  /** Giống NTP: chỉ tin mẫu có độ trễ khứ hồi thấp nhất. */
  async syncClock(samples) {
    for (let i = 0; i < samples; i++) {
      const t0 = Date.now();
      const res = await this.call('time:sync', null, 2000);
      if (!res?.now) continue;
      const t1 = Date.now();
      const rtt = t1 - t0;
      // Nới dần ngưỡng để vẫn cập nhật khi mạng đổi hoặc đồng hồ máy trôi.
      this.bestRtt = Math.min(this.bestRtt * 1.05, this.bestRtt + 5);
      if (rtt <= this.bestRtt || this.bestRtt === Infinity) {
        this.bestRtt = rtt;
        this.offset = res.now + rtt / 2 - t1;
      }
    }
  }

  call(event, data, timeout = 5000) {
    return new Promise((resolve) => {
      if (!this.socket.connected) {
        resolve({ ok: false, error: 'Đang mất kết nối, thử lại sau nhé.' });
        return;
      }
      this.socket.timeout(timeout).emit(event, data, (err, res) => {
        if (err) resolve({ ok: false, timedOut: true, error: 'Mạng hơi chậm, thử lại nhé.' });
        else resolve(res);
      });
    });
  }

  on(event, fn) {
    this.socket.on(event, fn);
  }
}
