import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { noteVertex } from './nguyet-bach-shaders.js';
import { nguyetBachNotes, nguyetBachMist } from './nguyet-bach-textures.js';
import { nguyetBachFrost } from './nguyet-bach-ornament-textures.js';
import { humAt } from './nguyet-bach-rhythm.js';
import { softDot } from './aura-rhythm.js';

// Lớp bay bổng của Nguyệt Bạch:
//  nốt nhạc cổ cầm (勾 挑 散 泛) bay ra từ dây đàn, vòng qua TRÊN đầu nhân vật tới vầng trăng
//    (tri âm: tiếng đàn tìm trăng) rồi tan; nốt nào sinh lúc dây ngân thì đậm hơn — tốc độ bay cố định;
//  sương mỏng phủ mép gương nước, chỉ thở nhẹ tại chỗ; bụi trăng bạc bay lên rất chậm quanh thân;
//  tinh thể sương giá sáu nhánh lơ lửng bay lên, xoay chậm, lấp lánh (ngoài vùng quanh đầu).
const NOTE_SPEED = 0.05;
const P1 = [-0.55, 2.45, -0.5], P2 = [0.3, 2.55, -0.58];

/** Vị trí nốt i trên đường cong bậc hai: từ dây đàn (độ cao riêng) qua đỉnh đầu tới trăng. */
export function notePath(i, u) {
  const p0 = [-0.68, 0.75 + hash(i + 50) * 0.95, -0.4], a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
  return [0, 1, 2].map(k => a * p0[k] + b * P1[k] + c * P2[k] + (k === 2 ? 0 : 0.05 * Math.sin(u * 9 + i) * (k ? 0.5 : 1)));
}

export function createNguyetBachBillboards(parent, colors, lowQuality) {
  const noteN = lowQuality ? 6 : 12, mistN = lowQuality ? 0 : 9, moteN = lowQuality ? 10 : 24, frostN = lowQuality ? 8 : 20;
  const atlas = { vertexShader: noteVertex };
  const notes = billboardLayer(parent, 'nguyet-bach-notes', nguyetBachNotes(), noteN, colors.core.clone().lerp(colors.edge, 0.35), THREE.AdditiveBlending, atlas);
  const noteInk = lowQuality ? null : billboardLayer(parent, 'nguyet-bach-notes', nguyetBachNotes(), noteN, colors.steel, THREE.NormalBlending, atlas);
  const mist = mistN ? billboardLayer(parent, 'nguyet-bach-mist', nguyetBachMist(), mistN, colors.edge.clone().lerp(colors.core, 0.5), THREE.NormalBlending) : null;
  const frost = billboardLayer(parent, 'nguyet-bach-frost', nguyetBachFrost(), frostN, colors.core.clone().lerp(colors.edge, 0.4), THREE.AdditiveBlending);
  const layers = [notes, noteInk, mist, frost].filter(Boolean);

  const motePos = new Float32Array(moteN * 3), moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: colors.edge, size: 0.055, map: softDot(), transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending });
  const motes = new THREE.Points(moteGeo, moteMat); motes.name = 'nguyet-bach-moon-dust'; parent.add(motes);

  return {
    update(time, rhythm, f) {
      for (let i = 0; i < noteN; i++) {
        const u = ((i / noteN + time * NOTE_SPEED) % 1 + 1) % 1, [x, y, z] = notePath(i, u);
        const born = humAt(time - u / NOTE_SPEED), s = 0.16 + 0.06 * hash(i + 60);
        const alpha = Math.pow(Math.sin(Math.PI * u), 0.8) * (0.25 + 0.75 * born), spin = 0.015 * Math.sin(time * 0.4 + i);
        notes.set(i, x, y, z, s, s, alpha * 0.95, spin); notes.mesh.instanceColor.setZ(i, i % 4);
        if (noteInk) { noteInk.set(i, x, y, z - 0.01, s, s, alpha * 0.6, spin); noteInk.mesh.instanceColor.setZ(i, i % 4); }
      }
      for (const l of [notes, noteInk]) if (l) { l.commit(); l.material.uniforms.opacity.value = f; }
      if (mist) {
        for (let i = 0; i < mistN; i++) {
          const a = -2.2 + i / (mistN - 1) * 4.4, breathe = 0.5 + 0.5 * Math.sin(time * 0.21 + i * 1.9);
          mist.set(i, 0.1 + Math.sin(a) * 1.75, 0.1 + 0.05 * breathe, -0.2 + Math.cos(a) * 1.35,
            0.95 + 0.2 * breathe, 0.34, 0.16 + 0.12 * breathe, 0);
        }
        mist.commit(); mist.material.uniforms.opacity.value = f;
      }
      for (let i = 0; i < frostN; i++) {
        const u = ((hash(i + 80) + time * 0.028) % 1 + 1) % 1, a = hash(i + 81) * Math.PI * 2 + time * 0.05;
        const r = 0.85 + 0.9 * hash(i + 82), tw = Math.pow(0.5 + 0.5 * Math.sin(time * (0.5 + hash(i + 83)) + i * 1.7), 4);
        const s = 0.06 + 0.06 * hash(i + 84) + 0.03 * tw;
        frost.set(i, Math.cos(a) * r, 0.1 + u * 3.0, -0.2 + Math.sin(a) * r * 0.8, s, s,
          Math.min(1, u * 6, (1 - u) * 5) * (0.3 + 0.7 * tw), hash(i + 85) + time * 0.03);
      }
      frost.commit(); frost.material.uniforms.opacity.value = f;
      for (let i = 0; i < moteN; i++) {
        const u = ((i / moteN + time * 0.035) % 1 + 1) % 1, a = i * 2.39996 + time * 0.06, r = 0.65 + 0.35 * Math.sin(u * Math.PI);
        motePos.set([Math.cos(a) * r, 0.08 + u * 2.3, Math.sin(a) * r], i * 3);
      }
      moteGeo.attributes.position.needsUpdate = true;
      moteMat.opacity = (0.45 + 0.3 * rhythm.hum) * f;
    },
    dispose() { layers.forEach(l => l.dispose()); moteGeo.dispose(); moteMat.dispose(); },
  };
}
