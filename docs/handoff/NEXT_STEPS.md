# Next Steps for AegisNet

## Completed (Sprint 11)
- Mission Operations Integrated: Added Asset Tracker, Shift Handoff, and Readiness Checklist.
- Playwright End-to-End Tests stabilized and layout issues resolved.

## Recommended Next Task
**Backend Persistence Sprint**
* Move the most important local-only user and Network management features toward backend-backed persistence using the existing `services/api` backend, `SyncQueue`, and API client patterns.
* Focus on Profiles, Moderation, Trust, Invites, Roles, and Join Approvals.
* Do not build production authentication, E2EE, or MFA.

## Immediate Backend Follow-Up
* Add database migration version tests and deterministic seed reset documentation.
* Do not add production authentication or stronger security claims until the product and threat model are approved.

## Backend Direction (Resolved June 8, 2026)
The product owner chose to continue expanding `services/api` as the standard internet/local MVP backend. The Rust/Go mesh daemon, native mobile migration, and hardware node work remain future options and are blocked until the normal backend MVP is stable.

## File and Media Follow-Up
* IndexedDB is now the explicit local prototype binary store.
* Current PDF and office thumbnails are locally generated type-aware cards; evaluate local page rendering only if the added parser size and privacy behavior are acceptable.
* The Vault now provides IndexedDB usage, browser quota estimates, and cleanup controls.
* Add optional API-local file download behavior without weakening the browser-local encrypted Vault boundary.
* Define retention and cleanup behavior for backend upload binaries and metadata.
* Add export/import only after the expected privacy and data-lifecycle behavior is documented.
* Hardcoded values limit `MessageTimeline` styling when privacy requirements expand or accessibility overrides are necessary. (Documented)
* Network Profiles support only `displayName` and `avatarColor` properties, without allowing fully customized user roles. (Documented)

## Chat Follow-Up
* Implement backend reaction sync via `/messages/:id/reactions` or similar REST endpoint.
* Plumb WebSocket events for live reaction sync.
* Support custom emojis and moderation/permissions around reactions if requested by product..

## Call Follow-Up
* Preferred local camera, microphone, and speaker IDs now persist with a safe startup fallback.
* Permission troubleshooting and a non-recording local microphone meter are now present.
* Keep remote calling out of scope until WebRTC signaling and backend work are approved.

## Test Follow-Up
* The approved GitHub Actions workflow now runs unit, browser, accessibility, build, and audit checks.
* Consider required branch checks only after the repository owner confirms the workflow policy.
* Add visual regression baselines only after theme and layout churn slows down.

## Future Security Work (DO NOT BUILD YET)
### Recently Completed
- [x] Sprint 4: Profile & Moderation
- [x] Sprint 5: Security Audit Pass
- [x] Sprint 6: Frontend Usability and Network Operations
  - Modularized `NetworkSettingsScreen` into distinct tabs.
  - Replaced user-facing "server/channel" terminology with "Network/Room".
  - Refactored `LocalMediaPanel` to a side-by-side collapsible sidebar for better usability without overlap.
  - Authored `BOTS_AND_INTEGRATIONS_PLAN.md` to set boundaries for mock bots.
- [x] Sprint 6: Security Boundary, Abuse Controls, and Threat Model Pass
  - Implemented SQL-backed access controls in backend routes (IDOR protection).
  - Hardened WebSocket handshake with connection-level auth token.
  - Added request rate limiting for public endpoints.
  - Implemented `.env.example` and production `NODE_ENV` configuration checks.
  - Cleaned up UI terminology (removed "server", "military-grade").
  - Fixed E2E test regressions from UI changes and accessibility contrast fixes.

### What's Next (Sprint 7 & Beyond)
- **Implement True E2EE Prototype:** 
  - Add ECDH / X25519 key agreement flows between clients.
  - Implement double-ratchet or similar session protocol over the WebSocket relay.
- **Production Persistence Layer:** 
  - Migrate test databases to a mock volume path or in-memory DB for pure unit testing to remove leftover `.db` files from the repo.
- Admin Center UI dashboard for AegisNet Guard. This follow-up task should add a panel showing:
  - AegisNet Guard mode
  - Blocked request count
  - Suspicious event count
  - Last blocked reason
  - Prototype-only warning (no private message content, no file contents, no Vault plaintext, no support ticket private content, no secrets).
