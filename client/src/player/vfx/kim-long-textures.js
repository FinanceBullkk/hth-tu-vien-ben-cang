import * as THREE from 'three';
import { canvasTexture } from './aura-canvas-kit.js';

// Texture vẽ tay của Kim Long, tô màu thật (không phải nét trắng tô sau): tường vân vàng có viền
// mực nâu và móc cuộn — đọc được cả trên nền tối lẫn sàn sáng. Hệ toạ độ canvas-kit: tâm (0,0),
// nửa khung 512.

/** Một cụm tường vân: các thuỳ tròn hợp lại (viền ngoài = vẽ nét dày rồi phủ màu lên), móc cuộn
    xoắn trong mỗi thuỳ, đuôi mây vuốt sang một bên. lobes: [x, y, r]. */
function paintCloud(c, lobes, { fillTop, fillBottom, line, curl, width = 14, tail = null }) {
  const top = Math.min(...lobes.map(([, y, r]) => y - r)), bottom = Math.max(...lobes.map(([, y, r]) => y + r));
  const fill = c.createLinearGradient(0, top, 0, bottom);
  fill.addColorStop(0, fillTop); fill.addColorStop(1, fillBottom);
  const circles = () => { c.beginPath(); for (const [x, y, r] of lobes) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); } };
  if (tail) {
    c.save(); c.strokeStyle = line; c.lineWidth = width * 0.8; c.beginPath();
    c.moveTo(...tail[0]); c.bezierCurveTo(...tail[1], ...tail[2], ...tail[3]); c.stroke(); c.restore();
  }
  c.save(); c.strokeStyle = line; c.lineWidth = width * 2; circles(); c.stroke(); c.restore();
  c.save(); c.fillStyle = fill; circles(); c.fill(); c.restore();
  // Móc cuộn: xoắn ốc 1.6 vòng từ tâm thuỳ ra 0.62 bán kính, nét thon dần.
  c.save(); c.strokeStyle = curl; c.lineCap = 'round';
  for (const [x, y, r] of lobes) {
    if (r < 40) continue;
    c.lineWidth = width * 0.6; c.beginPath();
    for (let i = 0; i <= 40; i++) {
      const k = i / 40, a = k * Math.PI * 3.2 + Math.PI, rr = r * 0.62 * k;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.9;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.stroke();
  }
  c.restore();
  // Ánh vàng sáng ở mép trên mỗi thuỳ.
  c.save(); c.strokeStyle = 'rgba(255,248,214,0.85)'; c.lineWidth = width * 0.45;
  for (const [x, y, r] of lobes) { c.beginPath(); c.arc(x, y, r * 0.84, Math.PI * 1.15, Math.PI * 1.75); c.stroke(); }
  c.restore();
}

const GOLD_CLOUD = { fillTop: '#fff2c4', fillBottom: '#e7a93a', line: '#6e3a0c', curl: '#a65e17' };

/** Cụm tường vân lớn cho billboard quanh thân và quanh chân. */
export const goldCloud = () => canvasTexture('kim-long-cloud', 512, ({ c }) => {
  paintCloud(c, [[-250, 70, 92], [-120, 10, 140], [40, -40, 170], [200, 30, 130], [320, 90, 80], [-40, 120, 110], [130, 130, 100]],
    { ...GOLD_CLOUD, width: 16, tail: [[330, 150], [400, 210], [440, 150], [480, 200]] });
});

/** Cụm mây thấp, dẹt — biển mây dưới chân. */
export const flatCloud = () => canvasTexture('kim-long-cloud-flat', 512, ({ c }) => {
  paintCloud(c, [[-330, 90, 90], [-190, 50, 120], [-30, 30, 140], [140, 50, 125], [300, 90, 95], [-110, 140, 90], [70, 150, 95], [230, 150, 70]],
    { ...GOLD_CLOUD, width: 14 });
});

/** Ô biển mây lặp liền mép (vẽ thêm bản sao lệch ±1024 ở mép). */
export const cloudSeaTile = () => {
  const tex = canvasTexture('kim-long-cloud-sea', 512, ({ c }) => {
    const style = { fillTop: 'rgba(255,240,190,0.75)', fillBottom: 'rgba(222,160,58,0.7)', line: '#7a420e', curl: '#9c5716', width: 12 };
    const spots = [[-300, -300], [120, -380], [-60, -60], [330, -40], [-360, 200], [60, 290], [380, 340]];
    for (const [sx, sy] of spots) for (const dx of [-1024, 0, 1024]) for (const dy of [-1024, 0, 1024]) {
      const x = sx + dx, y = sy + dy;
      if (Math.abs(x) > 760 || Math.abs(y) > 760) continue;
      paintCloud(c, [[x - 80, y + 20, 60], [x, y - 10, 82], [x + 85, y + 15, 62], [x + 10, y + 50, 55]], style);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
};

/** Vảy vàng rụng: hình vảy cá chép sáng có quầng mềm. */
export const goldFlake = () => canvasTexture('kim-long-flake', 64, ({ c, dot }) => {
  dot(0, 0, 420, 0.5);
  c.save(); c.fillStyle = '#fff6d0'; c.beginPath();
  c.moveTo(0, -300); c.quadraticCurveTo(240, -120, 160, 150); c.quadraticCurveTo(0, 300, -160, 150);
  c.quadraticCurveTo(-240, -120, 0, -300); c.fill(); c.restore();
});
