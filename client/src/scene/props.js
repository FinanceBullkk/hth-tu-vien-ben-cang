// Tải model GLB dựng bằng Blender (tools/blender/) và áp style flat của game.
// File thiếu hoặc lỗi thì resolve(null) — module gọi tự dựng bản code thay thế,
// game không bao giờ vỡ (cùng quy ước với avatar-weapon.js).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { flatMaterial } from './builders.js';

const loader = new GLTFLoader();
const cache = new Map(); // file -> Promise<Object3D | null>

export function loadProp(file) {
  if (!cache.has(file)) {
    cache.set(file, new Promise((resolve) => {
      loader.load(`/models/${file}`,
        (gltf) => resolve(gltf.scene),
        undefined,
        () => resolve(null),
      );
    }));
  }
  return cache.get(file);
}

/**
 * Đổi material theo quy ước tên node đặt trong Blender:
 *   flame/glow -> MeshBasicMaterial phát sáng (đẩy vào danh sách để update nhấp sáng),
 *   water      -> Lambert trong suốt,
 *   còn lại    -> flatMaterial vertex colors (khớp Batch của game).
 */
export function applyFlatStyle(root, { glows = [], flames = [], waters = [], cloths = [] } = {}) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === 'flame' || o.name === 'glow') {
      o.material = new THREE.MeshBasicMaterial({ vertexColors: true });
      (o.name === 'flame' ? flames : glows).push(o.material);
      o.castShadow = false;
      o.receiveShadow = false;
    } else if (o.name === 'water') {
      o.material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.82 });
      waters.push(o.material);
    } else {
      o.material = flatMaterial();
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.name === 'cloth') cloths.push(o);
    }
  });
  return root;
}

/** Tải và đặt một prop vào scene; trả về rig đã đặt, hoặc null nếu file không có. */
export async function placeProp(scene, file, opts = {}) {
  const template = await loadProp(file);
  if (!template) return null;
  const rig = template.clone(true);
  applyFlatStyle(rig, opts);
  rig.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
  rig.rotation.y = opts.ry ?? 0;
  if (opts.s !== undefined && opts.s !== 1) rig.scale.setScalar(opts.s);
  scene.add(rig);
  return rig;
}
