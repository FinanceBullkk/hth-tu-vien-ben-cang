# Lớp mini-game kiểu Where Winds Meet (đợt rebuild 11/2026)

Áp dụng phân tích WWM vào HTH – Tu viện bên cảng. Tài liệu này ghi lại: nguyên tắc thiết kế đã áp dụng,
hợp đồng message/điểm mới, và vị trí từng trò trong thế giới.

## Tám nguyên tắc lấy từ WWM

| Nguyên tắc | Cách làm trong HTH |
|---|---|
| NPC là cửa vào | Sư chú Bừng đứng cạnh tam quan, có biểu tượng 📜 trên đầu; hai trò còn lại dùng điểm hoạt động sẵn có |
| Một lõi, nhiều lớp vỏ | Mô phỏng giằng co trong `shared/fish.js` chạy chung cho client (vẽ) và server (chấm); phách nhịp dùng chung cho chuông và sen |
| Ván ngắn, miễn phí | Ném hàng 60s, câu cá một mồi < 1 phút, đố < 30s, không tốn tài nguyên |
| Xếp hạng + khó tăng dần | Ném hàng hạng S/A/B/C, "Sóng cấp N" tăng từ từ (hiện rõ trên panel) |
| Phạt bấm sai | Nhịp: sai phím = mất nốt ngay (chống spam kiểu WWM); ném: trượt là mất combo |
| Ai cũng thấy nhau chơi | Phao câu, bao hàng bay, chuông ngân — tất cả broadcast qua Socket.IO |
| Người chơi cần nhau | Bảng tuần chung; chuông ngân dày hơn khi nhiều người cùng đúng nhịp |
| Hài hước + văn hóa | Dép tổ ong của sếp, container thất lạc, câu đố logistics (B/L, CBM, demurrage) |

## Vị trí trong thế giới

| Trò | Vị trí | Cách vào |
|---|---|---|
| Đố của sư chú | Cạnh cổng tam quan (GATE_MONK) | Bấm NPC hoặc điểm hoạt động gần đó |
| Câu cá | Hồ góc đông nam sân (LAKE), đứng bờ nào cũng được | Điểm hoạt động "Buông cần câu cá" |
| Đầu hồ | Sân cạnh bãi container (PITCH_ZONE) | Điểm hoạt động "Chơi đầu hồ" |
| Nhịp chuông / Nhịp sen | Gác chuông / chiếu thiền (như cũ, đã làm lại UI lane rơi) | Như cũ |

## Cơ chế từng trò

### Đầu hồ (làm theo video "Pitch Pot explained")
- Đấu theo lượt với NPC, tối đa 2 phút. Dẫn 50 hoặc chạm 250 điểm trước là thắng, hết giờ thì so điểm. Có 3 đối thủ, khác nhau ở tỉ lệ trúng, cỡ vòng, tốc độ trôi và độ lắc.
- Mỗi lượt có tối đa 10 giây: giữ tâm trong vòng đang trôi cho đầy rồi ném. Ném sớm hoặc hết giờ là trượt. Lượt 0 một tâm, lượt 1 hai tâm gần, lượt 2 hai tâm xa, sau đó bốc theo độ khó.
- Điểm theo combo: 10, 15, 15, 20, 25, 30, 35, 45, 50 (trần). Video xác nhận 10/25/40 sau ba cú, 195 sau cú thứ tám và cú +50 đưa lên 245; các mức giữa là suy ra cho khớp tổng.
- Vòng và độ lắc tính được từ seed + giờ server (`shared/pitch.js`). Client gửi vị trí tâm kèm thời điểm `t` mỗi 100 ms; server chấm độ đầy tại `t` để khớp thứ người chơi đã thấy. `t` chỉ được lùi tối đa 300 ms và không được ở tương lai. Ngưỡng trúng 85% và vòng nới 15% bù sai số còn lại.
- Lệch khỏi vòng thì tụt hết trong 1,8 lần thời gian làm đầy (`fillDecay`). Lượt hai tâm ở cấp khó dùng vòng rộng hơn (`dualRadius`) vì phải chia mắt cho hai tay. Mô phỏng với người chơi giả lập: thắng khoảng 100% / 78% / 29% ở ba cấp; đây là mô hình thô, chỉ dùng để so giữa các cấp.
- Hạng: thắng lấy theo đối thủ (B/A/S), thua hoặc hoà là C. TEU: S=8, A=5, B=3, C=1. Rời giữa trận không lưu.
- Message: `pitch:start {tier}` → `{game}`; `pitch:aim {x,y,bx,by,t}`; `pitch:throw {x,y,bx,by,t}`; server gửi riêng `pitch:turn {me,npc,turn,aimAt,aimEndsAt,over}` và phát `pitch:throw {sid,hit,npcHit}` để mọi người thấy tên bay.

