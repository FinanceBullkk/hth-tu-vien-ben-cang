// Bộ cần câu của một người: cần tre, dây và phao. Dựng hình và cập nhật mỗi khung, không giữ danh sách người câu.
import * as THREE from 'three';
import { LAKE, lakeDistance } from '../../../shared/layout.js';

const RIG_Y = 0.04; // mặt sân
const ROD_TILT = 0.7; // ngọn cần chúc ra phía nước
const ROD_LEN = 2.6;
const HAND = { forward: 0.25, y: 1.05 }; // chỗ tay cầm, tính từ chân người câu
const TIP = { forward: Math.sin(ROD_TILT) * ROD_LEN, y: Math.cos(ROD_TILT) * ROD_LEN };
const CAST_FLIGHT_S = 0.55;

// Hình và vật liệu dùng chung; riêng dây mỗi người một geometry vì toạ độ khác nhau.
const rodGeo = new THREE.CylinderGeometry(0.012, 0.03, ROD_LEN, 5);
const rodMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3c, flatShading: true });
const lineMat = new THREE.LineBasicMaterial({ color: 0xf5eeda, transparent: true, opacity: 0.55 });
const bobberGeo = new THREE.SphereGeometry(0.09, 8, 6);
const bobberMat = new THREE.MeshLambertMaterial({ color: 0xd94f35, emissive: 0x7a1f10, flatShading: true });

export function makeRodRig() {
  const rig = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.name = 'pivot';
  const rod = new THREE.Mesh(rodGeo, rodMat);
  rod.position.set(Math.sin(ROD_TILT) * (ROD_LEN / 2), Math.cos(ROD_TILT) * (ROD_LEN / 2), 0);
  rod.rotation.z = -ROD_TILT;
  pivot.add(rod);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(lineGeo, lineMat);
  line.name = 'line';
  line.frustumCulled = false;
  const bobber = new THREE.Mesh(bobberGeo, bobberMat);
  bobber.name = 'bobber';
  rig.add(pivot, line, bobber);
  Object.assign(rig.userData, { dip: 0, shake: 0, cast: false, castT: 1, fight: null, struck: false, dirX: 1, dirZ: 0 });
  return rig;
}

export function updateRodRig(rig, dt, now, effects) {
  const data = rig.userData;
  rig.position.set(data.anchor.x, RIG_Y, data.anchor.z);
  const line = rig.getObjectByName('line');
  const bobber = rig.getObjectByName('bobber');
  const pivot = rig.getObjectByName('pivot');
  line.visible = data.cast;
  bobber.visible = data.cast;

  // Người khác không có số liệu giằng co thật: dựng dao động giả đủ để thấy họ đang vật lộn.
  const fighting = data.fight || data.struck;
  const fishOffset = data.fight?.fishOffset ?? (data.struck ? Math.sin(now * 0.0017) * 0.3 : 0);
  const needleOffset = data.fight?.needleOffset ?? (data.struck ? Math.sin(now * 0.0013) * 0.3 : 0);

  data.shake = Math.max(0, data.shake - dt * 3);
  const baseYaw = Math.atan2(-data.dirZ, data.dirX);
  const wantYaw = baseYaw - needleOffset * 0.9;
  let yawDelta = wantYaw - pivot.rotation.y;
  yawDelta = Math.atan2(Math.sin(yawDelta), Math.cos(yawDelta));
  pivot.rotation.y += yawDelta * Math.min(1, dt * 12);
  pivot.rotation.z = Math.sin(now * 0.03) * data.shake * 0.09 - (fighting ? 0.1 : 0);
  pivot.position.set(data.dirX * HAND.forward, HAND.y, data.dirZ * HAND.forward);
  if (!data.cast) return;

  const tipX = pivot.position.x + TIP.forward * Math.cos(pivot.rotation.y);
  const tipY = HAND.y + TIP.y;
  const tipZ = pivot.position.z - TIP.forward * Math.sin(pivot.rotation.y);

  // Phao chạy ngang theo cá nhưng không bao giờ lên bờ.
  let bx = data.bx;
  let bz = data.bz;
  if (fighting) {
    const sideX = data.bx - data.dirZ * fishOffset * 2.6;
    const sideZ = data.bz + data.dirX * fishOffset * 2.6;
    if (lakeDistance(sideX, sideZ) < -0.3) {
      bx = sideX;
      bz = sideZ;
    }
    if (Math.random() < dt * 2) effects.splash(bx, bz);
  }
  data.dip = fighting ? 0.55 + Math.sin(now * 0.02) * 0.3 : Math.max(0, data.dip - dt * 2.4);
  const bobY = LAKE.y + 0.05 + Math.sin(now * 0.002 + bx) * 0.02 - data.dip * 0.06;

  // Phao bay vòng cung từ ngọn cần xuống nước rồi mới đậu.
  let px = bx - data.anchor.x;
  let py = bobY - RIG_Y;
  let pz = bz - data.anchor.z;
  if (data.castT < 1) {
    data.castT = Math.min(1, data.castT + dt / CAST_FLIGHT_S);
    const k = data.castT;
    px = tipX + (px - tipX) * k;
    pz = tipZ + (pz - tipZ) * k;
    py = tipY + (py - tipY) * k + Math.sin(k * Math.PI) * 1.3;
    if (data.castT === 1) effects.ripple(bx, bz, 1);
  }
  bobber.position.set(px, py, pz);
  const pos = line.geometry.attributes.position;
  pos.setXYZ(0, tipX, tipY, tipZ);
  pos.setXYZ(1, px, py + 0.09, pz);
  pos.needsUpdate = true;
}
