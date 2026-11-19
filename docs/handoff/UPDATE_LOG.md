## 2026-06-11: Profile, Role Assignment, and RBAC Enforcement Sprint
- **Fixed Profile Edit Modal**: Converted the "Edit Profile" component from an absolute overlay to a full-screen fixed modal, preventing clipping on short profiles.
- **Added Roles to Network Profile**: The "Profile in this Network" tab now displays the user's assigned roles along with what they can be @mentioned as based on the role name.
- **Added Admin Role Assignment**: Integrated a "Manage Roles" section in `MemberProfilePopover.tsx`. Network owners and users with `manage_roles` permissions can now dynamically assign or remove roles from other users directly from their popover profiles.
- **Enforced Role-Based Access Control (RBAC)**: Introduced `hasNetworkPermission` utility in `mockAppState.ts`. Replaced simple `isOwner` checks throughout the application (`MockAppStateContext.tsx`, `NetworkSettingsScreen.tsx`, `RoomsSidebar.tsx`, `NetworkMembersTab.tsx`) with proper RBAC evaluations. Authorized members (not just the network owner) can now manage rooms, roles, and members based on their specific role permissions.

## 2026-06-11: Mission Room Command Workspace Upgrade Sprint
- **Upgraded Mission Rooms**: Converted the basic Mission Room into a structured command workspace. Added Mission Modes (Planning, Live, Watch, Training, Low-Bandwidth, Lockdown, Archive) and a UTC/Zulu toggle using proper IANA timezone calculations.
- **Added Mission Templates**: Built an append-only template system for rapid setup of Event Support, Cyber Incident, Search and Rescue, and other common scenarios.
- **Added Structured Components**: Implemented a top-level `MissionBriefingCard`, a dedicated `MissionCatchUpPanel` that automatically computes changes since last timeline view, and a separate `MissionDecisionLog` to keep operational decisions out of the chat flow.
- **State Expansion**: Extended `MissionData` and `MissionState` to support `mode`, `timeZone`, `startTime`, `endTime`, `lastSeenTimelineAt`, and structured tasks with assignment and completion tracking.
- **QA & Privacy compliance**: Ensured Mission Room planning notes and decisions are excluded from telemetry payloads.

## 2026-06-11: Mission Operations, Assets, Shift Handoff, and Readiness Checklist
- **Integrated Mission Operations Deferred Tools**: Added `MissionAssetTracker`, `MissionHandoffTab`, and `MissionReadinessChecklist` into the `MissionRoomScreen` tabs.
- **Fixed UI/Layout issues**: Resolved a critical layout failure in `MissionRoomScreen` that caused the desktop room heading to be squeezed to zero width by the Duty Status Panel. Changed the `truncate` class on the heading to allow multi-line wrapping if space is constrained.
- **Test Baseline Stability**: Restored passing Playwright e2e test baseline. Fixed `test 141` assertions, locator specificity, and accessibility violations within Mission Operations.

## 2026-06-11: Identity, Device Trust, Session Safety, and Trust Verification Sprint
- Implemented Device & Sessions management UI with local mock state.
- Added Trust Verification Center to Settings.
- Clarified Security Status showing what is actually implemented vs prototype mock.
- Added Privacy & Audit Review tab for safe diagnostics export.
- Updated Network Identity Context with Mission Roles and Trust Ring mock data.

# Update Log

## June 10, 2026 - Sprint 10: Room Types and Role-Based Room Permissions
**Summary of Changes:**
Made Mission Rooms and Planning Rooms working prototype room types (no longer "Planned" placeholders). Added role-based room visibility with a `canViewRoom` helper, UI filtering in the sidebar and mobile switcher, an Access Denied screen for direct URL access to restricted rooms, a Room Permissions editor in Network Settings, and an updated Network Permission Dashboard showing all restricted rooms in one place. All access controls are clearly labeled as prototype-only UI filtering — backend enforcement is a documented future requirement.

**Key changes:**
* `MockRoom` extended with `visibility: RoomVisibility` and `allowedRoles: string[]` fields.
* `canViewRoom()` helper added to `mockNetworks.ts`: owners and admins always see all rooms; other users see only rooms where they hold an allowed role.
* Network templates (SAR/Field Team, Cyber Team, Business, School/Club) updated with Mission Rooms, Planning Rooms, and restricted visibility defaults using stable role IDs.
* `createRoom` and `updateRoomPermissions` added to state/context.
* `RoomPermissionsEditor` component built for Room Settings.
* `PlanningRoomScreen` created with Agenda, Tasks, Timeline, and Decisions tabs.
* Room filtering applied in `RoomsSidebar` and `MobileContextSwitcher`.
* Access Denied screen added to `GroupChatScreen` for direct URL access to restricted rooms.
* QA event types added: `room.type.created`, `room.permissions.updated`, `room.access.denied`, etc.
* `NetworkPermissionDashboard` expanded with Restricted Rooms overview.

**Verification Result:**
* `npm run test`: Passed (frontend unit tests including new `roomPermissions.test.tsx`).
* `npm run build`: Passed.
* No production OPSEC, E2EE, or security claims added.

**What remains local-only:**
* All room permission filtering is UI-only. Backend enforcement of `allowedRoles` is required for real access control.
* Planning Room content (agenda, tasks, decisions) is local useState only.
* Mission Room content remains in `MissionStateProvider` (local-only).

**Backend enforcement follow-up (required):**
* `GET /networks/:id/rooms` should filter by user role before returning restricted rooms.
* `GET /networks/:id/rooms/:roomId` should 403 if user lacks access.

## June 10, 2026 - Sprint 8: Backend Persistence (Profiles, Moderation, Trust, Invites, Roles)
**Summary of Changes:**
Migrated local-only profile, moderation, trust, and role state to backend SQLite persistence, bridging the gap between the local UI and the Express backend. Maintained the "civilian-first prototype" guardrails with no production auth, E2EE, or MFA claims.
* **Database Migrations:** Created Version 4 schema migration in `services/api/src/db/migrate.ts` adding columns for `users` (bio, avatarColor) and creating tables for `network_bans`, `network_roles`, `network_member_roles`, `join_applications`, and `trusted_contacts`.
* **Backend Routes:** Implemented PATCH `/users/me` for profile updates. Added moderation endpoints (`kick`, `timeout`, `ban`) to `networks.ts`. Added role management endpoints and join-application approvals. Rewrote `invitations.ts` to match the exact DB schema and handle `requireApproval` flows. Created `trust.ts` for managing Trusted Contacts. Registered new routes in `server.ts`.
* **Frontend Sync:** Wired `MockAppStateContext.tsx` to push state mutations to the backend via `apiClient` with `SyncQueue` fallback. Moderation actions, role changes, profile edits, trust label updates, and invite generation now persist across sessions using the local API.

**Verification Result (all green):**
* `npm run test` (Backend & Frontend): Passed cleanly (added `routes.test.ts` for backend route validation).
* `npm run test:browser` (Playwright E2E): Passed cleanly.
* `npm run build`: Success.
## June 10, 2026 - Sprint 7: Profiles, Trusted Contacts, Network Tools, QA Visibility, and Privacy Preferences
**Summary of Changes:**
Completed the user-experience and prototype-behavior sprint covering profiles, Trusted Contacts, Network operations screens, privacy-preference behavior, QA diagnostics, and terminology. No production auth, E2EE, MFA, passkeys, device trust, mesh/radio/satellite, payments, real bot execution, or external webhooks were added. All new trust/safety wording is honest and labeled local-only or backend-backed.

**Root-cause bug fix (the reported "roster members aren't clickable" issue):**
`MemberProfilePopover`'s trigger called `e.preventDefault()` (to stop parent sidebar links from navigating), but Radix skips its own open-toggle when an event is default-prevented — so the member profile popover never opened from a click anywhere in the app. The trigger now toggles the controlled popover manually while still preventing parent-link navigation. Covered by a new e2e test.

**New features:**
* **QA event log (`src/app/qa/qaEvents.ts`):** metadata-only, capped (200), localStorage-backed event log with a structural field whitelist (timestamp, type, route, user/target/Network/Room IDs, success, short reason code, request ID). `/app/qa` gained a "Recent QA Events" section with a Clear button; Copy Diagnostics now includes the 50 newest events. Events fire for profile opens, profile-card opens, avatar previews, avatar uploads (attempt/success/fail), roster clicks, nickname changes, trust changes, privacy toggles, group-invite allow/block, profile saves, activity posts (metadata only), invites, roles, bots, emoji, safety settings, and error-boundary hits. Unit tests assert private content cannot be stored.
* **Trusted Contacts trust model (`src/app/state/trust.ts` + context):** local-only trust levels (Not trusted / Known contact / Trusted contact / Verified in person; org-verified and device-verified shown as planned-only), trust reason, private local note, marked-by, trusted date, last-reviewed date, Mutual Networks, mutual trusted contacts. Seeded demo records (Sarah trusted, Mom verified-in-person, John known). `TrustReviewModal` explains exactly what the label does and does not mean — no cryptographic/device/government/org verification claims.
* **Profile improvements:** other-user profiles gained Message / Call / Add-or-Review-Trust buttons, a Trust & connections section (level, reason, dates, Mutual Networks list, mutual trusted count, honest warning), and an Activity section. Own profile gained an Activity composer (local-only status updates with relative timestamps, delete) and a real Trusted Contacts section driven by trust records (level chips, Message/Review Trust, empty state). Replaced the fake "Verified via mock" badge with the real local trust label. Profile prefs section now states actual toggle behavior.
* **Profile photo expansion (`AvatarLightbox`):** click any avatar on the profile screen or profile card for a large preview; closes via Esc/click-outside/close button; initials fallback; Lockdown Mode shows tap-to-reveal; photo contents never logged.
* **Network Roster (Members tab):** every member card is now a single keyboard-accessible popover trigger (Enter/Space, focus-visible ring, "View Profile" affordance) showing Network nickname, global display name, username, status, role chips, and trust chip. Added search (name/username) and All/Pending/Approved/Rejected views with a seeded local join-approval workflow (approve/reject, require-approval toggle). Moderation actions stay on the Moderation tab so they cannot be misclicked. Members tab is no longer admin-only (Moderation still is).
* **Privacy preferences now change behavior:** Read receipts OFF hides delivery/read state on outgoing messages (MessageTimeline). Safety check-in reminders OFF mutes the dashboard panel with an explanation. Allow group invitations OFF blocks redeeming local private-group invitation codes with a clear warning (`acceptInvitation` now resolves local group invites; JoinNetworkDialog routes to the group on success). All three persist and emit QA events.
* **Network Settings tabs replaced placeholders:** Roles (list, color chips, member counts, permission previews from a 13-permission catalog, create role, delete-with-confirm, prototype-only label), Emoji & Stickers (upload area with accepted/blocked types, SVG/HTML/executable blocking — `validateEmojiFile` unit-tested — slots counter, delete-with-confirm), Integrations & Bots (sample catalog install, permission preview, enable/disable, remove-with-confirm, "real bots do not execute" warning), Safety Setup (working local toggles + verification level + planned-only cards + Guard summary), and a new Invites tab (`aegisnet://invite/CODE` links, expiration/max-use labels, require-approval toggle with bypass warning, copy, revoke-with-confirm).
* **Network Profile (Overview tab):** member count, online count (prototype), owner display, established date, prototype labels.
* **Seed data:** seeded Networks now have owners and member lists (varied — Brett owns Family/Road Trip/Cyber; others owned by Marcus/John/Keira) so rosters, Mutual Networks, and admin-gating are testable out of the box. Seeded Activity posts for Sarah and Mom.
* **Terminology:** mock user roles "Friend" → "Known contact". Added `src/app/terminology.test.ts` which scans user-facing source for "Mutual Server", "Server Settings/Profile", "Invite to/Leave Server", visible "server"/"channel" text, and "Friend" labels (Admin Center operator tools excluded as the allowed exception).

**Concurrent-work repairs (found during baseline run; not caused by this sprint):**
* `LocalMediaPanel.test.tsx` (2 unit tests) and the call-controls e2e still referenced the pre-Sprint-6 "Local devices" button; the Sprint 6 refactor renamed it ("Show device preview" panel toggle / "Devices" call-screen button) without updating tests. Repaired the tests to the new labels (kept the feature).

**Files Created:**
* `src/app/qa/qaEvents.ts`, `src/app/qa/qaEvents.test.ts`
* `src/app/state/trust.ts`, `src/app/state/trust.test.ts`
* `src/app/state/networkPrototypeSettings.ts`, `src/app/state/networkPrototypeSettings.test.ts`
* `src/app/components/trust/TrustReviewModal.tsx`, `src/app/components/trust/TrustReviewModal.test.tsx`
* `src/app/components/ui/AvatarLightbox.tsx`, `src/app/components/ui/AvatarLightbox.test.tsx`
* `src/app/components/network-settings/NetworkRolesTab.tsx`
* `src/app/components/network-settings/NetworkEmojiTab.tsx`
* `src/app/components/network-settings/NetworkBotsTab.tsx`
* `src/app/components/network-settings/NetworkSafetyTab.tsx`
* `src/app/components/network-settings/NetworkInvitesTab.tsx`
* `src/app/components/chat/MessageTimeline.readReceipts.test.tsx`
* `src/app/terminology.test.ts`

