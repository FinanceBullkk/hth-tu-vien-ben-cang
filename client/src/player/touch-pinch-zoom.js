// Hai ngón chạm trên cảnh: chụm để lùi camera, xoè để kéo lại gần.
// Trả về độ zoom dạng log tỉ lệ, cùng đơn vị với lăn chuột trong Input.

export class TouchPinchZoom {
  constructor() {
    this.points = new Map();
    this.lastDist = 0;
  }

  get active() {
    return this.points.size >= 2;
  }

  has(pointerId) {
    return this.points.has(pointerId);
  }

  /** Thêm một ngón; trả về true nếu vừa đủ hai ngón để bắt đầu chụm. */
  down(e) {
    if (e.pointerType !== 'touch') return false;
    this.points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.points.size === 2) this.lastDist = this.#spread();
    return this.points.size === 2;
  }

  /** Cập nhật vị trí ngón; trả về độ zoom (dương là lùi ra) khi đang chụm, ngược lại 0. */
  move(e) {
    const p = this.points.get(e.pointerId);
    if (!p) return 0;
    p.x = e.clientX;
    p.y = e.clientY;
    if (!this.active) return 0;
    const spread = this.#spread();
    const zoom = this.lastDist > 0 && spread > 0 ? Math.log(this.lastDist / spread) * 1.2 : 0;
    this.lastDist = spread;
    return zoom;
  }

  up(e) {
    this.points.delete(e.pointerId);
    this.lastDist = this.active ? this.#spread() : 0;
  }

  clear() {
    this.points.clear();
    this.lastDist = 0;
  }

  // Khoảng cách giữa hai ngón đầu tiên đang chạm.
  #spread() {
    const [a, b] = this.points.values();
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
}
