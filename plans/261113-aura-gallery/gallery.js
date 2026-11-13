// Trang xem thử: 12 hào quang (effect 1-12) cạnh nhau trên nền sàn đá, để so sánh.
// Chạy: node node_modules/vite/bin/vite.js --config plans/261113-aura-gallery/vite.config.mjs
// rồi mở http://127.0.0.1:5189/plans/261113-aura-gallery/index.html
import * as THREE from 'three';
import { Avatar } from '../../client/src/player/avatar.js';
import { ACTIVITY, EFFECT_NAMES } from '../../shared/protocol.js';
import { store } from '../../client/src/ui/dom.js';

// Xem chuyển động đầy đủ kể cả khi hệ điều hành bật giảm chuyển động (giống nút trong game).
store.set('fullFx', '1');

const $ = id => document.getElementById(id);
const canvas = document.querySelector('canvas'), stage = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setScissorTest(true);
const groundGeo = new THREE.CircleGeometry(3, 64);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x8f877a, roughness: 1 });
const effects = Array.from({ length: 12 }, (_, i) => i + 1);
const entries = effects.map(effect => {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff3dd, 0x5c6a5a, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(2, 4, 3); scene.add(sun);
  const floor = new THREE.Mesh(groundGeo, groundMat); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const avatar = new Avatar({ name: EFFECT_NAMES[effect], color: 1, hair: 0, hat: 7, attire: 1, weapon: 0, effect });
  avatar.nameEl?.remove?.(); avatar.tagEl?.remove?.(); avatar.titleEl?.remove?.();
  scene.add(avatar.root);
  const card = document.createElement('div'); card.className = 'card'; card.textContent = `${effect} · ${EFFECT_NAMES[effect]}`;
  $('cards').append(card);
  const opt = document.createElement('option'); opt.value = effect; opt.textContent = EFFECT_NAMES[effect]; $('solo').append(opt);
  return { effect, scene, avatar, card, camera: new THREE.PerspectiveCamera(40, 1, .1, 40) };
});
const applySit = () => entries.forEach(e => { e.avatar.setActivity($('sit').checked ? ACTIVITY.meditate : 0); });
$('sit').onchange = applySit;
const applyQi = () => entries.forEach(e => e.avatar.setQi(Number($('qi').value)));
$('qi').onchange = applyQi; applyQi();
$('solo').onchange = () => {
  const solo = Number($('solo').value);
  entries.forEach(e => { e.card.style.display = !solo || e.effect === solo ? '' : 'none'; });
  $('cards').style.gridTemplateColumns = solo ? '1fr' : ''; $('cards').style.gridTemplateRows = solo ? '1fr' : '';
};
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = $('pause').checked ? 0 : Math.min(.05, (now - last) / 1000); last = now;
  const width = stage.clientWidth, height = stage.clientHeight, pr = renderer.getPixelRatio();
  if (canvas.width !== Math.round(width * pr) || canvas.height !== Math.round(height * pr)) renderer.setSize(width, height, false);
  const solo = Number($('solo').value), shown = solo ? entries.filter(e => e.effect === solo) : entries;
  const cols = solo ? 1 : 4, rows = solo ? 1 : 3, w = width / cols, h = height / rows;
  const angle = Number($('angle').value), dist = Number($('dist').value);
  renderer.setScissor(0, 0, width, height); renderer.setClearColor(0x2b2a26); renderer.clear();
  entries.forEach(e => { if (!shown.includes(e)) e.avatar.update(dt, false, dist); });
  shown.forEach((e, i) => {
    const cam = e.camera; cam.aspect = w / h; cam.updateProjectionMatrix();
    cam.position.set(Math.sin(angle) * dist, 2.6, Math.cos(angle) * dist); cam.lookAt(0, 1.2, 0);
    e.avatar.update(dt, false, dist);
    const x = i % cols * w, y = height - (Math.floor(i / cols) + 1) * h;
    renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h);
    renderer.render(e.scene, cam);
  });
}
requestAnimationFrame(frame);
window.__gallery = { entries };
