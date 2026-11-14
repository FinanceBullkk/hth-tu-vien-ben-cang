import * as THREE from 'three';
import { spawnQTechnique, spawnDomain } from './pk-techniques.js';

// Cánh sen có độ cong và chuyển sắc; dùng chung cho các pháp trận PK ngắn hạn.
function createPkPetal() {
  const rows = 8;
  const positions = [];
  for (let j = 0; j < rows; j++) {
    const y0 = j / rows;
    const y1 = (j + 1) / rows;
    const vertex = (side, t) => {
      const width = .32 * Math.pow(Math.sin(Math.PI * Math.pow(t, .8)), .7);
      return [side * width, t * 1.2, .42 * Math.sin(Math.PI * t)];
    };
    for (const [side, nextSide] of [[-1, 0], [0, 1]]) {
      positions.push(...vertex(side, y0), ...vertex(nextSide, y0), ...vertex(nextSide, y1));
      positions.push(...vertex(side, y0), ...vertex(nextSide, y1), ...vertex(side, y1));
    }
  }
  const coords = new Float32Array(positions);
  const colors = new Float32Array(coords.length);
  const root = new THREE.Color(0xc5a260);
  const body = new THREE.Color(0x77b99b);
  const tip = new THREE.Color(0xdaf2d7);
  for (let i = 0; i < coords.length; i += 3) {
    const t = coords[i + 1] / 1.2;
    const color = t < .3 ? root.clone().lerp(body, t / .3) : body.clone().lerp(tip, (t - .3) / .76);
    colors.set(color.toArray(), i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(coords, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: .68,
    depthWrite: false, blending: THREE.NormalBlending,
  }));
}

/** Tạo canvas texture trận đồ Thái Cực Bát Quái (Tai Chi Bagua Xianxia Array) */
function createBaguaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256;
  const cy = 256;

  ctx.clearRect(0, 0, 512, 512);

  // Vòng hào quang hoàng kim ngoài cùng (viền kép sắc nét chuẩn anime)
  ctx.strokeStyle = '#d8b46d';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 240, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#6e9f86';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 234, 0, Math.PI * 2);
  ctx.stroke();

  // Vòng khía cổ tự thứ 2
  ctx.strokeStyle = '#9bcdb3';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 215, 0, Math.PI * 2);
  ctx.stroke();

  // 8 Quẻ Bát Quái Tiên Hiệp (Càn, Đoài, Ly, Chấn, Tốn, Khảm, Cấn, Khôn)
  const trigrams = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'];
  ctx.font = '900 38px "Segoe UI Symbol", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const tx = cx + Math.cos(angle) * 178;
    const ty = cy + Math.sin(angle) * 178;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle + Math.PI / 2);
    // Viền đen dày tương phản cao chuẩn anime
    ctx.strokeStyle = '#243629';
    ctx.lineWidth = 5;
    ctx.strokeText(trigrams[i], 0, 0);
    ctx.fillStyle = '#d8b46d';
    ctx.fillText(trigrams[i], 0, 0);
    ctx.restore();
  }

  // Vòng phân ranh giới tâm
  ctx.strokeStyle = '#d8b46d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 140, 0, Math.PI * 2);
  ctx.stroke();

  // Thái Cực Âm Dương Song Ngư (Tai Chi Yin-Yang Fish - màu vàng hổ phách trầm ấm, không bị chói lóa)
  const r = 136;
  // Cá Dương (Hoàng Kim Dương Khí - màu hổ phách vàng ấm)
  const yangGrad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  yangGrad.addColorStop(0, '#7fb79b');
  yangGrad.addColorStop(1, '#e9dfbb');
  ctx.fillStyle = yangGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.arc(cx, cy + r / 2, r / 2, Math.PI / 2, -Math.PI / 2, false);
  ctx.arc(cx, cy - r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
  ctx.fill();

  // Viền vàng đậm tách biệt hai con cá
  ctx.strokeStyle = '#b5935c';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Cá Âm (Hắc Ám Âm Khí)
  ctx.fillStyle = '#244c40';
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);
  ctx.arc(cx, cy - r / 2, r / 2, -Math.PI / 2, Math.PI / 2, false);
  ctx.arc(cx, cy + r / 2, r / 2, -Math.PI / 2, Math.PI / 2, true);
  ctx.fill();

  // Mắt cá Âm
  ctx.fillStyle = '#244c40';
  ctx.beginPath();
  ctx.arc(cx, cy - r / 2, r / 6, 0, Math.PI * 2);
  ctx.fill();

  // Mắt cá Dương
  ctx.fillStyle = '#e9dfbb';
  ctx.beginPath();
  ctx.arc(cx, cy + r / 2, r / 6, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Tạo canvas texture đóa sen vàng Phật Quang (Golden Lotus Mandala - Phong cách Anime Tiên Hiệp) */
function createLotusMandalaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256;
  const cy = 256;

  ctx.clearRect(0, 0, 512, 512);

  // Vầng hào quang hổ phách dịu nhẹ
  const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 246);
  bgGrad.addColorStop(0, 'rgba(255, 179, 0, 0.25)');
  bgGrad.addColorStop(0.75, 'rgba(255, 143, 0, 0.12)');
  bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 246, 0, Math.PI * 2);
  ctx.fill();

  // Vòng hào quang hoàng kim ngoài cùng (viền kép)
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 238, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#b26a00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 228, 0, Math.PI * 2);
  ctx.stroke();

  // 16 Cánh sen vàng kim vòng ngoài (Solid Sacred Lotus Petals)
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.quadraticCurveTo(38, 175, 0, 230);
    ctx.quadraticCurveTo(-38, 175, 0, 120);

    const grad = ctx.createLinearGradient(0, 120, 0, 230);
    grad.addColorStop(0, '#ff8f00');
    grad.addColorStop(0.5, '#ffca28');
    grad.addColorStop(1, '#fff59d');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#b26a00';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Sống cánh sen phát quang bên trong
    ctx.strokeStyle = '#fffde7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 130);
    ctx.lineTo(0, 215);
    ctx.stroke();

    ctx.restore();
  }

  // 8 Cánh sen lớn vòng trong đan so le
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + Math.PI / 8;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 52);
    ctx.quadraticCurveTo(46, 110, 0, 160);
    ctx.quadraticCurveTo(-46, 110, 0, 52);

    const grad = ctx.createLinearGradient(0, 52, 0, 160);
    grad.addColorStop(0, '#ffb300');
    grad.addColorStop(0.6, '#ffee58');
    grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // Vòng chuỗi ngọc hoàng kim (16 Hạt Bồ Đề)
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8;
    const px = cx + Math.cos(angle) * 78;
    const py = cy + Math.sin(angle) * 78;
    ctx.fillStyle = '#ffe082';
    ctx.strokeStyle = '#b26a00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Nhụy sen trung tâm hoàng kim
  ctx.fillStyle = '#ff8f00';
  ctx.strokeStyle = '#ffe082';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Biểu tượng Bát Cát Tường Dharma Wheel ở tâm
  ctx.font = '900 36px "Segoe UI Symbol", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fffde7';
  ctx.fillText('☸', cx, cy);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Tạo canvas texture ma trận Liệt Hỏa Địa Viêm (Hellfire Rune Array - Chuẩn Anime Ma Pháp) */
function createFlameArrayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256;
  const cy = 256;

  ctx.clearRect(0, 0, 512, 512);

  // Vầng hào quang lửa đỏ rực rỡ
  const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 246);
  bgGrad.addColorStop(0, 'rgba(213, 0, 0, 0.35)');
  bgGrad.addColorStop(0.7, 'rgba(255, 61, 0, 0.15)');
  bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 246, 0, Math.PI * 2);
  ctx.fill();

  // Vòng ngoài rực lửa
  ctx.strokeStyle = '#ff3d00';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 238, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#b71c1c';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 226, 0, Math.PI * 2);
  ctx.stroke();

  // 16 Răng lửa hình ngọn kiếm phong ấn (Flame Blades Array)
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 160);
    ctx.lineTo(14, 222);
    ctx.lineTo(-14, 222);
    ctx.closePath();

    const bladeGrad = ctx.createLinearGradient(0, 160, 0, 222);
    bladeGrad.addColorStop(0, '#ffea00');
    bladeGrad.addColorStop(0.5, '#ff5722');
    bladeGrad.addColorStop(1, '#b71c1c');
    ctx.fillStyle = bladeGrad;
    ctx.fill();

    ctx.strokeStyle = '#5f0900';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // 8 Cổ tự Hỏa Phù phong ấn vòng giữa
  const fireRunes = ['炎', '✦', '焱', '✦', '火', '✦', '♨', '✦'];
  ctx.font = '900 24px "Segoe UI Symbol", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const rx = cx + Math.cos(angle) * 148;
    const ry = cy + Math.sin(angle) * 148;
    ctx.strokeStyle = '#4e0d00';
    ctx.lineWidth = 3.5;
    ctx.strokeText(fireRunes[i], rx, ry);
    ctx.fillStyle = '#ffea00';
    ctx.fillText(fireRunes[i], rx, ry);
  }

  // Ngôi sao bát giác phong ấn ma pháp (Double 8-Pointed Star)
  ctx.strokeStyle = '#ff9100';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a1 = (i * Math.PI) / 4;
    const a2 = a1 + Math.PI / 8;
    const r1 = 125;
    const r2 = 68;
    if (i === 0) ctx.moveTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
    else ctx.lineTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
    ctx.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2);
  }
  ctx.closePath();
  ctx.stroke();

  // Tâm mặt trời hỏa diễm
  ctx.fillStyle = '#d50000';
  ctx.strokeStyle = '#ffd600';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = '900 32px "Segoe UI Symbol", sans-serif';
  ctx.fillStyle = '#ffea00';
  ctx.fillText('♨', cx, cy);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Tạo canvas texture Chưởng Ấn Ngũ Độc Thần Chưởng (Five Poisons Jade Palm - Phong Cách Tiên Hiệp Anime) */
function createPoisonPalmTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256;
  const cy = 256;

  ctx.clearRect(0, 0, 512, 512);

  // Vầng khí u minh lục bảo bao quanh
  const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 246);
  bgGrad.addColorStop(0, 'rgba(0, 200, 83, 0.3)');
  bgGrad.addColorStop(0.7, 'rgba(0, 100, 40, 0.15)');
  bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 246, 0, Math.PI * 2);
  ctx.fill();

  // Vòng khí độc lục bảo ngoài cùng (viền kép sắc nét)
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 238, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#004d20';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 226, 0, Math.PI * 2);
  ctx.stroke();

  // 12 Độc phù cổ tự xoay quanh với viền tối rõ nét
  ctx.font = '900 28px "Segoe UI Symbol", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const runes = ['☠', '✦', '☣', '✦', '☠', '✦', '☣', '✦', '☠', '✦', '☣', '✦'];
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const rx = cx + Math.cos(angle) * 195;
    const ry = cy + Math.sin(angle) * 195;
    ctx.strokeStyle = '#00250d';
    ctx.lineWidth = 4.5;
    ctx.strokeText(runes[i], rx, ry);
    ctx.fillStyle = '#69f0ae';
    ctx.fillText(runes[i], rx, ry);
  }

  // ĐẠI CHƯỞNG ẤN NGŨ ĐỘC THẦN CHƯỞNG (Seamless Martial Arts Jade Palm Silhouette)
  ctx.save();
  ctx.translate(cx, cy + 18);

  // 1. Vẽ lòng bàn tay liền khối với cổ tay
  ctx.beginPath();
  // Cổ tay (Wrist)
  ctx.moveTo(-42, 85);
  ctx.quadraticCurveTo(0, 92, 42, 85);
  // Cạnh ngoài ngón út (Hypothenar)
  ctx.quadraticCurveTo(62, 55, 65, 0);
  // Khớp gốc ngón út
  ctx.quadraticCurveTo(62, -15, 55, -20);
  // Khớp gốc ngón giữa
  ctx.lineTo(0, -32);
  // Khớp gốc ngón trỏ
  ctx.lineTo(-50, -18);
  // Gốc ngón cái (Thenar)
  ctx.quadraticCurveTo(-65, 30, -42, 85);
  ctx.closePath();

  const palmGrad = ctx.createLinearGradient(0, 90, 0, -130);
  palmGrad.addColorStop(0, '#004d20');
  palmGrad.addColorStop(0.5, '#00c853');
  palmGrad.addColorStop(1, '#69f0ae');
  ctx.fillStyle = palmGrad;
  ctx.fill();

  ctx.strokeStyle = '#00250d';
  ctx.lineWidth = 5;
  ctx.stroke();

  // 2. Năm ngón tay quyền pháp vươn thẳng sắc bén (Connected curved fingers)
  const fingers = [
    // Ngón cái
    { baseX: -55, baseY: 10, tipX: -85, tipY: -22, w: 22 },
    // Ngón trỏ
    { baseX: -40, baseY: -18, tipX: -45, tipY: -115, w: 22 },
    // Ngón giữa (Dài nhất)
    { baseX: -12, baseY: -28, tipX: -12, tipY: -138, w: 23 },
    // Ngón áp út
    { baseX: 16, baseY: -24, tipX: 20, tipY: -122, w: 22 },
    // Ngón út
    { baseX: 44, baseY: -14, tipX: 52, tipY: -92, w: 20 },
  ];

  for (const f of fingers) {
    ctx.beginPath();
    ctx.moveTo(f.baseX - f.w * 0.45, f.baseY);
    ctx.lineTo(f.tipX - f.w * 0.4, f.tipY);
    ctx.quadraticCurveTo(f.tipX, f.tipY - 12, f.tipX + f.w * 0.4, f.tipY);
    ctx.lineTo(f.baseX + f.w * 0.45, f.baseY);
    ctx.closePath();

    ctx.fillStyle = palmGrad;
    ctx.fill();
    ctx.strokeStyle = '#00250d';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // Vệt sáng ngọc bích dọc ngón tay
    ctx.strokeStyle = '#b9f6ca';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(f.baseX, f.baseY - 10);
    ctx.lineTo(f.tipX, f.tipY + 6);
    ctx.stroke();
  }

  // 3. Độc Phù Huyết Lâu / Cổ Tự U Minh ở tâm lòng bàn tay
  ctx.strokeStyle = '#b9f6ca';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 32, 34, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = '900 34px "Segoe UI Symbol", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b9f6ca';
  ctx.fillText('☠', 0, 32);

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Tạo 3D Móng Vuốt Thần Long (Procedural Dragon Claw Mesh - Crisp Anime Arc) */
function createDragonClawMesh(clawColor = 0xffa000, edgeColor = 0xffe082) {
  const group = new THREE.Group();

  // 3 Móng vuốt thần long cong sắc nhọn xé toạc không gian (rõ nét, không bị chói)
  for (let i = 0; i < 3; i++) {
    // 1. Thân móng vuốt cong mỏng, sắc bén chuẩn anime
    const clawGeo = new THREE.RingGeometry(0.85, 1.15, 32, 1, -Math.PI * 0.32, Math.PI * 0.64);
    const clawMat = new THREE.MeshBasicMaterial({
      color: clawColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const claw = new THREE.Mesh(clawGeo, clawMat);
    claw.position.set((i - 1) * 0.46, (1 - i) * 0.18, 0);
    claw.rotation.x = Math.PI / 2.8;
    claw.rotation.z = -0.32 + i * 0.28;

    // 2. Lưỡi vuốt sắc nhọn viền ngoài (Razor edge highlight)
    const edgeGeo = new THREE.RingGeometry(1.08, 1.15, 28, 1, -Math.PI * 0.30, Math.PI * 0.60);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: edgeColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    claw.add(edge);

    // 3. Viền tối tương phản phía sau giúp móng vuốt nổi bật rõ ràng
    const darkGeo = new THREE.RingGeometry(0.85, 0.92, 28, 1, -Math.PI * 0.30, Math.PI * 0.60);
    const darkMat = new THREE.MeshBasicMaterial({
      color: 0x8d2b00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const dark = new THREE.Mesh(darkGeo, darkMat);
    claw.add(dark);

    group.add(claw);
  }

  return group;
}

/** Tạo 3D Phi Kiếm Tiên Hiệp (Procedural Xianxia Flying Sword) */
function createSwordMesh(bladeColor = 0xb8e8cd, glowColor = 0xd8b46d) {
  const sword = new THREE.Group();

  // 1. Lưỡi kiếm vát kim cương sắc bén (Double-edged diamond blade - màu sắc đậm đà rõ nét)
  const bladeGeo = new THREE.CylinderGeometry(0.012, 0.052, 1.15, 4, 1);
  const bladeMat = new THREE.MeshBasicMaterial({
    color: bladeColor,
    transparent: true,
    opacity: 0.95,
    blending: THREE.NormalBlending,
  });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.scale.set(0.24, 1, 1);
  blade.position.y = 0.58;

  // Lõi kiếm phát sáng thanh mảnh (Inner blade core highlight)
  const coreGeo = new THREE.CylinderGeometry(0.003, 0.015, 1.18, 4, 1);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.scale.set(0.18, 1, 1);
  core.position.y = 0.58;

  // 2. Kiếm cách cánh tiên (Ornate winged crossguard)
  const guardGeo = new THREE.BoxGeometry(0.25, 0.04, 0.06);
  const guardMat = new THREE.MeshBasicMaterial({
    color: glowColor,
    blending: THREE.AdditiveBlending,
  });
  const guard = new THREE.Mesh(guardGeo, guardMat);
  guard.position.y = 0.02;

  // 3. Chuôi kiếm hoàng kim (Sword grip)
  const gripGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6);
  const gripMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.y = -0.11;

  // 4. Đốc kiếm & tua kiếm lụa đỏ (Pommel & Tassel)
  const pommelGeo = new THREE.SphereGeometry(0.035, 6, 6);
  const pommel = new THREE.Mesh(pommelGeo, guardMat);
  pommel.position.y = -0.23;

  const tasselGeo = new THREE.ConeGeometry(0.024, 0.2, 4);
  const tasselMat = new THREE.MeshBasicMaterial({
    color: 0x79baa4,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });
  const tassel = new THREE.Mesh(tasselGeo, tasselMat);
  tassel.position.y = -0.33;
  tassel.rotation.x = Math.PI;

  sword.add(blade, core, guard, grip, pommel, tassel);
  return sword;
}

/** Tạo 3D Đầu Thần Long Tiên Hiệp (Procedural Dragon Spirit Head) */
function createDragonHeadMesh() {
  const dragon = new THREE.Group();

  const snoutGeo = new THREE.ConeGeometry(0.24, 0.6, 6);
  const snoutMat = new THREE.MeshBasicMaterial({
    color: 0xffa000,
    transparent: true,
    opacity: 0.8,
    blending: THREE.NormalBlending,
  });
  const snout = new THREE.Mesh(snoutGeo, snoutMat);
  snout.rotation.x = Math.PI / 2;
  snout.scale.set(0.8, 1, 0.6);

  const hornGeo = new THREE.ConeGeometry(0.045, 0.38, 4);
  const hornMat = new THREE.MeshBasicMaterial({
    color: 0xff6d00,
    blending: THREE.AdditiveBlending,
  });
  const hornL = new THREE.Mesh(hornGeo, hornMat);
  hornL.position.set(-0.12, 0.14, -0.16);
  hornL.rotation.z = -0.35;
  hornL.rotation.x = -0.4;

  const hornR = new THREE.Mesh(hornGeo, hornMat);
  hornR.position.set(0.12, 0.14, -0.16);
  hornR.rotation.z = 0.35;
  hornR.rotation.x = -0.4;

  const eyeGeo = new THREE.SphereGeometry(0.045, 6, 6);
  const eyeMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    blending: THREE.AdditiveBlending,
  });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.11, 0.08, 0.09);

  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.11, 0.08, 0.09);

  dragon.add(snout, hornL, hornR, eyeL, eyeR);
  return dragon;
}

/** Tạo canvas texture số sát thương nổi: Phong cách Tiên Hiệp Anime pop-in */
function createDamageTexture(text, color = '#ff5500', isSpecial = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 76;
  const ctx = canvas.getContext('2d');

  ctx.font = '900 38px "Impact", "Arial Black", "Cinzel", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Viền đen dày tương phản cao chuẩn anime
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 9;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, 150, 38);

  if (isSpecial) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
  }

  ctx.fillStyle = color;
  ctx.fillText(text, 150, 38);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ===== Theme PK theo aura (EFFECT_NAMES 1–12) =====
// Mỗi aura một tông: pháp trận, bảng màu và "linh vật" bay theo chiêu. effect 0 hoặc
// id lạ → null, builder dùng đúng dáng Bát Quái hiện có. Mesh theme sinh lúc ra chiêu
// và gắn vào group chiêu nên dispose theo đúng pattern traverse sẵn có của update();
// các loop không cần biết theme vì chỉ đụng position/rotation/opacity.

// Hoạ tiết vẽ quanh vành pháp trận, vẽ tại gốc toạ độ sau translate/rotate.
const SIGIL_MOTIFS = {
  // Cánh sen / cánh đào — giọt cong nhọn hai đầu.
  petal: (ctx, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.bezierCurveTo(-16, 6, -14, -18, 0, -30);
    ctx.bezierCurveTo(14, -18, 16, 6, 0, 26);
    ctx.fill();
  },
  // Sóng nước — ba vòng cung chồng nhau.
  wave: (ctx, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(0, 14 - k * 12, 16 - k * 3, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  },
  // Sao băng — thoi sáng 4 cánh.
  star: (ctx, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -26); ctx.lineTo(6, -6); ctx.lineTo(24, 0); ctx.lineTo(6, 6);
    ctx.lineTo(0, 26); ctx.lineTo(-6, 6); ctx.lineTo(-24, 0); ctx.lineTo(-6, -6);
    ctx.closePath(); ctx.fill();
  },
  // Lá trúc — lá nhọn có gân giữa.
  leaf: (ctx, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.quadraticCurveTo(-12, 0, 0, -28);
    ctx.quadraticCurveTo(12, 0, 0, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(0, -22); ctx.stroke();
  },
  // Lưỡi liềm trăng.
  crescent: (ctx, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 24, Math.PI * .3, Math.PI * 1.7);
    ctx.arc(7, 0, 18, Math.PI * 1.6, Math.PI * .4, true);
    ctx.closePath(); ctx.fill();
  },
  // Lục lăng rune tối.
  hex: (ctx, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = 4;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const a = k * Math.PI / 3;
      const x = Math.cos(a) * 22, y = Math.sin(a) * 22;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  },
  // Ngọn lửa / long viêm.
  ember: (ctx, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.quadraticCurveTo(16, -4, 8, 12);
    ctx.quadraticCurveTo(4, 24, 0, 28);
    ctx.quadraticCurveTo(-4, 24, -8, 12);
    ctx.quadraticCurveTo(-16, -4, 0, -28);
    ctx.fill();
  },
  // Thanh kiếm cách điệu.
  sword: (ctx, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, 14); ctx.lineTo(10, 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, 28); ctx.stroke();
  },
};

// Hoạ sĩ pháp trận tham số hoá dùng chung cho các aura mới: quầng nền, hai vành ngoài,
// vành khía, 8 hoạ tiết lặp quanh tâm và một chữ triện sáng giữa trận.
function createSigilTexture({ bg, rim, rim2, tick, glyph, glyphColor, motif, motifColor }) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256, cy = 256;
  const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 246);
  grad.addColorStop(0, bg[0]); grad.addColorStop(1, bg[1]);
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, 246, 0, Math.PI * 2); ctx.fill();

  const ring = (r, w, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  };
  ring(240, 5, rim); ring(232, 2, rim2); ring(140, 3, rim);
  ctx.strokeStyle = tick; ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 200, cy + Math.sin(a) * 200);
    ctx.lineTo(cx + Math.cos(a) * 212, cy + Math.sin(a) * 212);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 - Math.PI / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * 178, cy + Math.sin(a) * 178);
    ctx.rotate(a + Math.PI / 2);
    SIGIL_MOTIFS[motif](ctx, motifColor);
    ctx.restore();
  }
  ctx.font = '110px "Microsoft YaHei", "SimSun", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = glyphColor; ctx.shadowBlur = 18;
  ctx.fillStyle = glyphColor;
  ctx.fillText(glyph, cx, cy + 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const SIGIL_SPECS = {
  water: { bg: ['rgba(126,232,224,.25)', 'rgba(16,74,70,.06)'], rim: '#bff5ef', rim2: '#3aa8a0',
    tick: '#7ee8e0', glyph: '水', glyphColor: '#d8fff3', motif: 'wave', motifColor: '#8fe8de' },
  star: { bg: ['rgba(205,216,255,.25)', 'rgba(30,40,96,.08)'], rim: '#e6ecff', rim2: '#8fa0e8',
    tick: '#cdd8ff', glyph: '星', glyphColor: '#ffe9b0', motif: 'star', motifColor: '#dbe4ff' },
  peach: { bg: ['rgba(255,168,204,.26)', 'rgba(112,38,68,.08)'], rim: '#ffdfef', rim2: '#e06a9d',
    tick: '#ffa8cc', glyph: '桃', glyphColor: '#ffe3f0', motif: 'petal', motifColor: '#ffb7d4' },
  jade: { bg: ['rgba(126,232,160,.25)', 'rgba(18,74,42,.08)'], rim: '#d0ffd8', rim2: '#3f9c66',
    tick: '#7ee8a0', glyph: '竹', glyphColor: '#e2ffe8', motif: 'leaf', motifColor: '#8fe8ab' },
  moon: { bg: ['rgba(246,247,255,.28)', 'rgba(52,60,102,.08)'], rim: '#ffffff', rim2: '#aab4dd',
    tick: '#e6eaff', glyph: '月', glyphColor: '#ffffff', motif: 'crescent', motifColor: '#dfe6ff' },
  dark: { bg: ['rgba(122,46,204,.30)', 'rgba(28,8,52,.10)'], rim: '#d2afff', rim2: '#5c2a92',
    tick: '#a86bdd', glyph: '魔', glyphColor: '#e3c8ff', motif: 'hex', motifColor: '#b98ae8' },
  dragonRed: { bg: ['rgba(255,90,40,.28)', 'rgba(96,20,4,.10)'], rim: '#ffc46b', rim2: '#c2410c',
    tick: '#ff8a50', glyph: '龍', glyphColor: '#ffd9a0', motif: 'ember', motifColor: '#ff9a5c' },
  dragonGold: { bg: ['rgba(255,222,140,.28)', 'rgba(90,64,12,.10)'], rim: '#ffedac', rim2: '#c29238',
    tick: '#ffe4a0', glyph: '龍', glyphColor: '#fff6d8', motif: 'ember', motifColor: '#f0c46b' },
  sword: { bg: ['rgba(123,224,207,.25)', 'rgba(12,58,52,.08)'], rim: '#d9fff2', rim2: '#2c8c7e',
    tick: '#7be0cf', glyph: '劍', glyphColor: '#e8fff8', motif: 'sword', motifColor: '#9be8da' },
};

// Mesh nhỏ theo motif: mỗi lần gọi tạo geometry/material mới (gắn vào group chiêu nên
// dispose theo traverse); 'sword' trả Group phi kiếm như bản gốc.
function motifMesh(kind, t, i = 0) {
  const mat = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9,
    depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  switch (kind) {
    case 'petal': return new THREE.Mesh(new THREE.PlaneGeometry(.1, .22), mat(i % 2 ? t.core : t.main));
    case 'leaf': return new THREE.Mesh(new THREE.PlaneGeometry(.09, .26), mat(i % 2 ? t.core : t.main));
    case 'star': {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(.09), mat(t.core));
      m.scale.y = 1.6;
      return m;
    }
    case 'moon': return new THREE.Mesh(new THREE.RingGeometry(.15, .23, 20, 1, 0, Math.PI * .85), mat(t.main));
    case 'ember': return new THREE.Mesh(new THREE.ConeGeometry(.07, .28, 6), mat(i % 2 ? t.accent : t.main));
    case 'orb': return new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), mat(t.core));
    case 'shard': return new THREE.Mesh(new THREE.TetrahedronGeometry(.1), mat(i % 2 ? t.core : t.accent));
    case 'claw': {
      const g = new THREE.Group();
      for (let k = -1; k <= 1; k++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(.05, .04, .34), mat(t.main));
        c.rotation.y = k * .38;
        g.add(c);
      }
      return g;
    }
    default: return createSwordMesh(i % 2 ? t.accent : t.main, t.core);
  }
}

