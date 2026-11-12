// Giảm lệnh vẽ theo số người: mỗi nhân vật có tới 20 mảnh riêng, nhân đôi khi đổ bóng.

const FAR_ENTER_M = 32;
const FAR_LEAVE_M = 28; // Hai ngưỡng khác nhau để người đứng ngay ranh giới không nhấp nháy chi tiết.

function shadowParts(avatar) {
  return [
    avatar.body,
    avatar.head.children[0],
    // hatGroup giờ gộp tóc + mũ thành nhóm lồng nhau: lấy mesh đầu tiên tìm được.
    avatar.hatGroup.getObjectByProperty('isMesh', true),
    avatar.armL.children[0],
    avatar.armR.children[0],
    avatar.legL.children[0],
    avatar.legR.children[0],
  ].filter(Boolean);
}

/** Bóng ở độ phân giải này chỉ cần dáng người: giữ thân, đầu, mũ, tay, chân; bỏ áo choàng, vũ khí, hạt hào quang. */
export function trimShadowCasters(avatar) {
  avatar.root.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  for (const part of shadowParts(avatar)) part.castShadow = true;
}

/** Ở xa bỏ bóng và các chi tiết nhỏ. Trả về trạng thái xa/gần để gọi lại ở khung sau. */
export function updateAvatarLod(avatar, distance, wasFar) {
  const far = wasFar ? distance > FAR_LEAVE_M : distance > FAR_ENTER_M;
  if (far === wasFar) return far;
  for (const part of shadowParts(avatar)) part.castShadow = !far;
  avatar.attire.group.visible = !far;
  avatar.weaponFx.group.visible = !far;
  // Hai mắt là hai mảnh ngay sau khối đầu.
  avatar.head.children[1].visible = !far;
  avatar.head.children[2].visible = !far;
  return far;
}
