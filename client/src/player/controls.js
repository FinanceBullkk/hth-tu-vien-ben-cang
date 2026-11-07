// Nhận thao tác: WASD/mũi tên, chuột phải bật/tắt xoay tự do, kéo chuột trái xoay, lăn zoom;
// điện thoại có cần ảo và kéo nửa phải.

const MOVE_KEYS = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const TAP_MOVE_PX = 8;
const TAP_MS = 350;
const MOUSE_SENS = 0.0045;
const SENS_PITCH = 0.7; // Trục dọc nhuộm nhẹ cho đỡ hoa mắt.
const MAX_STEP = 120; // Delta xa hơn vậy chắc là nhiễu của trình duyệt/bàn phím số, không phải tay người dùng.

export class Input {
  constructor(canvas, stick) {
    this.canvas = canvas;
    this.stick = stick;
    this.knob = stick.querySelector('.stick-knob');
    this.keys = new Set();
    this.yawDelta = 0;
    this.pitchDelta = 0;
    this.zoomDelta = 0;
    this.stickX = 0;
    this.stickY = 0;
    this.stickId = null;
    this.camId = null;
    this.camLast = { x: 0, y: 0 };
    this.downAt = { x: 0, y: 0, t: 0, moved: false };
    this.camButton = 0;
    this.rotating = false; // Camera đang ở chế độ quay theo ống kính (nhân vật hướng theo camera khi đi).
    this.freeLook = false; // Xoay tự do kiểu Where Winds Meet: di chuột trên khung cảnh là xoay, không cần giữ phím.
    this.onTap = null;
    this.onKeyDown = null;
    this.onKeyUp = null;
    this.enabled = false;

    window.addEventListener('keydown', (e) => this.#keyDown(e));
    window.addEventListener('keyup', (e) => this.#keyUp(e));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.#stickEnd();
      this.camId = null;
      this.rotating = false;
      this.canvas.classList.remove('cam-dragging');
      this.endFreeLook();
    });

    canvas.addEventListener('pointerdown', (e) => this.#down(e));
    window.addEventListener('pointermove', (e) => this.#move(e));
    window.addEventListener('pointerup', (e) => this.#up(e));
    window.addEventListener('pointercancel', (e) => this.#up(e));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomDelta += Math.sign(e.deltaY) * 0.7;
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  #typing(e) {
    const el = e.target;
    return el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
  }

  #keyDown(e) {
    if (this.#typing(e)) return;
    if (this.onKeyDown?.(e)) {
      e.preventDefault();
      return;
    }
    if (MOVE_KEYS[e.code]) {
      this.keys.add(e.code);
      e.preventDefault();
    }
  }

  #keyUp(e) {
    this.keys.delete(e.code);
    this.onKeyUp?.(e);
  }

  #down(e) {
    if (!this.enabled) return;
    const isTouch = e.pointerType === 'touch';
    // Chuột phải: bấm một lần bật/tắt xoay tự do, không cần giữ kéo (kiểu Where Winds Meet).
    // Cố ý không dùng Pointer Lock: khóa con trỏ bắt toàn bộ chuột, tay rời game vẫn quay camera.
    if (!isTouch && e.button === 2) {
      this.freeLook = !this.freeLook;
      this.rotating = this.freeLook;
      return;
    }
    const leftZone = isTouch && e.clientX < window.innerWidth * 0.45 && e.clientY > window.innerHeight * 0.45;
    if (leftZone && this.stickId === null) {
      this.stickId = e.pointerId;
      this.#stickUpdate(e);
      return;
    }
    if (e.button !== 0 && !isTouch) return;
    if (this.camId === null) {
      this.camId = e.pointerId;
      this.camButton = isTouch ? 0 : e.button;
      this.rotating = true;
      this.camLast.x = e.clientX;
      this.camLast.y = e.clientY;
      this.downAt = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
      if (!this.freeLook) this.canvas.classList.add('cam-dragging');
    }
  }

  #move(e) {
    if (e.pointerId === this.stickId) {
      this.#stickUpdate(e);
      return;
    }
    if (this.freeLook && e.pointerType === 'mouse') {
      // Xoay theo con trỏ đang hiện, chỉ khi lướt trên khung cảnh: đưa lên nút bấm hay bảng UI
      // thì target là UI, camera đứng yên để bấm thoải mái.
      if (e.target !== this.canvas) return;
      if (e.pointerId === this.camId && Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > TAP_MOVE_PX) {
        this.downAt.moved = true;
      }
      const rawX = typeof e.movementX === 'number' ? e.movementX : e.clientX - this.camLast.x;
      const rawY = typeof e.movementY === 'number' ? e.movementY : e.clientY - this.camLast.y;
      this.camLast.x = e.clientX;
      this.camLast.y = e.clientY;
      const mx = Math.max(-MAX_STEP, Math.min(MAX_STEP, rawX));
      const my = Math.max(-MAX_STEP, Math.min(MAX_STEP, rawY));
      this.yawDelta -= mx * MOUSE_SENS;
      this.pitchDelta += my * MOUSE_SENS * SENS_PITCH;
      return;
    }
    if (e.pointerId !== this.camId) return;
    const dx = e.clientX - this.camLast.x;
    const dy = e.clientY - this.camLast.y;
    this.camLast.x = e.clientX;
    this.camLast.y = e.clientY;
    if (Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > TAP_MOVE_PX) this.downAt.moved = true;
    if (this.downAt.moved) {
      const sens = e.pointerType === 'touch' ? 0.006 : MOUSE_SENS;
      this.yawDelta -= dx * sens;
      this.pitchDelta += dy * sens * SENS_PITCH;
    }
  }

  #up(e) {
    if (e.pointerId === this.stickId) {
      this.#stickEnd();
      return;
    }
    if (e.pointerId !== this.camId) return;
    this.camId = null;
    this.rotating = this.freeLook;
    this.canvas.classList.remove('cam-dragging');
    // Chỉ bấm chuột trái/thẻ mới tính là chạm để tương tác; chuột phải thuần xoay góc nhìn.
    const isTap = this.camButton === 0 && !this.downAt.moved && performance.now() - this.downAt.t < TAP_MS;
    if (isTap && e.type === 'pointerup') this.onTap?.(e.clientX, e.clientY);
  }

  #stickUpdate(e) {
    const rect = this.stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = rect.width / 2;
    let dx = (e.clientX - cx) / r;
    let dy = (e.clientY - cy) / r;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    this.stickX = dx;
    this.stickY = dy;
    this.knob.style.transform = `translate(${dx * r * 0.6}px, ${dy * r * 0.6}px)`;
  }

  #stickEnd() {
    this.stickId = null;
    this.stickX = 0;
    this.stickY = 0;
    this.knob.style.transform = '';
  }

  /** Vector di chuyển theo khung camera: x sang phải, y tiến tới. */
  moveVector(out) {
    let x = this.stickX;
    let y = -this.stickY;
    for (const code of this.keys) {
      const k = MOVE_KEYS[code];
      x += k[0];
      y += k[1];
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    // Vùng chết cho cần ảo
    if (len < 0.12) {
      x = 0;
      y = 0;
    }
    out.x = x;
    out.y = y;
    return out;
  }

  consumeLook() {
    const r = { yaw: this.yawDelta, pitch: this.pitchDelta, zoom: this.zoomDelta };
    this.yawDelta = 0;
    this.pitchDelta = 0;
    this.zoomDelta = 0;
    return r;
  }

  /** Tắt xoay tự do khi mở hộp thoại, đang gõ chữ hay rời tab. */
  endFreeLook() {
    this.freeLook = false;
    this.rotating = false;
  }
}
