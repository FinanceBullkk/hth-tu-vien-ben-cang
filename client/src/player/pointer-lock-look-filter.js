// Lọc delta chuột khi khoá con trỏ. Chrome (nhất là trên Windows) thỉnh thoảng báo một movementX/Y
// ảo rất lớn: ngay sau khi vừa khoá, hoặc bất chợt giữa lúc rê. Cộng thẳng vào yaw thì camera vọt
// nửa vòng ("tự spin"). Bỏ hẳn các delta đó; kẹp biên vẫn làm camera giật.

// Tay người rê nhanh vẫn hiếm khi quá chừng này px trong một event (~1 khung hình).
export const MAX_LOOK_STEP = 150;
// Số event bỏ qua ngay sau khi khoá con trỏ.
export const SKIP_AFTER_LOCK = 2;

export class PointerLockLookFilter {
  constructor(maxStep = MAX_LOOK_STEP, skipAfterLock = SKIP_AFTER_LOCK) {
    this.maxStep = maxStep;
    this.skipAfterLock = skipAfterLock;
    this.skip = 0;
  }

  /** Gọi khi vừa khoá con trỏ xong. */
  locked() {
    this.skip = this.skipAfterLock;
  }

  /** true nếu delta này là tay người thật, nên cộng vào camera. */
  accept(dx, dy) {
    if (this.skip > 0) {
      this.skip--;
      return false;
    }
    return Number.isFinite(dx) && Number.isFinite(dy) && Math.abs(dx) <= this.maxStep && Math.abs(dy) <= this.maxStep;
  }
}