// Kích thước cân lại so với phi kiếm (~1.15 đơn vị) — motif nhỏ cần phóng to để đọc được.
const MOTIF_SCALE = { petal: 2.6, leaf: 2.4, star: 2.6, moon: 2.4, ember: 2.2, orb: 2.2, shard: 2.4, claw: 2.4, sword: 1 };

// Bảng tông màu theo effect id; các builder đọc `pkTheme(effect)?.x ?? <mặc định cũ>`.
// Ngoài màu, mỗi tông còn có DÁNG CHIÊU RIÊNG:
//   slashStyle — hình đòn chính (crescent vòm chém, petalBurst nở cánh, waves sóng nước,
//     starBurst sao băng, emberFan quạt lửa, spike trúc tiễn, moonArc liềm trăng đứng,
//     voidWave vòng tối nở, claw long trảo, fanSwords xòe kiếm);
//   rain + rainMode — vật rơi ở vùng nổ AOE (blade mưa kiếm, petal cánh hoa, star sao,
//     spike cột mọc từ đất, shard mảnh, moon liềm, ember tàn lửa) và rơi xuống / bùng lên;
//   pillar — cột năng lượng dâng ở đích; orbitR/orbitW/wobble — nhịp bay đạn;
//   guards + dome — số linh vật hộ thể và kiểu vòm (sphere/hex lục lăng/halo nguyệt/rings gợn sóng);
//   dashWake — vệt lướt thêm (sparks bụi, petals cánh hoa, ripples gợn sóng).
const PK_THEMES = {
  1: { // Sen kim — đòn nở cánh sen, mưa cánh vàng
    sigil: 'lotus', main: 0xffd98a, accent: 0xffc247, core: 0xfff0bf, edge: 0x5c4718,
    fan: 'petal', coreMesh: 'orb', satellite: 'petal', guardian: 'petal', ghost: 'petal', blade: 'petal',
    burstGeo: 'petal', burst: [0xffd98a, 0xffc247, 0xfff0bf], trail: [0xffe7a3, 0xffd98a, 0xfff6d8],
    groundDark: 0x2e2410,
    slashStyle: 'petalBurst', rain: 'petal', rainMode: 'fall', pillar: false,
    orbitR: .5, orbitW: 16, wobble: .2, guards: 8, dome: 'sphere', dashWake: 'petals',
  },
  2: { // Lưu ly — sóng nước dâng, mưa tinh thể, vòm gợn sóng
    sigil: 'water', main: 0x7ee8e0, accent: 0x48d8cc, core: 0xd8fff3, edge: 0x14514c,
    fan: 'shard', coreMesh: 'orb', satellite: 'orb', guardian: 'orb', ghost: 'shard', blade: 'shard',
    burstGeo: 'shard', burst: [0x7ee8e0, 0x48d8cc, 0xd8fff3], trail: [0x9ff2ea, 0x7ee8e0, 0xd8fff3],
    groundDark: 0x0e3a36,
    slashStyle: 'waves', rain: 'shard', rainMode: 'fall', pillar: true,
    orbitR: .34, orbitW: 22, wobble: .3, guards: 6, dome: 'rings', dashWake: 'ripples',
  },
  3: { // Tinh hà — sao băng tỏa, mưa sao, đạn lượn zigzag
    sigil: 'star', main: 0xcdd8ff, accent: 0x9fb2ff, core: 0xffe9b0, edge: 0x2c3670,
    fan: 'star', coreMesh: 'star', satellite: 'star', guardian: 'star', ghost: 'star', blade: 'star',
    burstGeo: 'spark', burst: [0xcdd8ff, 0x9fb2ff, 0xffe9b0], trail: [0xdbe4ff, 0xcdd8ff, 0xffe9b0],
    groundDark: 0x1a2246,
    slashStyle: 'starBurst', rain: 'star', rainMode: 'fall', pillar: false,
    orbitR: .5, orbitW: 26, wobble: .38, guards: 6, dome: 'sphere', dashWake: 'sparks',
  },
  4: { // Hỏa diễm — quạt lửa, tàn lửa bùng lên, cột hỏa ở đích
    sigil: 'flame', main: 0xff9a5c, accent: 0xff6b3d, core: 0xffd268, edge: 0x701f0e,
    fan: 'ember', coreMesh: 'orb', satellite: 'ember', guardian: 'ember', ghost: 'ember', blade: 'ember',
    burstGeo: 'spark', burst: [0xff9a5c, 0xff6b3d, 0xffd268], trail: [0xffb87e, 0xff9a5c, 0xffd268],
    groundDark: 0x4a1608,
    slashStyle: 'emberFan', rain: 'ember', rainMode: 'rise', pillar: true,
    orbitR: .42, orbitW: 24, wobble: .12, guards: 6, dome: 'sphere', dashWake: 'sparks',
  },
  5: { // Đào hoa — nở cánh đào, mưa cánh hồng
    sigil: 'peach', main: 0xffa8cc, accent: 0xff7fae, core: 0xffdfef, edge: 0x7a3355,
    fan: 'petal', coreMesh: 'orb', satellite: 'petal', guardian: 'petal', ghost: 'petal', blade: 'petal',
    burstGeo: 'petal', burst: [0xffa8cc, 0xff7fae, 0xffdfef], trail: [0xffc2dd, 0xffa8cc, 0xffdfef],
    groundDark: 0x4a1c30,
    slashStyle: 'petalBurst', rain: 'petal', rainMode: 'fall', pillar: false,
    orbitR: .5, orbitW: 18, wobble: .22, guards: 8, dome: 'sphere', dashWake: 'petals',
  },
  6: { // Bích ngọc — trúc tiễn phóng, cột trúc mọc từ đất
    sigil: 'jade', main: 0x7ee8a0, accent: 0x48c47a, core: 0xd0ffd8, edge: 0x1c5c34,
    fan: 'leaf', coreMesh: 'leaf', satellite: 'leaf', guardian: 'leaf', ghost: 'leaf', blade: 'leaf',
    burstGeo: 'petal', burst: [0x7ee8a0, 0x48c47a, 0xd0ffd8], trail: [0x9af0b4, 0x7ee8a0, 0xd0ffd8],
    groundDark: 0x124420,
    slashStyle: 'spike', rain: 'spike', rainMode: 'rise', pillar: false,
    orbitR: .38, orbitW: 22, wobble: .18, guards: 8, dome: 'sphere', dashWake: 'sparks',
  },
  7: { // Nguyệt bạch — liềm trăng đứng quét, mưa liềm bạc, vòm halo nguyệt
    sigil: 'moon', main: 0xf6f7ff, accent: 0xcdd9ff, core: 0xffffff, edge: 0x5b648f,
    fan: 'moon', coreMesh: 'orb', satellite: 'star', guardian: 'moon', ghost: 'moon', blade: 'moon',
    burstGeo: 'spark', burst: [0xf6f7ff, 0xcdd9ff, 0xffffff], trail: [0xeef1ff, 0xf6f7ff, 0xcdd9ff],
    groundDark: 0x2c3252,
    slashStyle: 'moonArc', rain: 'moon', rainMode: 'fall', pillar: true,
    orbitR: .44, orbitW: 20, wobble: .28, guards: 4, dome: 'halo', dashWake: 'sparks',
  },
  8: { // Hắc ám — vòng tối nở, quỷ hỏa bùng, vòm lục lăng
    sigil: 'dark', main: 0xa86bdd, accent: 0x7a2ecc, core: 0xe3c8ff, edge: 0x2a0d4a,
    fan: 'ember', coreMesh: 'orb', satellite: 'ember', guardian: 'orb', ghost: 'ember', blade: 'ember',
    burstGeo: 'spark', burst: [0xa86bdd, 0x7a2ecc, 0xe3c8ff], trail: [0xbc8ce8, 0xa86bdd, 0xe3c8ff],
    groundDark: 0x1c0a33,
    slashStyle: 'voidWave', rain: 'ember', rainMode: 'rise', pillar: true,
    orbitR: .5, orbitW: 14, wobble: .16, guards: 6, dome: 'hex', dashWake: 'sparks',
  },
  9: { // Long quyền — long trảo vồ, cột hỏa dội, đạn bay thẳng nhanh
    sigil: 'dragonRed', main: 0xff7a30, accent: 0xff3d00, core: 0xffc46b, edge: 0x6e1c00,
    fan: 'claw', coreMesh: 'ember', satellite: 'ember', guardian: 'ember', ghost: 'claw', blade: 'claw',
    burstGeo: 'spark', burst: [0xff7a30, 0xff3d00, 0xffc46b], trail: [0xff9550, 0xff7a30, 0xffc46b],
    groundDark: 0x4a1400,
    slashStyle: 'claw', rain: 'ember', rainMode: 'rise', pillar: true,
    orbitR: .3, orbitW: 30, wobble: .1, guards: 4, dome: 'sphere', dashWake: 'sparks',
  },
  10: { // Xích diễm — quạt đao xích, tàn hồng bùng
    sigil: 'flame', main: 0xff5b3a, accent: 0xd94b2b, core: 0xffb440, edge: 0x4a0f08,
    fan: 'ember', coreMesh: 'ember', satellite: 'ember', guardian: 'ember', ghost: 'ember', blade: 'ember',
    burstGeo: 'spark', burst: [0xff5b3a, 0xd94b2b, 0xffb440], trail: [0xff7e5e, 0xff5b3a, 0xffb440],
    groundDark: 0x40100a,
    slashStyle: 'emberFan', rain: 'ember', rainMode: 'rise', pillar: true,
    orbitR: .38, orbitW: 26, wobble: .12, guards: 6, dome: 'sphere', dashWake: 'sparks',
  },
  11: { // Kim long — vòm chém vàng, mưa phi kiếm vàng, đạn lượn như rồng
    sigil: 'dragonGold', main: 0xffedac, accent: 0xe0a83c, core: 0xfff6d8, edge: 0x5c420e,
    fan: 'sword', coreMesh: 'sword', satellite: 'sword', guardian: 'sword', ghost: 'sword', blade: 'sword',
    burstGeo: 'spark', burst: [0xffedac, 0xe0a83c, 0xfff6d8], trail: [0xfff2c2, 0xffedac, 0xe0a83c],
    groundDark: 0x3a2c0e,
    slashStyle: 'crescent', rain: 'blade', rainMode: 'fall', pillar: false,
    orbitR: .42, orbitW: 22, wobble: .3, guards: 4, dome: 'sphere', dashWake: 'sparks',
  },
  12: { // Kiếm vũ — xòe kiếm xanh, mưa kiếm teal
    sigil: 'sword', main: 0x7be0cf, accent: 0x3ec2ae, core: 0xd9fff2, edge: 0x123c36,
    fan: 'sword', coreMesh: 'sword', satellite: 'sword', guardian: 'sword', ghost: 'sword', blade: 'sword',
    burstGeo: 'shard', burst: [0x7be0cf, 0x3ec2ae, 0xd9fff2], trail: [0x9be8da, 0x7be0cf, 0xd9fff2],
    groundDark: 0x0c3830,
    slashStyle: 'fanSwords', rain: 'blade', rainMode: 'fall', pillar: false,
    orbitR: .46, orbitW: 24, wobble: .2, guards: 6, dome: 'sphere', dashWake: 'sparks',
  },
};
const pkTheme = (effect) => PK_THEMES[effect] ?? null;

