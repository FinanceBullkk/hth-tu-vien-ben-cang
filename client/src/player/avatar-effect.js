// Hào quang võ hiệp quanh nhân vật — nghiên cứu từ VFX các game võ lâm/tiên hiệp:
// đài sen nhiều lớp, vòng rune chữ triện xoay ngược, long khí quấn thân, sáo lụa chảy UV.
// Toàn bộ texture vẽ bằng canvas nên không cần asset ngoài.
// 1 Sen kim — Kim đài liên hoa, pháp trận kép, chân ngôn 禪, cánh sen dâng kèm hoa rơi;
// 2 Lưu ly — module riêng vfx/luu-ly-aura.js (thủy luân xoáy nước, song lý, mặt hồ);
// 3 Tinh hà — dải ngân hà nghiêng, ba vòng hào quang, sao chổi quanh vành, chân ngôn 星;
// 4 Hồng Liên Hỏa Vũ — pháp tướng riêng ở vfx/hong-lien-aura.js (cánh chu tước giang ngang, phượng vĩ, sen lửa);
// 5 Đào hoa — module riêng vfx/dao-hoa-aura.js (nguyệt môn, cành đào 3D, cánh đào xoắn rơi);
// 6 Bích ngọc — module riêng vfx/bich-ngoc-aura.js (rừng trúc ngọc, gió xoáy cuốn lá, đá rêu);
// 7 Nguyệt bạch — trăng lưỡi liềm bạc treo sau vai, dải sao bạc nghiêng, bụi trăng rơi, chân ngôn 月;
// 8 Hắc ám — hắc viêm lửa đen lõi tím vờn quanh người, vũng âm khí nuốt sáng, trận lục lăng, quỷ hỏa, chân ngôn 魔;
// 9 Long quyền — song long lửa quấn thân ngược chiều, vương miện lửa trên đầu, hỏa quyền bùng
// kèm lõi trắng, chấn địa kiểu Tempest: sóng xung kích cam vàng dội từ chân kèm chỏm lửa bùng
// theo rìa sóng, chân ngôn 龍.
import * as THREE from 'three';
import { createRibbonAura } from './vfx/ribbon-aura.js';
import { createKiemVuAura } from './vfx/kiem-vu-aura.js';
import { createTinhHaAura } from './vfx/tinh-ha-aura.js';
import { createLuuLyAura } from './vfx/luu-ly-aura.js';
import { createDaoHoaAura } from './vfx/dao-hoa-aura.js';
import { createHongLienAura } from './vfx/hong-lien-aura.js';
import { createNguyetBachAura } from './vfx/nguyet-bach-aura.js';
import { createBichNgocAura } from './vfx/bich-ngoc-aura.js';
import { createHuyenDaAura } from './vfx/huyen-da-aura.js';
import { createXichDiemAura } from './vfx/xich-diem-aura.js';
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

// Ngọn lửa: thân lửa mềm chóp nhọn + lõi sáng, dùng cho hắc viêm và long quyền.
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
  // 11: aura dải lụa (ribbon-aura.js đánh số nội bộ 10); 9 là Long quyền của bản prod.
  if (effect === 11) return createRibbonAura(effect - 1, lowQuality);
  if (!effect) return { points: null, update() {}, setColor() {} };
  // Người chơi đè "giảm chuyển động" của hệ điều hành bằng toggle "Hiệu ứng động đầy đủ"
  // trong Đổi trang phục (localStorage fullFx=1) — đọc lại mỗi khung nên đổi là áp ngay.
  const reduceQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reducedMotion = reduceQuery ? {
    get matches() { return reduceQuery.matches && store.get('fullFx') !== '1'; },
  } : null;
  // 12: Thanh Phong Kiếm Vũ có pháp tướng riêng (kiếm luân, phi kiếm, trận đồ).
  if (effect === 12) return createKiemVuAura(lowQuality, reducedMotion);
  // 3: Tinh Hà có pháp tướng riêng (Chu Thiên Tinh Đồ, Bắc Đẩu, lưu tinh, tinh bàn).
  if (effect === 3) return createTinhHaAura(lowQuality, reducedMotion);
  // 2: Lưu Ly Vân Thủy có pháp tướng riêng (thủy luân xoáy nước, song lý, mặt hồ).
  if (effect === 2) return createLuuLyAura(lowQuality, reducedMotion);
  // 5: Đào Hoa Tri Kỷ có pháp tướng riêng (nguyệt môn ngọc, cành đào 3D, cánh đào rơi).
  if (effect === 5) return createDaoHoaAura(lowQuality, reducedMotion);
  // 4: Hồng Liên Hỏa Vũ có pháp tướng riêng (cánh chu tước giang ngang, phượng vĩ, sen lửa).
  if (effect === 4) return createHongLienAura(lowQuality, reducedMotion);
  // 7: Nguyệt Bạch Tri Âm có pháp tướng riêng (trăng tròn lệch vai, cổ cầm ngân, gương nước).
  if (effect === 7) return createNguyetBachAura(lowQuality, reducedMotion);
  // 8: Huyền Dạ Du Hành có pháp tướng riêng (nhật thực đen, lông quạ, xoáy mực hút vào tâm).
  if (effect === 8) return createHuyenDaAura(lowQuality, reducedMotion);
  // 6: Bích Ngọc Thanh Phong có pháp tướng riêng (rừng trúc ngọc, gió xoáy cuốn lá, đá rêu).
  if (effect === 6) return createBichNgocAura(lowQuality, reducedMotion);
  // 10: Xích Diễm Lưu Vân có pháp tướng riêng (đài mây lửa thấp rộng, vòng lửa ngang eo).
  if (effect === 10) return createXichDiemAura(lowQuality, reducedMotion);

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
  if (effect === 1 && signature) signature.group.traverse((o) => {
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
      signature?.onFadeStart?.();
    },
    setColor() {},
    /** V10.2: điều khiển trạng thái trình diễn của aura hệ 1
        (summon / idle / enhanced / breakthrough / dissolve); hệ khác bỏ qua. */
    setAuraState(name) { signature?.setState?.(name); },
    /** QA/preview: ghim trạng thái + tiến trình để chụp khung tái lập (T null = bỏ ghim). */
    qaState(name, T) { signature?.qaState?.(name, T); },
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
