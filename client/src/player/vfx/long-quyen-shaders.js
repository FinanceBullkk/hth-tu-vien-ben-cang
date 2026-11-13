import { spineWaveGlsl } from './long-quyen-spine.js';

// Shader của Long Quyền. Mọi lớp có hai bản: ink = 1 lớp mực normal blend (đọc được trên nền sáng),
// ink = 0 lớp lửa cộng màu. Chuyển động trong shader đều là hàm thuần của time, tốc độ cố định.
const tail = `
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Thân và đầu rồng. Định nghĩa WAVE (thân) để cộng sóng cơ theo thuộc tính spine.
export const dragonVertex = `
  #ifdef WAVE
  ${spineWaveGlsl}
  #endif
  varying vec2 vUv;
  varying vec3 vN, vV;
  void main() {
    vUv = uv;
    vec3 p = position;
    #ifdef WAVE
    p += spineWave(uv.x);
    #endif
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal); vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

// Vảy giáp: texture lát gạch, kênh r = độ sáng lòng vảy, kênh g = viền vảy; vảy trôi từ đuôi lên đầu.
// Bụng (quanh uv.y = 0) vàng nhạt chia đốt; mép thân rực (fresnel); dải sáng surge chạy dọc thân theo nhịp.
export const dragonFragment = `
  uniform sampler2D map;
  uniform vec3 deep, edge, core, belly;
  uniform float time, opacity, ink, scales, surgePos, surgeOn;
  varying vec2 vUv;
  varying vec3 vN, vV;
  void main() {
    float s = vUv.x, ar = vUv.y;
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
    float bellyM = scales * smoothstep(0.55, 0.85, cos(ar * 6.2831853));
    vec3 tex = scales > 0.5 ? texture2D(map, vec2(ar * 2.0, s * 14.0 - time * 0.33)).rgb : vec3(0.55, 0.0, 0.0);
    float fill = tex.r, line = tex.g * (1.0 - bellyM);
    float rings = scales * bellyM * pow(0.5 + 0.5 * cos(s * 360.0 - time * 8.5), 6.0);
    float band = surgeOn * exp(-pow((s - surgePos) / 0.07, 2.0));
    float glint = scales * pow(0.5 + 0.5 * sin(s * 70.0 - time * 1.1 + ar * 12.566), 10.0) * 0.35;
    float tip = smoothstep(0.0, 0.05, s);
    if (ink > 0.5) {
      vec3 col = mix(deep, deep * 0.35, max(line, rings));
      float a = (0.4 + 0.5 * max(line, rings * 0.6)) * (1.0 - bellyM * 0.55) * (1.0 - 0.55 * fres) * tip;
      gl_FragColor = vec4(col, a * opacity);
    } else {
      vec3 col = mix(edge, core, clamp(fill * 0.5 + fres * 0.45 + band * 0.8 + glint, 0.0, 1.0));
      col = mix(col, belly, bellyM * 0.75);
      float a = (0.2 + fill * 0.42 + fres * 0.7 + bellyM * 0.24 + band * 0.7 + glint) * (1.0 - line * 0.6) * tip;
      gl_FragColor = vec4(col, min(a, 1.0) * opacity);
    }
${tail}`;

// Vây lưng: dải phẳng, răng cưa cắt theo uv; ngọn vây là lưỡi lửa chập chờn nhẹ.
export const finVertex = `
  ${spineWaveGlsl}
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position + spineWave(uv.x), 1.0);
  }
`;
export const finFragment = `
  uniform vec3 deep, edge, core;
  uniform float time, opacity, ink;
  varying vec2 vUv;
  void main() {
    float x = fract(vUv.x * 64.0), v = vUv.y;
    float prof = pow(1.0 - x, 0.75) * (0.78 + 0.22 * sin(vUv.x * 31.0));
    float body = smoothstep(0.0, 0.07, prof - v);
    if (body < 0.01) discard;
    float flick = 0.5 + 0.5 * sin(vUv.x * 90.0 - time * 1.3 + v * 3.0);
    if (ink > 0.5) { gl_FragColor = vec4(deep * 0.6, body * (0.6 - 0.35 * v) * opacity); }
    else {
      vec3 col = mix(edge, core, clamp(v * 0.6 + flick * 0.3, 0.0, 1.0));
      gl_FragColor = vec4(col, min(1.0, body * (0.4 + 0.5 * v + 0.25 * flick)) * opacity);
    }
${tail}`;

// Mặt phẳng nằm (khe nứt): alpha của texture là nét nứt; lửa dung nham trôi từ tâm ra ngoài theo khe.
export const flatVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const crackFragment = `
  uniform sampler2D map;
  uniform vec3 deep, edge, core;
  uniform float time, opacity, ink, gather;
  varying vec2 vUv;
  void main() {
    float lines = texture2D(map, vUv).a;
    if (lines < 0.01) discard;
    float r = length(vUv * 2.0 - 1.0), fade = 1.0 - smoothstep(0.62, 0.98, r);
    if (ink > 0.5) { gl_FragColor = vec4(deep, lines * 0.85 * fade * opacity); }
    else {
      float flow = pow(0.5 + 0.5 * sin(r * 15.0 - time * 0.8), 3.0), heat = exp(-r * 2.2);
      vec3 col = mix(edge, core, clamp(heat * 0.9 + flow * 0.35 + gather * heat * 0.6, 0.0, 1.0));
      gl_FragColor = vec4(col, min(1.0, lines * (0.45 + 0.55 * flow + 0.4 * heat + gather * heat * 0.5)) * fade * opacity);
    }
${tail}`;

// Instanced phẳng (vòng sóng quyền): độ đậm từng bản ở instanceColor.r.
export const instancedFlatVertex = `
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    vUv = uv; vAlpha = 1.0;
    vec4 p = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vAlpha = instanceColor.r;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * p;
  }
`;
export const instancedFlatFragment = `
  uniform sampler2D map;
  uniform vec3 tint;
  uniform float opacity;
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    float a = texture2D(map, vUv).a * vAlpha * opacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(tint, a);
${tail}`;

// Đá vỡ chấn địa: đá đen bazan, chân đá hắt ánh dung nham, mép đá ửng đỏ.
export const rockVertex = `
  varying vec3 vN, vV;
  varying float vY;
  void main() {
    vY = position.y;
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n); vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;
export const rockFragment = `
  uniform vec3 deep, edge;
  uniform float opacity, gather;
  varying vec3 vN, vV;
  varying float vY;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5);
    float lava = smoothstep(0.2, -0.9, vY) * (0.7 + 0.3 * gather);
    vec3 col = mix(deep * 1.6, edge, clamp(lava * 0.85 + fres * 0.45, 0.0, 1.0));
    gl_FragColor = vec4(col, 0.92 * opacity);
${tail}`;