// Dáng đòn đánh thường theo tông: trả { wave, waveEdge?, cross1?, cross2?, extras }.
// wave là mảnh chính được update() làm mờ dần; extras là các mảnh phụ với userData
// {spin, grow, vx, vy, vz} — update() cộng dần mỗi khung nên tua lại vẫn đúng khung.
function buildSlashStrike(t) {
  const style = t?.slashStyle ?? 'crescent';
  const mat = (color, opacity = .95) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide,
    transparent: true, opacity, depthWrite: false, blending: THREE.NormalBlending });
  const arc = (r0, r1, span = Math.PI * .9) =>
    new THREE.Mesh(new THREE.RingGeometry(r0, r1, 48, 1, -span / 2, span), mat(t?.main ?? 0xffdf91));
  const extras = [];
  const push = (m, x, y, z, u) => {
    m.position.set(x, y, z);
    Object.assign(m.userData, u);
    extras.push(m);
    return m;
  };
  const radial = (n, meshFn, r, speed, spin) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      push(meshFn(i), Math.cos(a) * r, Math.sin(a) * r * .72 + .1, .8,
        { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * .8, spin: (i % 2 ? 1 : -1) * spin });
    }
  };

  if (style === 'petalBurst') { // Sen kim / Đào hoa — vòng cung + cánh nở toả
    const wave = arc(1.14, 1.3);
    wave.position.z = .45;
    radial(10, (i) => motifMesh(t.fan, t, i), 1.05, 1.7, 2.5);
    return { wave, extras };
  }
  if (style === 'waves') { // Lưu ly — ba lớp sóng nước dâng
    const wave = arc(1.12, 1.34, Math.PI * 1.2);
    wave.rotation.x = -.55;
    wave.position.z = .45;
    for (let k = 1; k <= 2; k++) {
      const layer = arc(1.0 - k * .16, 1.14 - k * .16, Math.PI * 1.2);
      layer.rotation.x = -.55;
      layer.position.set(0, -.28 * k, .45 + k * .18);
      push(layer, layer.position.x, layer.position.y, layer.position.z, { vy: 1.5 + k * .5, spin: .6 * (k % 2 ? 1 : -1) });
    }
    for (let i = 0; i < 4; i++) push(motifMesh(t.fan, t, i), (i - 1.5) * .5, -.2 + (i % 2) * .3, .9,
      { vx: (i - 1.5) * 1.1, vy: .9, spin: 2.4 });
    return { wave, extras };
  }
  if (style === 'starBurst') { // Tinh hà — sao băng toả 12 hướng
    const wave = arc(1.2, 1.36);
    wave.position.z = .45;
    radial(12, (i) => motifMesh(t.fan, t, i), .95, 2.4, 6);
    return { wave, extras };
  }
  if (style === 'emberFan') { // Hỏa diễm / Xích diễm — quạt lửa xòe trước
    const wave = arc(1.22, 1.4);
    wave.position.z = .45;
    for (let k = 0; k < 5; k++) {
      const m = motifMesh('ember', t, k);
      m.rotation.x = -Math.PI / 2;
      m.scale.multiplyScalar(1.5);
      push(m, (k - 2) * .46, -.05 + Math.abs(k - 2) * -.08, .75, { vx: (k - 2) * 1.2, vy: .6, grow: 1.4 });
    }
    return { wave, extras };
  }
  if (style === 'spike') { // Bích ngọc — trúc tiễn phóng thẳng
    const wave = arc(1.18, 1.34);
    wave.position.z = .45;
    for (let i = 0; i < 6; i++) {
      const m = motifMesh(t.fan, t, i);
      m.rotation.x = Math.PI / 2;
      m.scale.multiplyScalar(1.4);
      push(m, (i % 3 - 1) * .46, -.25 + Math.floor(i / 3) * .5, .6 + i * .16, { vz: 3.6, spin: 0 });
    }
    return { wave, extras };
  }
  if (style === 'moonArc') { // Nguyệt bạch — liềm trăng lớn quét ngang
    const wave = arc(1.3, 1.58, Math.PI * 1.0);
    wave.rotation.x = -.18;
    wave.position.z = .45;
    const edge = new THREE.Mesh(new THREE.RingGeometry(1.58, 1.66, 48, 1, -Math.PI * .5, Math.PI),
      mat(t?.edge ?? 0x5b648f, .9));
    edge.rotation.x = -.18;
    edge.position.z = .44;
    for (let k = 0; k < 3; k++) {
      const m = motifMesh('moon', t, k);
      push(m, (k - 1) * .8, .15 - k * .22, .95 + k * .3, { vx: (k - 1) * 1.3, vy: .5, spin: (k - 1) * 2.2, grow: .5 });
    }
    return { wave, waveEdge: edge, extras };
  }
  if (style === 'voidWave') { // Hắc ám — vòng tối nở + quỷ hỏa trôi
    const wave = new THREE.Mesh(new THREE.TorusGeometry(1.05, .1, 8, 40), mat(t?.main ?? 0xa86bdd, .9));
    wave.position.z = .5;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + .4;
      push(motifMesh('orb', t, i), Math.cos(a) * .7, Math.sin(a) * .6, .55,
        { vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.3, grow: .8 });
    }
    return { wave, extras };
  }
  if (style === 'claw') { // Long quyền — ba vệt long trảo vồ
    const wave = arc(1.26, 1.44);
    wave.position.z = .45;
    for (let k = 0; k < 3; k++) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(.07, 1.05, .07),
        new THREE.MeshBasicMaterial({ color: k % 2 ? t.accent : t.main, transparent: true, opacity: .92,
          depthWrite: false, blending: THREE.AdditiveBlending }));
      mark.rotation.z = (k - 1) * .3;
      push(mark, (k - 1) * .52, 0, .8, { grow: 1.5, vy: .4 });
    }
    for (let k = 0; k < 2; k++) {
      const m = motifMesh('claw', t, k);
      m.rotation.x = Math.PI / 2;
      push(m, (k ? .4 : -.4), -.15, 1.05, { vz: 2.8 });
    }
    return { wave, extras };
  }
  if (style === 'fanSwords') { // Kiếm vũ — xòe kiếm xanh phóng tới
    const wave = arc(1.22, 1.38);
    wave.position.z = .45;
    for (let i = 0; i < 5; i++) {
      const m = createSwordMesh(i % 2 ? t.accent : t.main, t.core);
      m.rotation.x = Math.PI / 2;
      m.scale.setScalar(1.1);
      push(m, (i % 3 - 1) * .44, -.3 + Math.floor(i / 3) * .55, .55 + i * .18, { vz: 4.2 - i * .3, spin: 0 });
    }
    return { wave, extras };
  }
  // 'crescent' — Vô Môn / Kim Long: vòm chém bắt chéo như bản gốc.
  const wave = arc(1.3, 1.48);
  wave.position.z = .45;
  const waveEdge = new THREE.Mesh(new THREE.RingGeometry(1.48, 1.56, 48, 1, -Math.PI * .45, Math.PI * .9),
    mat(t?.edge ?? 0x284c40, .9));
  waveEdge.position.z = .44;
  const cross1 = new THREE.Mesh(new THREE.RingGeometry(.94, 1.04, 36, 1, -Math.PI * .38, Math.PI * .76),
    mat(t?.accent ?? 0x86c9ae, .85));
  cross1.rotation.z = Math.PI / 4;
  cross1.position.z = .35;
  const cross2 = new THREE.Mesh(cross1.geometry, cross1.material);
  cross2.rotation.z = -Math.PI / 4;
  cross2.position.z = .35;
  return { wave, waveEdge, cross1, cross2, extras };
}

// Vẽ canvas một lần cho mọi PkVfx (kể cả bản làm nóng shader); không bao giờ dispose.
let sharedTextures = null;
function pkTextures() {
  sharedTextures ??= {
    bagua: createBaguaTexture(),
    lotus: createLotusMandalaTexture(),
    flame: createFlameArrayTexture(),
    poisonPalm: createPoisonPalmTexture(),
    ...Object.fromEntries(Object.entries(SIGIL_SPECS).map(([key, spec]) => [key, createSigilTexture(spec)])),
  };
  return sharedTextures;
}

