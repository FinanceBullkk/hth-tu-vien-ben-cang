// Giới hạn chống spam khi game mở ra internet: đếm theo IP trong một cửa sổ thời gian.

export class WindowCounter {
  /** @param {number} windowMs độ dài cửa sổ đếm */
  constructor(windowMs) {
    this.windowMs = windowMs;
    this.map = new Map();
  }

  /** Tính thêm một lượt cho key. Trả về false nếu đã vượt max, khi đó lượt này không được tính. */
  take(key, max, now = Date.now()) {
    let entry = this.map.get(key);
    if (!entry || now - entry.start >= this.windowMs) {
      // Dọn định kỳ để bản đồ không lớn mãi khi có nhiều IP lạ.
      if (this.map.size > 5000) this.sweep(now);
      entry = { start: now, count: 0 };
      this.map.set(key, entry);
    }
    if (entry.count >= max) return false;
    entry.count++;
    return true;
  }

  /** Số lượt đã dùng trong cửa sổ hiện tại, không tính thêm. */
  peek(key, now = Date.now()) {
    const entry = this.map.get(key);
    return entry && now - entry.start < this.windowMs ? entry.count : 0;
  }

  sweep(now = Date.now()) {
    for (const [key, entry] of this.map) {
      if (now - entry.start >= this.windowMs) this.map.delete(key);
    }
  }
}

/**
 * Lấy IP thật của kết nối socket. Sau Tailscale Funnel mọi kết nối đều đến từ proxy,
 * nên chỉ đọc X-Forwarded-For khi bật trustProxy, và chỉ lấy giá trị cuối do proxy ghi;
 * các giá trị phía trước có thể do người dùng tự gửi lên.
 */
export function clientIp(handshake, trustProxy) {
  if (trustProxy) {
    const header = handshake.headers?.['x-forwarded-for'];
    const last = typeof header === 'string' ? header.split(',').pop().trim() : '';
    if (last) return last;
  }
  return handshake.address;
}
