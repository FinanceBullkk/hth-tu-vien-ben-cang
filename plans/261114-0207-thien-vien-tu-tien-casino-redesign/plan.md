# Thiền viện tu tiên kết hợp sòng: quy hoạch lại và đổi phong cách

Ngày 14/11/2026. Chủ dự án thấy sân chật (cả sòng lẫn các cụm cũ) và nhìn "giống miền quê".
Đã chốt: hai tông tương phản, đủ bốn lớp cảnh tiên hiệp, chia nhiều PR, dựng thẳng 3D (không vẽ concept AI).

## Hướng đã chốt

- Nới gò từ 60×60 m lên khoảng 96×76 m về phía tây và bắc. Phía đông là dốc xuống cảng nên giữ nguyên;
  cảng container là bản sắc "bên cảng", không bỏ.
- Nội viện tu (trục giữa, phía bắc): cột son, mái ngói xanh ngọc, nền cẩm thạch trắng có lan can, mây mù.
- Kim Ngân Phường (phía tây, tường riêng): mái lưu ly vàng, đèn lồng đỏ, viền vàng kim; 4 bàn và máy gạt cần.
- Phố chợ (tây nam): sạp, trạm giao thương, quán trà. Phía đông (hồ câu, đầu hồ, bảng ước) giữ nguyên chỗ.
- Cảnh xa: núi đá dựng + biển mây, đảo bay + thác, hạc bay + linh khí, thiền đường trên đài cao có bậc.

## Các PR

| PR | Nội dung | Trạng thái |
|---|---|---|
| 1 | [Nới gò, dời các cụm theo sơ đồ](phase-01-noi-go-va-doi-cum.md) | Đã merge (#90) |
| 2 | [Kiến trúc nội viện kiểu tiên môn](phase-02-kien-truc-noi-vien.md) | PR mở |
| 3 | Kim Ngân Phường: tường, cổng, Kim Ngân Lâu, Tụ Bảo Bồn, dây đèn, sàn lát | Chờ |
| 4 | Cảnh xa: núi đá dựng, biển mây, đảo bay, thác, hạc, linh khí, trận pháp | Chờ |

Mỗi PR: `npm test`, `npm run build`, chụp `campus-preview.html` trước khi merge. Deploy hỏi riêng.

## Ràng buộc

- `shared/layout.js` là nguồn tọa độ cho client và server; mọi vị trí mới khai báo ở đó.
- Giữ low-poly flat-shading, màu theo đỉnh; GLB luôn có bản code dự phòng; không tải tài nguyên ngoài.
- Máy yếu: gộp mesh tĩnh, dùng InstancedMesh cho vật lặp, cảnh xa không đổ bóng.

## Câu hỏi còn mở

- Tên khu sòng: tạm "Kim Ngân Phường".
- Số máy gạt cần: giữ 3 (test và server đang giả định 3); tăng thì làm riêng.
