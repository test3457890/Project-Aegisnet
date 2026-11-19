# Current State

# AegisNet Project Status & Handoff

## Latest Verification (June 11, 2026 - Real-Time Multi-User Sync Foundation)
* Built a WebSocket server in `services/api` providing topic-based Pub/Sub routing.
* Added backend-backed authorization for WebSocket subscriptions to enforce privacy.
* Modified all REST API backend routes (`calls.ts`, `files.ts`, `chats.ts`, `rooms.ts`, `networks.ts`) to broadcast `SyncEvent` envelopes.
* Created a frontend `wsClient` with automatic reconnection, exponential backoff, and deduplication logic against `clientMutationId`.
* Implemented real-time Typing Indicators using ephemeral WebSocket events, properly layered in `MessageTimeline` and `MessageComposer`.
* Verified all E2E and Unit tests pass including mock state and new real-time capabilities.

## Product Identity
AegisNet is a civilian-first private communication prototype for families, friends, groups, safety check-ins, shared files, and optional advanced Mission Mode tools. It is not an AI app.

## Tech Stack
* **Frontend:** React, TypeScript, Vite 6.4.3, React Router 7.17.0
* **Styling:** Tailwind CSS and semantic CSS custom properties
* **Icons:** Lucide React
* **State:** React Context with backend hydration, localStorage fallback, and IndexedDB binary persistence
* **Testing:** Vitest, React Testing Library, and Playwright
* **Standard MVP backend:** Node.js, Express, SQLite, WebSockets

## How to Run
Windows full-app launcher:

```powershell
.\Start-AegisNet.bat
```

Manual backend:

```bash
cd services/api
npm install
npm run dev
```

Manual frontend:

```bash
npm install
npm run dev
```

The backend runs on `8000`, the frontend runs on `5173`, and backend health is available at `http://localhost:8000/health`. The frontend uses the backend when health and demo login succeed and continues in browser-local fallback mode when they do not.

## Backend Structure
* `services/api/src/db/db.ts` initializes and repairs the SQLite schema with additive migrations.
* `services/api/src/db/seed.ts` creates deterministic users, Networks, categories, rooms, chats, messages, files, devices, and call sessions.
* `services/api/src/services/messages.ts` normalizes message records and prevents duplicate inserts by stable message/client IDs.
* `services/api/src/services/files.ts` normalizes shared file metadata.
* `services/api/src/utils/uploads.ts` validates upload size/type, normalizes names, and blocks dangerous active content.
* `services/api/src/routes/` exposes health, users, Networks, rooms, chats, uploads, files, devices, and prototype call routes.
* `services/api/src/websocket/ws.ts` provides local realtime events at `/ws`.
* `services/api/src/tests/smoke.ts` covers the integrated backend using temporary database and upload paths.

## Frontend Structure
* `src/app/data/` contains mock users, chats, Networks, calls, files, missions, and devices.
* `src/app/state/MockAppStateContext.tsx` provides local messages, selections, group/Network/room management, invitations, unread state, Vault metadata, preferences, delivery state, optional API hydration, and persistence.
* `src/app/state/mockAppState.ts` contains state types, the context, and the consumer hook so Vite Fast Refresh can keep provider exports isolated.
* `src/app/storage/prototypeFileStore.ts` stores local prototype file binaries in IndexedDB and provides usage and reference-aware cleanup helpers.
* `src/app/components/chat/` contains the shared message composer, message timeline, IndexedDB-backed attachment controls, and indexed details panel.
* `src/app/services/connectivity/` contains scaffolding for future Mesh, P2P, and offline queue capabilities.
* `src/app/screens/` contains dashboard, chat, Vault, call, profile, mission, login, error, and not-found screens.
* `tests/e2e/` contains self-starting desktop/mobile browser smoke tests and axe accessibility scans.
* `.github/workflows/frontend-checks.yml` runs the frontend verification commands in CI.

Mock data remains separated from JSX.

