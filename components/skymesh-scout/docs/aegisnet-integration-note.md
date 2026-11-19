# AegisNet Integration Note

**P4.2 Expansion Layer → Main AegisNet Codebase**  
**Status:** Pre-merge documentation. Do not merge until one Pi node passes bring-up.

---

## Summary

The P4 / P4.2 expansion layer was built as a modular append-only system.  
No existing AegisNet files are replaced or renamed.  
Merge = copy files + add script tags + add one page slot.

---

## Files to copy into AegisNet

### New JS modules (append to AegisNet script load order)

```
js/comms-adapters.js      ← CommsAdapter base + 7 adapter implementations
js/comms-router.js        ← CommsRouter, MessageQueueService, DeliveryStatusService,
                             NetworkHealthMonitor, MediaTransferService
js/tracking-adapters.js   ← TrackingAdapter base + 4 adapter implementations
js/tracking-router.js     ← TrackingRouter (aggregates all tracking adapters)
js/webrtc.js              ← WebRTCVoiceVideoService, PushToTalkVoiceService (placeholder)
js/p4-pages.js            ← Mission Comms Dashboard page, upgraded Chat page
js/p4-app.js              ← P4 bootstrap (runs after existing app.js)
js/node-identity.js       ← NODE_IDENTITY, NodeRegistryAdapter placeholder
js/ais-hardware.js        ← AISManager (4 source modes, rate limiting, diagnostics)
js/test-mode.js           ← TestMode (NJ–AZ bridge test, export)
js/health-check.js        ← HealthCheck, exportBundle (strips secrets)
js/p4.2-pages.js          ← Node Status Card, AIS diagnostics, test panel, PWA, mobile nav
```

### New server files

```
server/server.py          ← Extended with /api/ping, /setup, /sw.js, /manifest.json,
                             /api/ais/*, /api/health/*, POST /api/config/save
bridge/adsb_mesh_alert.py ← Unchanged from P3
bridge/ais_bridge.py      ← Placeholder (to be built when AIS hardware confirmed)
```

### New dashboard files

```
dashboard/setup-wizard.html  ← First-run node configuration wizard
dashboard/manifest.json      ← PWA manifest
dashboard/sw.js              ← Service worker (cache-first static, network-first data)
dashboard/css/main.css       ← Extended with P3/P4/P4.2 additions
```

### New docs / deploy

```
deploy/install.sh                      ← Pi one-command installer
docs/pi-image-prep.md                  ← Pi image preparation guide
docs/projector-planning.md             ← Future projector mode plan
docs/single-node-readiness-report.md   ← Pre-test readiness template
docs/secrets-template.json             ← API key schema (values always empty)
.gitignore                             ← Blocks config.secrets.json and logs
```

---

## HTML changes needed in AegisNet

### 1. Add to `<head>`

```html
<link rel="manifest" href="/manifest.json">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0A0E13">
```

### 2. Add one new page slot

```html
<div id="pg-comms" class="page"></div>
```

### 3. Add one nav button

```html
<button class="navbtn" data-page="comms" title="Comms Dashboard">
  <!-- waveform icon SVG -->
  <span>COMMS</span>
</button>
```

### 4. Add new script tags (after existing scripts)

```html
<!-- P4 expansion layer -->
<script src="js/comms-adapters.js"></script>
<script src="js/comms-router.js"></script>
<script src="js/tracking-adapters.js"></script>
<script src="js/tracking-router.js"></script>
<script src="js/webrtc.js"></script>
<script src="js/p4-pages.js"></script>
<script src="js/p4-app.js"></script>
<!-- P4.2 expansion layer -->
<script src="js/node-identity.js"></script>
<script src="js/ais-hardware.js"></script>
<script src="js/test-mode.js"></script>
<script src="js/health-check.js"></script>
<script src="js/p4.2-pages.js"></script>
```

---

## Global interfaces exposed (window.*)

These globals are the merge contract. AegisNet should consume them through
these interfaces rather than calling internal module functions directly.

| Global | What it is |
|---|---|
| `window.CommsRouter` | Route selection, fallback, queue, delivery |
| `window.CommsAdapters` | All adapter classes (for extension) |
| `window.TrackingRouter` | Entity aggregation, filters |
| `window.TrackingAdapters` | All tracking adapter classes |
| `window.WebRTCService` | Voice/video/data channel calls |
| `window.PTTService` | PTT placeholder (always disabled) |
| `window.NODE_IDENTITY` | Node ID, status, hardware profile |
| `window.NodeRegistryAdapter` | Cloud registration placeholder |
| `window.AISManager` | AIS source control and diagnostics |
| `window.TestMode` | NJ–AZ test, export |
| `window.HealthCheck` | Health check, support bundle |
| `window.MESH_STATE` | Shared Meshtastic state bus |
| `window.MQTT` | Mesh send, channel, connect/disconnect |
| `window.SOURCES` | Aircraft/ship/train data aggregation |
| `window.INCIDENT` | Incident log, export |
| `window.ALERT_PROFILES` | Named alert presets |

---

## What stays separate (node software, not AegisNet core)

| Component | Why separate |
|---|---|
| `server/server.py` | Pi-specific HTTP server. AegisNet may have its own backend. |
| `bridge/adsb_mesh_alert.py` | Pi-specific Python bridge. Not a browser concern. |
| `deploy/install.sh` | Pi-specific. AegisNet deployment may differ. |
| `dashboard/setup-wizard.html` | Node-specific first-run. AegisNet has its own onboarding. |
| `config.json` | Node-specific. AegisNet has its own config system. |

---

## What AegisNet should consume through adapters (not copy directly)

| Concern | Adapter to use |
|---|---|
| Sending messages | `CommsRouter.send()` |
| Route selection | `CommsRouter.bestAdapter()` |
| Message delivery status | `CommsRouter.delivery` |
| Aircraft data | `TrackingRouter.getEntities('aircraft')` |
| Vessel data | `TrackingRouter.getEntities('vessel')` |
| Team node data | `TrackingRouter.getEntities('team')` |
| Mesh text send | `MQTT.sendText()` or `CommsRouter.send()` |
| Node identity | `NODE_IDENTITY.get()` |
| Health check | `HealthCheck.run()` |
| Support bundle | `HealthCheck.exportBundle()` |

---

## Merge prerequisites (do not merge until these are true)

- [ ] One Pi node installs and runs dashboard successfully
- [ ] Health check passes on real hardware
- [ ] Support bundle exports safely (no secrets)
- [ ] NJ–AZ test panel is confirmed functional
- [ ] AegisNet team has reviewed this integration note
- [ ] Feature flags reviewed: `features.aegisnet` must be `false` until ready

---

## Safety notes for merge

- `AegisRadioFallbackAdapter` stays in simulator mode (`_mode = "simulator"`) until
  hardware, legal review, and org approval are confirmed. Never auto-enable hardware mode.
- `PTTService.available` is always `false`. Do not change this without legal and hardware review.
- `SatelliteAdapter` stays offline. Placeholder only.
- API keys stay in `config.secrets.json` (server-side only). Never in frontend config.
- `HealthCheck.exportBundle()` explicitly deletes any key/password/token fields.
  Verify this is still true after any merge refactor.

---

*AegisNet Prototype 4.2 — Not emergency-certified. Not production-secure.*  
*This document does not contain API keys, passwords, tokens, or shared secrets.*
