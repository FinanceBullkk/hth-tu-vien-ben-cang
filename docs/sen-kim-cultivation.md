# Sen Kim theo cảnh giới công pháp

Bản thử 08/11/2026, nhánh `feat/sen-kim-cultivation-tiers`. Dùng
`cultivationTier` do server phát, giữ ngưỡng điểm Nhịp sen hiện có.
Không dùng `qi` hoặc năm cấp chân khí để chọn thiết kế.

| Cảnh giới | Điểm | Nhận diện |
| --- | ---: | --- |
| Khởi khí | 0 | Hạt từ môi trường hút về đan điền, nụ sen mờ |
| Tụ linh | 300 | Dải khí xoắn quanh thân rồi hội tụ, sen hé nở |
| Kết đan | 1000 | Kim đan neo vùng bụng, khí xoáy nén vào lõi, hai pháp vòng |
| Hóa cảnh | 2500 | Kim liên lơ lửng khi thiền, pháp luân lớn, khí dâng toàn thân |

Sen Kim thay hào quang cố định bằng renderer cảnh giới trong
`client/src/player/sen-kim-cultivation.js`. Các hiệu ứng khác giữ đường render cũ.
Aura thiền hút và dẫn khí khi ngồi. Đứng dậy giữ hình tướng, tắt dòng khí.
Hóa Cảnh nâng rig, đài sen và nhãn tên; root/server position không đổi.

Đột phá 8 giây: tích tụ 0–2, ngưng tụ 2–4, giải phóng 4–5, ổn định 5–8.
Chỉ cultivation:update tăng tier mới chạy; snapshot, reconnect, tier trùng và
đổi ngoại hình không phát lại. Tụ Linh mở dòng xoắn; Kết Đan nén lõi/mở pháp
vòng; Hóa Cảnh nâng kim liên và hiện pháp luân. Không đổi điểm hoặc luật server.
Reduced motion giữ hình tĩnh; chất lượng thấp giảm phân đoạn nhưng giữ nhận diện.
Geometry/material thuộc từng nhân vật, được giải phóng khi đổi cảnh giới hoặc rời game.

## Xem và kiểm tra

```powershell
node node_modules/vite/bin/vite.js --config plans/261108-sen-kim-realms/vite.config.mjs
# http://127.0.0.1:5188/plans/261108-sen-kim-realms/index.html
node --test test/sen-kim-cultivation.test.js
npm test
npm run build
# PUPPETEER_MODULE: Puppeteer ESM đã cài, nếu không nằm trong node_modules
node test/sen-kim-realms-browser-check.mjs
```

Đã đạt 123/123 test, build, browser check desktop/mobile, đổi tầng/ngoại hình,
qi độc lập với cảnh giới, fade và shader. Ảnh nằm cùng thư mục bản thử.
Đã chụp trước/ngang/sau/chéo, các mốc đột phá và ghi clip 10 giây.
Preview dùng Segoe UI/Tahoma để tránh lỗi dấu/khoảng chữ tiếng Việt; có nút
chạy từng lần đột phá, scrub 0–8 giây, tùy chọn chuyển động rõ ràng.

Đo RX 6600, 1280×720, không bloom, 45 frame/case, bỏ 15 frame đầu,
chờ gl.finish để tính cả GPU. Cảnh chỉ có avatar, chưa gồm world/network.
Kết quả p95 (không/có Hóa Cảnh): 1 người 0,3/0,5 ms; 12 người 1,6/2,8 ms;
30 người 3,8/8,1 ms; 60 người 5,6/16,5 ms. Thêm 10 draw call mỗi Hóa Cảnh.
Đây là phép đo chi phí renderer, không phải cam kết FPS production.
Chưa deploy.

Dependencies: npm ci không build được better-sqlite3 vì thiếu Visual Studio C++.
Worktree dùng junction node_modules tới checkout D:/hth-tu-vien-ben-cang;
thư mục cài chưa hoàn tất được giữ tại node_modules-install-incomplete (ignored).
