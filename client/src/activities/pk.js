import * as THREE from 'three';
import { PkPanel } from '../ui/pk-panel.js';
import { floorHeight } from '../../../shared/layout.js';
import { PK_ATTACK, PK_SKILLS } from '../../../shared/pk.js';

export class PkActivity {
  constructor(app) {
    this.app = app;
    this.cooldowns = { strike: 0, slashQ: 0, shield: 0, dash: 0 };
    this.status = { hp: 100, maxHp: 100, protectedUntil: 0, satKhiUntil: 0 };
    this.aimRay = new THREE.Raycaster();
    this.aimNdc = new THREE.Vector2();
    this.aimGround = new THREE.Plane(new THREE.Vector3(0, 1, 0));
    this.aimPoint = new THREE.Vector3();
    this.panel = new PkPanel(app, this);
  }

  bind() {
    const { net } = this.app;
    net.on('pk:status', (state) => {
      if (state.sid === this.app.sid) {
        this.status = state;
        this.panel.updateFreeRoam(this.cooldowns);
        this.app.me.avatar.setCombatStatus(state.protectedUntil ? 'Bảo hộ' : state.satKhiUntil ? 'Sát khí' : '');
      } else {
        const r = this.app.remotes.map.get(state.sid);
        if (r) r.avatar.setCombatStatus(state.protectedUntil ? 'Bảo hộ' : state.satKhiUntil ? 'Sát khí' : '');
      }
    });
    net.on('pk:respawn', (event) => {
      if (event.sid === this.app.sid) {
        this.app.activities.abort();
        this.app.me.placeAt(event.x, event.z, event.rot);
        this.panel.showBanner('HỒI SINH · BẢO HỘ 30 GIÂY', 2500);
      } else {
        const r = this.app.remotes.map.get(event.sid);
        if (r) {
          r.x = event.x; r.z = event.z; r.rot = event.rot;
          // Dịch chuyển tức thì: tạo lại bộ phát mượt (remote-motion.js) tại điểm hồi sinh.
          r.motion = new r.motion.constructor(event.x, event.z, event.rot, 0, this.app.net.now());
          r.avatar.root.position.set(event.x, r.y, event.z);
        }
      }
    });
    net.on('pk:strike', (event) => this.onStrike(event));
    net.on('pk:skill', (event) => this.onSkill(event));
    window.addEventListener('contextmenu', (event) => {
      if (!event.target.closest('input, textarea, [role="dialog"]')) event.preventDefault();
    });
  }

  setSnapshot(me, others) {
    this.status = me.combat ?? this.status;
    this.panel.updateFreeRoam(this.cooldowns);
    this.app.me.avatar.setCombatStatus(this.status.protectedUntil ? 'Bảo hộ' : this.status.satKhiUntil ? 'Sát khí' : '');
    for (const p of others) {
      const r = this.app.remotes.map.get(p.sid);
      if (r) r.avatar.setCombatStatus(p.combat?.protectedUntil ? 'Bảo hộ' : p.combat?.satKhiUntil ? 'Sát khí' : '');
    }
  }

  aimRotation(point) {
    const { input, camera, me } = this.app;
    const x = input.pointerLocked ? window.innerWidth / 2 : point?.x ?? input.pointerX;
    const y = input.pointerLocked ? window.innerHeight / 2 : point?.y ?? input.pointerY;
    this.aimNdc.set(x / window.innerWidth * 2 - 1, 1 - y / window.innerHeight * 2);
    this.aimRay.setFromCamera(this.aimNdc, camera);
    this.aimGround.constant = -floorHeight(me.x, me.z);
    const hit = this.aimRay.ray.intersectPlane(this.aimGround, this.aimPoint);
    const dx = hit ? hit.x - me.x : this.aimRay.ray.direction.x;
    const dz = hit ? hit.z - me.z : this.aimRay.ray.direction.z;
    this.aimDistance = hit ? Math.hypot(dx, dz) : PK_SKILLS.slashQ.range;
    return Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : me.rot;
  }

