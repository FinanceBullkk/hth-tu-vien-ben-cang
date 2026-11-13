import * as THREE from 'three';

// Bảng màu Bích Ngọc Thanh Phong: ngọc bích đậm (mực, đọc được trên nền sáng), ngọc lục sáng, lõi
// trắng ngọc, đốt trúc vàng lục nhạt, lá trúc, đá xám rêu, bẹ măng nâu vàng.
export const BICH_NGOC_COLORS = {
  steel: new THREE.Color('#0f4a36'), edge: new THREE.Color('#5fe0a6'), core: new THREE.Color('#ecfff4'),
  gold: new THREE.Color('#d8ec8c'), jade: new THREE.Color('#2f9a6c'), leaf: new THREE.Color('#79d283'),
  stone: new THREE.Color('#7d8a80'), moss: new THREE.Color('#5d9a3e'), sheath: new THREE.Color('#b08f55'),
};

/** Loại vật thể 3D (attribute kind) trong shader khối đặc. */
export const KIND = { culm: 0, twig: 1, leaf: 2, stone: 3, shoot: 4, jade: 5 };
/** Tốc độ (rad/s) và độ lệch xuôi gió của trúc lay — shader và CPU (lá, chuông gió) dùng chung. */
export const SWAY_SPEED = 0.55, SWAY_BIAS = 0.4;

// Mỗi đỉnh: part 0→1 gốc → ngọn; across (trúc: góc quanh thân 0..1, lá: -1..1 ngang lá);
// node = toạ độ đốt (y / khoảng đốt — phần lẻ 0 là đốt); sway = (hướng gió x, z, pha, hệ số).
// Thân trúc lay trong shader: lệch xuôi gió tỉ lệ y², cùng hàm với swayOffset() bên CPU.
const solidVertex = `
  attribute float part, across, kind, node;
  attribute vec4 sway;
  uniform float time;
  varying float vPart, vAcross, vKind, vNode, vUp;
  varying vec3 vN, vEye;
  void main() {
    vPart = part; vAcross = across; vKind = kind; vNode = node;
    vec4 p = vec4(position, 1.0); vec3 n = normal;
    p.xz += sway.xy * sway.w * p.y * p.y * (${SWAY_BIAS.toFixed(2)} + sin(time * ${SWAY_SPEED.toFixed(2)} + sway.z));
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    vUp = normalize(n).y;
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n); vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

// ink=1: thân normal-blend (màu thật, giữ hình trên nền sáng); ink=0: lớp sáng cộng màu — viền
// phát quang, đốt trúc sáng và luồng linh khí chạy dọc thân với tốc độ cố định.
const solidFragment = `
  uniform vec3 deep, jade, core, gold, leaf, stone, moss, sheath;
  uniform float opacity, ink, glow, time;
  varying float vPart, vAcross, vKind, vNode, vUp;
  varying vec3 vN, vEye;
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vEye))), rim = pow(1.0 - facing, 1.8);
    vec3 col; float a = 1.0, lit = 0.0, lift = 1.0;
    if (vKind < 0.5) {
      float f = fract(vNode), ring = 1.0 - smoothstep(0.0, 0.05, min(f, 1.0 - f));
      float powder = smoothstep(0.88, 0.96, f) * (1.0 - smoothstep(0.96, 0.99, f));
      col = mix(deep, jade, 0.25 + 0.6 * vPart) * (0.86 + 0.14 * sin(vAcross * 75.4));
      col = mix(col, gold, ring * 0.75); col = mix(col, core, powder * 0.3);
      lit = ring + 0.55 * pow(0.5 + 0.5 * sin(vPart * 8.0 - time * 0.7 + vNode * 0.3), 14.0);
    } else if (vKind < 1.5) {
      col = mix(deep, jade, 0.55);
    } else if (vKind < 2.5) {
      float rib = 1.0 - smoothstep(0.0, 0.14, abs(vAcross));
      col = mix(leaf * 0.5, leaf, smoothstep(0.0, 0.8, vPart)) + gold * 0.22 * rib;
      a = 0.92;
    } else if (vKind < 3.5) {
      float speck = vNode;
      col = mix(stone * 0.62, stone, facing) * (0.9 + 0.1 * speck);
      col = mix(col, moss * (0.8 + 0.3 * speck), smoothstep(0.5, 0.85, vUp + 0.15 * speck));
      lift = 0.15;
    } else if (vKind < 4.5) {
      float band = 0.5 + 0.5 * sin(vPart * 26.0);
      col = mix(sheath * 0.55, sheath, band * 0.6 + 0.3);
      col = mix(col, leaf, smoothstep(0.75, 1.0, vPart));
      lift = 0.3;
    } else {
      col = mix(jade, core, 0.35 + 0.3 * vPart); lit = 0.25;
    }
    if (ink > 0.5) gl_FragColor = vec4(col * (0.7 + 0.3 * facing) + core * rim * 0.1, a * opacity);
    else gl_FragColor = vec4((mix(col, core, 0.4) * rim * 0.5 + gold * lit * (0.2 + 0.18 * glow)) * lift, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Khối đặc (trúc, lá, đá, măng, ngọc): ink=1 thân normal-blend, ink=0 lớp sáng cộng màu. */
export function solidMaterial(colors, ink) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { deep: { value: colors.steel }, jade: { value: colors.jade }, core: { value: colors.core },
      gold: { value: colors.gold }, leaf: { value: colors.leaf }, stone: { value: colors.stone },
      moss: { value: colors.moss }, sheath: { value: colors.sheath },
      opacity: { value: 1 }, ink: { value: ink }, glow: { value: 0 }, time: { value: 0 } },
    vertexShader: solidVertex, fragmentShader: solidFragment,
    blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}

// Dải gió: vân gió cuộn vẽ trên canvas trôi dọc dải (uv.x) với tốc độ cố định; hai đầu dải thuôn mờ.
const windVertex = `
  attribute float seed;
  varying vec2 vUv; varying float vSeed;
  void main() { vUv = uv; vSeed = seed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const windFragment = `
  uniform sampler2D map;
  uniform vec3 deep, edge, core;
  uniform float time, opacity, ink, repeat, flow;
  varying vec2 vUv; varying float vSeed;
  void main() {
    float taper = smoothstep(0.0, 0.16, vUv.x) * (1.0 - smoothstep(0.7, 1.0, vUv.x));
    float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
    vec4 tex = texture2D(map, vec2(vUv.x * repeat - time * flow + vSeed * 0.37, vUv.y));
    float a;
    vec3 col;
    if (ink > 0.5) { a = tex.a * 0.7; col = deep; }
    else { a = tex.a + 0.3 * across * across; col = mix(edge, core, tex.a * 0.6); }
    a *= taper * opacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Dải gió xoáy: ink=1 nét mực vân gió, ink=0 tấm gió sáng cộng màu. */
export function windMaterial(colors, map, ink, repeat) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { map: { value: map }, deep: { value: colors.steel }, edge: { value: colors.edge }, core: { value: colors.core },
      time: { value: 0 }, opacity: { value: 1 }, ink: { value: ink }, repeat: { value: repeat }, flow: { value: 0.12 } },
    vertexShader: windVertex, fragmentShader: windFragment,
    blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}
