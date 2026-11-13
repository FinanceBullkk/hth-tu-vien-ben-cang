import * as THREE from 'three';
import { billboardVertex, billboardFragment } from './kiem-vu-flow-shaders.js';
import { kiemVuCloud, kiemVuStar, kiemVuStreak, kiemVuPetal } from './kiem-vu-textures.js';

// Các lớp hạt billboard của Kiếm Vũ — mỗi lớp là MỘT InstancedMesh (một lần vẽ):
//  tường vân bồng bềnh dưới chân và đỡ hai bên pháp tướng (normal blending, đọc được trên nền sáng);
//  sao bốn cánh lấp lánh quanh kiếm luân; vệt khí mảnh bay lên quanh thân (cộng sáng);
//  kiếm hoa / lá trúc lả tả rơi chậm, đung đưa và lật nhẹ như trong gió.
const quad = new THREE.PlaneGeometry(1, 1); // dùng chung, không dispose
const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

function layer(parent, name, map, count, tint, blending) {
  const material = new THREE.ShaderMaterial({ uniforms: { map: { value: map }, tint: { value: tint }, opacity: { value: 1 } },
    vertexShader: billboardVertex, fragmentShader: billboardFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending });
  const mesh = new THREE.InstancedMesh(quad, material, count);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  mesh.name = name; mesh.frustumCulled = false; mesh.renderOrder = blending === THREE.NormalBlending ? 5 : 8;
  parent.add(mesh);
  const m = new THREE.Matrix4(), color = new THREE.Color();
  return { mesh, material,
    set(i, x, y, z, sx, sy, alpha, spin = 0) {
      m.makeScale(sx, sy, 1).setPosition(x, y, z); mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.setRGB(Math.max(0, alpha), spin, 0));
    },
    commit() { mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; },
  };
}

// Mây cố định quanh pháp tướng: [x, y, z, rộng, cao, lệch pha].
const WHEEL_CLOUDS = [[-1.0, 0.82, -0.5, 1.0, 0.55, 0], [1.05, 0.9, -0.55, 0.95, 0.5, 1.7],
  [-1.45, 1.35, -0.6, 0.75, 0.42, 3.1], [1.5, 1.45, -0.62, 0.8, 0.45, 4.4]];

export function createBillboards(parent, colors, lowQuality) {
  const footN = lowQuality ? 4 : 7, starN = lowQuality ? 6 : 16, streakN = lowQuality ? 8 : 20, petalN = lowQuality ? 8 : 24;
  const cloudTint = colors.core.clone().lerp(colors.edge, 0.15).multiplyScalar(1.1);
  const clouds = layer(parent, 'kiem-vu-clouds', kiemVuCloud(), footN + WHEEL_CLOUDS.length, cloudTint, THREE.NormalBlending);
  const stars = layer(parent, 'kiem-vu-stars', kiemVuStar(), starN, colors.core, THREE.AdditiveBlending);
  const streaks = layer(parent, 'kiem-vu-streaks', kiemVuStreak(), streakN, colors.edge, THREE.AdditiveBlending);
  const petals = layer(parent, 'kiem-vu-petals', kiemVuPetal(), petalN, colors.edge.clone().lerp(colors.gold, 0.3), THREE.AdditiveBlending);

  return {
    update(time, rhythm, f) {
      // Mây dưới chân trôi vòng chậm, phồng xẹp như thở; dạt ra khi xuất kiếm.
      for (let i = 0; i < footN; i++) {
        const a = i / footN * Math.PI * 2 + time * 0.04, r = 0.92 + 0.12 * Math.sin(time * 0.3 + i * 2) + 0.1 * rhythm.release;
        const b = 1 + 0.1 * Math.sin(time * 0.8 + i);
        clouds.set(i, Math.sin(a) * r, 0.16 + 0.05 * Math.sin(time * 0.6 + i), Math.cos(a) * r,
          0.95 * b, 0.5 * b, 0.55 + 0.15 * Math.sin(time * 0.7 + i * 1.3), 0.02 * Math.sin(time * 0.4 + i));
      }
      WHEEL_CLOUDS.forEach(([x, y, z, w, h, ph], k) => {
        clouds.set(footN + k, x + 0.06 * Math.sin(time * 0.35 + ph), y + 0.05 * Math.sin(time * 0.5 + ph), z,
          w, h, 0.5 + 0.12 * Math.sin(time * 0.6 + ph), 0.015 * Math.sin(time * 0.3 + ph));
      });
      clouds.commit(); clouds.material.uniforms.opacity.value = 1.0 * f;
      // Sao rải quanh kiếm luân, mỗi ngôi lấp lánh theo nhịp riêng.
      for (let i = 0; i < starN; i++) {
        const a = hash(i) * Math.PI * 2, r = 0.7 + hash(i + 9) * 0.95;
        const tw = Math.pow(0.5 + 0.5 * Math.sin(time * (0.6 + hash(i + 3) * 0.9) + i * 2.1), 6);
        const s = 0.1 + 0.12 * tw + 0.08 * rhythm.pulse;
        stars.set(i, Math.sin(a) * r, 1.42 + Math.cos(a) * r * 0.85, -0.3 + hash(i + 5) * 0.2, s, s, tw * 0.9 + 0.1, time * 0.1 + hash(i));
      }
      stars.commit(); stars.material.uniforms.opacity.value = f;
      // Vệt khí bay lên xoắn nhẹ quanh thân, tan ở hai đầu hành trình.
      for (let i = 0; i < streakN; i++) {
        const u = ((hash(i + 20) + time * (0.05 + hash(i) * 0.04)) % 1 + 1) % 1, a = hash(i + 40) * Math.PI * 2 + u * 1.5;
        const r = 0.6 + hash(i + 60) * 0.6;
        streaks.set(i, Math.sin(a) * r, 0.1 + u * 2.6, Math.cos(a) * r - 0.1, 0.035, 0.28 + 0.2 * hash(i + 80),
          Math.sin(u * Math.PI) * (0.7 + 0.5 * rhythm.release));
      }
      streaks.commit(); streaks.material.uniforms.opacity.value = 0.9 * f;
      // Kiếm hoa rơi: mỗi cánh một tốc độ rất chậm, trôi vòng quanh thân, lắc ngang và lật nhẹ.
      for (let i = 0; i < petalN; i++) {
        const u = ((hash(i + 100) + time * (0.025 + hash(i + 110) * 0.02)) % 1 + 1) % 1;
        const a = hash(i + 120) * Math.PI * 2 + time * 0.05 + u * 1.2, r = 0.5 + hash(i + 130) * 1.3;
        const flutter = Math.sin(time * (0.7 + hash(i + 140) * 0.5) + i);
        const flip = 0.55 + 0.45 * Math.cos(time * (0.5 + hash(i + 150) * 0.6) + i * 2);
        petals.set(i, Math.sin(a) * r + flutter * 0.12, 3.0 - u * 2.9, Math.cos(a) * r - 0.2,
          0.075 * flip + 0.015, 0.21, Math.sin(u * Math.PI) * 0.85, 0.15 * flutter + hash(i + 160));
      }
      petals.commit(); petals.material.uniforms.opacity.value = f;
    },
    dispose() { for (const l of [clouds, stars, streaks, petals]) { l.mesh.dispose(); l.material.dispose(); } },
  };
}
