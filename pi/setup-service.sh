#!/bin/bash
# One-time: run the bridge as a service that starts on every boot. Run on the Pi: bash ~/setup-service.sh
set -e
echo "== Installing the bridge service (asks for the Pi password once)"
sudo cp ~/drone-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable drone-bridge
sudo systemctl restart drone-bridge
sleep 8
echo "service: $(systemctl is-active drone-bridge)"
journalctl -u drone-bridge -n 8 --no-pager -o cat | grep -v -E "INFO|WARN V4L2"
echo "ALL DONE"
