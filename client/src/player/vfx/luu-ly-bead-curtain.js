import * as THREE from 'three';
import { dropGeometry } from './drop-geometry.js';
import { createRibbonStrips } from './aura-ribbon-strips.js';
import { ribbonVertex } from './aura-flow-shaders.js';
import { crystalVertex, crystalFragment, canopyFragment, veilFragment } from './luu-ly-shaders.js';
import { hash } from './aura-billboard-layer.js';

// Lưu Ly Châu Liêm — bóng dáng riêng của Lưu Ly: vòm thủy quang cong trên đầu, từ vòm rủ xuống
// mười lăm chuỗi hạt lưu ly như thác (giữa dài, hai bên ngắn dần, khung lấy người mà không che
// mặt vì nằm sau lưng), giữa các chuỗi là màn nước trong chảy xuống. Giọt sáng trượt dọc từng
// chuỗi với tốc độ cố định; chuỗi đung đưa như rèm trong gió, sóng chạy từ trên xuống.
export const ARCH = { y: 1.34, z: -0.34, r: 0.98, span: 1.26 };
const VEILS = [-0.86, -0.3, 0.3, 0.86];

/** Điểm trên vòm theo góc a (0 = đỉnh); hai chân vòm cong ôm ra trước như cánh cửa. */
export function archPoint(a, breathe, out) {
  const r = ARCH.r * (1 + breathe);
  return out.set(Math.sin(a) * r, ARCH.y + Math.cos(a) * r * 0.92, ARCH.z + 0.26 * (1 - Math.cos(a)));
}

function shader(colors, fragmentShader, extra = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { steel: { value: colors.steel }, edge: { value: colors.edge }, core: { value: colors.core },
      gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 }, ink: { value: 0 }, ...extra },
    vertexShader: ribbonVertex, fragmentShader, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
}

