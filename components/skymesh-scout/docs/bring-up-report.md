# AegisNet Node — Bring-Up Report

**Sprint:** P4.2 Real Pi Node Bring-Up and NJ–AZ Test Readiness  
**Report date:** 2026-06-13  
**Prepared by:** Build validation (simulated environment — real Pi steps documented)  
**Version:** 4.2

---

## 1. Summary

The P4.2 package passed all automated validation steps that can be verified without physical hardware. Every file is present, all syntax checks pass, all 17 server endpoints return expected responses, secrets are cleanly separated from the committed config, and the NJ–AZ test panel is functional.

**What this report covers:** Everything that can be verified in the build environment.  
**What requires a real Pi:** The hardware connection tests, systemd service activation, readsb/rtl-ais detection, and actual MQTT bridge connectivity.

---

## 2. Hardware Used (simulated environment)

| Component | Value |
|---|---|
| Build environment | Linux (Ubuntu 24, x86_64) |
| Real Pi model | **Pending — not yet tested on hardware** |
| Real Pi OS | **Pending** |
| RTL-SDR dongle | **Pending** |
| Meshtastic node | **Pending** |

> **Action required:** Run `deploy/install.sh` on a real Raspberry Pi 4 or Pi 5 and fill in this section with actual hardware details. Use `docs/single-node-readiness-report.md` as the template.

---

## 3. Files Changed This Sprint

| File | Change |
|---|---|
| `config.json` | Removed empty `apiKeys` block — keys go in `config.secrets.json` |
| `server/server.py` | Fixed `BrokenPipeError` / `ConnectionResetError` in `_send()` |
| `docs/secrets-template.json` | New — API key schema (values always empty, never committed) |
| `.gitignore` | New — blocks `config.secrets.json`, logs, and test exports |
| `docs/single-node-readiness-report.md` | New — pre-test fill-in-the-blank readiness template |
| `docs/aegisnet-integration-note.md` | New — merge contract and interface documentation |
| `docs/pi-image-prep.md` | Existing — first-boot checklist and rollback process |

---

## 4. Task Checklist Status

### Package verification
- [x] All 28 expected files present (28/28)
- [x] config.json exists and is generated safely
- [x] Secrets NOT in config.json (apiKeys block removed)
- [x] .gitignore created blocking secrets files
- [x] docs/secrets-template.json created (empty values, labeled clearly)

### Syntax checks
- [x] `bash -n deploy/install.sh` — PASS
- [x] All 18 JS files (including sw.js) — PASS
- [x] server/server.py — PASS
- [x] bridge/adsb_mesh_alert.py — PASS

### Endpoint tests (simulated)
- [x] `/` — 200
- [x] `/setup` — 200
- [x] `/sw.js` — 200
- [x] `/manifest.json` — 200
- [x] `/api/ping` — 200
- [x] `/api/ais/vessels` — 200
- [x] `/api/ais/local` — 200
- [x] `/api/health/disk` — 200
- [x] `/api/health/services` — 200
- [x] `/config.json` — 200 (no apiKeys in response)
- [x] `/js/node-identity.js` — 200
- [x] `/js/ais-hardware.js` — 200
- [x] `/js/test-mode.js` — 200
- [x] `/js/health-check.js` — 200
- [x] `/js/p4.2-pages.js` — 200
- [x] `/data/aircraft.json` — 404 (correct, no local receiver)
- [x] `POST /api/config/save` — secrets stripped before saving

### Real Pi install — PENDING
- [ ] Flash Raspberry Pi OS Lite
- [ ] Boot and SSH in
- [ ] Copy P4.2 package
- [ ] Run `sudo ./deploy/install.sh`
- [ ] Verify installer output — OS check, disk check, internet, deps, node ID, systemd
- [ ] Open `http://[PI_IP]:8080` from another device
- [ ] Complete setup wizard

### Hardware — PENDING
- [ ] Meshtastic node detected on USB
- [ ] RTL-SDR detected (readsb)
- [ ] AIS SDR optional path tested