**Files Changed:**
* `src/app/state/mockAppState.ts` (trust/activity/invite/role types + context interface)
* `src/app/state/MockAppStateContext.tsx` (trustedContacts, activityPosts, setTrustLevel, removeTrustedContact, add/deleteActivityPost, revokeInvitation, deleteNetworkRole, invitation options, local group-invite redemption with groupInvites gating, QA events on preferences)
* `src/app/components/ui/MemberProfilePopover.tsx` (click fix, trust chip, Mutual Networks count, avatar lightbox, labeled Profile button, QA event)
* `src/app/components/network-settings/NetworkMembersTab.tsx` (clickable/keyboard roster, search, join-approval views)
* `src/app/components/network-settings/NetworkOverviewTab.tsx` (Network Profile identity facts)
* `src/app/components/network-settings/NetworkProfileTab.tsx` (QA event, inline save feedback instead of alert)
* `src/app/screens/NetworkSettingsScreen.tsx` (new tabs wired; Members visible to members)
* `src/app/screens/UserProfileScreen.tsx` (trust section, Activity, lightbox, real Trusted Contacts cards, Call button, QA events, honest wording)
* `src/app/screens/QAModeScreen.tsx` (Recent QA Events + diagnostics include events)
* `src/app/screens/ErrorScreen.tsx` (metadata-only error.boundary QA event)
* `src/app/screens/HomeDashboard.tsx` (safety reminders gate)
* `src/app/components/chat/MessageTimeline.tsx` (read receipts gate)
* `src/app/components/JoinNetworkDialog.tsx` (group invite routing + wording)
* `src/app/data/mockUsers.ts` ("Friend" → "Known contact")
* `src/app/data/mockNetworks.ts` (seeded owners/members)
* `src/test/renderWithMockState.tsx` (new context fields)
* `src/app/components/calls/LocalMediaPanel.test.tsx`, `tests/e2e/communication.spec.ts` (concurrent-work repairs + 3 new e2e tests)
* `docs/qa/BUG_BASH_CHECKLIST.md`, `docs/architecture/BOTS_AND_INTEGRATIONS_PLAN.md`, `docs/security/SECURITY_SCORECARD.md`, `docs/handoff/CURRENT_STATE.md`, `docs/handoff/NEXT_STEPS.md`, `docs/handoff/UPDATE_LOG.md`

**Verification Result (all green):**
* Vitest: **19 files, 92 tests passed** (15 new tests across qaEvents, trust, networkPrototypeSettings, TrustReviewModal, AvatarLightbox, MessageTimeline read receipts, terminology).
* `npm run build`: success (Vite 6.4.3).
* Playwright: **23 passed, 9 skipped (mobile-scoped skips)** across desktop-chrome and mobile-chrome, including 3 new tests (roster click → profile card → full profile → Trust Review; avatar lightbox open/Esc-close; QA Recent Events + metadata-only diagnostics) and both `@a11y` scans.
* Backend untouched this sprint (no `services/api` changes), so backend build/tests were not required.

**What remains local-only:** trust records and notes, Activity posts, QA event log, join approvals, invites (codes + labels), roles/permissions (UI-level), bots, custom emoji, Safety Setup toggles, privacy-preference enforcement.
**What is backend-backed:** unchanged from Sprint 6 — Networks/Rooms/chats/messages CRUD + hydration, upload safety (executable/script/HTML/SVG rejection), request IDs, AegisNet Guard, call-session state when the backend is connected.

## June 9, 2026 - Sprint 6: Frontend Usability and Network Operations
**Summary of Changes:**
Completed the AegisNet Frontend Usability and Network Operations Sprint to improve UI clarity, layout, and prepare the foundation for Bots and Integrations. 
* **UI/UX Improvements:** Fixed the call screen layout by moving the `LocalMediaPanel` from an overlapping fixed dropdown to a side-by-side collapsible sidebar panel, ensuring it no longer obscures the video grid or bottom controls on both `VideoCallScreen` and `PrivateCallScreen`. Renamed `NetworkAboutScreen` to `NetworkSettingsScreen` and modularized its massive file into discrete tab components (`NetworkOverviewTab`, `NetworkProfileTab`, `NetworkMembersTab`, `NetworkModerationTab`) under `src/app/components/network-settings`. Added foundation placeholder tabs for `Roles`, `Emoji & Stickers`, `Integrations & Bots`, and `Safety Setup`.
* **Terminology and Polish:** Replaced all user-facing "server" and "channel" terminology with "Network" and "Room" across the app (excluding Admin backend operator tools). Replaced Mutual Server with Mutual Network in user profiles. Ensured missing `aria-label` attributes were added to icons in `NetworkSidebar` and other navigation areas to remove all placeholder "BTN" artifacts.
* **Architecture:** Authored `docs/architecture/BOTS_AND_INTEGRATIONS_PLAN.md` detailing the future REST, webhook, and permission scope designs for bots, explicitly maintaining the "no production security" rule for this prototype stage.
* **Verification:** Validated that the UI responds dynamically to device sizes, components render cleanly without overlap, and settings tabs load their respective modular files.

**Files Created:**
* `src/app/components/network-settings/NetworkOverviewTab.tsx`
* `src/app/components/network-settings/NetworkProfileTab.tsx`
* `src/app/components/network-settings/NetworkMembersTab.tsx`
* `src/app/components/network-settings/NetworkModerationTab.tsx`
* `docs/architecture/BOTS_AND_INTEGRATIONS_PLAN.md`

**Files Changed:**
* `src/app/screens/NetworkSettingsScreen.tsx`
* `src/app/screens/VideoCallScreen.tsx`
* `src/app/screens/PrivateCallScreen.tsx`
* `src/app/components/calls/LocalMediaPanel.tsx`
* `src/app/components/NetworkSidebar.tsx`
* `src/app/components/RoomsSidebar.tsx`
* `src/app/routes.tsx`
* `docs/qa/BUG_BASH_CHECKLIST.md`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/UPDATE_LOG.md`

## June 9, 2026 - QA and Bug Bash Readiness Pack
**Summary of Changes:**
Built the QA and Bug Bash Readiness Pack to prepare for structured manual testing. Added safe development-only tools to generate metadata diagnostics, wipe local test data safely, and expose backend request IDs.
* **Documentation:** Created `docs/qa/BUG_BASH_CHECKLIST.md` and `docs/qa/BUG_REPORT_TEMPLATE.md` to standardize bug reports and map prototype boundaries.
* **Frontend:** Added a development-only `QAModeScreen` at `/app/qa`, linked from `SettingsScreen` (under "Developer Diagnostics"). It displays prototype health, config, and safe diagnostics, omitting all message bodies, file contents, secrets, and auth tokens. Added a safe "Copy Diagnostics" button to `ErrorScreen.tsx` capturing environment, route, error name, message, and Request ID. Added a double-confirmation "Wipe Local Data" feature to QA Mode that clears prototype `localStorage` and `IndexedDB` Vault caches safely without dropping SQLite data.
* **Backend:** Created Request ID correlation (`X-Request-ID`) early in the Express middleware, using `crypto.randomUUID()`. Attached it to all backend JSON responses, error responses, and `aegisGuard` event logs to track requests across the network safely without logging plaintext. Modified `ws.ts` to assign a UUID to connections and inject it into dropped WebSocket logs.

**Files Created:**
* `docs/qa/BUG_BASH_CHECKLIST.md`
* `docs/qa/BUG_REPORT_TEMPLATE.md`
* `src/app/screens/QAModeScreen.tsx`

**Files Changed:**
* `services/api/src/server.ts`
* `services/api/src/security/aegisGuard.ts`
* `services/api/src/websocket/ws.ts`
* `src/app/routes.tsx`
* `src/app/screens/SettingsScreen.tsx`
* `src/app/screens/ErrorScreen.tsx`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/UPDATE_LOG.md`

## June 9, 2026 - Sprint 5: Security Review & Independent Audit (IMPLEMENTATION)
Completed the security audit and vulnerability remediation pass to harden the prototype backend. Replaced all user-facing "server" terminology with "Network" or "Backend (Dev Only)". Implemented a centralized prototype `requireAuth` middleware for the Express backend that protects sensitive read/write routes. Removed backend trust in client-provided IDs (`uploadedBy`, `ownerId`, `userId`, `senderId`, `actorId`), ensuring they are derived from the authenticated user context instead. Hardened the WebSocket server with a strict payload size limit (5KB) and origin checking (CORS). Hardened static file serving by ensuring safe `Content-Disposition` headers (forcing `attachment` for non-media types). Added directory traversal defense-in-depth to File Vault physical deletion routes. Added Helmet for basic HTTP security headers. Documented remaining critical gaps (production auth, E2EE, connection-level WebSocket auth) in `SECURITY_AUDIT_NOTES.md`. No false security claims were made.

**Files Created:**
* `services/api/src/middleware/auth.ts`
* `docs/handoff/SECURITY_AUDIT_NOTES.md`

**Files Changed:**
* `services/api/src/server.ts`
* `services/api/src/websocket/ws.ts`
* `services/api/src/routes/admin.ts`
* `services/api/src/routes/chats.ts`
* `services/api/src/routes/files.ts`
* `services/api/src/routes/networks.ts`
* `services/api/src/routes/rooms.ts`
* `services/api/src/routes/uploads.ts`
* `src/app/components/OfflineSyncBanner.tsx`
* `src/app/components/admin/AdminServerOps.tsx`
* `src/app/screens/AdminCenterScreen.tsx`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/UPDATE_LOG.md`


## June 9, 2026 - Sprint 4: Security Review & Export/Import Controls
**Summary of Changes:**
Completed Sprint 4 requirements focusing on security review, data lifecycle documentation, and Vault enhancements.
* Authored `docs/architecture/DATA_LIFECYCLE_PLAN.md` explicitly defining retention, cleanup rules, and clarifying the boundaries around the export/import JSON bundles, which officially enables the existing Export/Import feature.
* Removed the development UI build marker from the main layout.
* Implemented `<WatermarkOverlay />` to render a screenshot deterrent. This places a faint repeating pattern of the user's name/ID across the app. This respects the privacy model (on-device only, honest deterrence). Toggleable via Settings.
* Enhanced the Vault to support downloading unencrypted copies directly from the backend API when `api-local` scope is present.
* Expanded Axe accessibility scans to cover `/app/admin`, confirming it passes WCAG 2 AA across all 7 themes.
* Ran verification suites (60/60 unit, 26/26 e2e, clean build).

**Files Created:**
* `docs/architecture/DATA_LIFECYCLE_PLAN.md`
* `src/app/components/privacy/WatermarkOverlay.tsx`

**Files Changed:**
* `src/app/components/MainLayout.tsx`
* `src/app/screens/FileVaultScreen.tsx`
* `tests/e2e/communication.spec.ts`

## June 9, 2026 - Antigravity (AI) - AegisNet Guard
**Summary of Changes:**
Created the AegisNet Guard backend middleware layer to act as an application security gateway for the prototype. It parses all requests to detect path traversal attempts, sensitive file scans, and oversized payloads. WebSockets received hardening against unknown event types and oversized events. File uploads received a strict blocklist update (e.g., `.dll`, `.msi`). Integrated `vitest` for the backend tests to ensure the security boundary operates as expected without causing false-positives for chat message injections (`<script>`). Created a `.env.example` and `config/security.ts` to manage environment configurations. Documented its capabilities and limitations.

**Files Created:**
* `services/api/src/security/aegisGuard.ts`
* `services/api/src/config/security.ts`
* `services/api/.env.example`
* `services/api/src/tests/aegisGuard.test.ts`
* `docs/security/AEGISNET_GUARD_PLAN.md`

**Files Changed:**
* `services/api/src/server.ts`
* `services/api/src/websocket/ws.ts`
* `services/api/src/utils/uploads.ts`
* `services/api/package.json`
* `docs/handoff/SECURITY_AUDIT_NOTES.md`
* `docs/security/SECURITY_SCORECARD.md`
* `docs/security/THREAT_MODEL.md`
* `docs/handoff/NEXT_STEPS.md`

**Tests or Commands Run:**
* `npm run test` (Backend tests: 4 passed)
* `npm run test` (Frontend tests: 60 passed)
* `npm run test:browser` (Playwright E2E: 19 passed)

**Build Result:**
* Success.

## June 9, 2026 - Verification & Build Refresh Pass
**Summary of Changes:**
Completed the build and verification pass for the Profile and Moderation fix work. The UI did not show the previous changes because the dev server (Vite) was caching an older build or the process was stuck and hadn't been properly restarted. Terminating the old Node processes and running `npm run dev` cleanly loaded the new components.
Verified that `UserProfileScreen`, `NetworkAboutScreen`, and `MemberProfilePopover` are successfully wired and functional. Fixed `SettingsScreen` to redirect its obsolete "Personal Profile" tab directly to the new `UserProfileScreen` to avoid confusion. Added a visible "Dev build loaded: Profile Sprint Fix Pass" marker to `MainLayout.tsx` to explicitly confirm the code is running.

**Files Changed:**
* `src/app/components/MainLayout.tsx`
* `src/app/screens/SettingsScreen.tsx`

**Verification Results:**
* `npm run test`: 60 tests passed.
* `npm run build`: Frontend build passed cleanly.
* `npx tsc --noEmit`: Backend typecheck passed cleanly.
* `npm run test:browser`: E2E tests passed (fixed a minor a11y contrast failure on the dev marker).
* Manual verification: The dev build marker is visible. `SettingsScreen` now correctly redirects profile management to the new `/app/profile` view.

**Remaining Scope:**
* Profile avatars, nicknames, and moderation actions remain local-only in `localStorage` (`MockAppState`).
* Backend endpoints for user profiles and moderation are not yet implemented.

**Recommended Next Task:**
* Sprint 4 — Security Review & Export/Import Controls or proceed with Backend Profile/Moderation routes.

## June 9, 2026 - User Profiles, Profile Editing, Network Settings, and Moderation (Completion & Bug Fixes)
**Summary of Changes:**
Completed the bug fix pass for User Profiles, Member Cards, Profile Editing, and Network Moderation Tools.
* **Profile Editing:** Finished integrating local profile picture uploads with strict client-side validation (PNG/JPG/WebP up to 10MB), Canvas-based resizing/compression to 512x512 WebP, and storage in local AppState as Data URIs. Added dynamic real-time previews to the edit flow.
* **Network Settings & Nicknames:** Rewrote `NetworkAboutScreen` into a multi-tab "Network Settings" dashboard with support for Network-specific nicknames (overrides global display name only inside that Network). Added `networkProfiles` tracking to the global state.
* **Accessibility:** Ensured member cards open from the right details panel, message timelines, sidebars, and direct messages, providing focus-visible keyboard support and hiding scrollbars.
* **Admin Center:** Fixed "NaNd ago" timestamp rendering errors.

**Verification Result:**
* Passed frontend build (`npm run build`).
* Profile Picture validation testing confirmed rejection of SVGs, executables, scripts, and large files.

## June 9, 2026 - [2026-06-09] User Profiles, Member Cards, Profile Editing, and Network Moderation Tools
**Summary of Changes:**
* **Added `MemberProfilePopover`**: Built using `@radix-ui/react-popover`. Integrated across `ChatDetailsPanel`, `MessageTimeline`, `PrivateSidebar`, `NetworkAboutScreen`, `VideoCallScreen`, and `MissionRoomScreen` allowing users to click on avatars and names to view profiles.
* **Expanded `UserProfileScreen`**: Users can now view other users' profiles via the `/profile/:userId` route. Added full profile editing functionality for the current user including display name, username, status message, bio, and a mock local profile picture upload via Data URIs.
* **Added Network Moderation Tools**: Expanded `NetworkAboutScreen` to allow network owners to kick, timeout, and ban members.
* **Updated State Management**: Added `updateCurrentUserProfile`, `removeNetworkMember`, `updateNetworkMemberRoles`, `createNetworkRole`, `timeoutNetworkMember`, and `banNetworkMember` functions to `MockAppStateContext`. Updated `MockUser` and `MockNetwork` data models to support new fields.

## June 9, 2026 - Message Reactions and Message Grouping
**Summary of Changes:**
Completed the UI polish sprint for Message Grouping and Message Reactions. Implemented intelligent message grouping for consecutive messages sent by the same user within a 5-minute window, resulting in a significantly cleaner chat timeline. Added a localized, contextual emoji reaction picker containing 7 quick emojis, featuring keyboard accessibility, closing on Escape or outside clicks. Added reaction badges that can be toggled by the current user. Ensured all new UI respects Privacy Modes (Shield/Lockdown) and Disappearing Messages constraints.

**Files Changed:**
* `src/app/data/mockChats.ts`
* `src/app/state/mockAppState.ts`
* `src/app/state/MockAppStateContext.tsx`
* `src/app/components/chat/MessageTimeline.tsx`
* `tests/e2e/communication.spec.ts`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/UPDATE_LOG.md`

