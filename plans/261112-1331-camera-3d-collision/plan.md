# Camera: va chạm 3D kiểu spring arm

Trạng thái: xong, chờ merge. Nhánh `feat/camera-3d-collision`.

Đo trên bản build (quay 360°): trên cầu tay đòn giữ 4 m (cũ sập 0.3 m); sát tường rào nhìn cao không co
(cũ 1.9 m). Hiên thiền đường còn một cú co khi quét từ khe cửa ra mép tường: đúng vật lý, giữ.

## Vấn đề
Xoay camera hay "vướng": camera co sát người rồi giãn ra chậm.
Nguyên nhân: va chạm camera là tia 2D (`cameraSegmentT`) trên `BOXES` có `cam: true`, coi vật cản cao vô hạn.
- Lan can cầu (< 1.2 m) chặn như tường; đứng trên cầu xoay ngang là camera sập vào đầu.
- Tường rào nam cao ~2.1 m vẫn chặn khi camera ở trên cao.
- Tia mảnh quét qua góc tường: khoảng cách nhảy qua lại.
- Mái xử lý bằng trần theo vị trí người chơi (`roofCeiling`), không phải va chạm thật.

## Tham khảo
Trove/WWM: WASD + chuột xoay quỹ đạo quanh nhân vật, lăn zoom, camera tự co khi có vật chắn.
Unreal SpringArm / Godot SpringArm3D / Unity Cinemachine Deoccluder cùng một mẫu:
quét cầu (sphere cast) 3D từ điểm xoay ra camera; bỏ qua vật cản sát nhân vật; vật mảnh/thấp "trong suốt";
co vào ngay khi bị chắn, giãn ra từ từ.

## Kiến trúc
- `shared/camera-colliders.js` (mới): danh sách hộp 3D `CAMERA_COLLIDERS` (tường rào nam cao 2.1 m,
  5 mảng tường thiền đường cao 4.6 m, tấm mái thiền đường/hành lang/gác chuông/quán trà, thân bảo tháp)
  và `cameraProbe(origin, dir, maxDist, radius)`: quét cầu = tia vào hộp nới thêm bán kính.
  Hộp chứa sẵn điểm xoay thì bỏ qua. Lan can, cột, cây không có trong danh sách.
- `client/src/player/camera.js`: quỹ đạo dùng `cameraProbe` thay `cameraSegmentT` + `roofCeiling`.
  Co tức thì tới chỗ an toàn, giãn ra rate 5. Giữ: zoom trượt, chuyển cảnh minigame, nhìn lên trời sát đất,
  giới hạn 3 m trong thiền đường (tránh nhảy khi quét qua khung cửa).
- `cameraSegmentT`/`BOXES.cam` giữ nguyên cho `fishing-camera-shot.js`.

## Test
- Quay 360° ở SPAWN và các chiếu thiền: không nhảy, camera không nằm trong vật cản, đường từ điểm xoay tới camera thông.
- Trên đỉnh cầu quay 360°: camera không bị co (lan can không chặn).
- Sát tường rào nam nhìn qua tường với pitch 0.5: không co; pitch -0.2: co lại.
- Dưới hiên hành lang chúi cao: camera ở dưới mái.

## Câu hỏi còn mở
- Có cần làm mờ vật chắn (cây, cột) thay vì để che không? Chưa làm (YAGNI).