- **Hardware Enclave/Key Storage:**
  - Prototype hardware-backed WebCrypto usage.

## Future Product Work (DO NOT BUILD YET)
* Payments
* AI or AMI feature adaptation
* Mesh or peer-to-peer networking (See `MESH_AND_P2P_PLAN.md` for architecture)
* Hardware node support (See `HARDWARE_NODE_PLAN.md` for architecture)
* Native mobile applications (See `NATIVE_MOBILE_PLAN.md` for architecture)

## Pre-existing Issues Discovered (Sprint 1, June 8, 2026)
These were found while establishing a real baseline. The handoff had claimed all tests/a11y passed; that was inaccurate.

* **(FIXED) Stale test helper** — `src/test/renderWithMockState.tsx` had drifted from the context and crashed component tests. Repaired.
* **(FIXED) `PrivateCallScreen` crash** — undefined `endCall` ReferenceError crashed the 1:1 call screen. Added the handler.
* **(FIXED) Network rooms crash** — `RoomsSidebar` used `<Settings>` without importing it; every Network room route fell to the error screen. Added the import.
* **(FIXED) Invalid default room id** — `room_family_chat` (nonexistent) was the default `selectedRoomId` and mobile Networks nav fallback, sending mobile users to a dead route. Corrected to `room_fam_chat`.
* **(FIXED, default theme only) Accessibility color-contrast** — the default Aegis Social Dark theme failed axe `color-contrast` (`--accent-readable`, `--text-muted` on `--surface-selected`, white on `--accent-primary`; 2.97–4.46). Fixed this sprint. **Still open:** the other 6 themes were not re-audited (the axe test only scans the default theme). A multi-theme contrast pass with design review is still recommended.

## Vault Encryption Hardening (future — do not overclaim; needs design + review)
Local at-rest Vault encryption (AES-GCM) is now built (see Completed). The following hardening steps are
required before this could be described as anything stronger than a local prototype:
* Protect the key with a user passphrase (PBKDF2/Argon2 key-wrapping) and/or a hardware-backed key store (TPM/Secure Enclave/StrongBox); make the working key non-extractable.
* Encrypt or minimize metadata and thumbnails (currently unencrypted).
* Per-workspace key hierarchy so one revoked key does not expose everything.
* Safe recovery (recovery codes / trusted-device or sharded backup) and key rotation / crypto agility.
* Extend at-rest encryption to chat attachments (currently Vault-only).
* Independent security review before any stronger claim.
See `docs/architecture/FILE_VAULT_SECURITY_PLAN.md`.

## Recommended Next Sprints (from the Sprint 1 recommendation report)
* **Sprint 3 — Network Organization, Roles & Honest Audit:** owner/admin/member role model (UI-enforced), Network About page + roster, Trust Ring labels (honest "self-declared/local"), Shared Space room type, and a metadata-only audit log that never stores message content.

## Follow-ups From Sprint 2 (Mission Rooms — not yet built)
* Surface presence + recent check-ins on the Home Dashboard for at-a-glance safety.
* Per-Network mission membership/roster (currently seeds from the example / current user).
* Task assignment to members; separate Decision log from the timeline; auto-expiring mission rooms.
* Optional backend sync of mission data once a shared multi-user model is decided.
* A real map and opt-in location sharing are future work, gated on privacy review (concept Phase 18).

## Follow-ups From Admin Center (not yet built)
* **Backend admin/audit/support/RBAC routes (planned):** `GET /admin/overview`, `GET/POST /admin/audit-logs`, `GET/POST/PATCH /admin/roles`, `GET /admin/permissions`, `GET /admin/server-health`, `GET /admin/diagnostics`, `GET/POST /support/tickets`, `GET /support/tickets/:id`, `POST /support/export-diagnostics`. Implement against `services/api`; keep audit logs metadata-only and tamper-evident; keep diagnostics sanitized.
* Auto-emit audit events from one authoritative place for every privileged action (network/room/file/call/privacy) instead of seeded representatives.
* Real Stuff Studios LLC support endpoint / email relay / customer portal. Until then keep "saved locally, not submitted externally." Sanitize before sending; show admins exactly what is sent; ask before attaching diagnostics.
* Gradually enforce RBAC (start with safe gates like opening Server Operations / exporting logs) without risking self-lockout; document each permission as it moves from UI-only to enforced.
* Gate the Admin Center behind production auth + verified admin identity once auth exists.
* Real physical-server metrics (CPU/memory/disk/DB size/uptime/ports/TLS) and operator actions (restart/backups/TLS/update) require an on-prem server agent.
* Add `/app/admin` to the axe scan after a contrast review of the admin UI.

