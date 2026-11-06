// Điểm vào client: dựng cảnh, màn chào, nối mạng, vòng lặp khung hình.
import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { BELL, SPAWN } from '../../shared/layout.js';
import { EMOJIS } from '../../shared/protocol.js';
import { Activities } from './activities/index.js';
import { AudioEngine } from './audio/audio.js';
import { Remotes } from './net/remotes.js';
import { Net } from './net/socket.js';
import { FollowCamera } from './player/camera.js';
import { Input } from './player/controls.js';
import { LocalPlayer } from './player/local.js';
import { World, createRenderer } from './scene/world.js';
import { openShare } from './share/share.js';
import { openBoard, openBook } from './ui/book.js';
import { Chat } from './ui/chat.js';
import { $, h, store } from './ui/dom.js';
import { Hud } from './ui/hud.js';
import { closeTopModal, modalOpen, openModal } from './ui/modal.js';
import { RingOverlay } from './ui/ringOverlay.js';
import { showTutorial } from './ui/tutorial.js';
import { Welcome } from './ui/welcome.js';
import { WishReader } from './ui/wishReader.js';

const isTouch = matchMedia('(pointer:coarse)').matches;
document.body.classList.toggle('touch', isTouch);

function fatalScreen(message) {
  $('welcome').hidden = false;
  $('welcome').replaceChildren(h('div', { class: 'welcome-card' }, h('h1', {}, 'Ôi, chưa vào được'), h('p', {}, message)));
}

