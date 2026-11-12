import * as THREE from 'three';

// Environment -> dantian, spiral -> dantian, accretion, then ascending circulation.
export function energyPoint(out, tier, u, lane, time, y = .72, compression = 0) {
  const phase = lane * 2.39996;
  let angle, radius, height;
  if (tier === 0) {
    radius = 1.8 * (1 - u) ** 1.5;
    angle = phase + .25 * Math.sin(u * Math.PI + time * .15);
    height = y + (1 - u) * (.2 + .9 * Math.sin(phase));
  } else if (tier === 1) {
    radius = 1.28 * (1 - u) + .04;
    angle = phase + u * Math.PI * 3 + time * .22;
    height = y + (1 - u) * (1 + .25 * Math.sin(phase));
  } else if (tier === 2) {
    radius = (1.2 * (1 - u) + .035) * (1 - compression * .55);
    angle = phase + u * Math.PI * 4 - time * .35;
    height = y + Math.sin(angle) * radius * .4;
  } else {
    radius = .6 + Math.sin(u * Math.PI) * .55;
    angle = phase + u * Math.PI * 2.3 - time * .18;
    height = .2 + u * 2.65;
  }
  return out.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius + (tier < 3 ? .28 * u : 0));
}

export function createSenKimEnergy(tier, lowQuality) {
  const group = new THREE.Group(); group.name = 'sen-kim-energy';
  const uniforms = { time: { value: 0 }, opacity: { value: 0 }, strength: { value: 0 } };
  const material = new THREE.ShaderMaterial({ uniforms, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv; uniform float time,opacity,strength;
      void main(){float across=pow(max(0.,sin(vUv.y*3.14159)),2.);
        float tip=pow(max(0.,sin(vUv.x*3.14159)),.6);
        float streak=pow(.5+.5*cos(vUv.y*32.+vUv.x*17.),8.);
        float pulse=pow(.5+.5*cos(vUv.x*12.-time*2.),8.);
        vec3 c=mix(vec3(.52,.72,.53),vec3(1.,.72,.22),vUv.x);
        gl_FragColor=vec4(c,across*tip*(.12+streak*.2+pulse*.5)*opacity*(1.+strength*.35));
      }` });
  const ribbons = [], segments = lowQuality ? 36 : 64;
  for (let lane = 0; lane < (tier === 0 ? 0 : tier === 3 ? 3 : 2); lane++) {
    const geo = new THREE.PlaneGeometry(1, 1, segments, 1);
    const mesh = new THREE.Mesh(geo, material); mesh.frustumCulled = false; group.add(mesh); ribbons.push(mesh);
  }
  const count = lowQuality ? 20 : 40;
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  dustGeo.setAttribute('alpha', new THREE.Float32BufferAttribute(new Float32Array(count), 1));
  const dustMat = new THREE.ShaderMaterial({ uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float alpha; varying float vAlpha;
      void main(){vAlpha=alpha;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(35./max(1.,-p.z),2.,8.);}`,
    fragmentShader: `varying float vAlpha; uniform float opacity;
      void main(){float r=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-r),2.);
        gl_FragColor=vec4(1.,.78,.35,a*vAlpha*opacity);}` });
  const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; group.add(dust);
  const point = new THREE.Vector3();
  return { group,
    update(time, sitting, fade, coreY, state, reduced) {
      const t = reduced ? 0 : time;
      uniforms.time.value = t;
      uniforms.opacity.value = fade * .85 * Math.max(Number(sitting), Number(state.active));
      uniforms.strength.value = state.gather;
      for (let lane = 0; lane < ribbons.length; lane++) {
        const geo = ribbons[lane].geometry, p = geo.attributes.position;
        for (let i = 0; i <= segments; i++) {
          const u = i / segments;
          energyPoint(point, tier, u, lane * 2, t, coreY, state.compress);
          const width = (.025 + tier * .009) * Math.sin(u * Math.PI);
          p.setXYZ(i, point.x, point.y - width, point.z);
          p.setXYZ(i + segments + 1, point.x, point.y + width, point.z);
        }
        p.needsUpdate = true;
      }
      const p = dustGeo.attributes.position, alpha = dustGeo.attributes.alpha;
      for (let i = 0; i < count; i++) {
        const u = (i * .61803398875 + t * (tier === 2 ? .16 : .09) + state.gather * .22) % 1;
        energyPoint(point, tier, u, i % 7, t, coreY, state.compress);
        p.setXYZ(i, point.x, point.y, point.z);
        alpha.setX(i, Math.sin(u * Math.PI));
      }
      p.needsUpdate = true; alpha.needsUpdate = true;
    },
    dispose() { ribbons.forEach(m => m.geometry.dispose()); material.dispose(); dustGeo.dispose(); dustMat.dispose(); },
  };
}