## Follow-ups From Sprint 1 (not yet built)
* Watermark overlay for sensitive content (honest deterrent, see `SCREENSHOT_PROTECTION_NOTES.md`).

## Follow-ups: Discord-style workspace features (requested 2026-06-09; AegisNet wording — Network/Room/Category/Shared Space, never "server" in chat UI)
Buildable as local prototype (no backend/WebRTC needed):
* Message Reactions: Add emoji reactions to individual messages using local state.
* Message Grouping: Group consecutive messages from the same user to look cleaner.esolves a local invitation code into membership.
* Mobile emoji-picker popover layout (the picker is desktop-scoped in e2e until the narrow-viewport layout is polished).
* `/app/admin` contrast review, then add it to the axe scan.

Requires backend + product approval (do NOT fake; keep planned):
* Real multi-user voice/video channels, **screen sharing**, and "who is speaking" indicators (WebRTC + signaling).
* Real-time message sync and typing/read receipts across devices, **threads**, and custom/uploaded emoji.
* Multiple independent organizations/workspaces beyond Networks, and cross-org Shared Spaces (federation).

## Follow-ups From Sprint 7 (Profiles, Trust, Network Tools, QA — June 10, 2026; not yet built)
* Backend routes for trust labels, Activity posts, join approvals, invites (redeem/expiry/max-use enforcement), roles, bots, and custom emoji — everything in Sprint 7 is local-only by design until routes exist.
* Use custom Network emoji inside the message composer (uploads + safe-type handling exist; composer integration is the follow-up). Stickers remain planned.
* Future trust verification (documented only — DO NOT BUILD without security review): safety numbers, QR code verification, organization-issued verification, device approval, passkeys, hardware-backed device trust, admin verification logs.
* Activity media posts (image galleries) — text/status posts shipped; image posts deferred pending a privacy/size review of local image storage in Activity.
* Other members' Network nicknames (only the current user's per-Network nickname is modeled today).
* `api.error` QA events from the API client with request IDs (the event type and field exist; client wiring is the follow-up).
* Invite expiration / max-use enforcement (currently labels only) once invitations are backend-backed.
* Consider surfacing the join-approval Pending count as a badge on the Network Settings entry point.

## Priority 1: Real-time Multi-User Sync (Not Started)

## Blocked
* **Mesh daemon, hardware nodes, and native migration:** blocked by product direction until the standard internet/local backend MVP is stable. Keep the architecture documents; do not begin implementation.