export function createBeadCurtain(parent, colors, lowQuality) {
  const strands = lowQuality ? 9 : 15, beadsPer = lowQuality ? 6 : 10, perStrand = beadsPer + 1;
  const materials = [], meshes = [];
  const anchors = Array.from({ length: strands }, (_, i) => -ARCH.span + 2 * ARCH.span * i / (strands - 1));
  const lengths = anchors.map(a => 0.98 + 0.55 * Math.cos(a * 1.15) ** 2);
  // Ba hạt châu lớn: đỉnh vòm và hai chân vòm (góc trên vòm, cỡ).
  const JEWELS = [[0, 0.17], [-ARCH.span - 0.05, 0.12], [ARCH.span + 0.05, 0.12]], jewelBase = strands * perStrand;

  // Hạt: lớp sáng + lớp mực chung ma trận; instanceColor.r = độ bừng của giọt sáng.
  const glowMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { steel: { value: colors.steel }, edge: { value: colors.edge }, core: { value: colors.core },
      gold: { value: colors.gold }, time: { value: 0 }, opacity: { value: 1 }, ink: { value: 0 } },
    vertexShader: crystalVertex, fragmentShader: crystalFragment, blending: THREE.AdditiveBlending });
  const inkMat = glowMat.clone(); inkMat.uniforms.ink.value = 1; inkMat.blending = THREE.NormalBlending;
  // clone() sao chép uniform màu thành bản riêng — trỏ lại bảng màu chung cho gọn.
  for (const k of ['steel', 'edge', 'core', 'gold']) inkMat.uniforms[k].value = colors[k];
  materials.push(glowMat, inkMat);
  const beads = new THREE.InstancedMesh(dropGeometry(), glowMat, jewelBase + JEWELS.length);
  beads.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array((jewelBase + JEWELS.length) * 3), 3);
  beads.name = 'luu-ly-beads'; beads.renderOrder = 8; parent.add(beads); meshes.push(beads);
  if (!lowQuality) {
    const ink = new THREE.InstancedMesh(dropGeometry(), inkMat, jewelBase + JEWELS.length);
    ink.instanceMatrix = beads.instanceMatrix; ink.name = 'luu-ly-beads-ink'; ink.renderOrder = 7;
    parent.add(ink); meshes.push(ink);
  }

  // Dải: vòm (1 dải chính + 2 tơ), dây chuỗi châu, màn nước.
  const seg = lowQuality ? 24 : 48, arch = createRibbonStrips(3, seg);
  const threadSeg = 12, threads = createRibbonStrips(strands + VEILS.length, threadSeg);
  const archMat = shader(colors, canopyFragment), veilMat = shader(colors, veilFragment);
  materials.push(archMat, veilMat);
  const archMesh = new THREE.Mesh(arch.geometry, archMat); archMesh.name = 'luu-ly-canopy'; archMesh.renderOrder = 7;
  const veilMesh = new THREE.Mesh(threads.geometry, veilMat); veilMesh.name = 'luu-ly-veils'; veilMesh.renderOrder = 6;
  for (const m of [archMesh, veilMesh]) { m.frustumCulled = false; parent.add(m); }
  const geometries = [arch.geometry, threads.geometry];

  const p = new THREE.Vector3(), q = new THREE.Vector3(), radial = new THREE.Vector3();
  const side = new THREE.Vector3(1, 0, 0.25).normalize(), dummy = new THREE.Object3D(), tint = new THREE.Color();
  // Vị trí trên chuỗi k ở độ sâu s (0 = điểm treo); đung đưa tăng dần xuống dưới, sóng chạy xuống.
  const hang = (a, s, len, k, time, breathe, out) => {
    archPoint(a, breathe, out);
    const w = (s / len) ** 1.5;
    return out.set(out.x + 0.1 * w * Math.sin(time * 0.5 + k * 0.7 - s * 2.2),
      out.y - s, out.z + 0.07 * w * Math.sin(time * 0.4 + k * 1.3 - s * 2.2));
  };

  return {
    update(time, rhythm, f) {
      const breathe = 0.03 * rhythm.release - 0.015 * rhythm.gather;
      // Vòm: dải chính quét quá hai chân vòm một chút để tan vào mây; hai tơ lệch bán kính.
      for (let k = 0; k < 3; k++) {
        const dr = [0, 0.08, -0.07][k], w = [0.095, 0.014, 0.01][k];
        for (let j = 0; j <= seg; j++) {
          const a = -ARCH.span - 0.14 + (2 * ARCH.span + 0.28) * j / seg;
          archPoint(a, breathe + dr + 0.012 * Math.sin(time * 0.6 + a * 3 + k), p);
          radial.set(Math.sin(a), Math.cos(a) * 0.92, 0).normalize();
          arch.write(k, j, p, radial, w);
        }
      }
      arch.commit();
      // Chuỗi châu: hạt cách đều, hạt cuối là giọt mặt dây lớn, đầu nhọn chĩa xuống.
      anchors.forEach((a, k) => {
        const len = lengths[k] * (1 + 0.04 * rhythm.release), slide = (time * 0.11 + hash(k + 7)) % 1;
        for (let b = 0; b < perStrand; b++) {
          const pendant = b === beadsPer, s = pendant ? len : len * (b + 0.6) / perStrand;
          hang(a, s, len, k, time, breathe, dummy.position);
          const size = pendant ? 0.12 : (b % 2 ? 0.055 : 0.075);
          dummy.rotation.set(0, 0, pendant ? Math.PI : 0); dummy.scale.setScalar(size); dummy.updateMatrix();
          const i = k * perStrand + b;
          beads.setMatrixAt(i, dummy.matrix);
          const glint = Math.exp(-((s / len - slide) ** 2) * 70);
          beads.setColorAt(i, tint.setRGB(glint + 0.25 * rhythm.pulse + (pendant ? 0.25 : 0), 0, 0));
        }
        for (let j = 0; j <= threadSeg; j++) threads.write(k, j, hang(a, len * j / threadSeg, len, k, time, breathe, p), side, 0.004);
      });
      // Hạt châu lớn đậu trên vòm, xoay chậm quanh trục đứng, sáng theo nhịp.
      JEWELS.forEach(([a, size], j) => {
        archPoint(a, breathe, dummy.position); dummy.position.y -= size * 0.35; dummy.position.z += 0.03;
        dummy.rotation.set(0, time * 0.3 + j, 0); dummy.scale.setScalar(size); dummy.updateMatrix();
        beads.setMatrixAt(jewelBase + j, dummy.matrix);
        beads.setColorAt(jewelBase + j, tint.setRGB(0.35 + 0.5 * rhythm.pulse, 0, 0));
      });
      beads.instanceMatrix.needsUpdate = true; beads.instanceColor.needsUpdate = true;
      // Màn nước rủ giữa các chuỗi, ngắn hơn chuỗi bên cạnh, rộng ở đỉnh.
      VEILS.forEach((a, v) => {
        const len = (0.85 + 0.5 * Math.cos(a * 1.15) ** 2) * (1 + 0.05 * rhythm.release);
        for (let j = 0; j <= threadSeg; j++) {
          const u = j / threadSeg;
          hang(a, len * u, len, v + 3, time * 0.8, breathe, q); q.z -= 0.04;
          threads.write(strands + v, j, q, side, 0.17 * (1 - 0.3 * u));
        }
      });
      threads.commit();
      for (const m of [archMat, veilMat, glowMat, inkMat]) m.uniforms.time.value = time;
      archMat.uniforms.opacity.value = (0.8 + 0.2 * rhythm.pulse) * f;
      veilMat.uniforms.opacity.value = (1.0 + 0.2 * rhythm.release) * f;
      glowMat.uniforms.opacity.value = 0.9 * f; inkMat.uniforms.opacity.value = 0.5 * f;
    },
    dispose() { meshes.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
