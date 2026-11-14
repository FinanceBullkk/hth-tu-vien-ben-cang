import * as THREE from 'three';
import { atlasPlaneLayer } from './vip-atlas-plane-layer.js';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';
import { FISH_ATLAS, fishAtlas, rippleTexture } from './vua-cau-ca-textures.js';

// Đàn cá vọt của Vua câu cá: cá chép vàng và cá bạc lần lượt VỌT KHỎI MẶT NƯỚC quanh người theo
// đường vòng cung tiếp tuyến với vòng tròn, thân nghiêng theo hướng bay, rồi lặn xuống; chỗ cá vọt
// lên và chỗ cá lặn đều toé nước và loang gợn. Mỗi lần vọt dời sang một góc khác cho đỡ lặp.
export const LEAP = { radius: 1.05, span: 0.95, height: 0.8, share: 0.55 };
const DROPS = 4, SPLASH_LIFE = 0.55, RIPPLE_LIFE = 1.3;
const FISH_SIZE = new THREE.Vector3(0.42, 0.21, 1);

/** Vị trí và hướng bay của một con cá ở tiến độ u (0..1) của cú vọt; a0 là góc lúc vọt lên. */
export function leapPoint(seed, a0, u, outPos, outDir) {
  const a = a0 + LEAP.span * u, r = seed.r, h = seed.h;
  outPos.set(Math.sin(a) * r, 0.04 + h * Math.sin(Math.PI * u), Math.cos(a) * r);
  outDir?.set(Math.cos(a) * r * LEAP.span, h * Math.PI * Math.cos(Math.PI * u), -Math.sin(a) * r * LEAP.span).normalize();
  return outPos;
}

export function createLeapingFish(parent, colors, lowQuality) {
  const count = lowQuality ? 3 : 6;
  const seeds = Array.from({ length: count }, (_, i) => ({
    base: i / count * Math.PI * 2, off: i / count, period: 2.8 + 0.5 * hash(i + 2),
    r: LEAP.radius + 0.12 * hash(i + 4), h: LEAP.height * (0.85 + 0.35 * hash(i + 6)), cell: i % 2,
  }));
  const fish = atlasPlaneLayer(parent, 'vua-cau-ca-leaping-fish', fishAtlas(), count, { ...FISH_ATLAS, readableBack: false, renderOrder: 7 });
  const drops = billboardLayer(parent, 'vua-cau-ca-splash', softDot(), count * DROPS * 2, colors.foam.clone(), THREE.AdditiveBlending);
  const ripples = atlasPlaneLayer(parent, 'vua-cau-ca-splash-ripples', rippleTexture(), count * 2,
    { tint: colors.aqua.clone(), blending: THREE.AdditiveBlending, renderOrder: 3 });
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), dir = new THREE.Vector3(), out = new THREE.Vector3();
  const up = new THREE.Vector3(), s = new THREE.Vector3();
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const ends = [new THREE.Vector3(), new THREE.Vector3()];

  return {
    update(time, rhythm, f) {
      seeds.forEach((seed, i) => {
        const c = time / seed.period + seed.off, n = Math.floor(c), uc = c - n;
        const a0 = seed.base + n * 2.1, since = uc * seed.period, leapTime = LEAP.share * seed.period;
        // Cá: hiện trong lúc vọt, mờ ở hai đầu cho khỏi "bật" ra khỏi mặt nước.
        if (since < leapTime) {
          const u = since / leapTime;
          leapPoint(seed, a0, u, p, dir);
          out.set(Math.sin(a0 + LEAP.span * u), 0, Math.cos(a0 + LEAP.span * u));
          up.crossVectors(out, dir).normalize();
          out.crossVectors(dir, up);
          m.makeBasis(dir, up, out).scale(FISH_SIZE).setPosition(p);
          const alpha = Math.min(1, u * 12, (1 - u) * 12);
          fish.set(i, m, alpha * f, seed.cell);
        } else {
          fish.set(i, m.makeScale(0, 0, 0), 0, seed.cell);
        }
        // Toé nước và gợn: k = 0 lúc vọt lên, k = 1 lúc lặn xuống.
        leapPoint(seed, a0, 0, ends[0]); leapPoint(seed, a0, 1, ends[1]);
        for (let k = 0; k < 2; k++) {
          const dt = since - k * leapTime;
          for (let d = 0; d < DROPS; d++) {
            const j = (i * 2 + k) * DROPS + d;
            if (dt < 0 || dt > SPLASH_LIFE) { drops.set(j, 0, -1, 0, 0, 0, 0); continue; }
            const th = d / DROPS * Math.PI * 2 + i, v = 0.35 + 0.25 * hash(j + 7);
            const x = ends[k].x + Math.cos(th) * v * dt, z = ends[k].z + Math.sin(th) * v * dt;
            const y = 0.05 + (1.1 + 0.5 * hash(j + 9)) * dt - 4.9 * dt * dt;
            drops.set(j, x, Math.max(0.02, y), z, 0.05, 0.05, (1 - dt / SPLASH_LIFE) * f);
          }
          const rk = i * 2 + k;
          if (dt < 0 || dt > RIPPLE_LIFE) ripples.set(rk, m.makeScale(0, 0, 0), 0);
          else {
            const w = dt / RIPPLE_LIFE, size = 0.15 + 0.6 * w;
            ripples.set(rk, m.compose(p.set(ends[k].x, 0.022, ends[k].z), flat, s.set(size, size, 1)), (1 - w) * (0.7 + 0.3 * rhythm.pulse) * f);
          }
        }
      });
      fish.commit(); drops.commit(); ripples.commit();
    },
    dispose() { fish.dispose(); drops.dispose(); ripples.dispose(); },
  };
}
