// Shader cá 3D của Vua câu cá. Mọi phần cá nằm dưới "mặt nước" của aura (y cục bộ < 0) bị cắt bỏ,
// nên cá vọt lên / lặn xuống đúng như xuyên qua mặt biển dưới chân. aKind: 0 cá chép vàng, 1 cá bạc.

export const fishBodyVertex = `
  attribute float aKind;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  varying float vKind;
  void main() {
    vUv = uv; vKind = aKind; vY = position.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

// Thân cá: lưng đậm bụng ngà, vảy vòng cung xếp so le có viền, vệt sáng lướt từ đầu ra đuôi,
// mắt đen có đốm sáng, viền mực ở mép như tranh thuỷ mặc, phản quang kim loại theo góc nhìn.
export const fishBodyFragment = `
  uniform vec3 gold, deep, belly, silver, silverDeep, ink, light;
  uniform float time, opacity, pulse;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vY; varying float vKind;
  void main() {
    if (vY < 0.0) discard;
    vec3 n = normalize(vN), v = normalize(vV), L = normalize(vec3(0.35, 0.8, 0.5));
    float u = vUv.x, around = vUv.y;
    float back = 0.5 + 0.5 * cos(around * 6.2831853);
    vec3 top = vKind < 0.5 ? deep : silverDeep, mid = vKind < 0.5 ? gold : silver;
    vec3 col = mix(belly, mix(mid, top, smoothstep(0.55, 1.0, back)), smoothstep(0.1, 0.55, back));
    // Vảy: lưới so le theo (u, vòng quanh thân), viền tối và lõi sáng.
    vec2 sc = vec2(u * 26.0, around * 16.0);
    sc.y += mod(floor(sc.x), 2.0) * 0.5;
    vec2 cell = fract(sc) - vec2(0.3, 0.5);
    float rim = smoothstep(0.32, 0.46, length(cell * vec2(1.0, 1.25)));
    float scaled = smoothstep(0.14, 0.24, u);
    col *= 1.0 - rim * 0.32 * scaled;
    col += light * (1.0 - rim) * 0.08 * scaled;
    // Mắt hai bên đầu.
    float eye = 1.0 - smoothstep(0.018, 0.026, length(vec2((u - 0.075) * 1.0, (abs(around - 0.5) - 0.27) * 0.55)));
    float glint = 1.0 - smoothstep(0.004, 0.009, length(vec2(u - 0.07, (abs(around - 0.5) - 0.262) * 0.55)));
    col = mix(col, vec3(0.03), eye);
    col = mix(col, vec3(1.0), glint);
    // Ánh sáng: khuếch tán + phản chiếu kim loại + vệt sáng chạy dọc thân + nhịp.
    float ndl = max(dot(n, L), 0.0), fres = 1.0 - abs(dot(n, v));
    col *= 0.55 + 0.55 * ndl;
    col += light * pow(max(dot(reflect(-L, n), v), 0.0), 26.0) * 0.9;
    col += light * pow(0.5 + 0.5 * sin(u * 9.0 - time * 3.2), 14.0) * 0.45 * (1.0 - eye);
    col += mid * pulse * 0.5;
    col = mix(col, ink, smoothstep(0.6, 0.96, fres) * 0.55);
    gl_FragColor = vec4(col, opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const finVertex = `
  attribute float aKind;
  varying vec2 vUv;
  varying float vY;
  varying float vKind;
  void main() {
    vUv = uv; vKind = aKind; vY = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Vây lụa: trong mờ, tia vây chạy dọc, gốc đậm ngọn tan, mép sáng; cá chép vàng-cam, cá bạc lam nhạt.
// vKind ≥ 2 là râu cá chép: sợi vàng sáng mảnh.
export const finFragment = `
  uniform vec3 finGold, finTip, finSilver, light;
  uniform float time, opacity;
  varying vec2 vUv; varying float vY; varying float vKind;
  void main() {
    if (vY < 0.0) discard;
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0);
    if (vKind > 1.5) {
      gl_FragColor = vec4(light, (1.0 - u) * 0.9 * opacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      return;
    }
    float rays = 0.55 + 0.45 * pow(0.5 + 0.5 * sin(vUv.y * 46.0), 3.0);
    vec3 col = vKind < 0.5 ? mix(finGold, finTip, smoothstep(0.2, 1.0, u)) : mix(finSilver, light, u * 0.5);
    float edge = smoothstep(0.75, 0.98, across);
    col = mix(col, light, edge * 0.5);
    float shimmer = pow(0.5 + 0.5 * sin(u * 12.0 - time * 4.0 + vUv.y * 3.0), 10.0) * 0.4;
    float a = (0.35 + 0.4 * rays + shimmer) * (1.0 - smoothstep(0.8, 1.0, u) * 0.6) * (1.0 - smoothstep(0.96, 1.0, across));
    gl_FragColor = vec4(col + light * shimmer * 0.5, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
