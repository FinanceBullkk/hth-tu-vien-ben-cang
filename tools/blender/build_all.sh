#!/usr/bin/env bash
# Build toàn bộ asset Blender -> client/public/models/*.glb
# Dùng: bash tools/blender/build_all.sh
set -u
BLENDER="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
ROOT="D:/hth-tu-vien-ben-cang"
OUT="$ROOT/client/public/models"
mkdir -p "$OUT"

ASSETS="pagoda bridge nonbo banner stone-lantern tea-pavilion"
fail=0
for name in $ASSETS; do
  echo "=== $name ==="
  "$BLENDER" --background --python "$ROOT/tools/blender/$name.py" -- "$OUT/$name.glb" 2>&1 |
    grep -E "ASSET_OK|Error|Traceback|error:" |
    head -5
  if [ ! -f "$OUT/$name.glb" ]; then
    echo "FAILED: $name (không tạo được file)"
    fail=1
  fi
done

echo "--- Kết quả ---"
ls -la "$OUT"/*.glb 2>/dev/null
exit $fail
