import * as THREE from 'three';

// Bảng màu Nguyệt Bạch Tri Âm: trắng bạc ánh trăng, lam nguyệt, mực chàm (đọc được trên nền sáng),
// nhấn vàng ngà ở phím huy và hoa quế. Sơn mài đen ánh lam cho thân cổ cầm, lam đêm cho gương nước.
export const NGUYET_BACH_COLORS = {
  steel: new THREE.Color('#2c3a5e'), edge: new THREE.Color('#b9d4ff'),
  core: new THREE.Color('#f4f8ff'), gold: new THREE.Color('#ecdcaa'),
  lacquer: new THREE.Color('#222b46'), pearl: new THREE.Color('#dfe8f6'),
  water: new THREE.Color('#1c2a48'), sky: new THREE.Color('#5f7aa8'),
};

// Vật thể rắn có bóng: vPos toạ độ vật thể (vân), vN/vEye để tính viền bắt sáng và vệt bóng loáng.
const solidVertex = `
  varying vec3 vPos, vN, vEye;
  void main() {
    vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

// ink=1 thân (normal blend): màu nền tối/sáng theo góc nhìn, vân đoạn văn (đường nứt sơn mài cổ
// chạy ngang thân đàn — crack = 0 cho trăng và vành), vệt bóng loáng; ink=0 viền bạc cộng màu.
const solidFragment = `
  uniform vec3 base, silver, core;
  uniform float opacity, ink, glow, crack;
  varying vec3 vPos, vN, vEye;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec3 n = normalize(vN), e = normalize(vEye);
    float facing = abs(dot(n, e)), rim = pow(1.0 - facing, 2.2);
    float sheen = pow(max(0.0, dot(reflect(-e, n), normalize(vec3(0.35, 0.8, 0.5)))), 28.0);
    float row = floor(vPos.y * 18.0), cell = floor(vPos.x * 9.0 + hash(vec2(row, 3.0)) * 4.0);
    float line = 1.0 - smoothstep(0.0, 0.06, abs(fract(vPos.y * 18.0 + sin(vPos.x * 31.0) * 0.08) - 0.5));
    float cracks = line * step(0.45, hash(vec2(row, cell))) * crack;
    vec3 col = base * (0.62 + 0.5 * facing) + silver * cracks * 0.16;
    if (ink > 0.5) gl_FragColor = vec4(mix(col, silver, rim * 0.4) + core * sheen * 0.35, opacity);
    else gl_FragColor = vec4(silver * rim * (0.45 + 0.55 * glow) + core * sheen * 0.12, opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Vật liệu khối rắn: ink=1 thân normal-blend, ink=0 viền bạc cộng màu. base: màu thân, crack: vân nứt. */
export function solidMaterial(colors, ink, { base = colors.lacquer, crack = 0, side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side,
    uniforms: { base: { value: base }, silver: { value: colors.edge }, core: { value: colors.core },
      opacity: { value: 1 }, ink: { value: ink }, glow: { value: 0 }, crack: { value: crack } },
    vertexShader: solidVertex, fragmentShader: solidFragment,
    blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}

/** Material ảnh màu thật (mặt trăng, lạc khoản), normal blend, không tone map. */
export function pictureMaterial(map) {
  return new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
}

/** Material lớp sáng cộng màu dùng texture trắng (quầng trăng, viền). */
export function glowPictureMaterial(map, color) {
  return new THREE.MeshBasicMaterial({ map, color, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
}
