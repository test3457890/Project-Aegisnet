# Decisions

Track important product and technical decisions here.

* AegisNet is civilian-first by default.
* Everyday Mode is the default user experience.
* Mission Mode is optional and secondary.
* Private Comms Mode should feel Signal-inspired.
* Network Workspace Mode should feel organized but not like a Discord clone.
* Use the word Network, not server.
* AI features are not part of the current AegisNet MVP. They may be adapted later from AMI after review.
* Do not build AI from scratch in this MVP.
* **Standard MVP backend (APPROVED June 8, 2026):** The product owner chose to continue expanding `services/api` as the standard internet/local MVP backend before building the Rust/Go mesh daemon, native mobile apps, or hardware node support.
* Keep browser-local fallback behavior available when `services/api` cannot be reached.
* The current MVP is a hybrid: Express/SQLite/WebSocket provides shared development data, while localStorage and IndexedDB preserve browser-local prototype behavior.
* The future mesh daemon option remains documented, but it is blocked until the standard backend MVP is stable.
* Do not build production encryption, real remote calls, payments, peer-to-peer, mesh, native mobile, or hardware support yet.
* AMI OS lessons should guide AegisNet architecture, handoff discipline, installer planning, release planning, logging, diagnostics, and AI integration.
* Do not blindly copy AMI code into AegisNet. Inspect it, document it, clean it, and only reuse what fits.
* **UI Theme Default**: Switched the default theme from "Midnight Command" to "Aegis Social Dark" to better align with the familiar comfort of Discord and Signal and improve civilian readability. Midnight Command remains an available option.
* **Privacy Modes (Sprint 1)**: Added Normal / Shield / Lockdown privacy posture as local, on-device behavior only. Shield and Lockdown hide previews, blur on switch-away, and make media tap-to-reveal. Lockdown adds a local convenience lock, enforced disappearing messages, and restricted in-app downloads.
* **Local lock is NOT security**: The Lockdown PIN is a convenience screen guard stored as a non-cryptographic hash. It is explicitly not encryption and is labeled as such everywhere it appears. This respects the "no real encryption unless asked" rule.
* **Disappearing messages are local-only**: Timed message removal affects the local device only; it does not recall or delete copies elsewhere. No production/remote deletion is claimed.
* **At-rest local Vault encryption (APPROVED & IMPLEMENTED)**: The product owner explicitly approved adding local at-rest File Vault encryption. Vault file contents are now encrypted with AES-GCM-256 (Web Crypto) using a random per-browser-profile key and a unique per-file IV, stored in IndexedDB. This is local-at-rest only — NOT end-to-end, NOT zero-knowledge, NOT government/military-grade. The key is co-located with the data (documented limitation). Metadata, thumbnails, and chat attachments remain unencrypted. See `docs/architecture/FILE_VAULT_SECURITY_PLAN.md`.
* **Mission Rooms (Sprint 2)**: Mission Mode is implemented as an optional, advanced, local-only layer (Timeline, Tasks, Roster, Map pins, check-ins, Emergency flag, Verified Presence). AegisNet stays civilian-first by default. Presence and check-ins are self-reported; there is no backend sync, live GPS, telemetry, or real emergency dispatch. Mission/presence state lives in a separate `MissionStateProvider` to keep the backend-aware main context modular. See `docs/architecture/MISSION_ROOMS_PLAN.md`.

## Public repository import

Publish source, example configuration, and simulated documentation assets. Keep runtime databases, logs, uploads, credentials, and Drive working drafts out of the public repository. Run companion demos independently.
# November 19 safety decision

Enforce the documented prototype-only boundary in code: production API use is
blocked until a separate authentication/privacy design is reviewed. Preserve the
local fictional-data workflow; no new authentication, encryption or AI system is
introduced. This is a safe implementation decision under the owner-requested
security review, not owner approval for deployment.
