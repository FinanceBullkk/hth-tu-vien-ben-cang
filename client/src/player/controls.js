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
const FREELOOK_MAX_STEP = 80; // Delta xa hơn vậy chắc là vọt lóc của trình duyệt, không phải tay người dùng.

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
    this.rotating = false; // Đang giữ nút xoay camera (để nhân vật hướng theo ống kính).
    this.freeLook = false; // Chế độ xoay tự do: di chuột là xoay camera, không cần giữ phím.
    this.skipMove = 0; // Số event move bỏ qua ngay sau khi khóa con trỏ.
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
    // Con trỏ thoát khóa (Esc, mở tab mới...) thì tắt xoay tự do cho khớp trạng thái.
    document.addEventListener('pointerlockchange', () => {
      this.freeLook = document.pointerLockElement === this.canvas;
      this.rotating = this.freeLook;
      // Vừa khóa con trỏ, Chrome hay báo một delta ảo rất lớn làm camera tự quay vòng:
      // bỏ qua vài event đầu và kẹp biên mỗi event ở nhánh freeLook.
      this.skipMove = this.freeLook ? 2 : 0;
      if (!this.freeLook) this.canvas.classList.remove('cam-dragging');
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
    if (!isTouch && e.button === 2) {
      if (this.freeLook) {
        this.endFreeLook();
      } else {
        const p = this.canvas.requestPointerLock?.();
        p?.catch?.(() => {});
      }
      return;
    }
    if (this.freeLook && !isTouch) return; // Đang xoay tự do: chuột đã lo phần xoay, không kéo và không bấm chọn.
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
      this.canvas.classList.add('cam-dragging');
    }
  }

  #move(e) {
    if (e.pointerId === this.stickId) {
      this.#stickUpdate(e);
      return;
    }
    if (this.freeLook && e.pointerType === 'mouse') {
      // Con trỏ bị khóa: chỉ còn movementX/Y, camera xoay theo chuột lúc nào cũng được.
      if (this.skipMove > 0) {
        this.skipMove--;
        return;
      }
      const mx = Math.max(-FREELOOK_MAX_STEP, Math.min(FREELOOK_MAX_STEP, e.movementX));
      const my = Math.max(-FREELOOK_MAX_STEP, Math.min(FREELOOK_MAX_STEP, e.movementY));
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
    this.rotating = false;
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

  /** Thoát xoay tự do khi mở hộp thoại, đang gõ chữ hay rời tab. */
  endFreeLook() {
    if (this.freeLook && document.pointerLockElement === this.canvas) document.exitPointerLock();
  }
}