  async use(type = 'strike', point) {
    if (this.app.modalBusy() || this.app.activities.current) return;
    const now = this.app.net.now();
    if (this.cooldowns[type] > now) return;
    const duration = type === 'strike' ? PK_ATTACK.cooldown : PK_SKILLS[type]?.cooldown;
    if (!duration) return;
    this.cooldowns[type] = now + duration;
    const me = this.app.me;
    if (type !== 'shield') me.placeAt(me.x, me.z, this.aimRotation(point));
    const aimDistance = type === 'slashQ'
      ? Math.max(1.5, Math.min(PK_SKILLS.slashQ.range, this.aimDistance)) : undefined;
    if (type === 'strike') {
      me.avatar.slash();
      this.app.world.pkVfx.slash({ x: me.x, y: me.y, z: me.z, rot: me.rot });
    } else if (type === 'slashQ') {
      me.avatar.slash();
      this.app.world.pkVfx.projectile({ fromX: me.x, fromZ: me.z,
        toX: me.x + Math.sin(me.rot) * aimDistance, toZ: me.z + Math.cos(me.rot) * aimDistance,
        rot: me.rot, radius: PK_SKILLS.slashQ.burstRadius });
    }
    const fromX = me.x, fromZ = me.z;
    const result = await this.app.net.call('pk:attack', { type, rot: type === 'shield' ? undefined : me.rot,
      aimDistance });
    if (!result?.ok) {
      this.cooldowns[type] = 0;
      if (result?.error) this.app.hud.toast(result.error);
    } else if (type === 'dash') {
      me.placeAt(result.x, result.z, me.rot);
      this.app.world.pkVfx.dash({ fromX, fromZ, toX: result.x, toZ: result.z, rot: me.rot });
    } else if (type === 'shield') {
      this.app.world.pkVfx.shield({ x: me.x, y: me.y, z: me.z, duration: 1600,
        targetFn: () => ({ x: me.x, y: me.y, z: me.z }) });
    }
  }

  onStrike(event) {
    if (event.attackerSid !== this.app.sid) {
      const r = this.app.remotes.map.get(event.attackerSid);
      if (r) {
        r.avatar.slash();
        this.app.world.pkVfx.slash({ x: r.x, y: r.y, z: r.z, rot: event.rot });
      }
    }
    this.hit(event);
  }

  onSkill(event) {
    const r = this.app.remotes.map.get(event.attackerSid);
    if (event.type === 'slashQ') {
      if (r) {
        r.avatar.slash();
        this.app.world.pkVfx.projectile({ fromX: event.fromX, fromZ: event.fromZ,
          toX: event.toX, toZ: event.toZ, rot: event.rot, radius: event.radius, isHit: event.isHit });
      }
      this.hit(event);
    } else if (event.type === 'dash' && r) {
      r.x = event.toX; r.z = event.toZ;
      this.app.world.pkVfx.dash(event);
    } else if (event.type === 'shield' && r) {
      this.app.world.pkVfx.shield({ x: r.x, y: r.y, z: r.z, duration: event.duration,
        targetFn: () => ({ x: r.x, y: r.y, z: r.z }) });
    }
  }

  hit(event) {
    for (const impact of event.hits ?? [{ sid: event.targetSid, damage: event.damage }]) {
      if (!impact.damage) continue;
      const local = impact.sid === this.app.sid;
      const target = local ? this.app.me : this.app.remotes.map.get(impact.sid);
      if (!target) continue;
      if (impact.targetHp !== 0) target.avatar.flinch();
      const x = impact.x ?? target.x, z = impact.z ?? target.z;
      this.app.world.pkVfx.hit({ x, y: floorHeight(x, z), z, damage: impact.damage,
        isShielded: impact.damage < (event.type === 'slashQ' ? 16 : 20) });
      if (local) this.app.follow?.shake?.(0.16);
    }
  }

  update() { this.panel.updateFreeRoam(this.cooldowns); }
  onKey(code, down) {
    if (!down) return false;
    const type = { Digit1: 'strike', Digit2: 'slashQ', Digit3: 'shield', Digit4: 'dash' }[code];
    if (!type) return false;
    this.use(type);
    return true;
  }
}
