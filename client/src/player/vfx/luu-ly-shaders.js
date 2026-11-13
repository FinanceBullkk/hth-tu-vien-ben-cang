// Shader riêng của Lưu Ly Vân Thủy (effect 2): giọt lưu ly 3D và song lý (cá chép) dưới chân.

// Giọt lưu ly instanced: vLocal = toạ độ gốc của giọt (y: 0 đáy tròn → 1 đầu nhọn),
// vAng = góc của giọt trong vòng (cho sóng sáng quét tuần tự quanh bánh xe).
export const crystalVertex = `
  varying vec3 vN, vEye, vLocal;
  varying float vAng;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    vAng = 0.0;
    vLocal = position;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
      vec3 c = instanceMatrix[3].xyz;
      vAng = atan(c.x, c.y);
    #endif
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n);
    vEye = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

// Kính lưu ly: thân trong, viền sáng theo góc nhìn, vân sáng (caustic) trôi chậm trong lòng giọt,
// đầu giọt ngả tím biếc; sóng sáng quét quanh vòng theo nhịp. ink=1 giữ hình trên nền sáng.
export const crystalFragment = `
  uniform vec3 steel, edge, core, gold;
  uniform float time, opacity, sweep, sweepOn, ink;
  varying vec3 vN, vEye, vLocal;
  varying float vAng;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vEye))), 1.4);
    float v = clamp(vLocal.y, 0.0, 1.0);
    float caustic = pow(0.5 + 0.5 * sin(v * 13.0 - time * 0.7 + vAng * 3.0 + vLocal.x * 18.0), 6.0);
    float d = mod(sweep - vAng + 3.14159265, 6.2831853) - 3.14159265;
    float wave = exp(-d * d * 4.0) * sweepOn;
    vec3 body = mix(edge, gold, smoothstep(0.25, 1.0, v) * 0.6);
    vec3 col = mix(body * 0.65, core, clamp(fres * 0.65 + caustic * 0.35 + wave * 0.6, 0.0, 1.0));
    float a = 0.2 + fres * 0.62 + caustic * 0.18 + wave * 0.4;
    if (ink > 0.5) { col = steel * 0.6; a = 0.22 + fres * 0.38; }
    gl_FragColor = vec4(col * (ink > 0.5 ? 1.0 : 1.25 + wave * 0.4), a * opacity);
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
