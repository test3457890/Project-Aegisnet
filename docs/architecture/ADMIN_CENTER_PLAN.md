# Admin Center Plan

The Admin Center (`/app/admin`) gives organization owners, Network admins, IT/security staff, and
physical-server operators tools to understand activity, control permissions, view audit logs, diagnose
problems, and file support tickets — **without** exposing private message content.

AegisNet remains civilian-first. The Admin Center is an optional area; normal users never need it.

## What exists now (local prototype)

A self-contained admin store (`src/app/state/adminState.ts` + `AdminStateProvider.tsx`) persisted in
localStorage, plus the Admin Center UI (`src/app/screens/AdminCenterScreen.tsx` and
`src/app/components/admin/*`). Sections:

1. **Overview** — org name, deployment mode, active Networks/rooms/members, open tickets, recent admin
   actions, system-health summary, warnings/alerts.
2. **Networks** — per-Network member/room counts, privacy posture, owner vs. member, settings shortcut.
3. **Members** — member table with role, status, prototype trusted-device column, and a mock suspend
   action (records an audit event; does not delete real accounts).
4. **Roles & Permissions** — role list, per-role permission toggles grouped by area, a totals matrix, and
   reset. See `PERMISSIONS_AND_RBAC_PLAN.md`.
5. **Audit Logs** — Discord-style metadata-only event log with filters, search, details drawer, JSON/CSV
   export. See `AUDIT_LOGGING_PLAN.md`.
6. **Server Operations** — service status, infrastructure health, error categories, recent logs, and a
   sanitized diagnostics bundle. See `PHYSICAL_SERVER_OPERATIONS_PLAN.md`.
7. **Support Tickets** — local ticket creation, history, and a sanitized support bundle export. See
   `SUPPORT_TICKET_WORKFLOW.md`.
8. **Policy Settings** — default Network privacy, File Vault policy, screenshot/privacy policy, guest
   policy, retention, logging policy, and support-data-sharing policy. Changes record audit events.

## What is local prototype only

- All admin state is local (localStorage); it is not multi-user or server-backed.
- Role/permission toggles update local role definitions and log audit events, but are **not globally
  enforced** across the app yet (see RBAC plan for the enforced vs. UI-only split).
- "Suspend member", "delete Network/room", and server "restart/backups/TLS/update" are mock or planned.
- There is no production authentication gating who can open the Admin Center.

## What requires backend

- Shared, multi-user audit logs and tickets (routes are planned — see below).
- Real server health/metrics (CPU, memory, DB size, uptime, ports, TLS).
- Persisting roles/permissions and enforcing them server-side.

## What requires production auth

- Restricting the Admin Center to verified admins; binding actions to authenticated identities;
  protecting audit-log integrity. None of this exists yet and must not be claimed.

## What requires enterprise/on-prem deployment

- Physical-server operator tooling against a real deployment, sovereign/region routing, compliance packs,
  and real support routing to Stuff Studios LLC.

## What must never expose private content

Admins see **operational metadata only**. The Admin Center must never display or log: private direct or
group message bodies, decrypted file contents, passwords, tokens, API keys, or encryption keys. This is
enforced structurally — audit events and diagnostics carry only metadata fields (see AUDIT/RBAC plans and
unit tests in `adminState.test.ts`).

## Planned backend routes (not implemented yet)

`GET /admin/overview`, `GET/POST /admin/audit-logs`, `GET/POST/PATCH /admin/roles`,
`GET /admin/permissions`, `GET /admin/server-health`, `GET /admin/diagnostics`,
`GET/POST /support/tickets`, `GET /support/tickets/:id`, `POST /support/export-diagnostics`.
Implement local prototype first; do not block the UI on these.

## How Stuff Studios LLC support should work later
See `SUPPORT_TICKET_WORKFLOW.md`. Until a real endpoint/email relay/customer portal exists, tickets are
saved locally and clearly marked "not submitted externally in this prototype."
