import * as THREE from 'three';
import { Avatar } from '../../client/src/player/avatar.js';
import { ACTIVITY } from '../../shared/protocol.js';

const canvas = document.querySelector('canvas'), stage = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setScissorTest(true);
const scenes = [], avatars = [], cameras = [];
const groundGeo = new THREE.CircleGeometry(2.1, 64);
const groundMat = new THREE.MeshStandardMaterial({ color: 0xd6ceb8, roughness: 1 });
const $ = id => document.getElementById(id);
const nativeMatch = globalThis.matchMedia.bind(globalThis);
// Explicit preview control, never silently bypass the OS motion preference.
globalThis.matchMedia = q => q.includes('prefers-reduced-motion')
  ? { get matches() { return !$('motion').checked && nativeMatch(q).matches; } } : nativeMatch(q);
let orbit = false, elapsed = 0, breakthrough = null;
function populate() {
  breakthrough = null;
  avatars.forEach((a, i) => a.dispose(scenes[i]));
  avatars.length = 0; scenes.length = 0; cameras.length = 0;
  for (let tier = 0; tier < 4; tier++) {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffefd0, 0x5c7564, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(2, 4, 3); scene.add(sun);
    const floor = new THREE.Mesh(groundGeo, groundMat); floor.rotation.x = -Math.PI / 2; floor.position.y = -.02; scene.add(floor);
    const avatar = new Avatar({ name: '', color: 1, hair: 0, hat: 6, attire: 1, weapon: 0, effect: 1, lowQuality: $('low').checked });
    avatar.time = 0;
    avatar.setCultivation(tier); avatar.setActivity($('sit').checked ? ACTIVITY.meditate : 0);
    avatar.sitAmt = $('sit').checked ? 1 : 0;
    scene.add(avatar.root); avatars.push(avatar); scenes.push(scene);
    cameras.push(new THREE.PerspectiveCamera(42, 1, .1, 30));
  }
}
$('orbit').onclick = () => { orbit = !orbit; $('orbit').setAttribute('aria-pressed', String(orbit)); };
$('low').onchange = populate;
$('sit').onchange = () => avatars.forEach(a => a.setActivity($('sit').checked ? ACTIVITY.meditate : 0));
function startBreakthrough(tier) {
  const a = avatars[tier]; a.setCultivation(tier - 1); a.setCultivation(tier, true);
  breakthrough = { tier, start: a.time }; $('pause').checked = false;
}
document.querySelectorAll('[data-tier]').forEach(b => b.onclick = () => startBreakthrough(Number(b.dataset.tier)));
$('timeline').oninput = () => {
  if (!breakthrough) startBreakthrough(2);
  avatars[breakthrough.tier].time = breakthrough.start + Number($('timeline').value);
  $('pause').checked = true;
};
populate();
let last = performance.now();
function render(now) {
  requestAnimationFrame(render);
  const dt = $('pause').checked ? 0 : Math.min(.05, (now - last) / 1000); last = now; elapsed += dt;
  const width = stage.clientWidth, height = stage.clientHeight, columns = innerWidth <= 700 ? 2 : 4;
  if (canvas.clientWidth !== width || canvas.width !== Math.round(width * renderer.getPixelRatio()) || canvas.height !== Math.round(height * renderer.getPixelRatio())) renderer.setSize(width, height, false);
  const w = width / columns, h = height / (4 / columns), angle = orbit ? elapsed * .25 : 0;
  renderer.setClearColor($('night').checked ? 0x172a28 : 0xeee9db);
  avatars.forEach((a, i) => {
    const cam = cameras[i]; cam.aspect = w / h; cam.updateProjectionMatrix();
    const distance = columns === 2 ? 8.8 : 7.5;
    cam.position.set(Math.sin(angle) * distance, 3.2, Math.cos(angle) * distance); cam.lookAt(0, 1.05, 0);
    a.update(dt, false, distance);
    renderer.setViewport(i % columns * w, height - (Math.floor(i / columns) + 1) * h, w, h);
    renderer.setScissor(i % columns * w, height - (Math.floor(i / columns) + 1) * h, w, h);
    renderer.render(scenes[i], cam);
  });
  if (breakthrough) {
    const age = avatars[breakthrough.tier].time - breakthrough.start;
    if (!$('pause').checked) $('timeline').value = String(Math.min(8, age));
    const label = age < 2 ? 'Tích tụ' : age < 4 ? 'Ngưng tụ' : age < 5 ? 'Đột phá' : age < 8 ? 'Ổn định' : 'Hoàn tất';
    if ($('phase').textContent !== label) $('phase').textContent = label;
  }
}
requestAnimationFrame(render);
window.__realmPreview = { avatars: () => avatars, renderer, scenes, cameras, startBreakthrough };
