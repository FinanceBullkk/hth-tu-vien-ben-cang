import { canvasTexture } from './aura-canvas-kit.js';

// Texture billboard "bay bổng" riêng của Tinh Hà (vẽ trong khung 1024, tâm giữa). Sao bốn cánh và
// vệt khí dùng chung với Kiếm Vũ (kiemVuStar, kiemVuStreak) nên không vẽ lại ở đây.

/** Tinh vân: các quầng mây mềm chồng lệch, mép loang, điểm vài hạt sao sáng bên trong. */
export function tinhHaNebula() {
  return canvasTexture('tinh-ha-nebula', 256, ({ c, dot }) => {
    const puff = (x, y, rx, ry, a) => {
      c.save(); c.translate(x, y); c.scale(1, ry / rx);
      const g = c.createRadialGradient(0, 0, rx * 0.05, 0, 0, rx);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.5, `rgba(255,255,255,${a * 0.45})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill(); c.restore();
    };
    for (const [x, y, rx, ry, a] of [[-280, 40, 220, 150, 0.4], [-60, -30, 280, 190, 0.5], [190, 20, 240, 160, 0.42],
      [360, 80, 150, 100, 0.3], [-420, 110, 120, 80, 0.28], [40, 120, 300, 90, 0.3], [120, -150, 150, 110, 0.25]]) puff(x, y, rx, ry, a);
    // Làn bụi sáng xoắn nhẹ chạy ngang tinh vân.
    c.save(); c.globalAlpha = 0.35; c.lineWidth = 26; c.shadowColor = '#fff'; c.shadowBlur = 30; c.strokeStyle = '#fff';
    c.beginPath(); c.moveTo(-440, 140); c.bezierCurveTo(-200, -60, 120, 180, 440, -20); c.stroke(); c.restore();
    for (const [x, y, r] of [[-180, -10, 34], [70, 60, 26], [250, -40, 30], [-340, 90, 22], [150, -120, 20]]) dot(x, y, r, 0.95);
  });
}

/** Tinh sa: sao năm cánh nhỏ có quầng, rơi lả tả. */
export function tinhHaSpark() {
  return canvasTexture('tinh-ha-spark', 128, ({ c, dot }) => {
    dot(0, 0, 500, 0.35);
    c.save(); c.shadowColor = '#fff'; c.shadowBlur = 40; c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5, r = i % 2 ? 150 : 380;
      if (i) c.lineTo(Math.sin(a) * r, -Math.cos(a) * r); else c.moveTo(0, -r);
    }
    c.closePath(); c.fill(); c.restore();
  });
}
