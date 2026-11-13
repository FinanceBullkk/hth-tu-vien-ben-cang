export const groundVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv * 2.0 - 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const groundFragment = `
  varying vec2 vUv;
  uniform vec3 tint, accent;
  uniform float time, level, seated, opacity, burst, theme;
  float stroke(float d, float width) {
    float aa = max(fwidth(d), 0.0015);
    return 1.0 - smoothstep(width, width + aa, abs(d));
  }
  void main() {
    float r = length(vUv), a = atan(vUv.y, vUv.x);
    float breath = 0.97 + 0.03 * sin(time * 0.8);
    float turn = a + time * 0.06;
    float petals = 8.0;
    if (theme == 5.0) petals = 5.0;
    if (theme == 6.0 || theme == 8.0) petals = 6.0;
    float lobe = pow(abs(cos(turn * petals * 0.5)), 1.7);
    float shape = 0.34 + 0.22 * lobe;
    if (theme == 2.0) shape = 0.49 + 0.035 * sin(turn * 3.0 + time * 0.4);
    // Tinh Hà: sao bảy cánh nhọn (Bắc Đẩu thất tinh).
    if (theme == 3.0) shape = 0.36 + 0.2 * pow(abs(cos(turn * 3.5)), 7.0);
    // Hồng Liên: mười sáu cánh sen nhọn như ngọn lửa lụa.
    if (theme == 4.0) shape = 0.37 + 0.18 * pow(1.0 - abs(sin(turn * 8.0)), 2.2);
    if (theme == 7.0) shape = 0.43 + 0.13 * cos(turn);
    if (theme == 8.0) shape = 0.41 + 0.12 * sin(turn * 3.0 + r * 7.0);
    // Xích Diễm: mép mây cuộn — chín múi tròn, khấc lõm nhọn giữa các múi.
    if (theme == 10.0) shape = 0.38 + 0.15 * sqrt(abs(sin(turn * 4.5)));
    if (theme == 12.0) shape = 0.36 + 0.2 * pow(abs(cos(turn * 4.0)), 6.0);
    float motif = stroke(r - shape * breath, 0.0035);
    float veins = stroke(r - (shape * 0.83) * breath, 0.0018) * 0.32;
    float broken = smoothstep(-0.1, 0.45, sin(a * 3.0 - time * 0.18));
    float rim = stroke(r - 0.65, 0.0025) * broken * 0.6;
    float engraving = stroke(r - 0.69, 0.016) * pow(abs(cos(a * 24.0)), 28.0) * 0.25;
    float mist = exp(-pow((r - 0.47) * 7.0, 2.0)) * 0.075;
    mist *= 0.55 + 0.45 * sin(a * 3.0 + r * 20.0 - time * 0.3);
    float light = (motif * 0.58 + veins + rim + engraving + mist) * (0.2 + 0.8 * seated);
    float gold = stroke(r - 0.58, 0.002) * pow(abs(cos(a * 4.0 + time * 0.09)), 20.0) * seated;
    if (level >= 2.0) {
      light += stroke(r - 0.76, 0.002) * (0.25 + 0.3 * broken) * seated;
      gold += stroke(r - 0.73, 0.023) * pow(abs(cos(a * 8.0)), 70.0) * seated * 0.7;
    }
    if (level >= 3.0) light += stroke(r - 0.29 - 0.08 * cos(turn * 8.0), 0.002) * seated * 0.45;
    if (level >= 4.0) light += stroke(r - 0.87, 0.018) * pow(abs(sin(a * 16.0)), 30.0) * seated * 0.55;
    if (level >= 5.0) light += stroke(r - 0.91, 0.002) * seated * 0.5;
    // Lưu Ly: gợn nước đồng tâm loang chậm ra ngoài như mặt hồ dưới tòa sóng.
    if (theme == 2.0) for (int k = 0; k < 3; k++) {
      float age = fract(time * 0.06 + float(k) / 3.0);
      light += stroke(r - 0.2 - age * 0.72, 0.003 + age * 0.006) * pow(1.0 - age, 1.5) * smoothstep(0.0, 0.15, age) * 0.5 * seated;
    }
    // Nguyệt Bạch: gương nước tĩnh — bóng trăng in lệch về phía trăng (+x), vỡ thành vạch ngang lăn tăn.
    if (theme == 7.0) {
      vec2 q = (vUv - vec2(0.42, 0.08)) / vec2(0.22, 0.34);
      float lines = smoothstep(0.2, 0.9, sin(vUv.y * 60.0 + sin(vUv.x * 11.0 + time * 0.3) * 1.5 - time * 0.2));
      light += (1.0 - smoothstep(0.5, 1.0, length(q))) * (0.3 + 0.9 * lines) * seated;
    }
    light += stroke(r - 0.3 - (1.0 - burst) * 0.65, 0.012) * burst * 0.4;
    float alpha = min(0.85, light + gold * 0.5) * opacity;
    if (r > 0.98 || alpha < 0.002) discard;
    gl_FragColor = vec4(mix(tint, accent, gold / max(0.001, light + gold)), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const ribbonVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ribbonFragment = `
  varying vec2 vUv;
  uniform vec3 tint, accent;
  uniform float opacity, time;
  void main() {
    float taper = pow(sin(vUv.x * 3.14159265), 0.7);
    float width = abs(vUv.y - 0.5) * 2.0;
    float silk = pow(max(0.0, 1.0 - width), 2.0) * taper;
    float core = exp(-width * width * 100.0) * taper;
    float flow = 0.65 + 0.35 * sin(vUv.x * 14.0 - time * 0.65);
    float alpha = (silk * 0.26 + core * 0.48) * flow * opacity;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(mix(tint, accent, core * 0.55), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
