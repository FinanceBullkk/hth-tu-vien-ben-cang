import * as THREE from 'three';
import { SUPREME_DOMAINS, SUPREME_Q_TECHNIQUES } from './pk-techniques-supreme.js';

// ===== Tuyệt kỹ PK theo anime (Jujutsu Kaisen, Naruto, Bleach, Dragon Ball…) =====
// Mỗi aura một tuyệt kỹ Q hoàn toàn riêng (spawnQTechnique) và một Lãnh vực thu nhỏ
// kiểu Domain Expansion cho hộ thể (spawnDomain). Server vẫn là nơi chốt sát thương —
// module này chỉ hoá thân dữ liệu hit thành điệu múa riêng từng tông.
// Quy ước: builder trả { group, life, tick(dt, p) }; p là tiến trình 0→1 của tuyệt kỹ,
// mọi phần gắn vào group nên dispose theo đúng pattern traverse của PkVfx.

const addMat = (color, opacity = .9) => new THREE.MeshBasicMaterial({ color, transparent: true,
  opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const normMat = (color, opacity = .9) => new THREE.MeshBasicMaterial({ color, transparent: true,
  opacity, depthWrite: false, side: THREE.DoubleSide });
const sstep = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// Điểm giữa hai toạ độ, đặt trục cylinder dọc theo đoạn nối (dùng cho beam).
function beamBetween(from, to, radius, mat) {
  const len = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) || .01;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 12, 1, true), mat);
  mesh.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z).normalize());
  return mesh;
}

const petal = (color) => new THREE.Mesh(new THREE.PlaneGeometry(.16, .34), normMat(color, .95));

