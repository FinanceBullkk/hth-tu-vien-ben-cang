// Hiệu ứng của một máy gạt cần: dãy bóng đèn chạy vòng quanh bảng hiệu (một InstancedMesh, đổi màu từng bóng theo nhịp)
// và xu vàng bắn ra rơi vào khay khi trúng (InstancedMesh, tối đa COIN_COUNT đồng). Chỉ diễn, không biết luật.
import * as THREE from 'three';

const BULB_COUNT = 18;
const COIN_COUNT = 12;
const CELEBRATE_S = 2.6;
const BULB_ON = new THREE.Color(0xffe7a3);
const BULB_HOT = new THREE.Color(0xfff6d6);
const BULB_OFF = new THREE.Color(0x6b4a1e);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

let bulbMaterial = null;

export class SlotMachineFx {
  /**
   * @param {THREE.Group} group nhóm máy (toạ độ cục bộ, mặt máy hướng +z)
   * @param {{ crown: {y:number, h:number, front:number, w:number}, tray: {y:number, z0:number, z1:number, halfW:number},
   *   chute: {y:number, z:number}, coinMaterial: THREE.Material }} layout
   */
  constructor(group, layout) {
    this.layout = layout;
    this.time = Math.random() * 10;
    this.celebrateT = 0;
    this.coins = []; // { p, v, spin, delay, life }
    this.#buildBulbs(group);
    const coin = new THREE.CylinderGeometry(0.022, 0.022, 0.007, 14);
    this.coinMesh = new THREE.InstancedMesh(coin, layout.coinMaterial, COIN_COUNT);
    this.coinMesh.count = 0;
    this.coinMesh.frustumCulled = false;
    group.add(this.coinMesh);
  }

  #buildBulbs(group) {
    bulbMaterial ??= new THREE.MeshBasicMaterial({ color: 0xffffff });
    const { crown } = this.layout;
    this.bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.016, 8, 6), bulbMaterial, BULB_COUNT);
    const hw = crown.w / 2 + 0.01;
    const hh = crown.h / 2 + 0.005;
    const perimeter = 4 * hw + 4 * hh;
    const legs = [[2 * hw, 1, 0], [2 * hh, 0, 1], [2 * hw, -1, 0], [2 * hh, 0, -1]];
    for (let i = 0; i < BULB_COUNT; i++) {
      // Rải đều theo chu vi hình chữ nhật, bắt đầu từ góc trái dưới, đi ngược chiều kim đồng hồ.
      let d = (i / BULB_COUNT) * perimeter;
      let x = -hw;
      let y = -hh;
      for (const [len, dx, dy] of legs) {
        const step = Math.min(d, len);
        x += dx * step;
        y += dy * step;
        d -= step;
        if (d <= 0) break;
      }
      _v.set(x, crown.y + y, crown.front + 0.012);
      this.bulbs.setMatrixAt(i, _m.compose(_v, _q.identity(), _s));
      this.bulbs.setColorAt(i, BULB_OFF);
    }
    group.add(this.bulbs);
  }

  /** Trúng: đèn nháy dồn và xu bắn ra khay; mult càng lớn càng nhiều xu. */
  celebrate(mult) {
    const { chute } = this.layout;
    this.celebrateT = CELEBRATE_S;
    const n = Math.min(COIN_COUNT, 2 + Math.round(mult / 8));
    this.coins = Array.from({ length: n }, (_, i) => ({
      p: new THREE.Vector3((Math.random() - 0.5) * 0.12, chute.y, chute.z),
      v: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.5 + Math.random() * 0.6, 0.35 + Math.random() * 0.3),
      spin: Math.random() * 6,
      delay: i * 0.07,
      life: 2.4,
    }));
  }

  /** Thôi ăn mừng (bắt đầu lượt quay mới). */
  calm() {
    this.celebrateT = 0;
  }

  /** spinning: cuộn đang quay thì đèn chạy nhanh hơn. */
  update(dt, spinning) {
    this.time += dt;
    this.#updateBulbs(dt, spinning);
    if (this.coins.length) this.#updateCoins(dt);
  }

  #updateBulbs(dt, spinning) {
    this.celebrateT = Math.max(0, this.celebrateT - dt);
    const party = this.celebrateT > 0;
    const step = Math.floor(this.time * (spinning ? 18 : party ? 10 : 6));
    for (let i = 0; i < BULB_COUNT; i++) {
      // Thường: đèn chạy vòng. Đang quay: chạy nhanh. Trúng: cả dãy nháy so le.
      const on = party ? (i + step) % 2 === 0 : (i + step) % 4 < 2;
      this.bulbs.setColorAt(i, on ? (party ? BULB_HOT : BULB_ON) : BULB_OFF);
    }
    this.bulbs.instanceColor.needsUpdate = true;
  }

  #updateCoins(dt) {
    const { tray } = this.layout;
    let n = 0;
    for (const c of this.coins) {
      if (c.delay > 0) {
        c.delay -= dt;
        continue;
      }
      c.life -= dt;
      if (c.life <= 0) continue;
      c.v.y -= 5.5 * dt;
      c.p.addScaledVector(c.v, dt);
      // Rơi vào lòng khay thì nằm lại; trượt ra ngoài thì rơi xuống sàn.
      const inTray = Math.abs(c.p.x) < tray.halfW && c.p.z > tray.z0 && c.p.z < tray.z1;
      const floorY = inTray ? tray.y : 0.02;
      if (c.p.y < floorY) {
        c.p.y = floorY;
        c.v.set(0, 0, 0);
      }
      c.p.z = Math.min(c.p.z, tray.z1 - 0.02);
      if (c.v.lengthSq() > 0) c.spin += dt * 9;
      _q.setFromEuler(_e.set(c.spin, 0, c.spin * 0.6));
      this.coinMesh.setMatrixAt(n++, _m.compose(c.p, _q, _s));
    }
    this.coinMesh.count = n;
    if (n) this.coinMesh.instanceMatrix.needsUpdate = true;
    else if (this.coins.every((c) => c.life <= 0)) this.coins = [];
  }
}
