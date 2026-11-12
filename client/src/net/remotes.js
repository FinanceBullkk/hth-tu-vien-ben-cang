// Nhân vật của người khác: nhận gói vị trí và nội suy lùi 120 ms cho chuyển động mượt.
import { floorHeight } from '../../../shared/layout.js';
import { Avatar } from '../player/avatar.js';

const INTERP_DELAY = 120;
const GAP_MS = 400;

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
      buf: [{ t: nowMs, x: p.x, z: p.z, rot: p.rot, anim: p.anim ?? 0 }],
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
      if (this.map.has(p.sid)) this.applyRow([p.sid, p.x, p.z, p.rot, p.anim, p.activity], nowMs);
      else this.add(p, nowMs);
    }
  }

  applyRow(row, t) {
    const r = this.map.get(row[0]);
    if (!r) return;
    const last = r.buf[r.buf.length - 1];
    // Vừa đứng yên lâu rồi mới đi: chèn mốc giả để khỏi trượt dài từ mẫu cũ.
    if (last && t - last.t > GAP_MS) {
      r.buf.push({ t: t - 100, x: last.x, z: last.z, rot: last.rot, anim: 0 });
    }
    r.buf.push({ t, x: row[1], z: row[2], rot: row[3], anim: row[4] });
    if (r.buf.length > 24) r.buf.splice(0, r.buf.length - 24);
    r.avatar.setActivity(row[5] ?? 0);
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
    const renderT = serverNow - INTERP_DELAY;
    for (const r of this.map.values()) {
      const buf = r.buf;
      while (buf.length >= 2 && buf[1].t <= renderT) buf.shift();
      const a = buf[0];
      const b = buf[1];
      if (b && b.t > a.t && renderT >= a.t) {
        const k = Math.min(1, (renderT - a.t) / (b.t - a.t));
        r.x = a.x + (b.x - a.x) * k;
        r.z = a.z + (b.z - a.z) * k;
        r.rot = lerpAngle(a.rot, b.rot, k);
        r.anim = b.anim;
      } else if (a) {
        r.x = a.x;
        r.z = a.z;
        r.rot = a.rot;
        r.anim = a.anim;
      }
      const floorY = floorHeight(r.x, r.z);
      r.y += (floorY - r.y) * Math.min(1, dt * 10);
      r.avatar.root.position.set(r.x, r.y, r.z);
      r.avatar.root.rotation.y = lerpAngle(r.avatar.root.rotation.y, r.rot, Math.min(1, dt * 16));
      const d = camera.position.distanceTo(r.avatar.root.position);
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