// ===== Tuyệt kỹ Q (1–12 ở đây, 13–14 chí tôn ở pk-techniques-supreme.js) — ctx: { vfx, effect, t, fromX/Y/Z, toX/Y/Z, rot, radius, isHit } =====
const Q_TECHNIQUES = {
  // Sen kim — Ngàn Tay Phật Quang: bát bộ Phật chưởng hợp nhất dâng cột kim quang.
  1: (ctx) => {
    const { vfx, toX, toY, toZ, t } = ctx;
    const group = new THREE.Group();
    const palms = [];
    for (let i = 0; i < 8; i++) {
      const palm = new THREE.Mesh(new THREE.BoxGeometry(.36, .5, .09), addMat(t.main, .88));
      const finger = new THREE.Mesh(new THREE.ConeGeometry(.05, .3, 5), addMat(t.core, .95));
      finger.position.y = .38;
      palm.add(finger);
      group.add(palm);
      palms.push(palm);
    }
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.55, .95, 4.4, 18, 1, true), addMat(t.core, 0));
    pillar.position.set(toX, toY + 1.9, toZ);
    group.add(pillar);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.5, 2.5, 40), addMat(t.core, 0));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(toX, toY + .08, toZ);
    group.add(ring);
    return { group, life: 1.25, tick: (dt, p) => {
      const converge = sstep(0, .45, p);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + p * 2.4;
        const r = 2.3 * (1 - converge * .55);
        palms[i].position.set(toX + Math.cos(a) * r, toY + 1.1 + Math.sin(p * 9 + i) * .18, toZ + Math.sin(a) * r);
        palms[i].rotation.set(.2, -a, 0); // mặt chưởng quay vào tâm
      }
      const blast = sstep(.45, .62, p);
      ring.scale.setScalar(.4 + blast * 1.1);
      ring.material.opacity = .8 * blast * (1 - Math.max(0, (p - .62) / .38));
      pillar.material.opacity = blast * .55 * (1 - Math.max(0, (p - .62) / .38));
      pillar.scale.set(1 + blast * .5, 1, 1 + blast * .5);
      if (!ctx.__boom && p >= .5) {
        ctx.__boom = true;
        vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.accent, maxRadius: 2.6, duration: .4 });
        for (let i = 0; i < 14; i++) vfx.addTrailSpark(toX, toY + 1, toZ, t.trail[i % t.trail.length]);
      }
    } };
  },

  // Lưu ly — Thủy Long Phá Kính: long bơi tới, hóa Bích Lạc hút vào rồi bùng gương vỡ.
  2: (ctx) => {
    const { vfx, fromX, fromY, fromZ, toX, toY, toZ, t } = ctx;
    const group = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 10), addMat(t.core, .95));
    group.add(head);
    const body = [];
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(.22 - i * .014, 10, 8), addMat(t.main, .8 - i * .04));
      group.add(s);
      body.push(s);
    }
    const shards = [];
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Mesh(new THREE.TetrahedronGeometry(.15), addMat(t.core, .95));
      s.visible = false;
      group.add(s);
      shards.push(s);
    }
    const pull = new THREE.Mesh(new THREE.SphereGeometry(.5, 14, 12), addMat(t.accent, 0));
    group.add(pull);
    return { group, life: 1.15, tick: (dt, p) => {
      const fly = Math.min(1, p / .5);
      const hy = fromY + 1 + Math.sin(p * 12) * .35 + fly * .4;
      head.position.set(fromX + (toX - fromX) * fly, hy, fromZ + (toZ - fromZ) * fly);
      for (let i = 0; i < body.length; i++) {
        const q = Math.max(0, fly - (i + 1) * .045);
        body[i].position.set(fromX + (toX - fromX) * q,
          fromY + 1 + Math.sin(p * 12 - (i + 1) * .5) * .35 + q * .4, fromZ + (toZ - fromZ) * q);
      }
      if (Math.random() < .4) vfx.addTrailSpark(head.position.x, head.position.y, head.position.z,
        t.trail[Math.floor(Math.random() * t.trail.length)]);
      if (fly >= 1) {
        const q = (p - .5) / .5;
        pull.position.set(toX, toY + .8, toZ);
        pull.material.opacity = .5 * Math.sin(Math.min(1, q * 1.4) * Math.PI);
        pull.scale.setScalar(.6 + q * .9);
        for (let i = 0; i < shards.length; i++) {
          shards[i].visible = q > .05 && q < .85;
          const a = (i / shards.length) * Math.PI * 2 + q * 3;
          const r = 2.6 * (1 - q * .9);
          shards[i].position.set(toX + Math.cos(a) * r, toY + .8 + Math.sin(a * 2 + q * 5) * .8, toZ + Math.sin(a) * r);
        }
        if (!ctx.__boom && q >= .8) {
          ctx.__boom = true;
          vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.accent, maxRadius: Math.max(2, ctx.radius), duration: .45 });
          vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.core, maxRadius: 1.5, duration: .3 });
        }
      }
    } };
  },

  // Tinh hà — Vô Lượng Tinh Khung (Infinite Void): vòm sao đốn thời gian, chớp trắng.
  3: (ctx) => {
    const { toX, toY, toZ, t, radius } = ctx;
    const R = Math.min(radius + 1, 4.5);
    const group = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 18), normMat(0x1a2452, 0));
    dome.position.set(toX, toY + R * .55, toZ);
    group.add(dome);
    const stars = [];
    for (let i = 0; i < 34; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(.05 + Math.random() * .05),
        addMat(i % 4 ? 0xffffff : t.core, .95));
      s.userData = { a: Math.random() * Math.PI * 2, r: Math.random() * R * .8, h: Math.random() * 2.4,
        w: .5 + Math.random() };
      group.add(s);
      stars.push(s);
    }
    const flash = new THREE.Mesh(new THREE.RingGeometry(.2, .5, 28), addMat(0xffffff, 0));
    flash.rotation.x = -Math.PI / 2;
    flash.position.set(toX, toY + .1, toZ);
    group.add(flash);
    return { group, life: 1.3, tick: (dt, p) => {
      dome.material.opacity = .38 * Math.min(1, p * 6) * (1 - Math.max(0, (p - .75) / .25));
      for (const s of stars) {
        const u = s.userData;
        u.a += dt * u.w * .6;
        s.position.set(toX + Math.cos(u.a) * u.r, toY + .3 + u.h, toZ + Math.sin(u.a) * u.r);
        s.rotation.y += dt * 2;
      }
      const q = (p - .3) / .25;
      if (q > 0 && q < 1) {
        flash.scale.setScalar(1 + q * 9);
        flash.material.opacity = .85 * (1 - q);
      }
    } };
  },

  // Hỏa diễm — Cực Đại: Thiên Thạch (Jogo): thiên thạch rỗng cháy giáng thế.
  4: (ctx) => {
    const { vfx, toX, toY, toZ, t, radius } = ctx;
    const group = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(.62, 0), normMat(0x5a3d28, .96));
    const fire = new THREE.Mesh(new THREE.ConeGeometry(.55, 1.3, 7), addMat(t.accent, .85));
    fire.rotation.x = Math.PI;
    fire.position.y = .95;
    rock.add(fire);
    const core = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), addMat(t.core, .95));
    rock.add(core);
    group.add(rock);
    return { group, life: 1.05, tick: (dt, p) => {
      const fall = sstep(0, .55, p);
      rock.position.set(toX + Math.sin(p * 20) * .06, toY + 7.5 * (1 - fall) + .6, toZ);
      rock.rotation.x += dt * 5;
      rock.rotation.y += dt * 3;
      if (Math.random() < .5) vfx.addTrailSpark(rock.position.x + (Math.random() - .5) * .5,
        rock.position.y + .8, rock.position.z, t.trail[Math.floor(Math.random() * t.trail.length)]);
      if (!ctx.__boom && fall >= 1) {
        ctx.__boom = true;
        rock.visible = false;
        vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.accent, maxRadius: Math.max(2.5, radius), duration: .5 });
        vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.main, maxRadius: 1.6, duration: .35 });
        for (let i = 0; i < 20; i++) vfx.addTrailSpark(toX + (Math.random() - .5) * 2,
          toY + Math.random() * 1.6, toZ + (Math.random() - .5) * 2, t.trail[i % t.trail.length]);
      }
    } };
  },

  // Đào hoa — Đào Nguyên Mê Chướng: sương đào + vòi xoáy cánh hoa cuộn thành một trảm.
  5: (ctx) => {
    const { toX, toY, toZ, t } = ctx;
    const group = new THREE.Group();
    const fog = new THREE.Mesh(new THREE.SphereGeometry(2, 20, 14), normMat(t.main, 0));
    fog.position.set(toX, toY + .9, toZ);
    group.add(fog);
    const petals = [];
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < 6; i++) {
        const m = petal(i % 2 ? t.main : t.core);
        m.userData = { k, i };
        group.add(m);
        petals.push(m);
      }
    }
    const slash = new THREE.Mesh(new THREE.RingGeometry(.4, .62, 30, 1, -.4, 2.2), addMat(t.core, 0));
    slash.position.set(toX, toY + .9, toZ);
    group.add(slash);
    return { group, life: 1.2, tick: (dt, p) => {
      fog.material.opacity = .3 * Math.min(1, p * 5) * (1 - Math.max(0, (p - .8) / .2));
      const gather = sstep(.68, 1, p);
      for (const m of petals) {
        const { k, i } = m.userData;
        const a = p * 6 + k * 2.1 + i * (Math.PI / 3);
        const r = (1.7 - k * .35) * (1 - gather * .92);
        m.position.set(toX + Math.cos(a) * r, toY + .35 + k * .75 + gather * .4, toZ + Math.sin(a) * r);
        m.rotation.set(Math.PI / 2 + Math.sin(a) * .5, a, 0);
      }
      const cut = sstep(.78, .92, p) * (1 - Math.max(0, (p - .92) / .08));
      slash.material.opacity = cut;
      slash.rotation.z = p * 7;
      slash.scale.setScalar(.8 + cut * 1.4);
    } };
  },

  // Bích ngọc — Bích Trúc Lâm Hiện (Wood Style): rừng trúc mọc rồi xạ tiễn về tâm.
  6: (ctx) => {
    const { toX, toY, toZ, t } = ctx;
    const group = new THREE.Group();
    const stalks = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + .2;
      const x = toX + Math.cos(a) * 2.1, z = toZ + Math.sin(a) * 2.1;
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(.09, .13, 3.4, 6), normMat(0x2f8a4c, .92));
      stalk.position.set(x, toY + 1.7, z);
      stalk.scale.y = 0;
      const leaf = petal(t.core);
      leaf.position.y = 1.6;
      leaf.scale.setScalar(1.6);
      stalk.add(leaf);
      group.add(stalk);
      stalks.push({ stalk, x, z, a });
    }
    const spikes = [];
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(.14, 1.2, 6), addMat(t.main, .95));
      s.visible = false;
      group.add(s);
      spikes.push(s);
    }
    return { group, life: 1.25, tick: (dt, p) => {
      const grow = sstep(0, .35, p);
      for (const { stalk, x, z } of stalks) {
        stalk.scale.y = grow;
        stalk.rotation.z = Math.sin(p * 9 + x) * .04 * grow;
      }
      const shot = sstep(.55, .62, p);
      for (let i = 0; i < spikes.length; i++) {
        const { x, z, a } = stalks[i];
        spikes[i].visible = shot > 0 && shot < 1;
        spikes[i].position.set(x + (toX - x) * shot, toY + .9 - shot * .3, z + (toZ - z) * shot);
        spikes[i].rotation.set(Math.PI / 2 - .2, -a, 0); // mũi chúi về tâm
      }
    } };
  },

  // Nguyệt bạch — Nguyệt Diệu Thiên Hàng: nguyệt cầu giáng thế, tán thành sáu liềm chém.
  7: (ctx) => {
    const { toX, toY, toZ, t } = ctx;
    const group = new THREE.Group();
    const moon = new THREE.Mesh(new THREE.SphereGeometry(.95, 20, 16), addMat(t.core, .95));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 16), addMat(t.main, .25));
    moon.add(glow);
    group.add(moon);
    const crescents = [];
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.RingGeometry(.34, .52, 20, 1, 0, Math.PI * .8), addMat(t.main, .95));
      c.visible = false;
      group.add(c);
      crescents.push(c);
    }
    return { group, life: 1.25, tick: (dt, p) => {
      const fall = sstep(0, .5, p);
      moon.position.set(toX + Math.sin(p * 8) * .05, toY + 6.5 - fall * 4.2, toZ);
      moon.rotation.y += dt * .8;
      const split = sstep(.55, .68, p);
      moon.material.opacity = split >= 1 ? Math.max(0, 1 - (p - .68) / .2) : .95;
      for (let i = 0; i < 6; i++) {
        const c = crescents[i];
        c.visible = split > 0;
        const a = (i / 6) * Math.PI * 2;
        const q = Math.max(0, p - .62) * 3.4;
        c.position.set(toX + Math.cos(a) * q, toY + 2.3 - q * .35, toZ + Math.sin(a) * q);
        c.rotation.set(-Math.PI / 2, 0, a + Math.PI / 2);
      }
      if (!ctx.__boom && split >= 1) {
        ctx.__boom = true;
        ctx.vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.accent, maxRadius: 2.4, duration: .45 });
      }
    } };
  },

  // Hắc ám — U Minh Hư Không (Hollow Purple): song cầu hút vào một, nổ tử viêm sét tối.
  8: (ctx) => {
    const { vfx, toX, toY, toZ, t } = ctx;
    const group = new THREE.Group();
    const orbA = new THREE.Mesh(new THREE.SphereGeometry(.34, 12, 10), addMat(0xd94fa0, .95));
    const orbB = new THREE.Mesh(new THREE.SphereGeometry(.34, 12, 10), addMat(0x3a1470, .95));
    group.add(orbA, orbB);
    const core = new THREE.Mesh(new THREE.SphereGeometry(.42, 14, 12), addMat(t.main, 0));
    group.add(core);
    const shards = [];
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Mesh(new THREE.TetrahedronGeometry(.13), addMat(t.core, .9));
      s.visible = false;
      group.add(s);
      shards.push(s);
    }
    const bolts = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.02, .05, 1.4, 4), addMat(t.core, 0));
      group.add(b);
      bolts.push(b);
    }
    return { group, life: 1.2, tick: (dt, p) => {
      const meet = Math.min(1, p / .4);
      orbA.position.set(toX + 2.2 * (1 - meet), toY + 1, toZ);
      orbB.position.set(toX - 2.2 * (1 - meet), toY + 1, toZ);
      const grow = sstep(.4, .55, p);
      core.position.set(toX, toY + 1, toZ);
      core.material.opacity = grow * .9 * (1 - Math.max(0, (p - .7) / .3));
      core.scale.setScalar(.5 + grow * .9);
      const suck = sstep(.45, .7, p);
      for (let i = 0; i < shards.length; i++) {
        shards[i].visible = suck > 0 && suck < 1;
        const a = (i / shards.length) * Math.PI * 2 + p * 4;
        const r = 3 * (1 - suck);
        shards[i].position.set(toX + Math.cos(a) * r, toY + 1 + Math.sin(a * 2) * .9 * (1 - suck), toZ + Math.sin(a) * r);
      }
      const blast = sstep(.7, .78, p);
      for (let i = 0; i < bolts.length; i++) {
        const b = bolts[i];
        const a = (i / bolts.length) * Math.PI * 2;
        b.visible = blast > 0 && blast < 1;
        b.position.set(toX + Math.cos(a) * .9 * blast, toY + 1 + Math.sin(a * 3) * .5, toZ + Math.sin(a) * .9 * blast);
        b.rotation.set(Math.PI / 2, 0, a + p * 6);
        b.material.opacity = .9 * (1 - blast);
      }
      if (!ctx.__boom && blast > 0) {
        ctx.__boom = true;
        vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.main, maxRadius: Math.max(2.6, ctx.radius), duration: .5 });
        orbA.visible = orbB.visible = false;
      }
    } };
  },

  // Long quyền — Thần Long Thăng Thiên (Dragon Fist): hỏa long xuyên đích rồi vọt lên trời.
  9: (ctx) => {
    const { vfx, fromX, fromY, fromZ, toX, toY, toZ, t } = ctx;
    const group = new THREE.Group();
    const segs = [];
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(.26 - i * .02, .5, 6), addMat(i % 2 ? t.main : t.accent, .92 - i * .05));
      group.add(s);
      segs.push(s);
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(.34, 12, 10), addMat(t.core, .98));
    const horn1 = new THREE.Mesh(new THREE.ConeGeometry(.06, .3, 5), addMat(t.core, .95));
    horn1.position.set(-.14, .3, 0);
    horn1.rotation.z = .5;
    const horn2 = horn1.clone();
    horn2.position.x = .14;
    horn2.rotation.z = -.5;
    head.add(horn1, horn2);
    group.add(head);
    return { group, life: .95, tick: (dt, p) => {
      // Đường bay: ngang từ ngực tới đích (0→.55) rồi bứt thẳng lên trời (.55→1).
      const hor = Math.min(1, p / .55);
      const up = sstep(.55, 1, p);
      const hx = fromX + (toX - fromX) * hor;
      const hz = fromZ + (toZ - fromZ) * hor;
      const hy = fromY + 1.1 + up * up * 5.2;
      head.position.set(hx, hy, hz);
      head.rotation.x = -.6 - up * 1.1;
      for (let i = 0; i < segs.length; i++) {
        const lag = (i + 1) * .055;
        const q = Math.max(0, hor - lag * (up > 0 ? .4 : 1));
        const r = Math.max(0, up - lag * 1.6);
        segs[i].position.set(fromX + (toX - fromX) * q, fromY + 1.1 + r * r * 5.2 - i * .12,
          fromZ + (toZ - fromZ) * q);
        segs[i].rotation.x = -.9 + Math.sin(p * 14 + i) * .18;
      }
      if (Math.random() < .55) vfx.addTrailSpark(hx + (Math.random() - .5) * .5, hy - .2,
        hz + (Math.random() - .5) * .5, t.trail[Math.floor(Math.random() * t.trail.length)]);
      if (!ctx.__boom && p >= .55) {
        ctx.__boom = true;
        vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.accent, maxRadius: 2.2, duration: .4 });
      }
    } };
  },

  // Xích diễm — Khai: Xích Viêm Thần Tiễn (Jogo "Khai"): tích lực thành tên lửa xuyên đích.
  10: (ctx) => {
    const { vfx, fromX, fromY, fromZ, toX, toY, toZ, t } = ctx;
    const group = new THREE.Group();
    const charge = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 10), addMat(t.core, .9));
    charge.position.set(fromX + Math.sin(ctx.rot) * .6, fromY + 1.2, fromZ + Math.cos(ctx.rot) * .6);
    group.add(charge);
    const from = { x: charge.position.x, y: charge.position.y, z: charge.position.z };
    const to = { x: toX, y: toY + .9, z: toZ };
    const beam = beamBetween(from, to, .22, addMat(t.main, 0));
    const beamCore = beamBetween(from, to, .09, addMat(0xffffff, 0));
    group.add(beam, beamCore);
    const boom = new THREE.Mesh(new THREE.SphereGeometry(.8, 14, 12), addMat(t.core, 0));
    boom.position.copy(to);
    group.add(boom);
    return { group, life: 1.0, tick: (dt, p) => {
      const wind = sstep(0, .3, p);
      charge.scale.setScalar(.4 + wind * 1.2);
      charge.material.opacity = .9 * (1 - sstep(.28, .34, p));
      const fire = sstep(.3, .38, p);
      beam.material.opacity = fire * .55 * (1 - Math.max(0, (p - .72) / .28));
      beamCore.material.opacity = fire * .85 * (1 - Math.max(0, (p - .72) / .28));
      const pulse = 1 + Math.sin(p * 40) * .18;
      beam.scale.set(pulse, 1, pulse);
      beamCore.scale.set(pulse, 1, pulse);
      boom.material.opacity = sstep(.36, .45, p) * (1 - Math.max(0, (p - .6) / .4));
      boom.scale.setScalar(.6 + p * 1.6);
      if (Math.random() < .5 && p > .3 && p < .75) vfx.addTrailSpark(to.x, to.y, to.z,
        t.trail[Math.floor(Math.random() * t.trail.length)]);
      if (!ctx.__boom && p >= .38) {
        ctx.__boom = true;
        vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.accent, maxRadius: Math.max(2.2, ctx.radius), duration: .45 });
      }
    } };
  },

  // Kim long — Kim Long Xuất Hải: kim quang trần xuyên đích, long đầu xoáy dọc tia.
  11: (ctx) => {
    const { vfx, fromX, fromY, fromZ, toX, toY, toZ, t } = ctx;
    const group = new THREE.Group();
    const from = { x: fromX + Math.sin(ctx.rot) * .5, y: fromY + 1.2, z: fromZ + Math.cos(ctx.rot) * .5 };
    const to = { x: toX, y: toY + .9, z: toZ };
    const beam = beamBetween(from, to, .3, addMat(t.main, 0));
    const beamCore = beamBetween(from, to, .12, addMat(0xffffff, 0));
    group.add(beam, beamCore);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 10), addMat(t.core, .98));
    const horn1 = new THREE.Mesh(new THREE.ConeGeometry(.06, .34, 5), addMat(t.core, .95));
    horn1.position.set(-.13, .3, 0);
    horn1.rotation.z = .5;
    const horn2 = horn1.clone();
    horn2.position.x = .13;
    horn2.rotation.z = -.5;
    head.add(horn1, horn2);
    group.add(head);
    const body = [];
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(.2 - i * .02, 10, 8), addMat(i % 2 ? t.main : t.accent, .85 - i * .06));
      group.add(s);
      body.push(s);
    }
    return { group, life: 1.0, tick: (dt, p) => {
      const fly = sstep(.05, .6, p);
      beam.material.opacity = .45 * Math.min(1, p * 5) * (1 - Math.max(0, (p - .75) / .25));
      beamCore.material.opacity = .8 * Math.min(1, p * 5) * (1 - Math.max(0, (p - .75) / .25));
      head.position.set(from.x + (to.x - from.x) * fly + Math.cos(p * 22) * .3 * (1 - fly),
        from.y + (to.y - from.y) * fly + Math.sin(p * 17) * .25, from.z + (to.z - from.z) * fly + Math.sin(p * 22) * .3 * (1 - fly));
      for (let i = 0; i < body.length; i++) {
        const q = Math.max(0, fly - (i + 1) * .05);
        body[i].position.set(from.x + (to.x - from.x) * q + Math.cos(p * 22 - i * .6) * .3 * (1 - q),
          from.y + (to.y - from.y) * q + Math.sin(p * 17 - i * .5) * .25,
          from.z + (to.z - from.z) * q + Math.sin(p * 22 - i * .6) * .3 * (1 - q));
      }
      if (Math.random() < .45 && p < .7) vfx.addTrailSpark(head.position.x, head.position.y, head.position.z,
        t.trail[Math.floor(Math.random() * t.trail.length)]);
      if (!ctx.__boom && fly >= 1) {
        ctx.__boom = true;
        vfx.shockwave({ x: toX, y: toY + .06, z: toZ, color: t.accent, maxRadius: Math.max(2.4, ctx.radius), duration: .45 });
        for (let i = 0; i < 12; i++) vfx.addTrailSpark(toX + (Math.random() - .5) * 1.6, toY + Math.random() * 1.4,
          toZ + (Math.random() - .5) * 1.6, t.trail[i % t.trail.length]);
      }
    } };
  },

  // Kiếm vũ — Phục Ma Kiếm Trận (Malevolent Shrine): lưới chém hiện dần phủ kín vùng nổ.
  12: (ctx) => {
    const { toX, toY, toZ, t, radius } = ctx;
    const group = new THREE.Group();
    const S = Math.max(2.6, radius * 1.4);
    const slashes = [];
    for (let i = 0; i < 4; i++) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(.07, 2.9, .07), addMat(t.core, 0));
      v.position.set(toX + (i - 1.5) * S / 3.4, toY + 1.3, toZ + (i % 2 ? .5 : -.5));
      const h = new THREE.Mesh(new THREE.BoxGeometry(2.9, .07, .07), addMat(t.main, 0));
      h.position.set(toX + (i % 2 ? .5 : -.5), toY + .5 + i * .55, toZ + (i - 1.5) * S / 3.4);
      group.add(v, h);
      slashes.push({ v, h });
    }
    const mist = new THREE.Mesh(new THREE.CircleGeometry(S * .75, 30), normMat(0x0c2a26, 0));
    mist.rotation.x = -Math.PI / 2;
    mist.position.set(toX, toY + .05, toZ);
    group.add(mist);
    return { group, life: 1.1, tick: (dt, p) => {
      mist.material.opacity = .45 * Math.min(1, p * 4) * (1 - Math.max(0, (p - .8) / .2));
      for (let i = 0; i < slashes.length; i++) {
        const start = .12 + i * .14;
        const q = sstep(start, start + .16, p) * (1 - sstep(start + .34, start + .5, p));
        slashes[i].v.material.opacity = .95 * q;
        slashes[i].h.material.opacity = .95 * q;
        slashes[i].v.scale.set(1, q >= 0 ? q : 0, 1);
        slashes[i].h.scale.set(q >= 0 ? q : 0, 1, 1);
        slashes[i].v.rotation.y += dt * .8;
        slashes[i].h.rotation.x += dt * .5;
      }
      if (!ctx.__rain && p > .3) {
        ctx.__rain = true;
        for (let i = 0; i < 10; i++) ctx.vfx.addTrailSpark(toX + (Math.random() - .5) * S * .8,
          toY + 2.4, toZ + (Math.random() - .5) * S * .8, t.trail[i % t.trail.length]);
      }
    } };
  },
  ...SUPREME_Q_TECHNIQUES, // 13 Thần bài, 14 Vua câu cá — pk-techniques-supreme.js
};

