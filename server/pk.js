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
    // Kit được chém quét đa mục tiêu (maxTargets), mặc định một mục tiêu như cũ.
    const cap = type === 'strike' ? (skill?.maxTargets ?? 1) : Infinity;
    return targets.slice(0, cap).map(({ player }) => player);
  }
  // Trừ HP một mục tiêu theo kit của NGƯỜI ĐÓN (khiên giảm sâu/nông là của họ), trả entry
  // hits kèm cờ shielded; khiêng gậy lại (reflect) một phần lên kẻ đánh, không giết (chừa 1 HP).
  hurt(attacker, target, rawDamage, now) {
    const hitX = target.x, hitZ = target.z;
    const defense = target.combat ??= fresh();
    const defKit = pkKitForEffect(target.effect);
    const shielded = defense.shieldUntil > now;
    let damage = 0;
    let targetHp = defense.hp;
    if (defense.protectedUntil <= now && defense.iframeUntil <= now) {
      damage = shielded ? Math.max(1, Math.round(rawDamage * (1 - defKit.skills.shield.reduction))) : rawDamage;
      defense.hp = Math.max(0, defense.hp - damage);
      targetHp = defense.hp; // chụp ngay sau đòn, trước khi hồi sinh đệm HP đầy
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
    const hit = { sid: target.sid, x: hitX, z: hitZ, damage, targetHp, shielded };
    const reflect = shielded && damage > 0 ? (defKit.skills.shield.reflect ?? 0) : 0;
    if (reflect > 0) {
      const atk = attacker.combat ??= fresh();
      const back = Math.max(0, Math.min(atk.hp - 1, Math.round(damage * reflect)));
      if (back > 0) {
        atk.hp -= back;
        this.emitState(attacker, now);
        hit.reflected = back;
      }
    }
    return hit;
  }
  // Hút khí huyết theo kit TẤN CÔNG của kẻ ra chiêu; hồi không vượt mức máu đã mất.
  lifesteal(attacker, totalDamage, ratio, now) {
    if (!(ratio > 0) || !(totalDamage > 0)) return 0;
    const atk = attacker.combat ??= fresh();
    const heal = Math.min(PK.baseHp - atk.hp, Math.round(totalDamage * ratio));
    if (heal <= 0) return 0;
    atk.hp += heal;
    this.emitState(attacker, now);
    return heal;
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
      const toX0 = fromX + Math.sin(player.rot) * skill.distance;
      const toZ0 = fromZ + Math.cos(player.rot) * skill.distance;
      const pos = resolveCollision(toX0, toZ0);
      player.x = round2(pos.x); player.z = round2(pos.z);
      player.anim = 0; player.dirty = true;
      c.iframeUntil = now + skill.iframe;
      // Kit xung kích (damage trên thân): mọi người đứng trên đường lướt đều chịu đòn.
      const hits = [];
      if (skill.damage > 0) {
        const dx = player.x - fromX, dz = player.z - fromZ;
        const len2 = dx * dx + dz * dz || 1;
        for (const p of this.players.values()) {
          if (p === player || !p.socket) continue;
          const t = Math.max(0, Math.min(1, ((p.x - fromX) * dx + (p.z - fromZ) * dz) / len2));
          if (Math.hypot(p.x - (fromX + dx * t), p.z - (fromZ + dz * t)) > 0.9) continue;
          hits.push(this.hurt(player, p, skill.damage, now));
        }
      }
      this.io.emit('pk:skill', { type, attackerSid: player.sid, effect: player.effect, fromX, fromZ, toX: player.x, toZ: player.z, rot: player.rot, at: now, hits });
      return { ok: true, type, x: player.x, z: player.z, hits, cooldownUntil: c.cooldowns[type] };
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
    let totalDamage = 0;
    for (const target of targets) {
      const hit = this.hurt(player, target, skill.damage, now);
      totalDamage += hit.damage;
      hits.push(hit);
    }
    this.lifesteal(player, totalDamage, skill.lifesteal ?? 0, now);
    // Kit kéo địch (pull): sau khi tính đòn, rút mục tiêu trúng đòn về gần kẻ ra chiêu.
    if ((skill.pull ?? 0) > 0) {
      for (const target of targets) {
        const hit = hits.find((h) => h.sid === target.sid);
        if (!hit || hit.damage <= 0) continue;
        const dx = player.x - target.x, dz = player.z - target.z;
        const d = Math.hypot(dx, dz) || 1;
        const step = Math.min(skill.pull, Math.max(0, d - 0.6)); // không kéo sát vào người
        if (step <= 0) continue;
        const pos = resolveCollision(target.x + (dx / d) * step, target.z + (dz / d) * step);
        target.x = round2(pos.x); target.z = round2(pos.z); target.dirty = true;
      }
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
