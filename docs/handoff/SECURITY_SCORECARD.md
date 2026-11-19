# SECURITY_SCORECARD.md (AegisNet Prototype)

**Disclaimer:** AegisNet is an Advanced Prototype / Early Alpha. The security mechanisms described below are primarily local prototype controls or initial backend authorization scaffolding.

## Prototype Access Controls

* **Authentication:** Currently relying on userId passthrough / simple bearer tokens for testing. No production JWTs, MFA, or passkeys are implemented yet.
* **Authorization:** Backend enforcement is actively verifying dmin or owner roles for critical Network actions (Moderation, Roles, Profile).
* **Restricted Networks:** Enforced by the backend ooms API, rejecting members lacking approved membership.
* **Audit Logs:** Actions are tracked with metadata-only logs (scrubbed of privateNotes, bios, etc.).
* **E2EE / Encryption:** The prototype has local vault UI patterns, but NO real end-to-end encryption or zero-knowledge storage is wired up to the backend. Do not rely on AegisNet for real sensitive communications.
* **Data Hygiene:** Clear separation between wiping local mocked storage (browser cache) versus performing authenticated backend deletion actions.
