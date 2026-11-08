// Nhận thao tác: WASD/mũi tên, rê chuột xoay khi khóa trỏ, lăn zoom; điện thoại dùng cần ảo.

const MOVE_KEYS = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const TAP_MOVE_PX = 8;
const TAP_MS = 350;

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
    this.onTap = null;
    this.onKeyDown = null;
    this.onKeyUp = null;
    this.enabled = false;
    this.pointerLocked = false;
    this.pointerLockFailed = false;
    this.lockClick = false;
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
      this.camId = null;
    });

    window.addEventListener('keydown', (e) => this.#keyDown(e));
    window.addEventListener('keyup', (e) => this.#keyUp(e));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.#stickEnd();
      this.camId = null;
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
    if (!isTouch && e.button === 0 && !this.pointerLocked && (this.canLock?.() ?? true)) {
      this.lockClick = true;
      if (this.canvas.requestPointerLock) {
        Promise.resolve(this.canvas.requestPointerLock()).catch(() => {
          this.pointerLockFailed = true;
          this.lockClick = false;
        });
      }
    }
    if (!isTouch && this.pointerLocked) return;
    const leftZone = isTouch && e.clientX < window.innerWidth * 0.45 && e.clientY > window.innerHeight * 0.45;
    if (leftZone && this.stickId === null) {
      this.stickId = e.pointerId;
      this.#stickUpdate(e);
      return;
    }
    if (e.button !== 0 && !isTouch) return;
    if (this.camId === null) {
      this.camId = e.pointerId;
      this.camLast.x = e.clientX;
      this.camLast.y = e.clientY;
      this.downAt = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    }
  }

  #move(e) {
    if (e.pointerType === 'mouse' && (this.pointerLocked || ((!this.canvas.requestPointerLock || this.pointerLockFailed) && e.target === this.canvas && this.enabled && (this.canLock?.() ?? true)))) {
      this.yawDelta -= e.movementX * 0.0028;
      this.pitchDelta += e.movementY * 0.0028 * 0.7;
      return;
    }
    if (e.pointerId === this.stickId) {
      this.#stickUpdate(e);
      return;
    }
    if (e.pointerId !== this.camId) return;
    const dx = e.clientX - this.camLast.x;
    const dy = e.clientY - this.camLast.y;
    this.camLast.x = e.clientX;
    this.camLast.y = e.clientY;
    if (Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > TAP_MOVE_PX) this.downAt.moved = true;
    if (this.downAt.moved) {
      const sens = e.pointerType === 'touch' ? 0.006 : 0.0045;
      this.yawDelta -= dx * sens;
      this.pitchDelta += dy * sens * 0.7;
    }
  }

  #up(e) {
    if (this.pointerLocked && e.pointerType === 'mouse') {
      if (this.lockClick) this.lockClick = false;
      else if (e.button === 0) this.onTap?.(window.innerWidth / 2, window.innerHeight / 2);
      return;
    }
    this.lockClick = false;
    if (e.pointerId === this.stickId) {
      this.#stickEnd();
      return;
    }
    if (e.pointerId !== this.camId) return;
    this.camId = null;
    const isTap = !this.downAt.moved && performance.now() - this.downAt.t < TAP_MS;
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
}
