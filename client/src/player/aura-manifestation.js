import * as THREE from 'three';

// Curved surfaces carry light along their spine instead of reading as flat cutouts.
export function createAuraManifestation(effect, lowQuality, color, accent, core) {
  const group = new THREE.Group(); group.name = 'aura-manifestation';
  const count = effect === 8 || effect === 4 ? 7 : effect === 1 ? (lowQuality ? 6 : 12) : effect === 6 ? (lowQuality ? 24 : 48) : (lowQuality ? 16 : 32);
  const positions = [], uvs = [], indices = [];
  const sword = effect === 6 || effect === 8;
  const phoenix = effect === 4;
  const lotus = effect === 1;
  const divine = effect === 7, demonic = effect === 8;
  for (let j = 0; j <= 24; j++) {
    const v = j / 24;
    const width = sword ? (v < 0.16 ? 0.018 : v < 0.21 ? (demonic ? 0.065 : 0.09) : 0.035 * Math.min(1, (1 - v) * 5))
      : phoenix ? .27 * Math.pow(Math.sin(v * Math.PI), .85) * (1 - .25 * v)
      : lotus ? Math.pow(Math.sin(v * Math.PI), .45) * .34
      : Math.pow(Math.sin(v * Math.PI), 0.7) * 0.16;
    for (let k = 0; k <= 4; k++) {
      const u = k / 4;
      positions.push((u * 2 - 1) * width, v,
        sword ? Math.sin(u * Math.PI) * 0.025 : phoenix
          ? -.3 * v * v + Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * .16
          : lotus ? v * v * .16 + Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * .05
          : v * v * 0.38 + Math.sin(u * Math.PI) * 0.06);
      uvs.push(u, v);
      if (j < 24 && k < 4) { const n = j * 5 + k; indices.push(n, n + 1, n + 5, n + 1, n + 6, n + 5); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices);
  geo.computeVertexNormals();
  // Stable layer colors: geometry motion must not make each blade change allegiance.
  geo.setAttribute('layerTint', new THREE.InstancedBufferAttribute(Float32Array.from(
    { length: count }, (_, i) => i % 2), 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { tint: { value: color }, accent: { value: accent }, core: { value: core }, phoenix: { value: phoenix ? 1 : 0 }, shadow: { value: demonic ? 1 : 0 }, lotus: { value: lotus ? 1 : 0 }, time: { value: 0 }, fade: { value: 1 } },
    transparent: true, depthWrite: true, side: THREE.DoubleSide,
    vertexShader: `attribute float layerTint; varying vec2 vUv; varying float seed,layer;
      varying vec3 vNormal,vView; varying vec2 vClearance;
      void main(){vUv=uv; layer=layerTint; seed=instanceMatrix[3].x*2.+instanceMatrix[3].y;
        mat3 m=mat3(instanceMatrix);
        vec3 n=normal/vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2]));
        vNormal=normalize(normalMatrix*m*n);
        vec4 view=modelViewMatrix*instanceMatrix*vec4(position,1.);
        vec4 body=modelViewMatrix*vec4(0.,1.05,0.,1.);
        vClearance=view.xy-body.xy*(view.z/body.z);
        vView=-view.xyz; gl_Position=projectionMatrix*view;}`,
    fragmentShader: `uniform vec3 tint,accent,core; uniform float time,fade,shadow,phoenix,lotus; varying vec2 vUv; varying float seed,layer;
      varying vec3 vNormal,vView; varying vec2 vClearance;
      void main(){
        vec3 n=normalize(vNormal)*(gl_FrontFacing?1.:-1.);
        vec3 view=normalize(vView), light=normalize(vec3(-.45,.7,1.));
        float facing=abs(dot(n,view));
        float fresnel=pow(1.-facing,3.);
        float gloss=pow(max(0.,dot(n,normalize(light+view))),72.);
        float softGloss=pow(max(0.,dot(n,normalize(vec3(.8,.3,1.)+view))),16.);
        float spine=pow(1.-abs(vUv.x*2.-1.),14.);
        float edge=pow(abs(vUv.x*2.-1.),12.);
        float grain=pow(.5+.5*sin(vUv.x*95.+vUv.y*14.),8.);
        float flow=pow(max(0.,sin(vUv.y*8.-time*1.6+seed)),10.);
        // Cánh sen: gradient vàng kim → ngọc xanh đến tận đầu cánh, facet mềm hơn kiếm/cánh phượng.
        float colorBand=mix(smoothstep(.2,.9,vUv.y)*.65+layer*.35, smoothstep(.15,.85,vUv.y)*.8+layer*.2, lotus);
        vec3 body=mix(tint,accent,colorBand);
        float bevel=mix(.58,.74,lotus)+mix(.42,.26,lotus)*sin(vUv.x*3.14159265);
        vec3 hue=body*bevel*(.72+.28*max(0.,dot(n,light)));
        hue=mix(hue,core,clamp(spine*.75+edge*.25+flow*.18+grain*.08,0.,1.));
        float facet=step(.5,vUv.x);
        float glint=pow(max(0.,1.-abs(vUv.y-fract(time*.12+seed*.07))/.16),3.);
        float fuller=pow(1.-abs(vUv.x*2.-1.),5.)*smoothstep(.23,.3,vUv.y);
        vec3 steel=mix(tint,accent,.08+facet*.18+grain*.025);
        steel=mix(steel,tint,fuller*.7);
        steel+=core*(edge*.38+spine*.035+glint*.13)*smoothstep(.2,.24,vUv.y);
        float binding=step(.5,fract(vUv.y*110.))*(1.-step(.16,vUv.y));
        hue=mix(hue,steel*(1.-binding*.45),shadow);
        // Colored broad reflection plus a small ivory highlight preserve saturated bodies.
        // Cánh sen hạ phản sáng gương mạnh để hết cảm giác tinh thể, giữ lõi sáng mảnh.
        float glossAmp=mix(.8,.32,lotus), fresAmp=mix(.2,.08,lotus), softAmp=mix(.22,.1,lotus);
        hue+=accent*softGloss*softAmp*mix(1.,.16,shadow);
        hue+=core*(gloss*glossAmp*mix(1.,.25,shadow)+fresnel*fresAmp*mix(1.,.28,shadow));
        if(phoenix>.5){
          float vein=pow(.5+.5*cos(vUv.x*38.+sin(vUv.y*5.)*3.),10.);
          float heat=pow(1.-vUv.y,2.)*pow(sin(vUv.x*3.141593),2.);
          hue=mix(tint*.3,tint,.35+sin(vUv.x*3.141593)*.65);
          hue=mix(hue,accent,heat*.8+flow*.12);
          hue=mix(hue,core,heat*.6);
          hue+=accent*(vein*.06+softGloss*.08)+core*edge*.12;
        }
        // Dense colored body, feathered boundary; fading still applies to the whole avatar.
        float rim=smoothstep(0.,.035,vUv.x)*smoothstep(0.,.035,1.-vUv.x);
        float alpha=(.9+flow*.08)*rim*smoothstep(0.,.025,vUv.y);
        // Cánh sen: gốc giữ thân đặc hòa vào trận, đầu cánh trong dần cho khí xuyên qua.
        if(lotus>.5){
          alpha*=mix(1.,.58,smoothstep(.3,1.,vUv.y));
          hue*=mix(.8,1.06,smoothstep(0.,.5,vUv.y));
        }
        if(phoenix>.5) alpha*=(.86-.28*smoothstep(.45,1.,vUv.y))
          *smoothstep(.7,1.1,length(vClearance/vec2(.42,.65)));
        if(alpha<.08) discard;
        gl_FragColor=vec4(hue,alpha*fade);
      }`,
  });
  const forms = new THREE.InstancedMesh(geo, material, count);
  forms.name = sword ? 'aura-sword-formation' : 'aura-spirit-forms';
  forms.instanceMatrix.setUsage(THREE.DynamicDrawUsage); forms.frustumCulled = false;
  group.add(forms);
  const glowMat = material.clone();
  glowMat.uniforms = material.uniforms;
  glowMat.blending = THREE.AdditiveBlending;
  // Shared surface depth keeps rear glows from leaking through nearer blades.
  glowMat.depthWrite = false;
  glowMat.fragmentShader = material.fragmentShader.replace('gl_FragColor=vec4(hue,alpha*fade);',
    'gl_FragColor=vec4(mix(accent,core,flow*.4),(.035+edge*.1+gloss*.08)*rim*fade*(1.-shadow*.65)*(1.-phoenix*.65));');
  const glow = new THREE.InstancedMesh(geo,glowMat,count);
  glow.name = 'aura-surface-glow'; glow.renderOrder = 1;
  glow.instanceMatrix = forms.instanceMatrix; glow.frustumCulled = false;
  group.add(glow);
  const regalia = [];
  const haloGeo = divine ? new THREE.TorusGeometry(1, 0.038, 8, lowQuality ? 64 : 128, Math.PI * 1.25) : null;
  const haloMat = divine ? new THREE.ShaderMaterial({
    uniforms: { tint: { value: color }, accent: { value: accent }, core: { value: core }, time: { value: 0 }, fade: { value: 1 } },
    transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 tint,accent,core; uniform float time,fade; varying vec2 vUv;
      void main(){
        float chase=pow(.5+.5*cos(vUv.x*18.849556-time*2.6),10.);
        float engraving=smoothstep(.15,.25,fract(vUv.x*48.));
        float bevel=.55+.45*pow(abs(cos(vUv.y*6.283185)),3.);
        vec3 hue=mix(tint,accent,.5)*bevel*(.65+.35*engraving);
        hue=mix(hue,core,chase*.9);
        gl_FragColor=vec4(hue*(1.+chase*.7),.96*fade);
      }`,
  }) : null;
  if (haloGeo) {
    for (let i = 0; i < 2; i++) {
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(0, 1.65, -0.85); group.add(halo); regalia.push(halo);
    }
  }
  let smoke;
  if (demonic) {
    const mist = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, fade: { value: 1 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float time,fade; varying vec2 vUv;
        void main(){vec2 p=vUv*2.-1.; float r=length(p); float a=atan(p.y,p.x);
          float strands=sin(a*5.+r*17.-time*.7)+sin(a*9.-r*11.+time*.4)*.4;
          float ink=smoothstep(-.7,.9,strands)*(1.-smoothstep(.65,1.,r))*smoothstep(.16,.4,r);
          gl_FragColor=vec4(mix(vec3(.008,.005,.015),vec3(.07,.025,.11),ink*.35),ink*.86*fade);}`,
    });
    smoke = new THREE.Mesh(new THREE.PlaneGeometry(3.5,3.5),mist);
    smoke.rotation.x=-Math.PI/2; smoke.position.y=.045; group.add(smoke);
  }
  const dummy = new THREE.Object3D();
  function update(t) {
    material.uniforms.time.value = t;
    if (haloMat) haloMat.uniforms.time.value = t;
    const gather = Math.pow((1 + Math.sin(t * 1.15)) / 2, 3);
    if (smoke) smoke.material.uniforms.time.value = t;
    regalia.forEach((halo, i) => {
      halo.scale.setScalar(0.82 + i * 0.13 + Math.sin(t * 1.15 - i * 0.6) * 0.045);
      halo.rotation.set(i ? Math.sin(t * 0.65 + i) * 0.32 : 0,
        i ? Math.cos(t * 0.55 + i) * 0.4 : 0, Math.PI * .375 + Math.sin(t * .7 + i) * .08);
    });
    for (let i = 0; i < count; i++) {
      const u = i / count, a = u * Math.PI * 2, layer = i % 2;
      dummy.scale.set(1, 1, 1);
      if (effect === 6) {
        const angle = (Math.floor(i / 2) / (count / 2 - 1) - .5) * 2.4 + Math.sin(t * .8) * .1;
        const radius = (layer ? 1.28 : 0.82) - gather * 0.38;
        dummy.position.set(Math.sin(angle) * radius, .75 + Math.cos(angle) * radius, -0.7 - layer * .2);
        dummy.rotation.set(Math.sin(angle) * 0.35, Math.sin(t * 0.4 + a) * 0.6, -angle + gather * (layer ? 0.38 : -0.38));
        dummy.scale.set(1.3, (layer ? 0.8 : 1.15) + gather * 0.25, 1);
      } else if (effect === 4) {
        const petal = i - 3, bloom = .5 + .5 * Math.sin(t * 1.1 - i * .13);
        const angle = petal * (.19 + bloom * .12) + Math.sin(i * 2.4) * .035;
        dummy.position.set(petal * .045, .7 + (i % 2) * .035, -.4 - (i % 2) * .09);
        dummy.rotation.set(-.08 - bloom * .16, Math.sin(i * 1.7 + t * .55) * .13, -angle);
        dummy.scale.set(.95 + Math.sin(i * 2.1) * .12,
          1.8 - Math.abs(petal) * .09 + Math.sin(i * 1.8) * .1, 1);
      } else if (effect === 1) {
        // Đóa kim liên: một tầng cánh full 360° quanh nhân vật, gốc trên mép pháp trận,
        // sau cao trước thấp (giữ đầu-thân-bảng tên thoáng), ngả ngoài theo trục radial.
        const ang = i / count * Math.PI * 2 + t * .05;
        const back = Math.cos(ang);                     // 1 = sau lưng, -1 = trực diện
        const frontness = 1 - (back * .5 + .5);
        // Cánh nở theo cùng nhịp thở 8 s với signature: đỉnh ở pha .35, trễ dần từng cánh.
        const bp = (t % 8) / 8;
        const bloom = .5 + .5 * Math.cos((bp - .35 - i * .012) * Math.PI * 2);
        const r = .88 - frontness * .2;
        dummy.position.set(Math.sin(ang) * r, .1 + Math.sin(t * .7 + i) * .02, -Math.cos(ang) * r * .82);
        dummy.rotation.order = 'YXZ';
        dummy.rotation.set(.52 + (bloom - .5) * .3 + frontness * .3, ang, 0);
        dummy.scale.set(1.15, (1.3 - frontness * .5) * (.9 + (bloom - .5) * .26), 1);
      } else if (effect === 5) {
        const angle = a + t * 0.55;
        const fall = ((u - t * 0.18) % 1 + 1) % 1;
        dummy.position.set(Math.cos(angle) * (1 + layer * 0.22) + Math.sin(t * 1.7 + a) * 0.12, 0.2 + fall * 2.8, Math.sin(angle) * 0.7);
        dummy.rotation.set(t * 1.1 + a, a, a + t * 0.65);
        // Taper at the wrap so falling petals never visibly teleport back to the top.
        dummy.scale.setScalar((0.22 + (i % 3) * 0.04) * Math.max(0.001, Math.min(1, fall * 12, (1 - fall) * 12)));
      } else if (divine) {
        // A raised crown and two ordered fans read as a guardian, not another wheel.
        if (i < count / 4) {
          const angle = (i / (count / 4 - 1) - 0.5) * 1.5;
          dummy.position.set(Math.sin(angle) * (0.75 + gather * 0.12), 2.25 + Math.cos(angle) * 0.35 + gather * 0.16, -0.8);
          dummy.rotation.set(0.1, 0, -angle * (1 + gather * 0.15));
          dummy.scale.set(0.45, 0.45 + Math.cos(angle) * 0.2, 0.6);
        } else {
          const side = i % 2 ? -1 : 1, q = Math.floor((i - count / 4) / 2) / (count * 3 / 8 - 1);
          const lift = Math.sin(t * 1.2 - q * 0.65) * 0.28;
          dummy.position.set(side * (0.45 + q * (0.85 + lift * 0.3)), 1.55 - q * 0.65 + lift * q, -0.6 + Math.sin(q * Math.PI) * 0.18);
          dummy.rotation.set(0.1, side * (0.2 + lift * 0.45), side * (-0.75 - q * 0.65 + lift));
          dummy.scale.set(0.75, 1.2 - q * 0.42 + gather * 0.1, 1);
        }
      } else if (demonic) {
        const rank = Math.abs(i-3), breath = Math.sin(t*1.35-rank*.55);
        const release = Math.pow(Math.max(0,Math.sin(t*1.2-rank*.3)),3);
        const angle = (i-3)*(.29+release*.065);
        dummy.position.set(Math.sin(angle)*(1.02+release*.28), .88+Math.cos(angle)*.32+breath*.16+release*.12,
          -1.02+rank*.08-release*.14);
        dummy.rotation.set(.08+release*.08,Math.sin(t*.8+i)*.22,-angle);
        dummy.scale.set(i===3 ? 2.25 : 1.45, i===3 ? 1.85 : 1.5-rank*.16+release*.12,1.5);
      } else {
        const angle = a + t * (effect === 3 ? -0.48 : 0.36);
        const radius = 0.95 + layer * 0.35 + Math.sin(t * 1.3 + layer * Math.PI) * 0.14;
        dummy.position.set(Math.cos(angle) * radius, 1.35 + Math.sin(angle) * radius * 0.8, -0.5 + Math.sin(angle * 2 + t * 0.3) * 0.45);
        if (effect === 3) dummy.position.set(Math.sin(a * 2.7) * 1.25,
          .45 + u * 2.5 + Math.sin(t * 1.2 + a) * .12, -.65 + Math.cos(a) * .18);
        dummy.rotation.set(a * 0.4, angle, angle - Math.PI / 2);
        dummy.scale.set(effect === 3 ? 0.3 : 0.55, 0.65 + gather * 0.25, 1);
      }
      dummy.updateMatrix(); forms.setMatrixAt(i, dummy.matrix);
    }
    forms.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { group, update, setOpacity(f) { material.uniforms.fade.value = f; material.depthWrite = f > 0.95;
    if (haloMat) haloMat.uniforms.fade.value = f;
    if (smoke) smoke.material.uniforms.fade.value = f; },
    dispose() { geo.dispose(); material.dispose(); glowMat.dispose(); haloGeo?.dispose(); haloMat?.dispose(); smoke?.geometry.dispose(); smoke?.material.dispose(); } };
}
