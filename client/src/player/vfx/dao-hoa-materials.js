import * as THREE from 'three';

// Bảng màu Đào Hoa Tri Kỷ: hồng phấn, lõi trắng ngà, mực hồng gụ (đọc được trên nền sáng),
// nhấn mơ chín ở vành và xanh lá non. Khác hẳn Kim Liên (sen vàng kim).
export const DAO_HOA_COLORS = {
  steel: new THREE.Color('#9c3d66'), edge: new THREE.Color('#ff9cc4'),
  core: new THREE.Color('#fff3ea'), gold: new THREE.Color('#ffc9b0'),
  leaf: new THREE.Color('#bfe98f'), bark: new THREE.Color('#6b3a45'), jade: new THREE.Color('#f2d3da'),
};

// Vật liệu cành đào 3D (cánh, nhụy, nụ, lá, vỏ cành — phân biệt bằng attribute kind).
const floraVertex = `
  attribute float part, across, kind;
  varying float vPart, vAcross, vKind;
  varying vec3 vN, vEye;
  void main() {
    vPart = part; vAcross = across; vKind = kind;
    vec4 p = vec4(position, 1.0); vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n); vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

// ink=1: thân hoa normal-blend (màu thật của cánh, giữ hình trên nền sáng);
// ink=0: lớp sáng cộng màu — viền phát quang và má hồng ửng theo nhịp thở (glow).
const floraFragment = `
  uniform vec3 petal, core, deep, leaf, bark;
  uniform float opacity, ink, glow;
  varying float vPart, vAcross, vKind;
  varying vec3 vN, vEye;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vEye))), 1.6);
    vec3 col; float a = 1.0;
    if (vKind < 0.5) {
      // Chóp cánh đào khía hình tim.
      if (vPart > 0.86 && abs(vAcross) < (vPart - 0.86) * 2.6) discard;
      col = mix(deep, petal, smoothstep(0.0, 0.4, vPart));
      col = mix(col, core, smoothstep(0.45, 1.0, vPart) * 0.8);
      col += petal * 0.12 * pow(0.5 + 0.5 * cos(vAcross * 16.0), 10.0) * (1.0 - vPart);
      a = 0.82;
    } else if (vKind < 1.5) {
      col = mix(deep, vec3(1.0, 0.93, 0.72), vPart);
    } else if (vKind < 2.5) {
      col = mix(deep, mix(petal, core, 0.5), smoothstep(0.3, 1.0, vPart));
    } else if (vKind < 3.5) {
      col = mix(leaf * 0.62, leaf, vPart) + leaf * 0.25 * (1.0 - smoothstep(0.0, 0.12, abs(vAcross)));
      a = 0.85;
    } else {
      col = mix(bark, deep, 0.25 + 0.25 * vPart);
    }
    if (ink > 0.5) {
      gl_FragColor = vec4(col * (0.78 + 0.22 * rim), a * opacity);
    } else {
      float lift = vKind > 3.5 ? 0.25 : 1.0;
      gl_FragColor = vec4(mix(col, core, rim * 0.5) * (0.25 + rim * 0.9 + glow * 0.35) * lift, a * opacity);
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Ngọc trắng hồng của nguyệt môn: thân normal-blend có vân hồng chảy trong đá (theo toạ độ vật thể),
// mép bắt sáng; lớp sáng cộng màu chỉ là viền phát quang mềm thở theo nhịp.
const jadeVertex = `
  varying vec3 vPos, vN, vEye;
  void main() {
    vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const jadeFragment = `
  uniform vec3 stone, vein, core;
  uniform float opacity, ink, glow;
  varying vec3 vPos, vN, vEye;
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vEye))), rim = pow(1.0 - facing, 2.0);
    float swirl = sin(vPos.x * 6.0 + sin(vPos.y * 4.0 + vPos.z * 9.0) * 1.7) + 0.6 * sin(vPos.y * 13.0 - vPos.x * 3.0);
    float veins = pow(1.0 - abs(swirl) * 0.5, 14.0);
    vec3 col = mix(stone, vein, veins * 0.55) * (0.72 + 0.28 * facing);
    if (ink > 0.5) gl_FragColor = vec4(mix(col, core, rim * 0.35), opacity);
    else gl_FragColor = vec4(mix(vein, core, 0.4) * rim * (0.55 + 0.45 * glow), opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Ngọc nguyệt môn: ink=1 thân ngọc (normal blend), ink=0 viền sáng cộng màu. */
export function jadeMaterial(colors, ink) {
  // Một mặt: khối cổng kín nên chỉ vẽ mặt hướng ra, không lộ mặt trong qua thân ngọc.
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide,
    uniforms: { stone: { value: colors.jade }, vein: { value: colors.edge }, core: { value: colors.core },
      opacity: { value: 1 }, ink: { value: ink }, glow: { value: 0 } },
    vertexShader: jadeVertex, fragmentShader: jadeFragment,
    blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}

/** ink=0 lớp sáng cộng màu, ink=1 thân hoa normal-blend. */
export function floraMaterial(colors, ink) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { petal: { value: colors.edge }, core: { value: colors.core }, deep: { value: colors.steel },
      leaf: { value: colors.leaf }, bark: { value: colors.bark }, opacity: { value: 1 }, ink: { value: ink },
      glow: { value: 0 } },
    vertexShader: floraVertex, fragmentShader: floraFragment,
    blending: ink ? THREE.NormalBlending : THREE.AdditiveBlending });
}
