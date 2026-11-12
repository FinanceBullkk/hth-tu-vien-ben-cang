# Cửa hàng, tủ đồ và kinh tế TEU

Nhánh `feat/shop-economy`. Chủ dự án chốt: sạp NPC + nút HUD; khoá đồ xịn, ai đang mặc giữ lại; tủ đồ thay đồ trong game; làm mới HUD (ví TEU, nút mới) và Sổ an (chia thẻ).

## Quyết định

- Catalog duy nhất ở `shared/shop.js`: id món `slot:index` (`color:4`, `effect:11`…), giá TEU. Món không có trong catalog là miễn phí.
- Sở hữu lưu bảng `owned_items(player_id, item_id, source, created_at)`. Di trú một lần (`PRAGMA user_version`): bitmask `unlocked` cũ → `color:*`; món trả phí đang mặc → `source='legacy'`.
- Mua: một transaction trừ TEU (`teu>=price`), ghi `owned_items`, ghi `teu_log` số âm lý do `shop`. Bảng tuần chỉ cộng số dương.
- `hello` và `look:set` kiểm tra từng slot: món chưa sở hữu rớt về mặc định (hello) hoặc bị từ chối (look:set). `look:set` phát `player:look` cho cả phòng, giới hạn 1 lần/giây.
- Ví: `Db.onTeu` báo số dư mới, Room đẩy `wallet` tới socket của người đó.
- Bỏ `cosmetic:unlock` (thay bằng `shop:buy`).

## Phần việc

1. [x] Server: `shared/shop.js`, `server/shop.js`, db (bảng, di trú, mua, weekly), rooms (hello, `shop:buy`, `look:set`, `wallet`, snapshot `owned`/`teu`), test.
2. [x] Client: `ui/shop-panel.js` (cửa hàng + tủ đồ chung khung), welcome khoá món chưa có, `player:look` cho remote, ví TEU trên HUD.
3. [x] Scene: sạp hàng + NPC bà chủ (`scene/shop-stall.js`), vùng `SHOP` trong layout, phím E/bấm NPC mở cửa hàng.
4. [x] Sổ an chia thẻ: Tổng quan · Tu luyện · Sổ cá · Kỷ niệm; bỏ quầy đổi quà.
5. [x] README + docs, `npm test`, `npm run build`, kiểm tra trình duyệt.

## Rủi ro

- Khoá Long quyền làm nút "Lee Sin" ở màn chào hỏng: nút chỉ mặc món đã có, báo món còn thiếu.
- Người dùng máy khác (localStorage khác): server là nguồn sự thật, snapshot trả `owned` và ngoại hình thật.