**Verification Result:**
* Passed unit tests (`npm run test`).
* Passed E2E browser tests (`npm run test:browser`), including the new grouping logic that safely ignores hardcoded counts in favor of message filtering.
* Passed frontend build (`npm run build`).
* Passed backend build (`npx tsc --noEmit`).
* Manually verified consecutive messages group correctly, 5-minute gaps break grouping, and adding/removing reactions works seamlessly.
* **Known issues / Local-only state:** Reactions and grouping states are fully local in this prototype stage. Reactions are persisted in `localStorage` alongside messages, but are explicitly **not** synchronized to the backend (to prevent rogue payload injections without an approved backend endpoint). Disappearing messages correctly take their reactions down with them when they expire.
## June 9, 2026 - Voice and Video Room Join UI
**Summary of Changes:**
Built the new Voice and Video Room Join UI for the AegisNet prototype. Voice and video rooms no longer immediately drop the user into an active call. Instead, they present a landing "Join Screen" that shows the room name, type, and an "In this room" presence list with mocked local demo users. Added a dedicated "Test Camera" flow for video rooms to prevent automatic aggressive camera permission requests upon entering the room preview. Included local-only presence state tracking so the current user accurately appears in the room presence list after clicking Join. Maintained the existing direct private call behaviors without breaking them.

**Files Changed:**
* `src/app/state/mockAppState.ts`
* `src/app/state/MockAppStateContext.tsx`
* `src/app/screens/VideoCallScreen.tsx`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/UPDATE_LOG.md`

**Verification Result:**
* Passed unit tests (`npm run test`).
* Passed E2E browser tests (`npm run test:browser`).
* Passed frontend build (`npm run build`).
* Passed backend build (`npx tsc --noEmit`).
* Manually verified Join Voice and Join Video screen layouts, the manual camera preview toggle, call timer delays until joined, and local room presence updates.
* **Known issues / Local-only state:** Room presence is entirely local-only in the prototype using `activeVoiceVideoRooms` state. Remote voice/video features are blocked until WebRTC signaling is approved and implemented. Screen sharing and camera feeds remain strictly local.

## June 9, 2026 - Discord-Style Organization & Drag-and-Drop
**Summary of Changes:**
Completed the Discord-style UI organization update for the Network sidebar. Added native HTML5 drag-and-drop for reordering categories and moving rooms within or between categories. Replaced the separate Add buttons with a clean, combined "Add to Network" Dropdown menu. Added a robust Dropdown menu to each category header featuring "Add room here," rename, delete, and keyboard-accessible move controls. Reordering is currently persisting locally in the prototype. Added a warning flow when deleting categories that contain rooms, preventing silent deletion of rooms. Fixed a minor pre-existing TypeScript issue in `services/api/src/routes/admin.ts`.

**Files Changed:**
* `src/app/state/mockAppState.ts`
* `src/app/state/MockAppStateContext.tsx`
* `src/app/components/RoomsSidebar.tsx`
* `src/app/components/CreateRoomDialog.tsx`
* `services/api/src/routes/admin.ts`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/UPDATE_LOG.md`

**Verification Result:**
* Passed unit tests (`npm run test`).
* Passed E2E browser tests (`npm run test:browser`).
* Passed frontend build (`npm run build`).
* Passed backend build (`npx tsc --noEmit`).
* Manually verified drag-and-drop behavior, menu integrations, and category deletion safety flows.
* **Known issues / Local-only state:** Category and room reordering is strictly local in this prototype until backend array ordering paths are finalized. Wait for backend sprints before sending array order arrays to the server. No security terminology was inflated.

## June 9, 2026 - UI Polish and Room Organization
**Summary of Changes:**
Completed the requested UI polish and room organization sprint. Cleaned up native scrollbars across the application while preserving scroll functionality. Implemented Category management for Networks, allowing users to add, rename, and delete categories, and naturally create rooms inside specific categories. Added controls to move and reorder rooms between categories. Added a collapsible right details panel to chat screens to save space. Added a local-only screen share prototype to video and voice call screens using `getDisplayMedia`, complete with honest security wording clarifying it's not sent to others.

**Files Changed:**
* `src/app/state/mockAppState.ts`
* `src/app/state/MockAppStateContext.tsx`
* `src/app/components/RoomsSidebar.tsx`
* `src/app/components/CreateRoomDialog.tsx`
* `src/app/components/ManageRoomDialog.tsx`
* `src/app/components/chat/ChatDetailsPanel.tsx`
* `src/app/screens/GroupChatScreen.tsx`
* `src/app/screens/DirectMessageScreen.tsx`
* `src/app/screens/VideoCallScreen.tsx`
* `src/app/screens/PrivateCallScreen.tsx`
* `src/index.css`
* `docs/handoff/CURRENT_STATE.md`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/UPDATE_LOG.md`

**Verification Result:**
* Passed E2E tests (`npm run test`).
* Passed build checks (`npm run build`).
* UI manually verified. All security wording is honest. No production auth, E2EE, mesh, or AI was added.

## June 9, 2026 - Stabilization + Readability + Emoji + Multi-Theme Contrast
**Summary of Changes:**
A coordination-heavy pass. Found the tree RED from concurrent work, repaired it (without reverting the
other contributors' features), fixed the concrete readability bugs reported with screenshots, added a
working emoji picker, and completed a multi-theme accessibility contrast remediation that a concurrent
contributor's expanded a11y test now requires. No production auth, encryption claims, mesh, radio,
satellite, hardware, payments, or AI added. No "server" wording in chat UI (infra/admin contexts only).

**Conflict found & resolved (per coordination rules — reported before changing):**
* 2 mission unit tests were failing because a concurrent session changed `addTaskToMission(mission, label,
  assigneeId?, id?)` (task-assignment feature) without updating the tests. Repaired the tests to the new
  signature (kept their feature).
* `AdminStateProvider.tsx` had been wired to planned backend routes with broken references
  (`event.targetId`/`event.metadata`/`ticket.userId` don't exist; `status:"open"` violated the
  `"saved-local"` type and the "not submitted externally" honesty design; `res.data` was wrong for the
  client). Repaired: restored `status:"saved-local"` and the honest wording, sent correct metadata-only
  fields, and guarded GET hydration with `Array.isArray`. Kept the backend-sync intent (calls fail
  silently until the planned routes exist).

**Readability fixes (from the screenshots):**
* Transport-mode dropdown: the `(Planned)` options rendered white-on-white in the native menu. Options now
  carry explicit theme colors (`--surface-card` / `--text-primary`) so the menu is always readable.
* Network icon rail: created Networks all fell back to one identical Users icon. Created Networks now show
  distinct initials in their Network color (Discord-style), so the rail is legible and distinguishable.

**Messaging polish:**
* Working emoji picker in the composer (replaced the "planned feature" alert) — a popover of common emojis
  that insert into the message. Desktop e2e covers it; the mobile popover layout is a logged follow-up.

**Multi-theme accessibility (now required):**
A concurrent contributor expanded the `@a11y` Playwright test to scan **all 7 themes** across routes and
added a multi-theme lock-screen scan (this matches a previously-logged follow-up). Several themes failed
`color-contrast` on white-on-accent fills (message bubbles, toggles, buttons) and secondary text on
selected surfaces. Fixed by darkening accent fills in **Field, Night, Warm, Signal** (kept the bright
`--accent-readable` for text-on-dark) and adjusting Field's `--surface-selected` / secondary text. All 7
themes now pass AA on the scanned routes.

**Files Changed:**
* `src/app/state/missionState.test.ts` (repair to new `addTaskToMission` signature)
* `src/app/state/AdminStateProvider.tsx` (repair broken backend-wiring; restore saved-local + metadata-only)
* `src/app/components/chat/MessageComposer.tsx` (readable transport options; working emoji picker)
* `src/app/components/NetworkSidebar.tsx` (distinct initials for created Networks)
* `src/styles/theme.css` (Field/Night/Warm/Signal accent + Field surface contrast)
* `tests/e2e/communication.spec.ts` (emoji-picker e2e, desktop-scoped)
* `docs/handoff/UPDATE_LOG.md`, `CURRENT_STATE.md`, `NEXT_STEPS.md`

**Verification Result (all green):**
* Vitest: 12 files, **60 tests passed**.
* `npm run build`: success (Vite 6.4.3).
* Playwright: **19 passed** across desktop-chrome and mobile-chrome (emoji test desktop-scoped), including
  both multi-theme `@a11y` scans (all 7 themes) and the Admin Center, Mission, Vault, and chat flows.

**Large Discord-style request — status:** Most of it maps to AegisNet wording (server→Network,
channel→Room, category→Category, workspace→Network/Shared Space). Multi-Network, categories, and room
types already exist. Remaining items are staged in NEXT_STEPS: better create-Network/Room/Category
workflow, voice/video room types with join/leave UI, invite redemption, message reactions/threads, and
real-time — with real voice/video, screen share, real-time sync, and threads gated on WebRTC + backend
(not yet approved; will not be faked).

## June 8, 2026 - Sprint 2.5 - Data Lifecycle Reconciliation
**Summary of Changes:**
Reconciled documentation to reflect the true state of Sprint 2 Backend. Manually verified that the backend possesses all necessary CRUD routes for data lifecycle. Confirmed UI boundary wording is honest regarding local-only behavior in Admin Center and Mission Rooms. Added Playwright tests explicitly simulating backend offline states to verify that the `OfflineSyncQueue` successfully intercepts and stores mutations (e.g., Network creation) in `localStorage` when the backend is unreachable.

**Clarifications & Stabilized Gaps:**
* The backend API fully supports CRUD for Networks, Categories, Rooms, Chats, and Invitations.
* The frontend `MockAppStateContext.tsx` is partially connected (Network and Room creation) but still uses local-only fallback for deletions and chat management.
* The `OfflineSyncQueue` successfully queues actions, but does not yet automatically flush or retry failed replays when the backend returns.
* The "Recommended Next Task" has been updated to reflect Sprint 3 priorities and the final frontend connection tasks.

**Verification Result:**
* Playwright test `offline sync queue captures actions safely when backend is unreachable` added and passing.
* Vitest and Playwright full suites are green.

## June 8, 2026 - Independent Verification Pass (Sprint 2)
**Summary of Verification:**
Performed an independent end-to-end verification pass on the completed Sprint 2 Standard Backend CRUD and Sync Stability tasks. Confirmed that the backend starts cleanly, databases are initialized with migrations, Playwright end-to-end tests pass, and unit tests run cleanly. The latest updates to `NEXT_STEPS.md` adhered to project rules (appending instead of overwriting, properly shifting completed items).

**1. Backend Health:**
* Confirmed backend started cleanly with `npm run dev`.
* `http://localhost:8000/health` returned healthy (status 200) reporting database (schemaVersion 2), uploads folder, and WebSocket as ok. 
* Checked `npx tsc --noEmit` and it ran with no errors.

