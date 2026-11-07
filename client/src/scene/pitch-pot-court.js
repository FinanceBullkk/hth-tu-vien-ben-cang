// Sân đầu hồ cạnh bãi container: chum lớn, hai bình đích, đối thủ NPC và các mũi tên bay parabol.
import * as THREE from 'three';
import { PITCH_ZONE, floorHeight } from '../../../shared/layout.js';
import { PITCH } from '../../../shared/pitch.js';
import { Avatar } from '../player/avatar.js';
import { Batch, flatMaterial } from './builders.js';
import { addRobe } from './gate-monk.js';

const ARROW_COUNT = 10;
const ARROW_LIFE_MS = 9000; // Trúng thì cắm trong bình một lúc như trên sân thật.
const POT_MOUTH_Y = 0.62;
const UP = new THREE.Vector3(0, 1, 0);
const OPENING_LINES = ['Mời thí chủ ném trước.', 'Tay vững, lòng yên nhé.', 'Đừng để combo tuột đấy.'];

/** Dựng thân bình/chum bằng cách tiện profile quanh trục đứng. */
const lathe = (profile) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 14);

const POT_PROFILE = [[0, 0], [0.13, 0], [0.2, 0.14], [0.21, 0.26], [0.13, 0.42], [0.06, 0.52], [0.06, 0.56], [0.1, POT_MOUTH_Y], [0.08, POT_MOUTH_Y], [0.04, 0.5]];
const JAR_PROFILE = [[0, 0], [0.38, 0], [0.58, 0.28], [0.62, 0.5], [0.52, 0.76], [0.42, 0.84], [0.46, 0.92], [0.4, 0.92], [0.34, 0.72], [0, 0.66]];

function buildArrowGeometry() {
  const b = new Batch(51);
  b.cyl(0.009, 0.009, 0.74, '#b98a55', 0, 0, 0, { seg: 5, jitter: 0 });
  b.add(new THREE.ConeGeometry(0.018, 0.07, 5), '#55585c', { y: 0.4, jitter: 0 });
  b.box(0.07, 0.11, 0.004, '#a8432a', 0, -0.32, 0, { jitter: 0 });
  b.box(0.004, 0.11, 0.07, '#a8432a', 0, -0.32, 0, { jitter: 0 });
  const merged = b.build(flatMaterial());
  return merged.geometry;
}

class Opponent {
  constructor(scene) {
    const { opponent } = PITCH_ZONE;
    this.avatar = new Avatar({ name: PITCH.opponents[0].name });
    this.avatar.nameEl.classList.add('abbot');
    this.avatar.label.position.y = 1.72;
    this.avatar.attire.hide();
    addRobe(this.avatar);
    this.avatar.root.position.set(opponent.x, floorHeight(opponent.x, opponent.z), opponent.z);
    this.avatar.root.rotation.y = opponent.rot;
    scene.add(this.avatar.root);
    this.throwT = 0;
  }

  /** Đổi tên theo đối thủ người chơi vừa chọn và chào một câu. */
  present(tier) {
    this.avatar.nameEl.textContent = PITCH.opponents[tier].name;
    this.avatar.say(OPENING_LINES[tier] ?? OPENING_LINES[0], 3500);
  }

  update(dt, camera) {
    this.throwT = Math.max(0, this.throwT - dt);
    this.avatar.update(dt, false, camera.position.distanceTo(this.avatar.root.position));
    const swing = Math.sin((this.throwT / 0.6) * Math.PI);
    this.avatar.armR.rotation.set(-0.3 - swing * 2, 0, -0.1);
    this.avatar.armL.rotation.set(-0.2, 0, 0.1);
  }
}

