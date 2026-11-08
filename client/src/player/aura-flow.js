import * as THREE from 'three';

// Both mist and sparks follow the same outward field, rather than orbiting props.
export function createAuraFlow(effect, lowQuality, tint, accent, core) {
  const group = new THREE.Group(); group.name = 'aura-flow';
  const uniforms = { time: { value: 0 }, fade: { value: 1 }, tint: { value: tint },
    fire: { value: effect === 4 ? 1 : 0 },
    accent: { value: accent }, core: { value: core },
    twist: { value: [1.6, 2.8, .65, 1.2, 1.9, .35, .8, -1.7][effect - 1] },
    rise: { value: [1.1, 1.45, 1.8, 2.25, 1.25, .9, 2, 1.6][effect - 1] } };
  const field = `uniform float time,twist,rise,fire; attribute float phase;
    vec3 flow(float u){
      float a=phase*6.283185+u*twist+sin(time*.65+phase*9.)*.15;
      float r=.22+u*1.95;
      float lift=sin(phase*17.)*.35;
      if(fire>.5){
        float i=floor(phase*7.+.01), petal=i-3.;
        float bloom=.5+.5*sin(time*1.1-i*.13);
        float angle=petal*(.19+bloom*.12)+sin(i*2.4)*.035;
        float curl=sin(u*12.-time*2.4+i)*.12*u*u;
        return vec3(petal*.045+sin(angle)*u*1.8+curl,
          .7+cos(angle)*u*1.8+u*u*.35,-.48-u*u*.4+curl*.6);
      }
      return vec3(cos(a)*r,.18+u*rise+sin(u*3.141593)*lift,sin(a)*r);
    }`;
  const positions = [], uv = [], phases = [], indices = [];
  const count = effect === 4 ? 7 : lowQuality ? 6 : 10, segments = lowQuality ? 24 : 40;
  for (let k = 0; k < count; k++) for (let j = 0; j <= segments; j++) {
    for (let side = 0; side < 2; side++) {
      positions.push(0, 0, 0); uv.push(j / segments, side); phases.push(k / count);
    }
    if (j < segments) {
      const n = (k * (segments + 1) + j) * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({ uniforms, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, blending: effect === 4 ? THREE.NormalBlending : THREE.AdditiveBlending,
    vertexShader: `${field} varying vec2 vUv,vClearance; varying float vPhase;
      void main(){
        vUv=uv; vPhase=phase;
        vec4 p=modelViewMatrix*vec4(flow(uv.x),1.);
        vec3 tangent=(modelViewMatrix*vec4(flow(uv.x+.005)-flow(uv.x),0.)).xyz;
        vec2 side=normalize(vec2(-tangent.y,tangent.x)+vec2(.00001));
        float width=(.06+.32*uv.x)*pow(sin(uv.x*3.141593),.65);
        if(fire>.5) width=(.035+.16*sin(uv.x*3.141593))*pow(max(0.,1.-uv.x),.5);
        p.xy+=side*(uv.y*2.-1.)*width;
        vec4 body=modelViewMatrix*vec4(0.,1.05,0.,1.);
        vClearance=p.xy-body.xy*(p.z/body.z);
        gl_Position=projectionMatrix*p;
      }`,
    fragmentShader: `uniform float time,fade,fire; uniform vec3 tint,accent,core;
      varying vec2 vUv,vClearance; varying float vPhase;
      void main(){
        float edge=pow(max(0.,sin(vUv.y*3.141593)),3.);
        float life=smoothstep(0.,.08,vUv.x)*(1.-smoothstep(.6,1.,vUv.x));
        float packet=pow(.5+.5*cos(vUv.x*12.-time*3.8+vPhase*6.283185),5.);
        float silk=.65+.35*sin(vUv.x*32.-time*2.+vUv.y*11.);
        float filament=pow(max(0.,1.-abs(vUv.y-.5)*18.),3.);
        vec3 hue=mix(tint,accent,vUv.x);
        hue=mix(hue,core,filament*.7+packet*.2);
        if(fire>.5){
          float turbulence=sin(vUv.x*19.-time*3.5+vPhase*18.)*.16
            +sin(vUv.x*37.-time*5.+vUv.y*15.)*.09;
          float center=abs(vUv.y-.5+turbulence*vUv.x)*2.;
          float flame=1.-smoothstep(.2,.95,center);
          float surge=.25+.75*pow(.5+.5*sin(vUv.x*15.-time*3.+vPhase*6.),2.);
          float heat=clamp((1.-vUv.x)*.7+(1.-center)*.45,0.,1.);
          hue=mix(tint*.45,accent,smoothstep(.15,.85,heat));
          hue=mix(hue,core,smoothstep(.88,1.,heat)*.45);
          // Screen-space breathing room protects the avatar at side and rear angles too.
          float clear=smoothstep(.8,1.15,length(vClearance/vec2(.55,.95)));
          float fray=smoothstep(-.4,.7,sin(vUv.x*31.-time*4.+vUv.y*17.)+sin(vUv.y*23.+time));
          gl_FragColor=vec4(hue,flame*life*surge*fade*.48*clear*fray);
          return;
        }
        gl_FragColor=vec4(hue,edge*life*(.09+packet*.5+filament*.18)*silk*fade);
      }`,
  });
  const streams = new THREE.Mesh(geometry, material);
  streams.frustumCulled = false; group.add(streams);
  const sparkGeo = new THREE.BufferGeometry(), sparks = effect === 4 ? (lowQuality ? 16 : 24) : lowQuality ? 32 : 64;
  sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(sparks * 3), 3));
  sparkGeo.setAttribute('phase', new THREE.Float32BufferAttribute(Array.from({ length: sparks }, (_, i) => (i % count) / count), 1));
  sparkGeo.setAttribute('offset', new THREE.Float32BufferAttribute(Array.from({ length: sparks }, (_, i) => i * .61803398875 % 1), 1));
  const sparkMat = new THREE.ShaderMaterial({ uniforms, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `${field} attribute float offset; varying float life;
      void main(){float u=fract(time*mix(.3,.8,fire)+offset);
        life=smoothstep(0.,.08,u)*(1.-smoothstep(.55,1.,u));
        if(fire>.5) life*=.18+.82*pow(max(0.,cos(time*1.1-1.)),4.);
        vec4 p=modelViewMatrix*vec4(flow(u),1.);
        gl_Position=projectionMatrix*p; gl_PointSize=clamp(24./max(1.,-p.z),1.,7.);
      }`,
    fragmentShader: `uniform vec3 core,accent; uniform float fade; varying float life;
      void main(){float r=length(gl_PointCoord-.5)*2.;
        gl_FragColor=vec4(mix(core,accent,r),pow(max(0.,1.-r),2.)*life*fade*.85);
      }`,
  });
  const motes = new THREE.Points(sparkGeo, sparkMat); motes.frustumCulled = false; group.add(motes);
  return { group, update(t) { uniforms.time.value = t; },
    setOpacity(f) { uniforms.fade.value = f; },
    dispose() { geometry.dispose(); material.dispose(); sparkGeo.dispose(); sparkMat.dispose(); } };
}
