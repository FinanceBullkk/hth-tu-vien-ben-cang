// Một máy gạt cần kiểu sòng Tết: tủ sơn son thếp vàng, bảng hiệu "GẠT CẦN" viền bóng đèn chạy vòng, ô cửa ba cuộn,
// kính bảng thưởng, khay hứng xu và cần gạt quả cầu đỏ bên phải. Mặt máy hướng +z cục bộ; nhóm xoay theo spec.rot.
// Phần tĩnh gộp thành một mesh (Batch) cho ít draw call; đèn chạy và xu ở slot-machine-lights-and-coins.js.
// Máy chỉ diễn: kết quả, tiền và lượt quay do server quyết, activity/bàn máy gọi spin() / pull() / celebrate().
import * as THREE from 'three';
import { floorHeight } from '../../../shared/layout.js';
import { Batch, flatMaterial } from './builders.js';
import { SlotMachineFx } from './slot-machine-lights-and-coins.js';
import { SlotReels, REEL } from './slot-machine-reels.js';
import { marqueeTexture, paytableTexture, reelShadeTexture } from './slot-machine-textures.js';

const W = 0.74; // Bề ngang thân máy.
const D = 0.56; // Bề sâu thân dưới.
const BODY_TOP = 0.88; // Thân dưới cao tới đây; trên là thân cuộn.
const UPPER_TOP = 1.64;
const WIN = { y: 1.3, w: 0.53, h: 0.27, front: 0.2 }; // Ô cửa cuộn: tâm, rộng, cao, mặt trước.
const REEL_Z = 0; // Trục cuộn: mặt trước cuộn lọt sau mặt khung chừng 3 cm.
const CROWN = { y: 1.79, h: 0.3, front: 0.07 };
// Cần gạt nhô ra ngoài và lên trước, để đứng chính diện máy vẫn thấy trọn cần (không khuất sau ốp hông).
const LEVER = { x: W / 2 + 0.11, y: 1.12, z: 0.12 };
const PULL_DOWN_S = 0.16;
const PULL_HOLD_S = 0.12;
const PULL_MAX = 1.55; // Cần kéo xuống gần ngang (rad).

const COLORS = { lacquer: '#8a1c13', dark: '#4a0d08', gold: '#d9a63a', black: '#140807', jade: '#2f8f62' };

// Vật liệu dùng chung cho cả dãy máy.
let shared = null;
function materials() {
  if (shared) return shared;
  shared = {
    body: flatMaterial({ side: THREE.FrontSide }),
    chrome: new THREE.MeshPhongMaterial({ color: 0xd2d6dc, specular: 0xffffff, shininess: 70 }),
    knob: new THREE.MeshPhongMaterial({ color: 0xd8261c, specular: 0xffd0c0, shininess: 90 }),
    knobHot: new THREE.MeshPhongMaterial({ color: 0xff4a30, emissive: 0x6a1206, specular: 0xffffff, shininess: 90 }),
    gold: new THREE.MeshPhongMaterial({ color: 0xe0ad45, specular: 0xfff0b0, shininess: 60 }),
    marquee: new THREE.MeshBasicMaterial({ map: marqueeTexture() }),
    paytable: new THREE.MeshBasicMaterial({ map: paytableTexture(), color: 0xdedede }),
    shade: new THREE.MeshBasicMaterial({ map: reelShadeTexture(), transparent: true, depthWrite: false }),
    payline: new THREE.MeshBasicMaterial({ color: 0xff3b2f, transparent: true, opacity: 0.55 }),
    hit: new THREE.MeshBasicMaterial({ visible: false }), // Hộp bấm vô hình quanh máy và cần.
  };
  return shared;
}

