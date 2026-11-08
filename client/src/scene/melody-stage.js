import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { MELODY_ZONE } from '../../../shared/layout.js';

export function createMelodyStage(scene) {
  const group = new THREE.Group();
  group.position.set(MELODY_ZONE.x, 0, MELODY_ZONE.z);
  const stone = new THREE.MeshLambertMaterial({ color: 0x6f7974 });
  const mat = new THREE.MeshLambertMaterial({ color: 0x7b977d });
  const edge = new THREE.MeshLambertMaterial({ color: 0xbca476 });
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.75, 0.06, 32), stone);
  platform.position.y = 0.03;
  platform.receiveShadow = true;
  group.add(platform);
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.54, 0.09, 24), mat);
  cushion.position.y = 0.075;
  group.add(cushion);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.018, 4, 48), edge);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.07;
  group.add(rim);
  for (const z of [-1.2, 1.2]) {
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.35, 0.24),
      new THREE.MeshLambertMaterial({ color: 0xe7ca8c, emissive: 0xd09845, emissiveIntensity: 0.6 }));
    lantern.position.set(0.8, 0.28, z);
    group.add(lantern);
  }
  const label = document.createElement('div');
  label.className = 'tag-name';
  label.textContent = 'Tấu nhạc · Đàn nhị';
  const tag = new CSS2DObject(label);
  tag.position.set(0, 0.7, -1.45);
  group.add(tag);
  scene.add(group);
  return group;
}
