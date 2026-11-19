# Support Ticket Workflow (to Stuff Studios LLC)

Lets admins, IT/security staff, and physical-server operators file support requests. In this prototype
tickets are **saved locally and never transmitted**; the UI says so plainly.

## What exists now (local prototype)

`src/app/components/admin/AdminSupport.tsx` + the admin store:

- A create-ticket form with all fields: organization (from org info), contact name, contact email,
  deployment type (cloud / local-prototype / physical-server), affected Network/Room, issue category,
  severity, short summary, detailed description, steps to reproduce, include-sanitized-logs, and
  attach-sanitized-diagnostics.
- On submit: the ticket is saved locally with `status: "saved-local"` and a notice:
  **"Saved locally. External submission to Stuff Studios LLC is not configured in this prototype."**
- Local ticket history, each row marked "Saved locally — not submitted externally".
- A sanitized **support bundle** export (counts/status/environment only) and an audit event for the export.
- Ticket creation records a `support.ticket_created` audit event (metadata only).

## Fields & enums

- **Issue categories:** login/account, permissions, message sending, file upload, File Vault, video call,
  microphone/camera, WebSocket/realtime, database, storage, physical server, launcher/startup, privacy
  mode, general bug, feature request.
- **Severity:** Low, Medium, High, Critical.
- **Deployment type:** cloud, local-prototype, on-premise.

## Honesty rules (must hold)

- If no real endpoint exists (current state): do **not** pretend the ticket was sent. Save locally and
  show the "not submitted externally" message.
- Add the future task for a real Stuff Studios LLC endpoint, email relay, or customer portal.

## When a real endpoint is added later

- Sanitize logs before sending; **never** send secrets, message bodies (by default), or decrypted files.
- Ask the admin before attaching diagnostics (honor the support-data-sharing policy).
- Show the admin exactly what data is being sent before sending.
- Bind submissions to an authenticated org/admin once production auth exists.

## What requires backend
`POST /support/tickets`, `GET /support/tickets`, `GET /support/tickets/:id`,
`POST /support/export-diagnostics`, plus an email relay or customer portal at Stuff Studios LLC.

## What requires production auth
Verifying the submitting organization/admin and protecting ticket/contact data in transit and at rest.
