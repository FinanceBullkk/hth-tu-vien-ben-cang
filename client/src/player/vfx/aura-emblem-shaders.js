// Shader hoa văn dùng chung cho các aura pháp tướng (Kiếm Vũ, Lưu Ly...): lớp nét vẽ canvas
// có luồng khí chạy quanh vòng + lớp mực, và lớp ánh sáng thủ tục (xung, gợn nước, quầng).

// Lớp ánh sáng thủ tục (hoa văn đã vẽ bằng texture): mode 0 = xung sáng loang trên trận đồ
// ở nhịp xuất kiếm + quầng dưới chân; mode 1 = gợn nước đồng tâm loang chậm ra ngoài như mặt hồ
// (Lưu Ly), pulse làm gợn rõ hơn; mode 2 = quầng pháp quang mềm sau pháp luân.
export const sealVertex = `
  varying vec2 vUv;
  void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const sealFragment = `
  uniform vec3 edge, core;
  uniform float time, opacity, pulse, mode;
  varying vec2 vUv;
  float stroke(float d, float w) { float aa = max(fwidth(d), 0.0015); return 1.0 - smoothstep(w, w + aa, abs(d)); }
  void main() {
    float r = length(vUv), light;
    if (mode < 0.5) {
      light = stroke(r - 0.2 - pulse * 0.75, 0.012) * pulse * 0.8 + exp(-r * r * 9.0) * (0.12 + 0.2 * pulse);
    } else if (mode < 1.5) {
      float a = atan(vUv.x, vUv.y);
      light = exp(-r * r * 7.0) * (0.06 + 0.1 * pulse);
      for (int k = 0; k < 4; k++) {
        float age = fract(time * 0.055 + float(k) * 0.25);
        float wob = 0.012 * sin(a * 5.0 + time * 0.3 + float(k) * 2.0);
        float rr = 0.12 + age * 0.82 + wob;
        light += stroke(r - rr, 0.004 + age * 0.01) * pow(1.0 - age, 1.4) * smoothstep(0.0, 0.12, age) * (0.45 + 0.35 * pulse);
        light += stroke(r - rr + 0.035, 0.002) * pow(1.0 - age, 2.0) * smoothstep(0.0, 0.2, age) * 0.2;
      }
    } else {
      light = exp(-pow((r - 0.62) * 3.2, 2.0)) * 0.32 + exp(-pow((r - 0.3) * 6.0, 2.0)) * 0.12;
      light *= 0.75 + 0.5 * pulse;
    }
    if (r > 0.99 || light < 0.002) discard;
    gl_FragColor = vec4(mix(edge, core, clamp(pulse * 0.5, 0.0, 1.0)), min(1.0, light) * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Mandala/vành phù văn/trận đồ vẽ sẵn trên canvas (alpha = nét). Luồng khí chạy quanh vòng
// (qi), sóng xuất kiếm quét theo nhịp (sweep), lớp mực (ink) giữ nét trên nền sáng.
export const emblemVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const emblemFragment = `
  uniform sampler2D map;
  uniform vec3 edge, core, steel, gold;
  uniform float time, opacity, sweep, sweepOn, ink, goldMix, chase;
  varying vec2 vUv;
  void main() {
    float lines = texture2D(map, vUv).a;
    if (lines < 0.01) discard;
    vec2 p = vUv * 2.0 - 1.0;
    float a = atan(p.x, p.y), r = length(p);
    float qi = pow(0.5 + 0.5 * cos(a * chase - time * 0.45), 16.0);
    float d = mod(sweep - a + 3.14159265, 6.2831853) - 3.14159265;
    float wave = exp(-d * d * 3.0) * sweepOn;
    vec3 base = mix(edge, gold, goldMix * smoothstep(0.55, 0.95, r));
    vec3 col = mix(base, core, clamp(qi * 0.6 + wave * 0.8, 0.0, 1.0));
    float al = lines * (0.7 + qi * 0.5 + wave * 0.7);
    if (ink > 0.5) { col = steel * 0.45; al = lines * 0.45; }
    gl_FragColor = vec4(col * (ink > 0.5 ? 1.0 : 1.2), min(al, 1.0) * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
