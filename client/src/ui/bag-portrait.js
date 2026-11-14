// Nhân vật 3D ở giữa cột Nhân vật của túi đồ (kiểu game thùng đồ): mặc đúng bộ đang mặc, xoay chậm, kéo để xoay.
// Dùng một WebGLRenderer nhỏ riêng, tạo một lần ở lần mở túi đầu tiên rồi giữ lại cho cả phiên:
// mỗi lần mở lại chỉ gắn canvas vào bảng và chạy vòng vẽ, đóng túi thì dừng vẽ. Tạo lại renderer mỗi lần mở
// sẽ để lại listener trên vật liệu dùng chung, nên cố ý không huỷ.
import * as THREE from 'three';
import { Avatar } from '../player/avatar.js';
import { LOOK_SLOTS } from '../../../shared/shop.js';

const AUTO_SPIN = 0.35; // rad/giây khi không kéo
let shared = null; // { renderer, scene, camera, avatar, canvas } hoặc false nếu máy không tạo được WebGL

function create(look) {
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'bagx-portrait-canvas';
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff2dc, 0x5a3f7a, 1.9));
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(2.5, 4, 4);
    const rim = new THREE.DirectionalLight(0xc9a3ff, 1.1);
    rim.position.set(-3, 2, -3);
    scene.add(key, rim);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    camera.position.set(0, 1.0, 4.3);
    camera.lookAt(0, 0.88, 0);
    const avatar = new Avatar({ name: '', ...look });
    avatar.label.removeFromParent(); // nhãn tên HTML không cần trong ô xem
    scene.add(avatar.root);
    return { renderer, scene, camera, avatar, canvas, look: { ...look } };
  } catch (err) {
    console.warn('Không dựng được nhân vật xem trước:', err);
    return false;
  }
}

/**
 * Gắn nhân vật xem trước vào host. Trả về { setLook(look), stop() }.
 * me: avatar của mình trong cảnh, để chép mức khí và cảnh giới cho hào quang to đúng như ngoài đời.
 */
export function mountPortrait(host, look, me) {
  if (shared === null) shared = create(look);
  if (!shared) {
    host.replaceChildren(Object.assign(document.createElement('span'), { className: 'bagx-portrait-fallback', textContent: '人' }));
    return { setLook() {}, stop() {} };
  }
  const p = shared;
  host.replaceChildren(p.canvas);
  if (Number.isSafeInteger(me?.qi)) p.avatar.setQi(me.qi);
  if (me && p.avatar.cultivationTier !== me.cultivationTier) p.avatar.setCultivation(me.cultivationTier);

  const setLook = (next) => {
    if (LOOK_SLOTS.every((s) => p.look[s] === next[s])) return;
    p.look = { ...next };
    p.avatar.setLook(next.color, next.hat, next.hair, next.attire, next.weapon, next.effect);
  };
  setLook(look);

  let yaw = 0.35;
  let drag = null;
  let raf = 0;
  let last = performance.now();
  const size = { w: 0, h: 0 };

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Canvas chưa nằm trong trang (bảng đang vẽ lại) thì bỏ khung này.
    if (!p.canvas.isConnected) return;
    const w = p.canvas.clientWidth;
    const h = p.canvas.clientHeight;
    if (!w || !h) return;
    if (w !== size.w || h !== size.h) {
      size.w = w;
      size.h = h;
      p.renderer.setSize(w, h, false);
      p.camera.aspect = w / h;
      p.camera.updateProjectionMatrix();
    }
    if (!drag) yaw += dt * AUTO_SPIN;
    p.avatar.root.rotation.y = yaw;
    p.avatar.update(dt, false, 4);
    p.renderer.render(p.scene, p.camera);
  };
  raf = requestAnimationFrame(frame);

  const onDown = (e) => {
    drag = { x: e.clientX, yaw };
    p.canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (drag) yaw = drag.yaw + (e.clientX - drag.x) * 0.012;
  };
  const onUp = () => { drag = null; };
  p.canvas.addEventListener('pointerdown', onDown);
  p.canvas.addEventListener('pointermove', onMove);
  p.canvas.addEventListener('pointerup', onUp);
  p.canvas.addEventListener('pointercancel', onUp);

  return {
    setLook,
    stop() {
      cancelAnimationFrame(raf);
      p.canvas.removeEventListener('pointerdown', onDown);
      p.canvas.removeEventListener('pointermove', onMove);
      p.canvas.removeEventListener('pointerup', onUp);
      p.canvas.removeEventListener('pointercancel', onUp);
      p.canvas.remove();
    },
  };
}
