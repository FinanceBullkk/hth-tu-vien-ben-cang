// Rồng và phượng: sinh vật bầu trời của tu viện. Đường bay tính từ giờ server (nowMs)
// nên mọi máy thấy cùng một cú bay; sự kiện chuông sẽ gọi flourish() để chúng lượn sát xuống.
// Model dựng trong Blender (scripts/build_assets.py), game chỉAnimate node.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture } from './builders.js';

const loader = new GLTFLoader();

function loadModel(file) {
  return new Promise((resolve) => {
    loader.load(`/models/${file}`, (gltf) => resolve(gltf.scene), undefined, () => resolve(null));
  });
}

let glowTex = null;
function trailTexture() {
  if (!glowTex) glowTex = glowTexture(48, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  return glowTex;
}

/** Gộp mọi mesh con của một node thành một geometry để dùng với InstancedMesh.
 *  Trả về { geometry, materials } khớp nhóm theo thứ tự mesh. */
function mergedGeometry(root) {
  const geos = [];
  const materials = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.geometry;
    // Chuẩn hoá chỉ còn position + normal để merge không vướng thuộc tính lệch nhau.
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', src.getAttribute('position').clone());
    if (!src.getAttribute('normal')) src.computeVertexNormals();
    g.setAttribute('normal', src.getAttribute('normal').clone());
    g.applyMatrix4(o.matrixWorld);
    const index = src.getIndex();
    if (index) g.setIndex(index.clone());
    geos.push(g);
    const list = Array.isArray(o.material) ? o.material : [o.material];
    materials.push(list[0]);
  });
  return geos.length ? { geometry: mergeGeometries(geos, true), materials } : null;
}

// Đường bay elip quanh sân: trạng thái 0 = ambient cao xa, 1 = sự kiện sát sân.
function dragonPoint(t, event, out) {
  const speed = 0.055 + event * 0.075;
  const a = t * speed;
  const rx = 62 - event * 38;
  const rz = 78 - event * 52;
  const y = 27 - event * 15 + Math.sin(t * 0.13) * 5 * (1 - event * 0.6);
  out.set(Math.cos(a) * rx, y, 4 + Math.sin(a) * rz);
  return out;
}

