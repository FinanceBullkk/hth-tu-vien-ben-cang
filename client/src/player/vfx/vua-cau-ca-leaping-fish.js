import * as THREE from 'three';
import { atlasPlaneLayer } from './vip-atlas-plane-layer.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { rippleTexture } from './vua-cau-ca-textures.js';

// Đàn cá vọt của Vua câu cá: cá chép vàng và cá bạc 3D lần lượt chui lên từ mặt biển theo đường cung
// tiếp tuyến vòng tròn quanh người, thân uốn theo đường bay, rồi lặn hẳn xuống (phần dưới nước bị cắt
// nên cá như xuyên qua mặt nước thật); chỗ vọt lên và chỗ lặn đều toé nước và loang gợn. Mỗi lần vọt
// dời sang một góc khác cho đỡ lặp.
export const LEAP = { radius: 1.08, span: 0.95, height: 0.8, share: 0.55 };
const DROPS = 5, SPLASH_LIFE = 0.55, RIPPLE_LIFE = 1.3;

/** Điểm trên đường cung ở tiến độ u (u < 0 hoặc > 1 là phần dưới nước, nối tiếp đường cung); a0 là góc lúc vọt. */
export function leapPoint(seed, a0, u, outPos, outDir) {
  const a = a0 + LEAP.span * u, r = seed.r, h = seed.h;
  outPos.set(Math.sin(a) * r, 0.04 + h * Math.sin(Math.PI * u), Math.cos(a) * r);
  outDir?.set(Math.cos(a) * r * LEAP.span, h * Math.PI * Math.cos(Math.PI * u), -Math.sin(a) * r * LEAP.span).normalize();
  return outPos;
}

/** first: chỉ số con cá đầu tiên của đàn trong bộ dựng cá; count: số con. */
export function createLeapingFish(parent, bodies, first, count, colors) {
  const seeds = Array.from({ length: count }, (_, i) => ({
    base: i / count * Math.PI * 2, off: i / count, period: 2.8 + 0.5 * hash(i + 2),
    r: LEAP.radius + 0.12 * hash(i + 4), h: LEAP.height * (0.85 + 0.35 * hash(i + 6)), len: 0.36 + 0.08 * hash(i + 8),
  }));
  const drops = billboardLayer(parent, 'vua-cau-ca-splash', softDot(), count * DROPS * 2, colors.foam.clone(), THREE.AdditiveBlending);
  const ripples = atlasPlaneLayer(parent, 'vua-cau-ca-splash-ripples', rippleTexture(), count * 2,
    { tint: colors.aqua.clone(), blending: THREE.AdditiveBlending, renderOrder: 3 });
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(), radial = new THREE.Vector3();
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const ends = [new THREE.Vector3(), new THREE.Vector3()];

  return {
    update(time, rhythm, f) {
      seeds.forEach((seed, i) => {
        const c = time / seed.period + seed.off, n = Math.floor(c), uc = c - n;
        const a0 = seed.base + n * 2.1, since = uc * seed.period, leapTime = LEAP.share * seed.period;
        // Chiều dài cung bay (ước lượng) để đổi chiều dài thân cá ra tiến độ u.
        const arc = Math.hypot(seed.r * LEAP.span, 2 * seed.h), du = seed.len / arc;
        const uh = since / leapTime;
        if (uh < 1 + du + 0.05) {
          const ua = a0 + LEAP.span * uh;
          radial.set(Math.sin(ua), 0, Math.cos(ua));
          up.set(0, 1, 0).addScaledVector(radial, 0.25).normalize();
          bodies.pose(first + i, (u, out) => leapPoint(seed, a0, uh - u * du, out), up, time, i);
        } else {
          bodies.pose(first + i, null, up, time, i, true);
        }
        // Toé nước và gợn: k = 0 lúc vọt lên, k = 1 lúc lặn xuống.
        leapPoint(seed, a0, 0, ends[0]); leapPoint(seed, a0, 1, ends[1]);
        for (let k = 0; k < 2; k++) {
          const dt = since - k * leapTime;
          for (let d = 0; d < DROPS; d++) {
            const j = (i * 2 + k) * DROPS + d;
            if (dt < 0 || dt > SPLASH_LIFE) { drops.set(j, 0, -1, 0, 0, 0, 0); continue; }
            const th = d / DROPS * Math.PI * 2 + i, v = 0.35 + 0.25 * hash(j + 7);
            const y = 0.05 + (1.2 + 0.5 * hash(j + 9)) * dt - 4.9 * dt * dt;
            drops.set(j, ends[k].x + Math.cos(th) * v * dt, Math.max(0.02, y), ends[k].z + Math.sin(th) * v * dt, 0.05, 0.05, (1 - dt / SPLASH_LIFE) * f);
          }
          const rk = i * 2 + k;
          if (dt < 0 || dt > RIPPLE_LIFE) ripples.set(rk, m.makeScale(0, 0, 0), 0);
          else {
            const w = dt / RIPPLE_LIFE, size = 0.15 + 0.6 * w;
            ripples.set(rk, m.compose(p.set(ends[k].x, 0.022, ends[k].z), flat, s.set(size, size, 1)), (1 - w) * (0.7 + 0.3 * rhythm.pulse) * f);
          }
        }
      });
      drops.commit(); ripples.commit();
    },
    dispose() { drops.dispose(); ripples.dispose(); },
  };
}
