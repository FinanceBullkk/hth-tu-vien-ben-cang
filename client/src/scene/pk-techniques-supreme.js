import * as THREE from 'three';
import { CARD_CELLS } from '../player/vfx/than-bai-textures.js';
import { glowingCarp, goldDie, twoSidedCard } from './pk-vfx-supreme-motifs.js';

// Tuyệt kỹ Q và Lãnh vực hộ thể cho hai hào quang chí tôn (13 Thần bài, 14 Vua câu cá),
// cùng quy ước với pk-techniques.js: builder Q trả { group, life, tick(dt, p) }, builder
// lãnh vực gắn mọi phần vào group hộ thể và trả tick(dt, p). Mọi mesh gắn vào group nên
// dispose theo traverse của PkVfx; atlas bài/xúc xắc là cache dùng chung, không bị huỷ.

const addMat = (color, opacity = .9) => new THREE.MeshBasicMaterial({ color, transparent: true,
  opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const sstep = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const fadeOut = (p, from) => 1 - Math.max(0, (p - from) / (1 - from));

/** Đoạn trụ mảnh nối hai điểm (dùng cho tia sét gãy khúc). */
function segment(a, b, radius, mat) {
  const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || .01;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6, 1, true), mat);
  mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z).normalize());
  return mesh;
}

// Vòng trận bài lúc tất tay — y như "Vạn Bài Quy Tông" của aura: Át bích, K♥ Q♦ J♣, ba Át, 10 J Q K bích.
const RING_CELLS = [
  CARD_CELLS.aceSpade, CARD_CELLS.kingHeart, CARD_CELLS.queenDiamond, CARD_CELLS.jackClub,
  CARD_CELLS.aceHeart, CARD_CELLS.aceDiamond, CARD_CELLS.aceClub, CARD_CELLS.tenSpade,
  CARD_CELLS.jackSpade, CARD_CELLS.queenSpade, CARD_CELLS.kingSpade, CARD_CELLS.aceSpade,
];

