// Shader riêng của Xích Diễm Lưu Vân (effect 10) — Hỏa Vân Đài. Bảng màu chung mọi shader:
// deep đỏ thẫm (lớp mực), body đỏ son (thân mây), ember cam lửa, gold vàng kim, core lõi sáng.
// Vân lửa đều chạy NGANG với tốc độ cố định (động từ "trôi ngang"), không có pha bùng hay lóe.

// Cuộn tường vân 3D (instanced): vPos là toạ độ trong hình mây (rộng ≈ 1, cao ≈ 0.6).
export const cloudVertex = `
  varying vec3 vPos, vN, vEye;
  varying float vSeed;
  void main() {
    vPos = position; vSeed = float(gl_InstanceID) * 1.37;
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n); vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
// mode 0: thân đặc đỏ son (normal blend) — đáy thẫm, đỉnh son, vân lửa mờ trôi ngang.
// mode 1: quầng viền vàng cam theo góc nhìn + vân lửa (cộng màu).
// mode 2: gờ xoắn ốc vàng kim sáng (cộng màu).
export const cloudFragment = `
  uniform vec3 deep, body, ember, gold, core;
  uniform float time, opacity, mode, pulse;
  varying vec3 vPos, vN, vEye;
  varying float vSeed;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vEye))), 1.6);
    float h = clamp(vPos.y / 0.6, 0.0, 1.0);
    float vein = pow(0.5 + 0.5 * sin(vPos.x * 15.0 + sin(vPos.y * 9.0 + vSeed) * 1.8 + vSeed - time * 0.9), 6.0);
    vec4 c;
    if (mode < 0.5) {
      vec3 col = mix(deep, body, smoothstep(0.0, 0.7, h));
      col = mix(col, ember, fres * 0.4 + vein * 0.15);
      c = vec4(col, 0.94);
    } else if (mode < 1.5) {
      float a = (fres * fres * 0.95 + vein * 0.2 * (1.0 - fres) + (1.0 - h) * 0.1) * (0.85 + 0.3 * pulse);
      c = vec4(mix(ember, gold, fres), a);
    } else {
      float a = (0.6 + 0.4 * fres + vein * 0.3) * (0.8 + 0.3 * pulse);
      c = vec4(mix(gold, core, clamp(fres * 0.6 + vein * 0.4, 0.0, 1.0)), a);
    }
    c.a *= opacity;
    if (c.a < 0.004) discard;
    gl_FragColor = vec4(c.rgb, min(c.a, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Dải lửa trên dải động (ribbonVertex của aura-flow-shaders: vUv, vSeed). u = dọc dải.
// mode 0: lưỡi lửa liếm ngang (u 0 = gốc trên mây → 1 = ngọn), mép xơ trôi từ gốc ra ngọn.
// mode 1: vành lửa ngang eo (dải khép kín, vân tuần hoàn theo u), viền vàng hai mép.
// mode 2: lưu vân — vệt mây lửa dài thon hai đầu, vân cuộn trôi theo dải.
// mode 3: mào lửa dọc vành eo (vUv.y 0 = chân → 1 = đỉnh), chuỗi ngọn lửa nhỏ trôi quanh vòng.
// ink 1 = bản mực đỏ thẫm (normal blend) để đọc được trên nền sáng.
export const fireStripFragment = `
  uniform vec3 deep, body, ember, gold, core;
  uniform float time, opacity, mode, ink;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    const float TAU = 6.2831853;
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0), a, heat;
    if (mode < 0.5) {
      float fray = (0.25 * sin(u * 23.0 - time * 1.2 + vSeed * 5.0) + 0.12 * sin(u * 49.0 - time * 0.8 + vSeed * 2.0)) * u;
      a = (1.0 - smoothstep(0.35 + fray, 1.0, across + u * 0.25)) * smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.7, 1.0, u));
      heat = (1.0 - u) * (1.0 - across);
    } else if (mode < 1.5) {
      float flow = 0.6 + 0.4 * pow(0.5 + 0.5 * sin(u * TAU * 9.0 - time * 0.8 + sin(u * TAU * 4.0) * 1.2), 3.0);
      float lips = exp(-pow((across - 0.82) * 9.0, 2.0));
      a = (1.0 - smoothstep(0.7, 1.0, across)) * flow * 0.8 + lips * 0.6;
      heat = (1.0 - across) * flow + lips * 0.5;
    } else if (mode < 2.5) {
      float s = sin(u * 3.14159265);
      float curls = 0.6 + 0.4 * sin(u * 38.0 - time * 0.6 + across * 4.0 + vSeed);
      float fray = 0.15 * sin(u * 29.0 + vSeed * 3.0 - time * 0.5);
      a = (1.0 - smoothstep(0.3 + fray, 1.0, across)) * pow(s, 0.8) * curls;
      heat = (1.0 - across) * s * 0.7;
    } else {
      float tip = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(u * TAU * 18.0 - time * 0.7 + sin(u * TAU * 5.0) * 1.5), 1.5);
      a = 1.0 - smoothstep(tip * 0.55, tip, vUv.y);
      a *= 1.0 - smoothstep(0.2, 0.5, abs(fract(u * 18.0 - time * 0.7 / TAU) - 0.5)) * 0.4;
      heat = 1.0 - vUv.y / tip;
    }
    vec3 col = mix(body, ember, smoothstep(0.0, 0.45, heat));
    col = mix(col, gold, smoothstep(0.4, 0.75, heat));
    col = mix(col, core, smoothstep(0.8, 1.0, heat));
    if (ink > 0.5) { col = deep; a *= 0.55; }
    a *= opacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, min(a, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Biển mây dưới chân (mặt phẳng nằm): hoa văn tường vân lát gạch trải theo (góc, bán kính), cả biển
// TRÔI VÒNG theo góc với tốc độ drift (vòng/giây) khớp đài mây. Mép ngoài là chuỗi múi mây cuộn
// (không phải vòng tròn), có đường viền vàng chạy theo múi. ink 1 = nền mây đỏ thẫm normal blend.
export const seaVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const seaFragment = `
  uniform sampler2D map;
  uniform vec3 deep, body, ember, gold, core;
  uniform float time, opacity, drift, arms, lobes, inner, ink, pulse;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.x, p.y) / 6.2831853 + time * drift;
    float lobe = sqrt(abs(sin(3.14159265 * a * lobes)));
    float edge = 0.8 + 0.15 * lobe;
    float hole = smoothstep(inner, inner + 0.12, r);
    float mask = (1.0 - smoothstep(edge - 0.07, edge, r)) * hole;
    float s = texture2D(map, vec2(a * arms, r * 1.5)).a;
    float rim = exp(-pow((r - edge + 0.035) * 45.0, 2.0)) * hole;
    float al;
    vec3 col;
    if (ink > 0.5) {
      col = mix(deep, body, 0.25 + 0.3 * s);
      al = (0.3 + 0.55 * s) * mask + rim * 0.35;
    } else {
      col = mix(ember, gold, clamp(s * 0.6 + rim * 0.7 + pulse * 0.2, 0.0, 1.0));
      al = s * mask * 0.85 + rim * 0.75;
    }
    al *= opacity;
    if (al < 0.004) discard;
    gl_FragColor = vec4(col, min(al, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
