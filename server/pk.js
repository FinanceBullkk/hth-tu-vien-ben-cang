import { ACTIVITY } from '../shared/protocol.js';
import { SPAWN, resolveCollision } from '../shared/layout.js';
import { PK, PK_ATTACK, PK_SKILLS, pkKitForEffect } from '../shared/pk.js';

const round2 = (n) => Math.round(n * 100) / 100;
const fresh = () => ({ hp: PK.baseHp, cooldowns: {}, shieldUntil: 0, iframeUntil: 0, protectedUntil: 0, satKhiUntil: 0 });

export class PkGame {
  constructor({ io }) { this.io = io; this.players = null; }
  bind(players) { this.players = players; }
  state(player, now = Date.now()) {
    const c = player.combat ??= fresh();
    return { hp: c.hp, maxHp: PK.baseHp, protectedUntil: c.protectedUntil > now ? c.protectedUntil : 0,
      satKhiUntil: c.satKhiUntil > now ? c.satKhiUntil : 0 };
  }
  emitState(player, now = Date.now()) {
    this.io.emit('pk:status', { sid: player.sid, ...this.state(player, now) });
    player.dirty = true;
  }
  targets(attacker, type, center, skill) {
    const range = (skill?.range ?? PK_ATTACK.range) + 0.4;
    const fx = Math.sin(attacker.rot), fz = Math.cos(attacker.rot);
    const targets = [];
    for (const p of this.players.values()) {
      if (p === attacker || !p.socket) continue;
      const dx = p.x - attacker.x, dz = p.z - attacker.z;
      const forward = dx * fx + dz * fz;
      const d = Math.hypot(dx, dz);
      const aligned = type === 'strike'
        ? d <= range && forward / (d || 1) >= (skill?.coneAngleCos ?? PK_ATTACK.coneAngleCos)
        : Math.hypot(p.x - center.x, p.z - center.z) <= (skill?.burstRadius ?? PK_SKILLS.slashQ.burstRadius);
      if (aligned) targets.push({ player: p, distance: d });
    }
    targets.sort((a, b) => a.distance - b.distance);
    return type === 'strike' ? targets.slice(0, 1).map(({ player }) => player) : targets.map(({ player }) => player);
  }
  attack(player, data) {
    const type = data?.type ?? 'strike';
    if (!['strike', 'slashQ', 'dash', 'shield'].includes(type)) return { ok: false, error: 'Chiêu thức không hợp lệ.' };
    if (!player.socket || player.activity !== ACTIVITY.none) return { ok: false, error: 'Đang bận.' };
    const now = Date.now();
    const c = player.combat ??= fresh();
    const kit = pkKitForEffect(player.effect);
    const skill = type === 'strike' ? (kit.skills.attack ?? PK_ATTACK) : kit.skills[type];
    if (data?.rot !== undefined && (!Number.isFinite(data.rot) || Math.abs(data.rot) > 1e6)) {
      return { ok: false, error: 'Hướng đánh không hợp lệ.' };
    }
    if (data?.aimDistance !== undefined && (!Number.isFinite(data.aimDistance) || Math.abs(data.aimDistance) > 1e6)) {
      return { ok: false, error: 'Điểm ngắm không hợp lệ.' };
    }
    if ((c.cooldowns[type] ?? 0) > now) return { ok: false, error: 'Chiêu chưa hồi.' };
    c.cooldowns[type] = now + skill.cooldown;
    if (type !== 'shield' && data?.rot !== undefined) {
      player.rot = round2(Math.atan2(Math.sin(data.rot), Math.cos(data.rot)));
      player.dirty = true;
    }
    if (type === 'dash') {
      const fromX = player.x, fromZ = player.z;
      const pos = resolveCollision(fromX + Math.sin(player.rot) * skill.distance, fromZ + Math.cos(player.rot) * skill.distance);
      player.x = round2(pos.x); player.z = round2(pos.z); player.anim = 0; player.dirty = true;
      c.iframeUntil = now + skill.iframe;
      this.io.emit('pk:skill', { type, attackerSid: player.sid, effect: player.effect, fromX, fromZ, toX: player.x, toZ: player.z, rot: player.rot, at: now });
      return { ok: true, type, x: player.x, z: player.z, cooldownUntil: c.cooldowns[type] };
    }
    if (type === 'shield') {
      c.shieldUntil = now + skill.duration;
      this.io.emit('pk:skill', { type, attackerSid: player.sid, effect: player.effect, duration: skill.duration, at: now });
      return { ok: true, type, cooldownUntil: c.cooldowns[type] };
    }
    // Xuất chiêu gây hại phá bảo hộ, kể cả khi đòn trượt.
    if (c.protectedUntil > now) c.protectedUntil = 0;
    c.satKhiUntil = now + PK.satKhiMs;
    this.emitState(player, now);
    const aimDistance = type === 'slashQ'
      ? Math.max(1.5, Math.min(skill.range, data?.aimDistance ?? skill.range)) : 0;
    const center = type === 'slashQ'
      ? { x: round2(player.x + Math.sin(player.rot) * aimDistance), z: round2(player.z + Math.cos(player.rot) * aimDistance) }
      : null;
    const targets = this.targets(player, type, center, skill);
    const hits = [];
    for (const target of targets) {
      const hitX = target.x, hitZ = target.z;
      const defense = target.combat ??= fresh();
      let damage = 0;
      let targetHp = defense.hp;
      if (defense.protectedUntil <= now && defense.iframeUntil <= now) {
        damage = defense.shieldUntil > now ? Math.max(1, Math.round(skill.damage * (1 - PK_SKILLS.shield.reduction))) : skill.damage;
        defense.hp = Math.max(0, defense.hp - damage);
        targetHp = defense.hp;
        this.emitState(target, now);
        if (defense.hp === 0) {
          this.onKnockout?.(target);
          defense.hp = PK.baseHp;
          defense.protectedUntil = now + PK.respawnShieldMs;
          defense.satKhiUntil = 0;
          defense.shieldUntil = 0;
          target.x = SPAWN.x; target.z = SPAWN.z; target.rot = SPAWN.rot; target.anim = 0;
          this.io.emit('pk:respawn', { sid: target.sid, x: target.x, z: target.z, rot: target.rot, protectedUntil: defense.protectedUntil });
          this.emitState(target, now);
        }
      }
      hits.push({ sid: target.sid, x: hitX, z: hitZ, damage, targetHp });
    }
    const first = hits[0];
    const event = { type, attackerSid: player.sid, effect: player.effect, targetSid: first?.sid, isHit: hits.some((hit) => hit.damage > 0),
      damage: first?.damage ?? 0, targetHp: first?.targetHp, hits,
      fromX: player.x, fromZ: player.z, rot: player.rot, at: now };
    if (type === 'slashQ') {
      event.toX = center.x;
      event.toZ = center.z;
      event.radius = skill.burstRadius;
    }
    this.io.emit(type === 'strike' ? 'pk:strike' : 'pk:skill', event);
    return { ok: true, type, isHit: event.isHit, targetHp: first?.targetHp, hits, cooldownUntil: c.cooldowns[type] };
  }
  skill(player, data) { return this.attack(player, data); }
  sweep(now = Date.now()) {
    for (const player of this.players.values()) {
      const c = player.combat;
      if (!c) continue;
      if (c.protectedUntil && c.protectedUntil <= now) { c.protectedUntil = 0; this.emitState(player, now); }
      if (c.satKhiUntil && c.satKhiUntil <= now) { c.satKhiUntil = 0; this.emitState(player, now); }
    }
  }
}
