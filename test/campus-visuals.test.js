import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Color, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createTerrain } from '../client/src/scene/terrain.js';

test('exported roofs retain linear palette colors without a second sRGB decode', async () => {
  const palette = await readFile(new URL('../tools/blender/palette.py', import.meta.url), 'utf8');
  const expected = ['TILE_A', 'TILE_B'].map(key => {
    const hex = palette.match(new RegExp(`${key} = '(#[a-f0-9]+)'`))[1];
    return new Color(hex).toArray();
  });
  for (const file of ['pagoda', 'tea-pavilion']) {
    const bytes = await readFile(new URL(`../client/public/models/${file}.glb`, import.meta.url));
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    for (const rgb of expected) {
      let found = false;
      gltf.scene.traverse(mesh => {
        const colors = mesh.geometry?.getAttribute('color');
        for (let i = 0; i < (colors?.count ?? 0); i++) {
          if (Math.abs(colors.getX(i) - rgb[0]) < 0.0001 &&
              Math.abs(colors.getY(i) - rgb[1]) < 0.0001 &&
              Math.abs(colors.getZ(i) - rgb[2]) < 0.0001) found = true;
        }
      });
      assert.ok(found, `${file}: missing linear roof color ${rgb}`);
    }
  }
});

test('rendered terrain stays below entrance stair treads at both quality levels', () => {
  for (const lowQuality of [false, true]) {
    const terrain = createTerrain(lowQuality);
    const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
    for (const x of [-4.6, 0, 4.6]) {
      for (let i = 0; i < 12; i++) {
        ray.ray.origin.set(x, 5, 41 + i * 1.02);
        const [hit] = ray.intersectObject(terrain);
        assert.ok(hit && hit.point.y < -0.05 - i * 0.48, `buried step ${i}, x=${x}, low=${lowQuality}`);
      }
    }
    terrain.geometry.dispose();
    terrain.material.dispose();
  }
});
