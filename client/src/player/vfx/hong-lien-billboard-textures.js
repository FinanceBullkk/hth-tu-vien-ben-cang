import { canvasTexture } from './aura-canvas-kit.js';

// Texture billboard "bay bổng" của Hồng Liên, vẽ trắng trong khung 1024 (tâm giữa), shader tô màu sau.

/** Sợi lửa lụa bay lên: nét chữ S mềm, đầu trên nhọn tan, thân mảnh như dải lụa. */
export function hongLienWisp() {
  return canvasTexture('hong-lien-wisp', 128, ({ c }) => {
    for (const [w, a] of [[110, 0.35], [55, 0.8], [22, 1]]) {
      const g = c.createLinearGradient(0, -500, 0, 500);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.25, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = g; c.lineWidth = w; c.beginPath(); c.moveTo(-40, 500);
      c.bezierCurveTo(160, 200, -180, -150, 40, -500); c.stroke();
    }
  });
}

/** Hỏa tinh bốn cánh lấp lánh: hai tia chéo mảnh + lõi tròn. */
export function hongLienSpark() {
  return canvasTexture('hong-lien-spark', 128, ({ c, dot }) => {
    for (const [w, h, rot] of [[34, 500, 0], [500, 34, 0], [14, 280, 1], [280, 14, 1]]) {
      c.save(); c.rotate(rot * Math.PI / 4);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h));
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    dot(0, 0, 150, 1);
  });
}

/** Lưỡi lửa lụa ở ngọn lông: chân tròn đầy, thân thắt lại, ngọn cong nhọn tan như khói; lõi sáng ở chân. */
export function hongLienFlameTongue() {
  return canvasTexture('hong-lien-flame-tongue', 128, ({ c, dot }) => {
    for (const [w, a] of [[1, 0.35], [0.62, 0.7], [0.3, 1]]) {
      const g = c.createLinearGradient(0, 480, 0, -500);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.55, `rgba(255,255,255,${a * 0.7})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 470);
      c.bezierCurveTo(-330 * w, 380, -260 * w, 60, -40 * w, -120);
      c.bezierCurveTo(90 * w, -260, -40, -380, 70, -500);
      c.bezierCurveTo(200 * w, -330, 330 * w, -40, 250 * w, 220);
      c.bezierCurveTo(200 * w, 400, 90 * w, 470, 0, 470); c.fill();
    }
    dot(0, 300, 170, 0.9);
  });
}
