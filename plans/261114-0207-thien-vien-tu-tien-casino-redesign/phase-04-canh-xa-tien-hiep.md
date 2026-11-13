# PR4: cảnh xa tiên hiệp

Ưu tiên trung bình. Chỉ thêm hình ảnh phía client; không đổi va chạm, server hay giao thức.

## Đã làm

- [x] `xianxia-backdrop-layout.js`: chỗ đặt có hạt giống quanh gò, chừa phía đông (cảng) và lối lên cổng nam.
- [x] `karst-peaks.js`: cột đá dựng nhiều tầng gờ, đỉnh rêu, tùng trên đỉnh; 3 dáng InstancedMesh, không đổ bóng.
- [x] `cloud-sea.js`: tấm mây nằm ngang dưới mặt gò lấp thung lũng, xoay rất chậm, ban đêm ngả lam.
- [x] `floating-islands.js`: đảo đá chóp ngược có đình mái ngọc, tùng, thác cuộn texture nhạt dần (alpha theo đỉnh), nhấp nhô.
- [x] `cranes.js`: đàn hạc bay chữ V lượn vòng, cánh vỗ; 3 InstancedMesh cho cả đàn.
- [x] `spirit-formation.js`: trận pháp bát quái thái cực giữa sân đạo trường xoay chậm, đốm linh khí bốc lên quanh đài.
- [x] Test: chỗ đặt núi không lấn phía cảng, lối cổng, trong gò; cùng hạt giống ra cùng vị trí.

## Rủi ro

- Mây trong suốt chồng nhiều lớp tốn fill-rate trên máy yếu: lowQuality giảm còn 14 tấm.
