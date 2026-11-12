// Điểm vào client: dựng cảnh, màn chào, nối mạng, vòng lặp khung hình.
import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BELL, SPAWN } from '../../shared/layout.js';
import { AVATAR, EMOJIS } from '../../shared/protocol.js';
import { Activities } from './activities/index.js';
import { AudioEngine } from './audio/audio.js';
import { ProximityVoice } from './audio/voice.js';
import { Remotes } from './net/remotes.js';
import { Net } from './net/socket.js';
import { FollowCamera } from './player/camera.js';
import { Input } from './player/controls.js';
import { LocalPlayer } from './player/local.js';
import { setAuraNight } from './player/avatar-effect.js';
import './ui/pk.css';
import { trimShadowCasters } from './player/avatar-lod.js';
import { World, createRenderer } from './scene/world.js';
import { AdaptiveQuality, renderPixelRatio } from './scene/render-quality.js';
import { openShare } from './share/share.js';
import { openBoard, openBook } from './ui/book.js';
import { Chat } from './ui/chat.js';
import { $, h, store } from './ui/dom.js';
import { Hud } from './ui/hud.js';
import { closeTopModal, modalOpen, openModal } from './ui/modal.js';
import { nudgePlacesMenu, openPlacesMenu } from './ui/places-menu.js';
import { showTutorial } from './ui/tutorial.js';
import { Welcome } from './ui/welcome.js';
import { WishReader } from './ui/wishReader.js';
import './ui/voice.css';
import './ui/pitch.css';
import './ui/fishing.css';
import './ui/melody.css';
import './ui/cultivation.css';

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
  // Cập nhật ma trận một lần mỗi khung ở vòng lặp; để tự động thì cả cảnh và nhãn tên đều tính lại.
  scene.matrixWorldAutoUpdate = false;

  // Bloom hậu kỳ: hào quang và vật phát sáng rực lên thật sự. Mobile (touch) bỏ qua để giữ khung hình mượt.
  let composer = null;
  let bloomPass = null;
  if (!isTouch) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.28, 0.5, 0.92);
    // Bloom vốn đã mờ nên chạy ở 1/4 số điểm ảnh gần như không khác, mà đây là bước tốn GPU nhất.
    const setBloomSize = bloomPass.setSize.bind(bloomPass);
    bloomPass.setSize = (w, h) => setBloomSize(Math.ceil(w / 2), Math.ceil(h / 2));
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }
  const savedProfile = store.getJson('profile') ?? {};
  const profile = {
    name: '',
    color: Math.floor(Math.random() * 8),
    hair: Math.floor(Math.random() * 3),
    hat: 3 + Math.floor(Math.random() * (AVATAR.hats - 3)),
    attire: 0,
    weapon: 0,
    effect: 0,
    ...savedProfile,
  };
  // Profile cũ không có slot tóc: id hat 0-2 là kiểu tóc, di trú như phía server.
  if (savedProfile.hair === undefined && profile.hat <= 2) profile.hair = profile.hat;

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
    remotes: new Remotes(scene, isTouch),
    me: new LocalPlayer(scene, profile, isTouch),
    modalBusy: () => modalOpen(),
    isBusy: () => modalOpen() || Boolean(app.activities.current && app.activities.current !== app.activities.meditation),
    chatBlocked: () => app.activities.current === app.activities.lotus,
  };
  app.remotes._p = new THREE.Vector3();
  app.bloom = bloomPass;
  app.hud = new Hud(app);
  app.chat = new Chat(app);
  app.activities = new Activities(app);
  app.voice = new ProximityVoice(app);
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
    onPreview: (p) => app.me.avatar.setLook(p.color, p.hat, p.hair, p.attire, p.weapon, p.effect),
    onEnter: (p) => {
      app.audio.unlock();
      Object.assign(profile, p);
      store.setJson('profile', { name: p.name, color: p.color, hair: p.hair, hat: p.hat, attire: p.attire, weapon: p.weapon, effect: p.effect });
      app.net.connect(() => ({
        playerId: store.get('playerId'),
        name: profile.name,
        color: profile.color,
        hair: profile.hair,
        hat: profile.hat,
        attire: profile.attire,
        weapon: profile.weapon,
        effect: profile.effect,
      }));
    },
  });

  // ---------- Mạng ----------
  const { net, hud, me, remotes } = app;
  let entered = false;
  let wasLost = false;
  let mySid = 0;

  net.onRefused = (message) => {
    hud.pauseMusic();
    if (!entered) welcome.showError(message);
  };

  net.onFatal = (message) => {
    app.voice.stop();
    app.voice.ui.panel.hidden = true;
    hud.pauseMusic();
    app.activities.abort();
    const reload = h('button', { class: 'btn primary', type: 'button' }, 'Tải lại trang');
    reload.addEventListener('click', () => location.reload());
    openModal({ title: 'Tạm biệt một lát', content: [h('p', {}, message), h('div', { class: 'row-center' }, reload)] });
  };

  net.onLost = () => {
    app.voice.stop();
    wasLost = true;
    app.activities.abort();
    hud.toast('Mất kết nối, đang kết nối lại…', { ms: 4000 });
  };

  net.onEnter = (res) => {
    const snap = res.snapshot;
    mySid = res.sid;
    app.sid = res.sid;
    app.voice.ui.panel.hidden = false;
    store.set('playerId', res.playerId);
    app.myName = res.name;
    me.avatar.setName(res.name);
    me.avatar.setCultivation(snap.me.cultivationTier ?? 0);
    me.avatar.setQi(snap.me.qi ?? 0);
    const nowMs = net.now();
    remotes.sync(snap.players, nowMs);
    world.dayCycleMs = snap.dayCycleMs;
    // Danh sách lời ước gửi đích danh cho mình đã có sẵn mine và liked.
    world.wishes.setAll(snap.wishes);
    app.activities.wish.left = snap.wishesLeftToday;
    app.mats = snap.mats;
    app.activities.bell.setWait(snap.bellWait);
    app.activities.bellEvent.apply(snap.bellEvent);
    if (snap.unlocked != null) store.set('unlocked', String(snap.unlocked));
    world.meditation.apply(snap.meditationScene);
    // Ai đang buông cần quanh hồ thì mình cũng thấy cần và phao của họ.
    for (const f of snap.fishers ?? []) {
      const p = snap.players.find((pl) => pl.sid === f.sid);
      if (p) world.fishing.setRod(f.sid, { x: p.x, z: p.z, on: true, bx: f.bx, bz: f.bz });
    }
    app.activities.pk.setSnapshot(snap.me, snap.players);
    world.fishing.shadows.setTaken(snap.fishShadowsTaken);
    hud.setPresence(snap.online, snap.visitsToday);

    if (wasLost) {
      wasLost = false;
      hud.toast('Đã kết nối lại.', { ms: 2000 });
    }
    if (!entered) {
      entered = true;
      welcome.hide();
      app.activities.pk.panel.root.hidden = false;
      hud.playMusic();
      hud.show();
      hud.startRadio(snap.radio);
      app.voice.start();
      app.follow.intro = false;
      me.avatar.nameEl.hidden = false;
      trimShadowCasters(me.avatar); // Ngoại hình đã chốt ở màn chào.
      me.rot = SPAWN.rot;
      me.locked = false;
      app.input.enabled = true;
      app.follow.yaw = 0;
      app.follow.look.copy(app.follow.target);
      if (snap.welcome) hud.toast(snap.welcome, { ms: 6500 });
      showTutorial(store, isTouch);
      nudgePlacesMenu();
    }
  };

  net.on('state', ({ t, p }) => {
    const arrivedAt = net.now();
    for (const row of p) {
      if (row[0] !== mySid) remotes.applyRow(row, t - (row[6] ?? 0), arrivedAt);
      else me.avatar.setQi(row[7] ?? 0);
    }
  });

  net.on('player:join', (p) => {
    const remote = remotes.add(p, net.now());
    remote.avatar.setCombatStatus(p.combat?.protectedUntil ? 'Bảo hộ' : p.combat?.satKhiUntil ? 'Sát khí' : '');
    hud.toast(`${p.name} vừa lên tu viện`);
    app.audio.chime(0.07);
  });
  net.on('player:leave', ({ sid, name }) => {
    remotes.remove(sid);
    world.fishing.setRod(sid, { on: false });
    hud.toast(`${name} vừa rời tu viện`);
  });
  net.on('presence', ({ online, visitsToday }) => hud.setPresence(online, visitsToday));

  const avatarOf = (sid) => (sid === mySid ? me.avatar : remotes.map.get(sid)?.avatar);
  // Vị trí đứng của một người chơi (mình hoặc người khác), cho hiệu ứng câu cá/đầu hồ.
  const remotePos = (sid) => {
    if (sid === mySid) return { x: me.x, z: me.z };
    const r = remotes.map.get(sid);
    return r ? { x: r.avatar.root.position.x, z: r.avatar.root.position.z } : null;
  };

  net.on('chat', ({ sid, text }) => {
    avatarOf(sid)?.say(text);
    app.chat.receive(sid === mySid ? app.myName : remotes.map.get(sid)?.name ?? 'Người chơi', text);
  });
  net.on('cultivation:update', ({ sid, tier }) => avatarOf(sid)?.setCultivation(tier));
  net.on('emoji', ({ sid, i }) => avatarOf(sid)?.say(EMOJIS[i] ?? '', 2500));
  net.on('wave', ({ from, to, name }) => {
    avatarOf(from)?.wave();
    if (to === mySid) {
      hud.toast(`${name} vẫy tay với bạn`);
      app.audio.pop();
    }
  });

  net.on('bell:ring', ({ sid, quality, force, intensity = 0, beat = 1 }) => {
    // Xa gác chuông thì nghe nhỏ dần nhưng vẫn nghe được khắp sân.
    const d = Math.hypot(me.x - BELL.x, me.z - BELL.z);
    const volume = Math.max(0.28, 1 - d / 60);
    if (sid === mySid) app.follow.shake(0.012 + quality * 0.02);
    app.audio.bell({ quality, force, intensity, volume });
    world.ringBell(quality);
    world.lanternBoost = Math.max(world.lanternBoost, beat / 3 + intensity);
    if (beat === 3) world.particles.burstPetals(0.3 + intensity * 0.4);
  });
  net.on('bell:event', (payload) => app.activities.bellEvent.apply(payload));

  net.on('meditation:mats', (mats) => {
    app.mats = mats;
  });
  net.on('meditation:sync', (data) => {
    app.activities.meditation.onSync(data);
    app.activities.lotus.onSync(data);
  });
  net.on('cultivation:progress', ({ sid, qi }) => avatarOf(sid)?.setQi(qi));
  net.on('meditation:scene', (data) => world.meditation.apply(data));
  net.on('rhythm:bloom', (data) => world.meditation.bloom(data));

  // ---------- Câu cá ----------
  net.on('fish:bobber', ({ sid, bx, bz }) => {
    // Người vừa thả cần: đặt bộ cần + phao tại chỗ họ đứng (của mình thì activity đã đặt).
    const pos = sid === mySid ? { x: me.x, z: me.z } : remotePos(sid);
    if (pos) world.fishing.setRod(sid, { x: pos.x, z: pos.z, on: true, bx, bz });
  });
  net.on('fish:bite', (bite) => app.activities.fishing.onBite(bite));
  // Ai dính cá thì phao người đó giật liên tục, cả phòng đều thấy.
  net.on('fish:struck', ({ sid }) => {
    world.fishing.strike(sid);
    avatarOf(sid)?.say('!', 1100);
  });
  net.on('fish:shadow', ({ id }) => world.fishing.shadows.markTaken(id));
  // Hết lượt: phao biến mất. Mình còn đang câu thì giữ cần trên tay để quăng tiếp.
  net.on('fish:rodoff', ({ sid, idle }) => {
    const pos = idle ? remotePos(sid) : null;
    world.fishing.setRod(sid, pos ? { x: pos.x, z: pos.z, on: true } : { on: false });
  });
  net.on('fish:escaped', ({ reason }) => app.activities.fishing.escaped(reason));
  net.on('fish:caught', ({ sid, name, rarity, weight }) => {
    world.fishing.splashAtBobber(sid);
    // Khoe ngay trên đầu người bắt; ai đang đứng quanh hồ đều thấy.
    if (sid !== mySid) avatarOf(sid)?.say(`${name} ${'★'.repeat(rarity)} · ${weight} kg`, 3500);
    if (sid !== mySid && rarity === 3) app.audio.chime(0.05);
  });

  // ---------- Đầu hồ ----------
  net.on('pitch:throw', ({ sid, hit, npcHit }) => {
    const pos = sid === mySid ? { x: me.x, z: me.z } : remotePos(sid);
    if (pos) world.pitchCourt.playTurn(pos.x, pos.z, hit, npcHit);
  });
  net.on('pitch:turn', (turn) => app.activities.pitch.onTurn(turn));

  let blessToastAt = 0;
  net.on('wish:new', (wish) => {
    const mine = app.mineWishIds.has(wish.id);
    // Lời ước của mình bay ra từ chỗ mình đứng; của người khác hiện dần tại chỗ của họ.
    world.wishes.add({ ...wish, mine, liked: false }, true, mine ? { x: me.x, z: me.z } : null);
  });
  net.on('wish:update', ({ id, likes }) => {
    world.wishes.patch(id, { likes });
    app.reader.onUpdate(id);
    // Ai đó thả phúc cho lời ước của mình: báo ngay một lần, không spam khi nhiều người cùng thả.
    if (app.mineWishIds.has(id) && performance.now() - blessToastAt > 6000) {
      blessToastAt = performance.now();
      app.hud.toast('💛 Có người vừa thả phúc cho lời ước của bạn');
      app.audio.chime(0.06);
    }
  });
  net.on('wish:removed', ({ id }) => {
    world.wishes.remove(id);
    app.reader.onRemoved(id);
  });

  // ---------- Nút và phím ----------
  $('playBtn').addEventListener('click', () => openPlacesMenu(app));
  $('bookBtn').addEventListener('click', () => openBook(app));
  $('boardBtn').addEventListener('click', () => openBoard(app));
  $('shareBtn').addEventListener('click', () => openShare(app));

  app.input.onKeyDown = (e) => {
    if (!entered) return false;
    if (e.repeat && ['Space', 'KeyE', 'Enter'].includes(e.code)) return true;
    if (e.repeat && app.activities.current?.isRhythm && e.code.startsWith('Arrow')) return true;
    if (e.code === 'Escape') {
      if (app.input.pointerLocked) {
        document.exitPointerLock();
        return true;
      }
      if (closeTopModal()) return true;
      if (app.activities.current) {
        app.activities.exit();
        return true;
      }
      return false;
    }
    if (app.activities.onKey(e.code, true)) return true;
    if (modalOpen() || app.activities.current) return false;
    if (e.code === 'Space') {
      // Space ngồi thiền ngay tại chỗ; đứng cạnh chiếu trống thì ngồi lên chiếu.
      const zone = app.activities.zoneAt(app.me.x, app.me.z);
      if (zone?.key.startsWith('mat')) zone.run();
      else app.activities.meditation.start();
      return true;
    }
    if (e.code === 'KeyE') {
      hud.runAction();
      return true;
    }
    if (e.code === 'Enter' || e.code === 'KeyT') {
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
  app.input.canLock = () => !modalOpen() && (!app.activities.current || app.activities.current === app.activities.pk);

  // Chạm/bấm vào cảnh: vẫy tay với đồng nghiệp, vuốt mèo, đọc lời ước.
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const heartAt = new THREE.Vector3();
  app.input.onTap = (x, y, event) => {
    if (!entered || app.modalBusy()) return;
    if (app.activities.current) return;
    if (app.input.pointerLocked) { app.activities.pk.use('strike'); return; }
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const person = remotes.atRay(raycaster.ray);
    if (person) {
      if (event?.altKey || event?.pointerType === 'touch') {
        const waveBtn = h('button', { class: 'btn', type: 'button' }, '👋 Vẫy tay');
        const modal = openModal({ title: person.name, content: waveBtn });
        waveBtn.onclick = () => {
          app.net.call('wave', { to: person.sid });
          heartAt.set(person.x, person.y + 1, person.z);
          floater(app, heartAt, '👋');
          modal.close();
        };
        return;
      }
      app.activities.pk.use('strike', { x, y });
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
    // Tia trúng mesh trước; hụt thì chọn theo hình chiếu gần điểm chạm (dải lụa 0.2m khó bấm trên mobile).
    const wish = world.wishes.pick(raycaster)
      ?? world.wishes.pickScreen(x, y, camera, window.innerWidth, window.innerHeight);
    raycaster.far = Infinity;
    if (wish) app.reader.pin(wish);
    else app.activities.pk.use('strike', { x, y });
  };

  // ---------- Khung hình ----------
  const onResize = () => {
    const w = window.innerWidth;
    const h2 = window.innerHeight;
    camera.aspect = w / h2;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(renderPixelRatio(w, h2, window.devicePixelRatio, quality.level, isTouch));
    renderer.setSize(w, h2, false);
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h2);
    }
    labelRenderer.setSize(w, h2);
    frameIntro();
  };
  const quality = new AdaptiveQuality((level) => {
    if (level === 1) {
      // Tắt bloom và thu bóng đều không phải biên dịch lại shader, nên hạ bậc không gây khựng.
      if (bloomPass) bloomPass.enabled = false;
      world.sky.setShadowSize(1024);
    } else {
      renderer.shadowMap.enabled = false;
    }
    onResize();
  });
  app.quality = quality;
  window.addEventListener('resize', onResize);
  onResize();

  let lastFrame = performance.now();
  let audioTimer = 0;

  const frame = () => {
    requestAnimationFrame(frame);
    const t = performance.now();
    const rawDt = (t - lastFrame) / 1000;
    lastFrame = t;
    const dt = Math.min(0.05, rawDt);
    const nowMs = net.now();

    const look = app.input.consumeLook();
    if (app.input.pointerLocked && (modalOpen() || (app.activities.current && app.activities.current !== app.activities.pk))) {
      document.exitPointerLock();
    }
    // Đang mở hộp thoại hoặc đang làm hoạt động thì nhân vật đứng yên.
    me.locked = !entered || (app.isBusy() && app.activities.current?.lockMove !== false) || Boolean(app.activities.current?.lockMove);
    me.update(dt, app.input, app.follow.yaw + look.yaw, net);
    remotes.update(dt, nowMs, camera);
    app.activities.update(dt);
    app.reader.update(dt);
    world.wishes.setViewer(me.x, me.z, camera);
    world.update(dt, nowMs);
    world.abbot.update(dt, me.x, me.z, camera);
    world.monk.update(dt, me.x, me.z, camera);
    world.pitchCourt.update(dt, camera);
    app.follow.update(dt, me.x, me.y, me.z, look);
    world.sky.follow(camera);
    setAuraNight(world.sky.night); // hào quang rực theo ngày/đêm trên tu viện
    world.shadowBusy = me.moving || remotes.walking;
    scene.updateMatrixWorld();

    audioTimer += dt;
    if (audioTimer > 0.4) {
      audioTimer = 0;
      app.audio.updatePosition(me.x, me.z, world.sky.night);
    }

    app.voiceClock = (app.voiceClock || 0) + dt;
    if (app.voiceClock >= 0.1) { app.voiceClock = 0; app.voice.update(); }

    if (composer) composer.render();
    else renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    quality.update(rawDt, !document.hidden && document.hasFocus());
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

try {
  main();
} catch (err) {
  // Bảng lỗi khởi động: hiện thẳng lên màn hình để không còn đoán mò màn đen.
  console.error(err);
  const pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99999;background:#4a1010;color:#ffe9e9;padding:12px 14px;max-width:92vw;white-space:pre-wrap;font:12px/1.5 monospace;border-radius:8px';
  pre.textContent = 'Lỗi khởi động game:\n' + (err && err.stack || err);
  document.body.append(pre);
}
