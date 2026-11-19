# AegisNet QA Bug Bash Checklist

Use this checklist during manual testing to systematically verify prototype behavior.

## Overview

For each item, verify the **Expected Result**. If it fails, document it using the `BUG_REPORT_TEMPLATE.md`. Note the architectural boundary (Local-only, Frontend-only, Backend-backed, or Prototype-only) to help target the fix.

## Checklist

- [ ] **Startup and health**
  - *Expected:* App loads cleanly; Backend `/health` returns 200 without exposing secrets.
  - *Boundary:* Backend-backed.
  - *If fails:* Record console errors, network requests, and `X-Request-ID`.

- [ ] **Demo login**
  - *Expected:* Entering any username logs you into the prototype securely.
  - *Boundary:* Prototype-only.
  - *If fails:* Note if localStorage is corrupted.

- [ ] **Dashboard**
  - *Expected:* Displays active calls, recent DMs, and Network activity cleanly.
  - *Boundary:* Frontend-only mock state.
  - *If fails:* Check console for React rendering errors.

- [ ] **Networks**
  - *Expected:* Networks load, show About information, and populate the sidebar.
  - *Boundary:* Backend-backed via SyncQueue.
  - *If fails:* Check SyncQueue status and backend Network routes.

- [ ] **Rooms**
  - *Expected:* Rooms load within a Network, drag-and-drop category reordering works locally.
  - *Boundary:* Backend-backed (CRUD) / Local-only (Drag-and-drop).
  - *If fails:* Note UI layout issues or 500 API errors.

- [ ] **Direct messages**
  - *Expected:* Private 1:1 chat persists history and routes correctly.
  - *Boundary:* Backend-backed.
  - *If fails:* Check Chat metadata.

- [ ] **Private group chats**
  - *Expected:* Private group chat persists history, members, and routes correctly.
  - *Boundary:* Backend-backed.
  - *If fails:* Check Group Chat CRUD endpoints.

- [ ] **Message sending**
  - *Expected:* Typing and hitting Enter sends the message; Shift+Enter creates a newline.
  - *Boundary:* Backend-backed WebSocket relay.
  - *If fails:* Check WebSocket connection state and Guard limits.

- [ ] **Message attachments**
  - *Expected:* Images and safe documents upload successfully; dangerous files (.exe, .msi) are rejected by AegisNet Guard.
  - *Boundary:* Backend-backed.
  - *If fails:* Document the exact file extension and size used.

- [ ] **Reactions**
  - *Expected:* Clicking an emoji adds a reaction; clicking again removes it.
  - *Boundary:* Local prototype state.
  - *If fails:* Note if UI updates instantly or stutters.

- [ ] **Message grouping**
  - *Expected:* Consecutive messages from the same user within a short timeframe visually group together.
  - *Boundary:* Frontend-only.
  - *If fails:* Check timestamp rendering.

- [ ] **File Vault**
  - *Expected:* Files upload to IndexedDB, encrypt with AES-GCM, and display an "Encrypted" badge.
  - *Boundary:* Local-only.
  - *If fails:* Check browser IndexedDB quota or Web Crypto API support.

- [ ] **Local Vault encryption wording**
  - *Expected:* "Local at-rest only" or similar honest wording is visible.
  - *Boundary:* Frontend-only.
  - *If fails:* Note any misleading zero-knowledge claims.

- [ ] **Backend file downloads**
  - *Expected:* Standard attachments download correctly with safe MIME types.
  - *Boundary:* Backend-backed.
  - *If fails:* Check `routes/files.ts` behavior.

- [ ] **Offline fallback**
  - *Expected:* App warns when backend is unreachable but continues to allow local reads/writes.
  - *Boundary:* Frontend-only.
  - *If fails:* Disable network and test routing.

- [ ] **OfflineSyncQueue behavior**
  - *Expected:* Mutations queue up while offline and sync when online.
  - *Boundary:* Frontend-only.
  - *If fails:* Monitor `localStorage` `OfflineSyncQueue` size.

- [ ] **User profiles**
  - *Expected:* Viewing a user profile opens the correct data and controls.
  - *Boundary:* Local prototype state.
  - *If fails:* Check React Router params.

- [ ] **Profile image upload and removal**
  - *Expected:* User can upload an image (it compresses to WebP safely) and remove it.
  - *Boundary:* Local prototype state.
  - *If fails:* Test large images to ensure compression doesn't crash the browser.

- [ ] **Network nicknames**
  - *Expected:* Nickname applies only inside the specific Network context.
  - *Boundary:* Backend-backed (Member CRUD).
  - *If fails:* Verify Network-specific display overrides.

