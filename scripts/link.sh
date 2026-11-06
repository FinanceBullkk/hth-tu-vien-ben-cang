#!/usr/bin/env bash
# In link mới nhất để gửi vào nhóm Zalo, kèm sẵn mã vào cửa. Chạy trên máy chủ:
#   bash scripts/link.sh
set -euo pipefail

url=$(docker logs hth-tunnel 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
code=$(docker exec hth node -p "require('/app/data/config.json').joinCode")

if [ -z "$url" ]; then
  echo "Chưa thấy link tunnel. Kiểm tra container hth-tunnel bằng: docker ps" >&2
  exit 1
fi
echo "${url}/?code=${code}"
