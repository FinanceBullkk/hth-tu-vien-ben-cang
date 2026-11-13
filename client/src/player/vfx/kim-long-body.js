import * as THREE from 'three';
import { spineFrame, newFrame, bodyRadius, SPINE_LENGTH } from './kim-long-spine.js';
import { bodyMaterial, mistMaterial, tickAll } from './kim-long-materials.js';
import { createRibbonStrips } from './aura-ribbon-strips.js';

// Thân rồng: ống vảy dày dựng lại trên CPU mỗi khung theo spineFrame (sóng lượn chạy từ đầu về
// đuôi). Tiết diện hơi dẹt ngang; v = 0 là sống lưng, v = 0.5 là bụng. Hai lớp chung geometry:
// thân vảy normal blend (chủ đạo) và viền sáng cộng màu. Thêm dải long khí mềm bám sau lưng, trễ
// pha so với thân như vệt khí kéo theo.
const SCALE_SIZE = 0.075;

export function createDragonBody(parent, colors, lowQuality) {
  const segs = lowQuality ? 80 : 150, radial = lowQuality ? 10 : 16;
  const ringN = radial + 1, count = (segs + 1) * ringN;
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = [], idx = [];
  for (let j = 0; j <= segs; j++) for (let k = 0; k <= radial; k++) {
    uv.push(j / segs, k / radial);
    if (j < segs && k < radial) {
      const a = j * ringN + k, b = a + ringN;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(idx);
  const rows = Math.round(SPINE_LENGTH / SCALE_SIZE);
  const ticks = [], owned = [geometry];
  const skin = bodyMaterial(colors, 0, rows); ticks.push({ m: skin, base: 0.97 }); owned.push(skin);
  const body = new THREE.Mesh(geometry, skin); body.name = 'kim-long-body'; body.renderOrder = 6; parent.add(body);
  if (!lowQuality) {
    const glowMat = bodyMaterial(colors, 1, rows); ticks.push({ m: glowMat, base: 0.55, breathe: 0.4 }); owned.push(glowMat);
    const glow = new THREE.Mesh(geometry, glowMat); glow.name = 'kim-long-body-glow'; glow.renderOrder = 9; parent.add(glow);
  }

  // Long khí: một dải rộng, trễ 0.9 s so với thân, lệch ra phía lưng.
  const mistSeg = lowQuality ? 30 : 60, mist = createRibbonStrips(1, mistSeg);
  const mistMat = mistMaterial(colors); ticks.push({ m: mistMat, base: 0.32, breathe: 0.5 }); owned.push(mist.geometry, mistMat);
  const mistMesh = new THREE.Mesh(mist.geometry, mistMat); mistMesh.name = 'kim-long-dragon-mist'; mistMesh.renderOrder = 4;
  parent.add(mistMesh);

  const fr = newFrame(), c = new THREE.Vector3(), side = new THREE.Vector3();
  const writeBody = time => {
    for (let j = 0; j <= segs; j++) {
      const u = j / segs, r = bodyRadius(u);
      spineFrame(u, time, fr);
      for (let k = 0; k <= radial; k++) {
        const a = (k / radial) * Math.PI * 2, cn = Math.cos(a), sn = Math.sin(a), i = (j * ringN + k) * 3;
        // Hướng toả: cos theo lưng N, sin theo sườn B (dẹt 0.88).
        const nx = fr.n.x * cn + fr.b.x * sn, ny = fr.n.y * cn + fr.b.y * sn, nz = fr.n.z * cn + fr.b.z * sn;
        pos[i] = fr.p.x + (fr.n.x * cn + fr.b.x * sn * 0.88) * r;
        pos[i + 1] = fr.p.y + (fr.n.y * cn + fr.b.y * sn * 0.88) * r;
        pos[i + 2] = fr.p.z + (fr.n.z * cn + fr.b.z * sn * 0.88) * r;
        nor[i] = nx; nor[i + 1] = ny; nor[i + 2] = nz;
      }
    }
    geometry.attributes.position.needsUpdate = true; geometry.attributes.normal.needsUpdate = true;
    geometry.computeBoundingSphere();
    for (let j = 0; j <= mistSeg; j++) {
      const u = 0.04 + 0.9 * (j / mistSeg);
      spineFrame(u, time - 0.9, fr);
      c.copy(fr.p).addScaledVector(fr.n, bodyRadius(u) + 0.05);
      side.copy(fr.b);
      mist.write(0, j, c, side, 0.07 + 0.12 * Math.sin(Math.PI * j / mistSeg));
    }
    mist.commit();
  };

  return {
    body, rows,
    update(time, rhythm, f) { writeBody(time); tickAll(ticks, time, rhythm, f); },
    dispose() { owned.forEach(o => o.dispose()); },
  };
}