**2. Frontend Startup & Offline Fallback:**
* `npm run test:browser` (Playwright) was able to start the frontend server and executed offline scenarios smoothly.
* E2e tests confirmed offline logic continues to hold the app state safely. 

**3. Regression Checks:**
* Vitest (`npm run test`) successfully passed all 60 tests across 12 files. 
* Playwright (`npm run test:browser`) executed 18 end-to-end user flows targeting Chrome Desktop and Mobile Chrome, reporting all passes.
* Checked `NEXT_STEPS.md` to ensure no documentation rules were broken.

**Risks Remaining:**
* Offline sync queue currently queues actions correctly in `localStorage` but might require more rigorous manual conflict resolution testing when the internet connection flips rapidly.
* Missing some specific end-to-end automated tests covering exact network re-connection behavior. 

**Recommended Next Step:**
* Proceed to the next prioritized tasks in `NEXT_STEPS.md` (e.g., Sprint 3 Network Organization & Roles, or expanding admin roles).
## June 8, 2026 - Sprint 2 - Standard Backend CRUD and Sync Stability
**Summary of Changes:**
Implemented the backend API routes for managing Networks, Categories, Rooms, and Chats, leveraging the existing Express/SQLite setup. Migrated the database to include versioning and implemented an offline sync queue (SyncQueue) to capture frontend actions when the backend is unreachable. 

**Backend Work:**
* Added database migration infrastructure (`db/migrate.ts` and `db/reset.ts`) and updated `db.ts` to run migrations automatically. Added `schema_migrations` table tracking.
* Implemented CRUD routes for Networks (`networks.ts`), Categories (`categories.ts`), and Rooms (`rooms.ts`).
* Implemented CRUD routes for Direct Messages and Group Chats (`chats.ts`).
* Created Membership and Invitation token-based API flows (`invitations.ts`).
* Implemented Unread state and last-read position markers (`unread.ts`).
* Added `DELETE /files/:id` for soft deletion and physical unlinking of local Vault files, and `POST /files/cleanup-orphans` for disk cleanup (`files.ts`).
* Verified backend build (`npm run typecheck` and `npm run test` passed).

**Frontend Work:**
* Built an `OfflineSyncQueue` backed by `localStorage` (`syncQueue.ts`) that intercepts network failures for `POST`/`PATCH`/`DELETE` operations.
* Integrated the queue into `MockAppStateContext.tsx` so `createNetwork`, `createRoom`, and `renameNetwork` are safely queued if offline.
* Fixed the `MockAppStateContext.tsx` regression where the object-based network store was accidentally converted to an array map, restoring full frontend test suite passage.

**Files Created:**
* `services/api/src/db/migrate.ts`
* `services/api/src/db/reset.ts`
* `services/api/src/routes/categories.ts`
* `services/api/src/routes/invitations.ts`
* `services/api/src/routes/unread.ts`
* `src/app/state/syncQueue.ts`

**Files Changed:**
* `services/api/package.json`
* `services/api/src/db/db.ts`
* `services/api/src/routes/chats.ts`
* `services/api/src/routes/files.ts`
* `services/api/src/routes/health.ts`
* `services/api/src/routes/networks.ts`
* `services/api/src/routes/rooms.ts`
* `services/api/src/server.ts`
* `src/app/state/MockAppStateContext.tsx`
* `docs/handoff/CURRENT_STATE.md`, `NEXT_STEPS.md`, `UPDATE_LOG.md`

**Verification Result (all green):**
* Backend: `npx tsc --noEmit` success.
* Frontend: Vitest passes all 60 tests.
* Full integration verified via unit tests and build check.
## June 8, 2026 - Admin Center, Audit Logging, Server Ops, Support & RBAC
**Summary of Changes:**
Built the AegisNet Admin Center as a self-contained **local prototype** admin layer: Discord-style
metadata-only audit logging, a physical-server operator dashboard, a support-ticket workflow (saved
locally, never transmitted), an RBAC roles/permissions UI, and policy settings. AegisNet stays
civilian-first; the Admin Center is an optional area. No production authentication, production encryption,
mesh, radio, satellite, hardware, payments, or AI was added. The backend was not expanded — admin/audit/
support/RBAC routes are documented as **planned**.

**Coordination:** verified the latest UPDATE_LOG entry was my own Sprint 2 (no conflicting in-progress
admin work). No git repo present, so coordination was via the handoff log + file inspection.

**Privacy protections (enforced structurally):** audit events and diagnostics carry metadata only —
no message bodies, decrypted file contents, passwords, tokens, API keys, or encryption keys. Unit tests
assert audit-event keys never expand beyond the allowed metadata set and that diagnostics contain no
secret-bearing fields. User-facing chat UI still avoids the word "server"; "server" is used only for
infrastructure/admin contexts (Server Operations).

**Admin Center sections:** Overview, Networks, Members, Roles & Permissions, Audit Logs, Server
Operations, Support Tickets, Policy Settings. Nav entry added to the left rail; route `/app/admin`.

**Files Created:**
* `src/app/state/adminState.ts`, `src/app/state/AdminStateProvider.tsx`, `src/app/state/adminState.test.ts`
* `src/app/screens/AdminCenterScreen.tsx`
* `src/app/components/admin/adminShared.tsx`, `AdminAuditLog.tsx`, `AdminRoles.tsx`, `AdminServerOps.tsx`, `AdminSupport.tsx`
* `docs/architecture/ADMIN_CENTER_PLAN.md`, `AUDIT_LOGGING_PLAN.md`, `PHYSICAL_SERVER_OPERATIONS_PLAN.md`, `SUPPORT_TICKET_WORKFLOW.md`, `PERMISSIONS_AND_RBAC_PLAN.md`

**Files Changed:**
* `src/app/App.tsx` (wrap in `AdminStateProvider`)
* `src/app/routes.tsx` (`/app/admin` route)
* `src/app/components/NetworkSidebar.tsx` (Admin Center nav entry)
* `tests/e2e/communication.spec.ts` (Admin Center e2e: audit log, action→audit-event, support ticket, server ops)
* `docs/handoff/CURRENT_STATE.md`, `NEXT_STEPS.md`, `UPDATE_LOG.md`, `LESSONS_LEARNED_FROM_AMI.md`

**What is enforced now:** nothing globally new — RBAC toggles edit local role definitions and log audit
events but are not yet globally enforced (deliberate, to avoid self-lockout). Logging policy is respected
(off = no new events). Diagnostics/audit sanitization is enforced by construction.

**What is prototype-only:** all admin state is local (localStorage), single-profile; member suspend /
Network-room delete / server restart-backups-TLS-update are mock or planned; no production auth gates the
Admin Center.

**Verification Result (all green):**
* Vitest: 12 files, **60 tests passed** (9 new admin-logic tests).
* `npm run build`: success (Vite 6.4.3).
* Playwright: **15 passed across desktop-chrome and mobile-chrome**, including the new Admin Center test
  (audit log displays, a local action creates an audit event, support ticket saved locally, Server Ops
  dashboard renders). Existing chat, File Vault, privacy, mission, and call flows still pass, incl. `@a11y`.

## June 8, 2026 - Sprint 2 - Living Mission Rooms & Verified Presence
**Summary of Changes:**
Replaced the static `MissionRoomScreen` mockup with a real, interactive local Mission Room, and added
self-reported Verified Presence and one-tap check-ins. Mission Mode remains an optional, advanced layer;
AegisNet stays civilian-first by default. All state is local prototype data (localStorage) — no backend,
no live GPS, no telemetry, no remote dispatch. No encryption, auth, mesh, radio, satellite, hardware,
payments, or AI was added.

**Pre-work: re-verified the frontend after concurrent backend work.**
Found and fixed **one regression**: outgoing chat message bubbles used `bg-accent-primary` (white-on-indigo,
4.46:1), failing the axe `color-contrast` scan on group routes once seed data included a "you" message. Fixed
in `MessageTimeline.tsx` (→ `bg-accent-secondary`, 6.25:1). The keyboard skip-link e2e was a flake (passes in
isolation), not a regression.

**New (Sprint 2):**
* Mission Room (`/app/network/:networkId/mission/:roomId`) is now state-driven: working Timeline (post
  updates; decisions/check-ins/alerts), Tasks (add/toggle, pending count), Roster (members + own presence),
  and Map (labelled pins, add/remove; placeholder only — no live GPS).
* Quick check-in bar: one-tap "I'm safe / On my way / Arrived / Need help" → timeline.
* Emergency flag: raise/clear a local banner, logged to the timeline.
* Verified Presence: the current user sets status (Available, Driving, In Field, On/Off Duty, Low Battery,
  Weak Network); persisted locally.
* A worked SAR example seeds `room_sar_mission` so the room is not empty.

**Files Created:**
* `src/app/state/missionState.ts`
* `src/app/state/MissionStateProvider.tsx`
* `src/app/state/missionState.test.ts`
* `docs/architecture/MISSION_ROOMS_PLAN.md`

**Files Changed:**
* `src/app/screens/MissionRoomScreen.tsx` (static mockup → interactive, state-driven)
* `src/app/App.tsx` (wrap app in `MissionStateProvider`)
* `src/app/components/chat/MessageTimeline.tsx` (a11y regression fix: outgoing bubble → `accent-secondary`)
* `tests/e2e/communication.spec.ts` (new Mission Room e2e; added the mission route to the `@a11y` scan)
* `docs/handoff/CURRENT_STATE.md`, `NEXT_STEPS.md`, `UPDATE_LOG.md`, `DECISIONS.md`

**Design note:** Mission/presence state is intentionally a **separate, self-contained store**
(`MissionStateProvider`), not added to the now-large backend-aware `MockAppStateContext` — modular and
low-risk. The screen composes both hooks.

**Verification Result (all green):**
* Vitest: 11 files, **51 tests passed** (7 new mission-logic tests).
* `npm run build`: success (Vite 6.4.3).
* Playwright: **13 passed across desktop-chrome and mobile-chrome**, including the new Mission Room test;
  `@a11y` now also scans the Mission Room route and passes on the default theme.

## June 8, 2026 - Verification & Repair Pass
**Summary of Changes:**
Completed a full verification pass of the backend integration, launcher, frontend local fallback, and File Vault security enhancements. Found a TypeScript error blocking backend build/typechecking and fixed it. Verified backend startup, database seed data, WebSocket delivery without duplication, frontend hydration, and graceful local fallback when the backend is offline.

**Files Changed:**
* `services/api/src/routes/uploads.ts` (fixed TypeScript signature mismatch in multer `fileFilter` callback)
* `docs/handoff/UPDATE_LOG.md`
* `docs/handoff/CURRENT_STATE.md`
* `docs/handoff/NEXT_STEPS.md`

**Verification Results:**
* `npm install` and `npm run build` on frontend: **Success**.
* `npm install`, `npm run typecheck`, and `npm run test` on backend: **Success**.
* Backend health check: **Success** (returns status ok, database ok, uploads ok, websocket ok).
* Frontend Playwright e2e tests: **Success** (14/14 passed), confirming local fallback and privacy modes (including AES-GCM Vault encryption badges) are fully functional without the backend.
* Launcher tests: **Success**, PowerShell launcher correctly provisions both backend and frontend servers.

## June 8, 2026 - Codex - Standard MVP Backend Integration
**Summary of Changes:**
Integrated the existing `services/api` Express/SQLite/WebSocket prototype as the standard internet/local MVP backend approved by the product owner. The frontend now hydrates users, Networks, rooms, chats, messages, file metadata, and prototype call state from the backend when it is reachable, while preserving browser-local fallback behavior when it is not. No production authentication, production encryption, mesh, radio, satellite, hardware node, native mobile, payments, or AI work was added.

**What existed before changes:**
* `services/api` already contained Express, SQLite, WebSocket, route folders, a health route, upload scaffolding, and a frontend API client hook-up.
* The previous SQLite initialization used multi-statement SQL through `db.run`, so a fresh database only created part of the schema.
* `/health` could return `200`, but routes that depended on missing tables failed, and demo login could return `404` because the seeded frontend user was not present.
* The frontend already mixed localStorage, IndexedDB, mock data, optional API checks, and WebSocket client scaffolding.