### NJ–AZ test readiness — FUNCTIONAL, PENDING HARDWARE
- [x] Test panel renders
- [x] Node A/B name inputs work
- [x] Start test button functional
- [x] Ping table updates
- [x] Latency recorded
- [x] Delivery status tracked
- [x] Export JSON works
- [x] Export CSV works
- [x] Export plain text report works
- [x] Exports do not contain secrets
- [ ] Second node online for full validation — PENDING

### PWA
- [x] manifest.json present and valid JSON
- [x] sw.js present and syntax-valid
- [x] Service worker registration code in p4.2-pages.js
- [x] Cache-first static, network-first data strategy
- [x] Offline fallback to app shell
- [x] Mobile bottom nav under 480px
- [x] Notification prompt dismissable, delayed 8 seconds
- [ ] Install-as-PWA confirmed on real device — PENDING

### Support bundle safety
- [x] `HealthCheck.exportBundle()` explicitly deletes apiKeys, adminPassword, password, token, sharedSecret
- [x] Location excluded by default (opt-in only)
- [x] Bundle includes nodeId, healthResults, adapterStatuses, aisDiagnostics
- [x] `_excluded` field in bundle lists what was removed

### AegisNet merge prerequisites
- [x] Integration note created (docs/aegisnet-integration-note.md)
- [x] All globals documented
- [x] Merge file list documented
- [x] What stays separate documented
- [ ] One real Pi node confirmed running — PENDING
- [ ] NJ–AZ test run — PENDING

---

## 5. Endpoint Results

All tested in simulated environment (Python HTTP server on localhost:8080).

| Endpoint | Expected | Result | Notes |
|---|---|---|---|
| GET / | 200 HTML | ✓ PASS | |
| GET /setup | 200 HTML | ✓ PASS | |
| GET /sw.js | 200 JS | ✓ PASS | |
| GET /manifest.json | 200 JSON | ✓ PASS | |
| GET /api/ping | 200 `{"ok":true}` | ✓ PASS | |
| GET /api/ais/vessels | 200 placeholder | ✓ PASS | |
| GET /api/ais/local | 200 placeholder | ✓ PASS | |
| GET /api/health/disk | 200 freeMB | ✓ PASS | |
| GET /api/health/services | 200 status dict | ✓ PASS | |
| GET /config.json | 200 no secrets | ✓ PASS | apiKeys absent |
| GET /js/node-identity.js | 200 | ✓ PASS | |
| GET /js/ais-hardware.js | 200 | ✓ PASS | |
| GET /js/test-mode.js | 200 | ✓ PASS | |
| GET /js/health-check.js | 200 | ✓ PASS | |
| GET /js/p4.2-pages.js | 200 | ✓ PASS | |
| GET /data/aircraft.json | 404 | ✓ PASS | Correct — no local receiver |
| POST /api/config/save | 200, secrets stripped | ✓ PASS | |

**Total: 17/17 PASS**

---

## 6. Health Check Results (simulated)

The health check runs in the browser. In the simulated environment, the following checks will pass when the dashboard loads:

| Check | Simulated result | Real Pi result |
|---|---|---|
| App loaded | ✓ | Pending |
| Node ID present | ✓ `aegis-demo0042` | Pending |
| CommsRouter loaded | ✓ | Pending |
| TrackingRouter loaded | ✓ | Pending |
| MQTT module loaded | ✓ | Pending |
| Best route available | ✓ Internet/Local | Pending |
| Dashboard server responding | ✓ | Pending |
| Config file readable | ✓ | Pending |
| Service worker supported | ✓ (where browser supports) | Pending |
| Time appears sane | ✓ | Pending |
| Disk space | ✓ (build env) | Pending |
| Systemd services | Endpoint exists | Pending (requires Pi) |

---

## 7. Hardware Detection Results

| Hardware | Status |
|---|---|
| RTL-SDR (ADS-B) | Not tested — requires real Pi with dongle |
| readsb | Not installed in build environment (expected) |
| Meshtastic node | Not tested — requires USB connection to Pi |
| AIS SDR | Not tested — optional hardware |
| rtl-ais | Not installed (expected — optional) |

