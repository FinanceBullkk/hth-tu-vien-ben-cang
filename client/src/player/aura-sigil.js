import * as THREE from 'three';

const cache = new Map();
const inscriptions = ['清心蓮華自在', '上善若水太極', '北斗七星天罡', '離火焚心赤霄', '落英飛花無痕', '御劍乘風歸元', '明月清風無塵', '玄冥九幽無極'];

// Original linework, shared by all avatars; no downloaded game artwork.
export function auraSigil(effect) {
  if (cache.has(effect)) return cache.get(effect);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.translate(256, 256);
  ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1.4;
  const circle = r => { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); };
  // Each school owns a silhouette; only the Taoist seal uses an enclosing frame.
  if (effect === 2) {
    for (const r of [224, 211]) {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = i * Math.PI / 4 + Math.PI / 8;
        if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.stroke();
    }
  }
  ctx.font = '22px "KaiTi", "STKaiti", "SimSun", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < (effect === 2 ? 8 : 0); i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 4);
    ctx.fillText(inscriptions[effect - 1][i % 6], 0, -201);
    // Eight trigrams: solid/broken strokes, kept outside the focal motif.
    for (let j = 0; j < 3; j++) {
      const y = -164 + j * 6;
      if (i & (1 << j)) ctx.fillRect(-12, y, 24, 2);
      else { ctx.fillRect(-12, y, 9, 2); ctx.fillRect(3, y, 9, 2); }
    }
    ctx.restore();
  }
  ctx.lineWidth = 3;
  if (effect !== 2) ctx.scale(1.5, 1.5);
  if (effect === 1) {
    // Liên hoa đài thánh: ba tầng cánh sen xoáy lệch, vòng sao viền, tim hoa — nhiều lớp nét mảnh.
    circle(158); circle(151);
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 24; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 12);
      ctx.beginPath(); ctx.moveTo(0, -143); ctx.lineTo(0, -150); ctx.stroke();
      ctx.restore();
    }
    ctx.lineWidth = 2;
    const petalRing = (n, rot, r0, r1, w, inner) => {
      for (let i = 0; i < n; i++) {
        ctx.save(); ctx.rotate(i * Math.PI * 2 / n + rot);
        ctx.beginPath(); ctx.moveTo(0, -r0);
        ctx.bezierCurveTo(-w, -(r0 + (r1 - r0) * .35), -w * .8, -(r1 - (r1 - r0) * .25), 0, -r1);
        ctx.bezierCurveTo(w * .8, -(r1 - (r1 - r0) * .25), w, -(r0 + (r1 - r0) * .35), 0, -r0);
        ctx.stroke();
        if (inner) { ctx.beginPath(); ctx.moveTo(0, -r0 - 6);
          ctx.bezierCurveTo(-w * .45, -(r0 + (r1 - r0) * .38), -w * .4, -(r1 - (r1 - r0) * .32), 0, -r1 + 10); ctx.stroke(); }
        ctx.restore();
      }
    };
    petalRing(8, 0, 24, 118, 38, true);
    petalRing(8, Math.PI / 8, 21, 96, 31, true);
    petalRing(8, Math.PI / 8, 17, 66, 23, false);
    // Vòng se hydro: cung nối đầu cánh tầng ngoài, hạt tròn ở mỗi giao.
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 8; i++) {
      const a1 = i * Math.PI / 4 + Math.PI / 8, a2 = (i + 1) * Math.PI / 4 + Math.PI / 8;
      ctx.beginPath();
      ctx.arc(Math.cos((a1 + a2) / 2) * 138 / Math.cos(Math.PI / 8), Math.sin((a1 + a2) / 2) * 138 / Math.cos(Math.PI / 8),
        118, a1 + Math.PI / 2 + Math.PI / 8 + Math.PI, a2 + Math.PI / 2 + Math.PI / 8 + Math.PI);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 118, Math.sin(a) * 118, 3.4, 0, Math.PI * 2); ctx.fill();
    }
    // Lục lăng sao kép trong tim trận.
    ctx.lineWidth = 1.4;
    for (const rot of [0, Math.PI / 6]) {
      ctx.save(); ctx.rotate(rot); ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = i * Math.PI / 3;
        if (i) ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40);
        else ctx.moveTo(Math.cos(a) * 40, Math.sin(a) * 40);
      }
      ctx.stroke(); ctx.restore();
    }
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 8; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 4 + Math.PI / 8);
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, -26); ctx.stroke();
      ctx.restore();
    }
    ctx.lineWidth = 1.2; circle(28); circle(9);
  } else if (effect === 4 || effect === 5) {
    const n = effect === 4 ? 7 : 5;
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.rotate(i * Math.PI * 2 / n);
      ctx.beginPath(); ctx.moveTo(0, -20);
      ctx.bezierCurveTo(-70, -55, -28, -120, 0, -142);
      ctx.bezierCurveTo(28, -120, 70, -55, 0, -20); ctx.stroke();
      ctx.restore();
    }
  } else if (effect === 2) {
    circle(125); ctx.beginPath(); ctx.arc(0, -62.5, 62.5, -Math.PI / 2, Math.PI / 2);
    ctx.arc(0, 62.5, 62.5, -Math.PI / 2, Math.PI / 2, true); ctx.stroke();
    for (const y of [-62.5, 62.5]) { ctx.beginPath(); ctx.arc(0, y, 9, 0, Math.PI * 2); ctx.stroke(); }
  } else if (effect === 3) {
    const stars = [[-100, -70], [-40, -95], [15, -65], [0, -10], [55, 15], [85, 75], [110, 105]];
    ctx.beginPath(); stars.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    for (const [x, y] of stars) { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke(); }
  } else if (effect === 4) {
    for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(side * 12, 65 - i * 10);
      ctx.bezierCurveTo(side * 35, -45, side * (85 + i * 12), 40 - i * 25, side * (95 + i * 10), -110 + i * 28);
      ctx.bezierCurveTo(side * 75, 20, side * 35, 80, 0, 105); ctx.stroke();
    }
  } else if (effect === 6) {
    for (let i = 0; i < 7; i++) {
      ctx.save(); ctx.rotate(i * Math.PI * 2 / 7); ctx.beginPath();
      ctx.moveTo(0, -30); ctx.lineTo(-5, -112); ctx.lineTo(0, -142);
      ctx.lineTo(5, -112); ctx.closePath(); ctx.stroke();
      ctx.fillRect(-14, -55, 28, 2); ctx.restore();
    }
  } else if (effect === 7) {
    ctx.beginPath(); ctx.arc(0, 0, 130, Math.PI * 0.5, Math.PI * 1.5);
    ctx.bezierCurveTo(20, -60, 20, 60, 0, 130); ctx.stroke();
  } else {
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 6); ctx.strokeRect(-90, -90, 180, 180); ctx.restore();
    }
    for (let i = 0; i < 6; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(15, -25); ctx.lineTo(-12, -65);
      ctx.lineTo(20, -85); ctx.lineTo(0, -145); ctx.stroke(); ctx.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(effect, texture);
  return texture;
}

