// Shader của Kim Long Nguyệt Ảnh. Mọi khối 3D tự chiếu sáng giả (đèn cố định theo camera) để
// không phụ thuộc đèn cảnh. Uniform `glow`: 0 = lớp thân normal blend (đọc được trên nền sáng),
// 1 = lớp viền sáng cộng màu dùng chung geometry.

// Đỉnh có pháp tuyến, hỗ trợ instancing (vây, chân rồng).
export const litVertex = `
  attribute float tone;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vTone;
  void main() {
    vUv = uv; vTone = tone;
    vec4 p = vec4(position, 1.0); vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n); vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const lighting = `
  float lambert(vec3 n) { return 0.42 + 0.58 * max(dot(n, normalize(vec3(0.35, 0.7, 0.62))), 0.0); }
  float fresnel(vec3 n, vec3 v) { return pow(1.0 - abs(dot(n, v)), 2.2); }
`;

// Thân rồng: vảy cá chép xếp so le (mép vảy cong về phía đuôi, viền mực nâu), bụng ngà chia đốt,
// sóng sáng chạy dọc thân trùng pha với sóng lượn (K, OMEGA).
export const bodyFragment = `
  uniform vec3 deep, gold, light, ivory, ink;
  uniform float time, opacity, glow, rows, waveK, omega, pulse;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  ${lighting}
  void main() {
    vec3 n = normalize(vN), v = normalize(vV);
    float lam = lambert(n), fres = fresnel(n, v);
    vec2 g = vec2(vUv.x * rows, vUv.y * 12.0);
    float row = floor(g.x), fx = fract(g.x), y = fract(g.y + 0.5 * mod(row, 2.0));
    float xb = 0.5 * (1.0 - sqrt(max(0.0, 1.0 - pow(2.0 * y - 1.0, 2.0))));
    float e = fx - xb, aa = max(fwidth(e), 0.01);
    float line = 1.0 - smoothstep(aa, aa + 0.07, abs(e));
    float sheen = (1.0 - smoothstep(0.0, 0.6, e)) * step(0.0, e) * (1.0 - abs(2.0 * y - 1.0));
    float belly = smoothstep(0.55, 0.85, -cos(vUv.y * 6.2831853));
    float plate = 1.0 - smoothstep(0.0, 0.14, fract(vUv.x * rows * 0.5));
    float crest = pow(0.5 + 0.5 * sin(waveK * vUv.x + omega * time + 1.5708), 6.0);
    float tip = smoothstep(0.0, 0.025, vUv.x);
    if (glow > 0.5) {
      vec3 c = gold * fres * 0.9 + light * (crest * 0.32 * (1.0 - belly) + sheen * 0.22 * (0.7 + 0.3 * pulse));
      gl_FragColor = vec4(c, opacity * tip);
    } else {
      vec3 sc = mix(deep, gold, lam);
      sc = mix(sc, light, sheen * 0.55 * lam);
      sc = mix(sc, ink, line * 0.8);
      vec3 bc = mix(ivory * (0.6 + 0.4 * lam), ink, plate * 0.55);
      vec3 c = mix(sc, bc, belly) + light * (crest * 0.12 + fres * 0.18);
      gl_FragColor = vec4(c, opacity * tip);
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Khối vàng chạm (đầu, sừng, chân, móng): tone 0 vàng kim, 1 ngà (sừng, móng, răng), 2 mắt sáng.
export const goldFragment = `
  uniform vec3 deep, gold, light, ivory, ink;
  uniform float opacity, glow, pulse;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vTone;
  ${lighting}
  void main() {
    vec3 n = normalize(vN), v = normalize(vV);
    float lam = lambert(n), fres = fresnel(n, v);
    float ivoryT = step(0.5, vTone) * (1.0 - step(1.5, vTone)), eye = step(1.5, vTone);
    if (glow > 0.5) {
      vec3 c = gold * fres * 0.8 * (1.0 - eye) + light * eye * (0.6 + 0.3 * pulse);
      gl_FragColor = vec4(c, opacity);
    } else {
      vec3 c = mix(mix(deep, gold, lam), mix(ivory * 0.75, ivory, lam), ivoryT);
      c = mix(c, ink, fres * 0.45 * (1.0 - eye));
      c = mix(c, light, eye);
      gl_FragColor = vec4(c + light * fres * 0.12, opacity);
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Vây lưng / vây đuôi: màng lửa có gân, gốc vàng ngả cam đỏ ở ngọn, mép ngọn tan.
export const finFragment = `
  uniform vec3 gold, light, flame, ink;
  uniform float opacity, glow, time;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    float ribs = pow(abs(sin(vUv.x * 3.14159 * 4.0 + vUv.y * 1.5)), 10.0);
    float edge = smoothstep(0.7, 1.0, vUv.y);
    float flick = 0.85 + 0.15 * sin(vUv.x * 9.0 - time * 0.8 + vUv.y * 4.0);
    if (glow > 0.5) {
      gl_FragColor = vec4(light * (edge * 0.55 + ribs * 0.35) * flick, opacity * (1.0 - smoothstep(0.92, 1.0, vUv.y)));
    } else {
      vec3 c = mix(gold, flame, smoothstep(0.15, 1.0, vUv.y));
      c = mix(c, ink, ribs * 0.55 * (1.0 - edge));
      gl_FragColor = vec4(c, opacity * (0.92 - edge * 0.45) * flick);
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Bờm và râu trên dải động: sợi lửa vàng, ngọn ngả cam; mode glow chỉ là lõi sáng.
export const strandFragment = `
  uniform vec3 gold, light, flame, ink;
  uniform float opacity, glow, time;
  varying vec2 vUv; varying float vSeed;
  void main() {
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0);
    float body = 1.0 - smoothstep(0.55, 1.0, across);
    float fade = smoothstep(0.0, 0.05, u) * pow(1.0 - u, 0.7);
    float strands = 0.7 + 0.3 * sin(vUv.y * 18.0 + u * 7.0 + vSeed);
    if (glow > 0.5) {
      float core = exp(-across * across * 9.0);
      gl_FragColor = vec4(light * core * (0.6 + 0.4 * sin(u * 16.0 - time * 0.7 + vSeed)), opacity * fade);
    } else {
      vec3 c = mix(gold, flame, smoothstep(0.2, 1.0, u));
      c = mix(c, ink, smoothstep(0.6, 1.0, across) * 0.7);
      gl_FragColor = vec4(c * strands, opacity * body * fade);
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Long khí: dải sương vàng rộng mềm bám sau lưng rồng, vân khí trôi chậm từ đầu về đuôi.
export const mistFragment = `
  uniform vec3 gold, light;
  uniform float opacity, time;
  varying vec2 vUv; varying float vSeed;
  void main() {
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0);
    float soft = exp(-across * across * 3.5);
    float streak = 0.55 + 0.45 * sin(u * 34.0 + time * 0.6 + vUv.y * 5.0);
    float fade = smoothstep(0.0, 0.12, u) * smoothstep(1.0, 0.82, u);
    gl_FragColor = vec4(mix(gold, light, streak * 0.4), opacity * soft * streak * fade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Long châu: ngọc ngà sáng, vân xoáy chậm bên trong, viền vàng; không nhấp nháy.
export const pearlFragment = `
  uniform vec3 gold, light, ivory;
  uniform float opacity, time, pulse;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    vec3 n = normalize(vN), v = normalize(vV);
    float facing = max(dot(n, v), 0.0), core = pow(facing, 1.6);
    float swirl = 0.5 + 0.5 * sin(atan(n.y, n.x) * 3.0 + length(n.xy) * 9.0 - time * 0.5);
    vec3 c = mix(gold, ivory, core) + light * swirl * core * (0.18 + 0.08 * pulse);
    gl_FragColor = vec4(c, opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
