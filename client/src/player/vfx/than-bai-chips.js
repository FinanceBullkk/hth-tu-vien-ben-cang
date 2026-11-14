import * as THREE from 'three';
import { billboardLayer, hash } from './aura-billboard-layer.js';
import { bell, softDot, sstep } from './aura-rhythm.js';
import { chipFragment, instancedLayer, litMaterial } from './vip-aura-shaders.js';
import { chipMaskTexture } from './than-bai-textures.js';

// Phỉnh và kim quang của Thần bài. Phỉnh là trụ dẹt 3D (mặt khảm chữ 財, vạch trắng quanh mép), ba màu
// đỏ son / đen / ngọc bích:
//  - Mạch phỉnh: phỉnh tung từ quanh chân lên cao, lộn nhào, chậm dần rồi tan.
//  - Nổ hũ: lúc "tất tay" một vòng phỉnh bung từ tâm toả ra bốn phía theo đường parabol.
//  - Kim quang: hạt vàng li ti xoắn lên quanh thân, dày lên lúc nổ hũ.
const CHIP_LIFE = 3.2, SPARK_LIFE = 4.2;
const chipGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 28, 1); // dùng chung, không dispose
const CHIP = new THREE.Vector3(0.13, 0.022, 0.13);

export function createThanBaiChips(parent, colors, lowQuality) {
  const stream = lowQuality ? 8 : 16, jackpot = lowQuality ? 10 : 20, sparkCount = lowQuality ? 14 : 34;
  const chips = instancedLayer(parent, 'than-bai-chips', chipGeo, litMaterial(chipFragment, {
    map: { value: chipMaskTexture() }, white: { value: new THREE.Color('#fff6e4') }, gold: { value: colors.gold }, light: { value: colors.light },
  }), stream + jackpot, 7);
  const sparks = billboardLayer(parent, 'than-bai-gold-sparks', softDot(), sparkCount, colors.light.clone(), THREE.AdditiveBlending);
  const seeds = Array.from({ length: stream + jackpot }, (_, i) => ({
    a: i / (i < stream ? stream : jackpot) * Math.PI * 2 + hash(i + 1) * 0.5, off: hash(i + 11), h: 1.3 + 0.6 * hash(i + 21),
    spin: 2 + 3 * hash(i + 31), yaw: hash(i + 41) * 6.28, reach: 1.3 + 0.6 * hash(i + 51), lift: 1.9 + 0.8 * hash(i + 61),
  }));
  const sparkSeeds = Array.from({ length: sparkCount }, (_, i) => ({ a: hash(i + 71) * Math.PI * 2, off: hash(i + 81), r: 0.4 + 0.65 * hash(i + 91) }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3();

  return {
    update(time, rhythm, f) {
      const b = sstep(0.43, 0.66, rhythm.phase), boom = bell(0.45, 0.05, rhythm.phase);
      seeds.forEach((s, i) => {
        let alpha;
        if (i < stream) {
          const u = ((time / CHIP_LIFE + s.off) % 1 + 1) % 1, ang = s.a + u * 1.4, r = 0.5 + 0.5 * u;
          p.set(Math.sin(ang) * r, 0.08 + s.h * (1 - (1 - u) * (1 - u)), Math.cos(ang) * r);
          e.set(u * Math.PI * s.spin, s.yaw + u * 2, u * Math.PI * 1.5);
          alpha = Math.min(1, u * 8) * Math.pow(1 - u, 0.6);
        } else {
          // Nổ hũ: bay theo parabol ra xa, chỉ hiện trong cửa sổ cao trào.
          const r = 0.15 + s.reach * b;
          p.set(Math.sin(s.a) * r, 0.25 + s.lift * b - (s.lift + 0.3) * b * b, Math.cos(s.a) * r);
          e.set(b * Math.PI * s.spin * 2, s.yaw, b * Math.PI * 3);
          alpha = b > 0.001 && b < 0.999 ? Math.min(1, (1 - b) * 4) : 0;
        }
        q.setFromEuler(e);
        chips.set(i, m.compose(p, q, CHIP), alpha * f, i % 3);
      });
      chips.commit();
      chips.material.uniforms.time.value = time;
      sparkSeeds.forEach(({ a, off, r }, i) => {
        const u = ((time / SPARK_LIFE + off) % 1 + 1) % 1, ang = a + time * 0.5 + u * 2.2;
        const tw = 0.6 + 0.4 * Math.sin(time * 6 + i * 2.3), size = (0.035 + 0.03 * tw) * (1 + boom);
        sparks.set(i, Math.sin(ang) * r * (1 + 0.4 * boom), 0.1 + u * 2.0, Math.cos(ang) * r * (1 + 0.4 * boom), size, size,
          Math.sin(Math.PI * u) * tw * (0.6 + 0.4 * rhythm.pulse + boom) * f);
      });
      sparks.commit();
    },
    dispose() { chips.dispose(); sparks.dispose(); },
  };
}
