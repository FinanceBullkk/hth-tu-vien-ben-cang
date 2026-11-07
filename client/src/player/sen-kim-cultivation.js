import * as THREE from 'three';
import { breakthroughFrame } from './cultivation-breakthrough.js';
import { createSenKimEnergy } from './sen-kim-energy.js';

// Four silhouettes, tied to server cultivationTier; qi never selects these forms.
export function createSenKimCultivation(tier, lowQuality = false) {
  tier = Number.isInteger(tier) ? Math.max(0, Math.min(3, tier)) : 0;
  const group = new THREE.Group(); group.name = 'sen-kim-cultivation';
  group.userData.tier = tier;
  const motion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const geometries = [], materials = [], rings = [];
  const energy = createSenKimEnergy(tier, lowQuality); group.add(energy.group);
  let breakthroughStart = -Infinity;
  const own = geo => (geometries.push(geo), geo);
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd279, transparent: true,
    opacity: .65, depthWrite: false, blending: THREE.AdditiveBlending });
  materials.push(gold);
  const uniforms = { time: { value: 0 }, fade: { value: 1 }, tier: { value: tier } };
  const groundMat = new THREE.ShaderMaterial({ uniforms, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv; uniform float time,fade,tier;
      float stroke(float d,float w){return 1.-smoothstep(w,w+.009,abs(d));}
      void main(){float r=length(vUv),a=atan(vUv.y,vUv.x),t=time*.1;
        float outer=stroke(r-.83,.004);
        float lotus=stroke(r-(.42+.12*cos(a*8.+t)),.006);
        float ink=outer*.55+lotus*.45;
        if(tier>0.) ink+=stroke(r-.72,.003)*pow(.5+.5*cos(a*24.-t),8.)*.8;
        if(tier>1.) ink+=stroke(r-(.61+.045*cos(a*12.-t)),.004)*.5;
        if(tier>2.) ink+=stroke(r-.94,.003)*(.25+.5*pow(.5+.5*cos(a*32.+t),12.));
        float chase=pow(.5+.5*cos(a*3.-time*.35),18.);
        float breathe=.8+.2*sin(time*.7854);
        gl_FragColor=vec4(mix(vec3(.85,.46,.12),vec3(1.,.87,.49),chase),min(.8,ink)*fade*breathe);
      }` });
  materials.push(groundMat);
  const ground = new THREE.Mesh(own(new THREE.PlaneGeometry(1.65 + tier * .42, 1.65 + tier * .42)), groundMat);
  ground.name = 'sen-kim-ground'; ground.rotation.x = -Math.PI / 2; ground.position.y = .035; group.add(ground);

  // Curved petal surface with real depth, pale veins and bronze roots, no canvas dependency.
  const geo = own(new THREE.PlaneGeometry(1, 1, lowQuality ? 5 : 10, lowQuality ? 8 : 16));
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const u = uv.getX(i) * 2 - 1, v = uv.getY(i);
    p.setXYZ(i, u * Math.sin(Math.PI * v) ** .7 * .28, v,
      .36 * v * v - .1 * u * u * Math.sin(Math.PI * v));
  }
  geo.computeVertexNormals();
  const petalMat = new THREE.ShaderMaterial({ uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv; uniform float fade,time;
      void main(){float h=vUv.y,x=abs(vUv.x*2.-1.);
        float vein=pow(1.-x,24.)+.3*pow(.5+.5*cos((x-h*.35)*52.),18.);
        float edge=smoothstep(.83,.98,x)*.5;
        vec3 body=mix(vec3(.38,.16,.025),vec3(.94,.64,.19),h);
        body=mix(body,vec3(.65,.88,.64),smoothstep(.75,1.,h)*.5);
        vec3 c=body+vec3(1.,.8,.36)*(vein*.28+edge);
        gl_FragColor=vec4(c,(.78-.3*h)*(1.-smoothstep(.94,1.,x))*fade);
      }` });
  materials.push(petalMat);
  const rows = tier === 3 ? 3 : tier === 0 ? 1 : 2, perRow = 8;
  const petals = new THREE.InstancedMesh(geo, petalMat, rows * perRow);
  petals.name = 'sen-kim-lotus'; petals.frustumCulled = false;
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(petals);
  const dummy = new THREE.Object3D(); dummy.rotation.order = 'YXZ';
  const ringGeo = own(new THREE.TorusGeometry(1, .008, 4, lowQuality ? 48 : 96, Math.PI * 1.65));
  for (let i = 0; i < (tier >= 2 ? 2 : 0); i++) {
    const ring = new THREE.Mesh(ringGeo, gold); ring.name = 'sen-kim-heart-ring';
    ring.position.y = .62 + i * .42; ring.scale.setScalar(.78 + i * .15);
    group.add(ring); rings.push(ring);
  }
  const coreMat = new THREE.MeshBasicMaterial({ color: tier >= 2 ? 0xffd46a : 0xc9e2a4,
    transparent: true, opacity: .5, depthWrite: false }); materials.push(coreMat);
  const core = new THREE.Mesh(own(new THREE.SphereGeometry(tier >= 2 ? .09 : .035, 12, 8)), coreMat);
  core.name = tier >= 2 ? 'sen-kim-elixir' : 'sen-kim-dantian'; group.add(core);
  let crown = null;
  if (tier === 3) {
    const mat = groundMat.clone(); materials.push(mat); mat.uniforms = uniforms;
    mat.fragmentShader = `varying vec2 vUv; uniform float time,fade;
      float line(float d){return 1.-smoothstep(.003,.012,abs(d));}
      void main(){float r=length(vUv),a=atan(vUv.y,vUv.x),t=time*.035;
        float petals=line(r-(.57+.22*cos(8.*(a+t))));
        float inner=line(r-(.42+.13*cos(8.*(a-t))))*.42;
        float rim=line(r-.89)*(.35+.45*pow(.5+.5*cos(a*32.-t),12.));
        float halo=line(r-.94)*.35+line(r-.82)*.45;
        float empty=smoothstep(.27,.4,r);
        gl_FragColor=vec4(1.,.67,.22,(petals*.6+inner+rim+halo)*empty*fade*.55);
      }`;
    crown = new THREE.Mesh(own(new THREE.PlaneGeometry(3.15, 3.15)), mat);
    crown.name = 'sen-kim-dharma'; crown.frustumCulled = false; group.add(crown);
    const anchor = new THREE.Vector3(), direction = new THREE.Vector3(), rotation = new THREE.Quaternion();
    // Keep the patterned wheel behind the silhouette at every camera angle.
    crown.onBeforeRender = (_r, _s, camera) => {
      group.getWorldPosition(anchor); camera.getWorldPosition(direction).sub(anchor); direction.y = 0; direction.normalize();
      anchor.addScaledVector(direction, -.42); group.worldToLocal(anchor);
      crown.position.x = anchor.x; crown.position.z = anchor.z;
      group.getWorldQuaternion(rotation).invert(); camera.getWorldQuaternion(crown.quaternion).premultiply(rotation);
      crown.updateMatrixWorld();
    };
  }
  const waveMat = gold.clone(); materials.push(waveMat);
  const wave = new THREE.Mesh(own(new THREE.TorusGeometry(1, .014, 4, lowQuality ? 48 : 96)), waveMat);
  wave.name = 'sen-kim-breakthrough-wave'; wave.rotation.x = Math.PI / 2; wave.position.y = .07; group.add(wave);
  group.traverse(o => { o.renderOrder = 6; });
  const update = (time, sitting = false, fade = 1, sitAmount = Number(sitting)) => {
    time = Number.isFinite(time) ? time : 0;
    const t = motion?.matches ? 0 : time, phase = t * Math.PI / 4;
    const breath = motion?.matches ? .5 : .5 + .5 * Math.sin(phase);
    const state = breakthroughFrame(time - breakthroughStart, tier, motion?.matches);
    group.userData.breakthrough = state.active;
    group.userData.breakthroughAge = state.active ? time - breakthroughStart : null;
    const lift = tier === 3 ? sitAmount * (.43 + breath * .035) * state.reveal : 0;
    group.userData.lift = lift;
    const coreY = .72 - .27 * sitAmount + lift;
    uniforms.time.value = t;
    uniforms.fade.value = Number.isFinite(fade) ? THREE.MathUtils.clamp(fade, 0, 1) : 0;
    gold.opacity = (.34 + .1 * breath + state.release * .22) * uniforms.fade.value;
    energy.update(t, sitAmount, uniforms.fade.value, coreY, state, motion?.matches);
    core.position.set(0, coreY, .28);
    core.scale.setScalar((tier >= 2 ? 1 : .7) + breath * .15 + state.compress * .65 + state.release * .8);
    coreMat.opacity = (.48 + .2 * breath + state.compress * .25) * uniforms.fade.value;
    wave.visible = state.release > 0;
    wave.scale.setScalar(.35 + state.wave * (tier === 3 ? 2.1 : tier === 2 ? 1.65 : 1.2));
    waveMat.opacity = state.release * .55 * uniforms.fade.value;
    ground.rotation.z = -t * .025;
    for (let i = 0; i < petals.count; i++) {
      const row = Math.floor(i / perRow), a = i % perRow * Math.PI / 4 + row * Math.PI / 8;
      const wave = motion?.matches ? 0 : Math.sin(phase - row * .4 - i % perRow * .08) * (sitting ? .07 : .035);
      const reveal = state.active ? .65 + .35 * state.reveal : 1;
      const radius = (.24 + row * (tier === 3 ? .25 : .16)) * reveal;
      const length = tier === 0 ? .26 : tier === 3 ? .68 + row * .22 : .45 + row * .13;
      dummy.position.set(Math.sin(a) * radius, .06 + row * .035 + lift, Math.cos(a) * radius);
      dummy.rotation.set((tier === 0 ? .16 : tier === 1 ? .38 : 1.02) + row * .1 + wave + state.release * .16, a, 0);
      dummy.scale.set(tier === 0 ? .55 : 1.05, length * reveal, length);
      dummy.updateMatrix(); petals.setMatrixAt(i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
    rings.forEach((ring, i) => {
      ring.rotation.set(Math.PI / 2 + (i ? -.3 : .3), 0, (i ? -1 : 1) * t * .2 + i * Math.PI);
      ring.position.y = coreY + i * .38;
      ring.scale.setScalar((.78 + i * .15) * (1 - state.compress * .6));
      ring.visible = !state.active || state.reveal > .05 || state.compress > 0;
    });
    if (crown) {
      crown.position.y = 1.55 + lift * .5;
      crown.scale.setScalar(state.active ? .65 + .35 * state.reveal : 1);
      crown.visible = !state.active || state.reveal > .05;
    }
  };
  update(0);
  return { group, update, startBreakthrough(time) {
    if (tier > 0 && Number.isFinite(time)) breakthroughStart = time;
  }, dispose() {
    energy.dispose();
    group.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  } };
}
