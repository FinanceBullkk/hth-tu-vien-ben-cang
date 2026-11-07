import * as THREE from 'three';

const COLORS = [0xffd98a, 0x7ee8e0, 0xcdd8ff, 0xff9a5c, 0xffa8cc, 0x7ee8a0, 0xf6f7ff, 0x9b64da];

// Each layer keeps its own silhouette: lotus, water, stars, flame, petals,
// bamboo, crescent and vortex. No enclosing cylinder around the character.
export function cultivationPoint(effect, phase, layer, time) {
  const a = phase * Math.PI * 2;
  const orbit = a + time * 0.18 * (layer % 2 ? -1 : 1);
  const r = 0.7 + layer * 0.18;
  switch (effect) {
    case 1: {
      const petal = r * (0.7 + 0.3 * Math.cos(a * 8));
      return [Math.cos(orbit) * petal, 0.06 + layer * 0.08 + 0.12 * Math.sin(a * 8) ** 2, Math.sin(orbit) * petal];
    }
    case 2:
      return [Math.cos(orbit) * r, 0.35 + layer * 0.24 + 0.22 * Math.sin(a * 3 + time), Math.sin(orbit) * r];
    case 3:
      return [Math.cos(orbit) * r, 0.95 + Math.sin(orbit) * r * 0.65, Math.sin(orbit) * r * Math.cos(layer * 1.1)];
    case 4: {
      const rise = (phase + time * 0.16) % 1;
      return [Math.cos(a * 5 + time) * r * (1 - rise * 0.6), 0.1 + rise * (1.1 + layer * 0.2), Math.sin(a * 5 + time) * r * (1 - rise * 0.6)];
    }
    case 5:
      return [Math.cos(orbit) * r + Math.sin(time + a * 3) * 0.12, 1.65 - ((phase + time * 0.08 + layer * 0.3) % 1) * 1.6, Math.sin(orbit) * r];
    case 6: {
      const stem = Math.floor(phase * 6) * Math.PI / 3;
      const height = (phase * 6) % 1;
      return [Math.cos(stem) * r + Math.sin(height * Math.PI * 6) * 0.09, 0.1 + height * (0.65 + layer * 0.25), Math.sin(stem) * r];
    }
    case 7: {
      const moon = -Math.PI * 0.65 + phase * Math.PI * 1.3;
      return [Math.cos(moon) * r - r * 0.4, 1.65 + Math.sin(moon) * r * 0.65, -0.65 - layer * 0.08];
    }
    case 8: {
      const spiral = r * (0.3 + phase * 0.7);
      return [Math.cos(a * 2 - time * 0.4) * spiral, 0.08 + layer * 0.13, Math.sin(a * 2 - time * 0.4) * spiral];
    }
    default: return [0, 0, 0];
  }
}

export function createCultivation(effect, tier, lowQuality = false) {
  const count = lowQuality ? 48 : 96;
  const layers = Number.isInteger(tier) ? Math.max(0, Math.min(3, tier)) : 0;
  const enabled = Number.isInteger(effect) && effect >= 1 && effect <= 8;
  const positions = new Float32Array((enabled ? layers : 0) * count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { tint: { value: new THREE.Color(COLORS[effect - 1] ?? 0xffffff) }, opacity: { value: 0.65 } },
    vertexShader: `void main() {
      vec4 p = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * p;
      gl_PointSize = clamp(70.0 / max(1.0, -p.z), 1.0, 9.0);
    }`,
    fragmentShader: `uniform vec3 tint; uniform float opacity;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;
      gl_FragColor = vec4(tint, (1.0 - d) * opacity);
    }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = enabled && layers > 0;
  return {
    points,
    update(time, sitting = false, fade = 1) {
      if (!points.visible) return;
      for (let i = 0; i < positions.length / 3; i++) {
        positions.set(cultivationPoint(effect, (i % count) / count, Math.floor(i / count), time), i * 3);
      }
      geometry.attributes.position.needsUpdate = true;
      material.uniforms.opacity.value = (sitting ? 0.85 : 0.55) * fade;
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
