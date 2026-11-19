# Audit Logging Plan

Discord-style admin audit logging for AegisNet, using AegisNet wording. The defining rule:
**audit logs are metadata only and must never expose private content or secrets.**

## What exists now (local prototype)

- An `AuditEvent` model and an action catalog (`AUDIT_ACTIONS`) in `src/app/state/adminState.ts`.
- A local, persisted audit log in `AdminStateProvider` with a `logAudit(action, details)` API.
- Admin Center → Audit Logs UI: filter (category, severity, actor, Network, date), search, time-grouped
  list, severity badges, a details drawer, and JSON/CSV export.
- Seeded representative events across every category so the log is not empty.
- Actions that currently emit real events: permission toggles, policy changes, support ticket creation,
  support bundle export, and mock member suspend / Network-settings open.

## Event shape (metadata only)

Every event has exactly: `id`, `at`, `actorId`, `action`, `category`, `severity`, `target`, `networkId`,
`summary`. There is **no** field for message bodies, file contents, or secrets. A unit test asserts the
event keys never expand beyond this allowed set.

## Categories & severities

- Categories: `network`, `room`, `category`, `member`, `permission`, `file`, `privacy`, `call`, `device`,
  `support`, `system`.
- Severities: `info`, `notice`, `warning`, `critical`.
- The catalog covers all requested events: Network/Room/Category created/updated/reordered/deleted,
  Member invited/joined/removed/role-changed, Permission changed, File uploaded/deleted/policy-changed/
  download-restricted, Privacy mode/Shield/Lockdown/Disappearing changes, Call started/ended, Device
  permission changed, Support ticket created / bundle exported, and system events (backend health
  warning, storage warning, failed upload, failed message, WebSocket disconnect/reconnect).

## Hard rules

- **Never** log: private message bodies, decrypted file contents, passwords, tokens, API keys, encryption
  keys. Log metadata only (names, ids, counts, statuses).
- Respect the **logging policy** (Policy Settings). When logging is OFF, no new events are recorded and the
  UI says so.
- Audit log is capped (most-recent 500 in the prototype) to bound local storage.

## What is local prototype only

- The log lives in localStorage on one browser profile; it is not tamper-evident or multi-user.
- Most app-wide actions (every Network/room/file/call event) are **seeded/representative**, not yet wired
  to auto-log from every call site. Admin-area actions log for real.

## What requires backend

- Centralized, append-only, tamper-evident audit storage (`GET/POST /admin/audit-logs`).
- Server-side wiring so every privileged action auto-emits an event from one authoritative place.
- Cryptographically chained / forensic-grade logging (concept "Aegis Vault for Compliance") — future,
  must still exclude content.

## What requires production auth
Binding `actorId` to a verified identity and protecting log integrity from non-admins.

## Future: Stuff Studios LLC / compliance
Exported logs (JSON/CSV) can support compliance review. Any future export to a vendor must remain
metadata-only and be shown to the admin before sending.
