#!/usr/bin/env bash
# Chặn container game đi sang mạng nội bộ, Tailscale và các dịch vụ khác trên máy.
# Game chỉ nhận kết nối vào, không cần gọi ra đâu cả. Luật chỉ áp dụng cho mạng Docker của game.
# Chạy bằng: sudo bash scripts/install-firewall.sh
# Gỡ bỏ:     sudo bash scripts/install-firewall.sh --remove
set -euo pipefail

NET=hth-net
CHAIN=HTH-ISOLATE
BIN=/usr/local/sbin/hth-firewall
UNIT=/etc/systemd/system/hth-firewall.service

[ "$(id -u)" -eq 0 ] || { echo "Cần chạy bằng sudo."; exit 1; }

if [ "${1:-}" = "--remove" ]; then
  systemctl disable --now hth-firewall.service 2>/dev/null || true
  SUBNET=$(docker network inspect "$NET" --format '{{(index .IPAM.Config 0).Subnet}}' 2>/dev/null || true)
  [ -n "$SUBNET" ] && iptables -D DOCKER-USER -s "$SUBNET" -j "$CHAIN" 2>/dev/null || true
  iptables -F "$CHAIN" 2>/dev/null || true
  iptables -X "$CHAIN" 2>/dev/null || true
  rm -f "$BIN" "$UNIT"
  systemctl daemon-reload
  echo "Đã gỡ luật tường lửa của game."
  exit 0
fi

docker network inspect "$NET" >/dev/null

cat > "$BIN" <<EOF
#!/usr/bin/env bash
# Sinh ra bởi scripts/install-firewall.sh
set -euo pipefail
SUBNET=\$(docker network inspect $NET --format '{{(index .IPAM.Config 0).Subnet}}')
iptables -N $CHAIN 2>/dev/null || iptables -F $CHAIN
iptables -A $CHAIN -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -A $CHAIN -d "\$SUBNET" -j RETURN
for dst in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 100.64.0.0/10 169.254.0.0/16; do
  iptables -A $CHAIN -d "\$dst" -j DROP
done
iptables -C DOCKER-USER -s "\$SUBNET" -j $CHAIN 2>/dev/null || iptables -I DOCKER-USER -s "\$SUBNET" -j $CHAIN
EOF
chmod 755 "$BIN"

cat > "$UNIT" <<EOF
[Unit]
Description=Chan container game HTH di sang mang noi bo
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=$BIN

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now hth-firewall.service
systemctl restart hth-firewall.service
echo "Đã bật. Luật đang có:"
iptables -S "$CHAIN"