### Câu cá ở hồ trong sân
Phân tích nguồn: `plans/reports/research-261107-0851-where-winds-meet-fishing-analysis.md`. Luồng giằng co học từ Where Winds Meet; bóng cá, `!`, Sổ cá, mốc sưu tập, cá theo giờ học từ Play Together.

- Hồ: `LAKE` trong `shared/layout.js`, ba vòng tròn ghép lại và nằm luôn trong `CIRCLES`, câu được khi `lakeDistance < shoreWidth`.
- Bóng cá: `shared/fish-lake-shadows.js` tính thuần từ giờ server, 7 làn, mỗi khung 40s, không tốn băng thông. Phao rơi trong 1,5 m thì giữ bóng đó (`fish:shadow {id, sid}`), người sau không lấy được. Có bóng thì cá cắn sớm hơn và nghiêng về độ hiếm theo cỡ bóng (`SHADOW_BIAS`).
- Mồi: bột/giun/rau, miễn phí, vô hạn. Mồi sai còn 12% tỉ lệ với loài không mê mồi đó; đồ thất lạc mồi nào cũng vướng nhưng chỉ 25% tỉ lệ.
- Thả: `fish:cast {tx, tz, bait}`, toạ độ chỗ người chơi chạm trên mặt hồ. `castSpot` luôn trả về điểm trên mặt nước; không có toạ độ thì thả ra phía tâm hồ.
- Giờ: `isLakeNight` theo cùng vòng ngày đêm của bầu trời; `FISH[].time` là `dusk` hoặc `night`.
- Chờ 3–9s nhân `SHADOW_WAIT`; **lắc cần** (`fish:wiggle`, tối đa 2/s) đẩy giờ cắn sớm, tổng cộng tối đa 2,5s.
- Cá cắn là vào giằng co, không có pha canh giờ móc. Server chốt loài rồi gửi riêng `fish:bite {seed, rarity, startAt, assist}`, không lộ tên; phát `fish:struck {sid}` để cả phòng thấy `!`.
- Giằng co: `fightGreen(t, seed, rarity)` cho tâm vệt ngọc; client gửi `fish:pull {x}` khoảng 8 lần/giây. Server tự tích phân bằng `fightAdvance` theo vị trí kim gần nhất (dung sai 0,03 bù trễ), kể cả khi client im lặng. Client không thể tự báo đầy.
- Độ khó theo rarity 1/2/3: nửa vệt 0,2/0,14/0,095, tốc độ 0,7/0,95/1,25. Giữ trọn trong vệt thì đầy sau khoảng 5/6,5/9s. Cạn vòng hoặc quá 45s là cá tuột.
- Đầy vòng → client tự gọi `fish:reel`. Ở trong vệt từ 80% thời gian trở lên là "câu đẹp".
- Người mới: chưa bắt đủ 3 loài thì `assist`: vùng xanh ×1,35, chậm hơn, đầy nhanh hơn, tụt ×0,35. Lời dẫn và mở dần khái niệm nằm ở `activities/fishing-coach.js`.
- TEU: rarity 1/2/3 = 1/2/4, câu đẹp +1, mốc Sổ cá 5/10/15 loài +5/10/25. Cộng ngay khi kéo lên; khi về bờ chỉ hiện tổng kết chuyến.
- Hết lượt mà còn đứng câu: `fish:rodoff {sid, idle: true}`, giữ tư thế và cần trên tay; về bờ thì `idle: false`.
- Message: `fish:cast/wiggle/pull/reel/cancel`; S→C: `fish:bobber`, `fish:shadow`, `fish:struck`, `fish:rodoff`, `fish:caught {sid, name, rarity, weight}`, và riêng người câu: `fish:bite`, `fish:escaped {reason}`. Snapshot `hello` có `fishers`, `fishShadowsTaken`.

