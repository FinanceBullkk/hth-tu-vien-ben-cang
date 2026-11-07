// Vũ khí mang sau lưng: dựng trong Blender, export .glb, mọi nhân vật dùng chung bản đã tải.
// Node tên "blade" (kiếm) / "strands" (phất trần) được code xoay và nhấp sáng. Nếu file chưa
// có hoặc tải lỗi thì dựng bản code đơn giản thay thế, game không bao giờ vỡ.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { glowTexture } from '../scene/builders.js';

const loader = new GLTFLoader();
const cache = new Map(); // weapon -> Promise<Object3D | null>

function loadModel(file) {
  if (!cache.has(file)) {
    cache.set(file, new Promise((resolve) => {
      loader.load(`/models/${file}`,
        (gltf) => resolve(gltf.scene),
        undefined,
        () => resolve(null),
      );
    }));
  }
  return cache.get(file);
}

let glowTex = null;
function glow() {
  if (!glowTex) glowTex = glowTexture(64, 'rgba(210,236,255,1)', 'rgba(210,236,255,0)');
  return glowTex;
}

const mats = {
  steel: new THREE.MeshLambertMaterial({ color: 0xdfe8f2, flatShading: true, emissive: 0x4d78a8, emissiveIntensity: 0.25 }),
  gold: new THREE.MeshLambertMaterial({ color: 0xbca36b, flatShading: true }),
  hilt: new THREE.MeshLambertMaterial({ color: 0x7a2f22, flatShading: true }),
  wood: new THREE.MeshLambertMaterial({ color: 0x6e4f33, flatShading: true }),
  strand: new THREE.MeshLambertMaterial({ color: 0xf2e9d6, flatShading: true, side: THREE.DoubleSide }),
};

// Bản thay thế dựng bằng code — hình khối thô nhưng đủ dùng khi .glb chưa sẵn sàng.
function fallbackSword() {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.014), mats.steel.clone());
  blade.position.y = 0.36;
  blade.name = 'blade';
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.028, 0.036), mats.gold);
  guard.position.y = 0.03;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.15, 6), mats.hilt);
  grip.position.y = -0.06;
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 5), mats.gold);
  pommel.position.y = -0.14;
  g.add(blade, guard, grip, pommel);
  return g;
}

function fallbackWhisk() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.4, 6), mats.wood);
  handle.position.y = 0.2;
  const knot = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.012, 5, 8), mats.gold);
  knot.position.y = 0.4;
  knot.rotation.x = Math.PI / 2;
  const strands = new THREE.Group();
  strands.name = 'strands';
  strands.position.y = 0.4;
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.2, 2, 5), mats.strand);
    const a = (i / 6) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.035, -0.12, Math.sin(a) * 0.035);
    s.rotation.z = Math.cos(a) * 0.18;
    s.rotation.x = -Math.sin(a) * 0.18;
    strands.add(s);
  }
  g.add(handle, knot, strands);
  return g;
}

/** Gắn glow sprite additive sau lưỡi kiếm, pulse theo t. */
function addGlow(group) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow(), color: 0x9fd0ff, transparent: true, opacity: 0.3,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sprite.scale.set(0.55, 0.55, 1);
  sprite.position.set(0, 0.38, 0.02);
  group.add(sprite);
  return sprite;
}

export function createWeapon(weapon) {
  const group = new THREE.Group();
  if (!weapon) return { group, update() {}, discard() {} };

  let glowSprite = null;
  let bladeMat = null;
  let strands = null;
  let discarded = false;

  const file = weapon === 1 ? 'sword.glb' : 'whisk.glb';
  loadModel(file).then((scene) => {
    if (discarded) return; // đã đổi look trước khi file tải xong
    const rig = scene ?? (weapon === 1 ? fallbackSword() : fallbackWhisk());
    rig.traverse((o) => {
      if (o.name === 'blade') {
        o.material = o.material.clone();
        o.material.emissive = new THREE.Color(0x4d78a8);
        bladeMat = o.material;
      }
      if (o.name === 'strands') strands = o;
    });
    if (weapon === 1) glowSprite = addGlow(rig);
    // Gốc vũ khí ở giữa cán; nghiêng chéo sau lưng do group của avatar xoay.
    rig.position.set(0, -0.08, 0);
    group.add(rig);
  });

  return {
    group,
    discard() {
      discarded = true;
    },
    update(t, walkAmt) {
      if (weapon === 1 && bladeMat) {
        const pulse = 0.2 + (Math.sin(t * 1.7) * 0.5 + 0.5) * 0.35 + walkAmt * 0.2;
        bladeMat.emissiveIntensity = pulse;
        if (glowSprite) glowSprite.material.opacity = 0.18 + pulse * 0.25;
      }
      if (weapon === 2 && strands) {
        strands.rotation.x = Math.sin(t * 2.6) * 0.12 + walkAmt * 0.3;
        strands.rotation.z = Math.sin(t * 1.9) * 0.08;
      }
    },
  };
}
