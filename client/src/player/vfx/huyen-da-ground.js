import * as THREE from 'three';
import { inkStreaks, coronaRays, inkSplat } from './huyen-da-textures.js';
import { vortexMaterial, vortexPlane, tickAll } from './huyen-da-materials.js';
import { hash } from './aura-billboard-layer.js';
import { softDot, sstep } from './aura-rhythm.js';

// Nền đất của Huyền Dạ: XOÁY MỰC ĐEN dưới chân — lớp tối normal blend là chủ đạo (aura duy nhất
// như vậy); lớp cộng màu chỉ là một viền tím mảnh ở mép ngoài. Không vòng chữ, không bát quái.
//  Vũng tối mềm ở tâm · xoáy mực lớn nhánh xoắn trôi vào tâm · xoáy nhỏ xoắn chặt hơn ở giữa ·
//  vũng mực loang: vết mực rơi ở rìa, loang rộng ra rồi bị cuốn dần vào tâm và tan.
export const POOL_LIFE = 12;
const poolVertex = `
  varying vec2 vUv; varying float vAlpha;
  void main() {
    vUv = uv; vAlpha = 1.0;
    vec4 p = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vAlpha = instanceColor.r;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * p;
  }
`;
const poolFragment = `
  uniform sampler2D map; uniform vec3 tint; uniform float opacity;
  varying vec2 vUv; varying float vAlpha;
  void main() {
    float a = texture2D(map, vUv).a * vAlpha * opacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(tint, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createInkGround(parent, colors, lowQuality) {
  const owned = [], ticks = [];
  const flat = (size, opts, base, name, order, breathe = 0) => {
    const m = vortexMaterial(colors, opts.map, opts); ticks.push({ m, base, breathe });
    const mesh = vortexPlane(parent, owned, size, m, name, order);
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.012 + order * 0.003;
    return mesh;
  };
  const poolMat = new THREE.MeshBasicMaterial({ map: softDot(), color: colors.deep, transparent: true, opacity: 0.7,
    depthWrite: false, toneMapped: false });
  const poolGeo = new THREE.PlaneGeometry(1.7, 1.7); owned.push(poolMat, poolGeo);
  const pool = new THREE.Mesh(poolGeo, poolMat); pool.name = 'huyen-da-ground-pool';
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.011; pool.renderOrder = 1; parent.add(pool);

  flat(3.6, { map: inkStreaks(), arms: 5, twist: 2.2, flow: 0.045, inner: 0.05, ink: 1 }, 0.72, 'huyen-da-ground-vortex', 2, 0.15);
  if (!lowQuality) flat(1.9, { map: inkStreaks(), arms: 3, twist: 3.2, flow: 0.06, inner: 0.08, ink: 1 }, 0.5, 'huyen-da-ground-swirl', 3);
  flat(3.6, { map: coronaRays(), arms: 24, twist: 0.6, flow: 0.04, rim: 1 }, 0.55, 'huyen-da-ground-rim', 4, 0.3);

  // Vũng mực loang trôi vào tâm (bỏ ở chất lượng thấp).
  let pools = null;
  const poolN = lowQuality ? 0 : 7;
  if (poolN) {
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { map: { value: inkSplat() }, tint: { value: colors.deep }, opacity: { value: 0.8 } },
      vertexShader: poolVertex, fragmentShader: poolFragment });
    owned.push(geo, mat);
    pools = new THREE.InstancedMesh(geo, mat, poolN);
    pools.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(poolN * 3), 3);
    pools.name = 'huyen-da-ink-pools'; pools.renderOrder = 3; pools.position.y = 0.024; parent.add(pools);
  }
  const dummy = new THREE.Object3D(), tint = new THREE.Color();

  return {
    update(time, rhythm, f) {
      tickAll(ticks, time, rhythm, f);
      poolMat.opacity = (0.6 + 0.12 * rhythm.gather) * f;
      if (!pools) return;
      for (let i = 0; i < poolN; i++) {
        const u = ((time / POOL_LIFE + i / poolN) % 1 + 1) % 1;
        const r = 1.45 * (1 - u), a = hash(i + 3) * Math.PI * 2 - u * Math.PI * 2.2 - time * 0.03;
        // Loang rộng ra ở nửa đầu, rồi bị kéo dài theo chiều xoáy và thu nhỏ khi vào tâm.
        const spread = 0.18 + 0.4 * sstep(0, 0.35, u) - 0.35 * sstep(0.55, 1, u);
        dummy.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
        dummy.rotation.set(0, a + Math.PI / 2, 0);
        dummy.scale.set(spread * (1 + 0.8 * u), 1, spread);
        dummy.updateMatrix(); pools.setMatrixAt(i, dummy.matrix);
        pools.setColorAt(i, tint.setRGB(Math.min(1, u * 8) * (1 - sstep(0.75, 0.98, u)), 0, 0));
      }
      pools.instanceMatrix.needsUpdate = true; pools.instanceColor.needsUpdate = true;
      pools.material.uniforms.opacity.value = 0.8 * f;
    },
    dispose() { pools?.dispose(); owned.forEach(o => o.dispose()); },
  };
}
