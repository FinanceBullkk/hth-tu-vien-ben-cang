import { canvasTexture } from './aura-canvas-kit.js';

// Hoa văn Lưu Ly Vân Thủy (effect 2). Đơn vị px trong khung 1024 (bán kính 512), góc 0 = hướng lên.
// Thủy luân sau lưng là một XOÁY NƯỚC (khác kiếm luân toả tròn đều của Kiếm Vũ): sáu nhánh xoáy
// cong từ tâm 水 ra ngoài, sóng cuộn chen giữa nhánh, dải sóng vảy; vành ngoài là sóng vảy và
// giọt nước — không có chữ. Dưới chân là mặt hồ có lá sen nổi, không có vành chữ hay bát quái.

// --- nét riêng của Lưu Ly, vẽ trong khung đã xoay (điểm (0,-r) là hướng ra ngoài) ---
/** Ngọn sóng cuộn: thân sóng dâng rồi cuộn xoáy vào trong như nét bút lông. */
function waveCurl({ c, stroke }, r, s, width = 1.3, alpha = 0.8) {
  stroke(() => {
    c.moveTo(-70 * s, -r + 14 * s);
    c.bezierCurveTo(-46 * s, -r - 30 * s, 6 * s, -r - 44 * s, 34 * s, -r - 18 * s);
    c.arc(18 * s, -r - 14 * s, 16 * s, -0.25, Math.PI * 1.35, false);
    c.arc(22 * s, -r - 18 * s, 8 * s, Math.PI * 1.35, Math.PI * 2.6, false);
  }, width, alpha);
  stroke(() => { c.moveTo(-58 * s, -r + 18 * s); c.bezierCurveTo(-34 * s, -r - 14 * s, 0, -r - 24 * s, 16 * s, -r - 6 * s); }, width * 0.6, alpha * 0.55);
}
/** Dải sóng vảy: các cung bán nguyệt lồng nhau, mở ra ngoài. */
function scallops({ around, stroke, c }, n, r, rad, alpha = 0.6) {
  around(n, () => { for (let k = 0; k < 3; k++) stroke(() => c.arc(0, -r, rad * (1 - k * 0.3), Math.PI, Math.PI * 2), k ? 0.7 : 1.1, alpha * (1 - k * 0.25)); });
}
/** Giọt nước viền nét, đầu nhọn hướng ra ngoài. */
function droplet({ c, stroke }, r, s, width = 1, alpha = 0.8) {
  stroke(() => {
    c.moveTo(0, -r - s);
    c.bezierCurveTo(s * 0.55, -r - s * 0.2, s * 0.6, -r + s * 0.75, 0, -r + s * 0.75);
    c.bezierCurveTo(-s * 0.6, -r + s * 0.75, -s * 0.55, -r - s * 0.2, 0, -r - s);
  }, width, alpha);
}
/** Lá sen nổi: phiến tròn khuyết một rẻo, gân toả từ cuống, mép gợn. */
function lilyPad({ c, stroke }, r, s, turn, width = 1.2, alpha = 0.75) {
  c.save(); c.translate(0, -r); c.rotate(turn);
  stroke(() => { c.arc(0, 0, 60 * s, 0.35, Math.PI * 2 - 0.05); c.lineTo(0, 0); c.closePath(); }, width, alpha);
  for (let k = 1; k < 8; k++) { const a = 0.35 + k * (Math.PI * 2 - 0.4) / 8; stroke(() => { c.moveTo(0, 0); c.lineTo(Math.cos(a) * 52 * s, Math.sin(a) * 52 * s); }, width * 0.5, alpha * 0.5); }
  c.restore();
}

