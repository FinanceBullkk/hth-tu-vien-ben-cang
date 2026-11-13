// Shader thiên cầu của Tinh Hà. Thiên cầu bao trọn người nên mọi nét trên vỏ cầu đều có "chừa mặt":
// đỉnh nào nằm GẦN camera hơn đầu và lọt vào nón nhìn từ camera tới đầu thì mờ thành trong suốt
// (vFace → 0). Tính trong view space nên đúng với mọi góc camera. `head` là toạ độ thế giới của đầu.
const faceSafe = `
  uniform vec3 head;
  varying float vFace;
  float faceFade(vec4 mv) {
    vec4 hv = viewMatrix * vec4(head, 1.0);
    float ang = acos(clamp(dot(normalize(mv.xyz), normalize(hv.xyz)), -1.0, 1.0));
    float hr = 0.4 / max(0.5, length(hv.xyz));
    float front = smoothstep(-0.05, 0.25, mv.z - hv.z);
    return mix(1.0, smoothstep(hr * 0.9, hr * 2.0, ang), front);
  }
`;

/** Dải (createRibbonStrips) trên vỏ cầu: như ribbonVertex chung, thêm vFace chừa mặt. */
export const shellVertex = `
  attribute float seed;
  varying vec2 vUv;
  varying float vSeed;
  ${faceSafe}
  void main() {
    vUv = uv; vSeed = seed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFace = faceFade(mv);
    gl_Position = projectionMatrix * mv;
  }
`;

/** Billboard instanced (khung của aura-billboard-layer) có chừa mặt: sao chòm, tinh cầu trên vòng. */
export const shellBillboardVertex = `
  varying vec2 vUv;
  varying float vAlpha;
  ${faceSafe}
  void main() {
    vUv = uv;
    vec4 center = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec2 size = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
    float spin = instanceColor.g * 6.2831853;
    vec2 offset = mat2(cos(spin), sin(spin), -sin(spin), cos(spin)) * (position.xy * size);
    vec4 mv = modelViewMatrix * center;
    vAlpha = instanceColor.r * faceFade(mv);
    mv.xy += offset;
    gl_Position = projectionMatrix * mv;
  }
`;

// Vòng kinh vĩ: dải phẳng như vòng đồng khắc độ — hai viền mảnh, vạch chia một phía (vạch dài mỗi
// 5 vạch), một ánh sáng lướt chậm quanh vòng; hai đầu cung hở, mép xơ như nét bút.
// ink = 1: lớp mực chàm (normal blending) giữ hình vòng trên nền sáng.
export const ringFragment = `
  uniform vec3 edge, core, gold, steel;
  uniform float opacity, time, ink;
  varying vec2 vUv;
  varying float vSeed, vFace;
  void main() {
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0);
    float fray = 0.05 * sin(u * 90.0 + vSeed * 5.0) + 0.04 * sin(u * 37.0 - vSeed);
    float ends = smoothstep(0.0, 0.07 + fray, u) * (1.0 - smoothstep(0.93 + fray, 1.0, u));
    float rims = smoothstep(0.55, 0.72, across) * (1.0 - smoothstep(0.86, 1.0, across));
    float sv = vUv.y * 2.0 - 1.0, t = fract(u * 60.0), major = step(0.75, fract(u * 12.0 + 0.05));
    float tick = (1.0 - smoothstep(0.03, 0.08, abs(t - 0.5))) * step(0.05, sv) * (1.0 - smoothstep(0.35 + 0.3 * major, 0.45 + 0.3 * major, sv));
    float glint = exp(-pow((fract(u - time * 0.02 + vSeed * 0.31) - 0.5) * 9.0, 2.0));
    float body = 0.14 * (1.0 - across) + rims * 0.9 + tick * (0.35 + 0.3 * major);
    vec3 col = mix(edge, gold, major * tick * 0.6 + rims * 0.25);
    col = mix(col, core, glint * 0.7);
    float a = (body + glint * 0.5 * (1.0 - across)) * ends * vFace;
    if (ink > 0.5) { col = steel * 0.5; a = (rims * 0.6 + tick * 0.3) * ends * vFace; }
    if (a < 0.003) discard;
    gl_FragColor = vec4(col * (ink > 0.5 ? 1.0 : 1.2), a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Nét nối chòm sao trên vỏ cầu: mỗi đoạn một dải, u dọc đoạn (0 sao đầu → 1 sao cuối); chỉ số
// đoạn suy ra từ seed (k * 1.37). Nét nền chấm gạch mờ như tinh đồ giấy; nét sáng mọc dần tới
// u = lit[k], đầu nét có điểm sáng ngả vàng.
export const LINE_COUNT = 32;
export const lineFragment = `
  uniform vec3 edge, core, gold;
  uniform float opacity, glow, time;
  uniform float lit[${LINE_COUNT}];
  varying vec2 vUv;
  varying float vSeed, vFace;
  void main() {
    int k = int(vSeed / 1.37 + 0.5);
    float l = 0.0;
    for (int i = 0; i < ${LINE_COUNT}; i++) if (i == k) l = lit[i];
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0);
    float body = exp(-across * across * 5.0);
    float ends = smoothstep(0.0, 0.12, u) * (1.0 - smoothstep(0.88, 1.0, u));
    float dash = 0.3 + 0.2 * step(0.45, fract(u * 7.0 - time * 0.05));
    float on = (1.0 - smoothstep(l - 0.03, l, u)) * glow;
    float tip = exp(-pow((u - l) * 12.0, 2.0)) * step(0.002, l) * glow;
    vec3 col = mix(edge, core, clamp(on * 0.35 + tip, 0.0, 1.0));
    col = mix(col, gold, tip * 0.35);
    float a = body * ends * (dash + 0.65 * on + 0.9 * tip) * vFace;
    if (a < 0.003) discard;
    gl_FragColor = vec4(col, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Vỏ thiên cầu trong suốt: viền Fresnel sáng ở mép cầu + lưới kinh vĩ rất mảnh (12 kinh tuyến, 5 vĩ
// tuyến) theo uv của SphereGeometry, quay cùng thiên cầu; chừa mặt như mọi lớp trên vỏ.
export const veilVertex = `
  varying vec2 vUv;
  varying vec3 vNormal, vView;
  ${faceSafe}
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal); vView = normalize(-mv.xyz);
    vFace = faceFade(mv);
    gl_Position = projectionMatrix * mv;
  }
`;
export const veilFragment = `
  uniform vec3 edge, core;
  uniform float opacity, pulse;
  varying vec2 vUv;
  varying vec3 vNormal, vView;
  varying float vFace;
  float line(float x, float n) { float d = abs(fract(x * n) - 0.5) * 2.0; return smoothstep(0.93, 1.0, d); }
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.6);
    float grid = max(line(vUv.x, 12.0), line(vUv.y, 6.0)) * smoothstep(0.02, 0.12, vUv.y) * smoothstep(0.98, 0.88, vUv.y);
    float a = (fres * (0.32 + 0.12 * pulse) + grid * 0.13) * vFace;
    if (a < 0.003) discard;
    gl_FragColor = vec4(mix(edge, core, fres * 0.6), a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
