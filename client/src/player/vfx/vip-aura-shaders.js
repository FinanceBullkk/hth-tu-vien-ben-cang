import * as THREE from 'three';

// Shader dùng chung hai hào quang chí tôn (Thần bài, Vua câu cá). Ánh sáng tính trong không gian nhìn
// (đèn cố định theo camera) nên vật 3D luôn đọc rõ khối ở mọi góc; viền mực ở mép như Kim Long để
// bóng dáng không nhoè vào nền sáng. Mọi vật liệu: transparent, không ghi depth (avatar làm mờ được).

// Đỉnh có ánh sáng: hỗ trợ cả mesh thường lẫn InstancedMesh; vCells/vAlpha lấy từ instanceColor
// (.r độ đậm, .g/.b tham số riêng của từng lớp), vSeed là số lệch pha theo vị trí instance.
export const litVertex = `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vObjN;
  varying vec2 vUv;
  varying float vAlpha;
  varying vec2 vCells;
  varying float vSeed;
  varying float vLocalY;
  void main() {
    vUv = uv; vObjN = normal; vAlpha = 1.0; vCells = vec2(0.0);
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vAlpha = instanceColor.r; vCells = instanceColor.gb;
    #endif
    vSeed = fract(sin(dot(p.xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    vLocalY = p.y;
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const LIGHT = 'normalize(vec3(0.35, 0.8, 0.5))';

// Kim loại vàng đúc: khuếch tán + phản chiếu bầu trời giả + điểm sáng gắt + vệt sáng lướt + viền mực.
export const goldFragment = `
  uniform vec3 deep, gold, light, ink;
  uniform float time, opacity, pulse;
  varying vec3 vN; varying vec3 vV; varying vec3 vObjN; varying vec2 vUv;
  varying float vAlpha; varying vec2 vCells; varying float vSeed; varying float vLocalY;
  void main() {
    vec3 n = normalize(vN), v = normalize(vV), L = ${LIGHT};
    if (!gl_FrontFacing) n = -n;
    float ndl = max(dot(n, L), 0.0), fres = 1.0 - abs(dot(n, v));
    vec3 r = reflect(-v, n);
    vec3 col = mix(deep, gold, 0.3 + 0.7 * ndl);
    col = mix(col, light, pow(0.5 + 0.5 * r.y, 4.0) * 0.55);
    col += light * pow(max(dot(reflect(-L, n), v), 0.0), 30.0) * 1.1;
    float sweep = pow(0.5 + 0.5 * sin(dot(vV, vec3(2.3, 3.1, 0.0)) * 0.9 - time * 2.2 + vSeed * 6.3), 18.0);
    col += light * (sweep * 0.55 + pulse * 0.45);
    col = mix(col, ink, smoothstep(0.62, 0.97, fres) * 0.5);
    float a = opacity * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Lá bài 3D (hộp mỏng): mặt trước/sau lấy ô atlas theo vCells.x/.y, cạnh dày là viền vàng.
// Ánh kim tuyến: vệt sáng chéo lướt qua lá, chỗ in vàng thì lóe mạnh, mép lá óng ánh cầu vồng nhẹ.
export const cardFragment = `
  uniform sampler2D map;
  uniform vec2 grid;
  uniform vec3 gold, light;
  uniform float time, opacity, flash;
  varying vec3 vN; varying vec3 vV; varying vec3 vObjN; varying vec2 vUv;
  varying float vAlpha; varying vec2 vCells; varying float vSeed; varying float vLocalY;
  void main() {
    vec3 n = normalize(vN), v = normalize(vV);
    float fres = pow(1.0 - abs(dot(n, v)), 2.0);
    float ndl = 0.62 + 0.38 * abs(dot(n, ${LIGHT}));
    float band = pow(max(0.0, sin((vUv.x * 0.8 + vUv.y) * 5.0 - time * 1.8 + vSeed * 6.2831)), 22.0);
    vec3 col; float a = 1.0;
    if (abs(vObjN.z) > 0.5) {
      float cell = floor((vObjN.z > 0.0 ? vCells.x : vCells.y) + 0.5);
      float cx = mod(cell, grid.x), cy = floor(cell / grid.x);
      vec4 tex = texture2D(map, vec2((cx + vUv.x) / grid.x, 1.0 - (cy + 1.0 - vUv.y) / grid.y));
      a = tex.a;
      float goldMask = smoothstep(0.1, 0.3, tex.r - tex.b) * step(0.42, tex.g);
      vec3 irid = 0.5 + 0.5 * cos(6.2831 * (fres + vUv.y * 0.7 + time * 0.08 + vec3(0.0, 0.33, 0.67)));
      col = tex.rgb * ndl + goldMask * (light * band * 1.5 + irid * 0.16) + band * 0.12 + irid * fres * 0.22;
    } else {
      col = mix(gold, light, 0.35 + 0.65 * band);
    }
    col += light * flash;
    a *= vAlpha * opacity;
    if (a < 0.02) discard;
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Phỉnh 3D (trụ dẹt): mặt trên/dưới lấy texture mặt nạ kênh màu (R nền, G vạch trắng, B khảm vàng),
// thân trụ là vạch sọc quanh mép. vCells.x chọn màu phỉnh: 0 đỏ son, 1 đen, 2 ngọc bích.
export const chipFragment = `
  uniform sampler2D map;
  uniform vec3 white, gold, light;
  uniform float time, opacity;
  varying vec3 vN; varying vec3 vV; varying vec3 vObjN; varying vec2 vUv;
  varying float vAlpha; varying vec2 vCells; varying float vSeed; varying float vLocalY;
  void main() {
    vec3 n = normalize(vN), v = normalize(vV);
    float ndl = max(dot(n, ${LIGHT}), 0.0), fres = 1.0 - abs(dot(n, v));
    float k = floor(vCells.x + 0.5);
    vec3 base = k < 0.5 ? vec3(0.72, 0.05, 0.09) : k < 1.5 ? vec3(0.06, 0.05, 0.08) : vec3(0.03, 0.42, 0.3);
    vec3 col; float a = 1.0;
    if (abs(vObjN.y) > 0.5) {
      vec4 m = texture2D(map, vUv);
      a = m.a;
      col = base * m.r + white * m.g + gold * m.b;
    } else {
      col = mix(base, white, step(0.5, fract(vUv.x * 12.0)) * 0.9);
    }
    col *= 0.55 + 0.45 * ndl;
    col += light * pow(max(dot(reflect(-${LIGHT}, n), v), 0.0), 24.0) * 0.8;
    col += gold * fres * 0.3;
    a *= vAlpha * opacity;
    if (a < 0.02) discard;
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Xúc xắc vàng: atlas 3×3 ô (sáu mặt chấm), thân vàng kim loại, chấm hồng ngọc rực lên theo nhịp.
export const diceFragment = `
  uniform sampler2D map;
  uniform vec3 deep, gold, light, ruby;
  uniform float time, opacity, pulse;
  varying vec3 vN; varying vec3 vV; varying vec3 vObjN; varying vec2 vUv;
  varying float vAlpha; varying vec2 vCells; varying float vSeed; varying float vLocalY;
  void main() {
    vec3 n = normalize(vN), v = normalize(vV), L = ${LIGHT};
    float ndl = max(dot(n, L), 0.0), fres = 1.0 - abs(dot(n, v));
    vec4 tex = texture2D(map, vUv);
    float pip = smoothstep(0.4, 0.6, tex.r - tex.g);
    vec3 col = mix(deep, gold, 0.3 + 0.7 * ndl);
    col = mix(col, light, pow(0.5 + 0.5 * reflect(-v, n).y, 4.0) * 0.5);
    col += light * pow(max(dot(reflect(-L, n), v), 0.0), 30.0);
    col = mix(col, ruby * (1.0 + 1.6 * pulse), pip);
    col = mix(col, deep * 0.4, smoothstep(0.7, 0.98, fres) * 0.45);
    float a = opacity * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Vật liệu shader có ánh sáng dùng chung: uniforms riêng của từng lớp, luôn trong suốt và không ghi depth. */
export function litMaterial(fragmentShader, uniforms, { side = THREE.FrontSide, blending = THREE.NormalBlending } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, opacity: { value: 1 }, ...uniforms },
    vertexShader: litVertex, fragmentShader, transparent: true, depthWrite: false, side, blending,
  });
}

/** Lớp InstancedMesh với instanceColor (.r độ đậm, .g/.b tham số riêng) theo quy ước của litVertex. */
export function instancedLayer(parent, name, geometry, material, count, renderOrder = 6) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  mesh.name = name; mesh.frustumCulled = false; mesh.renderOrder = renderOrder;
  parent.add(mesh);
  const c = new THREE.Color();
  return {
    mesh, material,
    set(i, matrix, alpha, a = 0, b = a) { mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, c.setRGB(Math.max(0, alpha), a, b)); },
    commit() { mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; },
    dispose() { mesh.dispose(); material.dispose(); },
  };
}
