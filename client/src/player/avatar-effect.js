// Hào quang võ hiệp quanh nhân vật — nghiên cứu từ VFX các game võ lâm/tiên hiệp:
// đài sen nhiều lớp, vòng rune chữ triện xoay ngược, long khí quấn thân, sáo lụa chảy UV.
// Toàn bộ texture vẽ bằng canvas nên không cần asset ngoài.
// 1 Sen kim — Kim đài liên hoa, pháp trận kép, chân ngôn 禪, cánh sen dâng kèm hoa rơi;
// 2 Lưu ly — long khí bơi quanh người, gợn nước loang từ chân, đá lưu ly lấp lánh, chân ngôn 水;
// 3 Tinh hà — dải ngân hà nghiêng, ba vòng hào quang, sao chổi quanh vành, chân ngôn 星;
// 4 Hỏa diễm — hỏa liên cháy dưới chân, trụ hỏa dâng, tàn lửa bay ngược lên trời, chân ngôn 炎;
// 5 Đào hoa — mưa cánh đào hồng rơi li ti, trận đào, trụ hoa, sương hồng, chân ngôn 桃;
// 6 Bích ngọc — lá ngọc rơi xoay, trúc khí mọc quanh chân, viên ngọc lục bay vòng vai, chân ngôn 竹;
// 7 Nguyệt bạch — trăng lưỡi liềm bạc treo sau vai, dải sao bạc nghiêng, bụi trăng rơi, chân ngôn 月;
// 8 Hắc ám — hắc viêm lửa đen lõi tím vờn quanh người, vũng âm khí nuốt sáng, trận lục lăng, quỷ hỏa, chân ngôn 魔;
// 9 Long quyền — song long lửa quấn thân ngược chiều, vương miện lửa trên đầu, hỏa quyền bùng
// kèm lõi trắng, chấn địa kiểu Tempest: sóng xung kích cam vàng dội từ chân kèm chỏm lửa bùng
// theo rìa sóng, chân ngôn 龍.
import * as THREE from 'three';
import { createRibbonAura } from './vfx/ribbon-aura.js';
import { createAuraSignature } from './aura-signature.js';
import { store } from '../ui/dom.js';

// ---- texture vẽ tay bằng canvas, cache theo tên dùng chung mọi avatar ----
const texCache = new Map();
function canvasTex(name, w, h, draw) {
  if (texCache.has(name)) return texCache.get(name);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(name, tex);
  return tex;
}

// đốm sáng mềm nhiều lớp: lõi trắng, quầng loang

// Mềm hoá mép trận pháp: nét đừng đọc thành sticker cứng — guideline "mép tan" của hướng A.
function softEdge(ctx, r, inner = .72, keep = .45) {
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createRadialGradient(0, 0, r * inner, 0, 0, r);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, `rgba(0,0,0,${keep})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function glowTexture() {
  return canvasTex('glow', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}

function petalTexture() {
  return canvasTex('petal', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 26, 2, 32, 30, 28);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 60); // đế cánh nhọn
    ctx.bezierCurveTo(14, 44, 12, 16, 32, 4);
    ctx.bezierCurveTo(52, 16, 50, 44, 32, 60);
    ctx.fill();
  });
}

// Phù văn: một chữ Hán phát sáng để làm chữ bay lên từ trận pháp.
function glyphTexture(name, char) {
  return canvasTex(name, 64, 64, (ctx) => {
    ctx.font = '50px "Microsoft YaHei", "SimSun", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(char, 32, 34);
  });
}

// Kiếm khí: hình kiếm cách điệu (lưỡi, chắn tay, chuôi) để bay vòng quanh người.
function swordTexture() {
  return canvasTex('sword', 128, 48, (ctx, w, h) => {
    const g = ctx.createRadialGradient(56, 24, 2, 56, 24, 44);
    g.addColorStop(0, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); // lưỡi kiếm
    ctx.moveTo(6, 24);
    ctx.lineTo(92, 15);
    ctx.lineTo(104, 24);
    ctx.lineTo(92, 33);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(104, 12, 6, 24); // chắn tay
    ctx.fillRect(110, 21, 14, 6); // chuôi
  });
}

// Kim đài sen: 12 cánh ngoài + 12 cánh trong so le + tâm đài, nhìn từ trên như đài Phật.
function lotusTexture() {
  return canvasTex('lotus', 512, 512, (ctx) => {
    ctx.translate(256, 256);
    const petal = (len, spread, alpha) => {
      const g = ctx.createRadialGradient(0, -len * 0.55, 4, 0, -len * 0.55, len);
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(0.7, `rgba(255,255,255,${alpha * 0.55})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.2);
      ctx.bezierCurveTo(-spread, -len * 0.35, -spread * 0.9, -len * 0.95, 0, -len);
      ctx.bezierCurveTo(spread * 0.9, -len * 0.95, spread, -len * 0.35, 0, -len * 0.2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.9})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    for (let k = 0; k < 12; k++) {
      ctx.save();
      ctx.rotate((k / 12) * Math.PI * 2 + Math.PI / 12);
      petal(150, 40, 0.65);
      ctx.restore();
    }
    for (let k = 0; k < 12; k++) {
      ctx.save();
      ctx.rotate((k / 12) * Math.PI * 2);
      petal(225, 56, 0.95);
      ctx.restore();
    }
    const core = ctx.createRadialGradient(0, 0, 2, 0, 0, 60);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(0.6, 'rgba(255,255,255,0.5)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(0, 0, 66, 0, Math.PI * 2); ctx.stroke();
  });
}

// Vòng chân ngôn chữ triện: hai vòng tròn kèm chữ Hán chạy quanh và 12 vạch nối.
function runeRingTexture(name, chars) {
  return canvasTex(name, 512, 512, (ctx) => {
    ctx.translate(256, 256);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 236, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 194, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '56px "Microsoft YaHei", "SimSun", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let k = 0; k < 12; k++) {
      ctx.save();
      ctx.rotate((k / 12) * Math.PI * 2);
      ctx.translate(0, -216);
      ctx.fillText(chars[k % chars.length], 0, 0);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + Math.PI / 12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 196, Math.sin(a) * 196);
      ctx.lineTo(Math.cos(a) * 234, Math.sin(a) * 234);
      ctx.stroke();
    }
  });
}

// Pháp trận sen kép cho Sen kim: hai vòng, 8 cánh sen có gân, 4 cánh con và vạch khắc.
function mandalaTexture() {
  return canvasTex('mandala', 256, 256, (ctx) => {
    ctx.translate(128, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 99, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 8; k++) {
      ctx.save();
      ctx.rotate((k / 8) * Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(0, -74, 24, 38, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, -74, 11, 25, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, -105); ctx.stroke();
      ctx.restore();
    }
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.rotate((k / 4) * Math.PI * 2 + Math.PI / 4);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, -34, 12, 20, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 86, Math.sin(a) * 86);
      ctx.lineTo(Math.cos(a) * 94, Math.sin(a) * 94);
      ctx.stroke();
    }
    softEdge(ctx, 116);
  });
}

