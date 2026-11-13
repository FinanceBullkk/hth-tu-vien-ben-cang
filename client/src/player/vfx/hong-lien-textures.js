import { canvasTexture } from './aura-canvas-kit.js';

// Hoa văn riêng của Chu Tước Hồng Liên. Đơn vị px trong khung 1024 (bán kính 512), góc 0 hướng lên.
// Cố ý KHÔNG dùng đĩa mandala tròn, vành chữ hay trận đồ tròn như các aura khác:
//  sau lưng là quạt đuôi phượng xoè nửa vòng; dưới chân là đóa hồng liên nhìn từ trên xuống,
//  viền ngoài là mép cánh nhọn chứ không phải vòng tròn.

// Cánh sen nhọn từ r0 tới r1, rộng w, kèm gân lông vũ chéo hai bên trục.
function lotusPetal(p, r0, r1, w, width, alpha, barbs = 6) {
  const { c, stroke } = p, len = r1 - r0;
  stroke(() => {
    c.moveTo(0, -r0); c.bezierCurveTo(w * 1.2, -(r0 + len * 0.3), w * 0.9, -(r0 + len * 0.75), 0, -r1);
    c.bezierCurveTo(-w * 0.9, -(r0 + len * 0.75), -w * 1.2, -(r0 + len * 0.3), 0, -r0);
  }, width, alpha);
  stroke(() => { c.moveTo(0, -(r0 + len * 0.08)); c.lineTo(0, -(r1 - len * 0.1)); }, width * 0.6, alpha * 0.8);
  for (let i = 1; i <= barbs; i++) {
    const y = r0 + len * (0.12 + 0.72 * i / (barbs + 1)), half = w * 0.85 * Math.sin(Math.PI * (y - r0) / len);
    for (const s of [-1, 1]) stroke(() => { c.moveTo(0, -y); c.quadraticCurveTo(s * half * 0.5, -(y + 6), s * half, -(y + 18)); }, width * 0.4, alpha * 0.5);
  }
}

// Lông đuôi phượng từ r0 tới r1: trục cong như ngọn lửa lụa (curl lệch ngọn), tơ lông chéo,
// mắt lông hình giọt ở gần ngọn (vành, tròng, đồng tử).
function tailPlume(p, r0, r1, w, curl, width, alpha) {
  const { c, stroke } = p, len = r1 - r0, eye = r1 - len * 0.17;
  stroke(() => { c.moveTo(0, -r0); c.bezierCurveTo(0, -(r0 + len * 0.5), curl * 0.4, -(r0 + len * 0.8), curl, -r1); }, width, alpha);
  for (let i = 0; i < 14; i++) {
    const t = 0.1 + i * 0.05, y = r0 + len * t, half = w * (0.25 + 0.75 * t), x = curl * t * t * 0.6;
    for (const s of [-1, 1]) stroke(() => { c.moveTo(x, -y); c.quadraticCurveTo(x + s * half * 0.6, -(y + 10), x + s * half, -(y + len * 0.06)); }, width * 0.45, alpha * 0.45);
  }
  const ex = curl * 0.55;
  stroke(() => c.ellipse(ex, -eye, w * 0.62, w * 0.9, curl * 0.002, 0, Math.PI * 2), width * 1.1, alpha);
  stroke(() => c.ellipse(ex, -eye + 4, w * 0.36, w * 0.55, 0, 0, Math.PI * 2), width * 0.8, alpha * 0.85);
  p.dot(ex, -eye + 6, w * 0.3, alpha);
  // Tơ ngọn tan như khói lụa.
  for (const s of [-1, 0, 1]) stroke(() => { c.moveTo(curl, -r1); c.quadraticCurveTo(curl + s * 18 + 10, -(r1 + 14), curl + s * 26 + 18, -(r1 + 6)); }, width * 0.4, alpha * 0.5);
}

/** Quạt đuôi phượng: 13 lông dài xoè nửa vòng trên (±100°) + lông ngắn xen giữa; trống quanh tâm (đầu). */
export function hongLienFan() {
  return canvasTexture('hong-lien-fan', 1024, p => {
    const { c, stroke, at } = p;
    for (let i = 0; i < 13; i++) {
      const k = i / 12 * 2 - 1, a = k * Math.PI * 0.56, mid = 1 - Math.abs(k);
      at(a, () => tailPlume(p, 210, 400 + 95 * mid, 38 + 8 * mid, -k * 40, 1.3, 0.85));
    }
    for (let i = 0; i < 12; i++) {
      const k = (i + 0.5) / 12 * 2 - 1, a = k * Math.PI * 0.56;
      at(a, () => lotusPetal(p, 215, 330, 30, 1, 0.55, 4));
    }
    // Vầng lông cổ: cung lông ngắn quanh vai, hở phía dưới.
    for (let i = 0; i < 25; i++) {
      const a = (i / 24 * 2 - 1) * Math.PI * 0.6;
      at(a, () => stroke(() => { c.moveTo(0, -200); c.quadraticCurveTo(12, -222, 4, -244); }, 1.1, 0.6));
    }
  });
}

/** Đốm sáng trên mắt lông quạt và đầu cánh sen. */
export function hongLienFanGlow() {
  return canvasTexture('hong-lien-fan-glow', 512, ({ dot }) => {
    for (let i = 0; i < 13; i++) {
      const k = i / 12 * 2 - 1, a = k * Math.PI * 0.56, r = (400 + 95 * (1 - Math.abs(k))) * 0.86;
      dot(Math.sin(a) * r - k * 20 * Math.cos(a), -Math.cos(a) * r, 34, 0.85);
    }
  });
}

/** Đóa hồng liên dưới chân (nhìn từ trên): 16 cánh ngoài + 12 cánh giữa xen kẽ, mép ngoài là mũi cánh. */
export function hongLienBloom() {
  return canvasTexture('hong-lien-bloom', 1024, p => {
    p.around(16, () => lotusPetal(p, 180, 505, 70, 1.6, 0.85, 7));
    p.around(12, () => lotusPetal(p, 150, 390, 58, 1.3, 0.7, 5), 0.5);
    p.around(32, () => p.stroke(() => { p.c.moveTo(0, -470); p.c.quadraticCurveTo(10, -490, 0, -508); }, 0.8, 0.4), 0.25);
  });
}

/** Lõi sen quay ngược: 8 cánh trong + đài gương sen có hạt. */
export function hongLienBloomInner() {
  return canvasTexture('hong-lien-bloom-inner', 512, p => {
    const { ring, around, stroke, c } = p;
    around(8, () => lotusPetal(p, 170, 500, 90, 2.2, 0.85, 5));
    ring(165, 2.4); ring(150, 1, 0.6);
    for (const [x, y] of [[0, 0], ...Array.from({ length: 6 }, (_, i) => [Math.sin(i * Math.PI / 3) * 90, -Math.cos(i * Math.PI / 3) * 90])]) {
      stroke(() => c.arc(x, y, 22, 0, Math.PI * 2), 1.6, 0.85);
    }
  });
}

/** Quầng sáng đóa sen: đốm mềm ở mũi 16 cánh ngoài và lõi. */
export function hongLienBloomGlow() {
  return canvasTexture('hong-lien-bloom-glow', 512, ({ dot }) => {
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; dot(Math.sin(a) * 430, -Math.cos(a) * 430, 40, 0.7); }
    dot(0, 0, 200, 0.5);
  });
}
