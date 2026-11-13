// Bound GPU work by pixel count, including large monitors with devicePixelRatio = 1.
// Mức 3 ("Rất nét") chỉ có khi người chơi tự chọn: tới 4K và tối đa 2 điểm vẽ cho mỗi điểm CSS.
export function renderPixelRatio(width, height, dpr, level = 2, lowQuality = false) {
  const pixels = [960 * 540, 1280 * 720, 1920 * 1080, 3840 * 2160][level];
  const cap = [0.75, 1, lowQuality ? 1 : 1.5, 2][level];
  return Math.min(dpr || 1, cap, Math.sqrt(pixels / Math.max(1, width * height)));
}

const SHADOW_BUSY_INTERVAL = 1 / 20;
const SHADOW_IDLE_INTERVAL = 1 / 5; // Không ai đi lại thì bóng chỉ còn trôi theo mặt trời.
const SHADOW_MIN_FRAMES = 3;

/**
 * Lịch vẽ lại bóng đổ. Bóng là khung nặng nhất, nên luôn cách ít nhất 3 khung để nhịp đều.
 * Khi máy chậm, bóng vì thế cũng thưa đi thay vì chiếm gần như mọi khung làm máy chậm thêm.
 */
export class ShadowPacer {
  constructor() {
    this.clock = 0;
    this.frames = 0;
  }

  /** @returns {boolean} khung này có cần vẽ lại bóng không */
  update(dt, busy) {
    this.clock += dt;
    this.frames++;
    if (this.frames < SHADOW_MIN_FRAMES) return false;
    if (this.clock < (busy ? SHADOW_BUSY_INTERVAL : SHADOW_IDLE_INTERVAL)) return false;
    this.clock = 0;
    this.frames = 0;
    return true;
  }
}

// Mỗi biến thể shader chỉ vài KB trên GPU; trần này chặn trường hợp shader sinh theo từng người.
const MAX_PINNED_PROGRAMS = 400;
const pinnedPrograms = new WeakSet();

/**
 * three xoá program khi vật liệu cuối cùng dùng nó bị dispose. Hiệu ứng PK và hào quang của người
 * vừa rời đi đều dispose vật liệu, nên lần sau lại biên dịch từ đầu (khựng 10-40 ms mỗi lần).
 * Ghim program để mỗi biến thể chỉ biên dịch một lần trong phiên. Gọi ngay sau khi vẽ.
 */
export function pinShaderPrograms(renderer) {
  const programs = renderer.info.programs;
  if (!programs || programs.length === renderer.pinnedSeen) return;
  renderer.pinnedSeen = programs.length;
  renderer.pinnedCount ??= 0;
  for (const program of programs) {
    if (renderer.pinnedCount >= MAX_PINNED_PROGRAMS) return;
    if (pinnedPrograms.has(program)) continue;
    pinnedPrograms.add(program);
    program.usedTimes++; // Không bao giờ về 0, nên WebGLPrograms.releaseProgram không huỷ nó.
    renderer.pinnedCount++;
  }
}

// Nhớ mức đã hạ một tuần rồi thử lại mức cao, phòng khi máy được nâng cấp hoặc đổi driver.
const QUALITY_MEMORY_MS = 7 * 24 * 3600 * 1000;

/**
 * Mức đồ hoạ để bắt đầu: lần trước máy này (cùng GPU) đã phải hạ thì vào thẳng mức đó,
 * khỏi chịu thêm cả chục giây giật trước khi tự hạ lại.
 * @param {{level?: number, gpu?: string, at?: number} | null} saved
 */
export function startQualityLevel(saved, gpu, now) {
  if (!saved || saved.gpu !== gpu || !Number.isInteger(saved.level)) return 2;
  if (!(now - saved.at >= 0 && now - saved.at < QUALITY_MEMORY_MS)) return 2;
  return Math.min(2, Math.max(0, saved.level));
}

/** Tên GPU để nhận ra cùng một máy; trình duyệt giấu thì vẫn trả chuỗi ổn định. */
export function gpuName(gl) {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  } catch {
    return 'unknown';
  }
}

const WINDOW_S = 2;
const SLOW_FPS = 45;
const FAST_FPS = 55;
const UPGRADE_WINDOWS = 15; // 30 giây mượt liền mới thử nâng một mức.
const MAX_UPGRADE_WINDOWS = 480; // Thử lại thưa nhất 16 phút một lần.
const FAILED_UPGRADE_S = 60; // Vừa nâng mà trong một phút đã phải hạ thì coi như nâng hỏng.

/**
 * Tự chọn mức đồ hoạ theo FPS đo được. Hạ một mức khi hai cửa sổ 2 giây liền dưới 45 FPS;
 * nâng lại một mức khi 30 giây liền trên 55 FPS. Máy chỉ bận nhất thời (đồng bộ file, quét virus)
 * vì thế không bị kẹt ở mức thấp. Nâng lên rồi lại phải hạ ngay thì lần thử sau chờ gấp đôi, để không giật lên giật xuống.
 */
export class AdaptiveQuality {
  constructor(onChange, level = 2, maxLevel = 2) {
    this.onChange = onChange;
    this.level = level;
    this.maxLevel = maxLevel;
    this.elapsed = 0;
    this.upgradeWindows = UPGRADE_WINDOWS;
    this.sinceUpgrade = Infinity;
    this.reset();
  }

  reset() {
    this.seconds = 0;
    this.frames = 0;
    this.slowWindows = 0;
    this.fastWindows = 0;
    this.stalls = 0;
  }

  update(dt, active = true) {
    if (!active || !Number.isFinite(dt) || dt <= 0 || dt > 2) {
      this.reset();
      return;
    }
    this.elapsed += dt;
    this.sinceUpgrade += dt;
    // Bốn giây đầu (và sau mỗi lần đổi mức) shader còn đang biên dịch, FPS chưa nói lên gì.
    if (this.elapsed < 4) return;
    if (dt > 0.25) {
      this.stalls++;
      if (this.stalls < 3) {
        this.seconds = 0;
        this.frames = 0;
        this.slowWindows = 0;
        this.fastWindows = 0;
        return;
      }
    } else {
      this.stalls = 0;
    }
    this.seconds += dt;
    this.frames++;
    if (this.seconds < WINDOW_S) return;
    const fps = this.frames / this.seconds;
    this.seconds = 0;
    this.frames = 0;
    this.slowWindows = fps < SLOW_FPS ? this.slowWindows + 1 : 0;
    this.fastWindows = fps >= FAST_FPS ? this.fastWindows + 1 : 0;
    if (this.slowWindows >= 2 && this.level > 0) {
      if (this.sinceUpgrade < FAILED_UPGRADE_S) this.upgradeWindows = Math.min(MAX_UPGRADE_WINDOWS, this.upgradeWindows * 2);
      this.#change(this.level - 1);
    } else if (this.fastWindows >= this.upgradeWindows && this.level < this.maxLevel) {
      this.sinceUpgrade = 0;
      this.#change(this.level + 1);
    }
  }

  #change(level) {
    this.level = level;
    this.elapsed = 0;
    this.reset();
    this.onChange(level);
  }
}
