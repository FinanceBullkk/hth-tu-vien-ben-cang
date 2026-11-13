# Quy hoạch khuôn viên — 14/11/2026

Thiền viện tu tiên kết hợp sòng. Gò nới từ 60×60 m lên khoảng 96×76 m về phía tây và bắc;
phía đông là tường chắn dốc xuống cảng nên giữ nguyên. Kế hoạch đổi phong cách theo từng PR:
`plans/261114-0207-thien-vien-tu-tien-casino-redesign/plan.md`.

## Bố cục

- Trục tam quan–thiền đường rộng 6 m; không đặt công trình giữa trục.
- Nội viện (trục giữa, phía bắc): thiền đường ở cuối trục, trước mặt là sân đạo trường lát đá để trống,
  hai hành lang có mái kẹp hai bên. Hồ sen và cầu vòm bên tây, bảo tháp và vườn đá bên đông.
- Tiền sân phía tây trục: gác chuông, cây bồ đề.
- Phố chợ (tây nam, lát đá): quán trà rút xăm, Sạp Kim Bảo, trạm giao thương.
- Kim Ngân Phường (phía tây, tường son mũ lưu ly vàng): cổng bài lâu phía đông nhìn sang gác chuông, phía nam ra phố chợ.
  Kim Ngân Lâu hai tầng sát tường bắc (chỉ để nhìn, có hộp va chạm `CASINO_HALL`), thảm đỏ viền vàng dọc lối giữa,
  dây đèn lồng đỏ trên bốn cột cờ (`CASINO_POLES`), nguyên bảo vàng bay vòng trên Tụ Bảo Bồn.
  Lối giữa bắc–nam có Tụ Bảo Bồn; cột tây bầu cua và tài xỉu, cột đông xì dách và cò quay; khách luôn đứng
  phía lối giữa, nhà cái mép ngoài. Hành lang máy gạt cần sát tường tây.
- Phía đông giữ nguyên: hồ câu, tấu nhạc, đầu hồ, bảng ước, sư chú giữ cổng.

## Nguồn và ràng buộc

`shared/layout.js` giữ tọa độ, đường đi, va chạm, vùng mái và điểm đến trong menu; `SITE` là tường bao,
`CASINO` là tường khu sòng, `TERRACE` là đài cẩm thạch cao 1.6 m dưới đại điện (bậc giữa mặt trước, lan can
chặn mép đài ở cả hai phía; `floorHeight` trả độ cao mặt đài và dốc đều trên bậc). Địa hình (`terrain.js`), nền sân (`campus-ground.js`), tường bao (`monastery.js`),
khung bóng đổ (`sky.js`) và vùng hoa rơi đều đọc từ đó. `client/src/scene/casino-quarter.js` dựng tường khu
sòng và Tụ Bảo Bồn. Mặt lát cao tối đa 0.04 m; bậc thiền đường, sàn chuông, quán trà và cầu giữ độ cao cũ.
Kiến trúc nội viện theo tông tiên môn: cột son, mái lưu ly xanh ngọc nóc vàng, nền cẩm thạch, tường cung đỏ son;
bộ dựng chung ở `client/src/scene/palace-kit.js`, đại điện ở `great-hall.js`, sơn môn và sư tử đá ở
`mountain-gate.js`. Mô hình GLB và fallback dùng cùng tọa độ. Lời ước vẫn gắn theo slot cành cây, không chuyển dữ liệu DB.

## Kiểm tra

- `npm run build`
- `npm test`
- `node --test test/campus-layout.test.js`: trục đi không bị chặn, điểm hoạt động hợp lệ, cầu vòm khớp hồ
  và va chạm, hai cổng khu sòng đi qua được, bàn không chồng nhau.
- Khi Vite đang chạy, mở `http://localhost:5173/campus-preview.html`: toàn cảnh, mặt bằng, góc từ cổng,
  Kim Ngân Phường; kéo xoay và cuộn phóng to. Trang dùng mô hình thật với ánh sáng kiểm tra ban ngày,
  không kết nối server hoặc ghi dữ liệu. Đây là trang kiểm tra dev, không nằm trong build phát hành.

Thay đổi bản đồ cần cập nhật client và server cùng phiên bản khi triển khai.
