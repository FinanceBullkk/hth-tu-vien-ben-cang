import { canvasTexture } from './aura-canvas-kit.js';

// Hoa văn canvas của Sen kim (vẽ trắng, shader tô màu).

/** Quầng tròn mịn cho mặt phẳng lớn (bóng dưới đài, hào quang vàng, nhụy): softDot 16×16
    lọc nearest sẽ lộ ô vuông khi trải rộng vài mét. */
export function softGlow() {
  return canvasTexture('sen-kim-soft-glow', 128, pen => pen.dot(0, 0, 510, 1));
}

/** Giọt hoạt lộ (billboard): hạt thon đầu tròn đuôi mảnh, đọc rõ là giọt chứ không phải đốm. */
export function dewDrop() {
  return canvasTexture('sen-kim-dew-drop', 64, pen => {
    pen.dot(0, -6, 44, 0.95);
    pen.dot(0, -2, 16, 1);
  });
}
