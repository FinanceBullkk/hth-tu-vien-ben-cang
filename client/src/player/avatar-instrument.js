import * as THREE from 'three';

const wood = new THREE.MeshLambertMaterial({ color: 0x573021 });
const skin = new THREE.MeshLambertMaterial({ color: 0xc1ad7e });
const gold = new THREE.MeshLambertMaterial({ color: 0xc3a15f });
const string = new THREE.MeshBasicMaterial({ color: 0xe9dbc0 });
const neck = new THREE.CylinderGeometry(0.016, 0.022, 0.88, 8);
const body = new THREE.CylinderGeometry(0.105, 0.105, 0.19, 6);
const peg = new THREE.CylinderGeometry(0.014, 0.019, 0.14, 6);
const wire = new THREE.CylinderGeometry(0.002, 0.002, 0.77, 4);
const bowGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.8, 6);

export function createInstrument() {
  const group = new THREE.Group();
  const add = (geo, mat, x, y, z, rz = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rz;
    group.add(mesh);
    return mesh;
  };
  add(neck, wood, -0.14, 0.78, 0.28);
  const resonator = add(body, skin, -0.14, 0.39, 0.29);
  resonator.rotation.x = Math.PI / 2;
  add(peg, gold, -0.11, 1.12, 0.28, Math.PI / 2);
  add(peg, gold, -0.11, 1.04, 0.28, Math.PI / 2);
  add(wire, string, -0.145, 0.75, 0.305);
  add(wire, string, -0.13, 0.75, 0.305);
  const bow = new THREE.Group();
  const stick = new THREE.Mesh(bowGeo, wood);
  stick.rotation.z = Math.PI / 2;
  bow.add(stick);
  const hair = new THREE.Mesh(bowGeo, string);
  hair.scale.x = 0.25;
  hair.rotation.z = Math.PI / 2;
  hair.position.y = -0.02;
  bow.add(hair);
  bow.position.set(0.08, 0.55, 0.33);
  group.add(bow);
  group.visible = false;
  return { group, update(t) { bow.position.x = 0.08 + Math.sin(t * 3) * 0.13; } };
}