### Đố của sư chú
- `riddle:draw` → server pick từ `config.riddles[]` (sửa được trong trang admin, format một dòng:
  `câu hỏi | đáp án 1; đáp án 2 | gợi ý | bậc 1-3`). Đáp án normalize: bỏ dấu, bỏ ký tự lạ.
- Sai 2 lần hiện gợi ý. Đúng nhận TEU theo bậc (1→2, 2→3, 3→5). 10 lượt/ngày, 3s/lượt.

### Nhịp chuông / Nhịp sen — làm lại theo Graceful Melody
- Nốt rơi theo 4 lane về vạch (canvas), mỗi round 3–4 nốt nằm trên beat 0..3 (pattern 3 nốt,
  từ round 6 là 4 nốt — cũ là 3–5 nốt nhập chuỗi rồi chốt).
- Bấm từng nốt: `rhythm:hit {id, round, idx, note}` — server chấm theo giờ nhận gói so với
  `noteTargetAt(at, round, idx)`; sai phím = miss ngay (chống spam); nốt không bấm bị quét miss.
- Chuông: mỗi nốt trúng phát `bell:ring` (đồng nghiệp cùng beat làm âm dày hơn). Sen: mỗi round khép
  lại phát `rhythm:bloom` (sen mở dần). Âm meditate là gảy đàn Karplus–Strong (`audio.pluck`).

## TEU + Bảng tuần

- TEU tích từ mọi trò, ghi vào `teu_log` (`server/db.js addTeu`); tổng nằm ở `players.teu`.
- Bảng tuần (tab mới trong Bảng ước, REST `GET /api/weekly`): Top TEU, cá to nhất, ném hàng điểm cao nhất —
  tính từ thứ Hai theo múi giờ game (`localWeekStart`).
- Sink tối thiểu: 2 màu áo quý (Vàng kim, Lam ngọc — index 8, 9 của SHIRT_COLORS) mở bằng 25 TEU
  qua `cosmetic:unlock`; bitmask lưu `players.unlocked`, server chặn màu chưa mở khi hello.

## Schema mới (SQLite)

- `players`: thêm `teu, riddle_correct, pitch_best, unlocked`.
- `fish_log(player_id, fish_id, weight, grade, local_date, created_at)` — mỗi con một dòng, phục vụ bảng tuần.
- `fish_caught(player_id, fish_id, count, best_weight, first_caught_at)` — bộ sưu tập trong Sổ an.
- `pitch_scores(player_id, score, rank, local_date, created_at)`.
- `teu_log(player_id, amount, reason, local_date, created_at)`.
- `riddle_daily(player_id, local_date, attempts, correct)`.

## Lỗi của WWM mà đợt này tránh

| Lỗi WWM | Ở HTH |
|---|---|
| Graceful Melody không phạt bấm sai → spam 6 phím ăn tuyệt đối | Sai phím = mất nốt; mashing chỉ có miss |
| Pitch Pot khó tăng vọt, ẩn chỉ số | Người chơi tự chọn đối thủ, độ khó ghi rõ, chơi lại miễn phí |
| Gặp trò trước khi được dạy | Round đầu có dòng hướng dẫn; câu đầu có gợi ý sau 2 lần sai |
| Phí vào cửa làm nản | Mọi thứ miễn phí |
| Luật phức tạp | Mỗi trò luật vừa một dòng trên panel |

## Không làm đợt này

Madiao/Khai báo hải quan, đòi nợ debit note (Gift of Gab), bóng nút chai (Piaoyao), bắt đom đóm,
ink post-processing shader, GLB Blender mới (mọi prop code-built theo `scene/builders.js`),
matchmaking real-time cho ném hàng.