## Completed
* **(June 10, 2026 — Sprint 7: Profiles, Trusted Contacts, Network Tools, QA Visibility, Privacy Preferences)** Fixed the app-wide member-profile-popover click bug (Radix `preventDefault` toggle). Built: metadata-only QA event log + Recent QA Events in `/app/qa`; local Trusted Contacts trust model (levels, reasons, notes, Mutual Networks, Trust Review modal with honest wording); profile Trust & connections section, Activity posts (local-only), avatar lightbox with Lockdown tap-to-reveal; clickable/keyboard-accessible Network Roster with search and Pending/Approved/Rejected join-approval views; functional privacy toggles (read receipts hide delivery state, safety reminders mute the dashboard panel, group invitations gate local invite redemption); real Network Settings tabs for Roles, Emoji & Stickers (SVG/HTML/executables blocked), Integrations & Bots (no execution), Safety Setup, and Invites (`aegisnet://invite/` links, revoke, bypass-approval warning); Network Profile overview facts; seeded Network owners/members; "Friend" → "Known contact"; terminology guard test. Verified: 92 unit, 23 e2e (+9 skips), clean build. All new features local-only and labeled; no security overclaims.
* **(June 9, 2026 — QA & Bug Bash Readiness Pack)** Created `BUG_BASH_CHECKLIST.md` and `BUG_REPORT_TEMPLATE.md`. Built a development-only `/app/qa` route displaying safe diagnostics (excluding message content, secrets, keys, and files). Added a double-confirmation "Wipe Local Data" feature that safely drops prototype `localStorage` and `IndexedDB` data. Wired `crypto.randomUUID()` middleware to the backend, appending `X-Request-ID` to all responses, error payloads, and `aegisGuard` logs. Added a "Copy Diagnostics" button to the frontend error boundary.
* **(June 9, 2026 — Sprint 4: Security Review & Export/Import Controls)** Documented data lifecycle behavior via `DATA_LIFECYCLE_PLAN.md`, officially qualifying the existing Export/Import feature. Removed the dev build marker. Implemented a screenshot deterrent Watermark Overlay toggleable via settings. Added backend download integration to the File Vault. Expanded Axe accessibility scans to cover `/app/admin`. Verification suites passed (60/60 unit, 26/26 e2e, clean build).
* **(June 9, 2026 — Verification & Build Refresh Pass)** Restarted frontend/backend dev servers to clear stale Vite caches that prevented UI updates from showing. Verified the wiring of `UserProfileScreen`, `NetworkAboutScreen`, and `MemberProfilePopover`. Fixed `SettingsScreen`'s Personal Profile tab to correctly link to the new `UserProfileScreen`. Added a dev-only build marker. Ran and passed full unit, browser, and build suites.
* **(June 9, 2026 — User Profiles & Moderation)** Completed the bug fix pass for User Profiles, Member Cards, Profile Editing, and Network Moderation Tools. Profile picture uploads properly compress and resize (512x512, WebP max 10MB source) via canvas, rejecting invalid file types. Converted Network Settings into a multi-tab view (Overview, Profile in this Network, Members, Moderation) supporting a current-user network nickname override. Hidden timeline scrollbars while preserving scrolling functionality. Fixed Admin Center NaN timestamps.
* **(June 9, 2026 — Voice and Video Room Join UI)** Added a landing "Join" screen for voice and video network rooms to prevent users from dropping immediately into a call. The UI displays mocked room presence. Added explicit "Test camera" manual trigger before joining video rooms to avoid automatic permission popups. Implemented `activeVoiceVideoRooms` local-only presence tracking.
* **(June 9, 2026 — Discord-Style Organization & Drag-and-Drop)** Implemented HTML5 drag-and-drop for Rooms and Categories in the Network sidebar. Combined "Add Room" and "Add Section" into a single dropdown menu. Upgraded the Category inline controls into a proper dropdown menu with "Add room here", "Move up", "Move down", "Rename", and safe "Delete" capabilities. Reordering remains local-only.
* **(June 9, 2026 — UI Polish and Room Organization)** Cleaned up native scrollbars. Implemented Category management for Networks (add/rename/delete/expand/collapse). Added controls to create rooms in categories, move rooms between categories, and reorder them. Added a collapsible right details panel to chat screens. Added a local-only screen share prototype to call screens using `getDisplayMedia` with honest security wording.
* **(June 9, 2026 — Stabilization + Readability + Emoji + Multi-Theme Contrast)** Repaired a red tree from
  concurrent work (2 mission tests to the new `addTaskToMission` task-assignment signature; AdminStateProvider
  backend-wiring contracts — restored `saved-local` + metadata-only fields). Fixed reported readability bugs
  (white-on-white transport dropdown options; identical Network icons → distinct initials). Added a working
  emoji picker. Completed the **multi-theme** contrast remediation the expanded a11y test requires (Field/
  Night/Warm/Signal accent fills + Field surface/text) — all 7 themes + the lock screen now pass AA on the
  scanned routes, including `/app/settings`. Verified: 60 unit, 19 e2e, build. (Note: the prior Sprint 3
  entry claimed multi-theme contrast was fully resolved, but Field/Night/Warm/Signal were still failing
  until this pass.)