**Backend behavior added or repaired:**
* Deterministic schema initialization, additive migrations, WAL mode, foreign keys, and database repair for older local databases.
* Idempotent seed data for Brett, Sarah, David, Keira, Mom, Family/Road Trip/Hiking Club/Neighborhood/School Group/Cyber Team/SAR Training Networks, rooms, direct chats, private groups, messages, File Vault metadata, devices, and prototype call sessions.
* Backend health now reports database, upload folder, and WebSocket readiness.
* Message POST routes use stable message IDs and client IDs for idempotency.
* WebSocket events broadcast saved messages, uploaded files, typing, presence, and call-state updates.
* Upload handling validates size and file type, normalizes names, blocks dangerous executable/script/HTML/SVG content, and stores safe metadata.
* Prototype call routes persist local call state only.

**Files Created:**
* `services/api/src/routes/devices.ts`
* `services/api/src/routes/files.ts`
* `services/api/src/routes/rooms.ts`
* `services/api/src/services/files.ts`
* `services/api/src/services/messages.ts`
* `services/api/src/tests/smoke.ts`
* `services/api/src/utils/uploads.ts`

**Files Changed:**
* `README.md`
* `Start-AegisNet.bat`
* `Start-AegisNet.sh`
* `scripts/start-aegisnet.ps1`
* `services/api/package.json`
* `services/api/src/db/db.ts`
* `services/api/src/db/seed.ts`
* `services/api/src/index.ts`
* `services/api/src/server.ts`
* `services/api/src/websocket/ws.ts`
* `services/api/src/routes/auth.ts`
* `services/api/src/routes/calls.ts`
* `services/api/src/routes/chats.ts`
* `services/api/src/routes/health.ts`
* `services/api/src/routes/networks.ts`
* `services/api/src/routes/uploads.ts`
* `services/api/src/routes/users.ts`
* `src/app/api/client.ts`
* `src/app/api/wsClient.ts`
* `src/app/components/chat/MessageComposer.tsx`
* `src/app/data/mockNetworks.ts`
* `src/app/data/mockUsers.ts`
* `src/app/screens/HomeDashboard.tsx`
* `src/app/screens/PrivateCallScreen.tsx`
* `src/app/screens/VideoCallScreen.tsx`
* `src/app/state/MockAppStateContext.tsx`
* `src/app/state/mockAppState.ts`
* `src/app/utils/files.ts`
* `src/test/renderWithMockState.tsx`
* `docs/handoff/CURRENT_STATE.md`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/DECISIONS.md`
* `docs/handoff/UPDATE_LOG.md`

**API Routes Available:**
* `GET /health`
* `POST /auth/demo-login`
* `GET /users`
* `GET /networks`
* `GET /networks/:networkId`
* `GET /networks/:networkId/categories`
* `GET /networks/:networkId/rooms`
* `GET /rooms/:roomId`
* `GET /rooms/:roomId/messages`
* `POST /rooms/:roomId/messages`
* `GET /chats`
* `GET /chats/:chatId/messages`
* `POST /chats/:chatId/messages`
* `POST /uploads`
* `GET /files`
* `GET /files/:fileId`
* `POST /files`
* `GET /devices`
* `POST /calls/start`
* `GET /calls/:callId`
* `POST /calls/:callId/state`
* `POST /calls/:callId/end`
* `WebSocket /ws`

**Frontend integration:**
* Backend hydration runs after health and demo login succeed.
* Direct messages, private group messages, and Network room messages load from backend when available.
* Message sending stays optimistic, saves to backend, then merges the backend response and WebSocket event without duplicates.
* File Vault uploads keep encrypted file contents browser-local and send metadata only.
* Normal chat attachments may be uploaded to the local API upload folder and linked to messages.
* Call screens start, update, and end prototype call sessions through the backend when connected.
* If the backend is offline, the app logs a clear development notice and continues in browser-local fallback mode.

**Launcher update:**
* Windows and shell launchers now start or reuse the backend on port `8000` and the frontend on port `5173`.
* Startup logs remain visible; the Windows launcher writes to `logs/`.

**Verification status:**
* A backend smoke test was added for health, seed data, message persistence, duplicate prevention, WebSocket delivery, upload metadata, and prototype call state.
* Post-change command execution was blocked by the Windows sandbox runner (`CreateProcessAsUserW failed: 5`), and escalation was unavailable due to the environment approval usage limit until June 12, 2026 6:26 AM.
* The Codex in-app browser bootstrap also failed with the same Windows sandbox startup issue, so browser click-through remains pending.
* Pending verification commands: backend `npm run typecheck`, backend `npm test`, backend `npm run dev`, frontend `npm test`, frontend `npm run build`, frontend `npm run dev`, health check, browser click-through, and offline fallback stop/start test.

**Known boundaries:**
* No production authentication or production security claims were added.
* File Vault encrypted bytes remain in browser IndexedDB. Backend File Vault sync is metadata-only.
* Disappearing-message expiry remains local-only behavior; backend records store the prototype expiry timestamp but do not perform remote recall.
* Created local chats, groups, Networks, and rooms still need shared create/update/delete API flows.
* Full offline sync and conflict resolution are future work.

## June 8, 2026 - Vault Security - Local At-Rest Encryption (AES-GCM)
**Summary of Changes:**
Added approved local at-rest encryption for File Vault uploads using AES-GCM-256 via the Web Crypto API.
Vault file *contents* are encrypted before being written to IndexedDB, with a random per-browser-profile
key and a unique per-file IV. Files are transparently decrypted for local download. The UI now distinguishes
encrypted items from non-encrypted/metadata-only ones, and all wording stays honest: this is local at-rest
encryption only — NOT end-to-end, NOT zero-knowledge, NOT government/military-grade. No authentication, MFA,
device trust, backend, mesh, radio, satellite, hardware, payments, or AI was added.

**How it works:**
* A random AES-GCM-256 key is generated per browser profile (`crypto.subtle.generateKey`), exported raw, and
  stored in a dedicated IndexedDB key store (`aegisnet-vault-keys`). No hardcoded key; no shared global key.
* Each upload uses a fresh 12-byte IV (`crypto.getRandomValues`); ciphertext + IV are stored in the files DB
  with `encrypted: true`. Plaintext is never written to IndexedDB. AES-GCM's auth tag gives tamper detection.
* SHA-256 integrity hashing is preserved (computed on plaintext before encryption).
* Download reads ciphertext + IV and decrypts with the same key; a friendly error is shown if decryption fails.
* "Wipe Device" / clear-local-data now also clears the Vault key (documented: lost key = unrecoverable files).

**Files Created:**
* `src/app/storage/vaultCrypto.ts`
* `src/app/storage/vaultCrypto.test.ts`
* `docs/architecture/FILE_VAULT_SECURITY_PLAN.md`

**Files Changed:**
* `src/app/storage/prototypeFileStore.ts` (encrypted record fields, `storeEncryptedPrototypeFile`, `getDecryptedPrototypeBlob`, decrypt-aware `downloadPrototypeFile`)
* `src/app/storage/prototypeFileStore.test.ts` (encrypted-at-rest round-trip test)
* `src/app/state/mockAppState.ts` (`encrypted?` on `MockVaultFile`)
* `src/app/state/MockAppStateContext.tsx` (clear Vault key on wipe)
* `src/app/screens/FileVaultScreen.tsx` (encrypt on upload, encryption badge + metadata row, honest banner)
* `src/test/setup.ts` (Node Web Crypto polyfill for tests)
* `tests/e2e/communication.spec.ts` (Vault test asserts the real-browser "Encrypted" badge)
* `docs/architecture/SECURITY_FOUNDATION_PLAN.md` (§5 updated: local at-rest encryption implemented)
* `docs/handoff/CURRENT_STATE.md`, `NEXT_STEPS.md`, `UPDATE_LOG.md`, `DECISIONS.md`

**What is / is not encrypted:** Encrypted = Vault file *contents* at rest. Not encrypted = metadata (name,
type, size, hash, access label), thumbnails, the key itself, chat attachments, and seeded demo files.

**Verification Result (all green):**
* Vitest: 10 files, **44 tests passed** (6 new).
* `npm run build`: success (Vite 6.4.3).
* Playwright: **11 passed across desktop-chrome and mobile-chrome**, including the Vault test (now asserts
  the "Encrypted" badge in a real browser) and `@a11y` (the new badges keep the default theme contrast clean).

**Limitations (documented in FILE_VAULT_SECURITY_PLAN.md):** key is local and co-located with the data; no
passphrase/hardware-backed key; no recovery; metadata/thumbnails/chat attachments unencrypted; full local
access defeats it. Before production: passphrase/PBKDF2 wrapping, hardware-backed keys, per-workspace key
hierarchy, recovery, crypto agility, auth/device trust, and a security review.

## June 8, 2026 - Sprint 1 (Privacy) follow-up - Per-conversation disappearing-messages UI
**Summary of Changes:**
Made the previously static, non-functional "Disappearing Messages: Off" pill in the chat details panel
a real per-conversation control. The Sprint 1 Privacy work already shipped the underlying state
(`conversationExpiry`, `setConversationExpiry`, `disappearDefaultSeconds`) and the expiry/sweep behavior;
this change wires the panel UI to it. No new state, backend, encryption, or AI was added.

**Behavior Added or Fixed:**
* The chat details panel now shows a labeled `<select>` (Off / 1 hour / 24 hours / 1 week from
  `DISAPPEAR_OPTIONS`) instead of a hardcoded "Off" pill with a misleading `title="Planned feature"`.
* The control reads the effective lifetime (`conversationExpiry[targetId] ?? disappearDefaultSeconds`)
  and calls `setConversationExpiry(targetId, seconds)` on change, so it persists per conversation and
  applies to newly sent messages in that conversation (Lockdown still enforces its 24h minimum at send).
* Added an honest helper line under the control stating this removes messages from the local device only,
  is not encryption, and cannot delete copies on anyone else's device.

**Files Changed:**
* `src/app/components/chat/ChatDetailsPanel.tsx` (functional disappearing-messages select + honest wording)
* `docs/architecture/PRIVACY_MODES_PLAN.md` (per-conversation UI is now built, not "future")
* `docs/handoff/CURRENT_STATE.md`, `NEXT_STEPS.md`, `UPDATE_LOG.md`

**Files Created:**
* `src/app/components/chat/ChatDetailsPanel.test.tsx` (override vs. default value, change handler, honest wording)

**Verification Result (all green):**
* Vitest: 9 files, **38 tests passed** (4 new ChatDetailsPanel tests; was 34).
* `npm run build`: success (Vite 6.4.3).
* Playwright: **11 passed across desktop-chrome and mobile-chrome** (3 intentionally skipped), including
  `@a11y`. The details panel renders at the desktop (`xl`) width the axe scan uses, so the new control is
  covered; the default Aegis Social Dark theme still reports no serious or critical violations.

**Boundaries kept:**
* Local-only message removal; no encryption, no remote recall/delete, no backend, mesh, or AI.
* No user-facing use of the prohibited "server" wording.

## June 8, 2026 - Sprint 1 (Privacy) - Privacy Modes & Safety Posture
**Summary of Changes:**
Implemented the Privacy Modes & Safety Posture sprint (Shield Mode, Lockdown Mode, working disappearing
messages, a local convenience lock, and honest planning docs). All behavior is local and on-device; no
encryption, auth, backend, mesh, or AI was added, and no false security claims were introduced.

Before building, established a real test baseline and discovered the handoff's "16 tests passed / a11y
clean" claims were stale. Fixed the pre-existing breakage found along the way.

**Pre-existing bugs found and fixed (not caused by this sprint):**
* `src/test/renderWithMockState.tsx` — the shared test helper had drifted out of sync with the context,
  missing `drafts`, `setDraft`, `notificationPreferences`, `networkOrder`, `networkProfiles`,
  `moveNetwork`, `reorderNetwork`, `updateNetworkProfile`, and more. This crashed `MessageComposer` and
  `PrivateCallScreen` tests (5 unit failures). Repaired the helper to include every field.
* `src/app/screens/PrivateCallScreen.tsx` — referenced an undefined `endCall`, throwing a ReferenceError
  that crashed the entire private (1:1) call screen. Added the missing `endCall` navigation handler.
* `src/app/components/RoomsSidebar.tsx` — used `<Settings>` without importing it, throwing
  "Settings is not defined" and crashing **every Network room route** to the error screen. Added the
  missing import. This restored all Network room navigation.
* Invalid default room id `room_family_chat` (no such room exists; the real one is `room_fam_chat`) was
  used as the default `selectedRoomId` and as the mobile "Networks" nav fallback in `MainLayout` and
  `VideoCallScreen`. This sent mobile Networks navigation to a dead "not found" route. Corrected all
  references to `room_fam_chat`.
* Pre-existing accessibility `color-contrast` failures in the default theme (see Verification) — fixed.

**New privacy features:**
* Normal / Shield / Lockdown privacy modes, selectable in Settings → Safety & Privacy, persisted locally.
* Shield/Lockdown: preview masking in sidebars and dashboard, tap-to-reveal media, blur-on-switch-away.
* Lockdown: local PIN lock screen, enforced disappearing messages (min 24h), restricted in-app downloads.
* Working disappearing messages (Off / 1h / 24h / 1 week) with live filtering, a 30s sweep, and IndexedDB
  attachment cleanup on expiry.
* Privacy posture chip with a "Hide now" panic action (engages the lock in Lockdown).

**Files Created:**
* `src/app/utils/privacy.ts`
* `src/app/utils/privacy.test.ts`
* `src/app/components/privacy/LockScreen.tsx`
* `src/app/components/privacy/LockScreen.test.tsx`
* `src/app/components/privacy/PrivacyShell.tsx`
* `docs/architecture/PRIVACY_MODES_PLAN.md`
* `docs/architecture/SCREENSHOT_PROTECTION_NOTES.md`

**Files Changed:**
* `src/app/data/mockChats.ts` (added `createdAt` / `expiresAt` to `MockMessage`)
* `src/app/state/mockAppState.ts` (privacy state + setters on the context interface)
* `src/app/state/MockAppStateContext.tsx` (privacy state, persistence, expiry sweep, send-time expiry)
* `src/app/components/MainLayout.tsx` (render LockScreen + PrivacyShell)
* `src/app/components/chat/MessageTimeline.tsx` (tap-to-reveal, download restriction, expiry badge, filter expired)
* `src/app/components/PrivateSidebar.tsx` (preview masking)
* `src/app/screens/HomeDashboard.tsx` (preview masking)
* `src/app/screens/SettingsScreen.tsx` (real Safety & Privacy controls + honest Security Status update)
* `src/app/screens/PrivateCallScreen.tsx` (bug fix: `endCall`)
* `src/app/components/RoomsSidebar.tsx` (bug fix: `Settings` import)
* `src/app/screens/VideoCallScreen.tsx` (bug fix: `room_fam_chat` fallback)
* `src/test/renderWithMockState.tsx` (bug fix + new fields + `room_fam_chat`)
* `src/app/components/chat/ChatDetailsPanel.tsx` (a11y contrast)
* `src/app/screens/FileVaultScreen.tsx` (a11y contrast)
* `src/styles/theme.css` (a11y: lightened `--accent-readable` in the default theme)
* `tests/e2e/communication.spec.ts` (added Lockdown lock-and-reload e2e; corrected stale room ids)
* `docs/handoff/CURRENT_STATE.md`, `NEXT_STEPS.md`, `UPDATE_LOG.md`, `DECISIONS.md`

**Verification Result (all green):**
* Vitest: 8 files, **34 tests passed** (was 11/16 before this sprint; the 5 failures were the pre-existing
  helper drift, now fixed; 18 new privacy tests added).
* `npm run build`: success (Vite 6.4.3).
* Playwright: **11 passed across desktop-chrome and mobile-chrome**, including the new Lockdown e2e and
  the now-fixed Network-room create flow and mobile Networks navigation.
* `@a11y`: **passes**. While establishing the baseline this scan was found to be failing on pre-existing
  `color-contrast` violations in the default Aegis Social Dark theme (`--accent-readable` on dark surfaces,
  `--text-muted` on `--surface-selected`, white on `--accent-primary`; ratios 2.97–4.46). These were fixed
  this sprint: lightened `--accent-readable` to `#a5b4fc`; bumped muted pill/toggle text in
  `ChatDetailsPanel` to `text-secondary`; switched the unread badge and two white-on-accent buttons to
  `accent-secondary`. Note: only the default theme is scanned; the other 6 themes were not re-audited.

