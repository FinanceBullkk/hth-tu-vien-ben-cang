// Bánh xe cò quay châu Âu: lòng gỗ đứng yên, mâm 37 ô quay chậm liên tục, bi trắng.
// Diễn một lần quay: bi chạy ngược chiều mâm quanh vành, chậm dần, xoắn vào trong, nảy vài nhịp rồi nằm đúng ô
// server đã bốc và quay theo mâm. Công thức đảm bảo lúc chạm ô thì vị trí và vận tốc bi khớp mâm, không giật.
import * as THREE from 'three';
import { POCKETS, WHEEL_ORDER, pocketColor } from '../../../shared/coquay.js';
import { matte, mesh } from './casino-felt-table.js';

const R = { bowl: 0.36, rim: 0.3, pocket: 0.215, rotor: 0.26 };
const STEP = (Math.PI * 2) / POCKETS;
const ROTOR_SPEED = 0.9; // rad/s, mâm quay đều cả khi không ai chơi.
const LAND_S = 4.6; // Bi chạm ô sau chừng này giây kể từ lúc búng.
const COLORS = { red: '#b3241b', black: '#18181b', green: '#1f7a45' };
const easeOut = (t) => 1 - (1 - t) ** 2.4;

function rotorTexture() {
  const S = 512;
  const c = S / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const g = canvas.getContext('2d');
  g.fillStyle = '#6b3d1c';
  g.fillRect(0, 0, S, S);
  WHEEL_ORDER.forEach((n, i) => {
    const a = i * STEP;
    g.beginPath();
    g.moveTo(c + Math.cos(a - STEP / 2) * c * 0.62, c + Math.sin(a - STEP / 2) * c * 0.62);
    g.arc(c, c, c * 0.98, a - STEP / 2, a + STEP / 2);
    g.arc(c, c, c * 0.62, a + STEP / 2, a - STEP / 2, true);
    g.fillStyle = COLORS[pocketColor(n)];
    g.fill();
    g.strokeStyle = '#d8b25a';
    g.lineWidth = 2;
    g.stroke();
    g.save();
    g.translate(c + Math.cos(a) * c * 0.86, c + Math.sin(a) * c * 0.86);
    g.rotate(a + Math.PI / 2);
    g.fillStyle = '#fff6df';
    g.font = '700 20px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), 0, 0);
    g.restore();
  });
  g.beginPath();
  g.arc(c, c, c * 0.6, 0, Math.PI * 2);
  g.fillStyle = '#8a5a2b';
  g.fill();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

export class CoQuayWheel {
  /** @param {THREE.Group} parent nhóm bàn; (x, y) là tâm bánh xe trong toạ độ bàn. */
  constructor(parent, x, y) {
    this.group = new THREE.Group();
    this.group.position.set(x, y, 0);
    this.group.scale.setScalar(1.25); // Nhìn từ chỗ ngồi cho rõ ô số và bi.
    parent.add(this.group);
    const wood = matte(0x5a3218);
    const bowl = mesh(new THREE.CylinderGeometry(R.bowl, R.bowl + 0.02, 0.06, 40, 1, true), wood, 0, 0.03, 0);
    bowl.material = matte(0x5a3218, { side: THREE.DoubleSide });
    const rimTop = mesh(new THREE.TorusGeometry(R.bowl, 0.018, 6, 40), matte(0x3a2010), 0, 0.06, 0);
    rimTop.rotation.x = Math.PI / 2;
    const track = mesh(new THREE.RingGeometry(R.rotor, R.bowl, 40), matte(0x2a1a0e, { side: THREE.DoubleSide }), 0, 0.035, 0);
    track.rotation.x = -Math.PI / 2;
    this.group.add(bowl, rimTop, track);

    this.rotor = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R.rotor, 74), new THREE.MeshLambertMaterial({ map: rotorTexture() }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.03;
    disc.receiveShadow = true;
    const gold = matte(0xd4a640);
    const turret = mesh(new THREE.ConeGeometry(0.05, 0.08, 12), gold, 0, 0.07, 0);
    const bar = mesh(new THREE.BoxGeometry(0.16, 0.012, 0.012), gold, 0, 0.1, 0);
    this.rotor.add(disc, turret, bar);
    this.group.add(this.rotor);

    this.ball = mesh(new THREE.SphereGeometry(0.016, 12, 8), new THREE.MeshLambertMaterial({ color: 0xf8f6f0, emissive: 0x222222 }));
    this.group.add(this.ball);
    this.theta = 0; // Góc mâm.
    this.spin = null; // { start (ms server), result, delta }
    this.pocket = 0; // Số đang có bi nằm trong.
    this.held = false; // Bi đang nằm ở mép phía người búng, chờ búng.
    this.charge = 0;
    this.time = 0;
  }

  /** Góc (trong khung bánh xe) của ô chứa số n khi mâm đang ở góc theta. */
  #pocketAngle(n, theta) {
    return WHEEL_ORDER.indexOf(n) * STEP - theta;
  }

  #place(angle, radius, y) {
    this.ball.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  }

  /** Bi nằm yên trong ô n. */
  rest(n) {
    this.spin = null;
    this.held = false;
    this.pocket = n;
  }

  /** Bi nằm trên mép bánh xe phía người chơi, chờ búng. */
  hold() {
    this.spin = null;
    this.held = true;
  }

  /** Bắt đầu diễn một lần quay. startMs là giờ server lúc búng; vào muộn quá thì nằm yên luôn. */
  launch(result, power, startMs, nowMs) {
    this.pocket = result;
    this.held = false;
    if (nowMs - startMs > LAND_S * 1000) {
      this.spin = null;
      return;
    }
    this.spin = { start: startMs, result, delta: Math.PI * (6 + power * 5) };
  }

  update(dt, nowMs) {
    this.time += dt;
    this.theta += dt * ROTOR_SPEED;
    this.rotor.rotation.y = this.theta;
    if (this.held) {
      // Phía người chơi là -x của bàn: góc π trong khung bánh xe. Rung nhẹ theo lực lấy đà.
      const jiggle = Math.sin(this.time * 25) * 0.04 * this.charge;
      this.#place(Math.PI + jiggle, R.rim, 0.05 + this.charge * 0.02);
      return;
    }
    const s = this.spin;
    const t = s ? Math.min(1, (nowMs - s.start) / (LAND_S * 1000)) : 1;
    const target = this.#pocketAngle(this.pocket, this.theta);
    if (t >= 1) {
      this.spin = null;
      this.#place(target, R.pocket, 0.045);
      return;
    }
    // Bi chạy ngược chiều mâm, chậm dần và khớp đúng ô lúc t = 1.
    const angle = target - s.delta * (1 - easeOut(t));
    const k = Math.max(0, (t - 0.55) / 0.45);
    const radius = R.rim - (R.rim - R.pocket) * (1 - (1 - k) ** 2);
    const bounce = k > 0 ? Math.abs(Math.sin(k * Math.PI * 4)) * 0.018 * (1 - k) : 0;
    this.#place(angle, radius, 0.05 - k * 0.005 + bounce);
  }
}
