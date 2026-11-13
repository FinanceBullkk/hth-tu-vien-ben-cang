import * as THREE from 'three';
import { featherGeometry, petalGeometry, featherMaterial, featherSet } from './hong-lien-materials.js';
import { softDot } from './aura-rhythm.js';

// Hai lớp 3D bay bổng riêng của Hồng Liên (thay dải lưu quang và phiêu đái dùng chung của các aura khác):
//  lông vũ lửa xoắn ốc bay lên — mỗi chiếc nhỏ dần ở hai đầu hành trình, xoay theo đường xoắn;
//  hoa đăng sen — vài đóa sen nhỏ sáu cánh có lõi sáng trôi vòng quanh người ngang hông, nhấp nhô như trên mặt hồ.
// Tốc độ cố định và rất chậm; nhịp thở chỉ làm lông sáng lên và sen hé nở.
export function createRisingFeathers(parent, colors, lowQuality) {
  const n = lowQuality ? 5 : 10;
  const glowMat = featherMaterial(colors, 0, 0), inkMat = featherMaterial(colors, 1, 0);
  const set = featherSet(parent, featherGeometry(), n, glowMat, inkMat, lowQuality, 'hong-lien-spiral');
  const dummy = new THREE.Object3D(); dummy.rotation.order = 'YXZ';
  return {
    update(time, rhythm, f) {
      for (let i = 0; i < n; i++) {
        const u = ((i / n + time * 0.028) % 1 + 1) % 1, a = i * 2.39996 + u * 3.6;
        const r = 0.82 - 0.22 * u, life = Math.sin(Math.PI * u), s = 0.34 * Math.pow(life, 0.7);
        dummy.position.set(Math.sin(a) * r, 0.15 + u * 2.3, Math.cos(a) * r);
        // Lông nằm dọc theo hướng bay (tiếp tuyến xoắn), nghiêng lên và lật nhẹ như lượn gió.
        dummy.rotation.set(-1.15 + 0.15 * Math.sin(time * 0.5 + i), a + Math.PI / 2, 0.3 * Math.sin(time * 0.4 + i * 2));
        dummy.scale.set(s * 1.4, s, s); dummy.updateMatrix();
        set.glow.setMatrixAt(i, dummy.matrix);
      }
      set.glow.instanceMatrix.needsUpdate = true;
      for (const m of [glowMat, inkMat]) { m.uniforms.time.value = time; m.uniforms.pulse.value = rhythm.pulse; }
      glowMat.uniforms.opacity.value = (0.7 + 0.25 * rhythm.release) * f; inkMat.uniforms.opacity.value = 0.45 * f;
    },
    dispose() { set.dispose(); glowMat.dispose(); inkMat.dispose(); },
  };
}

const PETALS = 6;
export function createLotusLanterns(parent, colors, lowQuality) {
  const n = lowQuality ? 3 : 5;
  const glowMat = featherMaterial(colors, 0, 1), inkMat = featherMaterial(colors, 1, 1);
  const set = featherSet(parent, petalGeometry(), n * PETALS, glowMat, inkMat, lowQuality, 'hong-lien-lanterns');
  const corePos = new Float32Array(n * 3), coreGeo = new THREE.BufferGeometry();
  coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
  const coreMat = new THREE.PointsMaterial({ color: colors.gold, size: 0.16, map: softDot(), transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending });
  const cores = new THREE.Points(coreGeo, coreMat); cores.frustumCulled = false; parent.add(cores);
  const lantern = new THREE.Object3D(), petal = new THREE.Object3D(); petal.rotation.order = 'YXZ'; lantern.add(petal);
  return {
    update(time, rhythm, f) {
      const open = 0.75 + 0.18 * rhythm.release - 0.1 * rhythm.gather;
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2 + time * 0.035, r = 1.18 + 0.08 * Math.sin(time * 0.3 + k * 2);
        lantern.position.set(Math.sin(a) * r, 0.55 + 0.1 * Math.sin(time * 0.45 + k * 1.9), Math.cos(a) * r);
        lantern.rotation.set(0.08 * Math.sin(time * 0.5 + k), time * 0.05 + k, 0.08 * Math.cos(time * 0.4 + k));
        lantern.updateMatrixWorld(true);
        corePos.set([lantern.position.x, lantern.position.y + 0.04, lantern.position.z], k * 3);
        for (let i = 0; i < PETALS; i++) {
          const pa = i / PETALS * Math.PI * 2;
          petal.position.set(Math.sin(pa) * 0.03, 0, Math.cos(pa) * 0.03);
          petal.rotation.set(open, pa, 0); petal.scale.set(0.3, 0.17, -0.17);
          petal.updateMatrixWorld(true);
          set.glow.setMatrixAt(k * PETALS + i, petal.matrixWorld);
        }
      }
      set.glow.instanceMatrix.needsUpdate = true; coreGeo.attributes.position.needsUpdate = true;
      for (const m of [glowMat, inkMat]) { m.uniforms.time.value = time; m.uniforms.pulse.value = rhythm.pulse; }
      glowMat.uniforms.opacity.value = (0.8 + 0.15 * rhythm.release) * f; inkMat.uniforms.opacity.value = 0.5 * f;
      coreMat.opacity = (0.55 + 0.3 * rhythm.pulse) * f;
    },
    dispose() { set.dispose(); glowMat.dispose(); inkMat.dispose(); coreGeo.dispose(); coreMat.dispose(); },
  };
}
