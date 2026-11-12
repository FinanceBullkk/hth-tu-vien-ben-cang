import * as THREE from 'three';
import { ribbonVertex, ribbonFragment, groundVertex, groundFragment, particleVertex, particleFragment } from './qi-shaders.js';

const clamp = v => Math.max(0, Math.min(1, v));
const smooth = v => { const x = clamp(v); return x * x * (3 - 2 * x); };
let serial = 0, camera = null, quality = 2, nearSlots = 4, mediumSlots = 8;
const frustum = new THREE.Frustum(), projection = new THREE.Matrix4();

export function beginQiFrame(view, level = 2) {
  camera = view; quality = Math.max(0, Math.min(2, level)); nearSlots = 4; mediumSlots = 8;
  view.updateMatrixWorld();
  frustum.setFromProjectionMatrix(projection.multiplyMatrices(view.projectionMatrix, view.matrixWorldInverse));
}

export function qiBloom(age, phase, fire) {
  if (age < 2) return smooth((age - .4) / .7) * (1 - smooth((age - 1.2) / .8));
  const cycle = fire ? 9 : 12, t = (age - 2 + phase * cycle) % cycle;
  return smooth((t - cycle * .55) / 1.2) * (1 - smooth((t - cycle * .78) / 1.4));
}

function strips(fire, segments) {
  const position = [], uv = [], lane = [], kind = [], index = [];
  // Two elemental streams, one short history trail, then five ephemeral lotus strokes.
  const definitions = [[0, 0], [1, 0], [0, 2], ...(fire ? [0, 1, 2, 3, 4].map(i => [i, 1]) : [])];
  for (const [l, k] of definitions) {
    const base = position.length / 3;
    for (let i = 0; i <= segments; i++) for (let side = 0; side < 2; side++) {
      position.push(0, 0, 0); uv.push(i / segments, side); lane.push(l); kind.push(k);
      if (!side && i < segments) { const n = base + i * 2; index.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
    }
  }
  const geo = new THREE.BufferGeometry();
  for (const [name, values, size] of [['position', position, 3], ['uv', uv, 2], ['lane', lane, 1], ['kind', kind, 1]]) {
    geo.setAttribute(name, new THREE.Float32BufferAttribute(values, size));
  }
  geo.setIndex(index); geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .8, 0), 3.2);
  return geo;
}

export function createQiAura(effect, lowQuality = false, reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')) {
  if (effect !== 2 && effect !== 4) throw new RangeError('Qi aura supports effects 2 and 4');
  const fire = effect === 4, phase = (serial++ * .61803398875) % 1;
  const group = new THREE.Group(); group.name = fire ? 'qi-fire' : 'qi-water';
  group.material = { opacity: .9 };
  const history = Array.from({ length: 16 }, () => new THREE.Vector3());
  const localTail = history.map(() => new THREE.Vector3());
  const uniforms = Object.fromEntries(Object.entries({ time: 0, entry: 0, fade: 1, bloom: 0, moving: 0, fire: +fire, detail: 2, quiet: 0 }).map(([k, v]) => [k, { value: v }]));
  uniforms.tail = { value: localTail };
  const material = (vertexShader, fragmentShader) => new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, forceSinglePass: true,
  });
  const segments = lowQuality ? 16 : 32;
  const ribbons = new THREE.Mesh(strips(fire, segments), material(ribbonVertex, ribbonFragment));
  ribbons.name = 'qi-streams'; group.add(ribbons);
  const seal = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material(groundVertex, groundFragment));
  seal.name = 'aura-seal'; seal.rotation.x = -Math.PI / 2; seal.position.y = .035; group.add(seal);
  const particlesGeo = new THREE.BufferGeometry(), count = lowQuality ? 8 : fire ? 32 : 24;
  particlesGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  particlesGeo.setAttribute('seed', new THREE.Float32BufferAttribute(Array.from({ length: count }, (_, i) => (i * .61803398875 + phase) % 1), 1));
  particlesGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .8, 0), 2);
  const motes = new THREE.Points(particlesGeo, material(particleVertex, particleFragment));
  motes.material.blending = THREE.AdditiveBlending; motes.name = 'qi-motes'; group.add(motes);
  group.traverse(o => { o.userData.qiOwned = true; });

  const position = new THREE.Vector3(), previous = new THREE.Vector3(), delta = new THREE.Vector3();
  const inverse = new THREE.Matrix4(), sphere = new THREE.Sphere(new THREE.Vector3(), 3.2);
  let age = 0, last = null, sampleClock = 0, reset = true, released = null, disposed = false;
  return {
    points: group,
    update(t, walkAmt = 0, cameraDist = 0) {
      if (disposed || !Number.isFinite(t)) return;
      const rawDt = last === null ? 1 / 60 : Math.max(0, t - last), dt = Math.min(.1, rawDt);
      last = t; age += dt;
      const parent = group.parent;
      if (parent) { parent.updateWorldMatrix(true, false); position.setFromMatrixPosition(parent.matrixWorld); inverse.copy(parent.matrixWorld).invert(); }
      else { position.set(0, 0, 0); inverse.identity(); }
      sphere.center.copy(position); sphere.center.y += .8;
      group.visible = !camera || frustum.intersectsSphere(sphere);
      if (!group.visible) { reset = true; return; }
      const distance = camera ? camera.position.distanceTo(position) : cameraDist;
      let tier = 0;
      if (!lowQuality && !reduced?.matches) {
        if (quality > 1 && distance < 14 && nearSlots > 0) { tier = 2; nearSlots--; }
        else if (quality > 0 && distance < 28 && mediumSlots > 0) { tier = 1; mediumSlots--; }
      }
      ribbons.visible = tier > 0; motes.visible = tier > 1;
      ribbons.geometry.setDrawRange(0, (tier > 1 && fire ? 8 : 3) * segments * 6);
      const jumped = position.distanceToSquared(previous) > 16 || rawDt > .25;
      if (reset || jumped || tier === 0) { for (const p of history) p.copy(position); reset = false; sampleClock = 0; }
      sampleClock += dt;
      if (sampleClock >= .05) { for (let i = 15; i > 0; i--) history[i].copy(history[i - 1]); sampleClock %= .05; }
      history[0].copy(position);
      for (let i = 0; i < 16; i++) {
        delta.copy(history[i]).sub(position).clampLength(0, fire ? 1 : 1.5);
        localTail[i].copy(position).add(delta).applyMatrix4(inverse);
      }
      previous.copy(position);
      uniforms.time.value = reduced?.matches ? 0 : age;
      uniforms.entry.value = smooth(age / (fire ? .65 : 1.2));
      uniforms.bloom.value = reduced?.matches ? 0 : qiBloom(age, phase, fire) * (1 - clamp(walkAmt) * .75);
      uniforms.moving.value = jumped || reduced?.matches ? 0 : Math.min(1, history[15].distanceTo(position) * 2);
      uniforms.detail.value = tier; uniforms.quiet.value = reduced?.matches ? 1 : 0;
      uniforms.fade.value = clamp(group.material.opacity / .9) * (released === null ? 1 : 1 - smooth((age - released) / .8));
    },
    beginFade() { if (released === null) released = age; },
    setColor() {},
    dispose() { if (disposed) return; disposed = true;
      for (const o of [ribbons, seal, motes]) { o.geometry.dispose(); o.material.dispose(); }
      group.removeFromParent();
    },
  };
}