export class SlotMachine {
  /** spec: { x, z, rot } từ SLOT_ZONE.machines. */
  constructor(scene, spec) {
    const mat = materials();
    this.group = new THREE.Group();
    this.group.position.set(spec.x, floorHeight(spec.x, spec.z), spec.z);
    this.group.rotation.y = spec.rot;
    scene.add(this.group);

    this.group.add(this.#buildBody(mat));
    this.#buildFaces(mat);
    this.reels = new SlotReels(this.group, WIN.y, REEL_Z);
    this.#buildLever(mat);
    this.fx = new SlotMachineFx(this.group, {
      crown: { ...CROWN, w: W + 0.06 },
      tray: { y: 0.245, z0: D / 2, z1: D / 2 + 0.15, halfW: 0.2 },
      chute: { y: 0.3, z: D / 2 + 0.03 },
      coinMaterial: mat.gold,
    });

    // Hộp bấm: cả thân máy lẫn cần gạt, để bấm chỗ nào trên máy cũng gạt được.
    this.hitBox = new THREE.Mesh(new THREE.BoxGeometry(W + 0.24, 2.0, D + 0.1), mat.hit);
    this.hitBox.position.set(0.06, 1.0, 0);
    this.group.add(this.hitBox);

    this.pullT = -1; // < 0: cần đang yên.
    this.hot = false;
  }

  #buildBody() {
    const b = new Batch(311);
    const { lacquer, dark, gold, black, jade } = COLORS;
    // Thân dưới, đế, viền vàng hai cạnh trước.
    b.box(W + 0.04, 0.06, D + 0.04, dark, 0, 0.03, 0);
    b.box(W, BODY_TOP - 0.06, D, lacquer, 0, 0.06 + (BODY_TOP - 0.06) / 2, 0);
    for (const sx of [-1, 1]) {
      b.box(0.03, BODY_TOP - 0.06, 0.03, gold, sx * (W / 2 - 0.01), 0.06 + (BODY_TOP - 0.06) / 2, D / 2 - 0.01);
      b.box(0.02, 1.1, 0.4, dark, sx * (W / 2 + 0.005), 0.75, -0.02); // Ốp hông sẫm.
    }
    // Khay hứng xu: miệng vàng, lòng khay đen.
    b.box(0.46, 0.12, 0.15, gold, 0, 0.17, D / 2 + 0.07);
    b.box(0.4, 0.05, 0.12, black, 0, 0.215, D / 2 + 0.08);
    b.box(0.2, 0.08, 0.02, black, 0, 0.3, D / 2 + 0.005); // Khe nhả xu.
    // Bệ phím nghiêng trước ô cửa, ba nút tròn và nút quay lớn.
    b.box(W, 0.05, 0.24, dark, 0, BODY_TOP + 0.02, D / 2 - 0.02, { rx: -0.32 });
    [[-0.22, '#c0392b'], [-0.12, '#e6b422'], [-0.02, '#2f8f62']].forEach(([x, c]) => {
      b.cyl(0.025, 0.025, 0.025, c, x, BODY_TOP + 0.055, D / 2 + 0.02, { rx: -0.32, seg: 12 });
    });
    b.cyl(0.042, 0.042, 0.03, gold, 0.2, BODY_TOP + 0.058, D / 2 + 0.02, { rx: -0.32, seg: 14 });
    // Thân trên: khối lưng và bốn miếng khung chừa lỗ ô cửa.
    const upperH = UPPER_TOP - BODY_TOP;
    b.box(W, upperH, 0.34, lacquer, 0, BODY_TOP + upperH / 2, -D / 2 + 0.17);
    const frameD = WIN.front - 0.06;
    const fz = 0.06 + frameD / 2;
    const top = WIN.y + WIN.h / 2;
    const bottom = WIN.y - WIN.h / 2;
    b.box(W, UPPER_TOP - top, frameD, lacquer, 0, (UPPER_TOP + top) / 2, fz);
    b.box(W, bottom - BODY_TOP, frameD, lacquer, 0, (bottom + BODY_TOP) / 2, fz);
    const side = (W - WIN.w) / 2;
    for (const sx of [-1, 1]) b.box(side, WIN.h, frameD, lacquer, sx * (WIN.w + side) / 2, WIN.y, fz);
    // Viền vàng ô cửa, vách ngăn giữa các cuộn, mũi tên đánh dấu đường thưởng.
    b.box(WIN.w + 0.05, 0.025, 0.012, gold, 0, top + 0.012, WIN.front + 0.004);
    b.box(WIN.w + 0.05, 0.025, 0.012, gold, 0, bottom - 0.012, WIN.front + 0.004);
    for (const sx of [-1, 1]) {
      b.box(0.025, WIN.h + 0.05, 0.012, gold, sx * (WIN.w / 2 + 0.012), WIN.y, WIN.front + 0.004);
      b.cyl(0, 0.02, 0.04, gold, sx * (WIN.w / 2 + 0.035), WIN.y, WIN.front + 0.01, { rz: sx * Math.PI / 2, seg: 4 });
      b.box(0.02, WIN.h, 0.1, black, sx * (REEL.width + REEL.gap) / 2, WIN.y, 0.1);
    }
    // Bảng hiệu nóc: khối đỏ, mái vàng, ngọc bích trên đỉnh.
    b.box(W + 0.06, CROWN.h, 0.22, lacquer, 0, CROWN.y, CROWN.front - 0.11);
    b.box(W + 0.16, 0.04, 0.3, gold, 0, CROWN.y + CROWN.h / 2 + 0.02, CROWN.front - 0.12);
    b.box(W + 0.02, 0.025, 0.26, gold, 0, UPPER_TOP + 0.005, CROWN.front - 0.13);
    b.add(new THREE.IcosahedronGeometry(0.055, 1), jade, { y: CROWN.y + CROWN.h / 2 + 0.09, z: CROWN.front - 0.12 });
    b.cyl(0.03, 0.05, 0.04, gold, 0, CROWN.y + CROWN.h / 2 + 0.05, CROWN.front - 0.12, { seg: 10 });
    // Bệ cần gạt bên phải.
    b.box(0.09, 0.2, 0.18, gold, W / 2 + 0.045, LEVER.y, LEVER.z);
    return b.build(materials().body);
  }

