import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { blossomGeometry, budGeometry, leafGeometry, branchGeometry, branchPoint } from './dao-hoa-geometry.js';
import { floraMaterial } from './dao-hoa-materials.js';
import { hash } from './aura-billboard-layer.js';

// Hai cành đào 3D vắt qua nguyệt môn (toạ độ nhóm aura, mét): cành lớn mọc bên trái, lách qua chỗ
// hở bên trái cổng rồi uốn vòm qua đỉnh; cành nhỏ bên phải lách qua chỗ hở bên phải, vươn vào trên
// vai; gốc cành chìm trong mây hồng. Cả hai chừa trống vùng quanh đầu. Mỗi cành đung đưa chậm quanh gốc; hoa, nụ, lá đi theo cành,
// bông hé nở theo nhịp thở (không đổi tốc độ).
const BRANCHES = [
  { root: [-1.5, 0.48, -0.4], radius: 0.045, sway: 0.022, phase: 0,
    main: [[-1.5, 0.48, -0.4], [-1.42, 0.82, -0.36], [-1.25, 1.25, -0.32], [-1.0, 1.85, -0.3], [-0.6, 2.35, -0.33],
      [0.0, 2.62, -0.38], [0.55, 2.6, -0.4], [0.95, 2.4, -0.42]],
    twigs: [[[-1.0, 1.85, -0.3], [-0.8, 1.74, -0.26], [-0.6, 1.78, -0.24], [-0.45, 1.9, -0.25]],
      [[-0.6, 2.35, -0.33], [-0.66, 2.6, -0.36], [-0.56, 2.85, -0.38]],
      [[0.55, 2.6, -0.4], [0.72, 2.76, -0.4], [0.96, 2.82, -0.42]],
      [[0.95, 2.4, -0.42], [1.05, 2.2, -0.4], [1.0, 2.0, -0.38]]],
    blooms: [[0.3, 0.42, 0.55, 0.63, 0.71, 0.79, 0.87, 0.94], [0.55, 1], [0.75], [1], [0.65]] },
  { root: [1.55, 0.62, -0.42], radius: 0.04, sway: 0.028, phase: 2.1,
    main: [[1.55, 0.62, -0.42], [1.45, 0.9, -0.36], [1.3, 1.3, -0.32], [1.0, 1.6, -0.28], [0.75, 1.72, -0.26], [0.55, 1.7, -0.26]],
    twigs: [[[1.45, 0.9, -0.36], [1.7, 1.05, -0.4], [1.85, 1.3, -0.42]],
      [[1.0, 1.6, -0.28], [1.05, 1.85, -0.3], [0.95, 2.05, -0.32]]],
    blooms: [[0.35, 0.5, 0.62, 0.75, 0.88, 1], [0.6, 1], [1]] },
];

/** Bố cục tĩnh của hoa/nụ/lá: mỗi phần tử { b (cành), pos, rot, s, ph }. */
function layout() {
  const blossoms = [], buds = [], leaves = [];
  let n = 0;
  BRANCHES.forEach((br, b) => {
    [br.main, ...br.twigs].forEach((pts, k) => {
      for (const u of br.blooms[k]) {
        const p = branchPoint(pts, u), j = n++;
        p.x += (hash(j + 3) - 0.5) * 0.08; p.y += (hash(j + 7) - 0.5) * 0.08; p.z += 0.03;
        blossoms.push({ b, pos: p, rot: new THREE.Euler((hash(j + 11) - 0.5) * 0.9, (hash(j + 13) - 0.5) * 1.1, hash(j + 17) * 6.28),
          s: 0.1 + 0.06 * hash(j + 19), ph: hash(j + 23) * 6.28 });
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
    const parts = [branchGeometry(rel(br.main), br.radius), ...br.twigs.map(t => branchGeometry(rel(t), 0.018, 4, 10))];
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
        });
        set[0].instanceMatrix.needsUpdate = true;
      });
      inkMat.uniforms.opacity.value = 0.95 * f; glowMat.uniforms.opacity.value = 0.8 * f;
      glowMat.uniforms.glow.value = rhythm.pulse;
    },
    dispose() {
      meshes.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
      glowMat.dispose(); inkMat.dispose();
    },
  };
}
