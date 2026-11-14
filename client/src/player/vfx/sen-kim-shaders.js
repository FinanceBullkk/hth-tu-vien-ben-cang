// Shader riêng của Sen kim (effect 1) — Cửu Phẩm Kim Liên. Bảng màu chung mọi shader:
// deep nâu vàng thẫm (đế, bóng), body vàng sen, ivory kem lòng cánh, gold vàng kim viền/gân,
// core lõi sáng. Động từ chậm đều: gân có dòng khí chảy gốc → ngọn, viền sáng theo nhịp thở.

// Cánh sen (instanced, hình học sen-kim-petal-geometry): uv.x ngang cánh, uv.y dọc cánh.
export const petalVertex = `
  varying vec2 vUv; varying vec3 vN, vEye; varying float vSeed;
  void main() {
    vUv = uv; vSeed = float(gl_InstanceID) * 1.37;
    vec3 n = normal; vec4 p = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n); vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
// mode 0: thân cánh (normal blend, ghi depth để các cánh trong một lần vẽ che nhau đúng thứ tự) —
//   gốc vàng sen, lòng kem, gân mảnh khắc sâu, mặt sau tối hơn cho dày.
// mode 1: viền phát quang chọn lọc — fresnel ở mép và đỉnh cánh, cộng màu.
// mode 2: gân nổi — sống giữa và hai gân phụ sáng rõ, dòng khí chạy dọc cánh (cộng màu).
export const petalFragment = `
  uniform vec3 deep, body, ivory, gold, core;
  uniform float time, opacity, mode, pulse;
  varying vec2 vUv; varying vec3 vN, vEye; varying float vSeed;
  void main() {
    float u = vUv.x, v = vUv.y, across = u * 2.0 - 1.0;
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vEye))), 1.8);
    float flow = pow(0.5 + 0.5 * sin(v * 7.0 - time * 0.5 + vSeed), 5.0);
    vec4 c;
    if (mode < 0.5) {
      // Thân cánh vàng sen là chủ đạo; kem ngà chỉ điểm ở lòng cánh gần ngọn.
      vec3 col = mix(body, ivory, smoothstep(0.5, 0.95, v) * (0.3 + 0.45 * (1.0 - abs(across))));
      float mid = pow(1.0 - abs(across), 9.0);
      float side = pow(max(0.0, 1.0 - abs(abs(across) - 0.48) / 0.09), 2.0) * 0.45;
      col += gold * (mid * 0.4 + side) * (0.6 + flow * 0.4);
      col += deep * 0.22 * (1.0 - smoothstep(0.0, 0.3, v));
      if (!gl_FrontFacing) col *= 0.8;
      c = vec4(col, 0.97);
    } else if (mode < 1.5) {
      float tip = smoothstep(0.4, 1.0, v);
      float a = (fres * fres * (0.3 + 0.55 * tip) + pow(abs(across), 6.0) * 0.3)
        * (0.7 + 0.35 * pulse) * (0.85 + 0.25 * flow);
      c = vec4(mix(gold, core, clamp(tip + fres * 0.4, 0.0, 1.0)), a);
    } else {
      float mid = pow(1.0 - abs(across), 14.0);
      float side = pow(max(0.0, 1.0 - abs(abs(across) - 0.48) / 0.07), 2.0) * 0.6;
      float a = (mid * 0.75 + side) * (0.5 + flow * 0.5) * (0.75 + 0.3 * pulse);
      c = vec4(mix(gold, core, flow * 0.6), a);
    }
    c.a *= opacity;
    if (c.a < 0.004) discard;
    gl_FragColor = vec4(c.rgb, min(c.a, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Đế đài (LatheGeometry): uv.x chạy quanh âu tròn, uv.y theo biên dạng chén.
export const dishFragment = `
  uniform vec3 deep, body, ivory, gold, core;
  uniform float time, opacity, pulse;
  varying vec2 vUv;
  void main() {
    vec3 col = mix(deep, body, smoothstep(0.05, 0.6, vUv.y));
    col = mix(col, ivory, smoothstep(0.75, 0.95, vUv.y) * 0.5);
    float glint = pow(0.5 + 0.5 * cos(vUv.x * 18.8496 - time * 0.5), 24.0);
    col += gold * glint * 0.35;
    col += core * pulse * (1.0 - vUv.y) * 0.2;
    float a = 0.96 * opacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, min(a, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Sợi chỉ bồ nhụy (TubeGeometry): uv.x dọc sợi 0 gốc → 1 ngọn; gốc đậm, ngọn tan.
export const stamenFragment = `
  uniform vec3 deep, body, ivory, gold, core;
  uniform float time, opacity, pulse;
  varying vec2 vUv;
  void main() {
    float taper = pow(1.0 - vUv.x, 1.3);
    float sway = 0.8 + 0.2 * sin(vUv.x * 9.0 - time * 0.6);
    vec3 col = mix(gold, core, smoothstep(0.0, 0.45, vUv.x));
    float a = taper * sway * (0.55 + 0.45 * pulse) * opacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, min(a, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
