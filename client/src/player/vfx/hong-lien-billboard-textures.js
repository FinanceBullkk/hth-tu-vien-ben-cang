import { canvasTexture } from './aura-canvas-kit.js';

// Texture billboard "bay bổng" của Hồng Liên, vẽ trắng trong khung 1024 (tâm giữa), shader tô màu sau.

/** Lông vũ nhỏ rơi: trục cong, phiến mềm hai bên, mép tơ xơ. */
export function hongLienFeather() {
  return canvasTexture('hong-lien-feather', 128, ({ c, stroke }) => {
    const g = c.createLinearGradient(0, 470, 0, -470);
    g.addColorStop(0, 'rgba(255,255,255,0.1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0.25)');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 440);
    c.bezierCurveTo(230, 200, 200, -260, 40, -470); c.bezierCurveTo(-160, -260, -230, 200, 0, 440); c.fill();
    for (let i = 0; i < 12; i++) {
      const y = 330 - i * 62;
      for (const s of [-1, 1]) stroke(() => { c.moveTo(s * 4, y); c.quadraticCurveTo(s * 90, y - 30, s * 175 * Math.sin(Math.PI * (0.1 + i / 13)), y - 90); }, 3, 0.45);
    }
    stroke(() => { c.moveTo(0, 500); c.quadraticCurveTo(30, 0, 40, -460); }, 9, 0.95);
  });
}

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
