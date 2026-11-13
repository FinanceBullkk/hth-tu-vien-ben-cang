// Shader của Thanh Phong Kiếm Vũ (effect 12). Tách khỏi kiem-vu-aura.js cho gọn.

// Kiếm: viền sáng theo góc nhìn (fresnel), luồng khí chạy gốc → mũi lệch pha từng thanh,
// và sóng "xuất kiếm" quét tuần tự quanh vòng theo góc của thanh trong vòng (uniform sweep).
export const swordVertex = `
  attribute float part;
  varying float vPart, vAng;
  varying vec3 vN, vEye;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    vAng = 0.0;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
      vec3 c = instanceMatrix[3].xyz;
      vAng = atan(c.x, c.y);
    #endif
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n);
    vEye = normalize(-mv.xyz);
    vPart = part;
    gl_Position = projectionMatrix * mv;
  }
`;

export const swordFragment = `
  uniform vec3 steel, edge, core, gold;
  uniform float time, opacity, sweep, sweepOn, ink;
  varying float vPart, vAng;
  varying vec3 vN, vEye;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vEye))), 1.6);
    float blade = step(0.0, vPart), v = max(vPart, 0.0);
    float run = exp(-pow((v - fract(time * 0.2 + vAng * 0.159)) * 7.0, 2.0)) * blade;
    float d = mod(sweep - vAng + 3.14159265, 6.2831853) - 3.14159265;
    float wave = exp(-d * d * 4.0) * sweepOn * blade;
    float tipGlow = smoothstep(0.7, 1.0, v) * blade;
    // Phù văn khắc dọc lưỡi: vạch ngắn đều, sáng lên khi luồng khí chạy qua.
    float runes = pow(0.5 + 0.5 * sin(v * 46.0), 30.0) * step(0.14, v) * step(v, 0.68) * blade;
    vec3 col = mix(steel, edge, fres);
    col = mix(col, core, clamp(run * 0.7 + wave * 0.8 + tipGlow * 0.25 + runes * (0.1 + run * 0.8), 0.0, 1.0));
    // Chắn tay, chuôi, núm mạ vàng; viên ngọc giữa chắn (part = -2) sáng trắng ngọc.
    vec3 fitting = vPart < -1.5 ? mix(edge, core, 0.5) : mix(gold * 0.45, gold * 0.85, fres);
    col = mix(fitting, col, blade);
    float a = blade * (0.42 + fres * 0.5 + run * 0.35 + wave * 0.5 + runes * run * 0.4) + (1.0 - blade) * 0.6;
    // Lớp mực (ink=1) giữ hình kiếm trên nền sáng; lớp sáng additive vẽ viền và luồng khí.
    if (ink > 0.5) { col = mix(gold * 0.4, steel * 0.5, blade); a = blade * 0.5 + (1.0 - blade) * 0.7; }
    gl_FragColor = vec4(col * (ink > 0.5 ? 1.0 : (1.3 + wave * 0.6) * blade + (1.0 - blade)), a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Vệt kiếm khí sau phi kiếm: u 0 = mũi (đầu vệt), 1 = đuôi; v ngang dải.
export const trailVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const trailFragment = `
  uniform vec3 edge, core;
  uniform float opacity;
  varying vec2 vUv;
  void main() {
    float across = 1.0 - pow(abs(vUv.y * 2.0 - 1.0), 1.5);
    float tail = pow(1.0 - vUv.x, 1.6);
    vec3 col = mix(edge, core, pow(across, 3.0) * (1.0 - vUv.x));
    gl_FragColor = vec4(col, across * tail * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
