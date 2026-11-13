// Gộp các mảnh tĩnh của một nhóm thành ít mesh nhất có thể, để giảm số lần vẽ mỗi khung.
// Mỗi mesh riêng là một lần vẽ (nhân đôi khi đổ bóng); quầy hàng, bàn chơi, chồng chip có hàng chục mảnh nhỏ.
// Chỉ dùng cho nhóm mà sau khi dựng không ai còn xoay, đổi màu hay ẩn từng mảnh con nữa.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const BAKEABLE = new Set(['MeshLambertMaterial', 'MeshBasicMaterial', 'MeshPhongMaterial']);
const bakedMaterials = new Map(); // Dùng chung giữa các nhóm: cùng kiểu vật liệu thì cùng một material.
const _rel = new THREE.Matrix4();
const _inv = new THREE.Matrix4();

/**
 * Vật liệu không texture thì màu có thể chuyển vào từng đỉnh, nhờ vậy các mảnh khác màu
 * nhưng cùng kiểu vật liệu gộp được chung một lần vẽ. Trả về null nếu không chuyển được.
 */
function bakeSignature(m) {
  if (!BAKEABLE.has(m.type) || m.map || m.vertexColors || m.alphaMap || m.envMap) return null;
  return JSON.stringify([
    m.type, m.side, m.transparent, m.opacity, m.depthWrite, m.depthTest, m.blending, m.flatShading ?? false,
    m.emissive?.getHex() ?? 0, m.emissiveIntensity ?? 1, m.specular?.getHex() ?? 0, m.shininess ?? 0,
    m.toneMapped, m.fog, m.wireframe, m.polygonOffset,
  ]);
}

function bakedMaterial(source, signature) {
  let m = bakedMaterials.get(signature);
  if (!m) {
    m = source.clone();
    m.color.setRGB(1, 1, 1);
    m.vertexColors = true;
    m.name = 'merged-static';
    bakedMaterials.set(signature, m);
  }
  return m;
}

/** Cắt một nhóm vật liệu (geometry.groups) của geometry không index ra thành geometry riêng. */
function slice(geometry, start, count) {
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    const size = attr.itemSize;
    out.setAttribute(name, new THREE.BufferAttribute(attr.array.slice(start * size, (start + count) * size), size, attr.normalized));
  }
  return out;
}

/** Chỉ giữ thuộc tính cần cho vật liệu đích, để mọi mảnh trong một nhóm khớp nhau khi gộp. */
function keepAttributes(geometry, names) {
  for (const name of Object.keys(geometry.attributes)) if (!names.includes(name)) geometry.deleteAttribute(name);
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  return names.every((n) => geometry.attributes[n]);
}

function mergeable(mesh) {
  return mesh.isMesh && !mesh.isInstancedMesh && !mesh.isSkinnedMesh && mesh.visible
    && !mesh.morphTargetInfluences && !mesh.userData.noMerge && mesh.geometry?.attributes.position;
}

/**
 * Gộp mọi mesh tĩnh trong group (tính cả nhóm con) theo vật liệu và cách đổ bóng.
 * Mesh gộp nằm thẳng trong group, toạ độ theo khung của group; group vẫn di chuyển, xoay được như cũ.
 * Mảnh nào không gộp được (ẩn, gương lật, mesh đặc biệt) giữ nguyên chỗ cũ.
 * @param {THREE.Object3D} group
 * @returns {number} số lần vẽ bớt được
 */
export function mergeStaticMeshes(group) {
  group.updateMatrixWorld(true);
  _inv.copy(group.matrixWorld).invert();
  const buckets = new Map();
  const merged = [];

  group.traverse((mesh) => {
    if (mesh === group || !mergeable(mesh)) return;
    _rel.multiplyMatrices(_inv, mesh.matrixWorld);
    if (_rel.determinant() <= 0) return; // Gương lật đảo chiều mặt, để nguyên cho khỏi sai bóng.
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geometry.applyMatrix4(_rel);
    const total = geometry.attributes.position.count;
    // Một vật liệu thì three bỏ qua geometry.groups (BoxGeometry luôn có 6 nhóm), nên cả khối là một phần.
    const ranges = Array.isArray(mesh.material) && geometry.groups.length
      ? geometry.groups.map((g) => ({ material: mesh.material[g.materialIndex ?? 0], start: g.start, count: Math.min(g.count, total - g.start) }))
      : [{ material: mesh.material, start: 0, count: total }];
    const parts = [];
    for (const { material, start, count } of ranges) {
      if (!material || count <= 0) continue;
      const piece = ranges.length > 1 ? slice(geometry, start, count) : geometry;
      const signature = bakeSignature(material);
      if (!keepAttributes(piece, signature ? ['position', 'normal'] : ['position', 'normal', 'uv'])) return; // Để nguyên mesh này.
      parts.push({ material, piece, signature });
    }
    for (const { material, piece, signature } of parts) {
      const key = `${signature ?? material.uuid}|${mesh.castShadow}|${mesh.receiveShadow}|${mesh.renderOrder}`;
      if (signature) {
        const n = piece.attributes.position.count;
        const colors = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) material.color.toArray(colors, i * 3);
        piece.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { material: signature ? bakedMaterial(material, signature) : material, mesh, pieces: [] };
        buckets.set(key, bucket);
      }
      bucket.pieces.push(piece);
    }
    merged.push(mesh);
  });

  if (merged.length < 2) return 0;
  for (const mesh of merged) mesh.removeFromParent();
  for (const { material, mesh, pieces } of buckets.values()) {
    const out = new THREE.Mesh(mergeGeometries(pieces, false), material);
    out.castShadow = mesh.castShadow;
    out.receiveShadow = mesh.receiveShadow;
    out.renderOrder = mesh.renderOrder;
    out.userData.mergedStatic = true;
    group.add(out);
  }
  return merged.length - buckets.size;
}

/** Giải phóng geometry đã gộp trong group (mỗi geometry gộp là bản riêng, không ai dùng chung). */
export function disposeMergedMeshes(group) {
  group.traverse((o) => {
    if (o.userData.mergedStatic) o.geometry.dispose();
  });
}