/** Nhánh xoáy nước: cung xoắn ốc từ r0 ra r1, quay thêm `twist` rad, nét kép mảnh dần ra ngoài. */
function spiralArm({ c, stroke }, r0, r1, twist, width = 1.3, alpha = 0.8) {
  for (const [dr, w, a] of [[0, width, alpha], [16, width * 0.5, alpha * 0.5]]) {
    stroke(() => {
      for (let i = 0; i <= 40; i++) {
        const k = i / 40, r = r0 + (r1 - r0) * k + dr * k, ang = twist * Math.pow(k, 0.8);
        const x = Math.sin(ang) * r, y = -Math.cos(ang) * r;
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
    }, w, a);
  }
}

export function luuLyMandala() {
  return canvasTexture('luu-ly-whirl', 1024, p => {
    const { ring, around, glyph } = p;
    around(6, () => spiralArm(p, 110, 420, 1.9, 1.4, 0.8));
    around(6, () => spiralArm(p, 140, 330, 1.5, 0.8, 0.4), 0.5);
    around(6, () => waveCurl(p, 300, 0.9, 1.2, 0.7), 0.25);
    ring(365, 1.2, 0.7); scallops(p, 36, 392, 22, 0.55); ring(425, 1.1, 0.75);
    ring(92, 1.8); ring(102, 0.8, 0.6);
    around(12, () => droplet(p, 76, 12, 0.9, 0.6));
    glyph('水', 0, 112, 0.95);
  });
}

/** Vành sóng: sóng vảy lớn mở ra ngoài, giọt nước xen kẽ, sóng cuộn nhỏ — quay ngược chiều xoáy. */
export function luuLyRim() {
  return canvasTexture('luu-ly-wave-rim', 1024, p => {
    const { c, stroke, ring, around } = p;
    ring(438, 1); ring(462, 1.8, 0.8);
    scallops(p, 30, 470, 30, 0.7);
    around(12, () => waveCurl(p, 448, 0.55, 1, 0.65), 0.5);
    around(30, () => droplet(p, 505, 9, 0.9, 0.7), 0.5);
    around(60, () => stroke(() => { c.moveTo(0, -440); c.lineTo(0, -448); }, 0.7, 0.5));
  });
}

export function luuLyGlow() {
  return canvasTexture('luu-ly-whirl-glow', 512, ({ dot }) => {
    for (let i = 0; i < 6; i++) for (const k of [0.35, 0.65, 0.95]) {
      const r = 110 + 310 * k, a = i * Math.PI / 3 + 1.9 * Math.pow(k, 0.8);
      dot(Math.sin(a) * r, -Math.cos(a) * r, 18 + 10 * k, 0.8);
    }
    for (let i = 0; i < 30; i++) { const a = (i + 0.5) * Math.PI / 15; dot(Math.sin(a) * 505, -Math.cos(a) * 505, 12, 0.6); }
    dot(0, 0, 70, 0.5);
  });
}

/** Mặt hồ dưới chân (đứng yên): sóng vảy viền ngoài, sóng cuộn, năm lá sen nổi, gợn tròn. */
export function luuLySealOuter() {
  return canvasTexture('luu-ly-pond', 1024, p => {
    const { ring, around } = p;
    ring(500, 0.8, 0.5); scallops(p, 40, 478, 26, 0.55); ring(452, 1.4, 0.8);
    around(12, () => waveCurl(p, 405, 1, 1.3, 0.75), 0.25);
    around(5, i => lilyPad(p, 300, 1 + 0.25 * (i % 2), i * 1.3, 1.3, 0.75), 0.1);
    around(7, i => lilyPad(p, 230, 0.55, i * 2.1, 1, 0.5), 0.6);
    for (const [r, a] of [[350, 0.35], [190, 0.3], [168, 0.6]]) ring(r, 0.8, a);
    around(18, () => droplet(p, 352, 8, 0.9, 0.6), 0.5);
  });
}

/** Thủy liên sáu cánh giọt nước dưới chân, quẻ Khảm ở tâm, quay ngược trận ngoài. */
export function luuLySealInner() {
  return canvasTexture('luu-ly-seal-inner', 512, p => {
    const { c, stroke, ring, around, trigram } = p;
    around(6, () => {
      stroke(() => { c.moveTo(0, -140); c.bezierCurveTo(120, -230, 90, -360, 0, -410); c.bezierCurveTo(-90, -360, -120, -230, 0, -140); }, 2.2, 0.85);
      stroke(() => { c.moveTo(0, -170); c.lineTo(0, -370); }, 1, 0.5);
    });
    around(12, () => droplet(p, 300, 40, 1.4, 0.55), 0.5);
    ring(420, 2.2); ring(440, 1, 0.7); ring(130, 2);
    trigram(0b010, -13, 3, 0.9);
  });
}

// ===== Texture billboard "bay bổng" =====

/** Vân thủy: thân sương mềm + hai ngọn sóng cuộn viền sáng. */
export function luuLyCloud() {
  return canvasTexture('luu-ly-cloud', 256, p => {
    const { c, stroke } = p;
    for (const [x, y, r] of [[-260, 70, 180], [-40, -20, 230], [190, 40, 200], [360, 100, 120]]) {
      const g = c.createRadialGradient(x, y, r * 0.1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.6, 'rgba(255,255,255,0.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#fff';
    c.save(); c.translate(-120, 180); waveCurl(p, 0, 3.2, 6, 0.85); c.restore();
    c.save(); c.translate(170, 160); waveCurl(p, 0, 2.4, 5, 0.75); c.restore();
    stroke(() => { c.moveTo(-460, 200); c.bezierCurveTo(-200, 240, 150, 160, 450, 210); }, 5, 0.6);
  });
}

/** Giọt nước trong: viền sáng, lõi trong, đốm phản quang — đầu nhọn hướng lên. */
export function luuLyDrop() {
  return canvasTexture('luu-ly-drop', 128, ({ c, dot }) => {
    const shape = () => { c.beginPath(); c.moveTo(0, -470); c.bezierCurveTo(260, -120, 300, 330, 0, 330); c.bezierCurveTo(-300, 330, -260, -120, 0, -470); };
    const g = c.createRadialGradient(0, 120, 20, 0, 80, 320);
    g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(0.8, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0.95)');
    c.fillStyle = g; shape(); c.fill();
    c.lineWidth = 34; c.strokeStyle = '#fff'; shape(); c.stroke();
    dot(-90, 40, 110, 1);
  });
}

/** Bọt nước: vòng mảnh + vệt phản quang. */
export function luuLyBubble() {
  return canvasTexture('luu-ly-bubble', 64, ({ c, ring, dot }) => {
    ring(380, 14, 0.9);
    c.lineWidth = 50; c.globalAlpha = 0.8; c.beginPath(); c.arc(0, 0, 300, Math.PI * 1.1, Math.PI * 1.45); c.stroke(); c.globalAlpha = 1;
    dot(0, 0, 360, 0.25);
  });
}

/** Lấp lánh sáu tia như tinh thể băng. */
export function luuLySparkle() {
  return canvasTexture('luu-ly-sparkle', 128, ({ c, dot }) => {
    for (let i = 0; i < 3; i++) {
      c.save(); c.rotate(i * Math.PI / 3);
      const g = c.createLinearGradient(0, -500, 0, 500);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, i ? 18 : 30, i ? 340 : 500, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    dot(0, 0, 170, 1);
  });
}

/** Mảnh lưu ly: hình thoi dài có mặt cắt, gân sáng chéo. */
export function luuLyShard() {
  return canvasTexture('luu-ly-shard', 128, ({ c, stroke }) => {
    const g = c.createLinearGradient(-200, -460, 200, 460);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0.75)');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, -470); c.lineTo(190, -60); c.lineTo(0, 470); c.lineTo(-190, -60); c.closePath(); c.fill();
    stroke(() => { c.moveTo(0, -470); c.lineTo(0, 470); c.moveTo(-190, -60); c.lineTo(190, -60); }, 9, 0.8);
  });
}
