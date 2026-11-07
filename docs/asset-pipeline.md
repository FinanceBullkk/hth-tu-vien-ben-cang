# Pipeline asset 3D — Blender → GLB

Asset võ hiệp (bảo tháp, cầu vòm, hòn non bộ, cờ băng, đèn đá, khung quán trà) dựng bằng
Blender headless rồi export GLB vào `client/public/models/`. Phong cách giữ nguyên chất
low-poly flat-shading của game: màu pha theo đỉnh, không texture, mái cong đầu đao.

## Rebuild asset

```bash
bash tools/blender/build_all.sh
```

Build một asset riêng (Blender 5.2):

```bash
"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background \
  --python "D:/hth-tu-vien-ben-cang/tools/blender/pagoda.py" -- \
  "D:/hth-tu-vien-ben-cang/client/public/models/pagoda.glb"
```

Kiểm tra GLB (COLOR_0, tên node, material): `node tools/blender/inspect_glb.js`.

## Cấu trúc

| File | Vai trò |
|---|---|
| `tools/blender/palette.py` | Bảng màu đồng bộ với game (sRGB hex, chuyển linear khi tô) |
| `tools/blender/lib.py` | `Batch` bản Python: box/cyl/rock/roof/quad + export GLB |
| `tools/blender/<tên>.py` | Một script mỗi asset, viết theo **toạ độ game** (Y-lên, mét) |
| `tools/blender/inspect_glb.js` | Kiểm tra GLB: COLOR_0, node names |
| `client/src/scene/props.js` | GLTFLoader + cache + đổi material theo style game |
| `client/src/scene/wuxia-props.js` | Đặt prop theo `shared/layout.js`, fallback code, dây đèn, update |
| `shared/layout.js` | Toạ độ đặt + va chạm (CIRCLES/BOXES/ROOF_ZONES/floorHeight) |

## Quy ước bắt buộc

1. **Toạ độ game.** Script Blender viết theo hệ game (Y-up, mặt đất XZ). `lib.py` tự chuyển
   sang Blender (Z-up) và exporter glTF chuyển ngược lại — GLB ra đúng toạ độ game, code
   chỉ cần `position.set(x, 0, z)`.
2. **Vertex colors, không texture.** Màu tô theo góc (CORNER) từ hex trong `palette.py` đã
   decode sang linear — khớp cách `THREE.Color` đọc hex phía client. Không thêm texture;
   chữ tiếng Việt vẫn dùng `textTexture()` canvas bên client.
3. **Node đặt tên để code điều khiển.** `flame` (lửa đèn đá) và `glow` (ô vách tháp) → code
   thay bằng MeshBasicMaterial và nhấp sáng theo `night`; `cloth` (lá băng) → code lắc nhẹ;
   `water` (mặt nước non bộ) → Lambert trong suốt. Xem `props.js:applyFlatStyle`.
4. **Luôn có bản code dự phòng.** GLB thiếu/lỗi thì fallback dựng bằng Batch vẫn hiện
   (`wuxia-props.js:fb*`) — game không bao giờ vỡ. Khi thêm asset mới, viết cả fallback.
5. **Toạ độ đặt + va chạm nằm ở `shared/layout.js`.** Thêm prop mới phải khai báo const,
   thêm `CIRCLES` (cột/đá/bồn), `BOXES` (lan can, cam:true nếu chặn camera) và `ROOF_ZONES`
   nếu có mái cao. Bất kỳ thay đổi `floorHeight` nào phải khớp hình học GLB (xem cầu vòm
   `BRIDGE.peak` vs `bridge.py`).
6. **Budget polygon.** Mỗi asset ≤ 10k tam giác (in trong `ASSET_OK ... BUDGET_OK`).
   Hiện tại: pagoda 2.2k, bridge 1.9k, tea-pavilion 0.7k, nonbo 0.5k, banner 0.2k,
   stone-lantern 0.25k.

## Vì sao GLB cùng nguồn là hợp lệ

README quy định "không có request ra ngoài": GLB nằm trong `client/public/models/`, Vite
copy vào `dist/models/` khi build, server chỉ phục vụ `dist/` — cùng nguồn với trang.
CSP (`server/index.js`) chặn mọi kết nối ngoài nhưng `connect-src 'self'` cho phép fetch
GLB cùng nguồn. Không dùng CDN, không texture ngoài.

## Background music

The supplied Where Winds Meet Character Creation Song lives at
`client/public/music/where-winds-meet-character-creation.mp3` and loops on the welcome screen and in game
at half the saved music volume (17.5% by default).
Blocked autoplay retries on interaction; the welcome button controls playback.
Successful admission stops the welcome player before the shared game radio starts the same track.
The in-game slider saves its 0–100% control level; both players apply a 0.5 gain to it.
The server duration fallback is 1758 seconds; clients use media metadata once available.
Continuous wind, leaves, pond and sea noise run through a separate 0.1 gain;
bells and interaction effects retain their levels. Native offline audio check:
open `/@fs/D:/hth-tu-vien-ben-cang/tools/check-ambience.html` through Vite.
Native browser lifecycle check: open `/@fs/D:/hth-tu-vien-ben-cang/tools/check-login-music.html`
through Vite and click **Run native audio check**.

## Render budget

`scene/render-quality.js` caps the drawing buffer at 1920×1080 pixels, including HiDPI
and large desktop displays. CSS labels and controls retain their native resolution.
After four seconds of warmup, two consecutive two-second windows below 45 FPS lower
resolution and shadow size; the final fallback disables shadows. Hidden or unfocused
tabs and isolated stalls do not trigger the fallback. Shadows update at most 30 times/s.
Run regression checks with `node --test test/render-quality.test.js` (Node.js 22+).
