import * as THREE from 'three';

// Nhịp thở và tiện ích dùng chung các aura pháp tướng (Kiếm Vũ, Lưu Ly...). Mọi thay đổi là
// phồng/xẹp mềm theo hàm thuần của thời gian — không có pha tăng tốc hay lóe gắt.
export const sstep = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const bell = (c, w, x) => Math.exp(-((x - c) * (x - c)) / (w * w));

/** Nhịp một chu kỳ `cycle` giây: hít vào (gather) rồi thở ra rất chậm (release), sóng sáng
    quét một vòng (sweep/sweepOn), đỉnh sáng (pulse). */
export function breathRhythm(time, cycle) {
  const phase = ((time / cycle) % 1 + 1) % 1;
  return { phase, gather: bell(0.15, 0.12, phase), release: bell(0.45, 0.17, phase),
    sweepOn: sstep(0.25, 0.38, phase) * (1 - sstep(0.75, 0.9, phase)),
    sweep: sstep(0.25, 0.85, phase) * Math.PI * 2, pulse: bell(0.45, 0.14, phase) };
}

let dotTexture = null;
/** Đốm sáng mềm 16×16 (DataTexture, chạy được cả khi không có DOM), dùng chung, không dispose. */
export function softDot() {
  if (dotTexture) return dotTexture;
  const px = new Uint8Array(16 * 16 * 4);
  for (let i = 0; i < 256; i++) {
    const r = Math.hypot((i % 16 - 7.5) / 7.5, (Math.floor(i / 16) - 7.5) / 7.5);
    px.set([255, 255, 255, Math.round(255 * Math.max(0, 1 - r) ** 2)], i * 4);
  }
  dotTexture = new THREE.DataTexture(px, 16, 16); dotTexture.needsUpdate = true;
  return dotTexture;
}