// Original silhouettes: broad luminous washes under fine engraved highlights.
export function auraEmblem(effect) {
  const key = `emblem-${effect}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const c = canvas.getContext('2d'); c.translate(512, 512);
  c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineCap = 'round';
  const stroke = (draw, width = 2) => {
    c.beginPath(); draw();
    c.save(); c.globalAlpha = 0.2; c.lineWidth = width * 6;
    c.shadowColor = '#fff'; c.shadowBlur = 12; c.stroke(); c.restore();
    c.lineWidth = width * 1.8; c.stroke();
  };
  const arc = (r, start = 0, end = Math.PI * 2) => stroke(() => c.arc(0, 0, r, start, end));
  if (effect === 1) {
    // Mandala nội tâm (lớp dưới, quay chậm): đóa sen 8 cánh hero + tầng phụ mảnh đan xen
    // + energy core 禅. Vành formation ngoài tách riêng ở auraEmblemRim để hai vòng quay
    // khác tốc độ — mandala đọc là bánh xe chuyển động chứ không phải hình in một tấm.
    const petal = (rot, r0, r1, w, tier) => {
      c.save(); c.rotate(rot);
      c.globalAlpha = tier === 0 ? .92 : tier === 1 ? .3 : .95;
      const draw = () => { c.moveTo(0, -r0);
        c.bezierCurveTo(-w, -(r0 + (r1 - r0) * .3), -w * .92, -(r1 - (r1 - r0) * .22), 0, -r1);
        c.bezierCurveTo(w * .92, -(r1 - (r1 - r0) * .22), w, -(r0 + (r1 - r0) * .3), 0, -r0); };
      stroke(draw, tier === 0 ? 1.9 : tier === 1 ? .72 : 1.2);
      if (tier === 0) {
        c.globalAlpha = .55;
        stroke(() => { c.moveTo(0, -r0 - 10);
          c.bezierCurveTo(-w * .5, -(r0 + (r1 - r0) * .34), -w * .45, -(r1 - (r1 - r0) * .3), 0, -r1 + 12); }, .72);
      }
      c.restore();
    };
    // Hero motif: đóa sen 8 cánh nét đậm kép + gân trong — họa tiết chủ đạo dễ nhận.
    const hero = (rot, r0, r1, w) => {
      c.save(); c.rotate(rot); c.globalAlpha = .95;
      stroke(() => { c.moveTo(0, -r0);
        c.bezierCurveTo(-w, -(r0 + (r1 - r0) * .28), -w, -(r1 - (r1 - r0) * .3), 0, -r1);
        c.bezierCurveTo(w, -(r1 - (r1 - r0) * .3), w, -(r0 + (r1 - r0) * .28), 0, -r0); }, 2.6);
      c.globalAlpha = .5;
      stroke(() => { c.moveTo(0, -r0 - 8);
        c.bezierCurveTo(-w * .32, -(r0 + (r1 - r0) * .4), -w * .26, -(r1 - (r1 - r0) * .35), 0, -r1 + 10); }, 1);
      stroke(() => { c.moveTo(0, -r0 - 8);
        c.bezierCurveTo(w * .32, -(r0 + (r1 - r0) * .4), w * .26, -(r1 - (r1 - r0) * .35), 0, -r1 + 10); }, 1);
      c.restore();
    };
    for (let i = 0; i < 8; i++) hero(i * Math.PI / 4 + Math.PI / 8, 108, 240, 58);
    // Inner geometry: 16 cánh nhỏ + vòng mảnh — nền phụ mờ, không tranh chú với hero.
    for (let i = 0; i < 16; i++) petal(i * Math.PI / 8 + Math.PI / 16, 128, 252, 54, 1);
    stroke(() => c.arc(0, 0, 246, 0, Math.PI * 2), 1.1);
    c.globalAlpha = .24;
    stroke(() => c.arc(0, 0, 118, 0, Math.PI * 2), 1.1);
    // Đan xen tầng phụ: hai lục lăng lớn xoay 30° + vảy cung nối giữa các cánh hero.
    // V10: hạ mạnh nét dài cắt ngang — hết "nét vàng giao nhau không chủ đích".
    c.globalAlpha = .1;
    for (const rot of [0, Math.PI / 6]) {
      c.save(); c.rotate(rot); c.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = i * Math.PI / 3;
        if (i) c.lineTo(Math.cos(a) * 292, Math.sin(a) * 292);
        else c.moveTo(Math.cos(a) * 292, Math.sin(a) * 292);
      }
      c.stroke(); c.restore();
    }
    c.globalAlpha = .15;
    for (let i = 0; i < 8; i++) {
      c.save(); c.rotate(i * Math.PI / 4 + Math.PI / 8);
      stroke(() => c.arc(0, -218, 74, Math.PI * .18, Math.PI * .82), 1);
      c.restore();
    }
    c.globalAlpha = 1;
    // Energy core: chữ 禅 + 8 tia ngắn — focal point duy nhất của mandala, pulse ở shader.
    stroke(() => c.arc(0, 0, 92, 0, Math.PI * 2), 2);
    c.lineWidth = 1.8;
    c.globalAlpha = .65;
    for (let i = 0; i < 8; i++) {
      c.save(); c.rotate(i * Math.PI / 4);
      stroke(() => { c.moveTo(0, -34); c.lineTo(0, -72); }, 1.8);
      c.restore();
    }
    c.globalAlpha = 1;
    c.font = '118px "KaiTi", "STKaiti", "SimSun", serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.save(); c.globalAlpha = .95; c.fillText('禅', 0, 6); c.restore();
  } else if (effect === 4) {
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1);
      for (let i = 0; i < 15; i++) {
        stroke(() => { c.moveTo(0, 65); c.bezierCurveTo(110, 10 - i * 5, 180 + i * 13, -80 - i * 17, 390 - i * 9, -265 + i * 28);
          c.bezierCurveTo(220, 80, 115, 115, 0, 65); }, 2.5);
      }
      for (let i = 0; i < 5; i++) stroke(() => { c.moveTo(0, 70); c.bezierCurveTo(45 + i * 25, 180, -65, 220 + i * 24, 60 + i * 22, 365); }, 3);
      c.restore();
    }
    stroke(() => { c.moveTo(0, 95); c.bezierCurveTo(-35, 0, 45, -80, 0, -120); c.lineTo(-22, -95); }, 5);
  } else if (effect === 5) {
    for (const side of [-1, 1]) {
      c.save(); c.scale(side, 1);
      stroke(() => { c.moveTo(0, 320); c.bezierCurveTo(275, 220, 120, -30, 310, -300); }, 5);
      for (let i = 0; i < 9; i++) {
        const x = 130 + Math.sin(i * 1.7) * 75, y = 230 - i * 61;
        stroke(() => { c.moveTo(160, y + 55); c.quadraticCurveTo(x, y, x + 55, y - 20); });
        c.save(); c.translate(x + 55, y - 20);
        for (let j = 0; j < 5; j++) { c.rotate(Math.PI * 2 / 5); stroke(() => c.ellipse(0, -12, 7, 14, 0, 0, Math.PI * 2), 1.5); }
        c.restore();
      }
      c.restore();
    }
  } else if (effect === 7) {
    stroke(() => { c.arc(0, 0, 355, Math.PI * 0.36, Math.PI * 1.64); c.bezierCurveTo(-200, -200, -200, 200, 151, 321); }, 8);
    arc(385, Math.PI * 0.5, Math.PI * 1.5);
    for (let i = 0; i < 7; i++) stroke(() => { const y = 120 + i * 23; c.moveTo(-210 + i * 20, y); c.bezierCurveTo(-60, y - 70, 130, y + 70, 310 - i * 22, y); });
  } else {
    if (effect === 2) {
      for (const r of [255, 320]) stroke(() => {
        for (let i = 0; i <= 8; i++) {
          const a = i * Math.PI / 4 + Math.PI / 8;
          if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
      }, 3);
    }
    const n = effect === 3 ? 7 : effect === 6 ? 24 : 12;
    for (let i = 0; i < (effect === 3 || effect === 6 ? 0 : n); i++) {
      c.save(); c.rotate(i * Math.PI * 2 / n);
      if (effect === 8) stroke(() => { c.moveTo(0, -265); c.bezierCurveTo(120, -280, 80, -370, 10, -410); }, 5);
      else stroke(() => { c.moveTo(0, -275); c.lineTo(-8, -310); c.lineTo(0, -390); c.lineTo(8, -310); c.closePath(); }, 2);
      c.restore();
    }
    if (effect === 2) {
      stroke(() => { c.arc(0, -110, 110, -Math.PI / 2, Math.PI / 2); c.arc(0, 110, 110, -Math.PI / 2, Math.PI / 2, true); }, 7);
      for (const y of [-110, 110]) stroke(() => c.arc(0, y, 16, 0, Math.PI * 2), 6);
    }
    if (effect === 3) {
      const stars = [[-280,-170],[-120,-260],[45,-175],[0,-20],[150,65],[205,230],[310,290]];
      stroke(() => stars.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)), 3);
      for (const [x,y] of stars) stroke(() => {
        c.moveTo(x,y-17); c.lineTo(x+10,y); c.lineTo(x,y+17); c.lineTo(x-10,y); c.closePath();
      }, 4);
    }
    if (effect === 8) { arc(205); arc(210); }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture); return texture;
}

// Vành formation ngoài của mandala Sen Kim: 12 cánh lớn silhouette + vòng đậm + dải
// phù văn viền (hai vành mảnh, 24 móng cung, 12 trân châu). Tách khỏi auraEmblem để
// quay ngược chiều với lớp nội tâm — hai vòng phù văn chuyển động khác tốc độ.
export function auraEmblemRim(effect) {
  const key = `emblem-rim-${effect}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const c = canvas.getContext('2d'); c.translate(512, 512);
  c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineCap = 'round';
  const stroke = (draw, width = 2) => {
    c.beginPath(); draw();
    c.save(); c.globalAlpha = 0.2; c.lineWidth = width * 6;
    c.shadowColor = '#fff'; c.shadowBlur = 12; c.stroke(); c.restore();
    c.lineWidth = width * 1.8; c.stroke();
  };
  if (effect === 1) {
    const petal = (rot, r0, r1, w) => {
      c.save(); c.rotate(rot); c.globalAlpha = .92;
      stroke(() => { c.moveTo(0, -r0);
        c.bezierCurveTo(-w, -(r0 + (r1 - r0) * .3), -w * .92, -(r1 - (r1 - r0) * .22), 0, -r1);
        c.bezierCurveTo(w * .92, -(r1 - (r1 - r0) * .22), w, -(r0 + (r1 - r0) * .3), 0, -r0); }, 1.9);
      c.globalAlpha = .55;
      stroke(() => { c.moveTo(0, -r0 - 10);
        c.bezierCurveTo(-w * .5, -(r0 + (r1 - r0) * .34), -w * .45, -(r1 - (r1 - r0) * .3), 0, -r1 + 12); }, .72);
      c.restore();
    };
    // Outer formation: 12 cánh lớn nét đậm — silhouette chính.
    for (let i = 0; i < 12; i++) petal(i * Math.PI / 6, 205, 448, 96);
    stroke(() => c.arc(0, 0, 456, 0, Math.PI * 2), 2.6);
    // Phù văn viền ngoài: dải hai vành mảnh + 24 móng cung lặp đều + 12 trân châu khớp vành.
    c.globalAlpha = .8;
    stroke(() => c.arc(0, 0, 474, 0, Math.PI * 2), 1);
    stroke(() => c.arc(0, 0, 438, 0, Math.PI * 2), 1);
    c.globalAlpha = .75;
    for (let i = 0; i < 24; i++) {
      c.save(); c.rotate(i * Math.PI / 12);
      stroke(() => c.arc(0, -456, 11, Math.PI * .18, Math.PI * .82), 1.1);
      c.restore();
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + Math.PI / 12;
      stroke(() => c.arc(Math.cos(a) * 456, Math.sin(a) * 456, 8, 0, Math.PI * 2), 1.8);
    }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture); return texture;
}

// Đốm sáng ở các giao điểm quan trọng của mandala — lớp phủ additive nhấp theo nhịp
// (opacity do aura-signature điều khiển), không phải hạt particle mới.
export function auraEmblemGlow(effect) {
  const key = `emblem-glow-${effect}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const c = canvas.getContext('2d'); c.translate(512, 512);
  const dot = (x, y, r, a) => {
    const g = c.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, `rgba(255,246,218,${a})`);
    g.addColorStop(.45, `rgba(255,226,140,${a * .5})`);
    g.addColorStop(1, 'rgba(255,226,140,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  };
  if (effect === 1) {
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; dot(Math.sin(a) * 240, -Math.cos(a) * 240, 27, .9); }
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + Math.PI / 12; dot(Math.cos(a) * 456, Math.sin(a) * 456, 17, .75); }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture); return texture;
}
