import * as THREE from 'three';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex } from './aura-flow-shaders.js';
import { koiFragment } from './luu-ly-shaders.js';

// Song lý: hai cá chép ánh ngọc trai lượn chậm quanh trận thủy văn, đuổi nhau như âm dương.
// Mỗi con là một dải nằm ngang (thân + vây đuôi lụa dài) cộng một dải vây lưng rủ mảnh;
// thân uốn sóng từ đầu ra đuôi, biên độ tăng dần về đuôi. Tốc độ bơi cố định và chậm.
const SEG = 28, BODY = 0.72, BANK = 0.75; // BANK: cá nghiêng mình khi lượn vòng (rad), mặt lưng hướng ra ngoài để nhìn chéo vẫn thấy
const FISH = [
  { r: 1.08, phase: 0, speed: 0.2, len: 0.92, w: 0.13, y: 0.16 },
  { r: 1.25, phase: Math.PI, speed: 0.2, len: 0.84, w: 0.12, y: 0.2 },
];

// Nửa bề rộng theo u: đầu tròn, bụng đầy, thắt ở cuống đuôi rồi xoè vây đuôi chẻ đôi.
function profile(u, w) {
  if (u < BODY) return w * Math.pow(Math.sin(Math.PI * Math.min(1, (u + 0.06) / (BODY + 0.1))), 0.6) * (1 - 0.55 * (u / BODY) ** 2);
  const k = (u - BODY) / (1 - BODY);
  return w * (0.25 + 1.5 * Math.sin(Math.PI * Math.min(1, k * 1.1)) * (1 - 0.35 * k));
}

export function createKoi(parent, colors, lowQuality) {
  const seg = lowQuality ? 16 : SEG, strips = createRibbonStrips(FISH.length * 2, seg);
  const make = (ink, order) => {
    const material = new THREE.ShaderMaterial({
      uniforms: { steel: { value: colors.steel }, edge: { value: colors.edge }, core: { value: colors.core },
        gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 }, ink: { value: ink } },
      vertexShader: ribbonVertex, fragmentShader: koiFragment, transparent: true, depthWrite: false,
      side: THREE.DoubleSide, blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(strips.geometry, material);
    mesh.name = ink ? 'luu-ly-koi-ink' : 'luu-ly-koi'; mesh.frustumCulled = false; mesh.renderOrder = order;
    parent.add(mesh);
    return material;
  };
  const materials = [make(0, 6)];
  if (!lowQuality) materials.push(make(1, 5));

  const p = new THREE.Vector3(), q = new THREE.Vector3(), tangent = new THREE.Vector3(), side = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), back = new THREE.Vector3();
  // Điểm trên trục cá ở u, cùng chiều bơi ngược kim đồng hồ khi nhìn từ trên.
  const spine = (fish, u, time, lift, out) => {
    const head = fish.phase + time * fish.speed, a = head - u * fish.len / fish.r;
    const swim = Math.sin(u * 7.5 - time * 1.6 + fish.phase) * (0.025 + 0.09 * u * u);
    const r = fish.r + swim;
    return out.set(Math.cos(a) * r, fish.y + lift + 0.03 * Math.sin(time * 0.5 + fish.phase + u * 2), -Math.sin(a) * r);
  };

  return {
    update(time, rhythm, f) {
      const lift = 0.04 * rhythm.release;
      FISH.forEach((fish, i) => {
        for (let j = 0; j <= seg; j++) {
          const u = j / seg;
          spine(fish, u, time, lift, p); spine(fish, Math.min(1, u + 0.02), time, lift, q);
          if (u >= 0.99) tangent.subVectors(p, spine(fish, u - 0.02, time, lift, q)).normalize();
          else tangent.subVectors(q, p).normalize();
          // Bề ngang thân nghiêng BANK quanh trục cá; back = hướng lưng (vuông góc mặt thân).
          side.crossVectors(tangent, up).normalize().multiplyScalar(Math.cos(BANK)).addScaledVector(up, Math.sin(BANK)).normalize();
          back.crossVectors(tangent, side).normalize();
          strips.write(i * 2, j, p, side, profile(u, fish.w));
          // Vây lưng lụa: dải mảnh nổi trên lưng, rủ theo sau và phất nhẹ.
          const fin = 0.01 + 0.022 * Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(time * 0.9 + u * 6 + i));
          p.addScaledVector(back, 0.025 + 0.015 * u);
          strips.write(i * 2 + 1, j, p, side, fin);
        }
      });
      strips.commit();
      for (const m of materials) { m.uniforms.time.value = time; m.uniforms.opacity.value = (m.uniforms.ink.value ? 0.9 : 0.95) * f; }
    },
    dispose() { strips.geometry.dispose(); materials.forEach(m => m.dispose()); },
  };
}
