import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { blossomGeometry, budGeometry, leafGeometry, branchGeometry, branchPoint } from './dao-hoa-geometry.js';
import { floraMaterial } from './dao-hoa-materials.js';
import { hash } from './aura-billboard-layer.js';
import { softDot } from './aura-rhythm.js';

// Một cành đào già (toạ độ nhóm aura, mét): gốc nấp sau chân trái nguyệt môn, thân leo phía sau vành
// cổng bên trái, vắt vòm qua đỉnh ra phía trước rồi rủ xuống bên phải. Năm nhánh con: vươn ra ngoài,
// vút lên, hai nhánh rủ trước mặt cổng, một nhánh chúc xuống ngoài cổng. Mọi hoa lá ở ngoài vòng
// rỗng giữa cổng, chừa trống quanh đầu. Cành đung đưa rất chậm quanh gốc; hoa, nụ, lá, chỉ hồng
// đi theo cành; bông hé nở theo nhịp thở (không đổi tốc độ).
export const BRANCHES = [
  { root: [-0.84, 0.0, -0.9], radius: 0.055, sway: 0.012, phase: 0,
    main: [[-0.84, 0.0, -0.9], [-1.06, 0.49, -0.92], [-1.28, 1.06, -0.88], [-1.32, 1.63, -0.8], [-1.06, 2.25, -0.6],
      [-0.48, 2.69, -0.45], [0.13, 2.8, -0.4], [0.7, 2.64, -0.38], [1.14, 2.25, -0.38], [1.41, 1.76, -0.4], [1.48, 1.37, -0.42]],
    twigs: [[[-1.32, 1.63, -0.8], [-1.63, 1.85, -0.8], [-1.76, 2.16, -0.78]],
      [[-0.48, 2.69, -0.45], [-0.44, 2.95, -0.45], [-0.26, 3.13, -0.46]],
      [[0.7, 2.64, -0.38], [0.66, 2.38, -0.3], [0.55, 2.16, -0.28]],
      [[1.14, 2.25, -0.38], [1.01, 2.03, -0.3], [0.92, 1.81, -0.28]],
      [[1.41, 1.76, -0.4], [1.67, 1.63, -0.45], [1.76, 1.41, -0.45]]],
    blooms: [[0.42, 0.5, 0.56, 0.62, 0.68, 0.74, 0.8, 0.86, 0.92, 0.97, 1], [0.6, 1], [1], [0.5, 1], [0.55, 1], [1]] },
];

/** Bố cục tĩnh của hoa/nụ/lá: mỗi phần tử { b (cành), pos, rot, s, ph }. */
function layout() {
  const blossoms = [], buds = [], leaves = [];
  let n = 0;
  BRANCHES.forEach((br, b) => {
    [br.main, ...br.twigs].forEach((pts, k) => {
      // Mỗi điểm nở một chùm hai bông (bông lớn mở mặt ra trước, bông nhỏ nghiêng lệch bên).
      for (const u of br.blooms[k]) for (let c = 0; c < 2; c++) {
        const p = branchPoint(pts, u), j = n++, spread = c ? 0.13 : 0.05;
        p.x += (hash(j + 3) - 0.5) * spread * 2; p.y += (hash(j + 7) - 0.5) * spread * 2; p.z += 0.03 + 0.04 * c;
        blossoms.push({ b, pos: p, rot: new THREE.Euler((hash(j + 11) - 0.5) * (0.9 + c), (hash(j + 13) - 0.5) * (1.1 + c), hash(j + 17) * 6.28),
          s: c ? 0.08 + 0.04 * hash(j + 19) : 0.12 + 0.05 * hash(j + 19), ph: hash(j + 23) * 6.28 });
      }
      // Nụ ở chót và giữa nhánh, lá non mọc đôi gần ngọn.
      for (const u of k ? [0.35, 0.92] : [0.2, 0.48, 0.98]) {
        const p = branchPoint(pts, u), j = n++, t = branchPoint(pts, Math.max(0, u - 0.05));
        const dir = Math.atan2(p.y - t.y, p.x - t.x) - Math.PI / 2;
        buds.push({ b, pos: p, rot: new THREE.Euler(0.3, 0, dir + (hash(j) - 0.5) * 0.8), s: 0.05 + 0.025 * hash(j + 5), ph: hash(j + 9) * 6.28 });
        for (const side of [-1, 1]) leaves.push({ b, pos: p.clone(), rot: new THREE.Euler(0.4, side * 0.3, dir + side * (0.7 + 0.3 * hash(j + side))),
          s: 0.13 + 0.05 * hash(j + 2 + side), ph: hash(j + 4 + side) * 6.28 });
      }
    });
  });
  return { blossoms, buds, leaves };
}

