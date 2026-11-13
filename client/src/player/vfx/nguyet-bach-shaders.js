// Shader riêng của Nguyệt Bạch Tri Âm: dây cầm ngân, gợn sóng âm, gương nước có bóng trăng,
// tia trăng và nốt nhạc giảm tự phổ (billboard đọc ô trong atlas).
// Mọi chuyển động là hàm thuần của time với tốc độ cố định; nhịp chỉ đổi độ đậm/biên độ.

// Dây cầm (dải từ aura-ribbon-strips): lõi trắng bạc mảnh, quầng lam mềm, hai đầu tắt dần.
export const stringFragment = `
  uniform vec3 edge, core;
  uniform float opacity, fade;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    float across = abs(vUv.y * 2.0 - 1.0);
    float halo = exp(-across * across * 5.0), line = 1.0 - smoothstep(0.0, 0.3, across);
    float ends = smoothstep(0.0, 0.025, vUv.x) * smoothstep(1.0, 0.975, vUv.x);
    ends *= mix(1.0, pow(1.0 - vUv.x, 1.6), fade); // fade = 1: dây sáng tan dần về ngọn
    gl_FragColor = vec4(mix(edge, core, line), (halo * 0.45 + line * 0.85) * ends * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Mặt phẳng hữu hạn: vLocal = toạ độ cục bộ (mét) — dùng cho gợn sóng âm và gương nước.
export const localVertex = `
  varying vec2 vLocal;
  void main() { vLocal = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// Gợn sóng âm: âm phát ra từ cả bảy dây (một đoạn thẳng đứng nửa dài halfLen) nên mỗi gợn là
// một đường đồng khoảng cách tới đoạn thẳng (hình viên thuốc) nở ra đều, mảnh dần rồi tan.
// Mạnh nhất theo phương ngang (hai bên dây), mép gợn lăn tăn như sóng. Mặt nhân vật (head) được
// chừa trống. age/strength mỗi gợn tính trên CPU: tuổi tăng đều theo thời gian, độ đậm = độ ngân
// của dây lúc gợn đó phát ra.
export const RIPPLE_COUNT = 6;
export const rippleFragment = `
  uniform vec3 edge, core;
  uniform vec2 head;
  uniform float opacity, halfLen, time, reach;
  uniform float age[${RIPPLE_COUNT}], strength[${RIPPLE_COUNT}];
  varying vec2 vLocal;
  void main() {
    vec2 p = vLocal;
    float d = length(vec2(p.x, max(abs(p.y) - halfLen, 0.0)));
    float side = 0.35 + 0.65 * clamp(abs(p.x) / (d + 0.001), 0.0, 1.0);
    float wob = 0.01 * sin(p.y * 16.0 - time * 0.9) + 0.006 * sin(p.y * 37.0 + time * 0.6);
    float light = 0.0;
    for (int k = 0; k < ${RIPPLE_COUNT}; k++) {
      float a = age[k], r = 0.07 + a * reach, w = 0.004 + a * 0.012, dd = abs(d + wob * a - r);
      float aa = max(fwidth(d), 0.002);
      float ring = 1.0 - smoothstep(w, w + aa, dd);
      float echo = 1.0 - smoothstep(0.002, 0.002 + aa, abs(dd - 0.04 - a * 0.03));
      light += (ring + echo * 0.35) * pow(1.0 - a, 1.6) * smoothstep(0.0, 0.08, a) * strength[k];
    }
    light *= side * smoothstep(0.5, 0.78, length(p - head));
    if (light < 0.003) discard;
    gl_FragColor = vec4(mix(edge, core, min(1.0, light) * 0.6), min(1.0, light) * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Gương nước tĩnh (mặt phẳng đặt nằm; vLocal.x = x, -vLocal.y = z thế giới, cộng origin).
// ink=1: thân nước lam đêm normal-blend, sáng dần về phía sau như soi trời, bóng đàn đổ dọc tối.
// ink=0: lớp sáng — bóng trăng in nước vỡ thành vạch ngang lăn tăn, vệt trăng kéo về phía trước,
// lân tinh lấp lánh trên vệt, gợn mảnh quanh bóng trăng khi dây ngân (ringAge/ringStrength).
export const waterFragment = `
  uniform vec3 water, sky, edge, core, steel;
  uniform vec2 origin, moon, lute;
  uniform float opacity, ink, time, glow;
  uniform float ringAge[3], ringStrength[3];
  varying vec2 vLocal;
  void main() {
    vec2 p = vec2(vLocal.x, -vLocal.y) + origin;
    float r = length((p - vec2(0.0, -0.2)) / vec2(1.9, 1.5));
    float body = 1.0 - smoothstep(0.72, 1.0, r);
    if (body < 0.002) discard;
    if (ink > 0.5) {
      vec3 col = mix(water, sky, smoothstep(0.7, -1.4, p.y) * 0.45);
      col += sky * 0.12 * pow(0.5 + 0.5 * sin(p.y * 22.0 + sin(p.x * 5.0 + time * 0.2) * 1.2), 8.0);
      float shade = exp(-pow((p.x - lute.x) / 0.13, 2.0)) * smoothstep(lute.y - 0.1, lute.y + 0.1, p.y) * smoothstep(lute.y + 1.5, lute.y + 0.2, p.y);
      col = mix(col, steel * 0.35, shade * 0.55);
      gl_FragColor = vec4(col, body * opacity);
    } else {
      vec2 q = (p - moon) / vec2(0.34, 0.55);
      float qd = length(q);
      float bands = smoothstep(0.35, 0.95, sin(p.y * 52.0 + sin(p.x * 9.0 + time * 0.35) * 1.6 - time * 0.25));
      float broken = smoothstep(0.25, 0.7, 0.5 + 0.5 * sin(p.x * 23.0 + p.y * 7.0 + sin(p.y * 31.0) * 1.5 + time * 0.3));
      float disc = (1.0 - smoothstep(0.55, 1.0, qd)) * (0.18 + 0.6 * bands * broken);
      float along = p.y - moon.y, wid = 0.1 + 0.16 * max(along, 0.0);
      float path = exp(-pow((p.x - moon.x - sin(p.y * 3.0 + time * 0.2) * 0.03) / wid, 2.0))
        * smoothstep(0.1, 0.45, along) * smoothstep(2.0, 0.7, along);
      float glints = pow(max(0.0, sin(p.y * 64.0 + sin(p.x * 13.0 + time * 0.45) * 2.0 + time * 0.35)), 10.0);
      float light = disc * 0.7 + path * (glints * 0.85 + 0.08) + exp(-qd * qd * 0.5) * 0.12 * (0.7 + 0.6 * glow);
      for (int k = 0; k < 3; k++) {
        float a = ringAge[k], rr = 1.05 + a * 1.4, aa = max(fwidth(qd), 0.002);
        light += (1.0 - smoothstep(0.012, 0.012 + aa, abs(qd - rr))) * pow(1.0 - a, 1.5) * smoothstep(0.0, 0.1, a) * ringStrength[k] * 0.5;
      }
      light *= body;
      if (light < 0.003) discard;
      gl_FragColor = vec4(mix(edge, core, clamp(disc + glints * path, 0.0, 1.0)), min(1.0, light) * opacity);
    }
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Tia trăng: dải sáng mờ từ trăng (v = 0) rọi xuống mặt nước (v = 1), bụi sáng trôi dọc tia.
export const rayVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const rayFragment = `
  uniform vec3 edge, core;
  uniform float opacity, time;
  varying vec2 vUv;
  void main() {
    float across = (vUv.x - 0.5) * 2.0, v = vUv.y;
    float beam = exp(-across * across * 3.5) * smoothstep(0.0, 0.18, v) * pow(1.0 - v, 1.1);
    float motes = pow(max(0.0, sin(v * 40.0 - time * 0.5 + across * 3.0)), 14.0) * 0.6;
    float a = beam * (0.55 + motes);
    if (a < 0.003) discard;
    gl_FragColor = vec4(mix(edge, core, 0.6), a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Billboard nốt nhạc: như billboardVertex chung nhưng chọn ô 2×2 trong atlas theo instanceColor.b.
export const noteVertex = `
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    vec4 center = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec2 size = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
    vAlpha = instanceColor.r;
    float spin = instanceColor.g * 6.2831853, cell = floor(instanceColor.b + 0.5);
    vUv = (uv + vec2(mod(cell, 2.0), floor(cell / 2.0))) * 0.5;
    vec2 offset = mat2(cos(spin), sin(spin), -sin(spin), cos(spin)) * (position.xy * size);
    vec4 mv = modelViewMatrix * center;
    mv.xy += offset;
    gl_Position = projectionMatrix * mv;
  }
`;
