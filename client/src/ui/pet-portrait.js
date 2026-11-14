// Ô xem thú 3D trong bảng thú cưng: thú đang chọn đứng giữa, xoay chậm, kéo để xoay, có hiệu ứng thân thiết.
// Một WebGLRenderer nhỏ dùng cho cả phiên như ô nhân vật của túi đồ: mở lại bảng chỉ gắn canvas và chạy vòng vẽ.
import * as THREE from 'three';
import { PetFollower } from '../player/pet-follower.js';

const AUTO_SPIN = 0.5;
let shared = null; // { renderer, scene, camera, canvas } hoặc false nếu máy không tạo được WebGL

function create() {
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'pet-view-canvas';
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff2dc, 0x4a3a6a, 2));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(1.5, 3, 3);
    const rim = new THREE.DirectionalLight(0xc9a3ff, 1.2);
    rim.position.set(-2, 1.5, -2.5);
    scene.add(key, rim);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);
    camera.position.set(0, 0.66, 2.2);
    camera.lookAt(0, 0.3, 0);
    return { renderer, scene, camera, canvas };
  } catch (err) {
    console.warn('Không dựng được ô xem thú:', err);
    return false;
  }
}

/** Gắn ô xem vào host. Trả về { show(kind, tier, { silhouette }), stop() }. */
export function mountPetPortrait(host) {
  if (shared === null) shared = create();
  if (!shared) {
    host.replaceChildren(Object.assign(document.createElement('span'), { className: 'pet-view-fallback', textContent: '🐾' }));
    return { show() {}, stop() {} };
  }
  const p = shared;
  host.replaceChildren(p.canvas);
  let pet = null;
  let yaw = 0.5;
  let drag = null;
  let raf = 0;
  let last = performance.now();
  const size = { w: 0, h: 0 };

  const show = (kind, tier = 0) => {
    if (pet?.kind === kind) {
      pet.setTier(tier);
      return;
    }
    pet?.dispose();
    pet = kind >= 0 ? new PetFollower(p.scene, kind, tier) : null;
    pet?.cheer();
  };

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
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
    if (pet) {
      pet.idle(dt);
      pet.root.rotation.y = yaw;
    }
    p.renderer.render(p.scene, p.camera);
  };
  raf = requestAnimationFrame(frame);

  const onDown = (e) => {
    drag = { x: e.clientX, yaw };
    p.canvas.setPointerCapture?.(e.pointerId);
    pet?.cheer();
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
    show,
    stop() {
      cancelAnimationFrame(raf);
      pet?.dispose();
      pet = null;
      p.canvas.removeEventListener('pointerdown', onDown);
      p.canvas.removeEventListener('pointermove', onMove);
      p.canvas.removeEventListener('pointerup', onUp);
      p.canvas.removeEventListener('pointercancel', onUp);
      p.canvas.remove();
    },
  };
}