export function createBranches(parent, colors, lowQuality) {
  const glowMat = floraMaterial(colors, 0), inkMat = floraMaterial(colors, 1);
  const geometries = [], meshes = [];
  const holders = BRANCHES.map(br => {
    const rel = pts => pts.map(([x, y, z]) => [x - br.root[0], y - br.root[1], z - br.root[2]]);
    const parts = [branchGeometry(rel(br.main), br.radius, 6, 56), ...br.twigs.map(t => branchGeometry(rel(t), 0.02, 4, 10))];
    const geo = mergeGeometries(parts); parts.forEach(g => g.dispose()); geometries.push(geo);
    const holder = new THREE.Group(); holder.position.set(...br.root); parent.add(holder);
    const bark = new THREE.Mesh(geo, inkMat); bark.renderOrder = 6; holder.add(bark);
    return holder;
  });
  const { blossoms, buds, leaves } = layout();
  // glow: có lớp sáng cộng màu không (chất lượng thấp chỉ giữ cho hoa).
  const instanced = (geo, items, name, glow) => {
    const set = [];
    for (const [mat, order, on] of [[inkMat, 6, true], [glowMat, 8, glow]]) {
      if (!on) continue;
      const mesh = new THREE.InstancedMesh(geo, mat, items.length); mesh.name = name; mesh.renderOrder = order;
      if (set.length) mesh.instanceMatrix = set[0].instanceMatrix;
      parent.add(mesh); set.push(mesh); meshes.push(mesh);
    }
    return { set, items };
  };
  const groups = [instanced(blossomGeometry(), blossoms, 'dao-hoa-blossoms', true),
    instanced(budGeometry(), buds, 'dao-hoa-buds', !lowQuality), instanced(leafGeometry(), leaves, 'dao-hoa-leaves', !lowQuality)];
  // Đốm sáng nhụy hoa: một điểm mềm ở tâm mỗi bông, rực lên khi thở ra.
  const glowPos = new Float32Array(blossoms.length * 3), glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3)); geometries.push(glowGeo);
  const dotMat = new THREE.PointsMaterial({ color: colors.core.clone().lerp(colors.edge, 0.4), size: 0.16, map: softDot(),
    transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
  const dots = new THREE.Points(glowGeo, dotMat); dots.name = 'dao-hoa-blossom-glow'; dots.renderOrder = 9; parent.add(dots);

  const local = new THREE.Matrix4(), sway = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const pos = new THREE.Vector3(), scale = new THREE.Vector3(), swayM = BRANCHES.map(() => new THREE.Matrix4());
  const anchors = [];
  return {
    /** Điểm neo đi theo cành (cành b, nhánh k: 0 = cành chính, u 0..1) — để treo chỉ hồng. */
    anchor(b, k, u) {
      const br = BRANCHES[b], local = branchPoint(k ? br.twigs[k - 1] : br.main, u), world = local.clone();
      anchors.push({ b, local, world }); return world;
    },
    update(time, rhythm, f) {
      BRANCHES.forEach((br, b) => {
        const h = holders[b];
        h.rotation.set(0.01 * Math.sin(time * 0.27 + br.phase), 0, br.sway * Math.sin(time * 0.33 + br.phase));
        h.updateMatrix(); swayM[b].copy(h.matrix).multiply(sway.makeTranslation(-br.root[0], -br.root[1], -br.root[2]));
      });
      for (const a of anchors) a.world.copy(a.local).applyMatrix4(swayM[a.b]);
      const open = 0.92 + 0.1 * rhythm.release - 0.05 * rhythm.gather;
      groups.forEach(({ set, items }, g) => {
        items.forEach((it, i) => {
          const flutter = Math.sin(time * 0.8 + it.ph);
          e.set(it.rot.x + 0.08 * flutter, it.rot.y + 0.06 * Math.sin(time * 0.6 + it.ph), it.rot.z + 0.05 * flutter);
          const s = it.s * (g === 0 ? open : g === 1 ? 1 + 0.04 * rhythm.release : 1);
          local.compose(pos.copy(it.pos), q.setFromEuler(e), scale.set(s, s, s));
          set[0].setMatrixAt(i, local.premultiply(swayM[it.b]));
          if (g === 0) glowPos.set([local.elements[12], local.elements[13], local.elements[14] + 0.02], i * 3);
        });
        set[0].instanceMatrix.needsUpdate = true;
      });
      inkMat.uniforms.opacity.value = 0.95 * f; glowMat.uniforms.opacity.value = 0.8 * f;
      glowMat.uniforms.glow.value = rhythm.pulse;
      glowGeo.attributes.position.needsUpdate = true; dotMat.opacity = (0.4 + 0.4 * rhythm.pulse) * f;
    },
    dispose() {
      meshes.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
      glowMat.dispose(); inkMat.dispose(); dotMat.dispose();
    },
  };
}
