# Mission Rooms & Verified Presence Plan

Mission Rooms are an **optional, advanced** layer (concept Phases 5, 9, 10). AegisNet stays
**civilian-first by default** — Mission Mode is opt-in per Network room and never the default experience.

## Honesty boundary

Everything here is **local prototype state** (persisted in `localStorage`). There is:

- **No backend** for missions (the standard `services/api` MVP does not yet sync mission data).
- **No live GPS, no telemetry, no wearables** — presence and check-ins are **self-reported**.
- **No remote dispatch / emergency services** — the "Emergency" flag is an in-app local signal only.
- **No map** — the map tab is a labelled-pin placeholder, not a real map or location feed.

## What was built (Sprint 2)

A Mission Room (any Network room of type `mission`, routed at
`/app/network/:networkId/mission/:roomId`) is now a real, interactive local workspace:

- **Timeline**: situation updates, decisions, check-ins, and alerts (newest first). Post free-text updates.
- **Tasks**: add tasks and toggle them done; pending count shown on the tab.
- **Roster**: mission members with self-reported presence for the current user.
- **Map**: labelled pins (add/remove) on a placeholder map — explicitly no live location.
- **Quick check-in**: one-tap "I'm safe / On my way / Arrived / Need help" posting to the timeline.
- **Emergency flag**: raise/clear a local emergency banner (logged to the timeline).
- **Verified Presence**: the current user sets their status (Available, Driving, In Field, On/Off Duty,
  Low Battery, Weak Network); persisted locally.

A worked SAR example seeds `room_sar_mission` so the room is not empty on first open.

## Where this lives in code

- `src/app/state/missionState.ts` — types, presence/check-in options, context + hook, pure helpers, seed.
  Pure helpers are unit-tested (`missionState.test.ts`).
- `src/app/state/MissionStateProvider.tsx` — provider with `localStorage` persistence
  (`aegisnet_missions`, `aegisnet_presence`). Wrapped around the app in `App.tsx`.
- `src/app/screens/MissionRoomScreen.tsx` — the interactive, state-driven screen (replaced the old static mockup).

This state is intentionally **separate** from the large, backend-aware `MockAppStateContext` to keep the
mission layer modular and low-risk. The screen composes both hooks (mission data + user/Network lookups).

## Follow-ups (not built yet)

- Surface presence + recent check-ins on the Home Dashboard for at-a-glance safety.
- Per-Network mission membership (currently roster seeds from the example / current user).
- Decision log vs. timeline separation, task assignment to members, auto-expiring mission rooms.
- Optional backend sync of mission data once a shared multi-user model is decided.
- A real map and opt-in location sharing are explicitly future work, gated on privacy review (see concept Phase 18).
