// Ba cuộn của một máy gạt cần: mỗi cuộn là ống trụ nằm ngang quấn dải 10 ô hình, quay quanh trục x cục bộ.
// Quay: ba cuộn cùng vọt đi rồi dừng lần lượt trái -> phải, nảy nhẹ một nhịp; quay nhanh thì đổi sang dải nhoè.
// Kết quả do server bốc; cuộn chỉ chọn một ô trên dải có đúng hình đó để dừng (dải chỉ để nhìn, không ảnh hưởng tỉ lệ).
import * as THREE from 'three';
import { reelStripTextures } from './slot-machine-textures.js';

// Mỗi dải có đủ sáu hình; hình thường lặp nhiều hơn cho giống máy thật. Ba dải lệch thứ tự để hàng trên/dưới khác nhau.
const REEL_STRIPS = [
  [0, 1, 3, 2, 0, 5, 1, 4, 2, 0],
  [1, 0, 2, 4, 0, 1, 3, 0, 5, 2],
  [0, 2, 1, 3, 0, 4, 1, 5, 2, 0],
];
export const REEL = { radius: 0.17, width: 0.15, gap: 0.02 };
// Mỗi ô trên cuộn cao một cung 2πR/N, rộng bằng bề ngang cuộn: vẽ canvas đúng tỉ lệ đó thì hình không méo.
const CELL_ASPECT = (2 * Math.PI * REEL.radius) / REEL_STRIPS[0].length / REEL.width;
const FIRST_STOP_S = 0.95; // Cuộn trái dừng sau chừng này; mỗi cuộn sau trễ thêm STAGGER_S.
const STAGGER_S = 0.4;
const BOUNCE_S = 0.2;
const BLUR_SPEED = 14; // rad/s: nhanh hơn thì vẽ dải nhoè.
const TAU = Math.PI * 2;

/** Thời điểm (giây, tính từ lúc bắt đầu quay) cuộn cuối dừng hẳn: activity chờ chừng này rồi mới báo kết quả. */
export const REELS_DONE_S = FIRST_STOP_S + STAGGER_S * 2 + BOUNCE_S;

// Dải hình dùng chung cho mọi máy: mỗi cuộn một cặp texture nét/nhoè.
let sharedTextures = null;
const textures = () => (sharedTextures ??= REEL_STRIPS.map((strip) => reelStripTextures(strip, CELL_ASPECT)));

/** Góc quay (rotation.x) để ô k nằm giữa đường thưởng. */
const stopAngle = (k, n) => (TAU * (k + 0.5)) / n;

export class SlotReels {
  /** parent: nhóm thân máy; y, z: tâm trục cuộn trong toạ độ cục bộ của máy (mặt máy hướng +z). */
  constructor(parent, y, z) {
    const geometry = new THREE.CylinderGeometry(REEL.radius, REEL.radius, REEL.width, 36, 1, true);
    geometry.rotateZ(Math.PI / 2); // Trục cuộn nằm ngang theo x.
    const pitch = REEL.width + REEL.gap;
    this.reels = REEL_STRIPS.map((strip, i) => {
      const tex = textures()[i];
      // Không chịu sáng: cuộn máy thật có đèn nền, dưới mái hành lang vẫn rõ như ban ngày.
      const material = new THREE.MeshBasicMaterial({ map: tex.sharp, color: 0xf4efe6 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set((i - 1) * pitch, y, z);
      // Lúc dựng máy: mỗi cuộn dừng ở một ô ngẫu nhiên cho máy trông như đã có người chơi.
      const k = Math.floor(Math.random() * strip.length);
      mesh.rotation.x = stopAngle(k, strip.length);
      parent.add(mesh);
      return { mesh, material, tex, strip, from: 0, to: mesh.rotation.x, stopAt: 0, stopped: true };
    });
    this.t = 0;
    this.spinning = false;
    /** Gán từ ngoài: gọi mỗi lần một cuộn dừng (i là số thứ tự cuộn). */
    this.onStop = null;
  }

  /** Ô trên dải cuộn i có hình symbol; có nhiều ô thì chọn ngẫu nhiên cho đỡ lặp. */
  #pickStop(i, symbol) {
    const { strip } = this.reels[i];
    const spots = strip.flatMap((id, k) => (id === symbol ? [k] : []));
    return spots[Math.floor(Math.random() * spots.length)] ?? 0;
  }

  /** Bắt đầu quay về đúng ba hình symbols (id). */
  spin(symbols) {
    this.t = 0;
    this.spinning = true;
    this.reels.forEach((r, i) => {
      const n = r.strip.length;
      const target = stopAngle(this.#pickStop(i, symbols[i]), n);
      const from = r.mesh.rotation.x;
      const rest = (((target - from) % TAU) + TAU) % TAU; // Quãng còn lại để tới ô đích, luôn quay xuôi.
      r.from = from;
      r.to = from + TAU * (3 + i) + rest; // Cuộn sau quay thêm vòng để tốc độ đầu ba cuộn gần bằng nhau.
      r.stopAt = FIRST_STOP_S + STAGGER_S * i;
      r.stopped = false;
    });
  }

  /** Đặt thẳng ba hình, không quay (máy người khác khi mình vừa tới gần, hoặc huỷ giữa chừng). */
  snap(symbols) {
    this.spinning = false;
    this.reels.forEach((r, i) => {
      const angle = stopAngle(this.#pickStop(i, symbols[i]), r.strip.length);
      r.to = angle;
      r.stopped = true;
      r.mesh.rotation.x = angle;
      r.material.map = r.tex.sharp;
    });
  }

  update(dt) {
    if (!this.spinning) return;
    this.t += dt;
    let done = true;
    this.reels.forEach((r, i) => {
      const { t } = this;
      const T = r.stopAt;
      let speed = 0;
      if (t < T) {
        const u = t / T;
        // Ease-out bậc ba: vọt nhanh rồi chậm dần đúng vào ô đích.
        r.mesh.rotation.x = r.from + (r.to - r.from) * (1 - (1 - u) ** 3);
        speed = (3 * (r.to - r.from) * (1 - u) ** 2) / T;
        done = false;
      } else {
        if (!r.stopped) {
          r.stopped = true;
          this.onStop?.(i);
        }
        const u = Math.min(1, (t - T) / BOUNCE_S);
        // Nảy nhẹ: lố qua ô đích một chút rồi lùi về, như cuộn bị chốt hãm lại.
        r.mesh.rotation.x = r.to + 0.07 * Math.sin(Math.PI * u) * (1 - u);
        if (u < 1) done = false;
      }
      const map = speed > BLUR_SPEED ? r.tex.blur : r.tex.sharp;
      if (r.material.map !== map) r.material.map = map;
    });
    if (done) {
      this.spinning = false;
      for (const r of this.reels) r.mesh.rotation.x = r.to % TAU;
    }
  }
}