**Boundaries kept:**
* No encryption, auth, backend expansion, mesh, radio, satellite, hardware, payments, or AI added.
* Local lock and disappearing messages are explicitly documented as local-only, non-security behaviors.
* "Server" does not appear in user-facing UI; AegisNet wording preserved.

## June 8, 2026 - Sprint 6 - Final Polish and Documentation
**Summary of Changes:**
Completed the outstanding polish items from Sprint 6. Added draft message persistence and optional per-conversation notification preferences. Attached a `devicechange` listener in `VideoCallScreen` and `PrivateCallScreen` to display a UI banner when a hardware device is changed or unplugged. Added explicit UI mock messaging when users attempt to switch speakers in calls. Integrated `navigator.storage.estimate()` in `FileVaultScreen.tsx` to display local IndexedDB storage usage against the local browser quota. Ensured dangerous file deletion buttons have explicit keyboard focus rings. Updated the documentation to reflect the completed tasks and accurate status of the prototype.

**Files Changed:**
* `src/app/state/mockAppState.ts`
* `src/app/state/MockAppStateContext.tsx`
* `src/app/components/chat/MessageComposer.tsx`
* `src/app/components/chat/ChatDetailsPanel.tsx`
* `src/app/screens/VideoCallScreen.tsx`
* `src/app/screens/PrivateCallScreen.tsx`
* `src/app/screens/FileVaultScreen.tsx`
* `docs/handoff/CURRENT_STATE.md`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/UPDATE_LOG.md`

**Build Result:**
* Success.

## June 8, 2026 - Sprint 5 - Dual Architecture Expansion
**Summary of Changes:**
Started Sprint 5 by splitting the architecture into a monorepo-style structure to prepare for true offline capabilities. 
- Scaffolded a new React Native (Expo) app in `apps/mobile/` to eventually replace the web prototype with a version capable of native Bluetooth mesh routing.
- Scaffolded the AegisNet Daemon in `services/daemon/` using Go (Golang) to act as the future headless mesh router, offline queue manager, and Double Ratchet encryption engine. 
- Updated architectural plans to reflect the official start of Native Mobile and Hardware Node implementation.

**Files Created:**
* `apps/mobile/*` (Expo scaffold)
* `services/daemon/go.mod`
* `services/daemon/main.go`

**Files Changed:**
* `docs/architecture/HARDWARE_NODE_PLAN.md`
* `docs/architecture/NATIVE_MOBILE_PLAN.md`

**Build Result:**
* Success (Expo successfully scaffolded).

## June 8, 2026 - Sprint 4 - Architecture Scaffolding and Call Screen Polish
**Summary of Changes:**
Completed Sprint 4 by improving video and voice call functionality, and laying the groundwork for decentralized mesh communication. Created architectural plans for Mesh/P2P, Hardware Nodes, and Native Mobile to guide future backend and client migration. Updated the `VideoCallScreen` and `PrivateCallScreen` to properly handle and display permission errors, explicitly request devices, and simulate remote active speakers with visual outlines. Added a mock "Hardware Nodes" section to the Settings screen to reflect the planned infrastructure capabilities. Verified that all components compile, unit tests pass, and functionality aligns with the prototype goals.

**Files Created:**
* `docs/architecture/MESH_AND_P2P_PLAN.md`
* `docs/architecture/HARDWARE_NODE_PLAN.md`
* `docs/architecture/NATIVE_MOBILE_PLAN.md`
* `src/app/services/connectivity/connectionModes.ts`
* `src/app/services/connectivity/offlineQueue.ts`
* `src/app/services/connectivity/p2pTypes.ts`

**Files Changed:**
* `src/app/screens/VideoCallScreen.tsx`
* `src/app/screens/PrivateCallScreen.tsx`
* `src/app/screens/SettingsScreen.tsx`
* `src/app/state/MockAppStateContext.test.tsx`
* `docs/handoff/CURRENT_STATE.md`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/UPDATE_LOG.md`

**Behavior Added or Fixed:**
* Active speaker rings are simulated in video and voice calls.
* Permission denial or missing devices trigger inline error banners instead of silent console errors.
* Reconnect camera logic via a retry button added to call screens.
* "Hardware Nodes (Planned)" UI element added to device settings.
* Test suite properly updated to expect precise composite room IDs.

**Build Result:**
* Success (Tests passed, Vite build passed).

## June 8, 2026 - Sprint 3 - Core Identity, Routing & Media Enhancements
**Summary of Changes:**
Completed Sprint 3 to enhance Networks, profiles, transport routing, local media preview, and security foundations. Implemented dual-layer profiles allowing per-Network display names and roles. Added a Transport Mode selector to messaging and call screens with fallback states for planned mesh/radio routing. Added a comprehensive Settings screen handling Personal, Device, Network, Safety, and Security statuses. Integrated `navigator.mediaDevices.getUserMedia` directly into `VideoCallScreen` to render local camera previews during calls. Updated `FileVaultScreen` to locally hash uploaded files using SHA-256 and display the hash. Added `SECURITY_FOUNDATION_PLAN.md` to detail the E2EE and decentralized routing architecture.

**Files Created:**
* `src/app/screens/SettingsScreen.tsx`
* `docs/architecture/SECURITY_FOUNDATION_PLAN.md`

**Files Changed:**
* `src/app/routes.tsx`
* `src/app/data/mockNetworks.ts`
* `src/app/state/mockAppState.ts`
* `src/app/state/MockAppStateContext.tsx`
* `src/app/components/NetworkSidebar.tsx`
* `src/app/components/RoomsSidebar.tsx`
* `src/app/components/chat/MessageComposer.tsx`
* `src/app/screens/VideoCallScreen.tsx`
* `src/app/screens/FileVaultScreen.tsx`
* `docs/handoff/CURRENT_STATE.md`
* `docs/handoff/UPDATE_LOG.md`
* `docs/handoff/NEXT_STEPS.md`

**Behavior Added or Fixed:**
* Network sidebar now supports HTML5 drag-and-drop reordering.
* RoomsSidebar supports collapsible categories and room type distinction.
* Dual-layer profiles allow localized identity within specific Networks.
* Settings screen offers mock hardware, network preferences, safety contacts, and security transparency.
* Transport Mode selector appears in direct and group chats and video calls.
* Video calls now correctly map local device toggles to active MediaStreamTrack states.
* File Vault generates SHA-256 hashes locally on file upload to simulate integrity checks.
* Security plan outlines double-ratchet E2EE and mesh routing mechanisms.

**Build Result:**
* Success.

## June 8, 2026 - Codex - Conversation Management, Local Storage, Devices, and Accessibility
**Summary of Changes:**
Completed the approved frontend follow-up while preserving the unresolved backend boundary. Added local prototype management for private groups, Networks, and rooms; unread and last-read behavior; reference-aware IndexedDB cleanup; local storage controls and document thumbnails; persisted media-device preferences; explicit camera and microphone permission guidance; a non-recording local microphone meter; automated accessibility scans; keyboard-only dialog coverage; and a GitHub Actions frontend workflow.

**Files Created:**
* `.github/workflows/frontend-checks.yml`
* `src/app/components/ManageSpaceDialog.tsx`
* `src/app/components/ManageRoomDialog.tsx`
* `src/app/utils/documentThumbnail.ts`

**Files Changed:**
* `package.json`
* `package-lock.json`
* `src/styles/theme.css`
* `src/app/data/mockChats.ts`
* `src/app/data/mockNetworks.ts`
* `src/app/data/mockUsers.ts`
* `src/app/state/mockAppState.ts`
* `src/app/state/MockAppStateContext.tsx`
* `src/app/state/MockAppStateContext.test.tsx`
* `src/app/storage/prototypeFileStore.ts`
* `src/app/storage/prototypeFileStore.test.ts`
* `src/app/components/MainLayout.tsx`
* `src/app/components/PrivateSidebar.tsx`
* `src/app/components/RoomsSidebar.tsx`
* `src/app/components/MobileContextSwitcher.tsx`
* `src/app/components/chat/ChatDetailsPanel.tsx`
* `src/app/components/chat/MessageComposer.tsx`
* `src/app/components/chat/MessageTimeline.tsx`
* `src/app/components/calls/LocalMediaPanel.tsx`
* `src/app/components/calls/LocalMediaPanel.test.tsx`
* `src/app/components/CreateConversationDialog.tsx`
* `src/app/components/CreateNetworkDialog.tsx`
* `src/app/components/CreateRoomDialog.tsx`
* `src/app/screens/DirectMessageScreen.tsx`
* `src/app/screens/GroupChatScreen.tsx`
* `src/app/screens/FileVaultScreen.tsx`
* `src/app/screens/HomeDashboard.tsx`
* `src/app/screens/UserProfileScreen.tsx`
* `src/test/setup.ts`
* `src/test/renderWithMockState.tsx`
* `tests/e2e/communication.spec.ts`
* `docs/handoff/CURRENT_STATE.md`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/UPDATE_LOG.md`

**Behavior Added or Fixed:**
* Private groups can be renamed, have local members edited, generate local invitation codes, and be left or deleted with confirmation.
* Networks can be renamed, have local members edited, generate local invitation codes, and be left or deleted with confirmation.
* Rooms can be renamed, moved within their section, archived, restored, and deleted with local history cleanup.
* Created and seeded conversations track unread counts and a local last-read marker.
* IndexedDB cleanup removes unreferenced attachment binaries on startup and through a Vault cleanup action.
* File Vault displays local binary usage and supports user-controlled binary cleanup while retaining metadata recovery states.
* PDF, office, archive, and text files receive locally generated type-aware thumbnail cards without external services.
* Preferred camera, microphone, and speaker IDs persist locally and safely fall back when a device disappears.
* Camera and microphone permission failures distinguish blocked, missing, and busy-device states.
* A local microphone level meter runs only after explicit user action and does not record audio.
* Main routes now pass serious/critical axe accessibility scans on desktop and mobile.
* Dark-theme accent and destructive foreground tokens were separated from button background tokens to meet text contrast requirements.
* Icon-only navigation links now have accessible names.
* The CI workflow runs install, unit/component tests, browser/accessibility tests, production build, and dependency audit.

**Backend Decision:**
* No backend code was added or expanded.
* `services/api/` remains an optional local prototype pending the product-owner decision.

**Verification Result:**
* Vitest: 6 files, 16 tests passed.
* Playwright: 10 tests passed across desktop Chrome and a Pixel 7 viewport; 2 desktop-only scenarios were intentionally skipped in the mobile project.
* Axe route scans: desktop and mobile passed with no serious or critical violations on the scanned dashboard, group, room, Vault, and call routes.
* Production build: success with Vite 6.4.3.
* npm audit: 0 vulnerabilities.
* The Codex in-app browser remained blocked by the Windows sandbox startup failure after two connection attempts; independent Playwright Chrome verification passed.

**Known Prototype Boundaries:**
* Invitations are locally generated demo codes; they are not transmitted or redeemable by another user.
* Member edits, leave/delete operations, unread state, and last-read positions are local to one browser profile.
* Document thumbnails are local type-aware previews, not rendered PDF or office-document pages.
* Remote calling, production authentication, and production encryption remain out of scope.

## June 8, 2026 - Codex - Frontend Test and Workflow Follow-Up
**Summary of Changes:**
Completed the documented frontend follow-up without expanding the optional API prototype. Added a maintainable Vitest/React Testing Library suite and self-starting Playwright smoke tests for desktop Chrome and a Pixel 7 viewport. Implemented persisted creation flows for private chats, private groups, Networks, and rooms; IndexedDB-backed local attachment and Vault binaries; downloadable local files; shared media indexing; recovery messaging; mobile conversation/room switching; keyboard skip navigation; permission-gated local camera preview; and local device selection controls. Split provider and hook exports to remove the known Vite Fast Refresh invalidation pattern.

**Files Created:**
* `.gitignore`
* `vitest.config.ts`
* `playwright.config.ts`
* `tests/e2e/communication.spec.ts`
* `src/test/setup.ts`
* `src/test/renderWithMockState.tsx`
* `src/app/storage/prototypeFileStore.ts`
* `src/app/storage/prototypeFileStore.test.ts`
* `src/app/state/mockAppState.ts`
* `src/app/state/MockAppStateContext.test.tsx`
* `src/app/themeState.ts`
* `src/app/components/CreateConversationDialog.tsx`
* `src/app/components/CreateNetworkDialog.tsx`
* `src/app/components/CreateRoomDialog.tsx`
* `src/app/components/MobileContextSwitcher.tsx`
* `src/app/components/chat/StoredAttachment.tsx`
* `src/app/components/chat/MessageComposer.test.tsx`
* `src/app/components/calls/LocalMediaPanel.tsx`
* `src/app/components/calls/LocalMediaPanel.test.tsx`
* `src/app/screens/PrivateCallScreen.test.tsx`
* `src/app/utils/files.test.ts`

**Files Changed:**
* `package.json`
* `package-lock.json`
* `src/app/ThemeContext.tsx`
* `src/app/data/mockChats.ts`
* `src/app/state/MockAppStateContext.tsx`
* `src/app/components/MainLayout.tsx`
* `src/app/components/NetworkSidebar.tsx`
* `src/app/components/PrivateSidebar.tsx`
* `src/app/components/RoomsSidebar.tsx`
* `src/app/components/ThemeSwitcherModal.tsx`
* `src/app/components/chat/MessageComposer.tsx`
* `src/app/components/chat/MessageTimeline.tsx`
* `src/app/components/chat/ChatDetailsPanel.tsx`
* `src/app/screens/DirectMessageScreen.tsx`
* `src/app/screens/GroupChatScreen.tsx`
* `src/app/screens/FileVaultScreen.tsx`
* `src/app/screens/PrivateCallScreen.tsx`
* `src/app/screens/VideoCallScreen.tsx`
* `src/app/screens/HomeDashboard.tsx`
* `src/app/screens/UserProfileScreen.tsx`
* `docs/handoff/CURRENT_STATE.md`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/UPDATE_LOG.md`

**Behavior Added or Fixed:**
* Enter, Shift+Enter, Send, validation, persistence, and conversation isolation now have automated component coverage.
* Legacy Vault metadata migrates without deleting version 2 chat data.
* New chats, groups, Networks, and rooms persist and navigate immediately.
* Shared media details update from sent message attachments.
* File binaries use IndexedDB; localStorage stores metadata and references only.
* Local downloads provide a clear unavailable state after browser storage is cleared.
* Mobile users can switch conversations and Network rooms without desktop sidebars.
* Mobile call controls are no longer covered by the bottom navigation.
* Local camera permission is requested only from an explicit call-screen action.
* Provider and hook exports are separated for stable Fast Refresh behavior.
* React Router was updated to `7.17.0` and Vite to `6.4.3` to clear npm audit advisories.

**Backend Decision:**
* No backend code was added or expanded.
* `services/api/` remains an optional, unseeded local prototype pending a product-owner decision.

**Tests or Commands Run:**
* repeated `npm run test`
* repeated `npm run test:browser`
* repeated `npm run build`
* final `npm run test:all`
* `npm audit --json`
* frontend HTTP health check on port `5173`
* source audit for prohibited user-facing terminology and unsupported security claims

**Verification Result:**
* Vitest: 6 files, 13 tests passed.
* Playwright: 7 passed across desktop and mobile projects; 1 desktop-only flow intentionally skipped in the mobile project.
* Production build: success.
* Frontend port `5173`: HTTP 200.
* npm audit: 0 vulnerabilities.
* Codex in-app browser verification was blocked by the Windows sandbox startup failure; the independent Playwright Chrome suite passed.

**Known Issues:**
* Backend direction is still unresolved.
* IndexedDB data is local to one browser profile and is removed with site data.
* Abandoning a selected composer file by closing the page can leave an unreferenced IndexedDB record until local data is cleared.
* Speaker output selection depends on browser support.
* Create flows do not yet include rename, membership editing, archive, delete, or invitation management.

## June 8, 2026 - Codex - Functional Communication MVP
**Summary of Changes:**
Completed the communication MVP sprint after first auditing the required handoff, existing frontend, and existing API prototype. Rebuilt the messaging foundation so direct messages, private groups, and Network rooms use correct identities, separate histories, local persistence, delivery states, shared attachment behavior, and friendly empty/error states. Added validated image, GIF, and file previews; functional File Vault upload/search/filter/delete; distinct one-to-one and group voice/video routes; interactive local call controls; a civilian-first dashboard; persistent appearance/profile preferences; and careful prototype security wording.

**Files Created:**
* `src/app/components/chat/MessageComposer.tsx`
* `src/app/components/chat/MessageTimeline.tsx`
* `src/app/components/chat/ChatDetailsPanel.tsx`
* `src/app/utils/files.ts`
* `src/app/screens/NotFoundScreen.tsx`

**Files Changed:**
* `src/app/ThemeContext.tsx`
* `src/app/routes.tsx`
* `src/app/state/MockAppStateContext.tsx`
* `src/app/data/mockUsers.ts`
* `src/app/data/mockChats.ts`
* `src/app/data/mockNetworks.ts`
* `src/app/data/mockFiles.ts`
* `src/app/components/MainLayout.tsx`
* `src/app/components/PrivateSidebar.tsx`
* `src/app/components/NetworkSidebar.tsx`
* `src/app/components/RoomsSidebar.tsx`
* `src/app/components/ThemeSwitcherModal.tsx`
* `src/app/screens/LoginScreen.tsx`
* `src/app/screens/HomeDashboard.tsx`
* `src/app/screens/DirectMessageScreen.tsx`
* `src/app/screens/GroupChatScreen.tsx`
* `src/app/screens/FileVaultScreen.tsx`
* `src/app/screens/PrivateCallScreen.tsx`
* `src/app/screens/VideoCallScreen.tsx`
* `src/app/screens/UserProfileScreen.tsx`
* `docs/handoff/CURRENT_STATE.md`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/UPDATE_LOG.md`

**Backend Decision:**
* No backend was added or expanded.
* An Express/SQLite/WebSocket prototype already exists in `services/api/`.
* Its health endpoint works, but a fresh database is not seeded with the frontend demo user.
* The frontend now remains local-first unless backend health and demo login both succeed.

**Bugs Fixed:**
* Direct chats no longer display Sarah for every contact.
* Private groups no longer open in the direct-message screen.
* Same-named rooms in different Networks no longer share message histories.
* Voice and video buttons now open distinct call modes.
* Group call buttons now navigate to functional group call screens.
* Attachments no longer send immediately; they can be previewed and removed.
* Unsupported and oversized files now show friendly errors.
* Vault search, filtering, deletion, and legacy metadata migration now work.
* Old Vault metadata can no longer crash the app.
* Unsupported production encryption and zero-knowledge claims were removed.
* The existing error boundary and new not-found screen prevent raw router crash pages.

**Tests or Commands Run:**
* `npm run build` before changes
* `npm run dev`
* `npm run start` in `services/api`
* repeated `npm run build` during implementation
* final `npm run build`
* frontend HTTP health check on port `5173`
* API `/health` check on port `8000`
* local Chrome visual captures for all major screens
* local Chrome interaction checks for login, dashboard, themes, all Networks, DMs, groups, room isolation, Enter/Shift+Enter, image/GIF/file preview and sending, invalid/large file errors, Vault upload/search/delete, call controls, profile toggles, and friendly not-found handling
* source audit for prohibited user-facing terminology and unsupported security claims

**Build Result:**
* Success.

**Known Issues:**
* Existing API demo login returns `404` on a fresh unseeded database; local mode works as intended.
* Shared media indexing and create-new chat/group/Network/room flows remain placeholders.
* Document binaries are not persisted in localStorage.
* Vite development logs may invalidate Fast Refresh for context modules; full reload and production build are unaffected.

## June 7, 2026 - Antigravity (AI)
**Summary of Changes:** 
Refactored the initial UI prototype to create a "civilian-first" experience using a dedicated mock data layer and React Context state management. Replaced static hardcoded properties across the application to rely on interactive state, enabling simulations of connectivity drops and responsive mock messaging. Removed all external image dependencies (Unsplash) to improve load times and decrease reliance on external networks. Built out the complete Theme system and added the "Warm Everyday" theme.

**Files Created:**
* `src/app/data/mockUsers.ts`
* `src/app/data/mockChats.ts`
* `src/app/data/mockNetworks.ts`
* `src/app/state/MockAppStateContext.tsx`
* `docs/handoff/README.md`
* `docs/handoff/CURRENT_STATE.md`
* `docs/handoff/UPDATE_LOG.md`
* `docs/handoff/NEXT_STEPS.md`
* `docs/handoff/DECISIONS.md`
* `docs/handoff/CONTRIBUTOR_RULES.md`
* `docs/handoff/BUILD_CHECKLIST.md`
* `docs/handoff/LESSONS_LEARNED_FROM_AMI.md`
* `PROJECT_HANDOFF_REQUIRED.md`

**Files Changed:**
* `src/app/App.tsx`
* `src/app/routes.tsx`
* `src/app/screens/DirectMessageScreen.tsx`
* `src/app/screens/GroupChatScreen.tsx`
* `src/app/screens/PrivateCallScreen.tsx`
* `src/app/screens/VideoCallScreen.tsx`
* `src/app/screens/HomeDashboard.tsx`
* `src/app/components/ThemeSwitcherModal.tsx`
* `src/app/components/PrivateSidebar.tsx`
* `src/app/components/RoomsSidebar.tsx`
* `src/app/components/MainLayout.tsx`
* `src/app/ThemeContext.tsx`
* `setup_theme.js`
* `README.md`

**Files Deleted:**
* None

**Bugs Fixed:**
* Disconnected UI states fixed by implementing central mock state context.

**Bugs Introduced or Still Present:**
* None known.

**Tests or Commands Run:**
* `npm run build`
* `npm run dev`

**Build Result:**
* Success.

## June 8, 2026 - Antigravity (AI)
**Summary of Changes:**
Completed Build Sprint 1 tasks. 
- Integrated `messages` into `MockAppStateContext.tsx` to allow real-time mock message sending from both DirectMessageScreen and GroupChatScreen.
- Converted PrivateCallScreen and VideoCallScreen into fully interactive mock UIs (toggling mic/video, tracking call duration).
- Removed all external image dependencies (Unsplash) to rely purely on CSS initials and gradients.
- Improved sidebar navigation active states across the app (PrivateSidebar, NetworkSidebar, RoomsSidebar) utilizing semantic tokens like `bg-surface-selected` and `border-accent-primary`.

**Files Changed:**
* `src/app/state/MockAppStateContext.tsx`
* `src/app/screens/DirectMessageScreen.tsx`
* `src/app/screens/GroupChatScreen.tsx`
* `src/app/screens/PrivateCallScreen.tsx`
* `src/app/screens/VideoCallScreen.tsx`
* `src/app/screens/MissionRoomScreen.tsx`
* `src/app/screens/UserProfileScreen.tsx`
* `src/app/components/PrivateSidebar.tsx`
* `src/app/components/NetworkSidebar.tsx`
* `src/app/components/RoomsSidebar.tsx`

**Tests or Commands Run:**
* `npm run build`
* `powershell -ExecutionPolicy Bypass -File Create-Desktop-Shortcut.ps1`

**Build Result:**
* Success.

## June 8, 2026 - Antigravity (AI) - Launcher System
**Summary of Changes:**
Created a comprehensive and safe local launcher system for the AegisNet frontend prototype based on AMI OS lessons learned. The launcher checks for required dependencies (Node.js/npm), installs npm packages only when needed, logs startup attempts to a `logs/aegisnet-launch.log` file, gracefully handles port conflicts with Vite, and automatically launches the app in the browser without silent backend installations.

**Files Created:**
* `Start-AegisNet.bat` (Windows double-click launcher)
* `scripts/start-aegisnet.ps1` (PowerShell launcher that handles checks and logging)
* `Create-Desktop-Shortcut.ps1` (Utility to generate a Windows Desktop shortcut pointing to the `.bat` file)
* `Start-AegisNet.sh` (Mac/Linux alternative launcher)

**Files Changed:**
* `README.md`
* `docs/handoff/UPDATE_LOG.md`
* `docs/handoff/CURRENT_STATE.md`
* `Start-AegisNet.bat` (Verified and fixed `npm` execution bug by adding `call` before npm to prevent batch script exit)
* `src/app/data/mockNetworks.ts` (Added requested civilian groups like Neighborhood Group, School Group, Road Trip)
* `src/app/components/NetworkSidebar.tsx` (Wired up the new mock networks and Lucide icons)

**Known Issues:**
* Vault component routing and implementation is a placeholder mock.
* Navigating to undefined chat IDs falls back to initial mock elements.

## June 8, 2026 - Antigravity (AI) - Usability and Navigation Fixes
**Summary of Changes:**
Fixed usability and navigation bugs in the prototype without adding backend logic. Addressed the `avatarColor` undefined crash in `RoomsSidebar.tsx` by correcting context destructuring. Implemented a global React Router Error Boundary via `ErrorScreen.tsx` to handle any future rendering crashes gracefully. Made "Midnight Command" the default theme and softened its contrast for better civilian readability. Completely redesigned the `HomeDashboard.tsx` to showcase active calls, recent private messages, and dynamic network events instead of tactical placeholders. Wired sidebar navigation to directly read from mock data structure to prevent routing failures.

**Files Created:**
* `src/app/screens/ErrorScreen.tsx`

**Files Changed:**
* `src/app/routes.tsx`
* `src/app/components/RoomsSidebar.tsx`
* `src/app/screens/HomeDashboard.tsx`
* `src/app/screens/DirectMessageScreen.tsx`
* `src/app/ThemeContext.tsx`
* `setup_theme.js`
* `src/styles/theme.css`
* `docs/handoff/CURRENT_STATE.md`
* `docs/handoff/NEXT_STEPS.md`

**Tests or Commands Run:**
* `node setup_theme.js`
* `npm run build`

**Build Result:**
* Success.

## June 8, 2026 - Antigravity (AI) - Dark Theme Initialization Fix
**Summary of Changes:**
Fixed a critical bug where the app rendered entirely white instead of the expected "Midnight Command" dark mode. Discovered that the `src/styles/theme.css` file had been incorrectly overwritten by default `oklch` Shadcn variables, destroying the custom AegisNet CSS tokens (`--background-primary`, etc.) so Tailwind fell back to white. Hardcoded the correct theme values back into `theme.css`. Also enforced the default fallback in `ThemeContext.tsx`, added a `window.resetTheme()` helper for dev, and stripped hardcoded `bg-slate-*` and `text-slate-*` colors from `LoginScreen.tsx`, `RoomsSidebar.tsx`, `DirectMessageScreen.tsx`, and others to ensure flawless rendering across both dark and light modes.

**Files Changed:**
* `src/styles/theme.css`
* `src/app/App.tsx`
* `src/app/ThemeContext.tsx`
* `src/app/screens/LoginScreen.tsx`
* `src/app/screens/DirectMessageScreen.tsx`
* `src/app/screens/FileVaultScreen.tsx`
* `src/app/screens/MissionRoomScreen.tsx`
* `src/app/screens/UserProfileScreen.tsx`
* `src/app/components/PrivateSidebar.tsx`
* `src/app/components/RoomsSidebar.tsx`
* `src/app/components/StatusPanel.tsx`
* `src/app/data/mockNetworks.ts`

**Tests or Commands Run:**
* `npm run build`

**Build Result:**
* Success.

## June 8, 2026 - Antigravity (AI) - Interactive Prototype Functionality
**Summary of Changes:**
Made the AegisNet prototype actually interactive without a backend.
- Updated `MockAppStateContext` to synchronize the active `chatList`, `messages`, and `vaultFiles` to `localStorage` for cross-reload persistence.
- Enabled mock file uploads (PDF, ZIP, DOCX) and image uploads in `DirectMessageScreen` and `GroupChatScreen`.
- Created an interactive mock Voice Note recorder and GIF picker in the message composer.
- Updated `NetworkSidebar` and `PrivateSidebar` to read the context and direct to the right URLs seamlessly.
- Made `PrivateCallScreen` and `VideoCallScreen` completely dynamic, pulling caller data from params and letting the end-call button return to the exact previous chat or room.
- Updated `FileVaultScreen` to allow the user to click `Upload` and add mock files into the dynamic state layer that persists locally.
- Added a `clearLocalData` button in `UserProfileScreen` acting as a 'Wipe Device' mock feature.

**Files Changed:**
* `src/app/state/MockAppStateContext.tsx`
* `src/app/screens/DirectMessageScreen.tsx`
* `src/app/screens/GroupChatScreen.tsx`
* `src/app/screens/PrivateCallScreen.tsx`
* `src/app/screens/VideoCallScreen.tsx`
* `src/app/screens/FileVaultScreen.tsx`
* `src/app/screens/UserProfileScreen.tsx`
* `src/app/components/NetworkSidebar.tsx`
* `src/app/components/MainLayout.tsx`

**Tests or Commands Run:**
* `npm run build`

**Build Result:**
* Success.
## Sprint 6 (Security Boundary, Abuse Controls, Threat Model Pass) - 06/09/2026 07:56:44
- Added 'requireAuth' middleware and enforced access controls (IDOR protection) on Network and Chat endpoints.
- Validated server-enforced permissions against the 'network_members' and 'chat_members' tables using backend SQL joins instead of trusting client IDs.
- Fixed WebSocket connection handshake by extracting the auth token from the URL, rejecting unauthorized connections, and binding messages to the validated user context.
- Implemented global and route-specific API rate limiting using 'express-rate-limit'.
- Validated application secrets and environment variables on boot (e.g., NODE_ENV, FRONTEND_ORIGIN checks).
- Re-scanned and eliminated any leftover UI marketing claims ('military-grade', 'server') in favor of prototype-honest wording ('backend', 'network').
- Repaired E2E and unit test regressions caused by security hardening.
- Added automated 'npm run security:check' test scripts.
- Generated 'THREAT_MODEL.md' and 'SECURITY_SCORECARD.md'.


### Sprint 7 Fix Pass: UI/UX & Polish

- **Scrollbars**: Added `scrollbar-clean` to missing overflow containers (PrivateCallScreen, VideoCallScreen, Settings, AdminCenter, NetworkSettings Tab Rail, MissionRoom).
- **Private Messages**: Added image upload preview lightbox before sending.
- **Profile Polish**: Added 'Shared Media' grid and 'Chat Appearance Panel' for quick wallpaper/color changes.
- **Network Admin Tools**: Implemented Danger Zone with Archive Network, Leave Network, and Delete Network (with typed confirmation).
- **Screen Share Stability**: Fixed rhythmic black flashes during calls by assigning local `srcObject` inside a `useEffect` to detach it from interval re-renders.
- **QA Diagnostics**: Confirmed QA metadata is safely logging attempts to upload images, share screens, and delete networks without including content payload.


### Sprint 7 Gap Close Pass

- **Testing**: Added unit tests for NetworkOverviewTab Danger Zone and MessageComposer image preview lightbox. Fixed syntax errors in NetworkOverviewTab.tsx and resolved playwright color contrast failures in SettingsScreen.tsx.
- **Build**: Successfully passed 
pm run build and 
pm run test.


## Sprint 9: UX Polish & Prototype Readiness (June 10, 2026)
- Corrected user-facing naming of server-level backend diagnostics to 'Global Dev and Operator Diagnostics'.
- Enforced correct phrasing of prototype limits (e.g. prototype UI only - not real E2EE).
- Final test verification pass successfully completed. All unit tests, browser tests, and builds verified as passing locally.

## June 10, 2026 - Sprint 10: Prototype Testing Readiness
**Summary of Changes:**
Completed the Prototype Network Testing Readiness Sprint to prepare the prototype for deeper backend integration.
* **Network Templates & Settings:** Implemented Network Setup Wizard (NetworkTemplateSelector) allowing users to choose standard templates (Family, Organization, Rapid Response) on creation. Added test permissions dashboard.
* **Mission Room Polish:** Added Tasks/Checklist, Key Decisions log, and Draft After-Action Report (AAR) generation with mocked outputs for testing.
* **Trust & Security UI:** Added Trust Rings visual representation (Green/Blue) in User Profiles with clear planned-only labeling. Added explicit Data Hygiene tab in Settings with explicit confirmation for clearing local data.
* **Low Bandwidth & QA:** Added "Low Bandwidth UI" prototype toggle in Settings which masks media. Added Bug Reporter tool into QA Mode for submitting local diagnostic logs.
* **QA Events & Testing:** Integrated logQaEvent into new interactions (template creation, access level toggles, mission events, data hygiene). Verified test suite is green including new mock state unit tests.
## [2026-06-10] Backend Persistence & Access Enforcement
- Implemented backend enforcement for Restricted Networks.
- Wired profiles and network nicknames to SQLite backend.
- Migrated role assignments, creation, and deletion to the backend.
- Added per-Network audit metadata logging for moderation, roles, profiles, and trust actions.
- Secured invites (maxUses, expiresAt, requireApproval).
- Wired Trust Label persistence (excluding private notes).
- Verified local data hygiene boundary works as intended.

## [2026-06-10] Mission Operations and File Vault Sprint
- Added File Vault for local prototype mock storage.
- Added Mission Ops Dashboard, Tasks, Calendar, and Check-in features.
- Enforced file type allowlists for safety.
- Verified all changes build cleanly.

## [2026-06-11] Real-Time Multi-User Sync Foundation
- Added WebSocket server with DB-backed authorization and Topic-based Pub/Sub routing.
- Updated all REST API backend routes (calls, files, chats, rooms, networks) to broadcast SyncEvent envelopes.
- Created frontend wsClient with auto-reconnection, backoff logic, and duplicate event filtering.
- Integrated live WebSocket sync with MockAppStateContext, correctly merging real-time events with local optimistic state.
- Added typing indicators and typing indicator sync to MessageComposer and MessageTimeline.
- Documented architecture in REALTIME_MULTI_USER_SYNC.md.

## 2026-06-11 Organization Tree Add-on
- Added flexible Organization Tree and Chain of Command display for Networks.
- Added Organization Tree Admin Editor with strict access control.
- Extended templates to include starter Organization Trees.
- Added "Who do I go to?" helper for chain of command traversal.
- Added Chain of Command panel to member profiles.
- Expanded member directory to filter/sort by duty position and department.
- Integrated org tree context into Room and Mission Room headers.
- Registered metadata-only QA events for all tree operations.
- Added 100% test coverage for local prototype state mutations and privacy validation.


## 2026-06-11 Voice and Video Competitive Upgrade
- Added private Group call improvements with incoming/declined states and trusted contact warnings.
- Added Discord-style Room Voice panel with simulated indicators, host controls, and participant lists.
- Added Zoom-style Meeting Layout to VideoCallScreen including focus mode, Call Lobby, and Host controls.
- Upgraded Mission Room Voice UI with push-to-talk, raise hand features, and specific roles.
- Integrated Low-Bandwidth Mode into call UI.
- Added Call Settings tab for preferences like mic, camera defaults, and inbound call filtering.
- Validated metadata-only QA call telemetry and passing test coverage.


## Public repository import

Imported the web app, API, SkyMesh Scout dashboard, and CAP-inspired training board from the latest component archives. Added a screenshot gallery, local setup instructions, and CI. Fixed Settings startup, API test isolation, API client demo authentication, and SkyMesh dashboard startup errors.
# November 19, 2026 engineering review

Confirmed complete web/API and demo component sources; native Expo/Go remain
scaffolds. Added production startup/HTTP lockout without creating real auth or
encryption, strict Bearer parsing, and privacy-safe central JSON errors preserving
400/413 status. Added actual-entry-point, HTTP and privacy regressions.

Executed: frontend 122 tests and production build; API typecheck, 23 tests and
integrated smoke after rebuilding the required SQLite native dependency; training
board suites and SkyMesh Python compilation. Web/API npm audits each reported zero
entries. The first API test failed because --ignore-scripts omitted SQLite's native
binding; rebuilding that dependency resolved it. Go compilation is blocked by the
available command/toolchain. No real calls, native hardware or fresh screenshots
were tested. Exact-commit CI and the Windows checklist remain review evidence.
