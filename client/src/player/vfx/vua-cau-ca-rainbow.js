import * as THREE from 'three';
import { sstep } from './aura-rhythm.js';

// Cầu vồng sau mưa của Vua câu cá: sau khi sáu cột nước phun (cao trào nhịp 12 giây), một vòng cung bảy sắc
// dựng sau lưng (sau vòng bơi của cá chép) hiện dần, lấp lánh bụi nước, rồi tan trước nhịp sau.
export const RAINBOW = { radius: 1.75, width: 0.32, z: -1.12, y: 0.0 };
/** Độ hiện của cầu vồng theo nhịp: lên khi cột nước bắt đầu hạ, tan dần trước cuối nhịp. */
export const rainbowShow = rhythm => sstep(0.52, 0.64, rhythm.phase) * (1 - sstep(0.86, 0.98, rhythm.phase));

const vertexShader = `
  varying vec2 vP;
  void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const fragmentShader = `
  uniform float rIn, rOut, time, opacity;
  varying vec2 vP;
  vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
  void main() {
    float r = length(vP), t = (r - rIn) / (rOut - rIn);
    if (t < 0.0 || t > 1.0) discard;
    float ang = atan(vP.y, vP.x) / 3.14159265;
    vec3 col = hue(0.78 * (1.0 - t)) * 0.9 + 0.1;
    float band = pow(sin(3.14159265 * t), 0.7);
    float ends = smoothstep(0.0, 0.22, ang) * smoothstep(1.0, 0.78, ang);
    float sparkle = pow(0.5 + 0.5 * sin(ang * 90.0 + t * 20.0 - time * 3.0), 16.0) * 0.6;
    gl_FragColor = vec4(col + sparkle, (band * 0.55 + sparkle * band) * ends * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createRainbow(parent) {
  const rIn = RAINBOW.radius - RAINBOW.width / 2, rOut = RAINBOW.radius + RAINBOW.width / 2;
  const geo = new THREE.RingGeometry(rIn, rOut, 72, 1, 0, Math.PI);
  const material = new THREE.ShaderMaterial({
    uniforms: { rIn: { value: rIn }, rOut: { value: rOut }, time: { value: 0 }, opacity: { value: 0 } },
    vertexShader, fragmentShader, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, material); mesh.name = 'vua-cau-ca-rainbow'; mesh.renderOrder = 2;
  mesh.position.set(0, RAINBOW.y, RAINBOW.z);
  parent.add(mesh);
  return {
    update(time, rhythm, f) {
      const show = rainbowShow(rhythm);
      mesh.visible = show > 0.001;
      material.uniforms.time.value = time;
      material.uniforms.opacity.value = show * f;
    },
    dispose() { geo.dispose(); material.dispose(); },
  };
}
