// Shader cho các lớp "bay bổng" của Kiếm Vũ: dải lưu quang, phiêu đái lụa, billboard mây/sao.

// Dải nét bút: u dọc dải (0 = đầu sáng, 1 = đuôi), v ngang. seed lệch vân cho từng dải.
export const ribbonVertex = `
  attribute float seed;
  varying vec2 vUv;
  varying float vSeed;
  void main() { vUv = uv; vSeed = seed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// Lưu quang: đầu sáng trắng ngọc, thân ngọc bích, đuôi ngả vàng rồi tan; mép bị gió xói
// thành sợi (không đều nét như ống tròn), vân sáng chảy từ đầu về đuôi.
export const arcFragment = `
  uniform vec3 edge, core, gold;
  uniform float time, opacity;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0);
    float fray = 0.18 * sin(u * 37.0 + vSeed * 7.0 - time * 3.0) + 0.12 * sin(u * 83.0 + vSeed * 3.0 + time * 2.0);
    float body = 1.0 - smoothstep(0.35 + fray, 1.0 + fray * 0.5, across);
    float strands = 0.55 + 0.45 * pow(0.5 + 0.5 * sin(vUv.y * 22.0 + u * 9.0 + vSeed), 3.0);
    float head = exp(-u * 9.0), tail = pow(1.0 - u, 1.3);
    float flow = pow(0.5 + 0.5 * sin(u * 24.0 + time * 5.0 + vSeed * 2.0), 4.0) * 0.5;
    vec3 col = mix(edge, gold, smoothstep(0.45, 1.0, u) * 0.75);
    col = mix(col, core, clamp(head * 1.2 + flow * (1.0 - across), 0.0, 1.0));
    gl_FragColor = vec4(col, body * strands * tail * (0.55 + flow + head) * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Phiêu đái: lụa mỏng trong, viền sáng, hoa văn mây dệt chìm chạy theo gió, gốc đậm ngọn tan.
export const silkFragment = `
  uniform vec3 edge, core, gold;
  uniform float time, opacity;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    float u = vUv.x, v = vUv.y, across = abs(v * 2.0 - 1.0);
    float rim = smoothstep(0.7, 0.97, across) * (1.0 - smoothstep(0.97, 1.0, across));
    float sheer = 0.3 + 0.32 * pow(0.5 + 0.5 * sin(u * 30.0 - time * 2.4 + v * 4.0), 6.0);
    float weave = pow(0.5 + 0.5 * sin(u * 70.0 + sin(v * 9.0 + u * 5.0) * 2.0), 18.0) * 0.35;
    float fade = smoothstep(0.0, 0.06, u) * pow(1.0 - u, 0.8);
    vec3 col = mix(edge * 0.85, core, 0.12 + 0.3 * (1.0 - u) * (1.0 - across));
    col = mix(col, gold, rim * 0.6);
    float a = (sheer + weave + rim * 0.9) * fade * (1.0 - smoothstep(0.97, 1.0, across));
    gl_FragColor = vec4(col, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Billboard instanced: luôn quay mặt về camera; scale x/y lấy từ ma trận instance, độ đậm từng
// hạt lấy từ instanceColor.r (0 = ẩn), xoay trong mặt phẳng nhìn bằng instanceColor.g.
export const billboardVertex = `
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    vUv = uv;
    vec4 center = vec4(0.0, 0.0, 0.0, 1.0);
    vec2 size = vec2(1.0);
    vAlpha = 1.0;
    float spin = 0.0;
    #ifdef USE_INSTANCING
      center = instanceMatrix * center;
      size = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
    #endif
    #ifdef USE_INSTANCING_COLOR
      vAlpha = instanceColor.r; spin = instanceColor.g * 6.2831853;
    #endif
    vec2 offset = position.xy * size;
    offset = mat2(cos(spin), sin(spin), -sin(spin), cos(spin)) * offset;
    vec4 mv = modelViewMatrix * center;
    mv.xy += offset;
    gl_Position = projectionMatrix * mv;
  }
`;
export const billboardFragment = `
  uniform sampler2D map;
  uniform vec3 tint;
  uniform float opacity;
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    vec4 tex = texture2D(map, vUv);
    float a = tex.a * vAlpha * opacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(tint * tex.rgb, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
