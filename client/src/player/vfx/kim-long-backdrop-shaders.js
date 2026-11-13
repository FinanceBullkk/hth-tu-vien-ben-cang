// Shader nền của Kim Long: nửa vầng trăng mờ và biển mây vàng dưới chân (mặt phẳng có uv).

export const planeVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// Nửa vầng trăng mờ: bán nguyệt ngà, nửa dưới tan vào mây; glow = quầng cộng màu quanh mép trên.
export const moonFragment = `
  uniform vec3 ivory, shade, gold;
  uniform float opacity, glow, time;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float d = length(p), R = 0.62;
    float upper = smoothstep(-0.08, 0.14, p.y);
    float disc = 1.0 - smoothstep(R - 0.012, R, d);
    float a;
    vec3 c;
    if (glow > 0.5) {
      float halo = exp(-max(d - R, 0.0) * 7.0) * (1.0 - disc * 0.75) * (1.0 - smoothstep(0.78, 0.98, d));
      c = gold; a = halo * upper * 0.6;
    } else {
      float m = 0.5 + 0.5 * sin(p.x * 9.0 + sin(p.y * 6.0) * 1.4) * sin(p.y * 7.0 - p.x * 3.0 + 0.6);
      c = mix(ivory, shade, m * 0.45 + smoothstep(0.3, R, d) * 0.25);
      a = disc * upper * 0.8;
    }
    if (a * opacity < 0.003) discard;
    gl_FragColor = vec4(c, a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Biển mây vàng dưới chân: ô tường vân vẽ sẵn trôi ngang rất chậm, mép tròn tan dần.
export const cloudSeaFragment = `
  uniform sampler2D map;
  uniform vec3 tint;
  uniform float opacity, time, glow;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float mask = 1.0 - smoothstep(0.5, 1.0, length(p));
    vec4 tex = texture2D(map, vUv * 2.2 + vec2(time * 0.012, time * 0.004));
    float a = tex.a * mask * opacity;
    if (a < 0.003) discard;
    vec3 c = glow > 0.5 ? tint * (0.4 + 0.6 * tex.r) : tex.rgb * tint;
    gl_FragColor = vec4(c, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
