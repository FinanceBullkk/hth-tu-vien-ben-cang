import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const colors = [[0xc62e16, 0xffce68], [0xb47c29, 0xffec9c], [0x347b80, 0xc3fff0]];

function petal(angle, length, radius) {
  const p = [], indices = [], uv = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24, r = radius + Math.sin(u * 1.9) * length * .55;
    const w = Math.pow(Math.sin(u * Math.PI), .9) * .32;
    for (let j = 0; j <= 8; j++) {
      const s = j / 4 - 1;
      p.push(Math.sin(angle) * r + Math.cos(angle) * s * w,
        .06 + length * u * u + s * s * .12, Math.cos(angle) * r - Math.sin(angle) * s * w);
      uv.push(u, j / 8);
      if (i < 24 && j < 8) {
        const k = i * 9 + j;
        indices.push(k, k + 9, k + 1, k + 1, k + 9, k + 10);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices); g.computeVertexNormals();
  return g;
}

function sword() {
  const shape = new THREE.Shape();
  shape.moveTo(0, .94); shape.lineTo(-.075, .66); shape.lineTo(-.055, .03);
  shape.lineTo(-.18, -.02); shape.lineTo(-.18, -.065); shape.lineTo(-.035, -.04);
  shape.lineTo(-.035, -.27); shape.lineTo(.035, -.27); shape.lineTo(.035, -.04);
  shape.lineTo(.18, -.065); shape.lineTo(.18, -.02); shape.lineTo(.055, .03);
  shape.lineTo(.075, .66); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: .035, bevelEnabled: false });
  g.translate(0, 0, -.0175);
  return g;
}

