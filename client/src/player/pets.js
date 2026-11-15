// Thú cưng phía client: thú đi theo của mọi người (theo sid) và bản sao chuồng thú của mình để bảng thú cưng hiển thị.
// Chỉ để vẽ; ấp trứng, dắt thú, cho ăn đều gửi lên server rồi áp kết quả server trả về.
import * as THREE from 'three';
import { PET, PETS, isPetKind } from '../../../shared/pets.js';
import { floater } from '../ui/floater.js';
import { PetFollower } from './pet-follower.js';

const DRAW_DIST = 42; // Xa hơn thì không vẽ thú của người khác.
const PICK_DIST = 0.5; // Bán kính bấm trúng thú (m) quanh giữa thân.
const PET_WORDS = ['❤️', '💕', '✨', '😊'];

export class PetManager {
  constructor(app) {
    this.app = app;
    this.followers = new Map(); // sid -> PetFollower
    this.mine = { list: [], active: -1, pity: 0, eggPrice: PET.eggPrice };
    this.listeners = new Set();
    this._v = new THREE.Vector3();
    this._owner = { x: 0, y: 0, z: 0, rot: 0 };
  }

  /** Chuồng thú của mình từ snapshot hay kết quả ấp trứng. */
  applyMine(state) {
    if (!state) return;
    for (const key of ['active', 'pity', 'eggPrice']) if (Number.isFinite(state[key])) this.mine[key] = state[key];
    if (Array.isArray(state.list)) this.mine.list = state.list;
    for (const fn of this.listeners) fn(this.mine);
  }

  /** Cập nhật một thú trong chuồng (sau khi cho ăn). */
  patchMine(kind, fields) {
    this.applyMine({ list: this.mine.list.map((p) => (p.kind === kind ? { ...p, ...fields } : p)) });
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Thú đi theo người sid: kind -1 là không dắt. */
  set(sid, kind, tier = 0) {
    const cur = this.followers.get(sid);
    if (!isPetKind(kind)) {
      if (cur) this.remove(sid);
      return;
    }
    if (cur?.kind === kind) {
      cur.setTier(tier);
      return;
    }
    if (cur) cur.dispose();
    this.followers.set(sid, new PetFollower(this.app.scene, kind, tier));
  }

  remove(sid) {
    this.followers.get(sid)?.dispose();
    this.followers.delete(sid);
  }

  /** Sau khi vào phòng hoặc kết nối lại: dựng đúng thú của mọi người đang online. */
  sync(me, players) {
    const keep = new Set([me.sid, ...players.map((p) => p.sid)]);
    for (const sid of [...this.followers.keys()]) if (!keep.has(sid)) this.remove(sid);
    for (const p of [me, ...players]) this.set(p.sid, p.pet ?? -1, p.petTier ?? 0);
  }

  #owner(sid) {
    const { app } = this;
    const o = this._owner;
    if (sid === app.sid) {
      o.x = app.me.x;
      o.y = app.me.y;
      o.z = app.me.z;
      o.rot = app.me.avatar.root.rotation.y;
      return o;
    }
    const r = app.remotes.map.get(sid);
    if (!r) return null;
    o.x = r.x;
    o.y = r.y;
    o.z = r.z;
    o.rot = r.avatar.root.rotation.y;
    return o;
  }

  update(dt) {
    const cam = this.app.camera.position;
    for (const [sid, f] of this.followers) {
      const owner = this.#owner(sid);
      if (!owner) {
        f.update(dt, null, false);
        continue;
      }
      const near = sid === this.app.sid || Math.hypot(owner.x - cam.x, owner.z - cam.z) < DRAW_DIST;
      f.update(dt, owner, near);
    }
  }

  /** Ai đó cho thú ăn: cúi đầu nhai, tim bay lên; lên bậc thì hiệu ứng mới hiện ngay. */
  onFed({ sid, tier }) {
    const f = this.followers.get(sid);
    if (!f) return;
    f.feed();
    f.setTier(tier);
    if (f.root.visible) {
      const at = f.center(this._v);
      floater(this.app, at, '😋');
      floater(this.app, at, '❤️', 0.5);
    }
  }

  /** Thú bị bấm trúng (của mình hay người khác): vuốt ve, chỉ máy mình thấy tim. Trả true nếu trúng. */
  petAtRay(ray) {
    let best = null;
    let bestD = Infinity;
    for (const f of this.followers.values()) {
      if (!f.root.visible) continue;
      const c = f.center(this._v);
      if (ray.distanceSqToPoint(c) > PICK_DIST * PICK_DIST) continue;
      const d = ray.origin.distanceTo(c);
      if (d < bestD && d < 25) {
        best = f;
        bestD = d;
      }
    }
    if (!best) return false;
    best.cheer();
    const at = best.center(this._v);
    floater(this.app, at, PET_WORDS[Math.floor(Math.random() * PET_WORDS.length)]);
    floater(this.app, at, PETS[best.kind]?.name ?? '', 0.15);
    this.app.audio.pop?.();
    return true;
  }

  /** Nối sự kiện mạng: thú của người khác đổi, người vào/rời, cho ăn. */
  bind(net) {
    net.on('player:pet', ({ sid, pet, tier }) => this.set(sid, pet, tier));
    net.on('pet:fed', (data) => this.onFed(data));
    // Người khác nở được Linh thú, Thần thú: báo cả tu viện (của mình thì bảng thú cưng đã có hoạt cảnh).
    net.on('pet:hatched', ({ sid, kind }) => {
      const who = this.app.remotes.map.get(sid)?.name;
      if (sid !== this.app.sid && who && PETS[kind]) this.app.hud.toast(`${who} vừa ấp được ${PETS[kind].name}!`, { ms: 4500 });
    });
    net.on('player:join', (p) => this.set(p.sid, p.pet ?? -1, p.petTier ?? 0));
    net.on('player:leave', ({ sid }) => this.remove(sid));
  }
}