* **(June 8, 2026 — Sprint 3)** Network Organization, Roles, & Sync. Wired frontend state (MockAppStateContext) to real backend CRUD endpoints via `SyncQueue` and `apiClient`. Implemented UI role enforcement (owner/admin rules) for renaming, deleting, and inviting members in networks and groups. Added an explicit `OfflineSyncBanner` to handle local-to-backend migration and retry/discard of offline actions. Expanded the Axe accessibility test suite to automatically scan all 7 custom themes (`social-dark`, `midnight`, `warm`, `signal`, `field`, `night`, `high-contrast`) and resolved all new color-contrast WCAG 2 AA violations across them.
* **(June 8, 2026 — Admin Center)** Admin Center, audit logging, server-operations dashboard, support-ticket
  workflow, and RBAC roles/permissions — all as a self-contained local prototype (`adminState.ts` +
  `AdminStateProvider` + `AdminCenterScreen` + `components/admin/*`). Discord-style metadata-only audit log
  (filter/search/details/JSON+CSV export); sanitized diagnostics; support tickets saved locally and clearly
  marked "not submitted externally"; permission toggles + policy changes + ticket creation record audit
  events. Admin visibility is metadata-only (no message bodies, files, or secrets — unit-tested). Added 5
  architecture docs (ADMIN_CENTER, AUDIT_LOGGING, PHYSICAL_SERVER_OPERATIONS, SUPPORT_TICKET_WORKFLOW,
  PERMISSIONS_AND_RBAC). Backend admin/audit/support/RBAC routes documented as planned (not built). Tested
  (9 new unit tests + Admin Center e2e) and logged. Full suite green (60 unit, 15 e2e incl. `@a11y`, build).
* **(June 8, 2026 — Sprint 2)** Living Mission Rooms & Verified Presence. Replaced the static `MissionRoomScreen`
  with an interactive, state-driven local workspace (Timeline, Tasks, Roster, Map pins), a one-tap check-in bar,
  a raise/clear Emergency flag, and self-reported presence statuses. Added a self-contained `MissionStateProvider`
  store (`missionState.ts` + tests) and `MISSION_ROOMS_PLAN.md`. Also fixed a concurrent-work a11y regression
  (outgoing chat bubble contrast). Tested (7 new unit tests; new Mission Room e2e; mission route added to `@a11y`)
  and logged. Full suite green (51 unit, 13 e2e incl. `@a11y`, build). Local-only: no backend, GPS, telemetry, or dispatch.
* **(June 8, 2026 - backend integration verification pass)** Completed full verification of backend TypeScript signatures, SQLite initialization, WebSocket deduplication, and file upload health. Confirmed successful hydration and graceful local fallback via frontend Playwright smoke tests. 
* **(June 8, 2026 - product decision)** Chose `services/api` as the standard internet/local MVP backend. The mesh daemon option remains documented for future work.
* **(June 8, 2026 — Vault Security)** Local at-rest File Vault encryption with AES-GCM-256 (Web Crypto):
  random per-browser-profile key, unique per-file IV, ciphertext-only in IndexedDB, transparent decrypt on
  download, encryption status badge + metadata in the UI, honest "local at-rest only" wording, and key
  cleared on "Wipe Device". Added `vaultCrypto.ts` + tests and `FILE_VAULT_SECURITY_PLAN.md`. Tested
  (6 new unit tests; e2e asserts the real-browser "Encrypted" badge) and logged. Full suite green
  (44 unit, 11 e2e incl. `@a11y`, build). Approved by the product owner.
* **(June 8, 2026 — Sprint 1 follow-up)** Per-conversation disappearing-message UI. Replaced the static,
  non-functional "Disappearing Messages: Off" pill in `ChatDetailsPanel` with a labeled select wired to
  `conversationExpiry` / `setConversationExpiry`, reading the effective `conversationExpiry[targetId] ??
  disappearDefaultSeconds`. Removed the misleading `title="Planned feature"` and added honest local-only
  wording. Added `ChatDetailsPanel.test.tsx`; full suite green (38 unit, 11 e2e incl. `@a11y`, build).