export class PitchPotCourt {
  constructor(scene) {
    this.group = new THREE.Group();
    const mat = flatMaterial();
    const props = new Batch(41);
    const { jar, pots } = PITCH_ZONE;
    for (const pot of pots) {
      props.add(lathe(POT_PROFILE), '#3f4a55', { x: pot.x, y: 0.04, z: pot.z, jitter: 0.1 });
      props.cyl(0.34, 0.38, 0.04, '#8c7a5c', pot.x, 0.04, pot.z, { seg: 12 });
    }
    props.add(lathe(JAR_PROFILE), '#5b4630', { x: jar.x, y: 0.04, z: jar.z, jitter: 0.12 });
    // Bó tên xếp sẵn cạnh chum.
    for (let i = 0; i < 5; i++) {
      props.cyl(0.008, 0.008, 0.76, '#b98a55', jar.x - 0.05 + i * 0.03, 0.82, jar.z - 0.42 + i * 0.02, { seg: 5, rx: 0.2 + i * 0.03, rz: -0.25 + i * 0.1 });
    }
    this.group.add(props.build(mat));
    scene.add(this.group);

    const geo = buildArrowGeometry();
    const arrowMat = flatMaterial();
    this.arrows = [];
    for (let i = 0; i < ARROW_COUNT; i++) {
      const mesh = new THREE.Mesh(geo, arrowMat);
      mesh.castShadow = true;
      mesh.visible = false;
      scene.add(mesh);
      this.arrows.push({ mesh, delay: 0, age: 0, flying: false, active: false, from: new THREE.Vector3(), to: new THREE.Vector3(), tilt: new THREE.Vector3() });
    }
    this.opponent = new Opponent(scene);
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._dir = new THREE.Vector3();
  }

  /** Một mũi tên bay về bình của bên ném. Trúng cắm vào miệng bình, trượt rơi cạnh bình. */
  launch(potIndex, fromX, fromZ, hit, delayMs = 0) {
    const arrow = this.arrows.find((a) => !a.active) ?? this.arrows.reduce((old, a) => (a.age > old.age ? a : old));
    const pot = PITCH_ZONE.pots[potIndex];
    arrow.from.set(fromX, 1.45, fromZ);
    if (hit) {
      arrow.to.set(pot.x, POT_MOUTH_Y + 0.28, pot.z);
      arrow.tilt.set(Math.random() * 0.2 - 0.1, 1, Math.random() * 0.2 - 0.1).normalize();
    } else {
      const a = Math.random() * Math.PI * 2;
      arrow.to.set(pot.x + Math.cos(a) * 0.65, 0.12, pot.z + Math.sin(a) * 0.65);
      arrow.tilt.set(Math.cos(a), 0.18, Math.sin(a)).normalize();
    }
    arrow.delay = delayMs;
    arrow.age = 0;
    arrow.flying = true;
    arrow.active = true;
    arrow.mesh.visible = false;
  }

  /** Cả lượt của một người chơi: người ném trước, đối thủ ném sau khi tên đầu đã bay. */
  playTurn(fromX, fromZ, hit, npcHit) {
    this.launch(0, fromX, fromZ, hit);
    if (npcHit === null || npcHit === undefined) return;
    const { opponent } = PITCH_ZONE;
    this.launch(1, opponent.x, opponent.z, npcHit, PITCH.npcThrowDelayMs);
    this.opponentThrowIn = PITCH.npcThrowDelayMs / 1000;
  }

  update(dt, camera) {
    if (this.opponentThrowIn > 0) {
      this.opponentThrowIn -= dt;
      if (this.opponentThrowIn <= 0) this.opponent.throwT = 0.6;
    }
    this.opponent.update(dt, camera);
    for (const arrow of this.arrows) {
      if (!arrow.active) continue;
      if (arrow.delay > 0) {
        arrow.delay -= dt * 1000;
        continue;
      }
      arrow.age += dt * 1000;
      arrow.mesh.visible = true;
      if (arrow.flying) this.#fly(arrow);
      else if (arrow.age > ARROW_LIFE_MS) {
        arrow.active = false;
        arrow.mesh.visible = false;
      }
    }
  }

  #fly(arrow) {
    const t = Math.min(1, arrow.age / PITCH.flightMs);
    const pos = this.#arcAt(arrow, t, this._a);
    arrow.mesh.position.copy(pos);
    if (t >= 1) {
      arrow.flying = false;
      arrow.mesh.quaternion.setFromUnitVectors(UP, arrow.tilt);
      return;
    }
    this.#arcAt(arrow, Math.min(1, t + 0.02), this._b);
    this._dir.subVectors(this._b, pos);
    if (this._dir.lengthSq() > 1e-8) arrow.mesh.quaternion.setFromUnitVectors(UP, this._dir.normalize());
  }

  #arcAt(arrow, t, out) {
    out.lerpVectors(arrow.from, arrow.to, t);
    out.y += Math.sin(t * Math.PI) * 1.1;
    return out;
  }
}
