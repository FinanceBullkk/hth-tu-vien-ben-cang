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
  uniform vec3 steel, edge, core;
  uniform float time, opacity, sweep, sweepOn, ink;
  varying float vPart, vAng;
  varying vec3 vN, vEye;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vEye))), 1.6);
    float blade = step(0.0, vPart), v = max(vPart, 0.0);
    float run = exp(-pow((v - fract(time * 0.32 + vAng * 0.159)) * 7.0, 2.0)) * blade;
    float d = mod(sweep - vAng + 3.14159265, 6.2831853) - 3.14159265;
    float wave = exp(-d * d * 4.0) * sweepOn * blade;
    float tipGlow = smoothstep(0.7, 1.0, v) * blade;
    vec3 col = mix(steel, edge, fres);
    col = mix(col, core, clamp(run * 0.7 + wave * 0.8 + tipGlow * 0.25, 0.0, 1.0));
    float a = blade * (0.42 + fres * 0.5 + run * 0.35 + wave * 0.5) + (1.0 - blade) * 0.75;
    // Lớp mực (ink=1) giữ hình kiếm trên nền sáng; lớp sáng additive vẽ viền và luồng khí.
    if (ink > 0.5) { col = steel * 0.5; a = blade * 0.5 + (1.0 - blade) * 0.7; }
    gl_FragColor = vec4(col * (ink > 0.5 ? 1.0 : 1.3 + wave * 0.6), a * opacity);
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

// Trận đồ dưới chân và vành kiếm luân sau lưng dùng chung một shader:
// mode 0 = trận đồ đất (8 kiếm ấn hướng tâm, vạch khắc, vòng đôi);
// mode 1 = vành pháp luân (vòng mảnh + vạch, rỗng giữa để không che đầu);
// mode 2 = quầng pháp quang mờ sau kiếm luân (vành sáng mềm ở tầm mũi kiếm).
export const sealVertex = `
  varying vec2 vUv;
  void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const sealFragment = `
  uniform vec3 edge, core;
  uniform float time, opacity, pulse, sweep, mode;
  varying vec2 vUv;
  float stroke(float d, float w) { float aa = max(fwidth(d), 0.0015); return 1.0 - smoothstep(w, w + aa, abs(d)); }
  void main() {
    float r = length(vUv), a = atan(vUv.x, vUv.y);
    float light = 0.0;
    if (mode < 0.5) {
      float spin = a + time * 0.05, seg = 6.2831853 / 8.0;
      float local = mod(spin + seg * 0.5, seg) - seg * 0.5;
      float y = local * r, x = r;
      float glyph = step(abs(y), 0.035 * (1.0 - abs(x - 0.64) / 0.2)) * step(0.44, x) * step(x, 0.84);
      float glyphEdge = glyph * (1.0 - step(abs(y), 0.02 * (1.0 - abs(x - 0.64) / 0.2)));
      light += glyphEdge * 0.9 + glyph * 0.18;
      light += stroke(r - 0.93, 0.004) + stroke(r - 0.88, 0.0025) * 0.6;
      light += stroke(r - 0.905, 0.018) * step(0.92, cos(spin * 32.0)) * 0.7;
      light += stroke(r - 0.36, 0.003) * 0.7 + stroke(r - 0.3, 0.002) * 0.4;
      light += stroke(r - 0.33, 0.012) * step(0.97, cos(spin * 8.0 + 0.4)) * 0.8;
      light *= 0.55 + 0.45 * pulse;
      light += stroke(r - 0.36 - pulse * 0.55, 0.01) * pulse * 0.5;
    } else if (mode > 1.5) {
      light = exp(-pow((r - 0.62) * 3.2, 2.0)) * 0.32 + exp(-pow((r - 0.3) * 6.0, 2.0)) * 0.12;
      light *= 0.75 + 0.5 * pulse;
    } else {
      float d = mod(sweep - a + 3.14159265, 6.2831853) - 3.14159265;
      light += stroke(r - 0.96, 0.004) * (0.6 + 0.6 * exp(-d * d * 3.0));
      light += stroke(r - 0.9, 0.0025) * 0.45;
      light += stroke(r - 0.93, 0.02) * step(0.9, cos(a * 36.0 - time * 0.1)) * 0.55;
      light += stroke(r - 0.24, 0.003) * 0.5;
    }
    if (r > 0.99 || light < 0.002) discard;
    gl_FragColor = vec4(mix(edge, core, clamp(pulse * 0.5, 0.0, 1.0)), min(1.0, light) * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
