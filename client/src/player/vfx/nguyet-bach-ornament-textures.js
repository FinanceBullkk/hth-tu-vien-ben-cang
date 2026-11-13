import { canvasTexture } from './aura-canvas-kit.js';
import { halfWidth } from './nguyet-bach-geometry.js';

// Texture hoa văn phụ của Nguyệt Bạch: quầng nguyệt hoa ngũ sắc, khảm bạc mặt cổ cầm, hoa văn
// khắc trên nguyệt nhận, lưỡi âm nhận, tinh thể sương giá. Hệ toạ độ canvasTexture: tâm (0,0), ±512.
const TAU = Math.PI * 2;

/** Nguyệt hoa (màu thật, cộng màu): vành quầng ngũ sắc quanh trăng — lam trong, vàng ngà, hồng ngoài. */
export function nguyetBachCorona() {
  return canvasTexture('nguyet-bach-corona', 512, ({ c }) => {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 512);
    [[0, 'rgba(160,200,255,0)'], [0.6, 'rgba(160,200,255,0)'], [0.7, 'rgba(175,215,255,0.55)'], [0.77, 'rgba(255,245,215,0.5)'],
      [0.84, 'rgba(255,190,170,0.32)'], [0.9, 'rgba(200,160,255,0.16)'], [1, 'rgba(200,160,255,0)']].forEach(([k, col]) => g.addColorStop(k, col));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 512, 0, TAU); c.fill();
  });
}

/** Khảm bạc mặt cổ cầm (nét trắng cho emblem kit): viền khảm đôi chạy theo dáng đàn, mây rồng ở
    đầu đàn (long trì), sóng nước ở đuôi (phượng chiểu). len: chiều dài đàn = cạnh tấm vẽ (mét). */
export function nguyetBachGuqinInlay(len, width) {
  return canvasTexture(`nguyet-bach-guqin-inlay-${len}-${width}`, 1024, ({ stroke, cloud, c }) => {
    const k = 1024 / len, px = (v, x) => [x * k, (0.5 - v) * len * k];
    for (const [inset, w, a] of [[0.86, 1.6, 0.95], [0.74, 0.8, 0.6]]) {
      stroke(() => {
        for (let i = 0; i <= 80; i++) { const v = 0.02 + 0.96 * i / 80; c.lineTo(...px(v, halfWidth(v, width) * inset)); }
        for (let i = 80; i >= 0; i--) { const v = 0.02 + 0.96 * i / 80; c.lineTo(...px(v, -halfWidth(v, width) * inset)); }
        c.closePath();
      }, w, a);
    }
    // Đầu đàn: mây rồng cuộn hai tầng; đuôi đàn: ba lớp sóng.
    const [hx, hy] = px(0.94, 0);
    cloud(hx - 18, hy, 1.4, 1.3, 0.9); cloud(hx + 22, hy + 30, 1.1, 1.1, 0.8);
    stroke(() => { c.arc(hx, hy - 4, 26, 0, TAU); }, 1.2, 0.7);
    for (let i = 0; i < 3; i++) {
      const [tx, ty] = px(0.06 + i * 0.025, 0);
      stroke(() => { c.moveTo(tx - 48, ty); c.bezierCurveTo(tx - 24, ty - 14, tx - 8, ty + 12, tx, ty); c.bezierCurveTo(tx + 8, ty - 12, tx + 24, ty + 14, tx + 48, ty); }, 1.1, 0.8);
    }
  });
}

/** Hoa văn khắc trên nguyệt nhận: đường gân chạy dọc lưỡi, mây cuộn giữa, chấm trân châu. ro: bán kính
    ngoài, ri/d: vòng trong lệch tâm d (mét), size: cạnh tấm vẽ. */
export function nguyetBachCrescentCarving(ro, ri, d, size) {
  return canvasTexture(`nguyet-bach-crescent-carving-${ro}`, 1024, ({ stroke, cloud, c }) => {
    // Bán kính mép trong (vòng tâm (−d, 0)) theo hướng th, và đường giữa lưỡi.
    const rin = th => -d * Math.cos(th) + Math.sqrt(ri * ri - d * d * Math.sin(th) ** 2);
    const rmid = th => (ro + rin(th)) / 2, k = 1024 / size;
    const mid = th => [Math.cos(th) * rmid(th) * k, -Math.sin(th) * rmid(th) * k];
    for (const [off, w, a] of [[0.3, 1.4, 0.9], [-0.3, 0.8, 0.6]]) {
      stroke(() => {
        for (let i = 0; i <= 60; i++) {
          const th = -1.6 + 3.2 * i / 60, r = rmid(th) + off * (ro - rin(th)) / 2;
          c.lineTo(Math.cos(th) * r * k, -Math.sin(th) * r * k);
        }
      }, w, a);
    }
    for (const th of [-0.75, 0, 0.75]) { const [x, y] = mid(th); cloud(x, y, 1.1, 1.2, 0.9); }
    for (let i = 0; i < 9; i++) { const [x, y] = mid(-1.2 + i * 0.3); stroke(() => c.arc(x, y + 22, 3, 0, TAU), 1, 0.8); }
  });
}

/** Lưỡi âm nhận: vầng khuyết sắc hai đầu, sáng ở mép lồi, có quầng (trắng trên nền trong suốt). */
export function nguyetBachSoundBlade() {
  return canvasTexture('nguyet-bach-sound-blade', 256, ({ c, dot }) => {
    dot(-60, 0, 380, 0.25);
    c.fillStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 30;
    c.beginPath(); c.arc(-140, 0, 440, -1.05, 1.05); c.arc(-330, 0, 330, 0.9, -0.9, true); c.closePath(); c.fill();
  });
}

/** Tinh thể sương giá sáu nhánh có nhánh phụ. */
export function nguyetBachFrost() {
  return canvasTexture('nguyet-bach-frost', 128, ({ around, stroke, c, dot }) => {
    dot(0, 0, 200, 0.5);
    around(6, () => {
      stroke(() => { c.moveTo(0, 0); c.lineTo(0, -430); }, 7, 1);
      for (const y of [-180, -300]) for (const s of [-1, 1]) stroke(() => { c.moveTo(0, y); c.lineTo(s * 90, y - 90); }, 5, 0.9);
    });
  });
}