export function createAuraEmblems(kind, lowQuality) {
  const group = new THREE.Group(), materials = [], geometries = [], anim = [];
  group.name = 'aura-emblems';
  function material(color, opacity = .85, glow = false) {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity,
      depthWrite: false, side: THREE.DoubleSide, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending });
    materials.push({ m, opacity }); return m;
  }
  let body = material(colors[kind][0], .8);
  const bright = material(colors[kind][1], kind === 0 ? .3 : .65);
  if (kind === 0) {
    body = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { opacity: { value: .7 }, time: { value: 0 } },
      vertexShader: 'varying vec2 v; void main(){v=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 v; uniform float opacity; uniform float time;
      void main(){float edge=abs(v.y*2.-1.);
        float veins=pow(.5+.5*cos(v.y*30.+sin(v.x*13.-time)),8.);
        float fade=(1.-smoothstep(.65,1.,edge))*(1.-smoothstep(.65,1.,v.x));
        vec3 c=mix(vec3(.65,.025,.008),vec3(1.,.55,.06),pow(1.-v.x,3.)+veins*.17);
        gl_FragColor=vec4(c,fade*opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
    materials.push({ m: body, opacity: .75 });
  }
  function mesh(g, m, parent = group) {
    geometries.push(g); const obj = new THREE.Mesh(g, m); parent.add(obj); return obj;
  }
  function tube(points, radius, m, parent = group) {
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), lowQuality ? 24 : 48, radius, 5, false), m, parent);
  }
  if (kind === 0) {
    const layers = [[], []];
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      layers[i % 2].push(petal(a, i % 2 ? .32 : .48, .55));
    }
    layers.forEach((parts, i) => {
      const merged = mergeGeometries(parts); parts.forEach(p => p.dispose());
      const flower = mesh(merged, body);
      anim.push(t => { flower.scale.setScalar(1 + .045 * Math.sin(t * 1.6 - i)); flower.rotation.y = .04 * Math.sin(t * .7); });
    });
    // A tall, open crown behind the avatar carries the flame silhouette above the lotus.
    const crown = [];
    for (let i = 0; i < 5; i++) {
      const g = petal((i - 2) * .43 + Math.PI, 1.6 + (2 - Math.abs(i - 2)) * .28, .7);
      crown.push(g);
    }
    const merged = mergeGeometries(crown); crown.forEach(g => g.dispose());
    const fan = mesh(merged, body);
    anim.push(t => { fan.scale.y = 1 + .06 * Math.sin(t * 1.6); });
  } else if (kind === 1) {
    const dragon = new THREE.Group(); group.add(dragon);
    const spine = [];
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, a = u * Math.PI * 2.1 - 1;
      spine.push(V(Math.sin(a) * 1.1, .3 + u * 1.7, Math.cos(a) * .8));
    }
    tube(spine, .105, body, dragon);
    tube(spine.map(p => p.clone().add(V(0, .065, 0))), .022, bright, dragon);
    for (let i = 5; i < 39; i += lowQuality ? 4 : 2) {
      const scale = mesh(new THREE.ConeGeometry(.075, .2, 3), bright, dragon);
      scale.position.copy(spine[i]); scale.position.y += .13; scale.rotation.z = -.4;
    }
    const head = new THREE.Group(); dragon.add(head); head.position.copy(spine.at(-1));
    head.quaternion.setFromUnitVectors(V(0, 0, 1), spine.at(-1).clone().sub(spine.at(-2)).normalize());
    const skull = mesh(new THREE.SphereGeometry(.19, 12, 8), body, head); skull.scale.set(.9, .78, 1.6);
    const snout = mesh(new THREE.ConeGeometry(.14, .42, 5), bright, head);
    snout.rotation.x = Math.PI / 2; snout.position.z = .27;
    for (const side of [-1, 1]) {
      const eye = mesh(new THREE.SphereGeometry(.035, 6, 4), bright, head); eye.position.set(side * .15, .07, .15);
      tube([V(side * .11, .1, -.06), V(side * .25, .36, -.25), V(side * .19, .45, -.43)], .027, bright, head);
      tube([V(side * .08, -.04, .31), V(side * .35, -.08, .3), V(side * .5, .06, .1), V(side * .53, .19, -.1)], .013, bright, head);
    }
    anim.push(t => { dragon.rotation.y = t * .18; dragon.position.y = .05 * Math.sin(t * .8); });
  } else {
    const halo = new THREE.Group(); group.add(halo); halo.position.set(0, 1.15, -.62);
    const bladeGeo = sword(); geometries.push(bladeGeo);
    const edgeGeo = new THREE.EdgesGeometry(bladeGeo); geometries.push(edgeGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: colors[kind][1], transparent: true, opacity: .95, depthWrite: false });
    materials.push({ m: edgeMat, opacity: .95 });
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) * .43;
      const blade = new THREE.Mesh(bladeGeo, body); halo.add(blade);
      blade.position.set(Math.sin(a) * 1.03, Math.cos(a) * .88, -.12 * Math.abs(i - 3));
      blade.rotation.z = -a;
      blade.add(new THREE.LineSegments(edgeGeo, edgeMat));
      anim.push(t => { blade.position.y = Math.cos(a) * .88 + .045 * Math.sin(t * 1.5 + i * .5); });
    }
  }
  const sealMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { color: { value: new THREE.Color(colors[kind][1]) }, time: { value: 0 }, opacity: { value: .65 } },
    vertexShader: 'varying vec2 p; void main(){p=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 p; uniform vec3 color; uniform float time; uniform float opacity;
    void main(){float r=length(p),a=atan(p.y,p.x); float spin=a+time*.08;
      float ring=1.-smoothstep(.008,.02,abs(r-.82));
      float inner=1.-smoothstep(.006,.014,abs(r-.65));
      float petals=1.-smoothstep(.008,.02,abs(r-(.42+.12*cos(spin*${kind === 0 ? '8.' : '6.'}))));
      float ticks=step(.94,cos(a*48.))*step(.68,r)*step(r,.77);
      float sigil=petals+inner*.5+ring*.7+ticks*.6;
      gl_FragColor=vec4(color,min(1.,sigil)*opacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  materials.push({ m: sealMat, opacity: .65 });
  const seal = mesh(new THREE.PlaneGeometry(3.5, 3.5), sealMat);
  seal.rotation.x = -Math.PI / 2; seal.position.y = .035;
  return { group,
    update(t, opacity) {
      anim.forEach(f => f(t));
      for (const { m, opacity: base } of materials) {
        m.opacity = base * opacity;
        if (m.uniforms?.opacity) m.uniforms.opacity.value = base * opacity;
        if (m.uniforms?.time) m.uniforms.time.value = t;
      }
      sealMat.uniforms.time.value = t; sealMat.uniforms.opacity.value = .65 * opacity;
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(({ m }) => m.dispose()); },
  };
}
