// Nhân vật của người khác: nhận gói vị trí rồi phát lại mượt, xem remote-motion.js.
import { floorHeight } from '../../../shared/layout.js';
import { Avatar } from '../player/avatar.js';
import { trimShadowCasters, updateAvatarLod } from '../player/avatar-lod.js';
import { RemoteMotion } from './remote-motion.js';

function lerpAngle(a, b, k) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * k;
}

export class Remotes {
  constructor(scene, lowQuality = false) {
    this.scene = scene;
    this.lowQuality = lowQuality;
    this.map = new Map();
    this.leaving = [];
    this.walking = false;
  }

  add(p, nowMs) {
    if (this.map.has(p.sid)) return this.map.get(p.sid);
    const avatar = new Avatar({
      name: p.name,
      color: p.color,
      hair: p.hair ?? (p.hat <= 2 ? p.hat : 0),
      hat: p.hat,
      attire: p.attire ?? 0,
      weapon: p.weapon ?? 0,
      effect: p.effect ?? 0,
      lowQuality: this.lowQuality,
    });
    avatar.root.position.set(p.x, floorHeight(p.x, p.z), p.z);
    avatar.root.rotation.y = p.rot;
    avatar.setActivity(p.activity ?? 0);
    avatar.setCultivation(p.cultivationTier ?? 0);
    avatar.setQi(p.qi ?? 0);
    trimShadowCasters(avatar);
    this.scene.add(avatar.root);
    const r = {
      sid: p.sid,
      name: p.name,
      avatar,
      y: floorHeight(p.x, p.z),
      x: p.x,
      z: p.z,
      rot: p.rot,
      anim: p.anim ?? 0,
      far: false,
      motion: new RemoteMotion(p.x, p.z, p.rot, p.anim ?? 0, nowMs),
    };
    this.map.set(p.sid, r);
    return r;
  }

  /** Đồng bộ danh sách từ snapshot sau khi vào phòng hoặc kết nối lại. */
  sync(players, nowMs) {
    const ids = new Set(players.map((p) => p.sid));
    for (const sid of [...this.map.keys()]) {
      if (!ids.has(sid)) this.remove(sid);
    }
    for (const p of players) {
      if (this.map.has(p.sid)) {
        this.applyRow([p.sid, p.x, p.z, p.rot, p.anim, p.activity, 0, p.qi ?? 0], nowMs, nowMs);
        this.map.get(p.sid).avatar.setCultivation(p.cultivationTier ?? 0);
      }
      else this.add(p, nowMs);
    }
  }

  applyRow(row, t, arrivedAt) {
    const r = this.map.get(row[0]);
    if (!r) return;
    r.motion.push(t, row[1], row[2], row[3], row[4], arrivedAt);
    r.avatar.setActivity(row[5] ?? 0);
    r.avatar.setQi(row[7] ?? 0);
  }

  remove(sid) {
    const r = this.map.get(sid);
    if (!r) return null;
    this.map.delete(sid);
    r.avatar.fadeOut();
    this.leaving.push(r);
    return r;
  }

  update(dt, serverNow, camera) {
    this.walking = false;
    for (const r of this.map.values()) {
      const m = r.motion;
      m.update(dt, serverNow);
      r.x = m.x;
      r.z = m.z;
      r.rot = m.rot;
      r.anim = m.anim;
      if (r.anim === 1) this.walking = true;
      const floorY = floorHeight(r.x, r.z);
      r.y += (floorY - r.y) * Math.min(1, dt * 10);
      r.avatar.root.position.set(r.x, r.y, r.z);
      r.avatar.root.rotation.y = lerpAngle(r.avatar.root.rotation.y, r.rot, Math.min(1, dt * 16));
      const d = camera.position.distanceTo(r.avatar.root.position);
      r.far = updateAvatarLod(r.avatar, d, r.far);
      r.avatar.update(dt, r.anim === 1, d);
    }
    for (let i = this.leaving.length - 1; i >= 0; i--) {
      const r = this.leaving[i];
      r.avatar.update(dt, false, 0);
      if (r.avatar.fading <= 0) {
        r.avatar.dispose(this.scene);
        this.leaving.splice(i, 1);
      }
    }
  }

  /** Người chơi trúng tia chạm/click. */
  atRay(ray) {
    let best = null;
    let bestT = Infinity;
    const p = this._p;
    for (const r of this.map.values()) {
      p.set(r.x, r.y + 0.8, r.z);
      if (ray.distanceSqToPoint(p) < 0.42) {
        const d = ray.origin.distanceTo(p);
        if (d < bestT && d < 30) {
          best = r;
          bestT = d;
        }
      }
    }
    return best;
  }
}
