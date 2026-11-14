import * as THREE from 'three';

// Lớp tấm phẳng dùng chung cho hai hào quang chí tôn (Thần bài, Vua câu cá): MỘT InstancedMesh
// (một lần vẽ) gồm nhiều tấm đặt tự do trong không gian (không quay theo camera như billboard),
// mỗi tấm lấy hình từ một ô của atlas canvas. instanceColor.r = độ đậm, .g = ô mặt trước,
// .b = ô mặt sau — lá bài lật thấy lưng. readableBack: mặt sau lật ngược u để chữ trên lá bài đọc xuôi;
// tắt đi cho hình bóng có hướng (cá) để đầu cá luôn ở phía đang bơi tới.
// Atlas chia cols × rows ô, ô 0 ở góc trên trái, đánh số theo hàng.
const quad = new THREE.PlaneGeometry(1, 1); // dùng chung mọi lớp, không dispose

const vertexShader = `
  varying vec2 vUv;
  varying float vAlpha;
  varying vec2 vCells;
  void main() {
    vUv = uv;
    vAlpha = 1.0;
    vCells = vec2(0.0);
    vec4 p = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vAlpha = instanceColor.r; vCells = instanceColor.gb;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * p;
  }
`;

const fragmentShader = `
  uniform sampler2D map;
  uniform vec3 tint;
  uniform vec2 grid;
  uniform float opacity;
  uniform float readableBack;
  varying vec2 vUv;
  varying float vAlpha;
  varying vec2 vCells;
  void main() {
    float cell = floor((gl_FrontFacing ? vCells.x : vCells.y) + 0.5);
    float col = mod(cell, grid.x), row = floor(cell / grid.x);
    // Mặt sau của tấm bị soi gương theo chiều ngang: lật lại u để chữ không ngược.
    float u = gl_FrontFacing || readableBack < 0.5 ? vUv.x : 1.0 - vUv.x;
    vec2 st = vec2((col + u) / grid.x, 1.0 - (row + 1.0 - vUv.y) / grid.y);
    vec4 tex = texture2D(map, st);
    float a = tex.a * vAlpha * opacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(tint * tex.rgb, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * @param {THREE.Object3D} parent
 * @param {string} name tên lớp (test và công cụ soi lớp dựa vào tên)
 * @param {THREE.Texture} map atlas
 * @param {number} count số tấm
 * @param {{ cols?: number, rows?: number, tint?: THREE.Color, blending?: THREE.Blending, renderOrder?: number, readableBack?: boolean }} [options]
 */
export function atlasPlaneLayer(parent, name, map, count, { cols = 1, rows = 1, tint = new THREE.Color(1, 1, 1), blending = THREE.NormalBlending, renderOrder, readableBack = true } = {}) {
  const material = new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, tint: { value: tint }, grid: { value: new THREE.Vector2(cols, rows) }, opacity: { value: 1 },
      readableBack: { value: readableBack ? 1 : 0 } },
    vertexShader, fragmentShader, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending,
  });
  const mesh = new THREE.InstancedMesh(quad, material, count);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  mesh.name = name; mesh.frustumCulled = false;
  mesh.renderOrder = renderOrder ?? (blending === THREE.NormalBlending ? 5 : 8);
  parent.add(mesh);
  const color = new THREE.Color();
  return {
    mesh, material,
    /** Đặt tấm i theo ma trận m (đã gồm vị trí, hướng, kích thước); back mặc định trùng front. */
    set(i, m, alpha, front = 0, back = front) {
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.setRGB(Math.max(0, alpha), front, back));
    },
    commit() { mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; },
    dispose() { mesh.dispose(); material.dispose(); },
  };
}
