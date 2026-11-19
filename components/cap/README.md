# CAP-inspired field coordination demo

The Mission Board is a standalone simulation for a fictional ground-team exercise. See [the local setup guide](../../docs/Getting-Started.md#cap-inspired-mission-board) and [the screenshot gallery](../../docs/Screenshots.md#cap-inspired-mission-board).

The companion modules demonstrate tasking, team check-ins, position provenance, basic access controls, and an audit log. CACTUS and TAK formats, Meshtastic transports, and the room bridge are experimental integration code. This import verified the local browser demo and JavaScript test suites. Live hardware, data exchange, and operational integrations remain unverified. The project makes no claim of CAP approval or safety certification.

## Modules

Built in this package (drop into `dashboard/js/` alongside the AegisNet core):

| File | Purpose |
|------|---------|
| `meshtastic-adapter.js` | Working LoRa transport. Protobuf codec, stream framing, serial/HTTP/BLE. Provides `MESH_STATE`, a `mesh-lora` CommsRouter adapter. |
| `cap-audit-log.js` | Tamper-evident audit sink. Redacts secrets and non-consenting positions. JSON/CSV/after-action export. |
| `cap-access-control.js` | Org keys, RBAC, node allow-list, deployment tiers, US-origin hardware allow-list. |
| `cap-positioning.js` | GPS primary plus GPS-denied fallback (stale, dead reckoning, mesh RSSI, manual). US-GNSS lock. |
| `cap-coordination.js` | Check-ins, tasking, acks, position sharing, team status. |
| `cap-integrations.js` | CACTUS export, TAK/ATAK Cursor-on-Target, radio channel reference. |
| `cap-room-bridge.js` | Bridges a CAP mission into the AegisNet mission room. |
| `cap-mission-profile.js` | Activation gate (hard disclaimer requirement) and mission context. |
| `cap-compliance.js` | Maps the program to FIPS 200 / NIST control families. Readiness self-check. |
| `cap-mission-board.js` | Projectable command-post display. Every position shows its provenance. |

Reused from the existing AegisNet core (not in this package): `comms-adapters.js`,
`comms-router.js`, `mqtt.js`, `node-identity.js`, `health-check.js`,
`safety-education.js`, `network-settings.js`.

---

## Load order

```
1. AegisNet core (comms-router, node-identity, mqtt, health-check, safety, network-settings)
2. meshtastic-adapter.js     (provides MESH_STATE)
3. cap-audit-log.js          (the sink everything writes to; load early)
4. cap-access-control.js
5. cap-positioning.js
6. cap-coordination.js
7. cap-integrations.js
8. cap-room-bridge.js
9. cap-mission-profile.js
10. cap-compliance.js
11. cap-mission-board.js
```

---

## Globals: what each module provides and reads

| Global | Provided by | Key methods |
|--------|-------------|-------------|
| `MESH_STATE` | meshtastic-adapter (or AegisNet core) | `connected`, `nodes`, `onMessage(cb)` |
| `MeshtasticAdapter` | meshtastic-adapter | `connect(opts)`, `sendText()`, `commsAdapter`, `register()` |
| `CAPAudit` | cap-audit-log | `log()`, `exportJSON/CSV/Report()`, `verifyChain()` |
| `CAPAccess` | cap-access-control | `validateOrgKey()`, `getTier()`, `getRole()`, `registerNode()` |
| `CAPPositioning` | cap-positioning | `start()`, `getBest()`, `enableSharing()`, `ingestGnssDetailed()` |
| `CAPCoordination` | cap-coordination | `checkin()`, `shareTasking()`, `acknowledge()`, `getTeamStatus()`, `on()` |
| `CAPIntegrations` | cap-integrations | `cactus.*`, `tak.*`, `radio.*` |
| `CAPRoomBridge` | cap-room-bridge | `join()`, `leave()`, `members()`, `status()` |
| `CAPMission` | cap-mission-profile | `activateProfile()`, `getMission()`, `endMission()` |
| `CAPCompliance` | cap-compliance | `getPostureReport()`, `getControlMap()`, `exportReport()` |
| `CAPBoard` | cap-mission-board | `render(target)`, `fullscreen()`, `refresh()` |

Read from the AegisNet core: `CommsRouter`, `MQTT`, `NODE_IDENTITY`,
`HealthCheck`, `SafetySettings`, `NetworkSettings`.

---

## Quick start

```html
<!-- after the AegisNet core scripts -->
<script src="js/meshtastic-adapter.js"></script>
<script src="js/cap-audit-log.js"></script>
<script src="js/cap-access-control.js"></script>
<script src="js/cap-positioning.js"></script>
<script src="js/cap-coordination.js"></script>
<script src="js/cap-integrations.js"></script>
<script src="js/cap-room-bridge.js"></script>
<script src="js/cap-mission-profile.js"></script>
<script src="js/cap-compliance.js"></script>
<script src="js/cap-mission-board.js"></script>
```

```js
// 1) Connect the LoRa radio (USB serial example). US915 region must be set on the device.
await MeshtasticAdapter.connect({ transport: 'serial' });
MeshtasticAdapter.register(); // hook into CommsRouter if present

// 2) Authorize the deployment (Tier 1 training example)
CAPAccess.configureSecret(operatorSecret);       // server-side in real use
CAPAccess.setRole('coordinator');
CAPAccess.validateOrgKey(orgKey);                 // issued by the operator
CAPAccess.setDeploymentMode('standard');

// 3) Activate the mission (this joins the AegisNet room via the bridge)
CAPMission.activateProfile({
  missionId: 'COMEX-2026-03', missionName: 'Spring Ground Team Exercise',
  teamRole: 'Ground Team', callsignLabel: 'GT-1', meshChannel: 'cap-spring',
  adsbAwareness: true, disclaimerAccepted: true, confirmTrainingPrototype: true
});

// 4) Positioning + sharing (opt-in)
CAPPositioning.start({ gnss: true, deadReckoning: true });
CAPPositioning.enableSharing();

// 5) Project the board
CAPBoard.render('app');
```

---

## Meshtastic setup

- **Serial (recommended for a base laptop):** plug the node in by USB, call
  `MeshtasticAdapter.connect({ transport: 'serial' })`. Uses Web Serial.
- **HTTP / IP:** `connect({ transport: 'http', url: 'http://<device-ip>' })`.
- **BLE:** scaffold only. The Meshtastic service UUID is included; confirm the
  ToRadio/FromRadio characteristic UUIDs against your firmware before using it.
- **Region:** the device must be configured to **US915**. The adapter does not
  and cannot change the radio's region or frequency.

The protobuf codec implements the text and position subset using field numbers
from the official `meshtastic/protobufs` schema. It is round-trip tested against
itself; validate against a real device before operational use.

---

## Two external interfaces to confirm

These were built to an expected interface and should be confirmed against the
real systems. Both degrade gracefully if the names differ.

1. **AegisNet mission room** (`window.AegisRoom`): the bridge expects
   `join(roomId, opts)`, `leave(roomId)`, `send(roomId, env)`, `members(roomId)`,
   `setPresence(roomId, p)`. If absent, the bridge falls back to the MQTT channel
   or CommsRouter. Confirm the real method names and adjust `cap-room-bridge.js`.
2. **AZ Wing CACTUS import**: `cap-integrations.js` produces a CACTUS-aligned
   export, but the field mapping is **not confirmed** against AZ Wing's real
   import spec. Live push is disabled until an authorized endpoint and the
   confirmed mapping exist. Confirm the field map, then enable.

---

## Testing

Every module has a Node test suite (no browser, no external dependencies):

```
cd tests
for t in test-*.js; do node "$t"; done
```

All suites pass: positioning, coordination, integrations, access control,
audit log, mission profile + room bridge, mission board logic, compliance,
and the Meshtastic codec (protobuf round-trip, framing, boundary).

---

## Compliance posture

`cap-compliance.js` maps the program to the 17 FIPS 200 control families and
reports a software-readiness percentage. See `docs/` for the full
**Compliance Readiness & Control Crosswalk** with a verified-references
appendix.

This is **readiness mapping, not certification**. FedRAMP (cloud), DoD SRG
(DoD data), FIPS 140-3 (crypto module validation), and ATO are external
accreditation processes. The program is built to align with the controls; it
does not and cannot self-certify. The honest path runs through CAP squadron
adoption first, then formal review, then accreditation if a government use case
warrants it.

---

## Honesty principles baked into the code

- Estimates are never shown as hard GPS fixes (positioning, board, CoT all label provenance).
- Position sharing is opt-in and off by default.
- The audit log redacts secrets and non-consenting coordinates, and is tamper-evident.
- Access-control tiers are deployment policy, not security clearance.
- The radio is Meshtastic 915 ISM only; CAP Guard and tactical channels are reference, never transmitted.
- Nothing claims a certification it has not earned.
