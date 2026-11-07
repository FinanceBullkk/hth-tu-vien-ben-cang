// Kiểm tra GLB: attributes, node names, materials — chạy: node inspect_glb.js
import fs from 'node:fs';
const dir = new URL('../../client/public/models/', import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:');
let bad = 0;
for (const f of ['pagoda', 'bridge', 'nonbo', 'banner', 'stone-lantern', 'tea-pavilion']) {
  const b = fs.readFileSync(dir + f + '.glb');
  const jsonLen = b.readUInt32LE(12);
  const j = JSON.parse(b.slice(20, 20 + jsonLen).toString());
  const prims = j.meshes.flatMap((m) => m.primitives);
  const attrs = prims.map((p) => Object.keys(p.attributes).join(','));
  const hasColor = prims.every((p) => p.attributes.COLOR_0);
  const nodes = j.nodes.map((n) => n.name).filter(Boolean);
  const mats = (j.materials || []).length;
  if (!hasColor) bad++;
  console.log(
    f.padEnd(14),
    'prims:' + prims.length,
    'COLOR_0:' + (hasColor ? 'yes' : 'MISSING'),
    'nodes:[' + nodes.join(',') + ']',
    'mats:' + mats
  );
}
process.exit(bad ? 1 : 0);
