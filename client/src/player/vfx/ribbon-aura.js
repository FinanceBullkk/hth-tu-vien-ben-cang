import * as THREE from 'three';
import { createAuraEmblems } from './aura-emblems.js';

// Authored silhouettes inspired by the references in docs/vfx-reference-direction.md.
const PALETTES = [[0xa51e18, 0xffb440], [0xb47720, 0xffedac]];
const vertexShader = `
  uniform float time;
  uniform float motion;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float wave = sin(uv.x * 9.0 - time * 1.7 + position.y);
    p.x += motion * .11 * wave * sin(uv.x * 3.14159);
    p.y += motion * .07 * sin(time * 1.2 + uv.x * 6.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const fragmentShader = `
  uniform vec3 body;
  uniform vec3 core;
  uniform float time;
  uniform float opacity;
  uniform float fire;
  varying vec2 vUv;
  void main() {
    float edge = abs(vUv.y * 2.0 - 1.0);
    float cut = .09 * sin(vUv.x * 61.0 - time * 2.0)
      + .05 * sin(vUv.x * 107.0 + vUv.y * 11.0 - time);
    float mask = 1.0 - smoothstep(.65 + cut, 1.0 + cut, edge);
    float tip = smoothstep(0.0, .07, vUv.x) * (1.0 - smoothstep(.91, 1.0, vUv.x));
    float vein = pow(max(0.0, 1.0 - abs(vUv.y - .37 - .09 * sin(vUv.x * 12.0)) * 10.0), 2.0);
    float flow = .55 + .45 * pow(.5 + .5 * sin(vUv.x * 13.0 - time * 2.0), 2.0);
    float split = smoothstep(.04, .12, abs(vUv.y - .65 - .16 * sin(vUv.x * 16.0)));
    mask *= mix(1.0, split, fire * smoothstep(.3, .8, vUv.x));
    gl_FragColor = vec4(mix(body, core, .18 + vein * .82), mask * tip * flow * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function ribbons(paths, segments) {
  const positions = [], uvs = [], indices = [];
  for (const { curve, width, vertical = false } of paths) {
    const start = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments, p = curve(u);
      const tangent = curve(Math.min(1, u + .001)).sub(curve(Math.max(0, u - .001))).normalize();
      const side = vertical ? new THREE.Vector3(-tangent.y, tangent.x, 0).normalize()
        : new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const w = width * Math.pow(Math.sin(Math.PI * u), .8) * (1 - u * .45);
      for (const sign of [-1, 1]) {
        positions.push(p.x + side.x * w * sign, p.y + side.y * w * sign, p.z + side.z * w * sign);
        uvs.push(u, (sign + 1) / 2);
      }
      if (i < segments) {
        const k = start + i * 2;
        indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

function pathsFor(kind) {
  const paths = [], v = (x, y, z) => new THREE.Vector3(x, y, z);
  if (kind === 0) {
    // Open flame fans leave a clear window around the head and torso.
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, height = 1.3 + (i % 3) * .35;
      paths.push({ width: .12, vertical: true, curve: u => {
        const r = .72 + .43 * Math.sin(u * Math.PI) + .12 * Math.sin(u * 9 + i);
        return v(Math.cos(a) * r, .12 + u * height, Math.sin(a) * r);
      } });
    }
  } else {
    for (let i = 0; i < 3; i++) paths.push({ width: i ? .035 : .07, vertical: true, curve: u => {
      const a = u * Math.PI * 2.5 + i * .65;
      return v(Math.sin(a) * (1.02 + i * .12), .28 + u * 1.9, Math.cos(a) * .78);
    } });
    // Crescent behind the shoulders, separate from the flowing dragon silhouette.
    paths.push({ width: .14, vertical: true, curve: u => {
      const a = -.8 + u * 4.5;
      return v(Math.cos(a) * .49, 2.25 + Math.sin(a) * .49, -.52);
    } });
  }
  return paths;
}

export function createRibbonAura(effect, lowQuality = false) {
  if (!Number.isInteger(effect) || effect < 9 || effect > 10) throw new RangeError('Ribbon aura supports effects 9..10');
  const kind = effect - 9, group = new THREE.Group();
  group.name = 'ribbon-aura';
  group.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: .9 });
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const uniforms = { body: { value: new THREE.Color(PALETTES[kind][0]) }, core: { value: new THREE.Color(PALETTES[kind][1]) },
    time: { value: 0 }, motion: { value: 1 }, opacity: { value: .9 }, fire: { value: kind === 0 ? 1 : 0 } };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader,
    transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(ribbons(pathsFor(kind), lowQuality ? 32 : 64), material);
  mesh.name = 'authored-ribbons';
  mesh.renderOrder = 6;
  group.add(mesh);
  const seedPositions = [];
  for (let i = 0; i < (lowQuality ? 14 : 28); i++) seedPositions.push(0, 0, 0);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(seedPositions, 3));
  const dustMat = new THREE.PointsMaterial({ color: PALETTES[kind][1], size: .026,
    transparent: true, opacity: .7, depthWrite: false });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  group.add(dust);
  const emblems = createAuraEmblems(kind, lowQuality);
  group.add(emblems.group);
  return {
    points: group,
    update(t) {
      const time = reduced?.matches ? 0 : t;
      uniforms.time.value = time;
      uniforms.motion.value = reduced?.matches ? 0 : 1;
      uniforms.opacity.value = group.material.opacity;
      emblems.update(time, group.material.opacity / .9);
      dustMat.opacity = group.material.opacity * .7;
      const p = dustGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = ((i / p.count + time * .11) % 1 + 1) % 1, a = i * 2.39996 + time * .12;
        const r = .88 + .27 * Math.sin(u * Math.PI);
        p.setXYZ(i, Math.cos(a) * r, .1 + u * 2.4, Math.sin(a) * r);
      }
      p.needsUpdate = true;
    },
    beginFade() {}, // Each aura owns its opacity controller; no shared material to clone.
    setColor() {},
    setWeapon() {},
    dispose() { emblems.dispose(); mesh.geometry.dispose(); material.dispose(); dustGeo.dispose(); dustMat.dispose(); group.material.dispose(); },
  };
}