export const SUPREME_Q_TECHNIQUES = {
  // Thần bài — Tất Tay Định Càn Khôn: xúc xắc vàng lật tít bay vòng cung tới đích, chạm đất thì
  // mười hai lá bài dựng vòng trận quanh vùng nổ và sét vàng giáng thẳng xuống tâm.
  13: (ctx) => {
    const { vfx, fromX, fromY, fromZ, toX, toY, toZ, t, radius } = ctx;
    const group = new THREE.Group();
    const die = goldDie(t);
    die.scale.setScalar(3.2);
    group.add(die);
    const R = Math.max(1.8, radius * .62);
    const ring = RING_CELLS.map((cell) => {
      const card = twoSidedCard(cell, 'out'); // mặt bài quay ra ngoài vòng
      card.scale.setScalar(0);
      group.add(card);
      return card;
    });
    // Sét vàng gãy khúc từ trời xuống tâm: lớp vàng ngoài + lõi ngà.
    const bolt = new THREE.Group();
    const glow = addMat(t.main, 0), core = addMat(t.core, 0);
    let prev = { x: toX, y: toY + 7.5, z: toZ };
    for (let k = 1; k <= 7; k++) {
      const next = k === 7 ? { x: toX, y: toY + .1, z: toZ }
        : { x: toX + (Math.random() - .5) * .9, y: toY + 7.5 - k * 1.06, z: toZ + (Math.random() - .5) * .9 };
      bolt.add(segment(prev, next, .1, glow), segment(prev, next, .035, core));
      prev = next;
    }
    group.add(bolt);
    const flash = new THREE.Mesh(new THREE.CircleGeometry(R, 40), addMat(t.core, 0));
    flash.rotation.x = -Math.PI / 2;
    flash.position.set(toX, toY + .06, toZ);
    group.add(flash);
    return { group, life: 1.4, tick: (dt, p) => {
      // 1. Ném xúc xắc: vòng cung cao 2.4m, lật hai trục.
      const fly = sstep(0, .36, p);
      die.position.set(fromX + (toX - fromX) * fly, fromY + 1.1 + (toY - fromY) * fly + 2.4 * 4 * fly * (1 - fly) - .8 * fly,
        fromZ + (toZ - fromZ) * fly);
      die.rotation.x += dt * 13;
      die.rotation.z += dt * 8;
      die.scale.setScalar(3.2 * fadeOut(p, .82));
      if (p < .36 && Math.random() < .5) vfx.addTrailSpark(die.position.x, die.position.y, die.position.z,
        t.trail[Math.floor(Math.random() * t.trail.length)]);
      if (!ctx.__land && fly >= 1) {
        ctx.__land = true;
        vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.main, maxRadius: R, duration: .35 });
      }
      // 2. Vòng trận bài: lá phóng từ nhỏ ra lần lượt, xoay chậm, cuối nhịp nở rộng rồi tan.
      const open = sstep(.66, .95, p);
      for (let i = 0; i < ring.length; i++) {
        const a = (i / ring.length) * Math.PI * 2 + p * 1.6;
        const show = sstep(.36 + i * .012, .5 + i * .012, p) * fadeOut(p, .86);
        const r = R * (1 + .25 * open);
        ring[i].position.set(toX + Math.cos(a) * r, toY + .62 + .08 * Math.sin(p * 12 + i), toZ + Math.sin(a) * r);
        ring[i].rotation.y = -a;
        ring[i].scale.setScalar(3.6 * show);
      }
      // 3. Sét tất tay: lóe ngay sau khi xúc xắc chạm đất, chập chờn rồi tắt.
      const strike = sstep(.4, .44, p) * (1 - sstep(.58, .7, p));
      const flicker = .75 + .25 * Math.sin(p * 140);
      glow.opacity = .85 * strike * flicker;
      core.opacity = strike;
      flash.material.opacity = .55 * strike;
      if (!ctx.__boom && p >= .42) {
        ctx.__boom = true;
        vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.accent, maxRadius: Math.max(2.6, radius), duration: .45 });
        for (let i = 0; i < 14; i++) vfx.addTrailSpark(toX + (Math.random() - .5) * 1.4, toY + .4 + Math.random() * 2.2,
          toZ + (Math.random() - .5) * 1.4, t.burst[i % t.burst.length]);
      }
    } };
  },

  // Vua câu cá — Lý Ngư Vượt Vũ Môn: vũ môn son–vàng dựng giữa đường, cá chép vàng vọt vòng cung
  // qua đỉnh cổng rồi lao xuống đích, cột nước phun trời và đàn cá con vọt toả ra.
  14: (ctx) => {
    const { vfx, fromX, fromY, fromZ, toX, toY, toZ, t, radius } = ctx;
    const group = new THREE.Group();
    const heading = Math.atan2(toX - fromX, toZ - fromZ);
    // Vũ môn: hai cột son, xà vàng, mái cong vàng nhạt.
    const gate = new THREE.Group();
    // Blending thường (không cộng sáng) để son và vàng giữ đúng màu, không cháy trắng.
    const solid = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .94, depthWrite: false });
    const red = solid(0xd8342a);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, 2.8, 10), red);
      post.position.set(side * 1.05, 1.4, 0);
      gate.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.5, .14, .16), solid(t.accent));
    beam.position.y = 2.55;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3, .1, .26), solid(t.accent));
    roof.position.y = 2.95;
    gate.add(beam, roof);
    gate.position.set((fromX + toX) / 2, (fromY + toY) / 2, (fromZ + toZ) / 2);
    gate.rotation.y = heading;
    gate.scale.set(1, 0, 1);
    group.add(gate);
    // Cá chép lớn: hai lá cá đan chéo nên nhìn hướng nào cũng ra dáng cá.
    const pivot = new THREE.Group();
    pivot.rotation.y = heading;
    const carp = new THREE.Group();
    const side = glowingCarp(t);
    const front = glowingCarp(t);
    front.rotation.y = Math.PI / 2;
    carp.add(side, front);
    carp.scale.setScalar(3.4);
    pivot.add(carp);
    group.add(pivot);
    // Cột nước + vòng sóng ở đích.
    const geyser = new THREE.Mesh(new THREE.CylinderGeometry(.42, .85, 4.4, 18, 1, true), addMat(t.main, 0));
    geyser.position.set(toX, toY + 2.2, toZ);
    const geyserCore = new THREE.Mesh(new THREE.CylinderGeometry(.16, .32, 4.6, 12, 1, true), addMat(t.core, 0));
    geyserCore.position.copy(geyser.position);
    const splash = new THREE.Mesh(new THREE.RingGeometry(.4, .95, 40), addMat(t.core, 0));
    splash.rotation.x = -Math.PI / 2;
    splash.position.set(toX, toY + .08, toZ);
    group.add(geyser, geyserCore, splash);
    // Đàn cá con vọt toả ra từ cột nước.
    const school = [];
    for (let i = 0; i < 6; i++) {
      const fish = glowingCarp(t);
      fish.scale.setScalar(0);
      group.add(fish);
      school.push({ fish, a: (i / 6) * Math.PI * 2 + .3 });
    }
    const dist = Math.hypot(toX - fromX, toZ - fromZ), arcH = 3.6;
    return { group, life: 1.45, tick: (dt, p) => {
      gate.scale.y = sstep(0, .14, p) * fadeOut(p, .78);
      // 1. Cá vọt vòng cung, đỉnh cao hơn mái vũ môn; đầu cá bám theo hướng bay.
      const fly = sstep(.04, .52, p);
      pivot.position.set(fromX + (toX - fromX) * fly, fromY + .9 + (toY - fromY) * fly + arcH * 4 * fly * (1 - fly),
        fromZ + (toZ - fromZ) * fly);
      carp.rotation.x = Math.atan2(dist, arcH * 4 * (1 - 2 * fly)); // 0 = ngóc thẳng lên, π = cắm xuống
      carp.rotation.z = Math.sin(p * 34) * .12; // quẫy đuôi
      carp.scale.setScalar(3.4 * fadeOut(p, .55));
      if (p < .52 && Math.random() < .6) vfx.addTrailSpark(pivot.position.x, pivot.position.y, pivot.position.z,
        t.trail[Math.floor(Math.random() * t.trail.length)]);
      if (!ctx.__boom && fly >= 1) {
        ctx.__boom = true;
        vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.main, maxRadius: Math.max(2.4, radius), duration: .45 });
        for (let i = 0; i < 16; i++) vfx.addTrailSpark(toX + (Math.random() - .5) * 1.2, toY + Math.random() * 3,
          toZ + (Math.random() - .5) * 1.2, t.burst[i % t.burst.length]);
      }
      // 2. Cột nước phun trời rồi sụp, vòng sóng loang.
      const g = sstep(.5, .6, p) * fadeOut(p, .82);
      geyser.scale.set(1, .15 + .85 * sstep(.5, .64, p), 1);
      geyserCore.scale.copy(geyser.scale);
      geyser.material.opacity = .5 * g;
      geyserCore.material.opacity = .75 * g;
      splash.scale.setScalar(1 + 3 * sstep(.52, 1, p));
      splash.material.opacity = .7 * sstep(.5, .56, p) * fadeOut(p, .6);
      // 3. Đàn cá con vọt toả, mỗi con một vòng cung nhỏ.
      const q = sstep(.54, 1, p);
      for (const { fish, a } of school) {
        const r = q * Math.max(1.6, radius * .7);
        fish.position.set(toX + Math.cos(a) * r, toY + .2 + 2.4 * 4 * q * (1 - q), toZ + Math.sin(a) * r);
        fish.rotation.set(0, -a + Math.PI / 2, (1 - 2 * q) * -.9);
        fish.scale.setScalar(p > .54 ? 1.9 * fadeOut(p, .86) : 0);
      }
    } };
  },
};