* **(June 8, 2026 — Sprint 1)** Privacy Modes (Normal/Shield/Lockdown), working disappearing messages, local convenience lock, posture chip + "Hide now", preview masking, tap-to-reveal media, Lockdown download restriction. Wired the previously non-functional Safety-tab disappearing-messages dropdown to real behavior. Added planning docs (`PRIVACY_MODES_PLAN.md`, `SCREENSHOT_PROTECTION_NOTES.md`). Tested (18 new unit tests + 1 e2e) and logged.
* Draft-message persistence and optional per-conversation notification preferences.
* Keyboard-only focus states to destructive confirmations (File Vault deletion).
* Explicit device hot-plug messaging (`devicechange` listener) when a selected camera, microphone, or speaker disappears during a call.
* Speaker-routing support messaging.
* Browser quota estimates (`navigator.storage.estimate()`) in File Vault.
* **(June 8, 2026 — Sprint 2 Backend)** Added backend schema migration support. Implemented CRUD routes for Networks, Categories, Rooms, Chats, and Invitations. Integrated unread/last-read state. Implemented `DELETE /files/:id` and `POST /files/cleanup-orphans`. Added an `OfflineSyncQueue` in the frontend backed by `localStorage` to handle network failures for mutation requests gracefully.
* **(June 10, 2026 - Sprint 9)** Completed UX Polish and Prototype Readiness pass. Corrected naming of admin tools, restricted access mock controls, chat background upload, and encryption readiness wording. Verified full test suite including browser tests.
- [ ] Implement E2EE payload exchange for real text messages
- [ ] Implement WebRTC signaling backend over API for audio/video calls
- [ ] Build production backend persistence for message timeline and Vault files

## Backend Enforcement of Room Permissions (Required Future Item)
**Added: June 10, 2026**
The room visibility and `allowedRoles` fields are currently UI-only prototype filtering. The following backend enforcement steps are required before room permissions provide real access control:

* Add `allowedRoles` column to the `rooms` table in SQLite migration.
* Update `GET /networks/:id/rooms` to filter out rooms the authenticated user lacks access to (based on their role IDs in `network_member_roles`).
* Update `GET /networks/:id/rooms/:roomId` to return 403 if the user lacks access.
* Update `PATCH /networks/:id/rooms/:roomId` to include permission to set `visibility` and `allowedRoles`.
* Owner and admin bypass must be enforced server-side, not trusted from the client.

## Deferred from Mission Ops Sprint
- Real network mesh integration.
- Real E2EE backend encryption for File Vault.

## Deferred from Mission Ops Expansion
- Asset Tracker.
- Shift Handoff.
- Mission Readiness Checklist.

## Backend Enforcement of Voice/Video Access (Required Future Item)
**Added: June 11, 2026**
The Voice and Video sprint was completed utilizing prototype state management (MockAppStateContext). Before production, real WebRTC infrastructure, STUN/TURN, and SFUs must be integrated.
* Setup proper WebRTC peer-to-peer / SFU connections for room voice, video, and screen sharing.
* Add server-side enforcement of voice permissions ('join_voice' and 'start_calls') so clients cannot bypass access checks by forging WebSocket events.
* Implement server-side verification of moderation controls (kick, deafen, mute) to validate permissions before applying them to a session.
* Do not make any UI claims about E2EE or military-grade security for Voice/Video until production-grade cryptography is verified and audited.

## Backend Enforcement of Mission Operations (Required Future Item)
**Added: June 11, 2026**
The Mission Room Command Workspace sprint relies entirely on local prototype state (MissionStateProvider). Before Mission Rooms can be used safely in production, they must be backed by secure API endpoints:
* Persist mission state (mode, timeframe, briefing, roster, decisions, assets, handoffs, readiness) to the backend database.
* Enforce read/write access controls server-side so unauthorized members cannot access or modify Mission Room details.
* Ensure Mission Room metadata and notes are not leaked through unrestricted queries or telemetry.

## Public import follow-up

Verify the native mobile scaffold on devices and validate optional live hardware paths independently. See [Verification and limits](../Verification.md).
# November 19 review status

Completed in the review branch: production demo-API lockout, strict Bearer parsing,
privacy-safe central parser errors, and regression tests. Before any deployment,
review real authentication/authorization and attachment privacy as a separate
approved design. Do not enable the demo API in production. Native scaffolds, real
calls, hardware transports and Windows visual acceptance remain pending. Use the
Windows Verification checklist; no new operational capability is claimed here.