## What Works
* Civilian-first dark dashboard with recent private messages, groups, calls, plans, files, safety check-ins, quick actions, and all Networks.
* Direct messages use the correct contact identity.
* Private group chats have separate routes, headers, member counts, member panels, and message histories.
* Network navigation loads the correct rooms for:
  * Family Network
  * Road Trip Network
  * Hiking Club Network
  * Neighborhood Network
  * School Group Network
  * Cyber Team Network
  * SAR Training Network
* Room conversations use composite IDs, preventing same-named rooms in different Networks from sharing messages.
* Text messages send with Enter or the Send button.
* Shift + Enter allows multi-line text.
* Messages show sender, timestamp, and delivery state.
* Empty chats and rooms show friendly starting states.
* Image, GIF, and file attachments show a removable preview before sending.
* Supported attachment types: PDF, DOC, DOCX, XLSX, ZIP, TXT, PNG, JPG, JPEG, WEBP, GIF.
* Unsupported and oversized attachments show friendly errors.
* Local GIF picker works without external APIs.
* A working emoji picker in the composer inserts common emojis into the message (replaced the prior placeholder).
* The transport-mode dropdown options are now always readable (explicit theme colors; fixes the prior white-on-white "(Planned)" options). Created Networks show distinct initials in their Network color in the left icon rail (no longer a column of identical icons).
* Sent photos, GIFs, and files are indexed in the conversation details panel.
* Local attachments can be downloaded while their IndexedDB data remains available.
* File Vault uploads, downloads, searches, filters, lists metadata, and deletes local entries with keyboard-accessible confirmation.
* File Vault shows local IndexedDB usage, browser quota estimates (`navigator.storage.estimate()`), supports reference-aware cleanup, and can remove all local binaries while preserving metadata recovery states.
* File Vault locally calculates and displays SHA-256 hashes for uploaded binaries.
* File Vault encrypts uploaded file contents at rest with AES-GCM-256 (Web Crypto) using a random per-browser-profile key and a unique per-file IV; files are transparently decrypted for local download. The Vault UI shows an "Encrypted" vs "Not encrypted" badge and an Encryption metadata row, and states plainly this is local at-rest encryption only — not end-to-end, not zero-knowledge, not government/military-grade. If the local key is lost (e.g. "Wipe Device" or clearing site data), encrypted files cannot be recovered. See `docs/architecture/FILE_VAULT_SECURITY_PLAN.md`.
* Legacy Vault metadata migrates without deleting existing chat data.
* Dual-layer profiles allow users to have a global identity and a specific Display Name + Role per Network.
* Transport Mode selector is available in message composers and video calls, with active fallbacks for Planned modes.
* **Member Profile Cards:** Anywhere a user is shown (Chat timeline, private sidebar, network members, voice/video participants), clicking their avatar/name opens a radix popover showing their profile card with direct messaging and profile actions.
* **Full User Profiles:** `UserProfileScreen` supports editing your own profile (Name, Username, Bio, Status, Picture via Data URI) and viewing other members' profiles.
* **Network Moderation:** Network owners can view network rosters in `NetworkAboutScreen` and kick, timeout, or ban members. Roles are supported in the data model.
* **Settings Screen:** Local data clearance, mock privacy controls. Personal Profile, Device Hardware Permissions, Network Roles, Safety Defaults, and Security Status Transparency.
* New private chats, private groups, Networks, and rooms can be created and persist across reloads.
* Private groups and Networks can be renamed, have local members edited, generate local invitation codes, and be left or deleted with confirmation.
* Rooms can be renamed, reordered within their section, archived, restored, and deleted.
* Conversations track local unread counts and display a last-read marker when new messages arrive.
* Mobile chat and Network room switchers provide access to destinations hidden by desktop-only sidebars.
* A keyboard skip link moves focus directly to the main content.
* One-to-one voice and video calls have separate routes.
* Private group and Network room voice/video calls have separate routes.
* Call timer, mute, camera, speaker, low-bandwidth, reconnect simulation, and end-call controls work locally.
* Call state labels cover weak signal, reconnecting, restoring audio/video, audio fallback, text fallback, back online, and connected.
* Call screens offer local camera preview only after explicit permission actions and mock remote active speaker changes. Error banners display properly if permissions are denied.
* Call screens map local camera and microphone toggles directly to MediaStreamTrack enable/disable.
* Camera, microphone, and speaker selectors are available as local prototype controls, and preferred device IDs persist with a safe missing-device fallback.
* Explicit device hot-plug messaging (`devicechange` listener) displays a banner when a hardware device is changed.
* Local permission guidance distinguishes blocked, missing, and busy devices.
* An optional local microphone meter visualizes input level without recording audio.
* Mobile call screens hide the bottom navigation so call controls remain usable.
* Privacy Modes (Normal / Shield / Lockdown) are selectable in Settings → Safety & Privacy and persist locally. Shield and Lockdown mask conversation previews in sidebars and the dashboard, blur the screen when the window loses focus, and make chat media tap-to-reveal. A privacy posture chip with a "Hide now" action appears outside of calls.
* Lockdown Mode adds a local convenience lock (PIN), enforced disappearing messages (minimum 24 hours), and restricted in-app file downloads. The lock screen and settings clearly state the PIN is not encryption and not account security.
* Disappearing messages (Off / 1 hour / 24 hours / 1 week) actually remove messages locally: expired messages are filtered from view immediately, swept from local state every 30 seconds, and their local attachment binaries are deleted from IndexedDB. This is local-only and does not affect copies on other devices. A global default is set in Settings → Safety & Privacy; the chat details panel "Disappearing Messages" select sets a per-conversation override (effective value = `conversationExpiry[targetId] ?? disappearDefaultSeconds`).
* Mission Rooms (optional Mission Mode) are interactive local workspaces: a working Timeline (situation updates, decisions, check-ins, alerts), Tasks (add/toggle with a pending count), Roster (members + the current user's presence), and a Map tab with labelled pins (placeholder only — no live GPS). A one-tap check-in bar ("I'm safe / On my way / Arrived / Need help") and a raise/clear Emergency flag both post to the timeline. Reached via Network rooms of type `mission`. All local prototype data (no backend, telemetry, or dispatch); presence and check-ins are self-reported. See `docs/architecture/MISSION_ROOMS_PLAN.md`.
* Verified Presence: the current user sets a self-reported status (Available, Driving, In Field, On/Off Duty, Low Battery, Weak Network) in the Mission Room; it persists locally.
* Admin Center (`/app/admin`, optional area) provides organization/Network/IT/security/server-operator tools as a local prototype: Overview, Networks, Members, Roles & Permissions (RBAC matrix), Audit Logs (Discord-style, metadata-only, filter/search/details/JSON+CSV export), Server Operations (service status, infrastructure health, error categories, sanitized diagnostics), Support Tickets (saved locally, never transmitted), and Policy Settings. Admin actions (permission toggles, policy changes, ticket creation, bundle export, mock member suspend) record audit events. Admins see operational metadata only — never message bodies, decrypted files, passwords, tokens, or keys. "Server" wording is used only in the infrastructure/Server Operations context, never in chat UI. See `docs/architecture/ADMIN_CENTER_PLAN.md`, `AUDIT_LOGGING_PLAN.md`, `PHYSICAL_SERVER_OPERATIONS_PLAN.md`, `SUPPORT_TICKET_WORKFLOW.md`, and `PERMISSIONS_AND_RBAC_PLAN.md`.
* Appearance and profile/privacy preferences persist locally. Default theme is Aegis Social Dark.
* **Privacy preferences change real prototype behavior (June 10, 2026):** Read receipts OFF hides delivery/read state on the current user's outgoing messages; Safety check-in reminders OFF mutes the dashboard Safety check-ins panel; Allow group invitations OFF blocks redeeming local private-group invitation codes with a clear warning. All three persist locally and emit metadata-only QA events.
* **Trusted Contacts (local prototype trust model):** trust levels (Not trusted / Known contact / Trusted contact / Verified in person; org/device-verified planned-only), trust reason, private local note, marked-by, trusted/last-reviewed dates, Mutual Networks, and a Trust Review modal with honest wording ("local prototype label… not cryptographic identity verification"). Seeded demo records exist. State lives in `trustedContacts` (localStorage); helpers in `src/app/state/trust.ts`.
* **Profiles:** other-user profiles show Message/Call/Review Trust actions, a Trust & connections section, Mutual Networks, and an Activity tab; the own profile has an Activity composer (local-only status posts) and trust-level Trusted Contacts cards. Avatars open a click-to-expand lightbox (`AvatarLightbox`) with Esc/click-outside close, initials fallback, and Lockdown tap-to-reveal.
* **Network Roster:** member cards in Network Settings → Members are fully clickable (and keyboard-operable) popover triggers showing nickname, username, status, roles, and trust chips; the tab has member search and All/Pending/Approved/Rejected join-approval views (local-only seeded workflow). A Radix popover bug (`preventDefault` blocking the open toggle) was fixed — member profile cards now actually open on click app-wide.
* **Network Settings tabs are functional prototypes (no more "coming soon"):** Roles (create/delete, color chips, permission preview catalog), Emoji & Stickers (safe uploads — SVG/HTML/executables blocked, 25 slots), Integrations & Bots (sample catalog, permission preview, enable/disable/remove, "real bots do not execute" warning), Safety Setup (working local toggles, verification level, Guard summary), and Invites (`aegisnet://invite/CODE`, expiration/max-use labels, require-approval toggle with bypass warning, copy/revoke). All labeled local-only; per-Network settings live in `src/app/state/networkPrototypeSettings.ts`.
* **QA event log:** `/app/qa` shows Recent QA Events (metadata-only, capped at 200, structural field whitelist in `src/app/qa/qaEvents.ts`) with a Clear button; Copy Diagnostics includes the 50 newest events and never includes message bodies, bios, notes, Activity content, photos, keys, or tokens (unit-tested).
* Seeded Networks now include owners and member lists so rosters, Mutual Networks, and owner/admin gating are testable without creating Networks first.
* A terminology unit test (`src/app/terminology.test.ts`) guards user-facing wording: no "server"/"channel"/"Mutual Server"/"Friend" outside the Admin Center backend-operator exception.
* Friendly route error and not-found screens provide Back to Home and Reload App actions.
* User-facing security wording identifies prototype behavior and does not claim production encryption.
* File Vault shows local IndexedDB usage, supports reference-aware cleanup, and can remove all local binaries while preserving metadata recovery states.
* PDF, office, archive, and text attachments receive locally generated type-aware thumbnail cards.
* Desktop and mobile main-route accessibility scans report no serious or critical violations in the current default theme.
* Backend startup creates a complete deterministic SQLite schema and seed set.
* Direct, private-group, and Network room messages hydrate from the backend when it is available.
* Optimistic sends persist to SQLite and merge HTTP/WebSocket results by stable IDs without duplicate rendering.
* Backend upload metadata is normalized and unsafe executable, script, HTML, and SVG content is rejected.
* File Vault metadata can hydrate from the backend while encrypted Vault bytes stay browser-local.
* Prototype call state starts, updates, and ends through backend routes when connected.
* A small dashboard status identifies shared-data mode or browser-local fallback without interrupting use.
* Typing events are sent through WebSocket while composing when the backend is connected.

## Local Persistence
The browser persists:
* selected theme and appearance preferences
* selected Network, room, and chat
* sent messages
* small image/GIF previews
* file attachment metadata
* File Vault metadata
* created private chats, groups, Networks, and rooms
* local group and Network members, invitation codes, room ordering/archive state, unread counts, last-read message IDs, and message drafts
* per-conversation notification preferences
* profile/privacy toggles
* preferred local camera, microphone, and speaker IDs
* Mission Room data (tasks, timeline, roster, map pins, emergency flag) and the current user's self-reported presence
* Admin Center data: metadata-only audit events (capped at 500), local support tickets, the RBAC permission matrix, organization info, and policy settings

File binaries are stored in IndexedDB, never in localStorage. Image previews are size-limited. If localStorage fills up, message metadata is preserved without crashing the app. Clearing browser site data removes downloadable file binaries; older metadata-only records remain visible with recovery messaging.

When the backend is available, shared prototype records also persist in SQLite:
* users, Networks, categories, and rooms
* direct chats and private groups
* direct, group, and room messages
* normalized attachment and File Vault metadata
* prototype device records
* prototype call-session state

Browser-local and backend data are merged by stable IDs. Full offline synchronization and automatic conflict resolution are not implemented.

## Intentionally Mock-Only
* Production encryption and key management (the File Vault now has *local at-rest* AES-GCM encryption only — see below; it is not E2EE, zero-knowledge, or hardware-protected)
* Authentication, MFA, passkeys, and device trust
* Remote multi-user calling and WebRTC signaling
* Durable cloud storage, encrypted backup, and key recovery (Vault at-rest encryption is local-only with no key backup; lost key = unrecoverable files)
* Encryption of chat attachments, Vault metadata, and thumbnails (only Vault file *contents* are encrypted)
* Payments
* AI
* Mesh and peer-to-peer networking
* Hardware nodes
* Native mobile apps

## Known Issues
* **Accessibility:** the automated axe scan now covers **all 7 themes** across the main routes and the lock screen, and passes (no serious/critical violations). A multi-theme contrast pass darkened accent fills in Field/Night/Warm/Signal so white-on-accent text and secondary text meet AA, while keeping the bright `--accent-readable` for text on dark. The Admin Center route (`/app/admin`) is still excluded from the axe scan pending a dedicated contrast review.
* The Privacy Modes local lock is a convenience screen guard, not encryption or account security. Disappearing messages are local-only and do not recall or delete copies on other devices.
* IndexedDB files are browser-local and are not synchronized across devices.
* Invitation codes are local demo values only; there is no remote delivery or redemption flow.
* Membership edits, leave/delete actions, unread state, and last-read positions are local to one browser profile.
* Document thumbnails are type-aware local cards, not rendered PDF or office-document pages.
* Local camera preview and microphone metering depend on browser permission and available hardware. Speaker selection depends on browser support for output routing.
* Local create/manage flows for chats, private groups, Networks, rooms, members, and invitations are now fully connected to backend CRUD routes, with RBAC rules enforced in the UI.
* Browser-local fallback securely stores queued changes via `OfflineSyncQueue`, allowing users to manually "Sync" or "Discard" them when the backend returns.
* API-local uploaded files have safe URLs and metadata, but the File Vault UI still downloads encrypted browser-local records through IndexedDB.
* Backend records retain prototype disappearing-message timestamps; remote deletion/recall is not implemented.
* The API uses demo identity only and must not be exposed as a production authentication system.
* Mission Rooms are local-only (no backend sync), presence and check-ins are self-reported, the Emergency flag is an in-app signal only (no real dispatch), and the Map tab is a labelled-pin placeholder with no live GPS or location tracking.
* Admin Center is a local prototype: it is not gated by production authentication, the RBAC permission matrix is not yet globally enforced (toggles edit local role definitions + log audit events), audit logs and tickets are single-profile localStorage (not tamper-evident or multi-user), and member suspend / Network-room delete / server restart-backups-TLS-update are mock or planned. Support tickets are saved locally and never transmitted to Stuff Studios LLC in this prototype.

## Latest Verification (June 10, 2026 — Sprint 8: Backend Persistence)
* Backend DB migration 4 created, adding profile and moderation tables.
* API endpoints added for `/users/me`, `/networks/:id/members/...`, and `/trust/:id`.
* UI successfully wired to `apiClient` with `SyncQueue` offline fallbacks.
* Playwright end-to-end tests and Vitest suites successfully passing (101 backend+frontend unit tests).
* Build passing cleanly.

## Latest Frontend Verification (June 10, 2026 — Sprint 7: Profiles, Trust, Network Tools, QA)
* Vitest: **92 tests passed** across 19 files (15 new: QA event sanitization/cap, trust model, emoji upload safety, join workflow, Trust Review modal, avatar lightbox, read-receipts gating, terminology guard).
* `npm run build`: success (Vite 6.4.3).
* Playwright: **23 passed, 9 skipped (mobile-scoped)** across desktop-chrome and mobile-chrome, including 3 new tests (roster click → profile card → Trust Review; avatar lightbox Esc-close; QA Recent Events metadata-only) and both `@a11y` scans.
* Local persistence additions: `trustedContacts`, `activityPosts`, per-Network safety settings/join requests/bots/emoji (`aegisnet_networkSafety_*`, `aegisnet_joinRequests_*`, `aegisnet_networkBots_*`, `aegisnet_networkEmoji_*`), and the QA event log (`aegisnet_qaEvents`).

## Latest Frontend Verification (June 8, 2026 — Admin Center)
* Vitest: **60 tests passed** across 12 files (9 new admin-logic tests: audit catalog/filtering/export, RBAC defaults, sanitized diagnostics, privacy-safety key assertions).
* `npm run build`: success (Vite 6.4.3).
* Playwright: **15 passed** across desktop-chrome and mobile-chrome, including the new Admin Center test (audit log displays metadata-only; creating a support ticket produces an audit event; Server Operations renders); existing chat/Vault/privacy/mission/call flows and `@a11y` still pass.

## Latest Frontend Verification (June 8, 2026 — Sprint 2: Mission Rooms)
* Vitest: **51 tests passed** across 11 files (7 new mission-logic tests).
* `npm run build`: success (Vite 6.4.3).
* Playwright: **13 passed** across desktop-chrome and mobile-chrome (mobile-only flows skip the desktop-only ones), including the new Mission Room interaction test; the `@a11y` scan now also covers the Mission Room route and passes on the default theme.
* Fixed one regression from concurrent backend work: outgoing chat bubbles failed axe `color-contrast` (white on `--accent-primary`); switched to `accent-secondary`.

## Backend Integration Verification Status (June 8, 2026)
* Fixed a TypeScript signature error in the multer `fileFilter` callback inside `services/api/src/routes/uploads.ts` which was blocking the backend build/typecheck.
* Backend `npm install`, `npm run typecheck`, and `npm run test` run successfully without errors.
* Frontend `npm install` and `npm run build` run successfully without errors.
* Backend starts cleanly via `npm run dev` and initializes SQLite database, migrations, and deterministic seed data.
* `http://localhost:8000/health` returns `200 OK` and confirms database, upload folder, and WebSocket readiness.
* API routes properly fetch seeded data (e.g. `GET /users`, `GET /networks`, `GET /chats`).
* The frontend `npm run test:browser` e2e test suite (14/14 tests) passes successfully with the backend offline, proving the graceful browser-local fallback functionality, UI routing, and new File Vault AES-GCM encryption badges work accurately when offline.
* The local full-app launcher `Start-AegisNet.bat` via PowerShell accurately provisions port `8000` for the backend and `5173` for the frontend.
* Integration logic (message hydration, deduping, and fallback) is verified as functional through the backend smoke tests and frontend Playwright suite.

## Latest Verification (June 8, 2026 — Sprint 3: Backend CRUD, Sync, & Accessibility Hardening)
* Completed implementing Sprint 3 Standard Backend CRUD and Sync Stability.
* Backend tests pass via `npx tsc --noEmit`. Backend API routes now natively handle schema migrations, Networks, Categories, Rooms, Chats, and Invitations.
* `OfflineSyncQueue` added to capture actions when the API is unreachable, storing them in `localStorage`.
* An explicit `OfflineSyncBanner` was added to give users control over local-to-backend migrations and retries.
* Vitest frontend tests pass (`60 passed`).
* Backend database properly enforces unread/last-read state.
* Playwright end-to-end tests pass (`20 passed`). The `@a11y` accessibility scan has been expanded and passes across all 7 custom themes (`social-dark`, `midnight`, `warm`, `signal`, `field`, `night`, `high-contrast`).

## Latest Verification (June 10, 2026 - Sprint 9: UX Polish & Prototype Readiness)
* Added extensive logQaEvent metrics for the new workflows to support testing insights.
* We are now officially ready to move into the Backend Persistence Sprint.

## File Vault and Mission Ops
- File Vault enabled for networks and missions.
- Mission Check-In, Tasks, Calendar, and Dashboard integrated.

## Mission Ops Expansion
- Added Mission Briefing panel.
- Added structured Mission Roster with duty statuses.
- Added Mission Ops Alerts to Dashboard.
- Enhanced AAR generation.

## Public import verification

See [Verification and limits](../Verification.md) for the current public test entry points and prototype boundaries.
