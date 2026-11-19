# Physical Server Operations Plan

Tools for businesses, schools, nonprofits, and government organizations running AegisNet on their own
physical server / on-premise deployment. Lives in Admin Center → Server Operations.

In infrastructure/admin contexts the word "server" is appropriate (physical servers, backend services,
databases, ports, logs, operators). It must still never appear in normal user-facing chat UI.

## What exists now (local prototype)

`src/app/components/admin/AdminServerOps.tsx`:

1. **Service Status** — frontend, backend API, WebSocket/realtime, database (SQLite), uploads/storage,
   File Vault, scheduler/jobs (planned), launcher. Backend/WebSocket/DB reflect the live
   `isBackendConnected` state (connected vs. local fallback).
2. **Infrastructure Health** — browser storage used/quota (`navigator.storage.estimate`), port status when
   the backend is connected; CPU, memory, DB size, backups, TLS, uptime are shown as **planned / server
   metric N/A in a frontend-only context**.
3. **Error Categories** — frontend, backend, database, WebSocket, upload/file, File Vault, permission,
   authentication (planned), storage quota, connectivity, call device, browser permission,
   launcher/startup, dependency/install, and update/repair (planned). Counts are derived from audit
   warnings where available; otherwise shown as "OK" or "Planned" so operators can tell what is monitored.
4. **Logs** — recent warnings and recent admin actions (from the metadata-only audit log).
5. **Diagnostics** — run a local health check (probes `/health`), check storage quota, **copy** diagnostics,
   and **export** a sanitized diagnostics bundle.

## Diagnostics are sanitized by construction

`buildDiagnosticsBundle()` emits only: timestamp, deployment type, org name, environment (user agent,
online), service statuses, counts (Networks/rooms/users/vault files/tickets/audit events), storage usage,
and recent warning summaries. It contains **no** message content, file content, tokens, keys, or
passwords, and carries an explicit note saying so. A unit test enforces this.

## What is local prototype only
- Real OS/hardware metrics (CPU, memory, disk, DB size, uptime, ports, TLS) are not available from the
  browser and are shown as planned.
- "Restart service", "configure backups", "configure TLS", and "configure update channel" are planned
  operator actions, not implemented.

## What requires backend / on-prem deployment
- A real server agent exposing health/metrics (`GET /admin/server-health`, `GET /admin/diagnostics`).
- Service control (restart, backups, TLS, updates) behind authenticated operator permissions.
- Real uptime, certificate, and port monitoring.

## What requires production auth
Restricting Server Operations to the Physical Server Operator role and binding operator actions to a
verified identity. Currently the role exists in the RBAC prototype but is not enforced.

## Privacy
Operators see sanitized logs and metadata only — never message content or secrets. Sanitization happens
before anything is shown, copied, or exported.