  #buildFaces(mat) {
    const plane = (w, h, m, x, y, z) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      p.position.set(x, y, z);
      this.group.add(p);
      return p;
    };
    plane(W + 0.03, CROWN.h - 0.04, mat.marquee, 0, CROWN.y, CROWN.front + 0.001);
    plane(W - 0.12, 0.42, mat.paytable, 0, 0.6, D / 2 + 0.002);
    plane(WIN.w, WIN.h, mat.shade, 0, WIN.y, REEL_Z + REEL.radius + 0.008).renderOrder = 2;
    plane(WIN.w, 0.005, mat.payline, 0, WIN.y, REEL_Z + REEL.radius + 0.01).renderOrder = 3;
  }

  #buildLever(mat) {
    this.leverPivot = new THREE.Group();
    this.leverPivot.position.set(LEVER.x, LEVER.y, LEVER.z);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 14), mat.gold);
    hub.rotation.z = Math.PI / 2;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.44, 8), mat.chrome);
    arm.position.y = 0.22;
    this.knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), mat.knob);
    this.knob.position.y = 0.46;
    for (const m of [hub, arm, this.knob]) m.castShadow = true;
    this.leverPivot.add(hub, arm, this.knob);
    this.group.add(this.leverPivot);
  }

  /** Cần gạt kéo xuống rồi bật về; gọi ngay lúc người chơi gạt, trước khi server trả kết quả. */
  pull() {
    this.pullT = 0;
  }

  /** Quay ba cuộn về đúng ba hình server đã bốc. */
  spin(symbols) {
    this.fx.calm();
    this.reels.spin(symbols);
  }

  /** Trúng: đèn nháy dồn và xu bắn ra khay. */
  celebrate(mult) {
    this.fx.celebrate(mult);
  }

  /** Rê chuột lên máy: quả cầu cần gạt sáng lên báo bấm được. */
  setHot(on) {
    if (this.hot === on) return;
    this.hot = on;
    this.knob.material = on ? materials().knobHot : materials().knob;
  }

  update(dt) {
    this.reels.update(dt);
    this.#updateLever(dt);
    this.fx.update(dt, this.reels.spinning);
  }

  #updateLever(dt) {
    if (this.pullT < 0) return;
    this.pullT += dt;
    const t = this.pullT;
    let a;
    if (t < PULL_DOWN_S) a = PULL_MAX * (t / PULL_DOWN_S) ** 2;
    else if (t < PULL_DOWN_S + PULL_HOLD_S) a = PULL_MAX;
    else {
      // Lò xo kéo cần về, rung nhẹ vài nhịp quanh vị trí đứng.
      const s = t - PULL_DOWN_S - PULL_HOLD_S;
      a = PULL_MAX * Math.exp(-7 * s) * Math.cos(11 * s);
      if (s > 0.9) {
        a = 0;
        this.pullT = -1;
      }
    }
    this.leverPivot.rotation.x = a;
  }
}