// ===== Lãnh vực thu nhỏ (mini Domain Expansion) cho hộ thể =====
// Builder nhận group hộ thể đã định vị tại chủ nhân; mọi phần gắn vào group nên dispose
// cùng nhóm. Trả tick(dt, p, sh) hoặc null nếu tông không có lãnh vực riêng.
const DOMAINS = {
  1: (group, t) => { // Sen kim — Phật chưởng vàng quanh thân
    const palms = [];
    for (let i = 0; i < 6; i++) {
      const palm = new THREE.Mesh(new THREE.BoxGeometry(.22, .32, .06), addMat(t.main, .8));
      group.add(palm);
      palms.push(palm);
    }
    return (dt, p) => {
      for (let i = 0; i < palms.length; i++) {
        const a = p * 2.2 + (i / palms.length) * Math.PI * 2;
        palms[i].position.set(Math.cos(a) * .95, .25 + Math.sin(p * 5 + i) * .2, Math.sin(a) * .95);
        palms[i].rotation.set(.2, -a, 0);
      }
    };
  },
  2: (group, t) => { // Lưu ly — mặt nước lộn ngược phía đầu
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.05, 26), addMat(t.main, .3));
    disc.rotation.x = Math.PI / 2;
    disc.position.y = .95;
    group.add(disc);
    return (dt, p) => {
      const w = 1 + Math.sin(p * 9) * .05;
      disc.scale.set(w, w, 1);
      disc.rotation.z += dt * .6;
    };
  },
  3: (group, t) => { // Tinh hà — tinh tú lơ lửng xoay chậm (Vô Lượng Không Gian)
    const stars = [];
    for (let i = 0; i < 22; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(.035 + Math.random() * .03), addMat(i % 3 ? 0xffffff : t.core, .95));
      s.userData = { a: Math.random() * Math.PI * 2, r: .5 + Math.random() * .65, h: -.2 + Math.random() * 1.1,
        w: .4 + Math.random() * .8 };
      group.add(s);
      stars.push(s);
    }
    return (dt, p) => {
      for (const s of stars) {
        const u = s.userData;
        u.a += dt * u.w;
        s.position.set(Math.cos(u.a) * u.r, u.h + Math.sin(p * 4 + u.r * 9) * .08, Math.sin(u.a) * u.r);
      }
    };
  },
  4: (group, t) => { // Hỏa diễm — lốc tàn lửa dâng
    const embers = [];
    for (let i = 0; i < 7; i++) {
      const e = new THREE.Mesh(new THREE.ConeGeometry(.06, .26, 5), addMat(i % 2 ? t.accent : t.main, .9));
      e.userData = { a: (i / 7) * Math.PI * 2, r: .55 + Math.random() * .5 };
      group.add(e);
      embers.push(e);
    }
    return (dt, p) => {
      for (const e of embers) {
        const u = e.userData;
        const q = (p * 1.4 + u.r) % 1;
        u.a += dt * 3;
        e.position.set(Math.cos(u.a) * u.r * (1 - q * .5), -.6 + q * 1.8, Math.sin(u.a) * u.r * (1 - q * .5));
        e.material.opacity = .9 * Math.sin(q * Math.PI);
      }
    };
  },
  5: (group, t) => { // Đào hoa — blizzard cánh đào quanh thân
    const petals = [];
    for (let i = 0; i < 10; i++) {
      const m = petal(i % 2 ? t.main : t.core);
      m.userData = { a: Math.random() * Math.PI * 2, r: .45 + Math.random() * .7, h: Math.random(), w: .8 + Math.random() };
      group.add(m);
      petals.push(m);
    }
    return (dt, p) => {
      for (const m of petals) {
        const u = m.userData;
        u.a += dt * u.w;
        const h = (u.h + p * .8) % 1;
        m.position.set(Math.cos(u.a) * u.r, -.6 + h * 1.8, Math.sin(u.a) * u.r);
        m.rotation.set(h * 6, u.a, 0);
      }
    };
  },
  6: (group, t) => { // Bích ngọc — lùm trúc nhỏ trong lãnh vực
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + .3;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.04, .06, 1.1, 5), normMat(0x2f8a4c, .9));
      b.position.set(Math.cos(a) * .95, -.2, Math.sin(a) * .95);
      b.rotation.z = (Math.random() - .5) * .16;
      group.add(b);
    }
    return null;
  },
  7: (group, t) => { // Nguyệt bạch — liềm trăng vờn quanh
    const moons = [];
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.RingGeometry(.18, .28, 18, 1, 0, Math.PI * .8), addMat(t.main, .9));
      group.add(c);
      moons.push(c);
    }
    return (dt, p) => {
      for (let i = 0; i < moons.length; i++) {
        const a = p * 1.6 + (i / moons.length) * Math.PI * 2;
        moons[i].position.set(Math.cos(a) * .85, .3 + Math.sin(p * 4 + i * 2) * .35, Math.sin(a) * .85);
        moons[i].rotation.set(-Math.PI / 2, 0, a + Math.PI / 2);
      }
    };
  },
  8: (group, t) => { // Hắc ám — tử điện chớp trong kết giới
    const bolts = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.015, .04, 1.3, 4), addMat(t.core, 0));
      b.position.set((Math.random() - .5) * 1.2, .2, (Math.random() - .5) * 1.2);
      b.rotation.z = (Math.random() - .5) * 2;
      group.add(b);
      bolts.push(b);
    }
    return (dt, p) => {
      for (const b of bolts) b.material.opacity = Math.random() < .12 ? .85 : .06;
    };
  },
  9: (group, t) => { // Long quyền — song long hỏa quấn thân ngược chiều
    const coils = [];
    for (let c = 0; c < 2; c++) {
      const segs = [];
      for (let i = 0; i < 6; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(.12 - i * .012, 8, 7), addMat(i % 2 ? t.accent : t.main, .85 - i * .06));
        group.add(s);
        segs.push(s);
      }
      coils.push(segs);
    }
    return (dt, p) => {
      for (let c = 0; c < 2; c++) {
        const dir = c ? -1 : 1;
        for (let i = 0; i < coils[c].length; i++) {
          const a = p * 3.2 * dir + c * Math.PI + i * .5;
          coils[c][i].position.set(Math.cos(a) * 1.05, -.1 + Math.sin(a * 2) * .3 + i * .12, Math.sin(a) * 1.05);
        }
      }
    };
  },
  10: (group, t) => { // Xích diễm — vách xích viêm quay quanh
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.28, 1.7, 18, 1, true), addMat(t.main, .22));
    wall.position.y = .1;
    group.add(wall);
    return (dt, p) => {
      wall.rotation.y += dt * 1.4;
      wall.material.opacity = .2 + Math.sin(p * 11) * .06;
    };
  },
  11: (group, t) => { // Kim long — long vàng quấn quanh thân
    const segs = [];
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(.13 - i * .012, 8, 7), addMat(i % 2 ? t.main : t.accent, .88 - i * .06));
      group.add(s);
      segs.push(s);
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(.17, 10, 8), addMat(t.core, .98));
    group.add(head);
    return (dt, p) => {
      const a0 = p * 2.6;
      head.position.set(Math.cos(a0) * 1.05, .1 + Math.sin(a0 * 2) * .35, Math.sin(a0) * 1.05);
      for (let i = 0; i < segs.length; i++) {
        const a = a0 - (i + 1) * .38;
        segs[i].position.set(Math.cos(a) * 1.05, .1 + Math.sin(a * 2) * .35 - i * .05, Math.sin(a) * 1.05);
      }
    };
  },
  12: (group, t) => { // Kiếm vũ — lưới trảm chớp trong lãnh vực
    const slashes = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(.05, i % 2 ? 1.6 : 1.1, .05), addMat(i % 2 ? t.main : t.core, 0));
      s.position.set((Math.random() - .5) * 1.6, .1, (Math.random() - .5) * 1.6);
      s.rotation.set(Math.random() * .8, Math.random() * Math.PI, (Math.random() - .5) * 1.2);
      group.add(s);
      slashes.push(s);
    }
    return (dt, p) => {
      for (let i = 0; i < slashes.length; i++) {
        const q = ((p * 2 + i * .17) % 1);
        slashes[i].material.opacity = q < .12 ? q / .12 * .95 : Math.max(0, .95 * (1 - (q - .12) / .3));
      }
    };
  },
  ...SUPREME_DOMAINS, // 13 Thần bài, 14 Vua câu cá — pk-techniques-supreme.js
};

// Sinh tuyệt kỹ Q cho effect; trả true nếu đã đảm nhiệm (PkVfx bỏ qua đường bay cũ).
export function spawnQTechnique(vfx, ev) {
  const build = Q_TECHNIQUES[ev.effect];
  if (!build) return false;
  const ctx = { ...ev, vfx, scene: vfx.scene };
  const { group, life, tick } = build(ctx);
  vfx.scene.add(group);
  vfx.techniques.push({ group, age: 0, life, tick });
  return true;
}

// Gắn Lãnh vực thu nhỏ vào group hộ thể; trả tick hoặc null.
export function spawnDomain(group, effect, t) {
  const build = DOMAINS[effect];
  if (!build) return null;
  const tick = build(group, t);
  return tick ? { tick } : null;
}