export const SUPREME_DOMAINS = {
  13: (group, t) => { // Thần bài — ba xúc xắc vàng gieo vờn quanh đầu, lật tít như đang lắc bát
    const dice = [0, 1, 2].map(() => {
      const die = goldDie(t);
      die.scale.setScalar(1.6);
      group.add(die);
      return die;
    });
    return (dt, p) => {
      dice.forEach((die, i) => {
        const a = p * 5.5 + (i / dice.length) * Math.PI * 2;
        die.position.set(Math.cos(a) * .72, .95 + Math.abs(Math.sin(p * 14 + i * 1.7)) * .28, Math.sin(a) * .72);
        die.rotation.x += dt * (7 + i * 2);
        die.rotation.y += dt * (5 - i);
      });
    };
  },
  14: (group, t) => { // Vua câu cá — bọt nước sủi quanh thân, lưỡi câu vàng nhấp nhô trên đầu
    const bubbles = [];
    for (let i = 0; i < 12; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(.04 + (i % 3) * .018, 8, 6), addMat(t.core, .75));
      b.userData = { a: (i / 12) * Math.PI * 2, r: .55 + (i % 4) * .14, off: (i * .37) % 1 };
      group.add(b);
      bubbles.push(b);
    }
    const line = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 1, 4), addMat(t.core, .6));
    const hook = new THREE.Mesh(new THREE.TorusGeometry(.1, .022, 6, 18, Math.PI * 1.5), addMat(t.accent, .95));
    group.add(line, hook);
    return (dt, p) => {
      for (const b of bubbles) {
        const u = (p * 2.2 + b.userData.off) % 1; // mỗi bọt trồi từ chân lên đỉnh rồi lặp
        const a = b.userData.a + p * 1.5;
        b.position.set(Math.cos(a) * b.userData.r, -.7 + u * 2, Math.sin(a) * b.userData.r);
        b.material.opacity = .75 * Math.sin(Math.PI * u);
      }
      const bob = Math.sin(p * 16) * .12;
      hook.position.set(0, 1.25 + bob, 0);
      hook.rotation.z = Math.sin(p * 9) * .3;
      line.position.set(0, 1.85 + bob / 2, 0);
      line.scale.y = 1.1 - bob;
    };
  },
};
