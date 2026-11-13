import * as THREE from 'three';
import { sealMaterial, createEmblemKit } from './aura-emblem-materials.js';
import { tinhHaSealOuter, tinhHaSealInner } from './tinh-ha-chart-textures.js';

// Bàn tinh đồ dưới chân Tinh Hà: bàn ngoài đứng yên (28 tú, hoàng đạo lệch tâm, chòm sao), khung
// sao kim chỉ quay chậm ngược chiều, xung sáng loang theo nhịp. Mỗi lớp nét có bản "mực" chàm
// (normal blending) để đọc rõ trên nền đá sáng; chất lượng thấp bỏ mực.
export function createGroundChart(parent, colors, lowQuality) {
  const kit = createEmblemKit(colors, lowQuality);
  const sealPlane = kit.plane(3.2), innerPlane = kit.plane(1.3);
  const pulse = kit.own(sealMaterial(colors, 0));
  const flat = new THREE.Group(); flat.name = 'tinh-ha-ground-chart'; flat.rotation.x = -Math.PI / 2; flat.position.y = 0.035;
  parent.add(flat);
  kit.lines(flat, sealPlane, tinhHaSealOuter(), 0, 4, { opacity: 0.7, goldMix: 0.6, chase: 4 });
  const rete = kit.lines(flat, innerPlane, tinhHaSealInner(), 0.006, 4, { opacity: 0.62, goldMix: 0.5, chase: 3 });
  const pulseMesh = new THREE.Mesh(sealPlane, pulse); pulseMesh.position.z = 0.01; pulseMesh.renderOrder = 5; flat.add(pulseMesh);

  return {
    update(time, rhythm, f) {
      rete.rotation.z = -time * 0.05;
      kit.tick(time, rhythm, f);
      pulse.uniforms.time.value = time; pulse.uniforms.pulse.value = rhythm.pulse;
      pulse.uniforms.opacity.value = 0.75 * f;
    },
    dispose() { kit.dispose(); },
  };
}
