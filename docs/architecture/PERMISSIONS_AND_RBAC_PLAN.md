# Permissions & RBAC Plan

A role-based access control (RBAC) prototype for organizations and Networks. Follows the AMI lesson on
least privilege (separate roles, narrow defaults).

## What exists now (local prototype)

In `src/app/state/adminState.ts` + Admin Center → Roles & Permissions:

- **Roles:** Organization Owner, Organization Admin, Network Owner, Network Admin, Room Moderator, File
  Vault Manager, Security Auditor, Support Operator, Physical Server Operator, Compliance Officer, Member,
  Guest, Read Only.
- **Permission catalog** grouped by area: Network, Room, File Vault, Privacy & Safety, Admin & Logs, and
  Physical Server Operator permissions (matching the task's lists; planned server actions are labelled
  "(planned)").
- **Default permission matrix** with least-privilege defaults (Owner = all; Read Only = view-only; Member
  = send/upload/own-privacy; Guest = minimal; etc.).
- UI: select a role, see and toggle its permissions grouped by area, preview the enabled count, view a
  totals matrix across roles, and reset to defaults.
- Every permission toggle and reset records a `permission.changed` audit event.

## Enforced vs. UI-only (important honesty boundary)

- **Enforced today:** nothing globally. The toggles edit local role *definitions* and produce audit
  events. They do **not** yet gate real app actions. This is deliberate so the prototype cannot lock a
  user out of their own app.
- **Already enforced elsewhere (independent of this matrix):** Network owner-only management in existing
  flows, and privacy-mode behaviors (Shield/Lockdown). Those predate this RBAC store.
- The matrix is the design/source-of-truth for *future* enforcement.

## What is local prototype only
- Role assignment to specific users is represented at the role-definition level; per-user assignment and
  enforcement are future work.
- "Delete Network/room" and server actions remain mock/planned.

## What requires backend
- Persisting roles/permissions server-side and **enforcing** them on every privileged route
  (`GET/POST/PATCH /admin/roles`, `GET /admin/permissions`).
- Per-user role assignment within an organization and per-Network scope.

## What requires production auth
- Authenticated identities to bind roles to, and protection so non-admins cannot change the matrix.
- Admin-approval flows for sensitive grants; auth loops must be avoided (AMI lesson #16).

## Privacy
RBAC governs *operational* capabilities only. No role grants visibility into private message bodies,
decrypted files, or secrets; "view audit logs" exposes metadata only.

## Rollout guidance
Introduce enforcement gradually and safely: start with clearly safe gates (e.g., who can open Server
Operations or export logs), keep the current user from self-lockout, and document each newly enforced
permission as it moves from UI-only to enforced.
