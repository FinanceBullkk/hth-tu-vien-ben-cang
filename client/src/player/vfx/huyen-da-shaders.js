// Shader riêng của Huyền Dạ Du Hành (effect 8) — Nhật Thực Huyền Nha. Aura duy nhất lấy lớp TỐI
// (normal blend, ink = 1) làm chủ đạo; lớp cộng màu (ink = 0) chỉ vẽ viền tím.

// Xoáy hút trong hệ toạ độ cực: texture vẽ vệt mực/tia lông lát gạch được trải theo (góc, log bán
// kính). Cuộn trục log bán kính theo thời gian làm hoa văn TRÔI VÀO TÂM dọc nhánh xoắn — đúng
// động từ "hút xoáy vào trong", tốc độ cố định (flow). arms = số lần lặp quanh vòng (nguyên),
// twist = độ xoắn, inner/outer = vành, falloff = tắt dần từ vành trong, edgeGlow = viền sáng sát
// vành trong (quầng sắc cầu của nhật thực), rim = 1 chỉ giữ một viền mảnh ở mép ngoài.
export const vortexVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const vortexFragment = `
  uniform sampler2D map;
  uniform vec3 deep, edge, core;
  uniform float time, opacity, arms, twist, flow, inner, outer, falloff, edgeGlow, rim, ink, pulse;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0 || r < inner * 0.97) discard;
    float a = atan(p.x, p.y) / 6.2831853, lr = log(max(r, 0.02));
    vec2 st = vec2(a * arms + lr * twist, lr * 1.6 + time * flow);
    float s = texture2D(map, st).a;
    float band = smoothstep(inner, inner + 0.06, r) * (1.0 - smoothstep(outer - 0.3, outer, r));
    float fall = exp(-max(r - inner, 0.0) * falloff);
    float halo = exp(-pow((r - inner) * 38.0, 2.0)) * edgeGlow;
    float al = s * band * fall + halo;
    vec3 col = mix(edge, core, clamp(s * s * 0.5 + halo * 0.8 + pulse * 0.15, 0.0, 1.0));
    if (rim > 0.5) {
      float line = exp(-pow((r - outer * 0.94) * 110.0, 2.0));
      al = s * exp(-pow((r - outer * 0.92) * 36.0, 2.0)) * 0.7 + line * 0.8;
      col = mix(edge, core, line * 0.4);
    }
    if (ink > 0.5) col = deep;
    al *= ink > 0.5 ? 1.0 : 0.8 + 0.35 * pulse;
    if (al < 0.004) discard;
    gl_FragColor = vec4(col, min(al, 1.0) * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Hắc diệu thạch (đĩa nhật thực, vành ngọc đen): thân đen đặc normal blend có ánh tím theo góc
// nhìn; lớp cộng màu chỉ là viền fresnel và đường chạm cuộn xoắn chạy chậm quanh vành (uv.x).
export const obsidianVertex = `
  varying vec3 vN, vEye;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
export const obsidianFragment = `
  uniform vec3 deep, edge, core;
  uniform float time, opacity, ink, carve, pulse;
  varying vec3 vN, vEye;
  varying vec2 vUv;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vEye))), 2.0);
    float lines = carve * pow(0.5 + 0.5 * sin(vUv.x * 6.2831853 * 36.0 + sin(vUv.y * 6.2831853) * 2.5 - time * 0.4), 10.0);
    float front = smoothstep(0.15, 0.5, vUv.y) * (1.0 - smoothstep(0.5, 0.85, vUv.y));
    if (ink > 0.5) {
      gl_FragColor = vec4(deep + edge * fres * 0.22, 0.97 * opacity);
    } else {
      float a = fres * fres * (0.8 + 0.4 * pulse) + lines * front * 0.55;
      if (a < 0.004) discard;
      gl_FragColor = vec4(mix(edge, core, clamp(fres * fres + lines * 0.4, 0.0, 1.0)), min(a, 1.0) * opacity);
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Lông quạ (instanced, hình lông dùng chung featherGeometry): uv.x ngang, uv.y gốc → ngọn.
// ink 1 = phiến lông đen đặc ánh tím lam như cánh quạ dưới trăng; ink 0 = chỉ viền phiến và trục.
export const crowFeatherVertex = `
  varying vec2 vUv;
  varying float vSeed;
  varying vec3 vN, vEye;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    vSeed = float(gl_InstanceID) * 1.37;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n); vEye = normalize(-mv.xyz); vUv = uv;
    gl_Position = projectionMatrix * mv;
  }
`;
export const crowFeatherFragment = `
  uniform vec3 deep, edge, core, sheen;
  uniform float time, opacity, ink;
  varying vec2 vUv;
  varying float vSeed;
  varying vec3 vN, vEye;
  void main() {
    float u = vUv.y, across = abs(vUv.x * 2.0 - 1.0);
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vEye))), 1.5);
    float fray = 0.08 * sin(u * 53.0 + vSeed * 5.0) + 0.06 * sin(u * 97.0 + vSeed * 2.0);
    float body = (1.0 - smoothstep(0.7 + fray, 0.98, across)) * smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.92, 1.0, u));
    float barbs = 0.7 + 0.3 * pow(0.5 + 0.5 * sin(across * 30.0 - u * 64.0 + vSeed), 2.0);
    float rachis = exp(-across * across * 240.0) * smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.8, 1.0, u));
    float vane = smoothstep(0.55, 0.85, across) * body;
    vec3 iri = mix(edge, sheen, 0.5 + 0.5 * sin(u * 5.0 + vSeed + time * 0.25));
    if (ink > 0.5) {
      gl_FragColor = vec4(deep + iri * (fres * 0.3 + rachis * 0.15), body * barbs * 0.94 * opacity);
    } else {
      float a = (vane * 0.55 + rachis * 0.45 + fres * body * 0.35) * opacity;
      if (a < 0.004) discard;
      gl_FragColor = vec4(mix(iri, core, rachis * 0.5), min(a, 1.0));
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Khói mực trên dải động (ribbonVertex của aura-flow-shaders): u 0 = đuôi ngoài xa → 1 = đầu chìm
// vào nhật thực. Mép xơ như nét bút khô, vân khói trôi về phía u = 1 với tốc độ cố định.
// ink 1 = thân khói đen; ink 0 = chỉ hai mép tím mảnh.
export const smokeFragment = `
  uniform vec3 deep, edge, core;
  uniform float time, opacity, ink;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0);
    float fray = 0.2 * sin(u * 31.0 - time * 0.9 + vSeed * 7.0) + 0.12 * sin(u * 77.0 - time * 0.6 + vSeed * 3.0);
    float body = 1.0 - smoothstep(0.25 + fray, 0.95 + fray * 0.3, across);
    float strands = 0.55 + 0.45 * pow(0.5 + 0.5 * sin(vUv.y * 17.0 + u * 11.0 - time * 0.5 + vSeed), 2.0);
    float ends = smoothstep(0.0, 0.18, u) * (1.0 - smoothstep(0.82, 1.0, u));
    if (ink > 0.5) {
      float a = body * strands * ends * 0.7 * opacity;
      if (a < 0.004) discard;
      gl_FragColor = vec4(deep, a);
    } else {
      float lip = smoothstep(0.35 + fray, 0.7 + fray, across) * body;
      float a = lip * ends * 0.5 * opacity;
      if (a < 0.004) discard;
      gl_FragColor = vec4(mix(edge, core, 0.2 * (1.0 - across)), a);
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
