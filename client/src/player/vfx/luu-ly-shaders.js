// Shader riêng của Lưu Ly Vân Thủy (effect 2): rèm châu lưu ly, vòm thủy quang, màn nước, song lý.

// Hạt lưu ly instanced (rèm châu): vLocal = toạ độ gốc của hạt (y: 0 đáy tròn → 1 đầu nhọn);
// vGlint = độ sáng riêng từng hạt (instanceColor.r) — giọt sáng trượt dọc chuỗi.
export const crystalVertex = `
  varying vec3 vN, vEye, vLocal;
  varying float vGlint;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    vLocal = position;
    vGlint = 0.0;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vGlint = instanceColor.r;
    #endif
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n);
    vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

// Kính lưu ly: thân trong, viền sáng theo góc nhìn, vân sáng (caustic) trôi chậm trong lòng hạt,
// đầu hạt ngả tím biếc; hạt có giọt sáng đi qua thì bừng trắng ngà. ink=1 giữ hình trên nền sáng.
export const crystalFragment = `
  uniform vec3 steel, edge, core, gold;
  uniform float time, opacity, ink;
  varying vec3 vN, vEye, vLocal;
  varying float vGlint;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vEye))), 1.4);
    float v = clamp(vLocal.y, 0.0, 1.0);
    float caustic = pow(0.5 + 0.5 * sin(v * 13.0 - time * 0.7 + vLocal.x * 18.0 + vLocal.z * 11.0), 6.0);
    vec3 body = mix(edge, gold, smoothstep(0.25, 1.0, v) * 0.6);
    vec3 col = mix(body * 0.65, core, clamp(fres * 0.6 + caustic * 0.3 + vGlint * 0.8, 0.0, 1.0));
    float a = 0.22 + fres * 0.6 + caustic * 0.16 + vGlint * 0.45;
    if (ink > 0.5) { col = steel * 0.6; a = 0.25 + fres * 0.4; }
    gl_FragColor = vec4(col * (ink > 0.5 ? 1.0 : 1.2 + vGlint * 0.5), a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Vòm thủy quang: dải nước cong trên đầu (u 0 → 1 từ chân vòm trái sang phải). Nước chảy từ
// đỉnh vòm ra hai chân, mép xơ như nét bút, hai chân vòm tan vào mây, ánh tím biếc ở chân.
export const canopyFragment = `
  uniform vec3 edge, core, gold;
  uniform float time, opacity;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0), mid = abs(u - 0.5) * 2.0;
    float fray = 0.16 * sin(u * 41.0 + vSeed * 7.0 - time * 0.8) + 0.1 * sin(u * 97.0 + vSeed * 3.0 + time * 0.5);
    float body = 1.0 - smoothstep(0.35 + fray, 1.0 + fray * 0.5, across);
    float flow = pow(0.5 + 0.5 * sin(mid * 26.0 - time * 1.1 + vSeed * 2.0), 4.0);
    float ends = smoothstep(1.0, 0.82, mid);
    vec3 col = mix(edge, gold, smoothstep(0.5, 1.0, mid) * 0.7);
    col = mix(col, core, clamp((1.0 - mid) * 0.5 + flow * 0.5 * (1.0 - across), 0.0, 1.0));
    gl_FragColor = vec4(col, body * ends * (0.5 + 0.6 * flow) * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Màn nước rủ (u 0 trên → 1 dưới): sợi nước dọc chảy xuống, đáy xơ tan thành bụi nước.
// Dây chuỗi châu (mode tơ mảnh) dùng cùng shader với sợi dày hơn.
export const veilFragment = `
  uniform vec3 edge, core;
  uniform float time, opacity;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0);
    float threads = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(vUv.y * 23.0 + sin(u * 6.0 + vSeed) * 1.5), 3.0);
    float fall = pow(0.5 + 0.5 * sin(u * 18.0 - time * 1.3 + vSeed * 5.0 + vUv.y * 2.0), 5.0);
    float edgeFade = 1.0 - smoothstep(0.55, 1.0, across);
    float ends = smoothstep(0.0, 0.12, u) * (1.0 - smoothstep(0.62 + 0.2 * sin(vUv.y * 9.0 + vSeed), 1.0, u));
    vec3 col = mix(edge, core, fall * 0.8);
    gl_FragColor = vec4(col, threads * edgeFade * ends * (0.28 + 0.6 * fall) * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Song lý: thân cá (u 0 đầu → 0.72 gốc đuôi) và vây đuôi lụa (u > 0.72) trên cùng một dải.
// Vảy ánh ngọc trai, đốm tím biếc trên lưng, mắt sáng; vây đuôi trong, có sợi tơ chạy theo gió.
export const koiFragment = `
  uniform vec3 steel, edge, core, gold;
  uniform float time, opacity, ink;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0);
    float fin = smoothstep(0.66, 0.78, u);
    float body = (1.0 - smoothstep(0.55, 1.0, across)) * (1.0 - fin);
    float scales = 0.75 + 0.25 * pow(0.5 + 0.5 * sin(u * 120.0 + sin(vUv.y * 18.0) * 2.0), 4.0);
    float spots = smoothstep(0.55, 0.8, 0.5 + 0.5 * sin(u * 17.0 + vSeed * 3.0) * cos(vUv.y * 5.0 + vSeed));
    float eye = exp(-pow((u - 0.07) * 30.0, 2.0)) * exp(-pow((across - 0.45) * 7.0, 2.0));
    float strands = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(vUv.y * 30.0 + u * 6.0 - time * 0.6 + vSeed), 2.0);
    float finA = fin * (1.0 - smoothstep(0.6, 1.0, across)) * strands * pow(1.0 - u, 0.5) * 1.6;
    // Lưng lam, bụng trắng ngà, đốm tím biếc; vây đuôi lam trong.
    vec3 col = mix(core, edge, 0.35 + 0.45 * pow(across, 1.5));
    col = mix(col, gold, spots * 0.8 * (1.0 - fin));
    col = mix(col, edge, fin * 0.75);
    col = mix(col, core, eye);
    float a = body * scales * (0.55 + 0.3 * (1.0 - across)) + finA * 0.5 + eye * 0.6;
    if (ink > 0.5) { col = mix(steel * 0.5, gold * 0.45, spots * 0.6); a = body * (0.45 + 0.25 * across) + finA * 0.2; }
    if (a < 0.003) discard;
    gl_FragColor = vec4(col, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
