import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { disposeMergedMeshes, mergeStaticMeshes } from '../client/src/scene/static-mesh-merge.js';

const meshes = (group) => {
  const out = [];
  group.traverse((o) => { if (o.isMesh) out.push(o); });
  return out;
};
const worldBox = (group) => new THREE.Box3().setFromObject(group, true); // Theo từng đỉnh, không theo hộp bao.

test('static pieces of different colours merge into one draw with the colours kept per vertex', () => {
  const group = new THREE.Group();
  group.position.set(5, 0, -3);
  group.rotation.y = 0.7;
  const colors = [0x7a4a2a, 0x4a2c19, 0xe0a458];
  const nested = new THREE.Group();
  nested.position.y = 1;
  nested.rotation.z = 0.3;
  group.add(nested);
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.4), new THREE.MeshLambertMaterial({ color: colors[i % 3], flatShading: true }));
    m.position.set(i * 0.5, i * 0.1, -i * 0.2);
    m.rotation.set(i * 0.1, i * 0.2, 0);
    m.castShadow = true;
    (i % 2 ? nested : group).add(m);
  }
  const before = worldBox(group);
  assert.equal(mergeStaticMeshes(group), 8);
  const after = meshes(group);
  assert.equal(after.length, 1);
  assert.equal(after[0].parent, group, 'merged mesh lives in the group frame');
  assert.ok(after[0].material.vertexColors);
  assert.ok(after[0].castShadow);
  const box = worldBox(group);
  assert.ok(box.min.distanceTo(before.min) < 1e-5 && box.max.distanceTo(before.max) < 1e-5, 'same place in the world');
  const color = after[0].geometry.attributes.color;
  const seen = new Set();
  for (let i = 0; i < color.count; i++) seen.add(new THREE.Color(color.getX(i), color.getY(i), color.getZ(i)).getHex());
  assert.deepEqual([...seen].sort(), [...colors].sort());
});

test('pieces keep separate draws when materials or shadows really differ', () => {
  const group = new THREE.Group();
  const textured = new THREE.MeshLambertMaterial({ map: new THREE.Texture() });
  const add = (material, castShadow = true) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    m.castShadow = castShadow;
    group.add(m);
  };
  add(new THREE.MeshLambertMaterial({ color: 0xff0000 }));
  add(new THREE.MeshLambertMaterial({ color: 0x00ff00 }));
  add(new THREE.MeshLambertMaterial({ color: 0x00ff00 }), false);
  add(new THREE.MeshBasicMaterial({ color: 0xffb35c }));
  add(textured);
  add(textured);
  mergeStaticMeshes(group);
  const out = meshes(group);
  assert.equal(out.length, 4); // lambert đổ bóng, lambert không bóng, basic, texture
  assert.equal(out.filter((m) => m.material === textured).length, 1, 'textured pieces share their own material');
});

test('multi-material chips merge per material, single-material boxes ignore their face groups', () => {
  const side = new THREE.MeshLambertMaterial({ map: new THREE.Texture() });
  const face = new THREE.MeshLambertMaterial({ map: new THREE.Texture() });
  const chip = new THREE.CylinderGeometry(0.03, 0.03, 0.01, 12);
  const stack = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(chip, [side, face, face]);
    m.position.y = i * 0.01;
    stack.add(m);
  }
  stack.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x123456 })));
  stack.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x654321 })));
  mergeStaticMeshes(stack);
  const out = meshes(stack);
  assert.equal(out.length, 3);
  const faces = out.find((m) => m.material === face);
  const sides = out.find((m) => m.material === side);
  const boxes = out.find((m) => m.material.vertexColors);
  const capVerts = chip.toNonIndexed().groups.filter((g) => g.materialIndex > 0).reduce((n, g) => n + g.count, 0);
  assert.equal(faces.geometry.attributes.position.count, capVerts * 6);
  assert.ok(sides.geometry.attributes.uv, 'textured pieces keep uv');
  assert.equal(boxes.geometry.attributes.position.count, 2 * 36, 'all six faces of both boxes');
  disposeMergedMeshes(stack);
});

test('mirrored, hidden and lone pieces are left alone', () => {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const mirrored = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  mirrored.scale.x = -1;
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  hidden.visible = false;
  const lone = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  group.add(mirrored, hidden, lone);
  assert.equal(mergeStaticMeshes(group), 0);
  assert.deepEqual(meshes(group), [mirrored, hidden, lone]);
});
