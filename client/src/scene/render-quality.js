// Bound GPU work by pixel count, including large monitors with devicePixelRatio = 1.
export function renderPixelRatio(width, height, dpr, level = 2, lowQuality = false) {
  const pixels = [960 * 540, 1280 * 720, 1920 * 1080][level];
  const cap = [0.75, 1, lowQuality ? 1 : 1.5][level];
  return Math.min(dpr || 1, cap, Math.sqrt(pixels / Math.max(1, width * height)));
}

export class AdaptiveQuality {
  constructor(onChange) {
    this.onChange = onChange;
    this.level = 2;
    this.elapsed = 0;
    this.reset();
  }

  reset() {
    this.seconds = 0;
    this.frames = 0;
    this.slowWindows = 0;
    this.stalls = 0;
  }

  update(dt, active = true) {
    if (!active || !Number.isFinite(dt) || dt <= 0 || dt > 2) {
      this.reset();
      return;
    }
    this.elapsed += dt;
    // ponytail: four-second shader warmup, one-way fallback; add recovery after GPU telemetry exists.
    if (this.elapsed < 4 || this.level === 0) return;
    if (dt > 0.25) {
      this.stalls++;
      if (this.stalls < 3) {
        this.seconds = 0;
        this.frames = 0;
        this.slowWindows = 0;
        return;
      }
    } else {
      this.stalls = 0;
    }
    this.seconds += dt;
    this.frames++;
    if (this.seconds < 2) return;
    const fps = this.frames / this.seconds;
    this.slowWindows = fps < 45 ? this.slowWindows + 1 : 0;
    this.seconds = 0;
    this.frames = 0;
    if (this.slowWindows < 2) return;
    this.level--;
    this.reset();
    this.onChange(this.level);
  }
}
