# AegisNet Node — Single-Node Readiness Report

**Version:** 4.2  
**Purpose:** Pre-flight check before the NJ–AZ MQTT bridge test  
**Status:** TEMPLATE — fill in the hardware-specific fields when running on a real Pi

---

## Instructions

Run this check on each node before the NJ–AZ test.  
Export the test log from the dashboard and send it to the other party.  
Do not include API keys, passwords, or tokens in any exported file.

---

## Node Identity

| Field | Value |
|---|---|
| Node ID | _(from dashboard → Comms → Node Status)_ |
| Node Name | _(set in setup wizard)_ |
| Node Role | home / relay / field / test |
| Location Label | _(e.g. NJ Base or AZ Relay)_ |
| Software Version | 4.2 |
| Hardware Profile | _(reported by health check)_ |
| Setup Wizard Complete | yes / no |

---

## Hardware

| Component | Present | Notes |
|---|---|---|
| Raspberry Pi model | | e.g. Pi 4 8GB |
| microSD card | | e.g. 32GB A2 |
| RTL-SDR dongle | | V4 recommended |
| 1090 MHz antenna | | Connected / not connected |
| AIS SDR (second dongle) | | Optional |
| 162 MHz AIS antenna | | Optional |
| Meshtastic node | | e.g. T-Beam Supreme US915 |
| USB cable (Meshtastic) | | Connected to Pi |
| Power supply | | e.g. 65W USB-C PD |
| Network | | Ethernet / Wi-Fi SSID |

---

## Software Check

Run from the Pi terminal:

```bash
# Check services
systemctl status aegisnet-dashboard
systemctl status aegisnet-adsb-bridge
systemctl status aegisnet-ais-bridge

# Check readsb
systemctl status readsb 2>/dev/null || echo "readsb not installed"

# Check Python bridge
ls /opt/aegisnet/bridge/adsb_mesh_alert.py

# Check config
python3 -c "import json; c=json.load(open('/opt/aegisnet/config.json')); print('nodeId:', c.get('nodeId')); print('mqttBroker:', c.get('mqttBroker'))"
```

| Check | Result |
|---|---|
| aegisnet-dashboard service | active / failed / not installed |
| aegisnet-adsb-bridge service | active / disabled / no hardware |
| readsb service | active / not installed |
| Python 3 version | |
| meshtastic package | installed / missing |
| config.json nodeId | |
| MQTT broker configured | mqtt.meshtastic.org / self-hosted / off |

---

## Endpoint Check

From a browser or `curl` on another device on the same network:

```bash
curl http://[PI_IP]:8080/api/ping
curl http://[PI_IP]:8080/api/health/disk
curl http://[PI_IP]:8080/api/health/services
```

| Endpoint | Expected | Result |
|---|---|---|
| /api/ping | `{"ok":true}` | |
| /setup | HTML page loads | |
| /manifest.json | JSON with name field | |
| /sw.js | Service worker JS | |
| /api/health/disk | freeMB value | |
| /api/health/services | service status dict | |
| /api/ais/vessels | `{"vessels":[]}` or live data | |
| /config.json | JSON without apiKeys | |

---

## Dashboard Check

Open `http://[PI_IP]:8080` in a browser.

| Item | Present |
|---|---|
| Dashboard loads | yes / no |
| Node Status Card visible | yes / no |
| Node ID shown | yes / no |
| Adapter list shown | yes / no |
| Comms Dashboard page | yes / no |
| NJ–AZ Test Mode panel | yes / no |
| Health Check button | yes / no |

---

## Health Check Results

In the dashboard → Comms → Node Health Check → Run Health Check.

| Check | Result |
|---|---|
| App loaded | ✓ / ✗ |
| Node ID present | ✓ / ✗ |
| CommsRouter loaded | ✓ / ✗ |
| TrackingRouter loaded | ✓ / ✗ |
| Dashboard server responding | ✓ / ✗ |
| Config file readable | ✓ / ✗ |
| Best comms route available | ✓ / ✗ — which route? |
| MQTT bridge connected | ✓ / ✗ / not enabled |
| AIS module loaded | ✓ / ✗ |
| Time appears sane | ✓ / ✗ |
| Disk space | freeMB: |
| Systemd services | |

---

## Support Bundle

Export from dashboard → Comms → Health Check → Export Bundle.

| Check | Result |
|---|---|
| Bundle exported | yes / no |
| File name | aegisnet-support-bundle-[nodeId]-[date].json |
| Contains nodeId | yes / no |
| Contains apiKeys | NO — if yes, this is a bug |
| Contains adminPassword | NO — if yes, this is a bug |
| Contains location | excluded by default (user opted in: yes/no) |

---

## MQTT / Mesh Readiness

| Check | Result |
|---|---|
| MQTT broker setting | mqtt.meshtastic.org / self-hosted |
| Field Mode enabled | yes / no |
| MQTT Bridge enabled | yes / no |
| MESH_STATE.connected | true / false |
| Meshtastic node detected | yes / no |
| Nodes visible on mesh | count: |

---

## NJ–AZ Test Mode

In dashboard → Comms → NJ–AZ Bridge Test.

| Check | Result |
|---|---|
| Test panel visible | yes / no |
| Node A name set | |
| Node B name set | |
| Start Test button works | yes / no |
| First ping sent | yes / no |
| Ping status shows | pending / delivered / queued / failed |
| Export JSON | works / error |
| Export CSV | works / error |
| Export Text Report | works / error |

**Single-node note:** With only one node running, pings will show as `queued` or `failed` until the second node connects. This is expected behavior. The test confirms the framework is ready — full validation requires both nodes.

---

## Known Issues / Blockers Before NJ–AZ Test

List anything that needs to be fixed before running the real test:

1. 
2. 
3. 

---

## Readiness Decision

| Item | Status |
|---|---|
| Pi installs successfully | ✓ / ✗ / blocked |
| Dashboard runs | ✓ / ✗ / blocked |
| Health check passes | ✓ / ✗ / partial |
| Support bundle safe | ✓ / ✗ |
| NJ–AZ test panel ready | ✓ / ✗ |
| Second node (other end) ready | ✓ / ✗ / pending |

**NJ–AZ test is ready when:** both nodes show MQTT connected, both show the test panel, and both can export a readiness report.

---

*This report does not include API keys, passwords, tokens, or shared secrets.*  
*AegisNet Prototype 4.2 — Not emergency-certified. Not production-secure.*
