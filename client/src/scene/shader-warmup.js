// Biên dịch shader trước và giữ lại, để không khựng lúc ra chiêu PK hay khi người mặc hào quang bước vào.
// Trên Windows (ANGLE/D3D11) mỗi shader mới tốn 10-40 ms ngay trên máy bàn mạnh, laptop văn phòng gấp vài lần.
import * as THREE from 'three';
import { AVATAR, ACTIVITY } from '../../../shared/protocol.js';
import { QI_TIERS } from '../../../shared/cultivation.js';
import { Avatar } from '../player/avatar.js';
import { PkVfx } from './pk-vfx.js';
import { pinShaderPrograms } from './render-quality.js';

/** Biên dịch một nhóm vật thể với ánh sáng, sương mù và đích vẽ y như cảnh thật. */
function compileLike(renderer, group, camera, scene, target) {
  const previous = renderer.getRenderTarget();
  // Composer vẽ cảnh vào render target, shader khi đó khác bản vẽ thẳng ra màn hình.
  renderer.setRenderTarget(target);
  let ready;
  try {
    ready = renderer.compileAsync(group, camera, scene);
  } finally {
    renderer.setRenderTarget(previous);
  }
  pinShaderPrograms(renderer);
  return ready;
}

/** Mỗi chiêu PK một lần, ở nhóm tạm không gắn vào cảnh. */
async function pkSamples(group, compile) {
  const vfx = new PkVfx(group);
  const at = { x: 0, y: 0, z: 0, rot: 0 };
  vfx.slash(at);
  vfx.claw(at);
  vfx.flameBurst(at);
  vfx.poisonPalm(at);
  vfx.projectile({ fromX: 0, fromZ: 0, toX: 3, toZ: 3 });
  vfx.projectile({ fromX: 0, fromZ: 0, toX: 3, toZ: 3, isHit: true });
  vfx.dash({ fromX: 0, fromZ: 0, toX: 2, toZ: 0 });
  vfx.shield({ x: 0, z: 0 });
  vfx.meditationAura({ x: 0, z: 0 });
  vfx.shockwave({ x: 0, z: 0 });
  vfx.areaBurst({ x: 0, z: 0 });
  vfx.addTrailSpark(0, 0, 0);
  vfx.shatterIce(0, 0, 0);
  vfx.hit({ x: 0, z: 0, damage: 20 });
  vfx.hit({ x: 0, z: 0, damage: 20, isShielded: true });
  vfx.update(0.05); // Vài mảnh chỉ sinh ra trong khung đầu.
  await compile();
  vfx.clear();
}

/**
 * Một nhân vật cho mỗi hiệu ứng, xoay vòng trang phục, vũ khí, cảnh giới và mức khí.
 * Biên dịch cả lúc đứng, lúc cầm kiếm PK và lúc mờ dần khi rời đi (vật liệu thành trong suốt).
 */
async function avatarSample(group, compile, effect, lowQuality) {
  const avatar = new Avatar({
    name: '',
    color: effect % AVATAR.colors,
    hair: effect % AVATAR.hairs,
    hat: effect % AVATAR.hats,
    attire: effect % AVATAR.attires,
    weapon: effect % AVATAR.weapons,
    effect,
    lowQuality,
  });
  avatar.setCultivation(effect % 4);
  avatar.setQi(QI_TIERS[effect % QI_TIERS.length].qi + 1);
  avatar.setActivity(effect === 0 ? ACTIVITY.melody : ACTIVITY.meditate);
  avatar.setCombat(true);
  group.add(avatar.root);
  avatar.update(0.05, true, 5); // Một số mảnh hào quang chỉ sinh ra ở khung đầu.
  await compile();
  avatar.fadeOut();
  avatar.update(0.05, false, 5);
  await compile();
  // Cố ý không dispose: three đánh số ShaderMaterial theo mã nguồn và xoá số đó khi vật liệu cuối cùng
  // bị dispose, khiến lần sau cùng mã nguồn lại thành program mới. Giữ bản mẫu thì số không đổi.
  // Mẫu chưa từng được vẽ nên không có geometry hay texture nào trên GPU, chỉ tốn chút RAM.
}

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Chạy lúc màn chào: mỗi mẫu một lượt riêng để không dồn thành một cú khựng dài.
 * Lỗi ở đây chỉ làm mất phần làm nóng, không được làm hỏng game.
 */
export async function warmShaders({ renderer, camera, scene, target = null, lowQuality = false }) {
  const samples = [pkSamples];
  for (let effect = 0; effect < AVATAR.effects; effect++) {
    samples.push((group, compile) => avatarSample(group, compile, effect, lowQuality));
  }
  for (const sample of samples) {
    await nextTask();
    const group = new THREE.Group();
    try {
      await sample(group, () => compileLike(renderer, group, camera, scene, target));
    } catch (err) {
      console.warn('Bỏ qua làm nóng shader:', err);
    }
  }
}
