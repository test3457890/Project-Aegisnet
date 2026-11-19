# Privacy Modes Plan

This document describes AegisNet's **Privacy Modes** (also called Signal Strength / security-posture
modes in the concept proposal, Phase 6). It records what is implemented today, what each mode does,
and — importantly — what these modes do **not** do, so no one mistakes local UI behavior for
production security.

## Honesty boundary (read this first)

Privacy Modes are **local, on-device behaviors**. As of Sprint 1 they:

- **Do** change what is shown on screen (hide previews, blur, tap-to-reveal media).
- **Do** remove local messages on a timer (disappearing messages).
- **Do** add a local screen lock (a convenience PIN).

They **do not**:

- Encrypt anything. There is no end-to-end encryption, no at-rest encryption, no zero-knowledge storage.
- Protect data from anyone with device access and technical skill. The lock PIN is stored as a
  lightweight non-cryptographic hash purely to avoid persisting the raw PIN; it is **not** a security primitive.
- Prevent screenshots or screen recording (see `SCREENSHOT_PROTECTION_NOTES.md`).
- Affect anyone else's device. Disappearing messages remove the message **locally only**.

Every user-facing control must keep wording that reflects these limits.

## The three modes (implemented in Sprint 1)

| Mode | Previews | Media | Screen blur on switch-away | App lock | Disappearing messages | Downloads |
|------|----------|-------|----------------------------|----------|-----------------------|-----------|
| **Normal** | Visible | Visible | No | No | Off unless set | Allowed |
| **Shield** | Hidden in lists & dashboard | Tap-to-reveal | Yes | No | Honors your default | Allowed |
| **Lockdown** | Hidden | Tap-to-reveal | Yes | Yes (with local PIN) | Enforced (min 24h) | Restricted in-app |

Mode is selected in **Settings → Safety & Privacy** and persists locally.

### Posture indicator & "Hide now"
While Shield or Lockdown is active, a small posture chip is shown (hidden during calls). It links to
Settings and offers a **Hide now** action:
- In Lockdown with a PIN set, "Hide now" engages the lock screen.
- Otherwise it obscures the screen until the user taps "Show content".

## Disappearing messages

- Lifetimes: Off, 1 hour, 24 hours, 1 week (`DISAPPEAR_OPTIONS` in `src/app/utils/privacy.ts`).
- A global default applies to new messages you send; a per-conversation override is set from the chat
  details panel ("Disappearing Messages" select) and stored in state (`conversationExpiry`). The effective
  lifetime for a conversation is `conversationExpiry[targetId] ?? disappearDefaultSeconds`.
- Lockdown enforces a maximum lifetime of 24h when "Off" is selected (`LOCKDOWN_ENFORCED_SECONDS`).
- Expired messages are filtered from view immediately and swept from local state every 30 seconds; any
  attached local binary is removed from IndexedDB at that time.
- This is **local-only**. It does not reach, recall, or delete the copy on any other device.

## Local lock (Lockdown)

- A 4+ digit PIN set in Settings. Stored as a non-cryptographic hash (`hashLockPin`) so the raw PIN is
  not persisted.
- The app locks on reload when Lockdown is active and a PIN exists, or immediately via "Hide now".
- The lock screen states plainly that it is a convenience lock, not encryption.

## Where this lives in code

- `src/app/utils/privacy.ts` — pure helpers (modes, expiry math, masking, PIN hash). Unit-tested.
- `src/app/state/mockAppState.ts` / `MockAppStateContext.tsx` — state, persistence, expiry sweep, setters.
- `src/app/components/privacy/LockScreen.tsx` — Lockdown lock overlay.
- `src/app/components/privacy/PrivacyShell.tsx` — posture chip + blur-on-switch-away overlay.
- `src/app/components/chat/MessageTimeline.tsx` — tap-to-reveal media, download restriction, expiry badge.
- `src/app/components/PrivateSidebar.tsx`, `src/app/screens/HomeDashboard.tsx` — preview masking.
- `src/app/screens/SettingsScreen.tsx` — Safety & Privacy controls.

## Future work (NOT built yet — needs explicit approval)

- Real at-rest encryption of local data (WebCrypto AES-GCM). This is a genuine, local protection and is
  the natural next security step, but it must be labeled "local at-rest only," not E2EE.
- Production end-to-end encryption, metadata minimization, and device trust (see `SECURITY_FOUNDATION_PLAN.md`).
- Native screenshot/recording protection (only possible in a native shell — see `SCREENSHOT_PROTECTION_NOTES.md`).
