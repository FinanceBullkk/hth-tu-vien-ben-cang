import * as THREE from 'three';

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

// Vẽ canvas một lần cho mọi PkVfx (kể cả bản làm nóng shader); không bao giờ dispose.
let sharedTextures = null;
function pkTextures() {
  sharedTextures ??= {
    bagua: createBaguaTexture(),
    lotus: createLotusMandalaTexture(),
    flame: createFlameArrayTexture(),
    poisonPalm: createPoisonPalmTexture(),
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
    this.aoeDummy = new THREE.Object3D();

    // Bộ texture và geometry dùng chung
    const textures = pkTextures();
    this.baguaTex = textures.bagua;
    this.lotusTex = textures.lotus;
    this.flameTex = textures.flame;
    this.poisonPalmTex = textures.poisonPalm;
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
  slash({ x, y = 0, z, rot = 0, color = 0x00f0ff }) {
    const group = new THREE.Group();

    // 1. Pháp trận kiếm khí chân đế (Daoist Ground Sigil)
    const sigilGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const sigilMat = new THREE.MeshBasicMaterial({
      map: this.baguaTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const sigil = new THREE.Mesh(sigilGeo, sigilMat);
    sigil.rotation.x = -Math.PI / 2;
    sigil.position.y = -0.78;

    // 2. Lõi năng lượng lôi kiếm trung tâm (nhỏ gọn sắc nét, không bị chói lóa)
    const orbGeo = new THREE.OctahedronGeometry(0.12, 1);
    const orbMat = new THREE.MeshBasicMaterial({
      color: 0xf3dfad,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);

    // 3. Vòng hồ quang lôi hỏa xoay tít
    const ringGeo = new THREE.TorusGeometry(0.55, 0.035, 8, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x9bd7b9,
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
      const sword = createSwordMesh(k === 0 ? 0xe9dfbb : 0x8fc9a9, 0xd8b46d);
      sword.scale.setScalar(k === 0 ? 1.2 : .9);
      sword.rotation.set(Math.PI / 2, 0, k * .3);
      sword.position.set(k * .34, k === 0 ? .1 : -.1, .7 + Math.abs(k) * .1);
      group.add(sword);
      swordFan.push(sword);
    }

    // 4. Đao quang kiếm khí chính (Primary Crescent Anime Arc)
    const waveGeo = new THREE.RingGeometry(1.3, 1.48, 48, 1, -Math.PI * 0.45, Math.PI * 0.9);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0xffdf91,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const wave = new THREE.Mesh(waveGeo, waveMat);
    wave.rotation.x = 0;
    wave.position.z = 0.45;
    const waveEdge = new THREE.Mesh(
      new THREE.RingGeometry(1.48, 1.56, 48, 1, -Math.PI * 0.45, Math.PI * 0.9),
      new THREE.MeshBasicMaterial({ color: 0x284c40, side: THREE.DoubleSide, transparent: true,
        opacity: 0.9, depthWrite: false }),
    );
    waveEdge.position.z = 0.44;

    // 5. Hai vết chém không gian bắt chéo (Cross Dimensional Slices)
    const crossWaveGeo = new THREE.RingGeometry(.94, 1.04, 36, 1, -Math.PI * 0.38, Math.PI * 0.76);
    const crossWaveMat = new THREE.MeshBasicMaterial({
      color: 0x86c9ae,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const cross1 = new THREE.Mesh(crossWaveGeo, crossWaveMat);
    cross1.rotation.x = 0;
    cross1.rotation.z = Math.PI / 4;
    cross1.position.z = 0.35;

    const cross2 = new THREE.Mesh(crossWaveGeo, crossWaveMat);
    cross2.rotation.x = 0;
    cross2.rotation.z = -Math.PI / 4;
    cross2.position.z = 0.35;

    // 6. Nhánh tia sét lôi điện anime ziczac
    const bolts = [];
    for (let k = 0; k < 4; k++) {
      const boltGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.9, 4);
      const boltMat = new THREE.MeshBasicMaterial({
        color: 0xe9d6a0,
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

    group.add(sigil, orb, ring1, ring2, waveEdge, wave, cross1, cross2);
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
  projectile({ fromX, fromY = 0, fromZ, toX, toY = 0, toZ, rot = 0, radius = 4, isHit = false }) {
    const group = new THREE.Group();
    this.areaBurst({ x: toX, y: toY, z: toZ, radius });

    // 1. Trận đồ Bát Quái bốc lên từ mặt đất dưới chân người thi triển (rõ nét chuẩn anime)
    const startSigilGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const startSigilMat = new THREE.MeshBasicMaterial({
      map: this.baguaTex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const startSigil = new THREE.Mesh(startSigilGeo, startSigilMat);
    startSigil.rotation.x = -Math.PI / 2;
    startSigil.position.set(fromX, fromY + 0.09, fromZ);
    this.scene.add(startSigil);

    // Lõi kiếm chính thay hình đầu rồng thô; sáu phi kiếm tụ quanh trục.
    const dragon = createSwordMesh(0xf2e6bd, 0xd8b46d);
    dragon.rotation.x = Math.PI / 2;
    dragon.scale.setScalar(1.65);
    group.add(dragon);

    // 3. Lõi năng lượng thiên kiếp trung tâm (nhỏ gọn tinh tế)
    const coreGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xe6c680,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // 4. Bầy 6 Phi Kiếm Tiên Hiệp (Flying Swords) xoay vần vũ (lớn hơn, rõ từng lưỡi kiếm)
    const swords = [];
    const swordColors = [0x9bd7b9, 0xd8b46d, 0xb8e8cd, 0x83bca1, 0xe6d399, 0xa5d6bd];
    for (let k = 0; k < 6; k++) {
      const sw = createSwordMesh(swordColors[k], 0xd8b46d);
      sw.scale.set(1.2, 1.2, 1.2);
      sw.rotation.x = Math.PI / 2; // Hướng mũi kiếm về phía trước
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
      trailTimer: 0,
    });
  }

  /**
   * Ngự Kiếm Phi Thần / Hư Không Đạp Bộ (Anime Flash Step / Space):
   * Tốc biến lướt kiếm không gian, để lại tàn ảnh kiếm khách và vết chém hư không.
   */
  dash({ fromX, fromY = 0, fromZ, toX, toY = 0, toZ, rot = 0 }) {
    // 1. Trận đồ Thái Cực Bát Quái bừng sáng tại điểm xuất phát (rõ nét chuẩn anime)
    const sigilGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const sigilMat1 = new THREE.MeshBasicMaterial({
      map: this.baguaTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const originSigil = new THREE.Mesh(sigilGeo, sigilMat1);
    originSigil.rotation.x = -Math.PI / 2;
    originSigil.position.set(fromX, fromY + 0.06, fromZ);
    this.scene.add(originSigil);

    // Cột kiếm khí thăng thiên tại điểm đi (dịu nhẹ thanh thoát)
    const beamGeo = new THREE.CylinderGeometry(0.25, 0.45, 2.2, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x8fc9a9,
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
      const sword = createSwordMesh(i % 2 ? 0xd8b46d : 0x9bd7b9, 0xe9dfbb);
      sword.rotation.set(Math.PI / 2, rot, 0);
      sword.scale.setScalar(.65 + i * .06);
      const t = (i + .5) / 5;
      sword.position.set(fromX + (toX - fromX) * t, fromY + .65 + Math.sin(i * 2) * .12, fromZ + (toZ - fromZ) * t);
      this.scene.add(sword);
      blades.push(sword);
    }

    // 2. Trận đồ Bát Quái tiếp ứng tại điểm đến
    const sigilMat2 = new THREE.MeshBasicMaterial({
      map: this.baguaTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const destSigil = new THREE.Mesh(sigilGeo.clone(), sigilMat2);
    destSigil.rotation.x = -Math.PI / 2;
    destSigil.position.set(toX, toY + 0.06, toZ);
    this.scene.add(destSigil);

    // 3. Dải lụa kiếm quang không gian nối liền (Spatial Blade Streamer)
    const lineGeo = new THREE.CylinderGeometry(0.19, 0.19, Math.hypot(toX - fromX, toZ - fromZ), 8);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xfff1bb,
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
      new THREE.MeshBasicMaterial({ color: 0x72b89a, side: THREE.DoubleSide, transparent: true,
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
      color: 0xf8d482, side: THREE.DoubleSide, transparent: true, opacity: 0.8,
      depthWrite: false, blending: THREE.NormalBlending,
    }));
    this.scene.add(trail);
    this.shockwave({ x: toX, y: toY + 0.06, z: toZ, color: 0xffdf91,
      maxRadius: 1.5, duration: 0.32 });

    // 4. Bốn tàn ảnh phân thân kiếm khách dọc đường lướt (Ghost Echos with Swords)
    const ghosts = [];
    for (let k = 1; k <= 3; k++) {
      const t = k / 4;
      const gx = fromX + (toX - fromX) * t;
      const gz = fromZ + (toZ - fromZ) * t;

      const echoGroup = new THREE.Group();
      const sword = createSwordMesh(0x9bd7b9, 0xd8b46d);
      sword.scale.setScalar(0.8);
      sword.rotation.x = Math.PI / 2;
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
  shield({ x, y = 0, z, duration = 1600, targetFn = null }) {
    const group = new THREE.Group();

    // 1. Trận đồ Thái Cực Bát Quái xoay tròn dưới chân (nằm nổi trên mặt đất, rõ nét chuẩn anime)
    const groundSigilGeo = new THREE.PlaneGeometry(3.0, 3.0);
    const groundSigilMat = new THREE.MeshBasicMaterial({
      map: this.baguaTex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const groundSigil = new THREE.Mesh(groundSigilGeo, groundSigilMat);
    groundSigil.rotation.x = -Math.PI / 2;
    groundSigil.position.y = -0.76;

    // Màng chắn trong suốt, giữ nhân vật còn nhìn thấy qua lớp bảo hộ.
    const shieldGlowGeo = new THREE.SphereGeometry(1.18, 24, 18);
    const shieldGlowMat = new THREE.MeshBasicMaterial({
      color: 0x8fc9a9,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const shieldGlow = new THREE.Mesh(shieldGlowGeo, shieldGlowMat);

    // 3. Hai vành đai phù chú cổ ngữ xoay quanh (Golden & Cyan orbital rings - thanh thoát)
    const ringGeo = new THREE.TorusGeometry(1.28, 0.055, 8, 36);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xd8b46d, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const ring1 = new THREE.Mesh(ringGeo, ringMat1);
    ring1.rotation.x = Math.PI / 2;

    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x8fc9a9, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending });
    const ring2 = new THREE.Mesh(ringGeo, ringMat2);
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 4;

    // 4. Bốn thanh Trấn Sơn Kiếm bay lơ lửng 4 phương hộ thể (Four Guardian Swords)
    const guardianSwords = [];
    const guardColors = [0xd8b46d, 0x8fc9a9, 0xe9dfbb, 0x79baa4];
    for (let i = 0; i < 4; i++) {
      const sw = createSwordMesh(guardColors[i], 0xd8b46d);
      sw.scale.set(0.85, 0.85, 0.85);
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

  areaBurst({ x, y = 0, z, radius = 4 }) {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 48),
      new THREE.MeshBasicMaterial({ color: 0x173629, transparent: true, opacity: 0.52,
        side: THREE.DoubleSide, depthWrite: false }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(x, y + 0.025, z);
    this.scene.add(ground);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({ map: this.baguaTex, transparent: true, opacity: 0.94,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.NormalBlending }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y + 0.035, z);
    mesh.scale.setScalar(0.45);
    this.scene.add(mesh);
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.94, radius, 64),
      new THREE.MeshBasicMaterial({ color: 0xf8de94, transparent: true, opacity: 0.85,
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
    const swords = new THREE.InstancedMesh(
      new THREE.ShapeGeometry(blade),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true,
        opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending }), 24,
    );
    swords.position.set(x, y, z);
    for (let i = 0; i < 24; i++) swords.setColorAt(i, new THREE.Color(i % 3 ? 0xffdc7b : 0xb8fff0));
    this.scene.add(swords);
    this.aoeFields.push({ ground, mesh, rim, swords, radius, age: 0, life: 0.9 });
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

    // 1. Cập nhật Cửu Thiên Lôi Kiếm (M1)
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
        s.waveEdge.material.opacity = 0.85 * (1 - p);
        s.cross1.material.opacity = 0.7 * (1 - p);
        for (let k = 0; k < s.swordFan.length; k++) {
          s.swordFan[k].position.z = .7 + p * (1.2 + .25 * k);
          s.swordFan[k].rotation.z += dt * (k - 1) * 2;
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

      // Thần Long uốn lượn nhấp nhô
      if (pr.dragon) {
        pr.dragon.position.y = Math.sin(pr.age * 16) * 0.15;
        pr.dragon.rotation.z = Math.sin(pr.age * 14) * 0.25;
      }

      // 6 Phi Kiếm Tiên Hiệp xoắn ốc vần vũ quanh tâm
      for (let k = 0; k < pr.swords.length; k++) {
        const sw = pr.swords[k];
        const angle = pr.age * 18 + (k * Math.PI) / 3;
        const radius = 0.42 + Math.sin(pr.age * 14 + k) * 0.14;
        sw.position.x = Math.cos(angle) * radius;
        sw.position.y = Math.sin(angle) * radius;
        sw.position.z = Math.sin(pr.age * 12 + k) * 0.18;
        sw.rotation.z = angle + Math.PI / 2;
      }

      // Nhả bụi kiếm linh & cánh sen kiếm khí rực rỡ
      pr.trailTimer += dt;
        if (pr.trailTimer >= 0.05) {
        pr.trailTimer = 0;
        const trailColor = kColors[Math.floor(Math.random() * kColors.length)];
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

        // Sóng xung kích Bát Quái
        this.shockwave({
          x: pr.toX,
          y: pr.toY - 0.7,
          z: pr.toZ,
          color: 0xd8b46d,
          maxRadius: pr.radius,
          duration: 0.38,
        });

        // 24 Mảnh vụn kiếm linh bùng tỏa 360 độ
        for (let j = 0; j < 24; j++) {
          const sparkMesh = new THREE.Mesh(this.sparkGeo, this.goldMat.clone());
          sparkMesh.position.set(pr.toX, pr.toY, pr.toZ);
          const angle = (j / 24) * Math.PI * 2;
          const speed = 2.4 + Math.random() * 2.4;
          this.scene.add(sparkMesh);
          this.sparks.push({
            mesh: sparkMesh,
            vx: Math.cos(angle) * speed,
            vy: 1.0 + Math.random() * 2.2,
            vz: Math.sin(angle) * speed,
            rotSpeed: 0,
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
        for (const blade of ds.blades) blade.scale.setScalar(.8 * (1 - p));
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

      // Xoay 4 thanh Trấn Sơn Kiếm hộ thể 4 phương
      for (let k = 0; k < sh.guardianSwords.length; k++) {
        const sw = sh.guardianSwords[k];
        const angle = sh.age * 1.8 + (k * Math.PI) / 2;
        const radius = 1.35;
        sw.position.set(Math.cos(angle) * radius, Math.sin(sh.age * 6 + k) * 0.12, Math.sin(angle) * radius);
        sw.rotation.y = -angle; // Mũi kiếm chĩa ra ngoài
        sw.rotation.z = Math.sin(sh.age * 8 + k) * 0.15;
      }

      const pulse = 1 + Math.sin(sh.age * 6) * 0.04;
      sh.shieldGlow.scale.set(pulse, pulse, pulse);
      sh.lotus.rotation.y += dt * .8;
      sh.lotus.scale.setScalar(.92 + .08 * Math.sin(sh.age * 6));

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
          const fall = Math.min(1, Math.max(0, p * 2.4 - (j % 4) * 0.1));
          sword.position.set(Math.cos(angle) * spread, 4.5 - fall * 4.5,
            Math.sin(angle) * spread);
          sword.rotation.set(Math.PI, angle + Math.PI / 2, 0);
          sword.scale.setScalar(Math.min(1, (1 - p) * 5));
          sword.updateMatrix();
          field.swords.setMatrixAt(j, sword.matrix);
        }
        field.swords.instanceMatrix.needsUpdate = true;
        field.swords.material.opacity = 0.96 * Math.min(1, (1 - p) * 3);
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