// Dải khí lụa: quầng rộng kèm ba lớp lõi giữa sáng dần, độn ngang cho mềm.
function wispTexture() {
  return canvasTex('wisp', 64, 128, (ctx, w, h) => {
    const core = (x0, x1, a0, a1) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.25, `rgba(255,255,255,${a0})`);
      g.addColorStop(0.75, `rgba(255,255,255,${a1})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(w * x0, 0, w * (x1 - x0), h);
    };
    core(0.2, 0.8, 0.5, 0.4);
    core(0.3, 0.7, 0.8, 0.65);
    core(0.4, 0.6, 1, 0.9);
    ctx.globalCompositeOperation = 'destination-in';
    const m = ctx.createLinearGradient(0, 0, w, 0);
    m.addColorStop(0, 'rgba(0,0,0,0)');
    m.addColorStop(0.5, 'rgba(0,0,0,1)');
    m.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = m;
    ctx.fillRect(0, 0, w, h);
  });
}

// Đá lưu ly: múi kim có mặt cắt, viền sáng để lấp lánh khi xoay.
function crystalTexture() {
  return canvasTex('crystal', 64, 64, (ctx) => {
    ctx.translate(32, 32);
    const g = ctx.createLinearGradient(0, -26, 0, 26);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -27);
    ctx.lineTo(15, 0);
    ctx.lineTo(0, 27);
    ctx.lineTo(-15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -27);
    ctx.lineTo(0, 27);
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();
  });
}

// Ngọn lửa: thân lửa mềm chóp nhọn + lõi sáng, dùng cho tàn lửa và quỷ hỏa của Hỏa diễm.
function flameTexture() {
  return canvasTex('flame', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 38, 2, 32, 38, 26);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 2); // chóp lửa
    ctx.bezierCurveTo(48, 22, 52, 40, 32, 60);
    ctx.bezierCurveTo(12, 40, 16, 22, 32, 2);
    ctx.fill();
    const core = ctx.createRadialGradient(32, 44, 1, 32, 44, 12);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(32, 44, 12, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Lá ngọc: lá pointed có gân giữa và gân phụ, cho lá bồ đề của Bích ngọc.
function leafTexture() {
  return canvasTex('leaf', 64, 64, (ctx) => {
    const g = ctx.createLinearGradient(0, 8, 0, 58);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0.4)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 4);
    ctx.bezierCurveTo(52, 20, 50, 44, 32, 60);
    ctx.bezierCurveTo(14, 44, 12, 20, 32, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(32, 6);
    ctx.lineTo(32, 58); // gân giữa
    ctx.stroke();
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      const y = 16 + k * 10;
      ctx.beginPath();
      ctx.moveTo(32, y);
      ctx.lineTo(20, y + 8);
      ctx.moveTo(32, y);
      ctx.lineTo(44, y + 8);
      ctx.stroke();
    }
  });
}

// Trăng lưỡi liềm: khoét đĩa trăng rồi vẽ quầng mềm phía sau (destination-over).
function moonTexture() {
  return canvasTex('moon', 128, 128, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.beginPath();
    ctx.arc(64, 64, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(82, 54, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-over';
    const halo = ctx.createRadialGradient(64, 64, 20, 64, 64, 62);
    halo.addColorStop(0, 'rgba(255,255,255,0.55)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  });
}

// Trận lục lăng hắc ám: hai tam giác chồng nhau trong đôi vòng tròn, kèm vạch khắc quanh vành.
function hexTexture() {
  return canvasTex('hex', 256, 256, (ctx) => {
    ctx.translate(128, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 112, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 96, 0, Math.PI * 2); ctx.stroke();
    const tri = (off) => {
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = off + (k / 3) * Math.PI * 2;
        const x = Math.cos(a) * 86;
        const y = Math.sin(a) * 86;
        if (k) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    tri(-Math.PI / 2);
    tri(Math.PI / 2);
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + Math.PI / 12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 98, Math.sin(a) * 98);
      ctx.lineTo(Math.cos(a) * 110, Math.sin(a) * 110);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
    softEdge(ctx, 118);
  });
}

// Rồng khí "Hộ Thể" — quấn xoắn ốc chậm rãi quanh người, thân 2 lớp dải (vảy cuộn UV + lõi sáng)
// và long vĩ quạt ở đuôi. Sức nặng nằm ở dáng lượn rõ ràng, không chất đống hiệu ứng cho khỏi rối.
// Đầu rồng BẰNG KHÍ: không khối cứng — chỉ các lớp sáng mềm đổ thành hình sọ/mõm,
// sừng và râu là tia khí mỏng, bờm là dải khóe. Cùng ngôn ngữ mềm mờ với toàn bộ aura.
function buildDragonHead(colors) {
  const group = new THREE.Group();
  const mats = [];
  const softSprite = (color, opacity, map) => {
    const m = new THREE.SpriteMaterial({
      map: map ?? glowTexture(), color, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity,
    });
    mats.push([m, opacity]);
    const sp = new THREE.Sprite(m);
    group.add(sp);
    return sp;
  };
  // sọ: 3 lớp sáng ôm nhau — quầng rộng, lõi ngọc, điểm rực
  const skullHalo = softSprite(colors[1] ?? colors[0], 0.3);
  skullHalo.position.set(0, 0.01, 0);
  skullHalo.scale.setScalar(0.3);
  const skullCore = softSprite(colors[0], 0.45);
  skullCore.position.set(0, 0.01, -0.01);
  skullCore.scale.setScalar(0.17);
  const skullHot = softSprite(0xffffff, 0.55);
  skullHot.position.set(0, 0.015, -0.02);
  skullHot.scale.setScalar(0.09);
  // trán và mõm: hai vệt sáng kéo dài về phía trước (-Z) gợi xương mũi đầu rồng
  const brow = softSprite(colors[0], 0.4);
  brow.position.set(0, 0.035, -0.06);
  brow.scale.set(0.11, 0.07, 1);
  const snout = softSprite(colors[0], 0.4);
  snout.position.set(0, -0.005, -0.15);
  snout.scale.set(0.09, 0.05, 1);
  const jaw = softSprite(colors[1] ?? colors[0], 0.3);
  jaw.position.set(0, -0.035, -0.06);
  jaw.scale.set(0.08, 0.05, 1);
  // 2 mắt sáng nhỏ
  const eyeR = softSprite(0xfff6d8, 0.8);
  eyeR.position.set(0.05, 0.028, -0.055);
  eyeR.scale.setScalar(0.03);
  const eyeL = softSprite(0xfff6d8, 0.8);
  eyeL.position.set(-0.05, 0.028, -0.055);
  eyeL.scale.setScalar(0.03);
  // sừng: 2 tia khí cong mảnh vút về sau
  const hornMat = new THREE.MeshBasicMaterial({
    color: colors[0], transparent: true, opacity: 0.55, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  mats.push([hornMat, 0.55]);
  for (const s of [1, -1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.03 * s, 0.055, 0.02),
      new THREE.Vector3(0.055 * s, 0.11, 0.05),
      new THREE.Vector3(0.06 * s, 0.15, 0.11),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.006, 4), hornMat));
  }
  // bờm: 6 dải khóe mềm xòe sau gáy (plane dẹt phủ texture khói)
  const maneMat = new THREE.MeshBasicMaterial({
    map: wispTexture(), color: colors[0], transparent: true, opacity: 0.4, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  mats.push([maneMat, 0.4]);
  for (let i = 0; i < 6; i++) {
    const a = -0.95 + (i / 5) * 1.9;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.17), maneMat);
    plane.position.set(0, 0.03, 0.05);
    plane.rotation.set(-1.25, 0, a);
    group.add(plane);
  }
  // 2 râu dài tơ khí
  for (const s of [1, -1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.035 * s, -0.012, -0.14),
      new THREE.Vector3(0.11 * s, -0.03, -0.22),
      new THREE.Vector3(0.17 * s, 0.002, -0.19),
      new THREE.Vector3(0.2 * s, -0.032, -0.11),
    ]);
    const whisker = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.0045, 4), hornMat);
    group.add(whisker);
  }
  return { group, mats };
}

// vảy rồng: các hàng cung sáng xếp so le, cuộn UV thành da rồng chảy
function scaleTexture() {
  return canvasTex('scales', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, 0, w, h);
    const s = 16;
    for (let row = 0; row < h / s; row++) {
      for (let col = 0; col < w / s + 1; col++) {
        const x = col * s - (row % 2 ? s / 2 : 0);
        const y = row * s;
        ctx.beginPath();
        ctx.arc(x + s / 2, y, s * 0.62, 0, Math.PI);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, y, 0, y + s * 0.62);
        g.addColorStop(0, 'rgba(255,255,255,0.9)');
        g.addColorStop(0.45, 'rgba(255,255,255,0.28)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fill();
      }
    }
  });
}

function createDragon(colors, lowQuality) {
  const ST = lowQuality ? 16 : 28; // khoang ribbon theo sau đầu
  const group = new THREE.Group();
  const cc2 = new THREE.Color();

  // đầu rồng cứng dẫn đường, to hơn đầu người
  const head = buildDragonHead(colors);
  head.group.scale.setScalar(1.55);
  group.add(head.group);

  // 3 lớp dải thân: vảy cuộn UV / lõi sáng / quầng khí bao ngoài
  const mkBand = (withTex) => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(ST * 2 * 3);
    const uv = new Float32Array(ST * 2 * 2);
    const col = new Float32Array(ST * 2 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    for (let k = 0; k < ST; k++) {
      const u = (k / (ST - 1)) * (withTex ? 3.5 : 2);
      uv[k * 4] = u;
      uv[k * 4 + 1] = 0;
      uv[k * 4 + 2] = u;
      uv[k * 4 + 3] = 1;
      const b = 0.15 + 0.85 * Math.pow(1 - k / ST, 0.5);
      cc2.set(k < 2 ? colors[0] : colors[1] ?? colors[0]).multiplyScalar(b);
      col[k * 6] = cc2.r;
      col[k * 6 + 1] = cc2.g;
      col[k * 6 + 2] = cc2.b;
      col[k * 6 + 3] = cc2.r;
      col[k * 6 + 4] = cc2.g;
      col[k * 6 + 5] = cc2.b;
    }
    const idx = [];
    for (let k = 0; k < ST - 1; k++) {
      const a = k * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    const m = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      ...(withTex ? { map: scaleTexture() } : { color: colors[0] }),
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.frustumCulled = false;
    group.add(mesh);
    return { geo, mat: m };
  };
  const band = mkBand(true);
  const core = mkBand(false);
  band.mat.map.wrapS = THREE.RepeatWrapping;
  band.mat.map.wrapT = THREE.RepeatWrapping;
  const bands = [
    { geo: band.geo, wMul: 1, tw: 0 },
    { geo: core.geo, wMul: 0.42, tw: 0.35 },
  ];

  // long vĩ: quạt đuôi lửa xòe ở cuối thân
  const PLUME_N = lowQuality ? 3 : 5;
  const plumeGeo = new THREE.BufferGeometry();
  const plumePos = new Float32Array(PLUME_N * 9);
  const plumeCol = new Float32Array(PLUME_N * 9);
  plumeGeo.setAttribute('position', new THREE.BufferAttribute(plumePos, 3).setUsage(THREE.DynamicDrawUsage));
  plumeGeo.setAttribute('color', new THREE.BufferAttribute(plumeCol, 3));
  for (let i = 0; i < PLUME_N; i++) {
    cc2.set(colors[0]).multiplyScalar(0.95 - i * 0.09);
    for (let v = 0; v < 3; v++) {
      const o = (i * 3 + v) * 3;
      plumeCol[o] = cc2.r;
      plumeCol[o + 1] = cc2.g;
      plumeCol[o + 2] = cc2.b;
    }
  }
  const plumeMat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const plume = new THREE.Mesh(plumeGeo, plumeMat);
  plume.frustumCulled = false;
  group.add(plume);

  // đường bơi: xoắn ốc ôm người, nhịp lượn rộng và chậm — rồng lượn chứ không giẫy
  const pathAt = (u, out) => {
    const r = 0.68 + Math.sin(u * 0.8) * 0.05;
    out.set(
      Math.cos(u) * r,
      0.95 + Math.sin(u * 1.6 + 1.2) * 0.62,
      Math.sin(u) * r,
    );
    return out;
  };

  const centers = [], tangs = [], sides = [], ups = [];
  for (let k = 0; k <= ST; k++) {
    centers.push(new THREE.Vector3());
    tangs.push(new THREE.Vector3());
    sides.push(new THREE.Vector3());
    ups.push(new THREE.Vector3());
  }
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const WORLD_UP = new THREE.Vector3(0, 1, 0);

  const update = (t) => {
    const U = t * 0.42; // bơi chậm rãi, từng vòng quấn rõ ràng
    for (let k = 0; k <= ST; k++) {
      const u = U - k * 0.07; // khoang 0 là đầu, thân theo sau
      pathAt(u, centers[k]);
      pathAt(u + 0.02, tmpA);
      pathAt(u - 0.02, tmpB);
      tangs[k].subVectors(tmpA, tmpB).normalize();
      sides[k].crossVectors(tangs[k], WORLD_UP);
      if (sides[k].lengthSq() < 1e-6) sides[k].set(1, 0, 0);
      else sides[k].normalize();
      ups[k].crossVectors(sides[k], tangs[k]).normalize();
    }
    // đầu cứng: đặt lên khoang 0, xoay theo hướng bơi, thở nhẹ
    head.group.position.copy(centers[0]);
    m4.lookAt(tmpA.set(0, 0, 0), tangs[0], ups[0]);
    head.group.quaternion.setFromRotationMatrix(m4);
    head.group.scale.setScalar(1.4 * (1 + Math.sin(t * 5) * 0.02));
    // 3 lớp dải: vảy / lõi / quầng — rộng ở cổ thon về đuôi, xoắn quanh trục bơi
    for (const def of bands) {
      const pos = def.geo.attributes.position.array;
      for (let k = 1; k <= ST; k++) {
        const i = k - 1;
        const cK = centers[k], sK = sides[k], uK = ups[k];
        const tw = i * 0.08 + def.tw;
        const w = (0.015 + 0.08 * Math.pow(1 - i / ST, 0.55)) * def.wMul;
        const ux = uK.x * Math.cos(tw) + sK.x * Math.sin(tw);
        const uy = uK.y * Math.cos(tw) + sK.y * Math.sin(tw);
        const uz = uK.z * Math.cos(tw) + sK.z * Math.sin(tw);
        const o = i * 6;
        pos[o] = cK.x - ux * w;
        pos[o + 1] = cK.y - uy * w;
        pos[o + 2] = cK.z - uz * w;
        pos[o + 3] = cK.x + ux * w;
        pos[o + 4] = cK.y + uy * w;
        pos[o + 5] = cK.z + uz * w;
      }
      def.geo.attributes.position.needsUpdate = true;
    }
    band.mat.map.offset.x = -(t * 0.7) % 1; // vảy trôi chậm từ đầu về đuôi
    // long vĩ xòe ở đuôi, phất theo nhịp
    const cT = centers[ST], tT = tangs[ST], sT = sides[ST], uT = ups[ST];
    for (let i = 0; i < PLUME_N; i++) {
      const a = -1.2 + (i / (PLUME_N - 1)) * 2.4 + Math.sin(t * 2 + i) * 0.15;
      const dx = sT.x * Math.cos(a) + uT.x * Math.sin(a);
      const dy = sT.y * Math.cos(a) + uT.y * Math.sin(a);
      const dz = sT.z * Math.cos(a) + uT.z * Math.sin(a);
      const reach = 0.1 + 0.03 * Math.sin(t * 2.6 + i * 1.7);
      const o = i * 9;
      plumePos[o] = cT.x - tT.x * 0.045;
      plumePos[o + 1] = cT.y - tT.y * 0.045;
      plumePos[o + 2] = cT.z - tT.z * 0.045;
      plumePos[o + 3] = cT.x - tT.x * (0.17 + 0.02 * Math.sin(t * 2.2 + i)) + dx * reach;
      plumePos[o + 4] = cT.y - tT.y * (0.17 + 0.02 * Math.sin(t * 2.2 + i)) + dy * reach;
      plumePos[o + 5] = cT.z - tT.z * (0.17 + 0.02 * Math.sin(t * 2.2 + i)) + dz * reach;
      plumePos[o + 6] = cT.x + tT.x * 0.045;
      plumePos[o + 7] = cT.y + tT.y * 0.045;
      plumePos[o + 8] = cT.z + tT.z * 0.045;
    }
    plumeGeo.attributes.position.needsUpdate = true;
  };

  return {
    group,
    update,
    mats: [
      ...head.mats,
      [band.mat, 0.7], [core.mat, 0.7], [plumeMat, 0.65],
    ],
    geos: [band.geo, core.geo, plumeGeo],
  };
}

// Vệt sao băng: đầu sao rực ở phía trước (phải), đuôi loang mờ dần.
function streakTexture() {
  return canvasTex('streak', 128, 32, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h / 2, w * 0.5, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    const head = ctx.createRadialGradient(w * 0.9, h / 2, 1, w * 0.9, h / 2, h * 0.6);
    head.addColorStop(0, 'rgba(255,255,255,1)');
    head.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(w * 0.9, h / 2, h * 0.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Vòng khắc: vành sáng mềm, 24 vạch khắc và 12 chấm nhỏ trong để thấy rõ vòng xoay.
function ringTexture() {
  return canvasTex('ring', 256, 256, (ctx) => {
    ctx.translate(128, 128);
    const g = ctx.createRadialGradient(0, 0, 60, 0, 0, 124);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.78, 'rgba(255,255,255,1)');
    g.addColorStop(0.86, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 124, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let k = 0; k < 24; k++) {
      ctx.save();
      ctx.rotate((k / 24) * Math.PI * 2);
      ctx.fillRect(-4, -116, 8, 20);
      ctx.restore();
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 62, Math.sin(a) * 62, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    softEdge(ctx, 124);
  });
}

// Ngân hà: các đám mây sao mờ + sao lấm tấm dày đặc (random có hạt giống cho giống nhau mỗi lần).
function starfieldTexture() {
  return canvasTex('starfield', 256, 256, (ctx) => {
    let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 3; k++) {
      const x = 40 + rnd() * 176, y = 40 + rnd() * 176;
      const g = ctx.createRadialGradient(x, y, 2, x, y, 90);
      g.addColorStop(0, 'rgba(255,255,255,0.16)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }
    for (let k = 0; k < 150; k++) {
      const x = rnd() * 256, y = rnd() * 256;
      const big = rnd() > 0.92;
      ctx.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.65})`;
      ctx.beginPath();
      ctx.arc(x, y, big ? 1.4 + rnd() * 1.2 : 0.5 + rnd() * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// Vách khí kết giới: vệt khí dọc + vệt loang, tile ngang cho ống trụ bao người
function domeTexture() {
  return canvasTex('dome', 256, 256, (ctx, w, h) => {
    let s = 11;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.3, `rgba(255,255,255,${0.12 + rnd() * 0.2})`);
      g.addColorStop(0.7, `rgba(255,255,255,${0.1 + rnd() * 0.16})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      for (const xx of [x, x - w, x + w]) ctx.fillRect(xx, 0, 3 + rnd() * 10, h); // vẽ 3 lần để tile mép liền
    }
    for (let i = 0; i < 8; i++) {
      const x = rnd() * w, y = rnd() * h, r = 40 + rnd() * 40;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.18)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      for (const xx of [x, x - w, x + w]) {
        ctx.beginPath();
        ctx.arc(xx, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

// Bảng màu theo hiệu ứng: [Sen kim, Lưu ly, Tinh hà, Hỏa diễm, Đào hoa, Bích ngọc, Nguyệt bạch, Hắc ám, Long quyền]
// — mỗi mục 1-2 tông xen nhau cho phần tử phụ và chính.
const PALETTES = [
  [0xffd98a],
  [0x7ee8e0, 0xbff5ef],
  [0xcdd8ff, 0xffd98a],
  [0xff9a5c, 0xffd268],
  [0xffa8cc, 0xffdfef],
  [0x7ee8a0, 0xd0ffd8],
  [0xf6f7ff, 0xcdd9ff],
  [0x7a2ecc, 0x2a0d4a],
  [0xff3d00, 0xffa200],
];
const BASE_OPACITY = 0.9;

// Hào quang biết ngày đêm: main.js bơm world.sky.night (0..1) mỗi khung, hiệu ứng rực theo riêng mình.
let nightAmt = 0;
export function setAuraNight(v) {
  nightAmt = Math.min(1, Math.max(0, v ?? 0));
}
// [độ sáng ban ngày, độ sáng ban đêm] theo thứ tự hiệu ứng: sen kim rực ban ngày,
// nguyệt bạch và hắc ám rực ban đêm, hỏa diễm bùng hơn khi trời tối.
const TIME_GLOW = [
  [1.12, 0.92], [1, 1.05], [0.86, 1.2], [0.95, 1.15],
  [1.08, 0.95], [1.05, 1.0], [0.85, 1.25], [1.05, 1.25],
  [0.95, 1.18],
];

function fillSeeds(seed, count) {
  for (let i = 0; i < count; i++) {
    seed[i * 4] = (i / count) * Math.PI * 2; // góc gốc
    seed[i * 4 + 1] = 0.3 + ((i * 37) % 20) / 20 * 0.22; // bán kính 0.3..0.52
    seed[i * 4 + 2] = 0.5 + ((i * 61) % 10) / 10; // tốc độ riêng
    seed[i * 4 + 3] = ((i * 29) % 10) / 10; // pha lấp lánh
  }
}

// Nhịp thở theo hệ (giây/vòng): hút – phát – nghỉ chậm rãi, lệh pha tự nhiên vì t là giờ từng nhân vật.
  const BREATH = [8, 13, 14, 9, 10, 12, 16, 8.5]; // V10: hệ 1 thở cùng chu kỳ 8 s của signature

export function createEffect(effect, lowQuality = false) {
  // 10..12: ba aura dải lụa (ribbon-aura.js đánh số nội bộ 9..11); 9 là Long quyền của bản prod.
  if (Number.isInteger(effect) && effect >= 10 && effect <= 12) return createRibbonAura(effect - 1, lowQuality);
  if (!effect) return { points: null, update() {}, setColor() {} };
  // Người chơi đè "giảm chuyển động" của hệ điều hành bằng toggle "Hiệu ứng động đầy đủ"
  // trong Đổi trang phục (localStorage fullFx=1) — đọc lại mỗi khung nên đổi là áp ngay.
  const reduceQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reducedMotion = reduceQuery ? {
    get matches() { return reduceQuery.matches && store.get('fullFx') !== '1'; },
  } : null;

  const colors = PALETTES[effect - 1] ?? PALETTES[0];
  const group = new THREE.Group();
  // material "chủ" để avatar đặt opacity khi mờ dần; update() sẽ nhân xuống từng phần.
  const master = new THREE.PointsMaterial({
    transparent: true,
    opacity: BASE_OPACITY,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  group.material = master;

  const geos = [];
  const parts = []; // { mat, base } — material con cần nhân opacity theo master
  const track = (x) => (geos.push(x), x);
  const childMat = (mat, base = BASE_OPACITY) => (parts.push({ mat, base }), mat);
  // material có "base" đổi theo frame (phù văn mờ dần, kiếm nhấp nháy) — update() đọc base mới mỗi khung.
  const dynMat = (make, base) => {
    const entry = { mat: make(), base };
    parts.push(entry);
    return entry;
  };
  const glowMat = (extra, base) => childMat(new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    ...extra,
  }), base);

  const sprite = (tex, color, sx, sy, x, y, z, base) => {
    const sp = new THREE.Sprite(childMat(new THREE.SpriteMaterial({
      map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: base,
    }), base));
    sp.scale.set(sx, sy, 1);
    sp.position.set(x, y, z);
    group.add(sp);
    return sp;
  };

  const flatMesh = (tex, color, size, y, base, x = 0, z = 0) => {
    const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(size, size)), glowMat({
      map: tex, color, opacity: base,
    }), base);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };

  // Hệ hạt lấp lánh dùng chung: vị trí + màu cập nhật mỗi frame theo hàm của từng biến thể.
  const makeTwinkles = (count, size, place, tint) => {
    const geo = track(new THREE.BufferGeometry());
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = childMat(new THREE.PointsMaterial({
      map: glowTexture(), vertexColors: true, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending, size, sizeAttenuation: true,
    }));
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    group.add(pts);
    const seeds = [];
    for (let i = 0; i < count; i++) seeds.push(place(i, count));
    return { geo, pos, col, seeds, tint };
  };

  // Phù văn: chữ Hán nhỏ lửng lơ bay lên từ trận rồi tan, mỗi hiệu ứng một bộ chữ riêng.
  const GLYPHS = [
    ['禪', '蓮', '光'], ['水', '冰', '澄'], ['星', '月', '河'], ['炎', '焱', '焚'],
    ['桃', '花', '蕊'], ['竹', '青', '翠'], ['月', '明', '輝'], ['魔', '冥', '影'],
    ['龍', '拳', '氣'],
  ][effect - 1] ?? ['咒'];
  const makeGlyphs = (count, radius) => {
    const items = [];
    for (let i = 0; i < count; i++) {
      const char = GLYPHS[i % GLYPHS.length];
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: glyphTexture(`glyph-${char}`, char), color: colors[i % colors.length],
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0,
      }), 0);
      const sp = new THREE.Sprite(entry.mat);
      sp.scale.setScalar(0.18);
      group.add(sp);
      items.push({
        sp, entry,
        a0: (i / count) * Math.PI * 2.7,
        r: radius + ((i * 31) % 20) / 20 * 0.22,
        tw: ((i * 29) % 10) / 10,
        speed: 0.5 + ((i * 61) % 10) / 10,
      });
    }
    return items;
  };
  const updateGlyphs = (items, t) => {
    for (const g of items) {
      const yn = (t * 0.09 * g.speed + g.tw) % 1; // vòng đời bay lên rồi tan
      const a = g.a0 + t * 0.15 * g.speed;
      g.sp.position.set(Math.cos(a) * g.r, 0.15 + yn * 1.35, Math.sin(a) * g.r);
      g.sp.material.rotation = g.tw * 6.28 + t * 0.3;
      g.sp.scale.setScalar((0.15 + g.tw * 0.06) * (0.75 + 0.25 * Math.sin(yn * Math.PI)));
      g.entry.base = Math.pow(Math.sin(yn * Math.PI), 0.7) * 0.85;
    }
  };

  const seed = new Float32Array(32 * 4);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  let variantUpdate = () => {};

  if (effect === 1) {
    // SEN KIM — kim đài sen, pháp trận kép xoay ngược, vòng chân ngôn 禪, cánh sen dâng, hoa rơi, bụi vàng.
    const count = lowQuality ? 14 : 26;
    const fallCount = lowQuality ? 6 : 10;
    const sparkCount = lowQuality ? 12 : 22;
    fillSeeds(seed, count);
    const pool = sprite(glowTexture(), colors[0], 1.3, 1.3, 0, 0.04, 0, 0.3);
    const pillar = sprite(wispTexture(), colors[0], 0.52, 1.8, 0, 0.9, 0, 0.13);
    const lotus = flatMesh(lotusTexture(), colors[0], 1.75, 0.02, 0.9); // đài sen cõng người
    // V9: hạ ba mảnh phẳng của lớp inline (mandala/mantra/vòng xoay) — signature pháp giới
    // dẫn câu chuyện, hết chồng lớp + sliver ở góc ngang. Đài sen giữ làm nền chân.
    const mandala = flatMesh(mandalaTexture(), colors[0], 1.36, 0.045, 0.38);
    const mantra = flatMesh(runeRingTexture('rune-chan', '禪'), colors[0], 1.55, 0.06, 0.4);
    const counterRing = flatMesh(ringTexture(), colors[0], 1.0, 0.035, 0.18);

    // vòm kim quang: V9 BỎ cho hệ 1 — mép silhouette của cylinder additive tạo 2 cột sáng
    // dựng đứng ở góc ngang; pháp giới 3D của signature đã bao thân nên vòm chỉ còn chồng lớp.
    const domeTex = domeTexture();
    domeTex.wrapS = THREE.RepeatWrapping;
    domeTex.wrapT = THREE.RepeatWrapping;
    const domeEntry = dynMat(() => new THREE.MeshBasicMaterial({
      map: domeTex, color: colors[0], transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.12,
    }), 0.12);
    const dome = new THREE.Mesh(track(new THREE.CylinderGeometry(0.92, 1.0, 1.95, 48, 1, true)), domeEntry.mat);
    dome.position.y = 0.97;

    // trụ sen: 4 cột kim quang dâng chậm quanh đài
    const pillars = [];
    for (let i = 0; i < (lowQuality ? 2 : 4); i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: wispTexture(), color: colors[0], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0, rotation: 0.04 * (i - 1.5),
      }), 0);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      pillars.push({ sp, entry, a0: (i / 4) * Math.PI * 2 + 0.4, r: 0.82 + ((i * 13) % 10) / 10 * 0.18, tw: ((i * 29) % 10) / 10 });
    }

    // hỏa ngọc: 3 đốm vàng bay vòng ngoài đài
    const orbs = [];
    for (let i = 0; i < (lowQuality ? 2 : 3); i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: glowTexture(), color: colors[0], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.65,
      }), 0.65);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      orbs.push({ sp, entry, a0: (i / 3) * Math.PI * 2, r: 1.02 + i * 0.12, y: 0.55 + i * 0.4, tw: ((i * 29) % 10) / 10 });
    }

    const petals = new THREE.InstancedMesh(track(new THREE.PlaneGeometry(0.18, 0.11)), glowMat({
      map: petalTexture(), color: colors[0],
    }), count);
    group.add(petals);

    const fallers = new THREE.InstancedMesh(track(new THREE.PlaneGeometry(0.16, 0.1)), glowMat({
      map: petalTexture(), color: colors[0],
    }), fallCount);
    group.add(fallers);

    const sparks = makeTwinkles(sparkCount, 0.06, (i, n) => ({
      a0: (i / n) * Math.PI * 3.4,
      r: 0.35 + ((i * 37) % 20) / 20 * 0.35,
      y: 0.15 + ((i * 53) % 30) / 30 * 1.15,
      tw: ((i * 29) % 10) / 10,
      speed: 0.5 + ((i * 61) % 10) / 10,
    }), colors[0]);
    const glyphs = makeGlyphs(lowQuality ? 3 : 6, 0.62);

    variantUpdate = (t) => {
      pool.scale.setScalar(1.3 * (1 + Math.sin(t * 2.1) * 0.06)); // vũng sáng thở
      pool.scale.y = pool.scale.x;
      pillar.scale.y = 1.8 * (1 + Math.sin(t * 1.3) * 0.05);
      lotus.rotation.z = t * 0.12; // đài sen xoay rất chậm
      mandala.rotation.z = t * 0.5;
      mantra.rotation.z = -t * 0.32; // chân ngôn chạy ngược
      counterRing.rotation.z = t * 0.45;
      for (const pl of pillars) {
        const yn = (t * 0.18 + pl.tw) % 1; // trụ sen dâng lên rồi tan
        const life = Math.sin(yn * Math.PI);
        const a = pl.a0 + t * 0.12;
        pl.sp.position.set(Math.cos(a) * pl.r, 0.1 + yn * 1.5, Math.sin(a) * pl.r);
        pl.sp.scale.set(0.15, Math.max(0.001, life * 1.1), 1);
        // V9: hạ trụ sen còn vệt khí mờ — trụ đậm làm góc ngang thành "cột vàng".
        pl.entry.base = life * 0.1;
      }
      for (const ob of orbs) {
        const a = ob.a0 + t * 0.14;
        ob.sp.position.set(Math.cos(a) * ob.r, ob.y + Math.sin(t * 0.9 + ob.tw * 7) * 0.07, Math.sin(a) * ob.r);
        ob.sp.scale.setScalar((0.1 + ob.tw * 0.05) * (1 + 0.15 * Math.sin(t * 1.8 + ob.tw * 8)));
        ob.entry.base = 0.45 + 0.3 * (0.55 + 0.45 * Math.sin(t * 1.6 + ob.tw * 10));
      }
      for (let i = 0; i < count; i++) {
        const a0 = seed[i * 4], r0 = seed[i * 4 + 1], speed = seed[i * 4 + 2], tw = seed[i * 4 + 3];
        const yn = (t * 0.22 * speed + tw) % 1; // vòng đời dâng lên rồi lặp
        const a = a0 + t * 0.35 * speed;
        const r = r0 * (1 - yn * 0.35) + Math.sin(t * 0.8 + tw * 7) * 0.03;
        e.set(1.1 + Math.sin(t * 1.3 + tw * 8) * 0.5, Math.sin(t * 0.9 + tw * 5) * 0.4, t * 1.6 * speed + tw * 6.28);
        q.setFromEuler(e);
        const sc = Math.max(0.001, Math.sin(yn * Math.PI)) * 0.95;
        v.set(Math.cos(a) * r, 0.06 + yn * 1.26, Math.sin(a) * r);
        s.set(sc, sc, sc);
        m4.compose(v, q, s);
        petals.setMatrixAt(i, m4);
      }
      petals.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < fallCount; i++) {
        const a0 = seed[i * 4], speed = seed[i * 4 + 2], tw = seed[i * 4 + 3];
        const yn = (t * 0.11 * speed + tw * 1.3) % 1; // hoa rơi từ trên xuống
        const a = a0 * 2.3 + t * 0.1 * speed;
        const r = 0.45 + tw * 0.4 + Math.sin(t * 0.9 + tw * 6) * 0.05;
        e.set(Math.sin(t * 2 + tw * 8) * 0.7, Math.sin(t * 1.3 + tw * 5) * 0.6, t * 1.2 * speed + tw * 6.28);
        q.setFromEuler(e);
        const sc = (0.7 + tw * 0.5) * Math.min(1, yn * 6, (1 - yn) * 5);
        v.set(Math.cos(a) * r + Math.sin(t * 1.7 + tw * 9) * 0.05, 1.9 - yn * 1.84, Math.sin(a) * r + Math.cos(t * 1.5 + tw * 7) * 0.05);
        s.set(sc, sc, sc);
        m4.compose(v, q, s);
        fallers.setMatrixAt(i, m4);
      }
      fallers.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < sparkCount; i++) {
        const st = sparks.seeds[i];
        const a = st.a0 + t * 0.06 * st.speed;
        sparks.pos[i * 3] = Math.cos(a) * st.r;
        sparks.pos[i * 3 + 1] = st.y + Math.sin(t * 0.7 + st.tw * 9) * 0.05;
        sparks.pos[i * 3 + 2] = Math.sin(a) * st.r;
        const shine = 0.35 + 0.65 * (0.55 + 0.45 * Math.sin(t * 2.2 + st.tw * 12.6));
        c.set(sparks.tint).multiplyScalar(shine);
        sparks.col[i * 3] = c.r;
        sparks.col[i * 3 + 1] = c.g;
        sparks.col[i * 3 + 2] = c.b;
      }
      sparks.geo.attributes.position.needsUpdate = true;
      sparks.geo.attributes.color.needsUpdate = true;
      updateGlyphs(glyphs, t);
    };
  } else if (effect === 2) {
    // LƯU LY — rồng khí bơi quanh người là chính, gợn nước loang từ chân, đá lưu ly lấp lánh, chân ngôn 水.
    const count = lowQuality ? 6 : 10;
    const crysCount = lowQuality ? 4 : 8;
    fillSeeds(seed, count);
    const pool = sprite(glowTexture(), colors[0], 1.05, 1.05, 0, 0.04, 0, 0.2);
    const mantra = flatMesh(runeRingTexture('rune-shui', '水'), colors[0], 1.45, 0.05, 0.85);
    const counterRing = flatMesh(ringTexture(), colors[0], 0.95, 0.04, 0.3);

    // vòm kết giới: ống khí mỏng bao toàn thân, vệt khí cuộn lên chậm rãi
    const domeTex = domeTexture();
    domeTex.wrapS = THREE.RepeatWrapping;
    domeTex.wrapT = THREE.RepeatWrapping;
    const domeEntry = dynMat(() => new THREE.MeshBasicMaterial({
      map: domeTex, color: colors[0], transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.15,
    }), 0.15);
    const dome = new THREE.Mesh(track(new THREE.CylinderGeometry(0.92, 1.0, 1.95, 48, 1, true)), domeEntry.mat);
    dome.position.y = 0.97;
    group.add(dome);

    // gợn nước: vành sáng loang từ chân ra rồi tan, hai vòng lệch pha nhau.
    const ripples = [];
    for (let k = 0; k < 3; k++) {
      const entry = dynMat(() => new THREE.MeshBasicMaterial({
        map: ringTexture(), color: colors[0], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0,
      }), 0);
      const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), entry.mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.025;
      mesh.userData.entry = entry;
      mesh.userData.k = k;
      group.add(mesh);
      ripples.push(mesh);
    }

    // rồng khí: thân ống liền có vây lưng, râu rồng, mũi nhọn — uốn theo đường bơi mỗi khung.
    const dragon = createDragon(colors, lowQuality);
    dragon.geos.forEach((g) => track(g));
    for (const [mat, base] of dragon.mats) parts.push({ mat, base });
    group.add(dragon.group);

    // đá lưu ly: múi kim trôi chậm quanh vai, xoay và lấp lánh riêng từng viên.
    const crystalTex = crystalTexture();
    const crystals = [];
    for (let i = 0; i < crysCount; i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: crystalTex, color: colors[i % colors.length], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.8,
      }), 0.8);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      crystals.push({
        sp, entry,
        a0: (i / crysCount) * Math.PI * 2,
        r: 0.55 + ((i * 23) % 18) / 18 * 0.2,
        y: 0.6 + ((i * 41) % 30) / 30 * 0.85,
        tw: ((i * 29) % 10) / 10,
      });
    }

    const wispTex = wispTexture();
    const wispMats = colors.map((col, k) => childMat(new THREE.SpriteMaterial({
      map: wispTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      opacity: 0.75, rotation: k === 0 ? 0.1 : -0.12, // nghiêng nhẹ cho khỏi đứng như cột
    }), 0.75));
    const wisps = [];
    for (let i = 0; i < count; i++) {
      const sp = new THREE.Sprite(wispMats[i % wispMats.length]);
      group.add(sp);
      wisps.push(sp);
    }

    const glyphs = makeGlyphs(lowQuality ? 2 : 3, 0.7);

    // trụ khí: 4 cột sáng dâng lên quanh người rồi tan, lệch pha
    const pillars = [];
    for (let i = 0; i < (lowQuality ? 2 : 4); i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: wispTexture(), color: colors[i % colors.length], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0, rotation: 0.04 * (i - 1.5),
      }), 0);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      pillars.push({ sp, entry, a0: (i / 4) * Math.PI * 2, r: 0.85 + ((i * 13) % 10) / 10 * 0.18, tw: ((i * 29) % 10) / 10 });
    }

    // linh quang xa: đốm ngọc lớn bay vòng ngoài cùng, thở chậm
    const orbs = [];
    for (let i = 0; i < (lowQuality ? 3 : 5); i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: glowTexture(), color: colors[i % colors.length], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.7,
      }), 0.7);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      orbs.push({ sp, entry, a0: (i / 5) * Math.PI * 2, r: 1.05 + ((i * 7) % 10) / 10 * 0.2, y: 0.5 + ((i * 19) % 30) / 30 * 1.1, tw: ((i * 29) % 10) / 10 });
    }

    // ngọc mưa: bụi ngọc rơi lác đác từ trên cao, tan trước khi chạm đất
    const motes = [];
    for (let i = 0; i < (lowQuality ? 6 : 14); i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: glowTexture(), color: colors[i % colors.length], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0, rotation: ((i * 29) % 10) / 10 * 3,
      }), 0);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      motes.push({ sp, entry, a0: (i / 14) * 6.283, r: 0.3 + ((i * 37) % 20) / 20 * 0.75, tw: ((i * 29) % 10) / 10, fall: 0.5 + ((i * 61) % 10) / 10 });
    }

    variantUpdate = (t) => {
      pool.scale.setScalar(1.05 * (1 + Math.sin(t * 1.8) * 0.06));
      pool.scale.y = pool.scale.x;
      mantra.rotation.z = -t * 0.2;
      counterRing.rotation.z = t * 0.5;
      dome.rotation.y = t * 0.06;
      domeTex.offset.y = -(t * 0.06) % 1; // khí trong vòm cuộn lên
      domeEntry.base = 0.09 + 0.04 * (0.5 + 0.5 * Math.sin(t * 1.1));
      for (const pl of pillars) {
        const yn = (t * 0.22 + pl.tw) % 1; // trụ khí dâng lên rồi tan
        const life = Math.sin(yn * Math.PI);
        const a = pl.a0 + t * 0.15;
        pl.sp.position.set(Math.cos(a) * pl.r, 0.1 + yn * 1.5, Math.sin(a) * pl.r);
        pl.sp.scale.set(0.16, Math.max(0.001, life * 1.15), 1);
        pl.entry.base = life * 0.3;
      }
      for (const ob of orbs) {
        const a = ob.a0 + t * 0.12;
        ob.sp.position.set(Math.cos(a) * ob.r, ob.y + Math.sin(t * 0.8 + ob.tw * 7) * 0.08, Math.sin(a) * ob.r);
        ob.sp.scale.setScalar((0.12 + ob.tw * 0.06) * (1 + 0.15 * Math.sin(t * 2 + ob.tw * 8)));
        ob.entry.base = 0.5 + 0.3 * (0.55 + 0.45 * Math.sin(t * 1.7 + ob.tw * 10));
      }
      for (const mo of motes) {
        const yn = (t * 0.12 * mo.fall + mo.tw) % 1; // ngọc rơi từ trời xuống
        const a = mo.a0 + t * 0.08;
        mo.sp.position.set(Math.cos(a) * mo.r + Math.sin(t + mo.tw * 9) * 0.04, 1.95 - yn * 1.85, Math.sin(a) * mo.r);
        mo.sp.scale.setScalar(0.035 + mo.tw * 0.02);
        mo.entry.base = Math.min(1, yn * 5, (1 - yn) * 4) * 0.5;
      }
      for (const rp of ripples) {
        const p = (t * 0.3 + rp.userData.k * 0.33) % 1; // gợn loang từ chân rồi tan
        rp.scale.setScalar(0.35 + p * 1.05);
        rp.userData.entry.base = (1 - p) * 0.32;
      }
      dragon.update(t);
      for (const cr of crystals) {
        const a = cr.a0 + t * 0.1;
        cr.sp.position.set(Math.cos(a) * cr.r, cr.y + Math.sin(t * 0.9 + cr.tw * 7) * 0.06, Math.sin(a) * cr.r);
        cr.sp.material.rotation = cr.tw * 6.28 + t * 0.4;
        cr.sp.scale.setScalar(0.13 + cr.tw * 0.05);
        cr.entry.base = 0.55 + 0.4 * (0.7 + 0.3 * Math.sin(t * 2.4 + cr.tw * 12.6));
      }
      for (let i = 0; i < count; i++) {
        const a0 = seed[i * 4], r0 = seed[i * 4 + 1], speed = seed[i * 4 + 2], tw = seed[i * 4 + 3];
        const yn = (t * 0.22 * speed + tw * 1.7) % 1;
        const a = a0 + t * 0.22 * speed;
        const r = 0.06 + r0 * 0.52 + Math.sin(t * 0.7 + tw * 9) * 0.035; // ôm sát thân
        const life = Math.sin(yn * Math.PI);
        const sway = Math.sin(t * 2.2 + tw * 12.6);
        wisps[i].position.set(Math.cos(a) * r, 0.04 + yn * 1.3, Math.sin(a) * r);
        wisps[i].scale.set((0.05 + tw * 0.03) * (1 + sway * 0.2), Math.max(0.001, life * (0.24 + tw * 0.16)), 1);
      }
      updateGlyphs(glyphs, t);
    };
  } else if (effect === 3) {
    // TINH HÀ — dải ngân hà nghiêng quay chậm, ba vòng hào quang chồng nghịch, sao chổi quanh vành,
    // vòng chân ngôn 星 dưới chân, sao băng kéo lửa và bụi sao.
    const count = lowQuality ? 16 : 28;
    const dustCount = lowQuality ? 8 : 16;
    fillSeeds(seed, count);
    const mantra = flatMesh(runeRingTexture('rune-xing', '星'), colors[0], 1.3, 0.03, 0.5);

    const galaxyTilt = new THREE.Group();
    galaxyTilt.position.set(0, 0.78, 0);
    galaxyTilt.rotation.x = -Math.PI / 2 + 0.42; // dải ngân hà nghiêng quanh người
    group.add(galaxyTilt);
    const galaxy = new THREE.Mesh(track(new THREE.RingGeometry(0.55, 0.98, 64)), glowMat({
      map: starfieldTexture(), color: colors[0], opacity: 0.55,
    }), 0.55);
    galaxyTilt.add(galaxy);
    // vành ngân hà thứ hai nghiêng ngược — bắt chéo nhau như khối thiên cầu
    const galaxy2Tilt = new THREE.Group();
    galaxy2Tilt.position.set(0, 1.08, 0);
    galaxy2Tilt.rotation.x = -Math.PI / 2 - 0.38;
    group.add(galaxy2Tilt);
    const galaxy2 = new THREE.Mesh(track(new THREE.RingGeometry(0.6, 0.92, 64)), glowMat({
      map: starfieldTexture(), color: colors[1] ?? colors[0], opacity: 0.4,
    }), 0.4);
    galaxy2Tilt.add(galaxy2);
    const counterRing = flatMesh(ringTexture(), colors[0], 1.05, 0.035, 0.35);

    // vòm sao: ống khí xanh bao thân
    const domeTex = domeTexture();
    domeTex.wrapS = THREE.RepeatWrapping;
    domeTex.wrapT = THREE.RepeatWrapping;
    const domeEntry = dynMat(() => new THREE.MeshBasicMaterial({
      map: domeTex, color: colors[0], transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.12,
    }), 0.12);
    const dome = new THREE.Mesh(track(new THREE.CylinderGeometry(0.92, 1.0, 1.95, 48, 1, true)), domeEntry.mat);
    dome.position.y = 0.97;
    group.add(dome);

    // sao băng vụt: mỗi ~5 giây một vệt sao vụng qua trời trên cao
    const shootEntry = dynMat(() => new THREE.SpriteMaterial({
      map: streakTexture(), color: 0xffffff, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0,
    }), 0);
    const shoot = new THREE.Sprite(shootEntry.mat);
    shoot.scale.set(0.55, 0.12, 1);
    group.add(shoot);

    // mưa sao: bụi sao rơi lác đác từ trên cao
    const starMotes = [];
    for (let i = 0; i < (lowQuality ? 4 : 10); i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: glowTexture(), color: colors[i % colors.length], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0, rotation: ((i * 29) % 10) / 10 * 3,
      }), 0);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      starMotes.push({ sp, entry, a0: (i / 10) * 6.283, r: 0.4 + ((i * 37) % 20) / 20 * 0.7, tw: ((i * 29) % 10) / 10, fall: 0.35 + ((i * 61) % 10) / 10 * 0.3 });
    }

    const mkRing = (size, col, base) => {
      const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(size, size)), glowMat({
        map: ringTexture(), color: col, opacity: base,
      }), base);
      mesh.position.set(0, 1.12, -0.3);
      group.add(mesh);
      return mesh;
    };
    const ring1 = mkRing(1.05, colors[0], 0.4);
    const ring2 = mkRing(0.85, colors[0], 0.6);
    const ring3 = mkRing(0.6, colors[1] ?? colors[0], 0.8);
    const comet = sprite(glowTexture(), colors[1] ?? colors[0], 0.16, 0.16, 0, 1.12, -0.29, 0.95);
    const cometTail = sprite(glowTexture(), colors[0], 0.11, 0.11, 0, 1.12, -0.29, 0.5);

    const stars = new THREE.InstancedMesh(track((() => {
      const g = new THREE.PlaneGeometry(0.3, 0.05);
      g.rotateX(-Math.PI / 2); // nằm ngang để thấy rõ từ camera nhìn chếch xuống
      return g;
    })()), glowMat({ map: streakTexture() }), count);
    for (let i = 0; i < count; i++) stars.setColorAt(i, c.set(colors[i % colors.length]));
    group.add(stars);

    const dust = makeTwinkles(dustCount, 0.05, (i, n) => ({
      a0: (i / n) * Math.PI * 2,
      r: 0.3 + ((i * 37) % 20) / 20 * 0.22,
      tw: ((i * 29) % 10) / 10,
      speed: 0.5 + ((i * 61) % 10) / 10,
      parity: i % colors.length,
    }), null);
    const glyphs = makeGlyphs(lowQuality ? 3 : 6, 0.62);

    variantUpdate = (t, walkAmt) => {
      const boost = 1 + walkAmt * 0.8;
      mantra.rotation.z = -t * 0.22;
      galaxy.rotation.z = t * 0.1; // ngân hà xoay rất chậm
      galaxy2.rotation.z = -t * 0.14; // vành hai quay ngược
      counterRing.rotation.z = t * 0.4;
      dome.rotation.y = t * 0.06;
      domeTex.offset.y = -(t * 0.05) % 1;
      domeEntry.base = 0.1 + 0.04 * (0.5 + 0.5 * Math.sin(t * 1.1));
      // sao băng vụt qua trong 0.7s mỗi 5 giây
      const shootCyc = (t % 5) / 5;
      if (shootCyc < 0.14) {
        const p = shootCyc / 0.14;
        shoot.position.set(1.5 - p * 2.8, 1.95 - p * 0.85, 0.9 - p * 0.6);
        shoot.material.rotation = -2.8;
        shootEntry.base = Math.sin(p * Math.PI) * 0.85;
      } else {
        shootEntry.base = 0;
      }
      for (const mo of starMotes) {
        const yn = (t * 0.1 * mo.fall + mo.tw) % 1; // sao rơi từ trời xuống
        const a = mo.a0 + t * 0.07;
        mo.sp.position.set(Math.cos(a) * mo.r + Math.sin(t + mo.tw * 9) * 0.04, 2.0 - yn * 1.9, Math.sin(a) * mo.r);
        mo.sp.scale.setScalar(0.03 + mo.tw * 0.02);
        mo.entry.base = Math.min(1, yn * 4, (1 - yn) * 4) * 0.45;
      }
      ring1.rotation.z = t * 0.35;
      ring2.rotation.z = -t * 0.8;
      ring3.rotation.z = t * 1.25;
      const ca = t * 1.1; // sao chổi chạy quanh vành ngoài
      comet.position.set(Math.cos(ca) * 0.42, 1.12 + Math.sin(ca) * 0.42, -0.29);
      comet.scale.setScalar(0.16 * (1 + Math.sin(t * 6) * 0.15));
      cometTail.position.set(Math.cos(ca - 0.45) * 0.42, 1.12 + Math.sin(ca - 0.45) * 0.42, -0.29);
      for (let i = 0; i < count; i++) {
        const a0 = seed[i * 4], r0 = seed[i * 4 + 1], speed = seed[i * 4 + 2], tw = seed[i * 4 + 3];
        const band = i % 2 === 0 ? 0 : 0.5;
        const a = a0 + t * 0.9 * speed * boost + band;
        const rr = r0 + band * 0.1;
        const shine = 0.55 + 0.45 * Math.sin(t * 2.2 + tw * 12.6);
        e.set(0, -(a + Math.PI / 2), 0); // xoay theo phương bay
        q.setFromEuler(e);
        v.set(Math.cos(a) * rr, 0.62 + Math.sin(a * 2 + band * 3) * 0.3, Math.sin(a) * rr);
        s.set(0.75 + shine * 0.45, 1, 1);
        m4.compose(v, q, s);
        stars.setMatrixAt(i, m4);
        stars.setColorAt(i, c.set(colors[i % colors.length]).multiplyScalar(0.4 + shine * 0.6));
      }
      stars.instanceMatrix.needsUpdate = true;
      if (stars.instanceColor) stars.instanceColor.needsUpdate = true;
      for (let i = 0; i < dustCount; i++) {
        const st = dust.seeds[i];
        const a = st.a0 + t * 0.4 * st.speed;
        dust.pos[i * 3] = Math.cos(a) * st.r;
        dust.pos[i * 3 + 1] = 0.62 + Math.sin(a * 2) * 0.3 + Math.sin(t + st.tw * 7) * 0.05;
        dust.pos[i * 3 + 2] = Math.sin(a) * st.r;
        const shine = 0.35 + 0.65 * (0.55 + 0.45 * Math.sin(t * 2.2 + st.tw * 12.6));
        c.set(colors[st.parity]).multiplyScalar(shine);
        dust.col[i * 3] = c.r;
        dust.col[i * 3 + 1] = c.g;
        dust.col[i * 3 + 2] = c.b;
      }
      dust.geo.attributes.position.needsUpdate = true;
      dust.geo.attributes.color.needsUpdate = true;
      updateGlyphs(glyphs, t);
    };
  } else if (effect === 4) {
    // HỎA DIỄM — hỏa liên cháy dưới chân, trụ hỏa dâng quanh người, tàn lửa bay ngược lên trời,
    // quỷ hỏa chớp tắt lượn vòng, bụi lửa lấp lánh, chân ngôn 炎.
    const count = lowQuality ? 14 : 26;
    const sparkCount = lowQuality ? 12 : 22;
    fillSeeds(seed, count);
    const pool = sprite(glowTexture(), colors[0], 1.25, 1.25, 0, 0.04, 0, 0.32);
    const pillar = sprite(wispTexture(), colors[0], 0.5, 1.7, 0, 0.85, 0, 0.15);
    const lotus = flatMesh(lotusTexture(), colors[0], 1.7, 0.02, 0.85); // hỏa liên cõng người
    const mantra = flatMesh(runeRingTexture('rune-yan', '炎'), colors[0], 1.5, 0.06, 0.8);
    const counterRing = flatMesh(ringTexture(), colors[0], 1.0, 0.035, 0.35);

    // vòm hỏa khí: ống khí cam bao toàn thân — cùng cấu trúc vòm với các hiệu ứng khác
    const domeTex = domeTexture();
    domeTex.wrapS = THREE.RepeatWrapping;
    domeTex.wrapT = THREE.RepeatWrapping;
    const domeEntry = dynMat(() => new THREE.MeshBasicMaterial({
      map: domeTex, color: colors[0], transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.14,
    }), 0.14);
    const dome = new THREE.Mesh(track(new THREE.CylinderGeometry(0.92, 1.0, 1.95, 48, 1, true)), domeEntry.mat);
    dome.position.y = 0.97;
    group.add(dome);

    // trụ hỏa: 4 cột lửa dâng nhanh quanh đài
    const pillars = [];
    for (let i = 0; i < (lowQuality ? 2 : 4); i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: wispTexture(), color: colors[0], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0, rotation: 0.04 * (i - 1.5),
      }), 0);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      pillars.push({ sp, entry, a0: (i / 4) * Math.PI * 2 + 0.8, r: 0.8 + ((i * 13) % 10) / 10 * 0.18, tw: ((i * 29) % 10) / 10 });
    }

    // quỷ hỏa: 3 ngọn lửa nhỏ bay vòng ngoài, chớp tắt dữ hơn hỏa ngọc của Sen kim
    const orbs = [];
    for (let i = 0; i < (lowQuality ? 2 : 3); i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: flameTexture(), color: colors[0], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.7,
      }), 0.7);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      orbs.push({ sp, entry, a0: (i / 3) * Math.PI * 2, r: 1.0 + i * 0.13, y: 0.5 + i * 0.42, tw: ((i * 29) % 10) / 10 });
    }

    // tàn lửa bay ngược: ngọn lửa nhỏ từ chân dâng thẳng lên trời rồi tan
    const flames = new THREE.InstancedMesh(track(new THREE.PlaneGeometry(0.15, 0.2)), glowMat({
      map: flameTexture(), color: colors[0],
    }), count);
    group.add(flames);

    const sparks = makeTwinkles(sparkCount, 0.055, (i, n) => ({
      a0: (i / n) * Math.PI * 3.1,
      r: 0.3 + ((i * 37) % 20) / 20 * 0.4,
      y: 0.1 + ((i * 53) % 30) / 30 * 1.3,
      tw: ((i * 29) % 10) / 10,
      speed: 0.5 + ((i * 61) % 10) / 10,
    }), colors[0]);
    const glyphs = makeGlyphs(lowQuality ? 3 : 6, 0.62);

    variantUpdate = (t) => {
      pool.scale.setScalar(1.25 * (1 + Math.sin(t * 2.6) * 0.07)); // vũng lửa bùng nhịp nhanh
      pool.scale.y = pool.scale.x;
      pillar.scale.y = 1.7 * (1 + Math.sin(t * 1.7) * 0.06);
      lotus.rotation.z = t * 0.16; // hỏa liên xoay chậm
      mantra.rotation.z = -t * 0.42; // chân ngôn chạy ngược như lửa gió
      counterRing.rotation.z = t * 0.5;
      dome.rotation.y = t * 0.07;
      domeTex.offset.y = -(t * 0.08) % 1; // khí lửa cuộn lên nhanh
      domeEntry.base = 0.11 + 0.05 * (0.5 + 0.5 * Math.sin(t * 1.5));
      for (const pl of pillars) {
        const yn = (t * 0.26 + pl.tw) % 1; // trụ hỏa dâng nhanh hơn sen kim
        const life = Math.sin(yn * Math.PI);
        const a = pl.a0 + t * 0.14;
        pl.sp.position.set(Math.cos(a) * pl.r, 0.1 + yn * 1.5, Math.sin(a) * pl.r);
        pl.sp.scale.set(0.14, Math.max(0.001, life * 1.15), 1);
        pl.entry.base = life * 0.3;
      }
      for (const ob of orbs) {
        const a = ob.a0 + t * 0.2;
        ob.sp.position.set(Math.cos(a) * ob.r, ob.y + Math.sin(t * 1.1 + ob.tw * 7) * 0.09, Math.sin(a) * ob.r);
        ob.sp.scale.setScalar((0.09 + ob.tw * 0.04) * (1 + 0.2 * Math.sin(t * 3.1 + ob.tw * 8)));
        ob.entry.base = 0.4 + 0.4 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.6 + ob.tw * 11), 2); // quỷ hỏa chớp tắt
      }
      for (let i = 0; i < count; i++) {
        const a0 = seed[i * 4], r0 = seed[i * 4 + 1], speed = seed[i * 4 + 2], tw = seed[i * 4 + 3];
        const yn = (t * 0.3 * speed + tw) % 1; // tàn lửa bay ngược lên rồi lặp
        const a = a0 + t * 0.3 * speed;
        const r = r0 * (1 - yn * 0.3) + Math.sin(t * 1.1 + tw * 7) * 0.03;
        e.set(0, 0, t * 2.2 * speed + tw * 6.28); // lửa dựng đứng, tự xoay quanh trục mình
        q.setFromEuler(e);
        const sc = Math.max(0.001, Math.sin(yn * Math.PI)) * 0.9;
        v.set(Math.cos(a) * r, 0.05 + yn * 1.5, Math.sin(a) * r);
        s.set(sc, sc, sc);
        m4.compose(v, q, s);
        flames.setMatrixAt(i, m4);
      }
      flames.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < sparkCount; i++) {
        const st = sparks.seeds[i];
        const a = st.a0 + t * 0.08 * st.speed;
        const yn = (t * 0.35 * st.speed + st.tw) % 1; // bụi lửa cũng bay ngược theo tàn lửa
        sparks.pos[i * 3] = Math.cos(a) * st.r;
        sparks.pos[i * 3 + 1] = 0.1 + yn * 1.5;
        sparks.pos[i * 3 + 2] = Math.sin(a) * st.r;
        const shine = 0.35 + 0.65 * (0.55 + 0.45 * Math.sin(t * 3 + st.tw * 12.6));
        c.set(sparks.tint).multiplyScalar(shine);
        sparks.col[i * 3] = c.r;
        sparks.col[i * 3 + 1] = c.g;
        sparks.col[i * 3 + 2] = c.b;
      }
      sparks.geo.attributes.position.needsUpdate = true;
      sparks.geo.attributes.color.needsUpdate = true;
      updateGlyphs(glyphs, t);
    };
  } else if (effect === 5) {
    // ĐÀO HOA — mưa cánh đào hồng rơi li ti là chủ đạo, bông đào xoay quanh thân,
    // trụ hoa dâng, sương hồng bao người, chân ngôn 桃.
    const count = lowQuality ? 10 : 18;
    const fallCount = lowQuality ? 8 : 14;
    const sparkCount = lowQuality ? 10 : 16;
    fillSeeds(seed, count);
    const pool = sprite(glowTexture(), colors[0], 1.15, 1.15, 0, 0.04, 0, 0.26);
    const pillar = sprite(wispTexture(), colors[1] ?? colors[0], 0.46, 1.7, 0, 0.85, 0, 0.12);
    const mandala = flatMesh(mandalaTexture(), colors[0], 1.32, 0.045, 0.7); // trận đào dưới chân
    const mantra = flatMesh(runeRingTexture('rune-thao', '桃'), colors[0], 1.5, 0.06, 0.78);
    const counterRing = flatMesh(ringTexture(), colors[0], 0.95, 0.035, 0.32);

    // vòm sương hồng bao thân
    const domeTex = domeTexture();
    domeTex.wrapS = THREE.RepeatWrapping;
    domeTex.wrapT = THREE.RepeatWrapping;
    const domeEntry = dynMat(() => new THREE.MeshBasicMaterial({
      map: domeTex, color: colors[0], transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.12,
    }), 0.12);
    const dome = new THREE.Mesh(track(new THREE.CylinderGeometry(0.92, 1.0, 1.95, 48, 1, true)), domeEntry.mat);
    dome.position.y = 0.97;
    group.add(dome);

    // trụ hoa: 4 cột hồng dâng chậm quanh người
    const pillars = [];
    for (let i = 0; i < (lowQuality ? 2 : 4); i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: wispTexture(), color: colors[0], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0, rotation: 0.04 * (i - 1.5),
      }), 0);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      pillars.push({ sp, entry, a0: (i / 4) * Math.PI * 2 + 0.4, r: 0.82 + ((i * 13) % 10) / 10 * 0.18, tw: ((i * 29) % 10) / 10 });
    }

    // quầng hoa: 3 đốm hồng bay vòng ngoài
    const orbs = [];
    for (let i = 0; i < (lowQuality ? 2 : 3); i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: glowTexture(), color: colors[1] ?? colors[0], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.6,
      }), 0.6);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      orbs.push({ sp, entry, a0: (i / 3) * Math.PI * 2, r: 1.0 + i * 0.12, y: 0.55 + i * 0.4, tw: ((i * 29) % 10) / 10 });
    }

    // mưa cánh đào: cánh lớn rơi chậm, phất phơ — phần chính của hiệu ứng
    const fallers = new THREE.InstancedMesh(track(new THREE.PlaneGeometry(0.17, 0.12)), glowMat({
      map: petalTexture(), color: colors[0],
    }), fallCount);
    group.add(fallers);

    // bông đào xoay quanh thân: cánh nhỏ dâng nhẹ mềm hơn sen kim
    const petals = new THREE.InstancedMesh(track(new THREE.PlaneGeometry(0.15, 0.1)), glowMat({
      map: petalTexture(), color: colors[1] ?? colors[0],
    }), count);
    group.add(petals);

    const sparks = makeTwinkles(sparkCount, 0.05, (i, n) => ({
      a0: (i / n) * Math.PI * 3.2,
      r: 0.32 + ((i * 37) % 20) / 20 * 0.34,
      y: 0.15 + ((i * 53) % 30) / 30 * 1.2,
      tw: ((i * 29) % 10) / 10,
      speed: 0.5 + ((i * 61) % 10) / 10,
    }), colors[1] ?? colors[0]); // bụi phấn hồng lơ lửng
    const glyphs = makeGlyphs(lowQuality ? 3 : 6, 0.62);

    variantUpdate = (t) => {
      pool.scale.setScalar(1.15 * (1 + Math.sin(t * 1.9) * 0.06)); // sương hồng thở
      pool.scale.y = pool.scale.x;
      pillar.scale.y = 1.7 * (1 + Math.sin(t * 1.2) * 0.05);
      mandala.rotation.z = t * 0.35; // trận đào xoay
      mantra.rotation.z = -t * 0.28;
      counterRing.rotation.z = t * 0.42;
      dome.rotation.y = t * 0.06;
      domeTex.offset.y = -(t * 0.05) % 1;
      domeEntry.base = 0.1 + 0.04 * (0.5 + 0.5 * Math.sin(t * 1.1));
      for (const pl of pillars) {
        const yn = (t * 0.16 + pl.tw) % 1; // trụ hoa dâng thong thả
        const life = Math.sin(yn * Math.PI);
        const a = pl.a0 + t * 0.12;
        pl.sp.position.set(Math.cos(a) * pl.r, 0.1 + yn * 1.5, Math.sin(a) * pl.r);
        pl.sp.scale.set(0.15, Math.max(0.001, life * 1.1), 1);
        pl.entry.base = life * 0.26;
      }
      for (const ob of orbs) {
        const a = ob.a0 + t * 0.13;
        ob.sp.position.set(Math.cos(a) * ob.r, ob.y + Math.sin(t * 0.85 + ob.tw * 7) * 0.07, Math.sin(a) * ob.r);
        ob.sp.scale.setScalar((0.1 + ob.tw * 0.05) * (1 + 0.15 * Math.sin(t * 1.8 + ob.tw * 8)));
        ob.entry.base = 0.4 + 0.28 * (0.55 + 0.45 * Math.sin(t * 1.6 + ob.tw * 10));
      }
      for (let i = 0; i < fallCount; i++) {
        const a0 = seed[i * 4], speed = seed[i * 4 + 2], tw = seed[i * 4 + 3];
        const yn = (t * 0.09 * speed + tw * 1.3) % 1; // rơi chậm hơn sen kim, lượn rộng
        const a = a0 * 2.3 + t * 0.08 * speed;
        const r = 0.45 + tw * 0.42 + Math.sin(t * 0.8 + tw * 6) * 0.07;
        e.set(Math.sin(t * 1.6 + tw * 8) * 0.8, Math.sin(t * 1.1 + tw * 5) * 0.6, t * 0.9 * speed + tw * 6.28);
        q.setFromEuler(e);
        const sc = (0.75 + tw * 0.5) * Math.min(1, yn * 5, (1 - yn) * 4);
        v.set(Math.cos(a) * r + Math.sin(t * 1.4 + tw * 9) * 0.12, 1.95 - yn * 1.88, Math.sin(a) * r + Math.cos(t * 1.2 + tw * 7) * 0.12);
        s.set(sc, sc, sc);
        m4.compose(v, q, s);
        fallers.setMatrixAt(i, m4);
      }
      fallers.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < count; i++) {
        const a0 = seed[i * 4], r0 = seed[i * 4 + 1], speed = seed[i * 4 + 2], tw = seed[i * 4 + 3];
        const yn = (t * 0.18 * speed + tw) % 1; // cánh nhỏ dâng quanh thân
        const a = a0 + t * 0.3 * speed;
        const r = r0 * (1 - yn * 0.35) + Math.sin(t * 0.7 + tw * 7) * 0.03;
        e.set(1.0 + Math.sin(t * 1.2 + tw * 8) * 0.5, Math.sin(t * 0.85 + tw * 5) * 0.4, t * 1.3 * speed + tw * 6.28);
        q.setFromEuler(e);
        const sc = Math.max(0.001, Math.sin(yn * Math.PI)) * 0.85;
        v.set(Math.cos(a) * r, 0.06 + yn * 1.28, Math.sin(a) * r);
        s.set(sc, sc, sc);
        m4.compose(v, q, s);
        petals.setMatrixAt(i, m4);
      }
      petals.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < sparkCount; i++) {
        const st = sparks.seeds[i];
        const a = st.a0 + t * 0.06 * st.speed;
        sparks.pos[i * 3] = Math.cos(a) * st.r;
        sparks.pos[i * 3 + 1] = st.y + Math.sin(t * 0.65 + st.tw * 9) * 0.05;
        sparks.pos[i * 3 + 2] = Math.sin(a) * st.r;
        const shine = 0.35 + 0.65 * (0.55 + 0.45 * Math.sin(t * 2 + st.tw * 12.6));
        c.set(sparks.tint).multiplyScalar(shine);
        sparks.col[i * 3] = c.r;
        sparks.col[i * 3 + 1] = c.g;
        sparks.col[i * 3 + 2] = c.b;
      }
      sparks.geo.attributes.position.needsUpdate = true;
      sparks.geo.attributes.color.needsUpdate = true;
      updateGlyphs(glyphs, t);
    };
  } else if (effect === 6) {
    // BÍCH NGỌC — lá bồ đề ngọc rơi xoay chậm quanh người, trúc khí mọc quanh chân,
    // viên ngọc lục lấp lánh bay vòng vai, chân ngôn 竹.
    const count = lowQuality ? 10 : 18; // lá rơi
    const crysCount = lowQuality ? 4 : 7; // viên ngọc
    const sparkCount = lowQuality ? 10 : 16;
    fillSeeds(seed, count);
    const pool = sprite(glowTexture(), colors[0], 1.1, 1.1, 0, 0.04, 0, 0.24);
    const mantra = flatMesh(runeRingTexture('rune-chuc', '竹'), colors[0], 1.45, 0.05, 0.8);
    const counterRing = flatMesh(ringTexture(), colors[0], 0.95, 0.04, 0.3);

    // vòm trúc khí: ống khí lục bao thân
    const domeTex = domeTexture();
    domeTex.wrapS = THREE.RepeatWrapping;
    domeTex.wrapT = THREE.RepeatWrapping;
    const domeEntry = dynMat(() => new THREE.MeshBasicMaterial({
      map: domeTex, color: colors[0], transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.13,
    }), 0.13);
    const dome = new THREE.Mesh(track(new THREE.CylinderGeometry(0.92, 1.0, 1.95, 48, 1, true)), domeEntry.mat);
    dome.position.y = 0.97;
    group.add(dome);

    // trúc khí: 4 cột thon cao dâng quanh chân
    const pillars = [];
    for (let i = 0; i < (lowQuality ? 2 : 4); i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: wispTexture(), color: colors[0], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0, rotation: 0.03 * (i - 1.5),
      }), 0);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      pillars.push({ sp, entry, a0: (i / 4) * Math.PI * 2 + 0.2, r: 0.86 + ((i * 13) % 10) / 10 * 0.16, tw: ((i * 29) % 10) / 10 });
    }

    // viên ngọc lục: múi kim ngọc bay vòng vai, lấp lánh kiểu Lưu ly
    const crystalTex = crystalTexture();
    const crystals = [];
    for (let i = 0; i < crysCount; i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: crystalTex, color: colors[i % colors.length], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.8,
      }), 0.8);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      crystals.push({
        sp, entry,
        a0: (i / crysCount) * Math.PI * 2,
        r: 0.55 + ((i * 23) % 18) / 18 * 0.2,
        y: 0.6 + ((i * 41) % 30) / 30 * 0.85,
        tw: ((i * 29) % 10) / 10,
      });
    }

    // lá ngọc rơi: lá xoay lượn từ trên cao xuống, tan trước khi chạm đất
    const leaves = new THREE.InstancedMesh(track(new THREE.PlaneGeometry(0.16, 0.2)), glowMat({
      map: leafTexture(), color: colors[0],
    }), count);
    group.add(leaves);

    // linh quàng lục: đốm ngọc lớn bay vòng ngoài
    const orbs = [];
    for (let i = 0; i < (lowQuality ? 3 : 4); i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: glowTexture(), color: colors[i % colors.length], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.65,
      }), 0.65);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      orbs.push({ sp, entry, a0: (i / 4) * Math.PI * 2, r: 1.05 + ((i * 7) % 10) / 10 * 0.18, y: 0.5 + ((i * 19) % 30) / 30 * 1.05, tw: ((i * 29) % 10) / 10 });
    }

    const sparks = makeTwinkles(sparkCount, 0.05, (i, n) => ({
      a0: (i / n) * Math.PI * 3.3,
      r: 0.32 + ((i * 37) % 20) / 20 * 0.36,
      y: 0.12 + ((i * 53) % 30) / 30 * 1.25,
      tw: ((i * 29) % 10) / 10,
      speed: 0.5 + ((i * 61) % 10) / 10,
    }), colors[0]);
    const glyphs = makeGlyphs(lowQuality ? 3 : 6, 0.62);

    variantUpdate = (t) => {
      pool.scale.setScalar(1.1 * (1 + Math.sin(t * 1.7) * 0.06)); // vũng ngọc thở
      pool.scale.y = pool.scale.x;
      mantra.rotation.z = t * 0.24;
      counterRing.rotation.z = -t * 0.45;
      dome.rotation.y = t * 0.06;
      domeTex.offset.y = -(t * 0.055) % 1; // trúc khí cuộn lên
      domeEntry.base = 0.1 + 0.04 * (0.5 + 0.5 * Math.sin(t * 1.05));
      for (const pl of pillars) {
        const yn = (t * 0.19 + pl.tw) % 1; // trúc khí mọc lên chậm
        const life = Math.sin(yn * Math.PI);
        const a = pl.a0 + t * 0.13;
        pl.sp.position.set(Math.cos(a) * pl.r, 0.1 + yn * 1.55, Math.sin(a) * pl.r);
        pl.sp.scale.set(0.12, Math.max(0.001, life * 1.2), 1); // thon và cao hơn trụ hoa
        pl.entry.base = life * 0.28;
      }
      for (const ob of orbs) {
        const a = ob.a0 + t * 0.11;
        ob.sp.position.set(Math.cos(a) * ob.r, ob.y + Math.sin(t * 0.8 + ob.tw * 7) * 0.07, Math.sin(a) * ob.r);
        ob.sp.scale.setScalar((0.11 + ob.tw * 0.05) * (1 + 0.15 * Math.sin(t * 1.9 + ob.tw * 8)));
        ob.entry.base = 0.45 + 0.28 * (0.55 + 0.45 * Math.sin(t * 1.7 + ob.tw * 10));
      }
      for (const cr of crystals) {
        const a = cr.a0 + t * 0.1;
        cr.sp.position.set(Math.cos(a) * cr.r, cr.y + Math.sin(t * 0.9 + cr.tw * 7) * 0.06, Math.sin(a) * cr.r);
        cr.sp.material.rotation = cr.tw * 6.28 + t * 0.4;
        cr.sp.scale.setScalar(0.12 + cr.tw * 0.05);
        cr.entry.base = 0.55 + 0.4 * (0.7 + 0.3 * Math.sin(t * 2.4 + cr.tw * 12.6));
      }
      for (let i = 0; i < count; i++) {
        const a0 = seed[i * 4], r0 = seed[i * 4 + 1], speed = seed[i * 4 + 2], tw = seed[i * 4 + 3];
        const yn = (t * 0.13 * speed + tw) % 1; // lá rơi từ trên cao, lượn ngang rộng
        const a = a0 + t * 0.12 * speed;
        const r = 0.3 + r0 * 0.55 + Math.sin(t * 0.75 + tw * 6) * 0.06;
        e.set(Math.sin(t * 1.4 + tw * 8) * 0.9, t * 0.5 * speed + tw * 6.28, Math.sin(t * 1.1 + tw * 5) * 0.5);
        q.setFromEuler(e);
        const sc = (0.7 + tw * 0.5) * Math.min(1, yn * 5, (1 - yn) * 4);
        v.set(Math.cos(a) * r + Math.sin(t * 1.2 + tw * 9) * 0.09, 1.95 - yn * 1.9, Math.sin(a) * r + Math.cos(t * 1.05 + tw * 7) * 0.09);
        s.set(sc, sc, sc);
        m4.compose(v, q, s);
        leaves.setMatrixAt(i, m4);
      }
      leaves.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < sparkCount; i++) {
        const st = sparks.seeds[i];
        const a = st.a0 + t * 0.06 * st.speed;
        sparks.pos[i * 3] = Math.cos(a) * st.r;
        sparks.pos[i * 3 + 1] = st.y + Math.sin(t * 0.7 + st.tw * 9) * 0.05;
        sparks.pos[i * 3 + 2] = Math.sin(a) * st.r;
        const shine = 0.35 + 0.65 * (0.55 + 0.45 * Math.sin(t * 2.1 + st.tw * 12.6));
        c.set(sparks.tint).multiplyScalar(shine);
        sparks.col[i * 3] = c.r;
        sparks.col[i * 3 + 1] = c.g;
        sparks.col[i * 3 + 2] = c.b;
      }
      sparks.geo.attributes.position.needsUpdate = true;
      sparks.geo.attributes.color.needsUpdate = true;
      updateGlyphs(glyphs, t);
    };
  } else if (effect === 7) {
    // NGUYỆT BẠCH — trăng lưỡi liềm bạc treo sau vai phát quầng, dải sao bạc nghiêng quanh người,
    // hai vòng bạc xoay nghịch quanh đầu, bụi trăng rơi lác đác, chân ngôn 月.
    const motes = [];
    const moteCount = lowQuality ? 4 : 8;
    const dustCount = lowQuality ? 6 : 12;
    const pool = sprite(glowTexture(), colors[0], 1.1, 1.1, 0, 0.04, 0, 0.22);
    const mantra = flatMesh(runeRingTexture('rune-nguyet', '月'), colors[0], 1.35, 0.03, 0.55);
    const counterRing = flatMesh(ringTexture(), colors[0], 1.05, 0.035, 0.32);

    // vòm khí bạc: ống mỏng bao thân, dịu hơn các hiệu ứng lửa
    const domeTex = domeTexture();
    domeTex.wrapS = THREE.RepeatWrapping;
    domeTex.wrapT = THREE.RepeatWrapping;
    const domeEntry = dynMat(() => new THREE.MeshBasicMaterial({
      map: domeTex, color: colors[0], transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.1,
    }), 0.1);
    const dome = new THREE.Mesh(track(new THREE.CylinderGeometry(0.92, 1.0, 1.95, 48, 1, true)), domeEntry.mat);
    dome.position.y = 0.97;
    group.add(dome);

    // huyền nguyệt: quầng mềm ôm ngoài lưỡi liềm, treo sau gáy trên cao
    const halo = sprite(glowTexture(), colors[1] ?? colors[0], 0.72, 0.72, 0, 2.02, -0.52, 0.3);
    const moon = sprite(moonTexture(), 0xffffff, 0.46, 0.46, 0, 2.02, -0.51, 0.95);

    // dải sao bạc nghiêng — chỉ một vành, khác Tinh hà có hai vành bắt chéo
    const bandTilt = new THREE.Group();
    bandTilt.position.set(0, 0.95, 0);
    bandTilt.rotation.x = -Math.PI / 2 + 0.35;
    group.add(bandTilt);
    const band = new THREE.Mesh(track(new THREE.RingGeometry(0.58, 0.95, 64)), glowMat({
      map: starfieldTexture(), color: colors[0], opacity: 0.45,
    }), 0.45);
    bandTilt.add(band);

    // hai vòng bạc xoay nghịch quanh đầu
    const mkRing = (size, col, base) => {
      const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(size, size)), glowMat({
        map: ringTexture(), color: col, opacity: base,
      }), base);
      mesh.position.set(0, 1.14, -0.3);
      group.add(mesh);
      return mesh;
    };
    const ring1 = mkRing(1.0, colors[0], 0.35);
    const ring2 = mkRing(0.78, colors[1] ?? colors[0], 0.55);

    // bụi trăng rơi từ trên cao
    for (let i = 0; i < moteCount; i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: glowTexture(), color: colors[i % colors.length], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0, rotation: ((i * 29) % 10) / 10 * 3,
      }), 0);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      motes.push({ sp, entry, a0: (i / moteCount) * 6.283, r: 0.35 + ((i * 37) % 20) / 20 * 0.65, tw: ((i * 29) % 10) / 10, fall: 0.3 + ((i * 61) % 10) / 10 * 0.3 });
    }

    const dust = makeTwinkles(dustCount, 0.05, (i, n) => ({
      a0: (i / n) * Math.PI * 2,
      r: 0.3 + ((i * 37) % 20) / 20 * 0.24,
      tw: ((i * 29) % 10) / 10,
      speed: 0.5 + ((i * 61) % 10) / 10,
    }), colors[1] ?? colors[0]);
    const glyphs = makeGlyphs(lowQuality ? 3 : 6, 0.62);

    variantUpdate = (t, walkAmt) => {
      const boost = 1 + walkAmt * 0.6;
      pool.scale.setScalar(1.1 * (1 + Math.sin(t * 1.5) * 0.06)); // vũng bạc thở
      pool.scale.y = pool.scale.x;
      mantra.rotation.z = -t * 0.2;
      counterRing.rotation.z = t * 0.35;
      band.rotation.z = t * 0.08; // dải sao trôi rất chậm
      dome.rotation.y = t * 0.05;
      domeTex.offset.y = -(t * 0.045) % 1;
      domeEntry.base = 0.08 + 0.03 * (0.5 + 0.5 * Math.sin(t * 1.0));
      // trăng bồng bềnh và quầng thở nhịp chậm
      moon.position.y = 2.02 + Math.sin(t * 0.7) * 0.04;
      halo.position.y = moon.position.y;
      halo.scale.setScalar(0.72 * (1 + Math.sin(t * 0.9) * 0.05));
      moon.material.rotation = Math.sin(t * 0.23) * 0.2; // lưỡi liềm lắc lư rất khẽ
      ring1.rotation.z = t * 0.3;
      ring2.rotation.z = -t * 0.7;
      for (const mo of motes) {
        const yn = (t * 0.09 * mo.fall + mo.tw) % 1; // bụi trăng rơi từ trời xuống
        const a = mo.a0 + t * 0.07;
        mo.sp.position.set(Math.cos(a) * mo.r + Math.sin(t + mo.tw * 9) * 0.04, 2.0 - yn * 1.9, Math.sin(a) * mo.r);
        mo.sp.scale.setScalar(0.03 + mo.tw * 0.02);
        mo.entry.base = Math.min(1, yn * 4, (1 - yn) * 4) * 0.45;
      }
      for (let i = 0; i < dustCount; i++) {
        const st = dust.seeds[i];
        const a = st.a0 + t * 0.35 * st.speed * boost;
        dust.pos[i * 3] = Math.cos(a) * st.r;
        dust.pos[i * 3 + 1] = 0.6 + Math.sin(a * 2) * 0.28 + Math.sin(t + st.tw * 7) * 0.05;
        dust.pos[i * 3 + 2] = Math.sin(a) * st.r;
        const shine = 0.35 + 0.65 * (0.55 + 0.45 * Math.sin(t * 2 + st.tw * 12.6));
        c.set(dust.tint).multiplyScalar(shine);
        dust.col[i * 3] = c.r;
        dust.col[i * 3 + 1] = c.g;
        dust.col[i * 3 + 2] = c.b;
      }
      dust.geo.attributes.position.needsUpdate = true;
      dust.geo.attributes.color.needsUpdate = true;
      updateGlyphs(glyphs, t);
    };
  } else if (effect === 8) {
    // HẮC ÁM — hắc viêm lửa đen lõi tím vờn quanh người là chủ đạo, vũng âm khí đen nuốt sáng dưới chân,
    // trận lục lăng tím sẫm, quỷ hỏa chớp tắt, chân ngôn 魔.
    // Phần đen dùng NormalBlending màu gần đen để tối thật sự (blending cộng sáng không ra được màu đen).
    const soulCount = lowQuality ? 2 : 4;
    const sparkCount = lowQuality ? 8 : 14;
    // vũng âm khí: đĩa đen dưới chân, nhấp nhô như hố tối
    const voidEntry = childMat(new THREE.MeshBasicMaterial({
      map: glowTexture(), color: 0x020008, transparent: true, depthWrite: false, opacity: 0.72,
    }), 0.72);
    const voidPool = new THREE.Mesh(track(new THREE.PlaneGeometry(2.05, 2.05)), voidEntry);
    voidPool.rotation.x = -Math.PI / 2;
    voidPool.position.y = 0.015;
    group.add(voidPool);
    const rim = flatMesh(ringTexture(), colors[0], 1.5, 0.028, 0.4);
    const hex = flatMesh(hexTexture(), colors[0], 1.32, 0.05, 0.55); // lục lăng ma trận
    const mantra = flatMesh(runeRingTexture('rune-mo', '魔'), colors[0], 1.52, 0.06, 0.6);

    // vòm kết giới tím sẫm: additive mỏng để khung nhẹ, màu đen do khói + vũng âm khí gánh
    const domeTex = domeTexture();
    domeTex.wrapS = THREE.RepeatWrapping;
    domeTex.wrapT = THREE.RepeatWrapping;
    const domeEntry = dynMat(() => new THREE.MeshBasicMaterial({
      map: domeTex, color: colors[1] ?? colors[0], transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.12,
    }), 0.12);
    const dome = new THREE.Mesh(track(new THREE.CylinderGeometry(0.92, 1.02, 1.95, 48, 1, true)), domeEntry.mat);
    dome.position.y = 0.97;
    group.add(dome);

    // hắc viêm: ngọn lửa đen vờn quanh người — thân lửa đen dựng đứng, lõi tím nhỏ rực bên trong;
    // cứ mỗi ngọn thứ 4 là một hắc viêm lớn ôm sát thân cho khỏi thưa
    const flameCount = lowQuality ? 8 : 14;
    const flames = [];
    for (let i = 0; i < flameCount; i++) {
      const big = i % 4 === 0;
      const body = dynMat(() => new THREE.SpriteMaterial({
        map: flameTexture(), color: 0x05020c, transparent: true, depthWrite: false,
        opacity: 0, rotation: ((i * 29) % 10) / 10 * 0.36 - 0.18,
      }), 0);
      const core = dynMat(() => new THREE.SpriteMaterial({
        map: glowTexture(), color: colors[0], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0,
      }), 0);
      const spBody = new THREE.Sprite(body.mat);
      const spCore = new THREE.Sprite(core.mat);
      group.add(spBody);
      group.add(spCore);
      flames.push({
        spBody, spCore, body, core,
        a0: (i / flameCount) * 6.283 + ((i * 17) % 10) / 10 * 0.4,
        r: (0.3 + ((i * 37) % 20) / 20 * 0.38) * (big ? 0.55 : 1),
        tw: ((i * 29) % 10) / 10,
        speed: 0.7 + ((i * 61) % 10) / 10 * 0.5,
        size: (0.2 + ((i * 41) % 10) / 10 * 0.12) * (big ? 1.9 : 1),
      });
    }

    // quỷ hỏa tím: chớp tắt thất thường quanh người
    const souls = [];
    for (let i = 0; i < soulCount; i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: glowTexture(), color: colors[0], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.7,
      }), 0.7);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      souls.push({ sp, entry, a0: (i / soulCount) * 6.283 + 0.5, r: 0.78 + ((i * 17) % 10) / 10 * 0.25, y: 0.4 + ((i * 23) % 30) / 30 * 1.0, tw: ((i * 29) % 10) / 10, size: 0.09 + ((i * 41) % 10) / 10 * 0.04 });
    }

    const sparks = makeTwinkles(sparkCount, 0.05, (i, n) => ({
      a0: (i / n) * Math.PI * 3.4,
      r: 0.3 + ((i * 37) % 20) / 20 * 0.38,
      y: 0.1 + ((i * 53) % 30) / 30 * 1.3,
      tw: ((i * 29) % 10) / 10,
      speed: 0.5 + ((i * 61) % 10) / 10,
    }), colors[0]);
    const glyphs = makeGlyphs(lowQuality ? 3 : 6, 0.62);

    variantUpdate = (t) => {
      voidEntry.base = 0.72 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.9)); // hố tối nhấp nhô
      rim.rotation.z = t * 0.25;
      hex.rotation.z = -t * 0.4; // trận lục lăng xoay ngược
      mantra.rotation.z = t * 0.18;
      dome.rotation.y = -t * 0.05;
      domeTex.offset.y = -(t * 0.045) % 1; // khí trong vòm cuộn lên chậm
      domeEntry.base = 0.09 + 0.04 * (0.5 + 0.5 * Math.sin(t * 0.8));
      for (const f of flames) {
        const yn = (t * 0.16 * f.speed + f.tw) % 1; // lửa đen vờn lên rồi tắt
        const life = Math.sin(yn * Math.PI);
        const a = f.a0 + t * 0.22;
        const x = Math.cos(a) * f.r + Math.sin(t * 1.8 + f.tw * 9) * 0.06; // ngọn lửa lượn mềm
        const z = Math.sin(a) * f.r + Math.cos(t * 1.4 + f.tw * 7) * 0.05;
        const y = 0.12 + yn * 1.55;
        f.spBody.position.set(x, y, z);
        f.spBody.scale.set(
          f.size * (0.8 + 0.3 * Math.sin(t * 2.6 + f.tw * 11)),
          f.size * 1.55 * (0.85 + 0.25 * Math.sin(t * 2.2 + f.tw * 5)),
          1,
        );
        f.spBody.material.rotation = f.tw * 1.2 + Math.sin(t * 1.5 + f.tw * 6) * 0.1;
        f.body.base = life * 0.9;
        // lõi tím rực bên trong ngọn lửa đen — hồn của hắc viêm
        f.spCore.position.set(x, y + f.size * 0.18, z);
        f.spCore.scale.setScalar(f.size * 0.62 * (0.8 + 0.3 * Math.sin(t * 3.2 + f.tw * 13)));
        f.core.base = life * (0.5 + 0.28 * Math.sin(t * 2.9 + f.tw * 12));
      }
      for (const so of souls) {
        const a = so.a0 + t * 0.16;
        so.sp.position.set(Math.cos(a) * so.r, so.y + Math.sin(t * 1.2 + so.tw * 9) * 0.1, Math.sin(a) * so.r);
        so.sp.scale.setScalar(so.size * (1 + 0.2 * Math.sin(t * 3.4 + so.tw * 8)));
        so.entry.base = 0.3 + 0.45 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.8 + so.tw * 13), 3); // chớp tắt ma quái
      }
      for (let i = 0; i < sparkCount; i++) {
        const st = sparks.seeds[i];
        const a = st.a0 + t * 0.07 * st.speed;
        sparks.pos[i * 3] = Math.cos(a) * st.r;
        sparks.pos[i * 3 + 1] = st.y + Math.sin(t * 0.75 + st.tw * 9) * 0.05;
        sparks.pos[i * 3 + 2] = Math.sin(a) * st.r;
        const shine = 0.35 + 0.65 * (0.55 + 0.45 * Math.sin(t * 2.4 + st.tw * 12.6));
        c.set(sparks.tint).multiplyScalar(shine);
        sparks.col[i * 3] = c.r;
        sparks.col[i * 3 + 1] = c.g;
        sparks.col[i * 3 + 2] = c.b;
      }
      sparks.geo.attributes.position.needsUpdate = true;
      sparks.geo.attributes.color.needsUpdate = true;
      updateGlyphs(glyphs, t);
    };
  } else {
    // LONG QUYỀN — song long lửa quấn thân ngược chiều là chủ đạo, hỏa liên kèm trận tâm xoay,
    // vương miện lửa trên đầu, hỏa quyền bùng đan nhau kèm lõi trắng, chấn địa Tempest:
    // sóng xung kích dội từ chân kèm chỏm lửa bùng theo rìa sóng, chân ngôn 龍.
    const sparkCount = lowQuality ? 12 : 22;
    const pool = sprite(glowTexture(), colors[0], 1.35, 1.35, 0, 0.04, 0, 0.4);
    const pillar = sprite(wispTexture(), colors[0], 0.55, 1.8, 0, 0.9, 0, 0.16);
    const lotus = flatMesh(lotusTexture(), colors[0], 1.8, 0.02, 0.9); // hỏa liên cõng người
    const core = flatMesh(mandalaTexture(), colors[1] ?? colors[0], 1.42, 0.045, 0.6); // trận tâm xoay ngược
    const mantra = flatMesh(runeRingTexture('rune-long', '龍'), colors[0], 1.62, 0.06, 0.85);
    const counterRing = flatMesh(ringTexture(), colors[0], 1.05, 0.035, 0.4);

    // vòm hỏa khí: ống khí đỏ bao toàn thân — cùng cấu trúc vòm với các hiệu ứng khác
    const domeTex = domeTexture();
    domeTex.wrapS = THREE.RepeatWrapping;
    domeTex.wrapT = THREE.RepeatWrapping;
    const domeEntry = dynMat(() => new THREE.MeshBasicMaterial({
      map: domeTex, color: colors[0], transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.16,
    }), 0.16);
    const dome = new THREE.Mesh(track(new THREE.CylinderGeometry(0.92, 1.0, 1.95, 48, 1, true)), domeEntry.mat);
    dome.position.y = 0.97;
    group.add(dome);

    // song long: hai rồng lửa truy đuổi nhau quanh người — đỏ chủ đạo và vàng kim,
    // tốc độ khác nhau nên đầu rồng lúc tách xa lúc vờn sát nhau; máy yếu giữ một rồng.
    const dragonA = createDragon(colors, lowQuality);
    dragonA.geos.forEach((g) => track(g));
    for (const [mat, base] of dragonA.mats) parts.push({ mat, base });
    dragonA.group.scale.setScalar(1.12);
    group.add(dragonA.group);
    let dragonB = null;
    if (!lowQuality) {
      dragonB = createDragon([colors[1], colors[0]], lowQuality);
      dragonB.geos.forEach((g) => track(g));
      for (const [mat, base] of dragonB.mats) parts.push({ mat, base });
      dragonB.group.scale.setScalar(0.92);
      group.add(dragonB.group);
    }

    // vương miện lửa: vòng lửa xoay nhanh trên đầu kèm lõi sáng giữa vương miện
    const crownCount = lowQuality ? 5 : 7;
    const crown = [];
    for (let i = 0; i < crownCount; i++) {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: flameTexture(), color: colors[i % colors.length], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.75, rotation: ((i * 29) % 10) / 10 - 0.5,
      }), 0.75);
      const sp = new THREE.Sprite(entry.mat);
      group.add(sp);
      crown.push({ sp, entry, a0: (i / crownCount) * 6.283, tw: ((i * 29) % 10) / 10 });
    }
    const crownGlow = sprite(glowTexture(), colors[1] ?? colors[0], 0.55, 0.55, 0, 2.28, 0, 0.35);

    // hỏa quyền: hai cụm lửa bùng đan nhau ở hai hông kèm lõi trắng nén — tay không mà khí bốc thành lửa
    const fists = [];
    for (const side of [-1, 1]) {
      const body = dynMat(() => new THREE.SpriteMaterial({
        map: flameTexture(), color: colors[0], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.8, rotation: side * 0.15,
      }), 0.8);
      const hot = dynMat(() => new THREE.SpriteMaterial({
        map: glowTexture(), color: 0xfff3d0, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.9,
      }), 0.9);
      const spBody = new THREE.Sprite(body.mat);
      const spHot = new THREE.Sprite(hot.mat);
      group.add(spBody, spHot);
      fists.push({ spBody, spHot, body, hot, side });
    }

    // chấn địa Tempest (E): ba vòng sóng xung kích dội từ chân ra lệch pha, mỗi vòng kéo theo
    // chỏm lửa bùng lên theo rìa — sóng lan đến đâu lửa bùng đến đó; bước đi thì dội mạnh hơn
    const waves = [];
    const waveCount = lowQuality ? 2 : 3;
    const crestCount = lowQuality ? 4 : 6;
    for (let k = 0; k < waveCount; k++) {
      const entry = dynMat(() => new THREE.MeshBasicMaterial({
        map: ringTexture(), color: colors[k % colors.length], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0,
      }), 0);
      const ring = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), entry.mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      ring.userData.entry = entry;
      ring.userData.k = k;
      group.add(ring);
      const crest = dynMat(() => new THREE.SpriteMaterial({
        map: flameTexture(), color: colors[k % colors.length], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0,
      }), 0);
      const flames = [];
      for (let i = 0; i < crestCount; i++) {
        const sp = new THREE.Sprite(crest.mat);
        group.add(sp);
        flames.push(sp);
      }
      waves.push({ ring, entry, crest, flames, k });
    }

    const sparks = makeTwinkles(sparkCount, 0.06, (i, n) => ({
      a0: (i / n) * Math.PI * 3.2,
      r: 0.3 + ((i * 37) % 20) / 20 * 0.42,
      y: 0.1 + ((i * 53) % 30) / 30 * 1.35,
      tw: ((i * 29) % 10) / 10,
      speed: 0.5 + ((i * 61) % 10) / 10,
    }), colors[1] ?? colors[0]);
    const glyphs = makeGlyphs(lowQuality ? 3 : 6, 0.62);

    variantUpdate = (t, walkAmt) => {
      const boost = 1 + walkAmt * 0.9; // bước đi thì cả trận bùng theo
      pool.scale.setScalar(1.35 * (1 + Math.sin(t * 2.6) * 0.07) * (1 + walkAmt * 0.06));
      pool.scale.y = pool.scale.x;
      pillar.scale.y = 1.8 * (1 + Math.sin(t * 1.6) * 0.06);
      lotus.rotation.z = t * 0.22;
      core.rotation.z = -t * 0.55; // trận tâm xoay ngược hỏa liên
      mantra.rotation.z = -t * (0.45 + walkAmt * 0.3);
      counterRing.rotation.z = t * 0.6;
      dome.rotation.y = t * 0.08;
      domeTex.offset.y = -(t * 0.09) % 1;
      domeEntry.base = 0.13 + 0.05 * (0.5 + 0.5 * Math.sin(t * 1.5));
      dragonA.update(t * 1.25);
      if (dragonB) dragonB.update(-t * 1.05 + 4.6);
      for (const f of crown) {
        const a = f.a0 + t * 1.7; // vòng lửa xoay nhanh trên đầu
        f.sp.position.set(Math.cos(a) * 0.34, 2.22 + Math.sin(t * 2.2 + f.tw * 9) * 0.05 + Math.cos(a * 2) * 0.03, Math.sin(a) * 0.34);
        f.sp.scale.set(0.1, 0.15 + 0.05 * Math.sin(t * 3.1 + f.tw * 7), 1);
        f.sp.material.rotation = Math.sin(t * 1.8 + f.tw * 6) * 0.4;
        f.entry.base = 0.55 + 0.25 * (0.5 + 0.5 * Math.sin(t * 2.8 + f.tw * 11));
      }
      crownGlow.scale.setScalar(0.55 * (1 + Math.sin(t * 2.2) * 0.08));
      crownGlow.scale.y = crownGlow.scale.x;
      // hai hỏa quyền nén đan nhau lệch pha, bước đi thì kéo lửa về sau như vệt tốc độ
      for (const f of fists) {
        const punch = Math.pow(0.5 + 0.5 * Math.sin(t * 4.2 + (f.side > 0 ? 0 : Math.PI / 2)), 3);
        f.spBody.position.set(f.side * (0.31 + walkAmt * 0.07), 0.76 + punch * 0.12, 0.08 - walkAmt * 0.14);
        f.spBody.scale.set(0.11 + punch * 0.13, 0.16 + punch * 0.19, 1);
        f.body.base = 0.55 + punch * 0.6;
        f.spHot.position.copy(f.spBody.position);
        f.spHot.position.y += 0.03 + punch * 0.05;
        f.spHot.scale.setScalar(0.06 + punch * 0.1);
        f.hot.base = 0.45 + punch * 0.6;
      }
      for (const w of waves) {
        const p = (t * 0.55 + w.k / waveCount) % 1; // sóng dội dày, lệch pha đều nhau
        const reach = 0.35 + p * 2.05;
        w.ring.scale.setScalar(reach);
        const life = Math.pow(Math.sin(p * Math.PI), 0.7); // rực nhất lúc sóng đang lan rộng
        w.entry.base = life * (0.62 + walkAmt * 0.3);
        // chỏm lửa bùng theo rìa sóng: cao lên lúc sóng lan xa rồi tắt khi sóng tan
        const rEdge = reach * 0.485;
        for (let i = 0; i < w.flames.length; i++) {
          const a = (i / w.flames.length) * 6.283 + w.k * 0.7 + t * 0.25;
          w.flames[i].position.set(Math.cos(a) * rEdge, 0.1 + life * 0.24, Math.sin(a) * rEdge);
          w.flames[i].scale.set(0.1, 0.16 + life * 0.2, 1);
        }
        w.crest.base = Math.pow(Math.sin(p * Math.PI), 0.8) * (0.55 + walkAmt * 0.25);
      }
      for (let i = 0; i < sparkCount; i++) {
        const st = sparks.seeds[i];
        const a = st.a0 + t * 0.08 * st.speed * boost;
        sparks.pos[i * 3] = Math.cos(a) * st.r;
        sparks.pos[i * 3 + 1] = st.y + Math.sin(t * 0.75 + st.tw * 9) * 0.05;
        sparks.pos[i * 3 + 2] = Math.sin(a) * st.r;
        const shine = 0.35 + 0.65 * (0.55 + 0.45 * Math.sin(t * 2.6 + st.tw * 12.6));
        c.set(sparks.tint).multiplyScalar(shine);
        sparks.col[i * 3] = c.r;
        sparks.col[i * 3 + 1] = c.g;
        sparks.col[i * 3 + 2] = c.b;
      }
      sparks.geo.attributes.position.needsUpdate = true;
      sparks.geo.attributes.color.needsUpdate = true;
      updateGlyphs(glyphs, t);
    };
  }

  // Kiếm khí: hai lưỡi khí bay vòng quanh người, chỉ hiện khi nhân vật mang vũ khí.
  let swords = null;
  let swordUpdate = null;
  const buildSwords = () => {
    swords = [0, Math.PI].map((phase) => {
      const entry = dynMat(() => new THREE.SpriteMaterial({
        map: swordTexture(), color: colors[0], transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.8,
      }), 0.8);
      const sp = new THREE.Sprite(entry.mat);
      sp.scale.set(0.52, 0.2, 1);
      group.add(sp);
      return { sp, entry, phase };
    });
    swordUpdate = (t) => {
      for (const sw of swords) {
        const a = t * 1.4 + sw.phase;
        sw.sp.position.set(Math.cos(a) * 0.55, 0.95 + Math.sin(t * 2 + sw.phase) * 0.06, Math.sin(a) * 0.55);
        sw.sp.material.rotation = -a + Math.PI / 2 + Math.sin(t * 1.7 + sw.phase) * 0.12;
        sw.entry.base = 0.65 + 0.25 * (0.55 + 0.45 * Math.sin(t * 2.2 + sw.phase));
      }
    };
  };

  // Lớp signature của phiên trước (phù văn chân, emblem, ribbon + manifestation + flow).
  // V9: chỉ thiết kế cho hệ 1-8 — Long quyền (9) của prod không có signature riêng.
  const signature = effect >= 1 && effect <= 8 ? createAuraSignature(effect, lowQuality) : null;
  if (signature) group.add(signature.group);

  group.traverse((o) => {
    o.frustumCulled = false;
    o.renderOrder = 6;
  });
  // V10 Sen Kim: traverse trên đè renderOrder bên trong signature thành 6 — mực
  // normal-blend phải vẽ trước lớp additive cùng mặt phẳng nên trả thứ tự tường minh.
  // Hệ khác giữ nguyên hành vi cũ.
  if (effect === 1) signature.group.traverse((o) => {
    const order = { 'aura-emblem-ink': 1, 'aura-emblem-rim-ink': 1,
      'aura-emblem-core': 2, 'aura-emblem-rim': 2, 'aura-emblem-glow': 3 }[o.name];
    if (order) o.renderOrder = order;
  });

  return {
    points: group,
    update(t, walkAmt) {
      // Giảm chuyển động theo hệ điều hành: chậm lại ba lần, không tắt hình — giữ nhận diện.
      const ts = reducedMotion?.matches ? .35 : 1;
      variantUpdate(t * ts, walkAmt);
      swordUpdate?.(t * ts, walkAmt);
      if (signature) signature.update(t * ts);
      const tg = TIME_GLOW[effect - 1] ?? [1, 1];
      const tf = tg[0] + (tg[1] - tg[0]) * nightAmt; // rực theo ngày/đêm
      const f = group.material.opacity / BASE_OPACITY;
      // Nhịp thở ±12%: đỉnh phồng nhẹ, đáy nghỉ — tắt hẳn khi reduced motion.
      const b = reducedMotion?.matches ? 1 : .88 + .12 * Math.pow(.5 + .5 * Math.sin(t * Math.PI * 2 / (BREATH[effect - 1] ?? 12)), 2);
      // Lớp inline hạ còn 38% để signature dẫn câu chuyện (đúng phương án phiên trước).
      for (const { mat, base } of parts) mat.opacity = base * f * tf * b * 0.38;
      if (signature) signature.setOpacity(f);
    },
    /** Nhân bản material chủ khi mờ dần để opacity riêng từng nhân vật. */
    beginFade() {
      if (group.material !== master) return;
      group.material = master.clone();
      // V10.2 Sen Kim: Dissolve có trình tự (khí tan → vòng → cánh → trận) thay vì tắt cụm.
      signature.onFadeStart?.();
    },
    setColor() {},
    /** V10.2: điều khiển trạng thái trình diễn của aura hệ 1
        (summon / idle / enhanced / breakthrough / dissolve); hệ khác bỏ qua. */
    setAuraState(name) { signature.setState?.(name); },
    /** QA/preview: ghim trạng thái + tiến trình để chụp khung tái lập (T null = bỏ ghim). */
    qaState(name, T) { signature.qaState?.(name, T); },
    /** Bật/tắt kiếm khí theo vũ khí nhân vật đang mang. */
    setWeapon(w) {
      if (w > 0 && !swords) buildSwords();
      else if (!w && swords) {
        for (const sw of swords) {
          group.remove(sw.sp);
          sw.entry.mat.dispose();
          const idx = parts.indexOf(sw.entry);
          if (idx >= 0) parts.splice(idx, 1);
        }
        swords = null;
        swordUpdate = null;
      }
    },
    dispose() {
      if (signature) signature.dispose();
      geos.forEach((g) => g.dispose?.());
      parts.forEach(({ mat }) => mat.dispose());
      master.dispose();
    },
  };
}
