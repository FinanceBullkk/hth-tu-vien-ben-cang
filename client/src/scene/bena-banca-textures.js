// Vải và nét vẽ của Bena Banca vẽ bằng canvas (không tải ảnh ngoài): pyjama satin đen in bánh bao đào
// kèm chữ "HO HO" lặp liền mép để quấn quanh thân, và nét sóng hồng trên má như nét vẽ dán lên ảnh.
import * as THREE from 'three';

const PALETTE = {
  satin: '#16131a',
  peach: '#f7d2bd',
  peachDeep: '#ee9f93',
  print: '#f0b49d',
  blush: '#f08c95',
};

/** Vải pyjama: nền satin đen, bánh bao đào nghiêng ngả và chữ HO HO rải đều; lặp liền mép để quấn quanh thân. */
export function pajamaTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PALETTE.satin;
  ctx.fillRect(0, 0, size, size);
  // Vệt bóng satin chéo, rất nhẹ.
  const sheen = ctx.createLinearGradient(0, 0, size, size);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, size, size);

  const bun = (x, y, r, rot) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    // Thân bánh bao hình giọt đào: đáy tròn, chóp nhọn hơi lệch.
    const fill = ctx.createRadialGradient(-r * 0.3, r * 0.2, r * 0.2, 0, 0, r * 1.2);
    fill.addColorStop(0, PALETTE.peach);
    fill.addColorStop(0.7, PALETTE.peach);
    fill.addColorStop(1, PALETTE.peachDeep);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(r * 0.12, -r * 1.05);
    ctx.bezierCurveTo(r * 1.15, -r * 0.55, r * 1.1, r * 0.95, 0, r * 0.95);
    ctx.bezierCurveTo(-r * 1.1, r * 0.95, -r * 1.05, -r * 0.4, r * 0.12, -r * 1.05);
    ctx.fill();
    // Chóp hồng và nếp gấp.
    ctx.fillStyle = PALETTE.peachDeep;
    ctx.beginPath();
    ctx.ellipse(r * 0.1, -r * 0.82, r * 0.32, r * 0.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(214,120,110,0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(r * 0.05, -r * 0.1, r * 0.55, -2.4, -0.9);
    ctx.stroke();
    ctx.restore();
  };
  const word = (x, y, rot) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = PALETTE.print;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HO HO', 0, 0);
    ctx.restore();
  };
  // Vẽ cả bản sao lệch một khổ để hình tràn mép bên này hiện tiếp ở mép bên kia.
  const prints = [
    [52, 46, 26, -0.4, 'bun'], [178, 64, 30, 0.5, 'bun'], [118, 150, 27, 2.6, 'bun'], [222, 196, 24, -2.2, 'bun'],
    [40, 196, 25, 1.2, 'bun'], [128, 30, 0, -0.25, 'word'], [196, 128, 0, 1.1, 'word'], [60, 116, 0, 0.6, 'word'],
    [140, 228, 0, -0.5, 'word'],
  ];
  for (const [x, y, r, rot, kind] of prints) {
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        if (kind === 'bun') bun(x + dx, y + dy, r, rot);
        else word(x + dx, y + dy, rot);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Hai nét sóng hồng trên má, như nét vẽ dán lên ảnh. */
export function blushTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(32, 16, 2, 32, 16, 24);
  glow.addColorStop(0, 'rgba(244,150,160,0.55)');
  glow.addColorStop(1, 'rgba(244,150,160,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 32);
  ctx.strokeStyle = PALETTE.blush;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const x = 12 + i * 1.7;
    const y = 16 + Math.sin((i / 24) * Math.PI * 2) * 5;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