- [ ] **Member profile cards**
  - *Expected:* Clicking an avatar displays a popover with member info and a "Message" button.
  - *Boundary:* Frontend-only UI.
  - *If fails:* Check click event propagation.

- [ ] **Network Settings**
  - *Expected:* Multi-tab layout (Overview, Profile, Members, Moderation) works cleanly.
  - *Boundary:* Frontend-only UI wrapping backend state.
  - *If fails:* Check access control rules (Owner vs Member).

- [ ] **Moderation tools**
  - *Expected:* Owner/Admin can kick members or edit settings.
  - *Boundary:* Backend-backed (permissions enforced).
  - *If fails:* Try an unauthorized action to ensure backend returns 403.

- [ ] **Admin Center**
  - *Expected:* Displays local diagnostics, audit logs, and support tickets without exposing plaintext.
  - *Boundary:* Local prototype state.
  - *If fails:* Check `AdminStateContext`.

- [ ] **AegisNet Guard**
  - *Expected:* App gateway safely filters oversized payloads and path traversal.
  - *Boundary:* Backend-backed.
  - *If fails:* Check backend `logAegisGuardEvent` output.

- [ ] **Shield Mode**
  - *Expected:* Blurs UI elements; hover reveals them.
  - *Boundary:* Frontend-only CSS filters.
  - *If fails:* Check theme tokens.

- [ ] **Lockdown Mode**
  - *Expected:* App restricts downloads, sets a local PIN lock that survives reloads.
  - *Boundary:* Local-only (localStorage).
  - *If fails:* Reload page without PIN to verify lock holds.

- [ ] **Disappearing messages**
  - *Expected:* Timer drops message from local state after expiration.
  - *Boundary:* Local-only.
  - *If fails:* Check `chatContext` cleanup intervals.

- [ ] **Voice room join screen**
  - *Expected:* Interstitial screen prompts before joining audio room.
  - *Boundary:* Frontend-only.
  - *If fails:* Ensure mic isn't hot on click.

- [ ] **Video room join screen**
  - *Expected:* Interstitial screen allows camera testing before joining.
  - *Boundary:* Frontend-only.
  - *If fails:* Check WebRTC getUserMedia permissions.

- [ ] **Local camera test**
  - *Expected:* Displays local camera feed with honest security wording.
  - *Boundary:* Local-only.
  - *If fails:* Check browser permission blocks.

- [ ] **Local screen share prototype**
  - *Expected:* Screen share is captured locally, displays honestly as prototype.
  - *Boundary:* Local-only.
  - *If fails:* Test on different monitors/windows.

- [ ] **Mission Rooms**
  - *Expected:* Tactical map, task list, and timeline are interactive.
  - *Boundary:* Local prototype state (`MissionStateProvider`).
  - *If fails:* Check layout on smaller screens.

- [ ] **Verified Presence**
  - *Expected:* Status dots update.
  - *Boundary:* Local-only.
  - *If fails:* Check mock socket connection simulation.

- [ ] **Accessibility basics**
  - *Expected:* Keyboard navigation works (skip links, Escape to close dialogs, focus traps).
  - *Boundary:* Frontend-only.
  - *If fails:* Tab through the app and note focus loss.

- [ ] **Mobile layout**
  - *Expected:* Sidebars collapse into hamburgers; chat takes full width.
  - *Boundary:* Frontend-only.
  - *If fails:* Test on 375px viewport width.

- [ ] **Theme switching**
  - *Expected:* Changing theme applies instantly and maintains WCAG AA contrast.
  - *Boundary:* Frontend-only.
  - *If fails:* Check `theme.css` token application.

- [ ] **Error handling**
  - *Expected:* React Error Boundary catches rendering crashes gracefully.
  - *Boundary:* Frontend-only.
  - *If fails:* Intentionally throw an error and verify crash screen.

- [ ] **Security wording**
  - *Expected:* App does not make false production claims (no "military-grade", no "zero-knowledge").
  - *Boundary:* Documentation/UI.
  - *If fails:* Report exact text and location.

## Profiles, Trust, and Network Operations (June 10, 2026 sprint)

- [ ] **Full user profile**
  - *Expected:* `/app/profile/:userId` shows avatar, display name, username, status, bio, role, trust label, Mutual Networks, Activity, and Message/Call/Review Trust buttons for other users.
  - *Boundary:* Local prototype state.

- [ ] **Network Roster member click** (click every roster member)
  - *Expected:* Network Settings → Members: clicking ANY member card opens their profile card (popover) with roles, trust label, Mutual Networks count, Message and Profile buttons. Enter/Space also opens it from the keyboard; focus ring is visible.
  - *Boundary:* Frontend-only.
  - *If fails:* Note which member/Network and whether keyboard or mouse.

