import * as THREE from 'three';
import { billboardVertex, billboardFragment } from './aura-flow-shaders.js';

// Lớp hạt billboard dùng chung các aura pháp tướng — mỗi lớp là MỘT InstancedMesh (một lần vẽ),
// luôn quay mặt về camera; độ đậm từng hạt ở instanceColor.r, góc xoay ở instanceColor.g.
const quad = new THREE.PlaneGeometry(1, 1); // dùng chung mọi lớp, không dispose

/** Số giả ngẫu nhiên tất định 0..1 theo chỉ số (hạt đặt cố định, không cần trạng thái). */
export const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

/** options.vertexShader / options.uniforms: thay shader đỉnh (cùng quy ước instanceColor) và thêm
    uniform riêng, ví dụ lớp sao chừa mặt của Tinh Hà; mặc định giữ shader billboard chung. */
export function billboardLayer(parent, name, map, count, tint, blending, { vertexShader = billboardVertex, uniforms = {} } = {}) {
  const material = new THREE.ShaderMaterial({ uniforms: { map: { value: map }, tint: { value: tint }, opacity: { value: 1 }, ...uniforms },
    vertexShader, fragmentShader: billboardFragment,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending });
  const mesh = new THREE.InstancedMesh(quad, material, count);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  mesh.name = name; mesh.frustumCulled = false; mesh.renderOrder = blending === THREE.NormalBlending ? 5 : 8;
  parent.add(mesh);
  const m = new THREE.Matrix4(), color = new THREE.Color();
  return { mesh, material,
    set(i, x, y, z, sx, sy, alpha, spin = 0) {
      m.makeScale(sx, sy, 1).setPosition(x, y, z); mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.setRGB(Math.max(0, alpha), spin, 0));
    },
    commit() { mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; },
    dispose() { mesh.dispose(); material.dispose(); },
  };
}
