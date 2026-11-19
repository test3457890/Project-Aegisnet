#!/usr/bin/env bash
# ============================================================
# AegisNet / SkyMesh Scout — Raspberry Pi Node Installer
# Version: 4.2
#
# PROTOTYPE NOTICE:
# This installs a prototype communications and tracking node.
# Not emergency-certified. Not production-secure.
# Not affiliated with CAP, police, fire, EMS, or aviation.
# Property owners must understand what this node does before
# installing it. See README.md and the setup wizard.
#
# Usage:
#   chmod +x install.sh && sudo ./install.sh
#   Or: curl -fsSL https://your-server/install.sh | sudo bash
# ============================================================
set -euo pipefail

REPO_DIR="${AEGISNET_DIR:-/opt/aegisnet}"
SERVICE_USER="${AEGISNET_USER:-pi}"
VERSION="4.2"
LOG_FILE="/tmp/aegisnet-install-$(date +%Y%m%d-%H%M%S).log"
ERRORS=0

# ── colors ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*" | tee -a "$LOG_FILE"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*" | tee -a "$LOG_FILE"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*" | tee -a "$LOG_FILE"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*" | tee -a "$LOG_FILE"; ERRORS=$((ERRORS+1)); }
header(){ echo -e "\n${BOLD}${CYAN}━━━  $*  ━━━${NC}" | tee -a "$LOG_FILE"; }
die()   { echo -e "\n${RED}[FATAL]${NC} $*" | tee -a "$LOG_FILE"; echo "Log: $LOG_FILE"; exit 1; }

