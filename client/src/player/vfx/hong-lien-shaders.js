// Shader của Hồng Liên Hỏa Vũ (effect 4): lông vũ chu tước (instanced), phượng vĩ (dải động).
// Lửa ở đây mềm như lụa và lông vũ: không có lưỡi lửa bùng, chỉ có sắc đỏ son ngả cam rồi vàng
// ở đầu lông, mép xơ như nét bút và một luồng sáng trôi chậm từ gốc ra ngọn.

// Lông vũ instanced: uv.x ngang (0..1), uv.y dọc (0 gốc → 1 ngọn). Seed lấy theo gl_InstanceID.
export const featherVertex = `
  varying vec2 vUv;
  varying float vSeed;
  varying vec3 vN, vEye;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    vSeed = float(gl_InstanceID) * 1.37;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
    #endif
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n);
    vEye = normalize(-mv.xyz);
    vUv = uv;
    gl_Position = projectionMatrix * mv;
  }
`;

// Lông vũ: trục sáng, tơ lông chéo, mép xơ như nét bút, luồng sáng trôi chậm từ gốc ra ngọn.
// ink 1 = lớp mực đỏ son normal blend để giữ hình trên nền sáng.
export const featherFragment = `
  uniform vec3 steel, edge, core, gold;
  uniform float time, opacity, ink, pulse;
  varying vec2 vUv;
  varying float vSeed;
  varying vec3 vN, vEye;
  void main() {
    float u = vUv.y, across = abs(vUv.x * 2.0 - 1.0);
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vEye))), 1.4);
    float fray = 0.1 * sin(u * 47.0 + vSeed * 5.0 + time * 0.35) + 0.07 * sin(u * 91.0 + vSeed * 2.0);
    float body = 1.0 - smoothstep(0.62 + fray, 0.98 + fray * 0.4, across);
    float flow = exp(-pow((u - fract(time * 0.07 + vSeed * 0.21)) * 5.0, 2.0));
    float rachis = exp(-across * across * 260.0) * smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.85, 1.0, u));
    float barbs = 0.5 + 0.5 * pow(0.5 + 0.5 * sin(across * 26.0 - u * 58.0 + vSeed), 2.0);
    float a = body * barbs * smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.9, 1.0, u)) * 0.55 + rachis * 0.5;
    float glow = rachis * 0.7 + flow * 0.45 * (1.0 - across);
    // Gốc đỏ son đậm → thân hồng cam → đầu lông vàng; lõi ngà chỉ ở trục và luồng sáng.
    vec3 col = mix(steel * 1.5, edge, smoothstep(0.0, 0.45, u));
    col = mix(col, gold, smoothstep(0.6, 1.0, u) * 0.85);
    col = mix(col, core, clamp(glow * 0.6 + fres * 0.15 + pulse * 0.08, 0.0, 0.7));
    if (ink > 0.5) { col = steel * 0.55; a *= 0.5; }
    a *= 0.75 + 0.35 * fres;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, min(a, 1.0) * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Phượng vĩ trên dải động (ribbonVertex của aura-flow-shaders): thân lông mảnh, ngọn nở thành
// mắt lông hình giọt (vành vàng, tròng đỏ son, lõi ngà), tơ lông hai bên rủ mềm.
export const plumeFragment = `
  uniform vec3 steel, edge, core, gold;
  uniform float time, opacity, ink;
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    float u = vUv.x, across = abs(vUv.y * 2.0 - 1.0);
    float fray = 0.12 * sin(u * 61.0 + vSeed * 4.0 - time * 0.4);
    float barbs = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(across * 20.0 - u * 70.0 + vSeed), 2.0);
    float body = (1.0 - smoothstep(0.5 + fray, 0.95, across)) * barbs;
    float rachis = exp(-across * across * 300.0) * (1.0 - smoothstep(0.8, 0.9, u));
    vec2 e = vec2((u - 0.84) * 3.2, across);
    float er = length(e);
    float ring = exp(-pow((er - 0.62) * 9.0, 2.0)), iris = 1.0 - smoothstep(0.3, 0.5, er), pupil = 1.0 - smoothstep(0.08, 0.2, er);
    float eye = clamp(ring + iris, 0.0, 1.0) * smoothstep(0.6, 0.7, u);
    float flow = exp(-pow((u - fract(time * 0.06 + vSeed * 0.3)) * 6.0, 2.0)) * 0.4;
    vec3 col = mix(steel * 1.5, edge, smoothstep(0.0, 0.5, u));
    col = mix(col, steel * 1.8, iris * smoothstep(0.6, 0.7, u));
    col = mix(col, gold, ring * 0.9);
    col = mix(col, core, clamp(pupil * 0.8 + rachis * 0.3 + flow * 0.5, 0.0, 0.8));
    float a = (body * 0.32 + rachis * 0.3 + eye * 0.7) * smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.96, 1.0, u));
    if (ink > 0.5) { col = steel * 0.5; a *= 0.45; }
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, min(a, 1.0) * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