function main() {
  const canvas = $('scene');
  let renderer;
  try {
    renderer = createRenderer(canvas, isTouch);
  } catch {
    fatalScreen('Trình duyệt này chưa bật được đồ hoạ 3D (WebGL). Thử Chrome hoặc Edge bản mới nhé.');
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.15, 2600);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.id = 'labels';
  $('app').append(labelRenderer.domElement);

  const world = new World(scene, isTouch);
  const profile = { name: '', color: Math.floor(Math.random() * 8), hat: Math.floor(Math.random() * 6), ...store.getJson('profile') };

  // Link gửi trong nhóm Zalo có sẵn mã: lấy ra rồi xoá khỏi thanh địa chỉ để khỏi lộ khi chụp màn hình.
  const linkCode = new URLSearchParams(location.search).get('code');
  if (linkCode) {
    store.set('joinCode', linkCode);
    history.replaceState(null, '', location.pathname);
  }
  profile.code = store.get('joinCode') ?? '';

  const app = {
    renderer,
    scene,
    camera,
    world,
    myName: profile.name,
    mats: new Array(12).fill(0),
    mineWishIds: new Set(),
    isTouch,
    frameMs: 0,
    audio: new AudioEngine(store),
    net: new Net(),
    input: new Input(canvas, $('stick')),
    follow: new FollowCamera(camera),
    remotes: new Remotes(scene),
    me: new LocalPlayer(scene, profile),
    ring: new RingOverlay(),
    modalBusy: () => modalOpen(),
    isBusy: () => modalOpen() || Boolean(app.activities.current),
    chatBlocked: () => app.activities.current === app.activities.meditation,
  };
  app.remotes._p = new THREE.Vector3();
  app.hud = new Hud(app);
  app.chat = new Chat(app);
  app.activities = new Activities(app);
  app.reader = new WishReader(app);
  window.__hth = app; // Tiện kiểm tra lỗi trong DevTools, không chứa dữ liệu bí mật.

  // Khung ngắm màn chào: dịch nhân vật khỏi hộp nhập tên.
  const frameIntro = () => {
    const portrait = window.innerHeight > window.innerWidth;
    app.follow.introOffset = portrait ? { x: 0, y: -3.1 } : { x: 1.25, y: 0 };
  };
  frameIntro();

  // ---------- Màn chào ----------
  const welcome = new Welcome({
    profile,
    onPreview: (p) => app.me.avatar.setLook(p.color, p.hat),
    onEnter: (p) => {
      app.audio.unlock();
      Object.assign(profile, p);
      store.setJson('profile', { name: p.name, color: p.color, hat: p.hat });
      store.set('joinCode', p.code ?? '');
      app.net.connect(() => ({
        playerId: store.get('playerId'),
        name: profile.name,
        color: profile.color,
        hat: profile.hat,
        code: profile.code,
      }));
    },
  });
  fetch('/api/info')
    .then((res) => res.json())
    .then((info) => welcome.setNeedCode(Boolean(info.codeRequired)))
    .catch(() => welcome.setNeedCode(true));

  // ---------- Mạng ----------
  const { net, hud, me, remotes } = app;
  let entered = false;
  let wasLost = false;
  let mySid = 0;

  net.onRefused = (message, res) => {
    if (!entered) welcome.showError(message, Boolean(res?.needCode));
  };

  net.onFatal = (message) => {
    app.activities.abort();
    const reload = h('button', { class: 'btn primary', type: 'button' }, 'Tải lại trang');
    reload.addEventListener('click', () => location.reload());
    openModal({ title: 'Tạm biệt một lát', content: [h('p', {}, message), h('div', { class: 'row-center' }, reload)] });
  };

  net.onLost = () => {
    wasLost = true;
    app.activities.abort();
    hud.toast('Mất kết nối, đang kết nối lại…', { ms: 4000 });
  };

  net.onEnter = (res) => {
    const snap = res.snapshot;
    mySid = res.sid;
    store.set('playerId', res.playerId);
    app.myName = res.name;
    me.avatar.setName(res.name);
    const nowMs = net.now();
    remotes.sync(snap.players, nowMs);
    world.dayCycleMs = snap.dayCycleMs;
    // Danh sách lời ước gửi đích danh cho mình đã có sẵn mine và liked.
    world.wishes.setAll(snap.wishes);
    app.activities.wish.left = snap.wishesLeftToday;
    app.mats = snap.mats;
    app.activities.bell.setWait(snap.bellWait);
    app.activities.bellEvent.apply(snap.bellEvent);
    hud.setPresence(snap.online, snap.visitsToday);

    if (wasLost) {
      wasLost = false;
      hud.toast('Đã kết nối lại.', { ms: 2000 });
    }
    if (!entered) {
      entered = true;
      welcome.hide();
      hud.show();
      app.follow.intro = false;
      me.avatar.nameEl.hidden = false;
      me.rot = SPAWN.rot;
      me.locked = false;
      app.input.enabled = true;
      app.follow.yaw = 0;
      app.follow.look.copy(app.follow.target);
      if (snap.welcome) hud.toast(snap.welcome, { ms: 6500 });
      showTutorial(store, isTouch);
    }
  };

  net.on('state', ({ t, p }) => {
    for (const row of p) {
      if (row[0] !== mySid) remotes.applyRow(row, t);
    }
  });

  net.on('player:join', (p) => {
    remotes.add(p, net.now());
    hud.toast(`${p.name} vừa lên tu viện`);
    app.audio.chime(0.07);
  });
  net.on('player:leave', ({ sid, name }) => {
    remotes.remove(sid);
    hud.toast(`${name} vừa rời tu viện`);
  });
  net.on('presence', ({ online, visitsToday }) => hud.setPresence(online, visitsToday));

  const avatarOf = (sid) => (sid === mySid ? me.avatar : remotes.map.get(sid)?.avatar);

  net.on('chat', ({ sid, text }) => avatarOf(sid)?.say(text));
  net.on('emoji', ({ sid, i }) => avatarOf(sid)?.say(EMOJIS[i] ?? '', 2500));
  net.on('wave', ({ from, to, name }) => {
    avatarOf(from)?.wave();
    if (to === mySid) {
      hud.toast(`${name} vẫy tay với bạn`);
      app.audio.pop();
    }
  });

  net.on('bell:ring', ({ sid, quality }) => {
    // Xa gác chuông thì nghe nhỏ dần nhưng vẫn nghe được khắp sân.
    const d = Math.hypot(me.x - BELL.x, me.z - BELL.z);
    const volume = Math.max(0.28, 1 - d / 60);
    if (sid === mySid) app.follow.shake(0.012 + quality * 0.02);
    app.audio.bell({ quality, volume });
    world.ringBell(quality);
  });
  net.on('bell:event', (payload) => app.activities.bellEvent.apply(payload));

  net.on('meditation:mats', (mats) => {
    app.mats = mats;
  });
  net.on('meditation:sync', (data) => app.activities.meditation.onSync(data));

  net.on('wish:new', (wish) => {
    const mine = app.mineWishIds.has(wish.id);
    world.wishes.add({ ...wish, mine, liked: false }, true);
  });
  net.on('wish:update', ({ id, likes }) => {
    world.wishes.patch(id, { likes });
    app.reader.onUpdate(id);
  });
  net.on('wish:removed', ({ id }) => {
    world.wishes.remove(id);
    app.reader.onRemoved(id);
  });

  // ---------- Nút và phím ----------
  $('bookBtn').addEventListener('click', () => openBook(app));
  $('boardBtn').addEventListener('click', () => openBoard(app));
  $('shareBtn').addEventListener('click', () => openShare(app));

  app.input.onKeyDown = (e) => {
    if (!entered) return false;
    if (e.repeat && ['Space', 'KeyE', 'Enter'].includes(e.code)) return true;
    if (e.code === 'Escape') {
      if (closeTopModal()) return true;
      if (app.activities.current) {
        app.activities.exit();
        return true;
      }
      return false;
    }
    if (app.activities.onKey(e.code, true)) return true;
    if (modalOpen() || app.activities.current) return false;
    if (e.code === 'KeyE' || e.code === 'Enter') {
      hud.runAction();
      return true;
    }
    if (e.code === 'KeyT') {
      app.chat.show();
      return true;
    }
    if (e.code === 'KeyF' && app.reader.current) {
      app.reader.like();
      return true;
    }
    return false;
  };
  app.input.onKeyUp = (e) => {
    if (entered) app.activities.onKey(e.code, false);
  };

  // Chạm/bấm vào cảnh: vẫy tay với đồng nghiệp, vuốt mèo, đọc lời ước.
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const heartAt = new THREE.Vector3();
  app.input.onTap = (x, y) => {
    if (!entered || app.isBusy()) return;
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const person = remotes.atRay(raycaster.ray);
    if (person) {
      net.call('wave', { to: person.sid });
      return;
    }
    if (world.abbot.atRay(raycaster.ray)) {
      world.abbot.advise();
      return;
    }
    const cat = world.animals.catAtRay(raycaster.ray);
    if (cat) {
      app.audio.meow();
      heartAt.copy(cat.root.position);
      floater(app, heartAt, '❤️');
      floater(app, heartAt, 'meo', 0.15);
      return;
    }
    raycaster.far = 16;
    const wish = world.wishes.pick(raycaster);
    raycaster.far = Infinity;
    if (wish) app.reader.pin(wish);
  };

  // ---------- Khung hình ----------
  const onResize = () => {
    const w = window.innerWidth;
    const h2 = window.innerHeight;
    camera.aspect = w / h2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h2, false);
    labelRenderer.setSize(w, h2);
    frameIntro();
  };
  window.addEventListener('resize', onResize);
  onResize();

  let lastFrame = performance.now();
  let audioTimer = 0;
  let fpsWindow = 0;
  let fpsFrames = 0;
  let lowFpsStreak = 0;
  let quality = 2;

  const QUALITY_GRACE_S = 10; // Bỏ qua lúc mới tải: biên dịch shader gây khựng, không phải máy yếu.
  let qualityClock = 0;
  let stallStreak = 0;

  const adaptQuality = (dt) => {
    qualityClock += dt;
    if (qualityClock < QUALITY_GRACE_S) return;
    // Cửa sổ không được focus thì trình duyệt tự giảm nhịp vẽ: số đo lúc đó không nói gì về máy.
    if (document.hidden || !document.hasFocus()) {
      fpsWindow = 0;
      fpsFrames = 0;
      stallStreak = 0;
      return;
    }
    // Khựng lẻ tẻ (biên dịch shader, máy bận chốc lát) thì đo lại; khựng liên tục mới là máy yếu.
    if (dt > 0.4) {
      stallStreak++;
      if (stallStreak < 6) {
        fpsWindow = 0;
        fpsFrames = 0;
        return;
      }
    } else {
      stallStreak = 0;
    }
    fpsWindow += dt;
    fpsFrames++;
    if (fpsWindow < 2.5) return;
    const fps = fpsFrames / fpsWindow;
    fpsWindow = 0;
    fpsFrames = 0;
    lowFpsStreak = fps < 26 ? lowFpsStreak + 1 : 0;
    if (lowFpsStreak >= 3 && quality > 0) {
      lowFpsStreak = 0;
      quality--;
      if (quality === 1) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
      } else {
        // Máy yếu: tắt bóng đổ để giữ độ mượt.
        renderer.shadowMap.enabled = false;
        scene.traverse((o) => {
          if (o.material) {
            const list = Array.isArray(o.material) ? o.material : [o.material];
            list.forEach((m) => {
              m.needsUpdate = true;
            });
          }
        });
      }
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
  };

  const frame = () => {
    requestAnimationFrame(frame);
    const t = performance.now();
    const rawDt = (t - lastFrame) / 1000;
    lastFrame = t;
    const dt = Math.min(0.05, rawDt);
    const nowMs = net.now();

    const look = app.input.consumeLook();
    // Đang mở hộp thoại hoặc đang làm hoạt động thì nhân vật đứng yên.
    me.locked = !entered || app.isBusy();
    me.update(dt, app.input, app.follow.yaw, net);
    remotes.update(dt, nowMs, camera);
    app.activities.update(dt);
    app.reader.update(dt);
    world.update(dt, nowMs);
    world.abbot.update(dt, me.x, me.z, camera);
    app.follow.update(dt, me.x, me.y, me.z, look);
    world.sky.follow(camera);

    audioTimer += dt;
    if (audioTimer > 0.4) {
      audioTimer = 0;
      app.audio.updatePosition(me.x, me.z, world.sky.night);
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    adaptQuality(rawDt);
    // Thời gian CPU của một khung, xem trong DevTools bằng __hth.frameMs.
    app.frameMs += (performance.now() - t - app.frameMs) * 0.1;
  };
  frame();
}

/** Chữ/tim nhỏ bay lên tại một điểm trong cảnh, tự biến mất. */
function floater(app, position, text, delay = 0) {
  const vec = position.clone().setY(position.y + 0.8);
  vec.project(app.camera);
  const el = h('div', { class: 'floater' }, text);
  el.style.left = `${(vec.x * 0.5 + 0.5) * window.innerWidth}px`;
  el.style.top = `${(-vec.y * 0.5 + 0.5) * window.innerHeight}px`;
  el.style.animationDelay = `${delay}s`;
  $('hud').append(el);
  setTimeout(() => el.remove(), 1600 + delay * 1000);
}

main();