# ── banner ──
echo -e "${CYAN}"
cat << 'BANNER'
  ___  ___ _   _ __  __ ___  ___ _  _ _____ ___
 / __|/ __| | | |  \/  | __||_ _| \| |_   _| __|
 \__ \ (__| |_| | |\/| | _|  | || .` | | | |__ \
 |___/\___|\__, |_|  |_|___||___|_|\_| |_| |___/
           |___/  AegisNet Node Installer v4.2
BANNER
echo -e "${NC}"
echo "Log file: $LOG_FILE"
echo ""

# ── root check ──
if [[ $EUID -ne 0 ]]; then
  die "This script must be run as root. Try: sudo ./install.sh"
fi

# ── OS check ──
header "1. System Check"
if [[ ! -f /etc/os-release ]]; then
  die "Cannot determine OS. /etc/os-release not found."
fi
source /etc/os-release
info "OS: $PRETTY_NAME"
ARCH=$(uname -m)
info "Arch: $ARCH"

case "$ID" in
  raspbian|debian|ubuntu) ok "Supported OS detected" ;;
  *) warn "OS '$ID' is not officially tested. Proceeding anyway." ;;
esac

case "$ARCH" in
  armv7l|aarch64|x86_64) ok "Architecture supported" ;;
  *) warn "Arch '$ARCH' not tested. May have issues." ;;
esac

# Check available disk space (need at least 1GB)
DISK_FREE=$(df /opt 2>/dev/null | awk 'NR==2{print $4}' || echo 0)
if [[ $DISK_FREE -lt 1048576 ]]; then
  warn "Less than 1GB free on /opt. Consider freeing space."
else
  ok "Disk space OK ($(( DISK_FREE / 1024 ))MB free)"
fi

# Check internet
header "2. Internet Connectivity"
if curl -fsSL --max-time 5 https://www.google.com -o /dev/null 2>/dev/null; then
  ok "Internet reachable"
else
  warn "Internet not reachable. Some downloads may fail."
fi

# ── dependencies ──
header "3. Installing System Dependencies"
apt-get update -qq 2>&1 | tail -1 | tee -a "$LOG_FILE"

PACKAGES=(git python3 python3-pip curl wget jq)
for pkg in "${PACKAGES[@]}"; do
  if dpkg -l "$pkg" &>/dev/null; then
    ok "$pkg already installed"
  else
    info "Installing $pkg..."
    if apt-get install -y -qq "$pkg" >> "$LOG_FILE" 2>&1; then
      ok "$pkg installed"
    else
      fail "Failed to install $pkg — check $LOG_FILE"
    fi
  fi
done

# Check Python version
PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
info "Python version: $PY_VER"
if python3 -c "import sys; sys.exit(0 if sys.version_info >= (3,9) else 1)"; then
  ok "Python 3.9+ confirmed"
else
  warn "Python $PY_VER detected. 3.9+ recommended."
fi

# ── Python packages ──
header "4. Python Dependencies"
PY_PACKAGES=(meshtastic requests)
for pkg in "${PY_PACKAGES[@]}"; do
  info "Installing Python package: $pkg"
  if pip3 install --upgrade "$pkg" --break-system-packages -q 2>&1 | tee -a "$LOG_FILE"; then
    ok "$pkg installed"
  else
    fail "pip3 install $pkg failed — check $LOG_FILE"
  fi
done

# Optional: readsb for local ADS-B
header "5. Optional: ADS-B Receiver (readsb)"
if command -v readsb &>/dev/null; then
  ok "readsb already installed"
elif command -v dump1090-fa &>/dev/null; then
  ok "dump1090-fa already installed"
else
  info "readsb not found. Installing via wiedehopf script..."
  info "  (skip this if you don't have an RTL-SDR dongle)"
  read -r -t 15 -p "  Install readsb now? [y/N] (15s timeout) " INSTALL_READSB || INSTALL_READSB="n"
  if [[ "${INSTALL_READSB,,}" == "y" ]]; then
    if bash -c "$(wget -O - https://github.com/wiedehopf/adsb-scripts/raw/master/readsb-install.sh)" 2>&1 | tee -a "$LOG_FILE"; then
      ok "readsb installed"
    else
      warn "readsb install failed — aircraft tracking will use demo/API mode"
    fi
  else
    warn "Skipped readsb. Aircraft tracking will use demo/API mode until configured."
  fi
fi

# Optional: rtl-ais for AIS decoding
header "6. Optional: AIS Receiver (rtl-ais)"
if command -v rtl_ais &>/dev/null; then
  ok "rtl_ais already installed"
else
  read -r -t 10 -p "  Install rtl-ais for boat/vessel tracking? [y/N] (10s timeout) " INSTALL_AIS || INSTALL_AIS="n"
  if [[ "${INSTALL_AIS,,}" == "y" ]]; then
    if apt-get install -y -qq rtl-sdr 2>&1 | tee -a "$LOG_FILE" && \
       pip3 install pyais --break-system-packages -q 2>&1 | tee -a "$LOG_FILE"; then
      ok "AIS dependencies installed"
    else
      warn "AIS install had issues — marine tracking will use demo/API mode"
    fi
  else
    warn "Skipped AIS. Marine tracking will use demo/API mode."
  fi
fi

# ── project files ──
header "7. Project Installation"
if [[ -d "$REPO_DIR/.git" ]]; then
  info "Existing installation found at $REPO_DIR. Updating..."
  cd "$REPO_DIR"
  if git pull --ff-only 2>&1 | tee -a "$LOG_FILE"; then
    ok "Updated to latest"
  else
    warn "git pull failed — using existing files"
  fi
elif [[ -d "$REPO_DIR" ]]; then
  info "Directory exists but no git repo. Assuming manual install at $REPO_DIR"
  ok "Using existing directory"
else
  # Try git clone, fall back to local copy
  info "Installing to $REPO_DIR"
  mkdir -p "$REPO_DIR"
  if [[ -d "/home/$SERVICE_USER/skymesh-scout-p4.2" ]]; then
    info "Found local files — copying to $REPO_DIR"
    cp -r "/home/$SERVICE_USER/skymesh-scout-p4.2/." "$REPO_DIR/"
    ok "Files copied from local source"
  else
    warn "No remote repo configured and no local source found."
    warn "Copy project files to $REPO_DIR manually and re-run installer."
    warn "Continuing with setup..."
  fi
fi

# ── config setup ──
header "8. Configuration"
CONFIG="$REPO_DIR/config.json"
if [[ ! -f "$CONFIG" ]]; then
  info "Creating default config..."
  cat > "$CONFIG" << 'CFGEOF'
{
  "nodeId": "",
  "nodeName": "AegisNet Node",
  "nodeRole": "home",
  "rxLat": 0.0,
  "rxLon": 0.0,
  "gpsAuto": true,
  "aircraftJson": "/run/readsb/aircraft.json",
  "pollMs": 2500,
  "repeatMinutes": 10,
  "mqttBroker": "mqtt.meshtastic.org",
  "mqttPort": 1883,
  "mqttSelfHost": "",
  "serialDev": null,
  "guestMode": false,
  "aisEnabled": false,
  "aisMode": "demo",
  "aisDecoderHost": "localhost",
  "aisDecoderPort": 10110,
  "features": {
    "ships": true,
    "trains": true,
    "aegisnet": false,
    "flightradar24": false,
    "adsbexchange": false,
    "opensky": false,
    "ais_local": false,
    "ais_online": false,
    "amtrak": true,
    "gpsAuto": true
  }
}
CFGEOF
  ok "Default config created at $CONFIG"
else
  ok "Config exists at $CONFIG"
fi

# Generate node ID if missing
if python3 -c "
import json, secrets, pathlib
cfg = json.loads(pathlib.Path('$CONFIG').read_text())
if not cfg.get('nodeId'):
    cfg['nodeId'] = 'aegis-' + secrets.token_hex(4)
    pathlib.Path('$CONFIG').write_text(json.dumps(cfg, indent=2))
    print('generated:', cfg['nodeId'])
else:
    print('exists:', cfg['nodeId'])
" 2>&1; then
  ok "Node ID set"
else
  warn "Could not set node ID — check config.json manually"
fi

# ── systemd services ──
header "9. Systemd Services"
SVCDIR=/etc/systemd/system

# Dashboard service
cat > "$SVCDIR/aegisnet-dashboard.service" << SVCEOF
[Unit]
Description=AegisNet Dashboard Server
After=network.target

[Service]
ExecStart=/usr/bin/python3 $REPO_DIR/server/server.py
Restart=on-failure
RestartSec=5
User=$SERVICE_USER
WorkingDirectory=$REPO_DIR
Environment=PORT=8080

[Install]
WantedBy=multi-user.target
SVCEOF
ok "aegisnet-dashboard.service written"

# ADS-B bridge service
cat > "$SVCDIR/aegisnet-adsb-bridge.service" << SVCEOF
[Unit]
Description=AegisNet ADS-B to Meshtastic Alert Bridge
After=readsb.service dump1090-fa.service
ConditionPathExists=$REPO_DIR/bridge/adsb_mesh_alert.py

[Service]
ExecStart=/usr/bin/python3 $REPO_DIR/bridge/adsb_mesh_alert.py
Restart=on-failure
RestartSec=10
User=$SERVICE_USER
WorkingDirectory=$REPO_DIR

[Install]
WantedBy=multi-user.target
SVCEOF
ok "aegisnet-adsb-bridge.service written"

# AIS bridge service
cat > "$SVCDIR/aegisnet-ais-bridge.service" << SVCEOF
[Unit]
Description=AegisNet AIS to Dashboard Bridge
After=network.target
ConditionPathExists=$REPO_DIR/bridge/ais_bridge.py

[Service]
ExecStart=/usr/bin/python3 $REPO_DIR/bridge/ais_bridge.py
Restart=on-failure
RestartSec=15
User=$SERVICE_USER
WorkingDirectory=$REPO_DIR

[Install]
WantedBy=multi-user.target
SVCEOF
ok "aegisnet-ais-bridge.service written"

systemctl daemon-reload
systemctl enable aegisnet-dashboard.service
systemctl restart aegisnet-dashboard.service 2>/dev/null || true

if systemctl is-active --quiet aegisnet-dashboard.service; then
  ok "aegisnet-dashboard started"
else
  warn "Dashboard service may not have started yet. Check: journalctl -u aegisnet-dashboard"
fi

# ── health check ──
header "10. Health Check"
sleep 2
DASHBOARD_UP=false
for i in 1 2 3; do
  if curl -fsSL --max-time 4 http://localhost:8080/ -o /dev/null 2>/dev/null; then
    DASHBOARD_UP=true; break
  fi
  sleep 2
done

if $DASHBOARD_UP; then
  ok "Dashboard responding on port 8080"
else
  fail "Dashboard not responding on port 8080 — check: journalctl -u aegisnet-dashboard -n 30"
fi

# Find local IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")

# ── final report ──
header "Install Complete"
if [[ $ERRORS -gt 0 ]]; then
  echo -e "${YELLOW}Completed with ${ERRORS} warning(s) / error(s).${NC}"
  echo "Review log: $LOG_FILE"
else
  echo -e "${GREEN}All steps completed successfully.${NC}"
fi

echo ""
echo -e "  ${BOLD}Dashboard:${NC}  http://${LOCAL_IP}:8080"
echo -e "  ${BOLD}Setup wizard:${NC} http://${LOCAL_IP}:8080/setup"
echo -e "  ${BOLD}Config file:${NC}  $CONFIG"
echo -e "  ${BOLD}Install log:${NC}  $LOG_FILE"
echo ""
echo -e "  ${CYAN}Next steps:${NC}"
echo "  1. Open the setup wizard in a browser"
echo "  2. Configure your node name, location, and MQTT settings"
echo "  3. Plug in your Meshtastic node over USB"
echo "  4. Enable Field Mode in the dashboard"
echo "  5. For ADS-B: connect RTL-SDR and antenna"
echo ""
echo -e "  ${YELLOW}PROTOTYPE NOTICE:${NC} This is a prototype node."
echo "  Not emergency-certified. Not production-secure."
echo "  See README.md for full safety and legal notices."
echo ""