class Dragon {
  constructor(scene, lowQuality) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.count = lowQuality ? 12 : 20;
    this.ready = false;
    this.event = 0;
    // Hạt vàng bay theo thân.
    const n = lowQuality ? 16 : 34;
    this.trailN = n;
    const geo = new THREE.BufferGeometry();
    this.trailPos = new Float32Array(n * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.trailMat = new THREE.PointsMaterial({
      color: 0xffd98a, size: 1.5, map: trailTexture(), transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.trail = new THREE.Points(geo, this.trailMat);
    this.trail.frustumCulled = false;
    this.trail.renderOrder = 7;
    this.group.add(this.trail);
    this.seed = new Float32Array(n);
    for (let i = 0; i < n; i++) this.seed[i] = (i * 37 % 100) / 100;
  }

  async build() {
    const scene = await loadModel('dragon.glb');
    if (!scene) return;
    const headSrc = scene.getObjectByName('head');
    const segSrc = scene.getObjectByName('seg');
    if (!headSrc || !segSrc) return;
    this.head = headSrc.clone(true);
    this.head.scale.setScalar(1.7);
    this.group.add(this.head);
    const seg = mergedGeometry(segSrc);
    if (seg) {
      this.segMesh = new THREE.InstancedMesh(seg.geometry, seg.materials, this.count);
      this.segMesh.frustumCulled = false;
      this.segMesh.castShadow = false;
      this.group.add(this.segMesh);
    }
    this.ready = true;
    this.group.visible = true;
  }

  flourish(amount) {
    this.event = Math.min(1, this.event + amount);
  }

  update(dt, t) {
    if (!this.ready) return;
    this.event = Math.max(0, this.event - dt / 14);
    const e = this.event;
    // Đầu rồng trên đường bay; thân đuổi theo các điểm mẫu trễ dần tạo thân uốn.
    const p = new THREE.Vector3();
    const ahead = new THREE.Vector3();
    dragonPoint(t, e, ahead);
    dragonPoint(t - 0.5, e, p);
    this.head.position.copy(ahead);
    const dir = ahead.clone().sub(p);
    this.head.lookAt(ahead.clone().add(dir));
    if (this.segMesh) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const one = new THREE.Vector3(1, 1, 1);
      const tangent = new THREE.Vector3();
      const side = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < this.count; i++) {
        const k = i / this.count;
        const back = 0.5 + k * 2.6;
        dragonPoint(t - back, e, p);
        // Lắc thân side-to-side theo phương vuông góc đường bay, mạnh dần về đuôi.
        dragonPoint(t - back - 0.1, e, tangent).sub(p).normalize();
        side.crossVectors(tangent, up).normalize();
        const sway = Math.sin(t * 1.6 - k * 4.2) * (0.8 + e * 1.8) * k;
        p.addScaledVector(side, sway * 2.2);
        p.y += Math.sin(t * 2.1 - k * 3.1) * 0.5 * (1 + e);
        const s = (1 - k * 0.62) * (0.9 + e * 0.15);
        m.compose(p, q, one.multiplyScalar(s));
        this.segMesh.setMatrixAt(i, m);
        one.set(1, 1, 1);
      }
      this.segMesh.instanceMatrix.needsUpdate = true;
    }
    // Hạt vàng đuôi rồng: rải quanh các đốt.
    for (let i = 0; i < this.trailN; i++) {
      const k = (i / this.trailN);
      dragonPoint(t - 0.5 - k * 3.4, e, p);
      this.trailPos[i * 3] = p.x + (this.seed[i] - 0.5) * 4;
      this.trailPos[i * 3 + 1] = p.y + (this.seed[(i + 7) % this.trailN] - 0.5) * 2.4;
      this.trailPos[i * 3 + 2] = p.z + (this.seed[(i + 3) % this.trailN] - 0.5) * 4;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trailMat.opacity = 0.16 + e * 0.5;
    this.trailMat.size = 1.2 + e * 1.6;
  }
}

class Phoenix {
  constructor(scene, lowQuality) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.ready = false;
    this.event = 0;
    this.lowQuality = lowQuality;
    this.hist = [];
    this.histMax = lowQuality ? 26 : 52;
    // Vệt lửa: đuôi phượng để lại.
    const geo = new THREE.BufferGeometry();
    this.trailPos = new Float32Array(this.histMax * 3);
    const col = new Float32Array(this.histMax * 3);
    const c = new THREE.Color();
    for (let i = 0; i < this.histMax; i++) {
      c.set(i % 2 ? 0xff8a5e : 0xffd98a).multiplyScalar(1 - i / this.histMax * 0.7);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.trailMat = new THREE.PointsMaterial({
      size: 1.1, map: trailTexture(), vertexColors: true, transparent: true, opacity: 0.75,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.trail = new THREE.Points(geo, this.trailMat);
    this.trail.frustumCulled = false;
    this.trail.renderOrder = 7;
    this.group.add(this.trail);
  }

  async build() {
    const scene = await loadModel('phoenix.glb');
    if (!scene) return;
    const body = scene.getObjectByName('body');
    if (!body) return;
    this.body = body.clone(true);
    this.body.scale.setScalar(1.5);
    this.group.add(this.body);
    this.wingL = this.body.getObjectByName('wingL');
    this.wingR = this.body.getObjectByName('wingR');
    this.tails = [1, 2, 3].map((i) => this.body.getObjectByName(`tail${i}`)).filter(Boolean);
    this.ready = true;
    this.group.visible = true;
  }

  flourish(amount) {
    this.event = Math.min(1, this.event + amount);
  }

  update(dt, t, night) {
    if (!this.ready) return;
    this.event = Math.max(0, this.event - dt / 14);
    const e = this.event;
    const speed = 0.32 + e * 0.5;
    const a = t * speed;
    // Số 8 quanh gác chuông; sự kiện thì thu nhỏ vòng, hạ thấp sát mái.
    const rx = 26 - e * 14;
    const rz = 18 - e * 9;
    const x = Math.sin(a) * rx;
    const z = 4 + Math.sin(a * 2) * rz;
    const y = 13.5 + night * 3 + Math.sin(a * 2 + 1.2) * 2.4 - e * 4.5;
    this.body.position.set(x, y, z);
    const look = new THREE.Vector3(
      Math.sin(a + 0.05) * rx,
      y + (Math.sin((a + 0.05) * 2 + 1.2) - Math.sin(a * 2 + 1.2)) * 2.4,
      4 + Math.sin((a + 0.05) * 2) * rz,
    );
    this.body.lookAt(look);
    // Vỗ cánh và đuôi lượn trễ pha.
    const flap = Math.sin(t * 7.5) * 0.62 + 0.22 + e * 0.25;
    if (this.wingL) this.wingL.rotation.z = -flap;
    if (this.wingR) this.wingR.rotation.z = flap;
    this.tails.forEach((tail, i) => {
      tail.rotation.x = Math.sin(t * 3.1 - i * 0.8) * 0.16 - e * 0.12;
      tail.rotation.y = Math.sin(t * 2.2 - i * 0.55) * 0.12;
    });
    // Vệt lửa: lịch sử vị trí, mờ dần theo màu vertex.
    this.hist.unshift(this.body.position.clone());
    if (this.hist.length > this.histMax) this.hist.pop();
    for (let i = 0; i < this.histMax; i++) {
      const hp = this.hist[Math.min(i, this.hist.length - 1)];
      const j = (i % 5) - 2;
      this.trailPos[i * 3] = hp.x + j * 0.24;
      this.trailPos[i * 3 + 1] = hp.y + ((i % 3) - 1) * 0.2;
      this.trailPos[i * 3 + 2] = hp.z + j * 0.2;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trailMat.opacity = 0.4 + e * 0.5;
  }
}

export class Celestial {
  constructor(scene, lowQuality) {
    this.dragon = new Dragon(scene, lowQuality);
    this.phoenix = new Phoenix(scene, lowQuality);
    this.dragon.build();
    this.phoenix.build();
    this.t = 0;
  }

  /** Sự kiện vui (chuông ngân chung, hoàn thành nhịp sen): rồng phượng lượn sát mấy giây. */
  flourish(intensity = 1) {
    this.dragon.flourish(intensity);
    this.phoenix.flourish(intensity);
  }

  update(dt, nowMs, night) {
    // Giờ server giữ mọi máy cùng một đường bay; cộng dồn dt cho phần sự kiện mượt theo khung.
    this.t = nowMs / 1000;
    this.dragon.update(dt, this.t);
    this.phoenix.update(dt, this.t, night);
  }
}
