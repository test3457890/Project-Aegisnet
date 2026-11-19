# Identity, Device Trust, and Session Safety

## Architecture
AegisNet's prototype includes visual representation of Trust Rings, Device Trust, and Session Safety, but lacks real cryptographic enforcement in this local-prototype build.

### Trust Rings
A tiered identity visibility model used in AegisNet.
- **Green (Verified):** Organization Verified identity via external IdP or cryptographic proof (Planned).
- **Blue (Trusted Partner):** External trusted organization (Planned).
- **Amber (Known Contact):** Manually verified contact or implicitly trusted via repeated local proximity (Prototype).
- **Red (Untrusted):** High risk, flagged, or blocklisted identity (Prototype).
- **Gray (Guest):** Temporary, newly joined, or anonymous identity (Prototype).

### Device Trust
Devices are uniquely identified by a combination of platform and explicit user labeling.
- In this build, Device Trust is a purely **UI-based** property.
- Users can revoke local storage access and invalidate active session tokens from the Device Settings tab.
- *Future implementation:* Hardware security modules (HSM) / Secure Enclave attestation, TPM 2.0 signatures.

### Session Safety
Sessions tie an authenticated user to a given device for a temporal window.
- In this build, Sessions have a prototype `reviewed` and `revoked` state.
- Unrecognized or unreviewed sessions trigger safety warnings in the UI.
- Revoking a session immediately deletes local access grants and disconnects active sockets (mocked).

### Privacy Audit & Diagnostics
To ensure organizational and personal safety, all crash reports, bug bash metrics, and metadata payloads exported from AegisNet are strictly scrubbed.
- **Excluded:** Message bodies, draft text, private notes, file contents, passwords, Vault keys, profile bios, and Protected Person medical/HR details.
- **Included:** Application state anomalies, generic UI state routing issues, local settings toggle errors, network disconnect states.
