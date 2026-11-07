import * as THREE from 'three';
import { BELL, COURT_PATHS, GARDEN, HALL, LAKE, PAGODA, TREE } from '../../../shared/layout.js';
import { rng } from './builders.js';

const STONE = '#a89e8f';

function pavingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const rand = rng(5);
  ctx.fillStyle = '#756c5b';
  ctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    for (let col = -1; col < 5; col++) {
      ctx.fillStyle = `hsl(26, 19%, ${47 + rand() * 6}%)`;
      ctx.fillRect(col * 64 + row % 2 * 32 + 1, row * 32 + 1, 62, 30);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function rakedTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#cfc6b4';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#b7ad99';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 16) {
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 8) {
      const yy = y + Math.sin(x / 256 * Math.PI * 2) * 5;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildCampusGround(group, b) {
  const plane = (w, d, x, z, y, material) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  plane(62, 62, 0, 0, 0, new THREE.MeshLambertMaterial({ color: '#788463' }));
  const paving = pavingTexture();
  const courts = [
    { x: 0, z: -6, w: 20, d: 8 },
    { x: BELL.x, z: BELL.z, w: 10, d: 10 },
    { x: PAGODA.x, z: PAGODA.z, w: 11, d: 11 },
    { x: 19.5, z: 3, w: 13, d: 10 },
  ];
  for (const court of courts) {
    const texture = paving.clone();
    texture.repeat.set(court.w / 4, court.d / 4);
    plane(court.w, court.d, court.x, court.z, 0.012, new THREE.MeshLambertMaterial({ map: texture }));
    for (const side of [-1, 1]) {
      b.box(court.w, 0.02, 0.16, STONE, court.x, 0.022, court.z + side * court.d / 2);
      b.box(0.16, 0.02, court.d, STONE, court.x + side * court.w / 2, 0.022, court.z);
    }
  }
  b.cyl(6.4, 6.4, 0.02, '#b7ab8f', TREE.x, 0.012, TREE.z, { seg: 48, jitter: 0 });
  b.cyl(5.9, 5.9, 0.02, '#c5b99d', TREE.x, 0.014, TREE.z, { seg: 48, jitter: 0 });
  for (const lobe of LAKE.lobes) {
    b.cyl(lobe.r + 1.35, lobe.r + 1.35, 0.02, '#b7ab8f', lobe.x, 0.012, lobe.z, { seg: 48, jitter: 0 });
  }
  plane(GARDEN.maxX - GARDEN.minX, GARDEN.maxZ - GARDEN.minZ,
    (GARDEN.minX + GARDEN.maxX) / 2, (GARDEN.minZ + GARDEN.maxZ) / 2, 0.015,
    new THREE.MeshLambertMaterial({ map: rakedTexture() }));

  // ponytail: flush paving only; raised terraces need shared collision and floorHeight changes.
  for (const path of COURT_PATHS) {
    b.box(path.w, 0.02, path.d, STONE, path.x, 0.025, path.z, { jitter: 0 });
  }
  for (let z = -11; z < 30; z += 2) b.box(5.8, 0.008, 0.04, '#897f6e', 0, 0.037, z, { jitter: 0 });
  for (const x of [-2.9, 2.9]) b.box(0.08, 0.008, 41, '#d0c4aa', x, 0.037, 9.5, { jitter: 0 });
  b.box(17.6, 0.3, 3.4, '#8d8478', HALL.x, 0.15, HALL.z + HALL.halfD + 1.7);
}
