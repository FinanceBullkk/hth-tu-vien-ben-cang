// Trời và chu kì ngày: hoàng hôn sang đêm rồi về lại, tính từ giờ server nên mọi máy giống nhau.
import * as THREE from 'three';
import { rng } from './builders.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const PAL = {
  dusk: { top: '#34406f', mid: '#b4647a', hor: '#ffa45e', fog: '#d98a64', sun: '#ffb27a', hemiSky: '#ffc9a0', hemiGnd: '#6a4a3a' },
  night: { top: '#050817', mid: '#0e1636', hor: '#1c2a55', fog: '#141d3c', sun: '#8fa8ff', hemiSky: '#51639f', hemiGnd: '#1c1a2a' },
};
const c = (hex) => new THREE.Color(hex);

export class DayNight {
  constructor(scene) {
    this.scene = scene;
    this.night = 0;
    this.dusk = {};
    this.nightPal = {};
    for (const k of Object.keys(PAL.dusk)) {
      this.dusk[k] = c(PAL.dusk[k]);
      this.nightPal[k] = c(PAL.night[k]);
    }
    this.fog = new THREE.Fog(this.dusk.fog.getHex(), 140, 780);
    scene.fog = this.fog;

    this.uniforms = {
      top: { value: this.dusk.top.clone() },
      mid: { value: this.dusk.mid.clone() },
      hor: { value: this.dusk.hor.clone() },
      sunDir: { value: new THREE.Vector3(0.8, 0.18, 0.4).normalize() },
      sunAmt: { value: 1 },
    };
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(1200, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        uniforms: this.uniforms,
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          varying vec3 vDir; uniform vec3 top, mid, hor, sunDir; uniform float sunAmt;
          void main(){
            float h = clamp(vDir.y, -0.05, 1.0);
            vec3 col = mix(hor, mid, smoothstep(0.0, 0.16, h));
            col = mix(col, top, smoothstep(0.12, 0.6, h));
            float d = max(dot(normalize(vDir), sunDir), 0.0);
            col += vec3(1.0,0.55,0.25) * pow(d, 18.0) * 0.45 * sunAmt;
            col += vec3(1.0,0.82,0.55) * smoothstep(0.9985, 0.9993, d) * sunAmt;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    );
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    // Sao trời
    const rand = rng(99);
    const N = 500;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = rand() * Math.PI * 2;
      const v = rand() * 0.95 + 0.04;
      const r = Math.sqrt(1 - v * v);
      pos[i * 3] = Math.cos(u) * r * 1100;
      pos[i * 3 + 1] = v * 1100;
      pos[i * 3 + 2] = Math.sin(u) * r * 1100;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // Trăng
    this.moonMat = new THREE.MeshBasicMaterial({ color: 0xf2f0dc, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.moon = new THREE.Mesh(new THREE.CircleGeometry(26, 20), this.moonMat);
    this.moon.position.set(-420, 620, 520);
    this.moon.lookAt(0, 0, 0);
    scene.add(this.moon);

    this.sun = new THREE.DirectionalLight(this.dusk.sun.getHex(), 2.3);
    this.sun.castShadow = true;
    this.sun.shadow.camera.left = -48;
    this.sun.shadow.camera.right = 48;
    this.sun.shadow.camera.top = 52;
    this.sun.shadow.camera.bottom = -52;
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 220;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.sun.target.position.set(0, 0, 4);
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(this.dusk.hemiSky.getHex(), this.dusk.hemiGnd.getHex(), 1.5);
    scene.add(this.hemi);

    this.sunDirVec = new THREE.Vector3(0.8, 0.3, 0.42).normalize();
    this.moonDirVec = new THREE.Vector3(-0.42, 0.78, 0.5).normalize();
    this.lightDir = new THREE.Vector3();
    this.tmp = new THREE.Color();
    this.seaColor = new THREE.Color();
  }

  setShadowSize(size) {
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
  }

  /** @param {number} now giờ server (ms) */
  update(now, cycleMs) {
    const t = (now % cycleMs) / cycleMs;
    let n;
    if (t < 0.5) n = smooth(0, 0.5, t);
    else if (t < 0.82) n = 1;
    else n = 1 - smooth(0.82, 1, t);
    this.night = n;

    const lerp = (key, target) => target.copy(this.dusk[key]).lerp(this.nightPal[key], n);
    lerp('top', this.uniforms.top.value);
    lerp('mid', this.uniforms.mid.value);
    lerp('hor', this.uniforms.hor.value);
    lerp('fog', this.fog.color);
    lerp('sun', this.sun.color);
    lerp('hemiSky', this.hemi.color);
    lerp('hemiGnd', this.hemi.groundColor);

    // Mặt trời lặn dần về phía cảng.
    const sunY = 0.2 - 0.4 * Math.min(1, n * 1.8);
    this.uniforms.sunDir.value.set(0.8, sunY, 0.42).normalize();
    this.uniforms.sunAmt.value = Math.max(0, 1 - n * 1.7);

    this.lightDir.copy(this.sunDirVec).lerp(this.moonDirVec, smooth(0.25, 0.75, n)).normalize();
    this.sun.position.copy(this.lightDir).multiplyScalar(110).add(this.sun.target.position);
    this.sun.intensity = 2.3 + (1.15 - 2.3) * n;
    this.hemi.intensity = 1.5 + (1.3 - 1.5) * n;

    this.starMat.opacity = smooth(0.45, 0.95, n);
    this.moonMat.opacity = smooth(0.3, 0.8, n);
  }

  /** Giữ vòm trời bám theo camera để không bị cắt ở xa. */
  follow(camera) {
    this.dome.position.copy(camera.position);
    this.stars.position.copy(camera.position);
  }
}
