// Phát lại chuyển động của một người chơi khác từ các mẫu vị trí qua mạng.
// Tự đo độ trễ và độ dao động của từng người để luôn có mẫu kế tiếp, kể cả qua tunnel chậm.
// Không phụ thuộc Three.js để chạy được trong test.

const DEFAULT_DELAY_MS = 150;
const MIN_DELAY_MS = 70;
const MAX_DELAY_MS = 600;
const GAP_MS = 400; // Lâu hơn mức này giữa hai mẫu là người đó vừa đứng yên hoặc mất gói dài.
const HOLD_LEAD_MS = 50;
const MAX_EXTRAPOLATE_MS = 140;
const STALE_MS = 500; // Không có mẫu mới quá lâu thì thôi hoạt ảnh đi.
const RESET_MS = 1000; // Mẫu lùi xa hơn mức này là đồng hồ đã đổi, ví dụ sau khi kết nối lại.
const PLAYBACK_SLEW = 0.08; // Chỉnh trễ bằng cách phát nhanh/chậm tối đa 8%, mắt không thấy.
const SMOOTH_RATE = 28;
const TELEPORT_M = 4;
const MAX_SAMPLES = 32;
const STAT_GAIN = 0.1;
const UNDERRUN_BOOST_MAX_MS = 150;
const UNDERRUN_DECAY_MS_PER_SEC = 4;

const CLOCK_SLEW = 0.05;
const CLOCK_JUMP_MS = 250;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Đồng hồ server ước lượng: lệch ít thì trôi dần, tránh giật mọi thứ chạy theo đồng hồ khi đồng bộ lại. */
export function slewOffset(current, target, elapsedMs) {
  const diff = target - current;
  if (Math.abs(diff) > CLOCK_JUMP_MS) return target;
  const step = Math.max(0, elapsedMs) * CLOCK_SLEW;
  return current + clamp(diff, -step, step);
}

export class RemoteMotion {
  constructor(x, z, rot, anim, now) {
    this.x = x;
    this.z = z;
    this.rot = rot;
    this.anim = anim;
    this.delay = DEFAULT_DELAY_MS;
    this.target = DEFAULT_DELAY_MS;
    this.ageAvg = null;
    this.ageDev = 0;
    this.intervalAvg = 50;
    this.boost = 0;
    this.vx = 0;
    this.vz = 0;
    this.renderT = now - this.delay;
    this.buf = [{ t: now, x, z, rot, anim }];
  }

  /**
   * @param {number} t giờ server lúc mẫu được lấy
   * @param {number} arrivedAt giờ server lúc mẫu tới máy này
   */
  push(t, x, z, rot, anim, arrivedAt) {
    const last = this.buf[this.buf.length - 1];
    if (t <= last.t) {
      if (last.t - t > RESET_MS) {
        this.buf = [{ t, x, z, rot, anim }];
        this.vx = 0;
        this.vz = 0;
      }
      return;
    }
    const interval = t - last.t;
    if (interval > GAP_MS) {
      // Vừa đứng yên lâu rồi mới đi: chèn mốc giả để khỏi trượt dài từ mẫu cũ.
      this.buf.push({ t: t - HOLD_LEAD_MS, x: last.x, z: last.z, rot: last.rot, anim: 0 });
      this.vx = 0;
      this.vz = 0;
    } else {
      this.#measure(interval, Math.max(0, arrivedAt - t), last);
      this.vx = anim === 1 ? (x - last.x) / interval : 0;
      this.vz = anim === 1 ? (z - last.z) / interval : 0;
    }
    this.buf.push({ t, x, z, rot, anim });
    if (this.buf.length > MAX_SAMPLES) this.buf.splice(0, this.buf.length - MAX_SAMPLES);
  }

  #measure(interval, age, last) {
    if (this.ageAvg === null) {
      this.ageAvg = age;
      this.ageDev = age * 0.25;
      this.intervalAvg = interval;
    } else {
      const err = age - this.ageAvg;
      this.ageAvg += err * STAT_GAIN;
      this.ageDev += (Math.abs(err) - this.ageDev) * STAT_GAIN;
      this.intervalAvg += (interval - this.intervalAvg) * STAT_GAIN;
    }
    // Mẫu tới khi đã phát quá mẫu trước nghĩa là trễ đang thiếu: nới ngay, sau đó co lại rất chậm.
    if (this.renderT > last.t) {
      this.boost = Math.min(UNDERRUN_BOOST_MAX_MS, this.boost + Math.min(40, this.renderT - last.t));
    }
    // Phải đủ để phủ tuổi của mẫu mới nhất cộng một nhịp chờ mẫu kế tiếp.
    this.target = clamp(this.ageAvg + this.intervalAvg + 2.5 * this.ageDev + this.boost, MIN_DELAY_MS, MAX_DELAY_MS);
  }

  /** @param {number} dt giây @param {number} now giờ server hiện tại (ms) */
  update(dt, now) {
    const buf = this.buf;
    this.boost = Math.max(0, this.boost - dt * UNDERRUN_DECAY_MS_PER_SEC);
    const idle = buf.length === 1 && now - this.delay >= buf[0].t;
    if (idle) {
      this.delay = this.target; // Đang đứng yên thì đổi trễ thẳng, không ai thấy.
    } else {
      const step = dt * 1000 * PLAYBACK_SLEW;
      this.delay += clamp(this.target - this.delay, -step, step);
    }

    const renderT = now - this.delay;
    this.renderT = renderT;
    while (buf.length >= 2 && buf[1].t <= renderT) buf.shift();
    const a = buf[0];
    const b = buf[1];
    let tx = a.x;
    let tz = a.z;
    if (b && renderT > a.t) {
      const k = (renderT - a.t) / (b.t - a.t);
      const jumped = (b.x - a.x) ** 2 + (b.z - a.z) ** 2 > TELEPORT_M ** 2;
      tx = jumped ? b.x : a.x + (b.x - a.x) * k;
      tz = jumped ? b.z : a.z + (b.z - a.z) * k;
      const d = Math.atan2(Math.sin(b.rot - a.rot), Math.cos(b.rot - a.rot));
      this.rot = a.rot + d * k;
      this.anim = b.anim;
    } else if (b) {
      this.rot = a.rot;
      this.anim = a.anim;
    } else {
      // Hết mẫu: đi tiếp theo vận tốc cuối một đoạn ngắn thay vì đứng khựng, hết đoạn thì dừng.
      const over = Math.max(0, renderT - a.t);
      const lead = Math.min(over, MAX_EXTRAPOLATE_MS);
      tx = a.x + this.vx * lead;
      tz = a.z + this.vz * lead;
      this.rot = a.rot;
      this.anim = over > STALE_MS ? 0 : a.anim;
    }

    const ex = tx - this.x;
    const ez = tz - this.z;
    if (ex * ex + ez * ez > TELEPORT_M * TELEPORT_M) {
      this.x = tx;
      this.z = tz;
    } else {
      const k = 1 - Math.exp(-dt * SMOOTH_RATE);
      this.x += ex * k;
      this.z += ez * k;
    }
  }
}
