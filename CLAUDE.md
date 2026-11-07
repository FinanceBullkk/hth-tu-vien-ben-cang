# HTH – Tu viện bên cảng

Game web 3D nhiều người, dùng nội bộ. Node ESM thuần (không TypeScript), Express + Socket.IO + SQLite, client Three.js + Vite.
Hướng dẫn người dùng và cấu hình xem `README.md`; chỉ đọc khi cần.

## Lệnh

Cần Node 24 (Volta tự chọn theo `package.json`). Node thấp hơn làm `npm test` hỏng.

```bash
npm run dev                          # server :3000 + Vite :5173, mở cổng 5173
npm test                             # toàn bộ, khoảng 40 giây, server thật trên DB tạm
node --test test/fishing.test.js     # chạy một file
npm run build                        # build vào dist/
```

`test/voice-browser-check.mjs` không nằm trong `npm test`; chạy tay sau khi build.

## Quy tắc bất biến

- Server là nguồn sự thật: client chỉ gửi ý định, server kiểm tra tần suất, độ dài, từ cấm, vị trí và tự chấm điểm.
- `playerId` là bí mật: không gửi cho người khác, không đặt trên URL. Dữ liệu realtime dùng `sid`.
- Chat không được lưu ở bất kỳ đâu.
- Tài nguyên cùng nguồn: không CDN, không gọi ra ngoài (CSP ở `server/index.js`). Model GLB luôn có bản code dự phòng.
- Đổi hành vi server thì thêm hoặc sửa test trong `test/`.
- Không đọc, in hay commit `config.json`, `data/`, token; `config.json` chứa khoá admin.

## Bản đồ mã

- `shared/`: luật và hằng số dùng chung. `protocol.js` hằng số giao thức, `layout.js` bố cục sân và va chạm.
- `server/`: `index.js` khởi tạo và nối module, `rooms.js` phòng chung và định tuyến sự kiện, mỗi hoạt động một file.
- `client/src/`: `main.js` nối sự kiện mạng với scene và UI; `scene/`, `player/`, `activities/`, `ui/`, `audio/`, `net/`, `share/`.
- `tools/blender/`, `scripts/build_assets.py`: dựng model, xem `docs/asset-pipeline.md`.
- `plans/`: kế hoạch và báo cáo của các phiên trước, không phải tài liệu chính thức.

## Thêm một hoạt động mới

Làm theo mẫu câu cá (`fishing`):

1. `shared/<tên>.js` cho luật dùng chung; thêm vùng vào `shared/layout.js`, hằng số vào `shared/protocol.js` nếu cần.
2. `server/<tên>.js`, khởi tạo trong `server/index.js`, truyền vào `Room`.
3. `server/rooms.js`: đăng ký sự kiện socket, thêm vào `sweep` và snapshot nếu cần, huỷ phiên ở mọi nhánh người chơi rời đi.
4. `client/src/activities/<tên>.js`, đăng ký trong `activities/index.js`.
5. `client/src/scene/`, `client/src/ui/` (import CSS trong `main.js`), nối sự kiện mạng trong `main.js`.
6. `test/<tên>.test.js`, gồm cả dữ liệu giả mạo và ngắt kết nối giữa chừng.

## Triển khai

- Bản public chạy trên chính máy này qua Docker và Cloudflare Tunnel; `docs/deployment.md` là nguồn đúng về tên container và volume.
- Không build, restart hay deploy container khi chưa được yêu cầu rõ.
- Bản đang chạy có thể khác working tree: các lần release trước cố ý loại phần đang làm dở. Muốn biết bản đang chạy có gì thì xem release mới nhất trong `docs/deployment.md`.

## Làm việc trong repo

- Có thể có phiên khác đang sửa cùng checkout. Đọc lại file trước khi sửa, không revert thay đổi không phải của mình, chỉ stage đúng file của việc đang làm, không `git add .`.
- Nhánh: `feat/...`, `fix/...`, `chore/...`; PR vào `main`, CI chạy test và build.

## Nhạc nền

- Chủ dự án đã xác nhận có quyền dùng `client/public/music/where-winds-meet-character-creation.mp3`. Muốn thêm nhạc khác thì hỏi chủ dự án trước.