- [ ] **Profile photo expansion** (open profile photos)
  - *Expected:* Clicking an avatar on a profile or profile card opens a large preview. Esc, click-outside, and the close button all close it. Users with no photo show large initials. In Lockdown Mode the photo is tap-to-reveal.
  - *Boundary:* Frontend-only.

- [ ] **Activity tab**
  - *Expected:* Profiles show local-only Activity updates with relative timestamps ("3m", "Today"). The current user can post and delete short text updates. A local-only label is visible.
  - *Boundary:* Local-only. Activity content must never appear in QA diagnostics.

- [ ] **Trusted Contacts** (review trusted contacts)
  - *Expected:* Profile & Safety shows Trusted Contact cards with trust level (not "Friend"), reason, Message and Review Trust actions, and an honest "local prototype label" warning.
  - *Boundary:* Local-only.

- [ ] **Trust Review modal** (change trusted contact trust level)
  - *Expected:* "Review Trust"/"Add Trusted Contact" opens a modal explaining what the label means and does NOT mean (no crypto/device/government/org verification claims). Levels: Not trusted, Known contact, Trusted contact, Verified in person; org/device verified are visibly planned-only. Reason + private local note save. Removing trust requires confirmation.
  - *Boundary:* Local-only.

- [ ] **Network Profile (Overview)**
  - *Expected:* Network Settings → Overview shows icon, name, description, member count, online count (prototype), owner, established date, and local-prototype labels. No "Server Profile" wording.
  - *Boundary:* Local prototype state.

- [ ] **Network Members + join approvals**
  - *Expected:* All Members / Pending / Approved / Rejected views; search by name or username; seeded pending applications can be approved/rejected by the owner; "Require approval" toggle is labeled local-only.
  - *Boundary:* Local-only.

- [ ] **Invites**
  - *Expected:* Network Settings → Invites generates `aegisnet://invite/CODE` links with expiration/max-use labels (labels only), a require-approval toggle with a bypass warning, copy, and revoke. Redeeming a code via "Join Network" works for local group invites.
  - *Boundary:* Local-only (labels not enforced).

- [ ] **Roles**
  - *Expected:* Role list with color chips, members-with-role counts, permission previews, create role, delete role with confirmation, and a clear prototype-only (not backend-enforced) label.
  - *Boundary:* Local-only.

- [ ] **Integrations & Bots**
  - *Expected:* Installed-bots list or empty state, Add Bot (prototype) catalog, permission preview, enable/disable, remove with confirmation, and an explicit "real bots do not execute" warning.
  - *Boundary:* Local-only / prototype-only.

- [ ] **Emoji & Stickers**
  - *Expected:* Upload area lists accepted (PNG/JPG/WebP/GIF ≤512KB) and blocked (SVG/HTML/scripts/executables) types; uploading a blocked type shows a safety error; slots counter (max 25); delete with confirmation; local-only label.
  - *Boundary:* Local-only.
  - *If fails:* Record the exact file name/extension used.

- [ ] **Safety Setup**
  - *Expected:* Working local-only toggles (join approval, members in Room list, invite safety, bot approval, attachment safety), a verification-level select, planned-only two-person approval and content filter cards, and an AegisNet Guard summary. No production-moderation claims.
  - *Boundary:* Local-only except attachment safety (backend-backed when connected).

- [ ] **Privacy toggles change behavior** (change privacy toggles and verify behavior)
  - *Expected:* Read receipts OFF hides delivery/read state on your outgoing messages. Safety check-in reminders OFF mutes the dashboard panel. Allow group invitations OFF blocks redeeming a private-group invite code with a clear warning. Each toggle records a QA event and survives reload.
  - *Boundary:* Local-only.

- [ ] **QA Mode Recent Events + Copy Diagnostics** (copy QA diagnostics and confirm no private content)
  - *Expected:* `/app/qa` lists recent metadata-only events (profile opens, roster clicks, trust changes, toggles, errors) with a Clear button. Copy Diagnostics includes the 50 newest events and NO message bodies, bios, notes, Activity text, photos, keys, tokens, or passwords.
  - *Boundary:* Local-only, dev builds only.

- [ ] **Terminology check**
  - *Expected:* No user-facing "server", "channel", "Mutual Server", or "Friend" labels (Admin Center backend-operator tools are the allowed exception for "server"). Use Network, Room, Mutual Network, Trusted/Known Contact.
  - *Boundary:* UI text. A unit test (`src/app/terminology.test.ts`) also guards this.