export class PkVfx {
  constructor(scene) {
    this.scene = scene;
    this.slashes = [];
    this.claws = [];
    this.flameBursts = [];
    this.poisonPalms = [];
    this.meditations = [];
    this.damagePopups = [];
    this.sparks = [];
    this.projectiles = [];
    this.dashes = [];
    this.shields = [];
    this.shockwaves = [];
    this.aoeFields = [];
    this.pillars = [];
    this.techniques = [];
    this.aoeDummy = new THREE.Object3D();

    // Bộ texture và geometry dùng chung
    const textures = pkTextures();
    this.baguaTex = textures.bagua;
    this.lotusTex = textures.lotus;
    this.flameTex = textures.flame;
    this.poisonPalmTex = textures.poisonPalm;
    // Bảng pháp trận theo key theme (SIGIL_SPECS + 3 trận có sẵn).
    this.sigilTex = { bagua: textures.bagua, lotus: textures.lotus, flame: textures.flame,
      ...Object.fromEntries(Object.keys(SIGIL_SPECS).map((key) => [key, textures[key]])) };
    this.sparkGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
    this.petalGeo = new THREE.PlaneGeometry(0.07, 0.12);
    this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xb8e8cd, blending: THREE.AdditiveBlending });
    this.goldMat = new THREE.MeshBasicMaterial({ color: 0xd8b46d, blending: THREE.AdditiveBlending });
    this.soulMat = new THREE.MeshBasicMaterial({ color: 0x79baa4, blending: THREE.AdditiveBlending });
    this.iceShardGeo = new THREE.TetrahedronGeometry(0.08);
    this.iceShardMat = new THREE.MeshBasicMaterial({ color: 0x64d2ff, blending: THREE.AdditiveBlending });
  }

  /**
   * Cửu Thiên Lôi Kiếm (Judgement Crescent Slash - M1):
   * Đao quang kiếm khí đan chéo hình cánh én anime, pháp trận chân lôi và tia sét ziczac.
   */
  slash({ x, y = 0, z, rot = 0, color = 0x00f0ff, effect = 0 }) {
    const t = pkTheme(effect);
    const group = new THREE.Group();

    // 1. Pháp trận kiếm khí chân đế (Daoist Ground Sigil) — đổi theo aura
    const sigilGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const sigilMat = new THREE.MeshBasicMaterial({
      map: t ? this.sigilTex[t.sigil] : this.baguaTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const sigil = new THREE.Mesh(sigilGeo, sigilMat);
    sigil.rotation.x = -Math.PI / 2;
    sigil.position.y = -0.78;

    // 2. Lõi năng lượng trung tâm (nhỏ gọn sắc nét, không bị chói lóa)
    const orbGeo = new THREE.OctahedronGeometry(0.12, 1);
    const orbMat = new THREE.MeshBasicMaterial({
      color: t?.core ?? 0xf3dfad,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);

    // 3. Vòng hồ quang xoay tít
    const ringGeo = new THREE.TorusGeometry(0.55, 0.035, 8, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: t?.accent ?? 0x9bd7b9,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.y = Math.PI / 2;

    const swordFan = [];
    for (let k = -1; k <= 1; k++) {
      const sword = t ? motifMesh(t.fan, t, k + 1) : createSwordMesh(k === 0 ? 0xe9dfbb : 0x8fc9a9, 0xd8b46d);
      sword.scale.setScalar((k === 0 ? 1.2 : .9) * (!t ? 1 : MOTIF_SCALE[t.fan]));
      sword.rotation.set(Math.PI / 2, 0, k * .3);
      sword.position.set(k * .34, k === 0 ? .1 : -.1, .7 + Math.abs(k) * .1);
      group.add(sword);
      swordFan.push(sword);
    }

    // 4+5. Đòn chính theo tông aura (buildSlashStrike) — wave làm mờ dần, extras tự chuyển động.
    const strike = buildSlashStrike(t);
    const { wave, waveEdge, cross1, cross2 } = strike;
    const extras = strike.extras;
    for (const m of extras) group.add(m);

    // 6. Tia năng lượng anime ziczac
    const bolts = [];
    for (let k = 0; k < 4; k++) {
      const boltGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.9, 4);
      const boltMat = new THREE.MeshBasicMaterial({
        color: t?.core ?? 0xe9d6a0,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.position.set((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4, 0.5 + k * 0.25);
      bolt.rotation.z = (Math.random() - 0.5) * 1.5;
      bolt.rotation.x = Math.PI / 2;
      group.add(bolt);
      bolts.push(bolt);
    }

    group.add(sigil, orb, ring1, ring2, wave);
    if (waveEdge) group.add(waveEdge);
    if (cross1) group.add(cross1);
    if (cross2) group.add(cross2);
    group.rotation.y = rot;
    group.position.set(x + Math.sin(rot) * 1.1, y + 1.25, z + Math.cos(rot) * 1.1);

    this.scene.add(group);
    this.slashes.push({
      group,
      orb,
      ring1,
      ring2,
      wave,
      waveEdge,
      cross1,
      cross2,
      sigil,
      bolts,
      swordFan,
      extras,
      rot,
      age: 0,
      life: 0.42,
    });
  }

  /**
   * Vạn Kiếm Quy Tông & Kim Long Ma Trận (Sword Array - Q / M2):
   * Khởi phát Thái Cực Bát Quái Trận, triệu hồi 6 Phi Kiếm Tiên Hiệp xoáy trôn ốc
   * dẫn đầu bởi Thần Long Hoàng Kim, chạm đích nổ Kiếm Trận Cực Hạn.
   */
  projectile({ fromX, fromY = 0, fromZ, toX, toY = 0, toZ, rot = 0, radius = 4, isHit = false, effect = 0 }) {
    const t = pkTheme(effect);
    this.areaBurst({ x: toX, y: toY, z: toZ, radius, effect });

    // Aura có tuyệt kỹ riêng (pk-techniques.js): tuyệt kỹ đảm nhiệm toàn bộ hành trình
    // và đòn nổ, PkVfx chỉ giữ trận đồ đích ở trên làm mốc vùng sát thương.
    if (effect && spawnQTechnique(this, { effect, t, fromX, fromY, fromZ, toX, toY, toZ, rot, radius, isHit })) return;

    const group = new THREE.Group();

    // 1. Trận đồ bốc lên từ mặt đất dưới chân người thi triển (đổi theo aura)
    const startSigilGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const startSigilMat = new THREE.MeshBasicMaterial({
      map: t ? this.sigilTex[t.sigil] : this.baguaTex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const startSigil = new THREE.Mesh(startSigilGeo, startSigilMat);
    startSigil.rotation.x = -Math.PI / 2;
    startSigil.position.set(fromX, fromY + 0.09, fromZ);
    this.scene.add(startSigil);

    // Lõi chính: phi kiếm (mặc định) hoặc linh vật theo aura.
    const dragon = t ? motifMesh(t.coreMesh, t) : createSwordMesh(0xf2e6bd, 0xd8b46d);
    if (!t || t.coreMesh === 'sword') dragon.rotation.x = Math.PI / 2;
    dragon.scale.multiplyScalar(1.65 * (!t || t.coreMesh === 'sword' ? 1 : MOTIF_SCALE[t.coreMesh]));
    group.add(dragon);

    // 3. Lõi năng lượng trung tâm (nhỏ gọn tinh tế)
    const coreGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({
      color: t?.core ?? 0xe6c680,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // 4. Bầy 6 vệ tinh xoay vần vũ quanh tâm
    const swords = [];
    const swordColors = [0x9bd7b9, 0xd8b46d, 0xb8e8cd, 0x83bca1, 0xe6d399, 0xa5d6bd];
    for (let k = 0; k < 6; k++) {
      const sw = t ? motifMesh(t.satellite, t, k) : createSwordMesh(swordColors[k], 0xd8b46d);
      sw.scale.multiplyScalar(t && t.satellite !== 'sword' ? .9 * MOTIF_SCALE[t.satellite] : 1.2);
      if (!t || t.satellite === 'sword') sw.rotation.x = Math.PI / 2; // Hướng mũi kiếm về phía trước
      group.add(sw);
      swords.push(sw);
    }

    group.rotation.y = rot;
    group.position.set(fromX, fromY + 0.85, fromZ);
    this.scene.add(group);

    const dist = Math.hypot(toX - fromX, toZ - fromZ);
    const life = Math.max(0.18, dist / 15);

    this.projectiles.push({
      group,
      startSigil,
      core,
      dragon,
      swords,
      fromX,
      fromY: fromY + 0.85,
      fromZ,
      toX,
      toY: toY + 0.85,
      toZ,
      age: 0,
      life,
      isHit,
      radius,
      rot,
      effect,
      orbitR: t?.orbitR ?? .42,
      orbitW: t?.orbitW ?? 18,
      wobble: t?.wobble ?? .14,
      trailColors: t?.trail,
      trailTimer: 0,
    });
  }

  /**
   * Ngự Kiếm Phi Thần / Hư Không Đạp Bộ (Anime Flash Step / Space):
   * Tốc biến lướt kiếm không gian, để lại tàn ảnh kiếm khách và vết chém hư không.
   */
  dash({ fromX, fromY = 0, fromZ, toX, toY = 0, toZ, rot = 0, effect = 0 }) {
    const t = pkTheme(effect);
    // 1. Trận đồ bừng sáng tại điểm xuất phát (đổi theo aura)
    const sigilGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const sigilMat1 = new THREE.MeshBasicMaterial({
      map: t ? this.sigilTex[t.sigil] : this.baguaTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const originSigil = new THREE.Mesh(sigilGeo, sigilMat1);
    originSigil.rotation.x = -Math.PI / 2;
    originSigil.position.set(fromX, fromY + 0.06, fromZ);
    this.scene.add(originSigil);

    // Cột khí thăng thiên tại điểm đi (dịu nhẹ thanh thoát)
    const beamGeo = new THREE.CylinderGeometry(0.25, 0.45, 2.2, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: t?.accent ?? 0x8fc9a9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const originBeam = new THREE.Mesh(beamGeo, beamMat);
    originBeam.position.set(fromX, fromY + 1.4, fromZ);
    this.scene.add(originBeam);

    const blades = [];
    for (let i = 0; i < 5; i++) {
      const sword = t ? motifMesh(t.blade, t, i) : createSwordMesh(i % 2 ? 0xd8b46d : 0x9bd7b9, 0xe9dfbb);
      sword.rotation.set(Math.PI / 2, rot, 0);
      const bladeScale = (.65 + i * .06) * (!t ? 1 : MOTIF_SCALE[t.blade]);
      sword.scale.setScalar(bladeScale);
      sword.userData.s0 = bladeScale; // update() co dần theo tỉ lệ này, không ghi đè cứng.
      const t2 = (i + .5) / 5;
      sword.position.set(fromX + (toX - fromX) * t2, fromY + .65 + Math.sin(i * 2) * .12, fromZ + (toZ - fromZ) * t2);
      this.scene.add(sword);
      blades.push(sword);
    }

    // 2. Trận đồ tiếp ứng tại điểm đến
    const sigilMat2 = new THREE.MeshBasicMaterial({
      map: t ? this.sigilTex[t.sigil] : this.baguaTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const destSigil = new THREE.Mesh(sigilGeo.clone(), sigilMat2);
    destSigil.rotation.x = -Math.PI / 2;
    destSigil.position.set(toX, toY + 0.06, toZ);
    this.scene.add(destSigil);

    // 3. Dải khí quang không gian nối liền (Spatial Streamer)
    const lineGeo = new THREE.CylinderGeometry(0.19, 0.19, Math.hypot(toX - fromX, toZ - fromZ), 8);
    const lineMat = new THREE.MeshBasicMaterial({
      color: t?.core ?? 0xfff1bb,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const streak = new THREE.Mesh(lineGeo, lineMat);
    streak.position.set((fromX + toX) / 2, fromY + 1.05, (fromZ + toZ) / 2);
    const dashDirection = new THREE.Vector3(toX - fromX, 0, toZ - fromZ).normalize();
    streak.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dashDirection);
    this.scene.add(streak);
    const wake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, Math.hypot(toX - fromX, toZ - fromZ), 8, 1, true),
      new THREE.MeshBasicMaterial({ color: t?.accent ?? 0x72b89a, side: THREE.DoubleSide, transparent: true,
        opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    wake.position.copy(streak.position);
    wake.rotation.copy(streak.rotation);
    this.scene.add(wake);
    const widthX = -dashDirection.z;
    const widthZ = dashDirection.x;
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      fromX + widthX * 0.35, fromY + 0.28, fromZ + widthZ * 0.35,
      fromX - widthX * 0.35, fromY + 0.28, fromZ - widthZ * 0.35,
      toX + widthX * 0.75, toY + 0.28, toZ + widthZ * 0.75,
      fromX - widthX * 0.35, fromY + 0.28, fromZ - widthZ * 0.35,
      toX - widthX * 0.75, toY + 0.28, toZ - widthZ * 0.75,
      toX + widthX * 0.75, toY + 0.28, toZ + widthZ * 0.75,
    ], 3));
    const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({
      color: t?.main ?? 0xf8d482, side: THREE.DoubleSide, transparent: true, opacity: 0.8,
      depthWrite: false, blending: THREE.NormalBlending,
    }));
    this.scene.add(trail);
    this.shockwave({ x: toX, y: toY + 0.06, z: toZ, color: t?.core ?? 0xffdf91,
      maxRadius: 1.5, duration: 0.32 });
    // Vệt lướt thêm theo tông: gợn sóng dọc đường (Lưu ly) hoặc bụi/cánh hoa tông màu.
    if (t?.dashWake === 'ripples') {
      for (const q of [.35, .7]) {
        this.shockwave({ x: fromX + (toX - fromX) * q, y: fromY + 0.06, z: fromZ + (toZ - fromZ) * q,
          color: t.accent, maxRadius: 1.1, duration: 0.3 });
      }
    } else if (t) {
      for (let i = 0; i < 8; i++) {
        const q = (i + .5) / 8;
        this.addTrailSpark(fromX + (toX - fromX) * q, fromY + .5 + Math.sin(i * 1.7) * .2,
          fromZ + (toZ - fromZ) * q, t.trail[i % t.trail.length]);
      }
    }

    // 4. Ba tàn ảnh phân thân dọc đường lướt (Ghost Echos)
    const ghosts = [];
    for (let k = 1; k <= 3; k++) {
      const t2 = k / 4;
      const gx = fromX + (toX - fromX) * t2;
      const gz = fromZ + (toZ - fromZ) * t2;

      const echoGroup = new THREE.Group();
      const sword = t ? motifMesh(t.ghost, t, k) : createSwordMesh(0x9bd7b9, 0xd8b46d);
      sword.scale.setScalar(.8 * (!t || t.ghost === 'sword' ? 1 : MOTIF_SCALE[t.ghost]));
      if (!t || t.ghost === 'sword') sword.rotation.x = Math.PI / 2;
      echoGroup.add(sword);
      echoGroup.position.set(gx, fromY + 0.75, gz);
      echoGroup.rotation.y = rot;
      this.scene.add(echoGroup);
      ghosts.push(echoGroup);
    }

    this.dashes.push({
      originSigil,
      originBeam,
      destSigil,
      streak,
      wake,
      trail,
      ghosts,
      blades,
      toX,
      toY,
      toZ,
      age: 0,
      life: 0.45,
    });
  }

  /**
   * Thái Cực Bát Quái Kim Cang Hộ Thể (Tai Chi Bagua Divine Barrier - E):
   * Trận đồ Thái Cực Bát Quái dưới chân xoay liên tục, 4 thanh Trấn Sơn Kiếm
   * bay lơ lửng 4 phương hộ thể, quả cầu tinh thể kim cương và 3 vành đai phù chú.
   */
  shield({ x, y = 0, z, duration = 1600, targetFn = null, effect = 0 }) {
    const t = pkTheme(effect);
    const group = new THREE.Group();

    // 1. Trận đồ xoay tròn dưới chân (đổi theo aura)
    const groundSigilGeo = new THREE.PlaneGeometry(3.0, 3.0);
    const groundSigilMat = new THREE.MeshBasicMaterial({
      map: t ? this.sigilTex[t.sigil] : this.baguaTex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const groundSigil = new THREE.Mesh(groundSigilGeo, groundSigilMat);
    groundSigil.rotation.x = -Math.PI / 2;
    groundSigil.position.y = -0.76;

    // Màng chắn theo tông: cầu (mặc định), lục lăng (Hắc ám), halo nguyệt (Nguyệt bạch),
    // thêm gợn sóng lan (Lưu ly).
    const dome = t?.dome ?? 'sphere';
    const shieldGlow = new THREE.Mesh(
      dome === 'hex' ? new THREE.CylinderGeometry(1.22, 1.34, 1.7, 6, 1, true)
        : new THREE.SphereGeometry(dome === 'halo' ? 1.4 : 1.18, 24, 18),
      new THREE.MeshBasicMaterial({
        color: t?.accent ?? 0x8fc9a9,
        transparent: true,
        opacity: dome === 'halo' ? .1 : .16,
        depthWrite: false,
        blending: THREE.NormalBlending,
        side: dome === 'hex' ? THREE.DoubleSide : THREE.FrontSide,
      }),
    );
    const ripples = [];
    if (dome === 'rings') {
      for (let k = 0; k < 2; k++) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(1.2, .035, 6, 40),
          new THREE.MeshBasicMaterial({ color: t?.main ?? 0x7ee8e0, transparent: true, opacity: .5,
            depthWrite: false, blending: THREE.AdditiveBlending }));
        r.rotation.x = Math.PI / 2;
        r.position.y = -.35;
        group.add(r);
        ripples.push(r);
      }
    }
    let haloRing = null;
    if (dome === 'halo') {
      haloRing = new THREE.Mesh(new THREE.TorusGeometry(1.55, .05, 8, 48),
        new THREE.MeshBasicMaterial({ color: t?.core ?? 0xffffff, transparent: true, opacity: .75,
          depthWrite: false, blending: THREE.AdditiveBlending }));
      haloRing.rotation.x = Math.PI / 2;
      haloRing.position.y = .4;
      group.add(haloRing);
    }

    // 3. Hai vành đai phù chú cổ ngữ xoay quanh (orbital rings - thanh thoát)
    const ringGeo = new THREE.TorusGeometry(1.28, 0.055, 8, 36);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: t?.main ?? 0xd8b46d, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const ring1 = new THREE.Mesh(ringGeo, ringMat1);
    ring1.rotation.x = Math.PI / 2;

    const ringMat2 = new THREE.MeshBasicMaterial({ color: t?.accent ?? 0x8fc9a9, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending });
    const ring2 = new THREE.Mesh(ringGeo, ringMat2);
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 4;

    // 4. Linh vật hộ thể bay lơ lửng quanh thân — số lượng theo tông
    const guardianSwords = [];
    const guardColors = [0xd8b46d, 0x8fc9a9, 0xe9dfbb, 0x79baa4];
    const guardCount = t?.guards ?? 4;
    for (let i = 0; i < guardCount; i++) {
      const sw = t ? motifMesh(t.guardian, t, i) : createSwordMesh(guardColors[i % guardColors.length], 0xd8b46d);
      sw.scale.setScalar(.85 * (!t || t.guardian === 'sword' ? 1 : MOTIF_SCALE[t.guardian]));
      group.add(sw);
      guardianSwords.push(sw);
    }

    const lotus = new THREE.Group();
    for (let tier = 0; tier < 2; tier++) {
      for (let i = 0; i < 8; i++) {
        const petal = createPkPetal();
        const angle = i * Math.PI / 4 + tier * Math.PI / 8;
        petal.rotation.set(-.28, Math.PI / 2 - angle, 0);
        petal.position.set(Math.cos(angle) * (tier ? .4 : .82), -.73 + tier * .08, Math.sin(angle) * (tier ? .4 : .82));
        petal.scale.setScalar(tier ? .52 : .7);
        lotus.add(petal);
      }
    }
    group.add(lotus);

    group.add(groundSigil, shieldGlow, ring1, ring2);
    group.position.set(x, y + 0.85, z);
    this.scene.add(group);

    this.shields.push({
      group,
      groundSigil,
      shieldGlow,
      ring1,
      ring2,
      guardianSwords,
      lotus,
      ripples,
      haloRing,
      tech: spawnDomain(group, effect, t),
      targetFn,
      age: 0,
      life: duration / 1000,
      x,
      y,
      z,
    });
  }

  /**
   * Hàng Long Thần Trảo (Dragon Claw Tear - Chiêu 2):
   * 3 móng vuốt hoàng kim xé toạc hư không, thần long hiển linh và vết rách không gian rực lửa.
   */
  claw({ x, y = 0, z, rot = 0 }) {
    const group = new THREE.Group();

    // 1. Móng vuốt thần long 3 nhát cào (sắc nhọn, rõ nét chuẩn anime, không chói)
    const claws = createDragonClawMesh(0xffa000, 0xffe082);
    claws.position.set(0, 0, 0.4);

    // 2. Ảo ảnh Thần Long Hoàng Kim gầm thét lao tới
    const dragon = createDragonHeadMesh();
    dragon.position.set(0, 0.15, 0.85);
    dragon.rotation.y = Math.PI;
    dragon.scale.setScalar(0.9);

    // 3. Vết rách không gian đan chéo sắc bén (Crisp Spatial Rip Arcs)
    const ripGeo = new THREE.RingGeometry(1.05, 1.25, 28, 1, -Math.PI * 0.38, Math.PI * 0.76);
    const ripMat = new THREE.MeshBasicMaterial({
      color: 0xd84315,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const rip1 = new THREE.Mesh(ripGeo, ripMat);
    rip1.rotation.x = Math.PI / 2.5;
    rip1.rotation.z = -Math.PI / 5;
    rip1.position.z = 0.5;

    const rip2 = new THREE.Mesh(ripGeo, ripMat.clone());
    rip2.rotation.x = Math.PI / 2.5;
    rip2.rotation.z = Math.PI / 4;
    rip2.position.z = 0.6;

    group.add(claws, dragon, rip1, rip2);
    group.rotation.y = rot;
    group.position.set(x + Math.sin(rot) * 0.75, y + 0.85, z + Math.cos(rot) * 0.75);

    this.scene.add(group);
    this.claws.push({
      group,
      claws,
      dragon,
      rip1,
      rip2,
      rot,
      age: 0,
      life: 0.35,
    });

    // Sóng xung kích hoàng kim dưới đất
    this.shockwave({
      x: x + Math.sin(rot) * 0.9,
      y: y + 0.05,
      z: z + Math.cos(rot) * 0.9,
      color: 0xffd700,
      maxRadius: 2.2,
      duration: 0.28,
    });

    // 12 tia lửa hoàng kim xé toạc
    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(this.sparkGeo, this.goldMat.clone());
      p.position.set(x + Math.sin(rot) * 0.8, y + 0.85, z + Math.cos(rot) * 0.8);
      const angle = rot + (Math.random() - 0.5) * 1.6;
      const speed = 2.5 + Math.random() * 2.8;
      this.scene.add(p);
      this.sparks.push({
        mesh: p,
        vx: Math.sin(angle) * speed,
        vy: 1.2 + Math.random() * 2.0,
        vz: Math.cos(angle) * speed,
        rotSpeed: 0,
        age: 0,
        life: 0.35,
      });
    }
  }

  /**
   * Liệt Hỏa Bạo Viêm (Hellfire Flame Vortex - Chiêu 5):
   * Khởi phát Địa Viêm Ma Trận bát giác, cột lốc xoáy song hỏa thăng thiên, dung nham bốc cháy.
   */
  flameBurst({ x, y = 0, z, rot = 0 }) {
    const group = new THREE.Group();

    // 1. Trận đồ Hỏa Viêm Bát Giác phát sáng trên mặt đất (rõ nét chuẩn anime, không chìm dưới sàn)
    const arrayGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const arrayMat = new THREE.MeshBasicMaterial({
      map: this.flameTex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const groundArray = new THREE.Mesh(arrayGeo, arrayMat);
    groundArray.rotation.x = -Math.PI / 2;
    groundArray.position.y = -0.76;

    // 2. Cột hỏa diễm xoáy kép (Double-helix rising flame vortex - màu lửa đậm đà)
    const vortexGeo1 = new THREE.CylinderGeometry(0.5, 1.2, 3.2, 16, 1, true);
    const vortexMat1 = new THREE.MeshBasicMaterial({
      color: 0xd84315,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const vortex1 = new THREE.Mesh(vortexGeo1, vortexMat1);
    vortex1.position.y = 0.8;

    const vortexGeo2 = new THREE.CylinderGeometry(0.3, 0.9, 3.4, 16, 1, true);
    const vortexMat2 = new THREE.MeshBasicMaterial({
      color: 0xff9800,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const vortex2 = new THREE.Mesh(vortexGeo2, vortexMat2);
    vortex2.position.y = 0.9;

    // 3. Vòng dung nham rực đỏ dưới đáy sàn (không che mắt camera)
    const magmaRingGeo = new THREE.RingGeometry(0.35, 0.95, 24);
    const magmaRingMat = new THREE.MeshBasicMaterial({
      color: 0xff3d00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const magmaRing = new THREE.Mesh(magmaRingGeo, magmaRingMat);
    magmaRing.rotation.x = -Math.PI / 2;
    magmaRing.position.y = -0.74;

    // 4. Vòng lửa dung nham bành trướng
    const ringGeo = new THREE.TorusGeometry(1.3, 0.04, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const fireRing = new THREE.Mesh(ringGeo, ringMat);
    fireRing.rotation.x = Math.PI / 2;
    fireRing.position.y = -0.3;

    // 5. Ba lưỡi hỏa diễm phong cách anime xoáy thăng thiên (Curved Anime Flame Blades)
    const flameBlades = [];
    for (let k = 0; k < 3; k++) {
      const fbGeo = new THREE.RingGeometry(0.55, 0.95, 20, 1, -Math.PI * 0.35, Math.PI * 0.7);
      const fbMat = new THREE.MeshBasicMaterial({
        color: k % 2 === 0 ? 0xff3d00 : 0xff9100,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      const blade = new THREE.Mesh(fbGeo, fbMat);
      blade.rotation.x = Math.PI / 3;
      blade.rotation.z = (k * Math.PI * 2) / 3;
      blade.position.y = 0.4 + k * 0.25;
      group.add(blade);
      flameBlades.push(blade);
    }

    group.add(groundArray, vortex1, vortex2, magmaRing, fireRing);
    group.position.set(x, y + 0.85, z);
    this.scene.add(group);

    this.flameBursts.push({
      group,
      groundArray,
      vortex1,
      vortex2,
      magmaRing,
      fireRing,
      flameBlades,
      age: 0,
      life: 0.55,
    });

    // Sóng xung kích hỏa diễm
    this.shockwave({
      x,
      y: y + 0.05,
      z,
      color: 0xff3d00,
      maxRadius: 3.2,
      duration: 0.35,
    });

    // 20 đốm than hồng / dung nham bốc thẳng lên trời
    for (let i = 0; i < 20; i++) {
      const p = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff3d00 : 0xffea00, blending: THREE.AdditiveBlending }));
      p.position.set(x + (Math.random() - 0.5) * 1.4, y + 0.2 + Math.random() * 0.5, z + (Math.random() - 0.5) * 1.4);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 1.6;
      this.scene.add(p);
      this.sparks.push({
        mesh: p,
        vx: Math.cos(angle) * speed,
        vy: 3.2 + Math.random() * 3.5,
        vz: Math.sin(angle) * speed,
        rotSpeed: (Math.random() - 0.5) * 8,
        age: 0,
        life: 0.5,
      });
    }
  }

  /**
   * Ngũ Độc Thần Chưởng (Five Poisons Jade Palm - Chiêu 6):
   * Đại Chưởng Ấn lục bảo phát quang lao vút về phía trước, âm khí cuồn cuộn, sương độc bùng nổ.
   */
  poisonPalm({ x, y = 0, z, rot = 0 }) {
    const group = new THREE.Group();

    // 1. Chưởng Ấn Ngũ Độc Thần Chưởng Lục Bảo khổng lồ (rõ nét chuẩn anime, không chói)
    const palmGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const palmMat = new THREE.MeshBasicMaterial({
      map: this.poisonPalmTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const palmMesh = new THREE.Mesh(palmGeo, palmMat);
    palmMesh.position.set(0, 0, 0.2);

    // Tàn ảnh chưởng lực đi kèm tạo cảm giác tốc độ
    const echoGeo = new THREE.PlaneGeometry(3.0, 3.0);
    const echoMat = new THREE.MeshBasicMaterial({
      map: this.poisonPalmTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const echoMesh = new THREE.Mesh(echoGeo, echoMat);
    echoMesh.position.set(0, 0, -0.25);

    // 2. Hai vành đai độc khí xoay quanh chưởng ấn
    const ringGeo = new THREE.TorusGeometry(1.6, 0.04, 8, 30);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00c853,
      transparent: true,
      opacity: 0.65,
      blending: THREE.NormalBlending,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;

    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x69f0ae,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const ring2 = new THREE.Mesh(ringGeo, ringMat2);
    ring2.rotation.y = Math.PI / 3;

    // 3. Độc châu u linh phát quang ngọc bích nhỏ gọn
    const coreGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xb9f6ca,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);

    group.add(palmMesh, echoMesh, ring1, ring2, core);
    group.rotation.y = rot;
    group.position.set(x + Math.sin(rot) * 0.2, y + 0.95, z + Math.cos(rot) * 0.2);
    this.scene.add(group);

    this.poisonPalms.push({
      group,
      palmMesh,
      echoMesh,
      ring1,
      ring2,
      core,
      rot,
      age: 0,
      life: 0.45,
    });

    // Sóng xung kích độc khí màu ngọc bích
    this.shockwave({
      x: x + Math.sin(rot) * 1.4,
      y: y + 0.05,
      z: z + Math.cos(rot) * 1.4,
      color: 0x00e676,
      maxRadius: 2.5,
      duration: 0.32,
    });

    // 16 hạt sương độc lục bảo bốc tỏa
    for (let i = 0; i < 16; i++) {
      const p = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({ color: 0x00e676, blending: THREE.AdditiveBlending }));
      p.position.set(x + Math.sin(rot) * 0.8, y + 0.85, z + Math.cos(rot) * 0.8);
      const angle = rot + (Math.random() - 0.5) * 1.8;
      const speed = 2.0 + Math.random() * 2.2;
      this.scene.add(p);
      this.sparks.push({
        mesh: p,
        vx: Math.sin(angle) * speed,
        vy: 0.8 + Math.random() * 1.8,
        vz: Math.cos(angle) * speed,
        rotSpeed: 0,
        age: 0,
        life: 0.4,
      });
    }
  }

  /**
   * Tọa Thiền Tụ Khí (Golden Lotus Meditation Aura - Space):
   * Đóa sen vàng Phật Quang 16 cánh xoay chậm dưới chân, cột thiên quang thanh tịnh bao phủ.
   */
  meditationAura({ x, y = 0, z, duration = 30000, targetFn = null }) {
    this.stopMeditationAura();

    const group = new THREE.Group();

    // 1. Trận đồ Đóa Sen Vàng 16 cánh Phật Quang dưới chân
    const lotusGeo = new THREE.PlaneGeometry(3.0, 3.0);
    const lotusMat = new THREE.MeshBasicMaterial({
      map: this.lotusTex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const lotusGround = new THREE.Mesh(lotusGeo, lotusMat);
    lotusGround.rotation.x = -Math.PI / 2;
    lotusGround.position.y = -0.76;

    // 2. Cột thiên quang thanh tịnh bao bọc thân thể (Celestial Qi Column - thanh thoát nhẹ nhàng, thấy rõ nhân vật)
    const beamGeo = new THREE.CylinderGeometry(0.85, 1.15, 2.6, 20, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd54f,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 0.5;

    // 3. Vòng hào quang hoàng kim lơ lửng quanh thắt lưng
    const haloGeo = new THREE.TorusGeometry(1.05, 0.035, 8, 36);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const halo1 = new THREE.Mesh(haloGeo, haloMat);
    halo1.rotation.x = Math.PI / 2;
    halo1.position.y = -0.15;

    const halo2 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.03, 8, 36), haloMat.clone());
    halo2.rotation.x = Math.PI / 2.3;
    halo2.position.y = 0.25;

    group.add(lotusGround, beam, halo1, halo2);
    group.position.set(x, y + 0.85, z);
    this.scene.add(group);

    this.meditations.push({
      group,
      lotusGround,
      beam,
      halo1,
      halo2,
      targetFn,
      moteTimer: 0,
      age: 0,
      life: duration / 1000,
      x,
      y,
      z,
    });
  }

  stopMeditationAura() {
    for (const m of this.meditations) {
      this.scene.remove(m.group);
      m.group.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    this.meditations.length = 0;
  }

  /** Vòng sóng xung kích lan tỏa (Shockwave ring) */
  shockwave({ x, y = 0, z, color = 0x00f0ff, maxRadius = 1.8, duration = 0.28 }) {
    const geo = new THREE.RingGeometry(0.12, 0.46, 28);
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.shockwaves.push({
      mesh,
      age: 0,
      life: duration,
      maxRadius,
    });
  }

  areaBurst({ x, y = 0, z, radius = 4, effect = 0 }) {
    const t = pkTheme(effect);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 48),
      new THREE.MeshBasicMaterial({ color: t?.groundDark ?? 0x173629, transparent: true, opacity: 0.52,
        side: THREE.DoubleSide, depthWrite: false }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(x, y + 0.025, z);
    this.scene.add(ground);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({ map: t ? this.sigilTex[t.sigil] : this.baguaTex, transparent: true, opacity: 0.94,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.NormalBlending }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y + 0.035, z);
    mesh.scale.setScalar(0.45);
    this.scene.add(mesh);
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.94, radius, 64),
      new THREE.MeshBasicMaterial({ color: t?.core ?? 0xf8de94, transparent: true, opacity: 0.85,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(x, y + 0.055, z);
    this.scene.add(rim);
    const blade = new THREE.Shape();
    blade.moveTo(0, 1.15);
    blade.lineTo(0.18, 0.1);
    blade.lineTo(0.11, -0.22);
    blade.lineTo(0.4, -0.3);
    blade.lineTo(0.4, -0.42);
    blade.lineTo(0.07, -0.38);
    blade.lineTo(0.06, -0.76);
    blade.lineTo(0.14, -0.85);
    blade.lineTo(-0.14, -0.85);
    blade.lineTo(-0.06, -0.76);
    blade.lineTo(-0.07, -0.38);
    blade.lineTo(-0.4, -0.42);
    blade.lineTo(-0.4, -0.3);
    blade.lineTo(-0.11, -0.22);
    blade.lineTo(-0.18, 0.1);
    blade.closePath();
    // Vật rơi/bùng ở vùng nổ theo tông: kiếm (mặc định), cánh hoa, sao, cột mọc, mảnh, liềm trăng, tàn lửa.
    const rainKind = t?.rain ?? 'blade';
    const rainGeo = rainKind === 'blade' ? new THREE.ShapeGeometry(blade)
      : rainKind === 'petal' ? new THREE.PlaneGeometry(.5, .9)
      : rainKind === 'star' ? new THREE.OctahedronGeometry(.28)
      : rainKind === 'spike' ? new THREE.ConeGeometry(.16, 1.5, 6)
      : rainKind === 'shard' ? new THREE.TetrahedronGeometry(.34)
      : rainKind === 'moon' ? new THREE.RingGeometry(.3, .46, 20, 1, 0, Math.PI * .85)
      : new THREE.ConeGeometry(.2, .8, 6); // ember
    const rise = t?.rainMode === 'rise';
    const swords = new THREE.InstancedMesh(
      rainGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true,
        opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending }), 24,
    );
    swords.position.set(x, y, z);
    for (let i = 0; i < 24; i++) swords.setColorAt(i, new THREE.Color(i % 3 ? (t?.main ?? 0xffdc7b) : (t?.core ?? 0xb8fff0)));
    this.scene.add(swords);
    this.aoeFields.push({ ground, mesh, rim, swords, radius, age: 0, life: 0.9, rise });
  }

  /** Bụi kiếm linh / hoa đào kiếm khí tiên hiệp bay theo chiêu */
  addTrailSpark(x, y, z, color = 0xffd700) {
    const isPetal = Math.random() > 0.6;
    const mesh = isPetal
      ? new THREE.Mesh(this.petalGeo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }))
      : new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({ color, blending: THREE.AdditiveBlending }));

    mesh.position.set(
      x + (Math.random() - 0.5) * 0.35,
      y + (Math.random() - 0.5) * 0.35,
      z + (Math.random() - 0.5) * 0.35
    );
    if (isPetal) {
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    }
    this.scene.add(mesh);

    this.sparks.push({
      mesh,
      vx: (Math.random() - 0.5) * 0.8,
      vy: Math.random() * 0.8,
      vz: (Math.random() - 0.5) * 0.8,
      rotSpeed: isPetal ? (Math.random() - 0.5) * 8 : 0,
      age: 0,
      life: 0.32,
    });
  }

  /** Mảnh vỡ tinh thể pha lê & kiếm linh khi kết thúc khiên */
  shatterIce(x, y, z) {
    for (let i = 0; i < 20; i++) {
      const p = new THREE.Mesh(this.iceShardGeo, this.iceShardMat.clone());
      p.position.set(x + (Math.random() - 0.5) * 0.9, y + 0.6 + Math.random() * 0.6, z + (Math.random() - 0.5) * 0.9);
      const angle = (i / 20) * Math.PI * 2;
      this.scene.add(p);
      this.sparks.push({
        mesh: p,
        vx: Math.cos(angle) * (2.2 + Math.random() * 1.6),
        vy: 1.6 + Math.random() * 1.8,
        vz: Math.sin(angle) * (2.2 + Math.random() * 1.6),
        rotSpeed: (Math.random() - 0.5) * 12,
        age: 0,
        life: 0.38,
      });
    }
  }

  /** Hiệu ứng trúng đòn: Phong cách Tiên Hiệp & Anime Pop-in */
  hit({ x, y = 0, z, damage = 20, isShielded = false }) {
    try {
      let label = `-${damage}`;
      let color = '#ff3d00'; // Đòn đánh thường
      let isSpecial = false;

      if (isShielded || damage <= 8) {
        label = `BẤT HOẠI! -${damage}`;
        color = '#ffe082'; // Khiên Kim Cang
        isSpecial = true;
      } else if (damage === 16) {
        label = `VẠN KIẾM! -${damage}`;
        color = '#00f0ff'; // Tuyệt kỹ Kiếm Trận
        isSpecial = true;
      } else {
        label = `CHÍ MẠNG! -${damage}`;
        color = '#00ff66'; // Bạo kích
        isSpecial = true;
      }

      const tex = createDamageTexture(label, color, isSpecial);
      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(1.5, 0.58, 1);
      sprite.position.set(
        x + (Math.random() - 0.5) * 0.25,
        y + 1.6,
        z + (Math.random() - 0.5) * 0.25
      );
      this.scene.add(sprite);

      this.damagePopups.push({
        sprite,
        tex,
        age: 0,
        life: 0.95,
        startY: sprite.position.y,
        baseScale: 1.5,
      });
    } catch {}

    // 2. Vòng sóng xung kích hoa văn bát quái
    this.shockwave({
      x,
      y: y + 0.85,
      z,
      color: isShielded ? 0xffd700 : damage === 16 ? 0x00f0ff : 0x00ff66,
      maxRadius: 1.4,
      duration: 0.26,
    });

    // 3. Pháo hoa kiếm linh va chạm (Anime Impact Starburst)
    const count = isShielded ? 16 : 12;
    const sparkColor = isShielded ? 0xffd700 : damage === 16 ? 0x00f0ff : 0x00ff66;
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({ color: sparkColor, blending: THREE.AdditiveBlending }));
      p.position.set(x, y + 0.9, z);
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 2.8 + Math.random() * 2.4;
      const vx = Math.cos(angle) * speed;
      const vy = 1.8 + Math.random() * 2.2;
      const vz = Math.sin(angle) * speed;
      this.scene.add(p);
      this.sparks.push({
        mesh: p,
        vx,
        vy,
        vz,
        rotSpeed: 0,
        age: 0,
        life: 0.32,
      });
    }
  }

  update(dt) {
    // Cập nhật Hàng Long Thần Trảo (Claw - Chiêu 2)
    for (let i = this.claws.length - 1; i >= 0; i--) {
      const cl = this.claws[i];
      cl.age += dt;
      const p = cl.age / cl.life;
      if (p >= 1) {
        this.scene.remove(cl.group);
        cl.group.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
        this.claws.splice(i, 1);
      } else {
        cl.claws.rotation.z += dt * 8;
        cl.claws.scale.setScalar(1 + p * 0.7);
        cl.dragon.position.z += dt * 4.0;
        cl.dragon.scale.setScalar(0.9 + p * 0.3);
        cl.rip1.material.opacity = Math.max(0, 0.85 * (1 - p));
        cl.rip2.material.opacity = Math.max(0, 0.85 * (1 - p));
        cl.group.position.x += Math.sin(cl.rot) * dt * 6.0;
        cl.group.position.z += Math.cos(cl.rot) * dt * 6.0;
      }
    }

    // Cập nhật Liệt Hỏa Bạo Viêm (Flame Burst - Chiêu 5)
    for (let i = this.flameBursts.length - 1; i >= 0; i--) {
      const fb = this.flameBursts[i];
      fb.age += dt;
      const p = fb.age / fb.life;
      if (p >= 1) {
        this.scene.remove(fb.group);
        fb.group.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
        this.flameBursts.splice(i, 1);
      } else {
        fb.groundArray.rotation.z += dt * 3.2;
        fb.groundArray.material.opacity = Math.max(0, 0.95 * (1 - p));
        fb.vortex1.rotation.y += dt * 12;
        fb.vortex1.scale.y = 1 + p * 0.6;
        fb.vortex2.rotation.y -= dt * 16;
        fb.vortex2.scale.y = 1 + p * 0.8;
        fb.vortex1.material.opacity = Math.max(0, 0.65 * (1 - p));
        fb.vortex2.material.opacity = Math.max(0, 0.6 * (1 - p));
        fb.magmaRing.material.opacity = Math.max(0, 0.85 * (1 - p));
        fb.magmaRing.scale.setScalar(1 + p * 0.6);
        fb.fireRing.scale.setScalar(1 + p * 0.9);
        if (fb.flameBlades) {
          for (let k = 0; k < fb.flameBlades.length; k++) {
            const b = fb.flameBlades[k];
            b.rotation.z += dt * (10 + k * 4);
            b.position.y += dt * 2.2;
            b.material.opacity = Math.max(0, 0.85 * (1 - p));
          }
        }
      }
    }

    // Cập nhật Ngũ Độc Thần Chưởng (Poison Palm - Chiêu 6)
    for (let i = this.poisonPalms.length - 1; i >= 0; i--) {
      const pp = this.poisonPalms[i];
      pp.age += dt;
      const p = pp.age / pp.life;
      if (p >= 1) {
        this.scene.remove(pp.group);
        pp.group.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
        this.poisonPalms.splice(i, 1);
      } else {
        pp.group.position.x += Math.sin(pp.rot) * dt * 8.5;
        pp.group.position.z += Math.cos(pp.rot) * dt * 8.5;
        pp.group.scale.setScalar(1 + p * 0.45);
        pp.ring1.rotation.z += dt * 12;
        pp.ring2.rotation.x += dt * 10;
        pp.palmMesh.material.opacity = Math.max(0, 0.95 * (1 - p));
        if (pp.echoMesh) pp.echoMesh.material.opacity = Math.max(0, 0.5 * (1 - p));
      }
    }

    // Cập nhật Tọa Thiền Tụ Khí (Meditation Aura - Space)
    for (let i = this.meditations.length - 1; i >= 0; i--) {
      const md = this.meditations[i];
      md.age += dt;
      const p = md.age / md.life;

      if (md.targetFn) {
        const pos = md.targetFn();
        if (pos) {
          md.group.position.set(pos.x, pos.y + 0.85, pos.z);
          md.x = pos.x;
          md.y = pos.y;
          md.z = pos.z;
        }
      }

      md.lotusGround.rotation.z += dt * 0.9;
      md.halo1.rotation.z += dt * 2.5;
      md.halo2.rotation.z -= dt * 3.0;
      const breath = 1 + Math.sin(md.age * 3.5) * 0.08;
      md.beam.scale.set(breath, 1, breath);

      md.moteTimer += dt;
      if (md.moteTimer >= 0.1) {
        md.moteTimer = 0;
        this.addTrailSpark(
          md.x + (Math.random() - 0.5) * 1.5,
          md.y + 0.2 + Math.random() * 0.4,
          md.z + (Math.random() - 0.5) * 1.5,
          0xffd700
        );
      }

      if (p >= 1) {
        this.scene.remove(md.group);
        md.group.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
        this.meditations.splice(i, 1);
      }
    }

    // 1. Cập nhật đòn đánh thường (M1) — dáng chính theo tông, extras chuyển động riêng.
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.age += dt;
      const p = s.age / s.life;
      if (p >= 1) {
        this.scene.remove(s.group);
        s.group.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
        this.slashes.splice(i, 1);
      } else {
        s.ring1.rotation.z += dt * 8;
        s.ring2.rotation.x += dt * 6;
        s.sigil.rotation.z += dt * 2;
        s.sigil.material.opacity = 0.7 * (1 - p);
        s.wave.material.opacity = 0.9 * (1 - p);
        if (s.waveEdge) s.waveEdge.material.opacity = 0.85 * (1 - p);
        if (s.cross1) s.cross1.material.opacity = 0.7 * (1 - p);
        for (let k = 0; k < s.swordFan.length; k++) {
          s.swordFan[k].position.z = .7 + p * (1.2 + .25 * k);
          s.swordFan[k].rotation.z += dt * (k - 1) * 2;
        }
        for (const m of s.extras ?? []) {
          const u = m.userData;
          if (u.spin) m.rotation.z += dt * u.spin;
          if (u.grow) m.scale.multiplyScalar(1 + u.grow * dt);
          if (u.vx) m.position.x += u.vx * dt;
          if (u.vy) m.position.y += u.vy * dt;
          if (u.vz) m.position.z += u.vz * dt;
        }
        s.group.position.x += Math.sin(s.rot) * dt * 7;
        s.group.position.z += Math.cos(s.rot) * dt * 7;
        s.group.scale.setScalar(0.85 + p * 0.45);
      }
    }

    // 2. Cập nhật Vạn Kiếm Quy Tông (Q / M2)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.age += dt;
      const p = Math.min(1, pr.age / pr.life);

      // Điểm tâm đàn kiếm lao về đích
      const hx = pr.fromX + (pr.toX - pr.fromX) * p;
      const hy = pr.fromY + (pr.toY - pr.fromY) * p;
      const hz = pr.fromZ + (pr.toZ - pr.fromZ) * p;
      pr.group.position.set(hx, hy, hz);

      // Xoay trận đồ dưới điểm xuất phát mờ dần
      if (pr.startSigil) {
        pr.startSigil.rotation.z += dt * 4;
        pr.startSigil.material.opacity = Math.max(0, 0.95 * (1 - p));
      }

      // Thần Long uốn lượn nhấp nhô — biên độ/tần số theo tông
      if (pr.dragon) {
        pr.dragon.position.y = Math.sin(pr.age * 16) * (pr.wobble ?? .15) * .9;
        pr.dragon.rotation.z = Math.sin(pr.age * 14) * .25;
      }

      // 6 vệ tinh xoắn ốc quanh tâm — bán kính/tốc độ theo tông
      for (let k = 0; k < pr.swords.length; k++) {
        const sw = pr.swords[k];
        const angle = pr.age * (pr.orbitW ?? 18) + (k * Math.PI) / 3;
        const radius = (pr.orbitR ?? .42) + Math.sin(pr.age * 14 + k) * (pr.wobble ?? .14) * .9;
        sw.position.x = Math.cos(angle) * radius;
        sw.position.y = Math.sin(angle) * radius;
        sw.position.z = Math.sin(pr.age * 12 + k) * 0.18;
        sw.rotation.z = angle + Math.PI / 2;
      }

      // Nhả bụi linh khí & cánh hoa theo tông aura
      pr.trailTimer += dt;
        if (pr.trailTimer >= 0.05) {
        pr.trailTimer = 0;
        const trailColor = (pr.trailColors ?? kColors)[Math.floor(Math.random() * (pr.trailColors ?? kColors).length)];
        this.addTrailSpark(hx, hy, hz, trailColor);
      }

      // Chạm đích: Bùng nổ Kiếm Trận Cực Hạn
      if (p >= 1) {
        // Xóa sigil xuất phát
        if (pr.startSigil) {
          this.scene.remove(pr.startSigil);
          pr.startSigil.geometry.dispose();
          pr.startSigil.material.dispose();
        }

        // Sóng xung kích cuối đường (màu theo tông aura)
        const burstTheme = pkTheme(pr.effect);
        this.shockwave({
          x: pr.toX,
          y: pr.toY - 0.7,
          z: pr.toZ,
          color: burstTheme?.accent ?? 0xd8b46d,
          maxRadius: pr.radius,
          duration: 0.38,
        });

        // Cột năng lượng dâng ở đích cho tông có pillar (lửa / nước / trăng / tối)
        if (burstTheme?.pillar) {
          const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(.5, .85, 3.8, 18, 1, true),
            new THREE.MeshBasicMaterial({ color: burstTheme.core, side: THREE.DoubleSide,
              transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending }),
          );
          beam.position.set(pr.toX, pr.toY + 1.5, pr.toZ);
          this.scene.add(beam);
          this.pillars.push({ mesh: beam, age: 0, life: .55 });
        }

        // 24 mảnh vụn linh khí bùng tỏa 360 độ — hạt và màu theo tông aura
        const burstGeo = burstTheme?.burstGeo === 'petal' ? this.petalGeo
          : burstTheme?.burstGeo === 'shard' ? this.iceShardGeo : this.sparkGeo;
        for (let j = 0; j < 24; j++) {
          const sparkMat = new THREE.MeshBasicMaterial({
            color: burstTheme ? burstTheme.burst[j % burstTheme.burst.length] : 0xd8b46d,
            blending: THREE.AdditiveBlending,
          });
          const sparkMesh = new THREE.Mesh(burstGeo, sparkMat);
          sparkMesh.position.set(pr.toX, pr.toY, pr.toZ);
          const angle = (j / 24) * Math.PI * 2;
          const speed = 2.4 + Math.random() * 2.4;
          this.scene.add(sparkMesh);
          this.sparks.push({
            mesh: sparkMesh,
            vx: Math.cos(angle) * speed,
            vy: 1.0 + Math.random() * 2.2,
            vz: Math.sin(angle) * speed,
            rotSpeed: burstTheme?.burstGeo === 'petal' ? (Math.random() - .5) * 8 : 0,
            age: 0,
            life: 0.4,
          });
        }

        this.scene.remove(pr.group);
        pr.group.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
        this.projectiles.splice(i, 1);
      }
    }

    // 3. Cập nhật Ngự Kiếm Phi Thần (Dash - Space)
    for (let i = this.dashes.length - 1; i >= 0; i--) {
      const ds = this.dashes[i];
      ds.age += dt;
      const p = ds.age / ds.life;
      if (p >= 1) {
        this.scene.remove(ds.originSigil, ds.originBeam, ds.destSigil, ds.streak, ds.wake, ds.trail);
        for (const blade of ds.blades) {
          this.scene.remove(blade);
          blade.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
        }
        ds.originSigil.geometry.dispose();
        ds.originSigil.material.dispose();
        ds.originBeam.geometry.dispose();
        ds.originBeam.material.dispose();
        ds.destSigil.geometry.dispose();
        ds.destSigil.material.dispose();
        ds.streak.geometry.dispose();
        ds.streak.material.dispose();
        ds.wake.geometry.dispose();
        ds.wake.material.dispose();
        ds.trail.geometry.dispose();
        ds.trail.material.dispose();
        for (const g of ds.ghosts) {
          this.scene.remove(g);
          g.traverse((o) => {
            o.geometry?.dispose();
            o.material?.dispose();
          });
        }
        this.dashes.splice(i, 1);
      } else {
        ds.originSigil.rotation.z += dt * 4;
        ds.destSigil.rotation.z -= dt * 4;
        ds.originSigil.material.opacity = Math.max(0, 0.95 * (1 - p));
        ds.originBeam.material.opacity = Math.max(0, 0.9 * (1 - p));
        ds.destSigil.material.opacity = Math.max(0, 0.95 * (1 - p));
        ds.streak.material.opacity = Math.max(0, 0.9 * (1 - p));
        ds.wake.material.opacity = Math.max(0, 0.38 * (1 - p));
        ds.trail.material.opacity = Math.max(0, 0.8 * (1 - p));
        for (const blade of ds.blades) blade.scale.setScalar((blade.userData.s0 ?? .7) * .8 * (1 - p));
        for (const g of ds.ghosts) {
          g.traverse((o) => {
            if (o.material) o.material.opacity = Math.max(0, 0.65 * (1 - p));
          });
        }
      }
    }

    // 4. Cập nhật Thái Cực Bát Quái Kim Cang Hộ Thể (Shield - E)
    for (let i = this.shields.length - 1; i >= 0; i--) {
      const sh = this.shields[i];
      sh.age += dt;
      const p = sh.age / sh.life;

      if (sh.targetFn) {
        const pos = sh.targetFn();
        if (pos) {
          sh.group.position.set(pos.x, pos.y + 0.85, pos.z);
          sh.x = pos.x;
          sh.y = pos.y;
          sh.z = pos.z;
        }
      }

      // Xoay Bát Quái trận đồ dưới chân
        sh.groundSigil.rotation.z += dt * 0.8;

      // Xoay 2 vành đai phù chú cổ ngữ
        sh.ring1.rotation.z += dt * 1.6;
        sh.ring2.rotation.y += dt * 1.2;

      // Xoay linh vật hộ thể quanh thân — bước góc theo số lượng thực tế
      for (let k = 0; k < sh.guardianSwords.length; k++) {
        const sw = sh.guardianSwords[k];
        const angle = sh.age * 1.8 + (k * Math.PI * 2) / sh.guardianSwords.length;
        const radius = 1.35;
        sw.position.set(Math.cos(angle) * radius, Math.sin(sh.age * 6 + k) * 0.12, Math.sin(angle) * radius);
        sw.rotation.y = -angle; // Mũi chĩa ra ngoài
        sw.rotation.z = Math.sin(sh.age * 8 + k) * 0.15;
      }

      const pulse = 1 + Math.sin(sh.age * 6) * 0.04;
      sh.shieldGlow.scale.set(pulse, pulse, pulse);
      sh.lotus.rotation.y += dt * .8;
      sh.lotus.scale.setScalar(.92 + .08 * Math.sin(sh.age * 6));
      // Gợn sóng lan (Lưu ly) và vành nguyệt thở (Nguyệt bạch)
      for (const r of sh.ripples ?? []) {
        const q = (sh.age % 1.1) / 1.1;
        r.scale.setScalar(.35 + q * 1.05);
        r.material.opacity = .55 * (1 - q);
      }
      if (sh.haloRing) {
        const hp = 1 + Math.sin(sh.age * 4) * .05;
        sh.haloRing.scale.set(hp, hp, 1);
        sh.haloRing.rotation.z += dt * .6;
      }
      // Lãnh vực thu nhỏ riêng từng tông (pk-techniques.js)
      sh.tech?.tick?.(dt, sh.age / sh.life, sh);

      if (p >= 1) {
        this.shatterIce(sh.x, sh.y, sh.z);
        this.scene.remove(sh.group);
        sh.group.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
        this.shields.splice(i, 1);
      }
    }

    for (let i = this.aoeFields.length - 1; i >= 0; i--) {
      const field = this.aoeFields[i];
      field.age += dt;
      const p = field.age / field.life;
      if (p >= 1) {
        this.scene.remove(field.ground, field.rim);
        field.ground.geometry.dispose();
        field.ground.material.dispose();
        field.rim.geometry.dispose();
        field.rim.material.dispose();
        this.scene.remove(field.mesh);
        field.mesh.geometry.dispose();
        field.mesh.material.dispose();
        this.scene.remove(field.swords);
        field.swords.geometry.dispose();
        field.swords.material.dispose();
        this.aoeFields.splice(i, 1);
      } else {
        const enter = Math.min(1, p * 5);
        field.mesh.scale.setScalar(0.5 + 0.5 * enter);
        field.mesh.rotation.z += dt * 0.9;
        field.mesh.material.opacity = 0.94 * Math.min(1, (1 - p) * 3);
        field.ground.material.opacity = 0.52 * Math.min(1, (1 - p) * 3);
        field.rim.scale.setScalar(0.6 + 0.4 * enter);
        field.rim.material.opacity = 0.85 * Math.min(1, (1 - p) * 3);
        const sword = this.aoeDummy;
        for (let j = 0; j < 24; j++) {
          const angle = j * Math.PI / 12 + (j % 2) * 0.12;
          const spread = field.radius * (j % 3 === 0 ? 0.42 : j % 3 === 1 ? 0.7 : 0.88);
          const prog = Math.min(1, Math.max(0, p * 2.4 - (j % 4) * 0.1));
          if (field.rise) {
            // Bùng từ mặt đất (tàn lửa / trúc tiễn / quỷ hỏa) — mũi chỉa lên trời.
            sword.position.set(Math.cos(angle) * spread, -0.45 + prog * 3.4, Math.sin(angle) * spread);
            sword.rotation.set(0, angle + Math.PI / 2, 0);
          } else {
            // Rơi từ trời (mưa kiếm / cánh hoa / sao / liềm trăng).
            sword.position.set(Math.cos(angle) * spread, 4.5 - prog * 4.5, Math.sin(angle) * spread);
            sword.rotation.set(Math.PI, angle + Math.PI / 2, 0);
          }
          sword.scale.setScalar(Math.min(1, (1 - p) * 5));
          sword.updateMatrix();
          field.swords.setMatrixAt(j, sword.matrix);
        }
        field.swords.instanceMatrix.needsUpdate = true;
        field.swords.material.opacity = 0.96 * Math.min(1, (1 - p) * 3);
      }
    }

    // 4b. Cột năng lượng ở đích (Pillar) — nở nhẹ rồi tắt
    for (let i = this.pillars.length - 1; i >= 0; i--) {
      const pl = this.pillars[i];
      pl.age += dt;
      const p = pl.age / pl.life;
      if (p >= 1) {
        this.scene.remove(pl.mesh);
        pl.mesh.geometry.dispose();
        pl.mesh.material.dispose();
        this.pillars.splice(i, 1);
      } else {
        pl.mesh.scale.set(1 + p * .7, 1 + p * .35, 1 + p * .7);
        pl.mesh.material.opacity = .5 * (1 - p);
      }
    }

    // 4c. Tuyệt kỹ riêng theo aura (pk-techniques.js) — tick tự lo chuyển động từng phần.
    for (let i = this.techniques.length - 1; i >= 0; i--) {
      const tc = this.techniques[i];
      tc.age += dt;
      const p = tc.age / tc.life;
      if (p >= 1) {
        this.scene.remove(tc.group);
        tc.group.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
        this.techniques.splice(i, 1);
      } else {
        tc.tick?.(dt, p);
      }
    }

    // 5. Cập nhật Sóng Xung Kích (Shockwaves)
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += dt;
      const p = sw.age / sw.life;
      if (p >= 1) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
      } else {
        const sc = 0.5 + p * (sw.maxRadius - 0.5);
        sw.mesh.scale.set(sc, sc, 1);
        sw.mesh.material.opacity = Math.max(0, 0.95 * (1 - p));
      }
    }

    // 6. Cập nhật Số Sát Thương Nổi (Anime Pop-In Float)
    for (let i = this.damagePopups.length - 1; i >= 0; i--) {
      const d = this.damagePopups[i];
      d.age += dt;
      const p = d.age / d.life;
      if (p >= 1) {
        this.scene.remove(d.sprite);
        d.tex.dispose();
        d.sprite.material.dispose();
        this.damagePopups.splice(i, 1);
      } else {
        if (p < 0.18) {
          const bp = 1 + Math.sin((p / 0.18) * Math.PI) * 0.42;
          d.sprite.scale.set(d.baseScale * bp, (d.baseScale * 0.45) * bp, 1);
        } else {
          d.sprite.scale.set(d.baseScale, d.baseScale * 0.45, 1);
        }
        d.sprite.position.y = d.startY + Math.sin(p * Math.PI * 0.5) * 1.25;
        if (p > 0.45) {
          d.sprite.material.opacity = Math.max(0, (1 - p) / 0.55);
        }
      }
    }

    // 7. Cập nhật Tia Lửa, Mảnh Vỡ Kiếm Linh & Cánh Hoa (Sparks & Petals)
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.age += dt;
      const p = sp.age / sp.life;
      if (p >= 1) {
        this.scene.remove(sp.mesh);
        sp.mesh.material.dispose();
        this.sparks.splice(i, 1);
      } else {
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y += sp.vy * dt - 4.5 * dt * dt;
        sp.mesh.position.z += sp.vz * dt;
        if (sp.rotSpeed) {
          sp.mesh.rotation.x += sp.rotSpeed * dt;
          sp.mesh.rotation.y += sp.rotSpeed * dt;
        }
        sp.mesh.scale.setScalar(Math.max(0.1, 1 - p));
      }
    }
  }

  clear() {
    for (const field of this.aoeFields) {
      this.scene.remove(field.ground, field.rim);
      field.ground.geometry.dispose();
      field.ground.material.dispose();
      field.rim.geometry.dispose();
      field.rim.material.dispose();
      this.scene.remove(field.mesh);
      field.mesh.geometry.dispose();
      field.mesh.material.dispose();
      this.scene.remove(field.swords);
      field.swords.geometry.dispose();
      field.swords.material.dispose();
    }
    this.aoeFields.length = 0;
    for (const s of this.slashes) {
      this.scene.remove(s.group);
      s.group.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    this.slashes.length = 0;

    for (const cl of this.claws) {
      this.scene.remove(cl.group);
      cl.group.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    this.claws.length = 0;

    for (const fb of this.flameBursts) {
      this.scene.remove(fb.group);
      fb.group.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    this.flameBursts.length = 0;

    for (const pp of this.poisonPalms) {
      this.scene.remove(pp.group);
      pp.group.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    this.poisonPalms.length = 0;

    for (const md of this.meditations) {
      this.scene.remove(md.group);
      md.group.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    this.meditations.length = 0;

    for (const pr of this.projectiles) {
      if (pr.startSigil) {
        this.scene.remove(pr.startSigil);
        pr.startSigil.geometry.dispose();
        pr.startSigil.material.dispose();
      }
      this.scene.remove(pr.group);
      pr.group.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    this.projectiles.length = 0;

    for (const ds of this.dashes) {
      this.scene.remove(ds.originSigil, ds.originBeam, ds.destSigil, ds.streak, ds.wake, ds.trail);
      for (const blade of ds.blades) {
        this.scene.remove(blade);
        blade.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
      }
      ds.originSigil.geometry.dispose();
      ds.originSigil.material.dispose();
      ds.originBeam.geometry.dispose();
      ds.originBeam.material.dispose();
      ds.destSigil.geometry.dispose();
      ds.destSigil.material.dispose();
      ds.streak.geometry.dispose();
      ds.streak.material.dispose();
      ds.wake.geometry.dispose();
      ds.wake.material.dispose();
      ds.trail.geometry.dispose();
      ds.trail.material.dispose();
      for (const g of ds.ghosts) {
        this.scene.remove(g);
        g.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
      }
    }
    this.dashes.length = 0;

    for (const sh of this.shields) {
      this.scene.remove(sh.group);
      sh.group.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    this.shields.length = 0;

    for (const sw of this.shockwaves) {
      this.scene.remove(sw.mesh);
      sw.mesh.geometry.dispose();
      sw.mesh.material.dispose();
    }
    this.shockwaves.length = 0;

    for (const pl of this.pillars) {
      this.scene.remove(pl.mesh);
      pl.mesh.geometry.dispose();
      pl.mesh.material.dispose();
    }
    this.pillars.length = 0;

    for (const tc of this.techniques) {
      this.scene.remove(tc.group);
      tc.group.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    this.techniques.length = 0;

    for (const d of this.damagePopups) {
      this.scene.remove(d.sprite);
      d.tex.dispose();
      d.sprite.material.dispose();
    }
    this.damagePopups.length = 0;

    for (const sp of this.sparks) {
      this.scene.remove(sp.mesh);
      sp.mesh.material.dispose();
    }
    this.sparks.length = 0;
  }
}

const kColors = [0xffd700, 0x00f0ff, 0xbb86fc, 0xff1744, 0x00ff88];