The installer includes explicit `read -t 15` prompts for readsb and rtl-ais, both with timeout defaults of N (skip). Missing hardware produces clean diagnostic messages, not crashes.

---

## 8. Support Bundle Safety

| Check | Result |
|---|---|
| `apiKeys` removed before export | ✓ Confirmed in code |
| `adminPassword` removed | ✓ Confirmed in code |
| `password` key removed | ✓ Confirmed in code |
| `token` key removed | ✓ Confirmed in code |
| `sharedSecret` removed | ✓ Confirmed in code |
| `_excluded` field present | ✓ Lists all removed fields |
| Location excluded by default | ✓ User must click "+ LOCATION" |
| API key presence shown as boolean | ✓ `apiKeyPresent: true/false` only |

---

## 9. What Passed

- All 28 expected files present
- All 18 JS files syntax-valid (node --check)
- install.sh bash syntax valid (bash -n)
- server.py and adsb_mesh_alert.py Python syntax valid
- 17/17 server endpoints return expected responses
- Secrets removed from config.json
- POST /api/config/save strips secrets before writing
- .gitignore blocks secrets files
- NJ–AZ test panel functional (single-node mode ready)
- Support bundle export safe
- AegisNet integration note complete
- Single-node readiness report template created

---

## 10. What Failed

**None in automated checks.**

The `ConnectionResetError` in server.py (client disconnect race) was fixed during this sprint — `_send()` now catches `BrokenPipeError` and `ConnectionResetError` silently.

---

## 11. What Is Blocked

| Item | Blocked by | Resolution |
|---|---|---|
| Real Pi install test | No Pi hardware in build environment | Run `deploy/install.sh` on a real Pi |
| Meshtastic detection | No USB node in build environment | Connect T-Beam to Pi USB |
| ADS-B hardware test | No RTL-SDR in build environment | Connect V4 dongle + antenna |
| Full NJ–AZ test | Requires two nodes | Run second node at NJ end |
| PWA install confirmation | Requires real device | Open on phone, tap "Add to Home Screen" |
| Systemd service real test | Requires Pi OS | Check `systemctl status aegisnet-dashboard` |

---

## 12. NJ–AZ Test Readiness

**Single-node readiness: READY**  
The test panel is built, functional, and exports correctly. With one node, pings will queue or fail (expected). The test log will show adapter status, MQTT state, and export a shareable report.

**Full NJ–AZ test: PENDING HARDWARE**  
Both nodes must be online with MQTT bridge connected before the real latency and delivery test can run.

**Checklist before the real test:**
- [ ] Node 1 (NJ) running, dashboard accessible, MQTT connected
- [ ] Node 2 (AZ) running, dashboard accessible, MQTT connected
- [ ] Both nodes using the same MQTT broker and channel (LongFast, US region)
- [ ] Both nodes have run the health check
- [ ] Both nodes have exported a single-node readiness report
- [ ] Start test on Node 1, set Node B to AZ node name
- [ ] Confirm pings arrive on Node 2's chat page
- [ ] Export text report from both nodes and compare latency numbers

---

## 13. Recommended Next Task

**Immediate:** Get one real Pi running.

```bash
# On the Pi:
scp -r ./skymesh-scout-p4.2 pi@aegisnet-node.local:/home/pi/
ssh pi@aegisnet-node.local
cd /home/pi/skymesh-scout-p4.2
chmod +x deploy/install.sh
sudo ./deploy/install.sh
```

Then open `http://[PI_IP]:8080/setup`, complete the wizard, plug in the Meshtastic node, and enable Field Mode + MQTT Bridge.

**After one Pi is confirmed running:** Run the NJ–AZ test.  
**After NJ–AZ test is complete:** Merge P4 into AegisNet (see `docs/aegisnet-integration-note.md`).  
**After merge:** Build the projector sky view.

---

*This report does not contain API keys, passwords, tokens, or shared secrets.*  
*AegisNet Prototype 4.2 — Not emergency-certified. Not production-secure.*  
*Does not use CAP, police, fire, EMS, aviation, or public safety radios.*