- [ ] **Local-only vs backend-backed labels**
  - *Expected:* Trust, Activity, invites, roles, emoji, bots, safety toggles, and join approvals all visibly state they are local-only prototypes; attachment safety and Guard status state backend-backed behavior only when the backend is connected.
  - *Boundary:* UI honesty check.

- [ ] **Chat media layout / mobile layout**
  - *Expected:* Attachments, grouped messages, reactions, and the collapsible right panel render cleanly at desktop and 375px widths; roster, profile, and Network Settings tabs scroll horizontally rather than overflowing on mobile.
  - *Boundary:* Frontend-only.

- [ ] Check hidden scrollbar behavior in private messages.
- [ ] Check hidden scrollbar behavior in Network Settings.
- [ ] Check hidden scrollbar behavior in modals.
- [ ] Upload a safe image to a private message.
- [ ] Try uploading SVG, HTML, script, executable, and oversized image files.
- [ ] Open image preview.
- [ ] Confirm image contents are not in QA diagnostics.
- [ ] Change chat color if implemented.
- [ ] Set and reset wallpaper if implemented.
- [ ] Confirm chat readability after wallpaper changes.
- [ ] Archive Network.
- [ ] Restore archived Network if implemented.
- [ ] Delete Network with typed confirmation.
- [ ] Confirm normal members cannot see owner danger actions.
- [ ] Start and stop screen share.
- [ ] Confirm screen share preview does not flicker black.
- [ ] Test screen share in private call and room call.
- [ ] Verify no production security overclaims.

## Room Types and Role-Based Room Permissions (Sprint 10 - June 10, 2026)

- [ ] **Mission Room creation**
  - *Expected:* "Mission Room" is selectable in Create Room dialog (no longer shows "Planned"). After creation, clicking the room opens the Mission Room screen.
  - *Boundary:* Local prototype. No GPS, dispatch, or emergency services.

- [ ] **Planning Room creation**
  - *Expected:* "Planning Room" is selectable in Create Room dialog. After creation, clicking the room opens the Planning Room screen with Agenda, Tasks, Timeline, Decisions tabs.
  - *Boundary:* Local prototype. Content is not persisted to the backend.

- [ ] **Planning Room content does not appear in QA diagnostics**
  - *Expected:* Open a Planning Room, add agenda/task/decision items, then open /app/qa and Copy Diagnostics. Confirm no planning content appears.
  - *Boundary:* QA event safety check.

- [ ] **Restricted Room not visible to normal member**
  - *Expected:* A room with visibility=restricted and allowedRoles=[role_admin] does NOT appear in the sidebar for a user without that role.
  - *Boundary:* UI filtering only (prototype). Label should confirm this.

- [ ] **OPSEC-style Room not visible to guest**
  - *Expected:* A room with visibility=opsec is not visible to users with no matching roles.
  - *Boundary:* UI filtering only.

- [ ] **Direct restricted Room URL shows Access Denied**
  - *Expected:* Manually navigating to `/app/network/:id/room/:restrictedRoomId` shows "Access Denied" screen, not room content.
  - *Boundary:* UI guard only. Backend enforcement needed.

- [ ] **Owner sees all Rooms**
  - *Expected:* The network owner sees restricted, opsec, and regular rooms in the sidebar.

- [ ] **Room Permissions editor is owner/admin only**
  - *Expected:* In Network Settings, the Room Permissions editor appears only when the current user is the owner or has the manage_rooms permission.

- [ ] **Warning text appears on restricted rooms**
  - *Expected:* The Room Permissions editor shows: "Room permissions are prototype access controls unless backend enforcement is enabled. Restricted Rooms help organize access in this prototype. They are not a production security boundary yet."

- [ ] **SAR template creates Mission and Planning Rooms**
  - *Expected:* Creating a network from the SAR / Field Team template creates both a Mission Room (restricted) and a Planning Room (OPSEC).

- [ ] **Cyber template creates Planning Room**
  - *Expected:* Creating a network from the Cyber Team template creates a Planning Room with restricted visibility.

- [ ] **Network Permission Dashboard shows restricted rooms**
  - *Expected:* In Network Settings > Role & Permission Testing, a "Restricted Rooms in this Network" section shows all rooms with access controls.

- [ ] **No production security overclaims**
  - *Expected:* No UI text claims real OPSEC, E2EE, military-grade, or government-grade security. All access controls labeled as prototype.

- [ ] **Terminology check**
  - *Expected:* No user-facing "server" or "channel" in new Room permission UI.

- [x] Sprint 9 UX Polish & Prototype Readiness Complete.
