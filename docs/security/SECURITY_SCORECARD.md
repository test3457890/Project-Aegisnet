# AegisNet Security Scorecard

| Module | Status | Notes |
| :--- | :--- | :--- |
| **Authentication** | Prototype-only | Uses mock bypass tokens. Requires production design. |
| **Authorization (IDOR)** | Backend-enforced | Backend validates context IDs instead of trusting client payloads. |
| **WebSocket Security** | Backend-enforced | Payload limits (5KB), origin checks, connection-bound auth context. |
| **Upload Security** | Backend-enforced | File size limits, malicious extension blocking. |
| **File Download** | Backend-enforced | Safe `Content-Disposition`, UUID guessing protection. |
| **Vault Security** | Local-only | Local AES-GCM encryption at-rest. Keys stored without passphrase. |
| **Logging Safety** | Backend-enforced | Logs stripped of message bodies, plaintext, and keys. |
| **Audit Logs** | Prototype-only | Metadata-only tracking. Requires production design for integrity. |
| **Admin Center** | Prototype-only | Heavily gated, clearly marked as dev-only. |
| **AegisNet Guard (WAF)** | Backend-enforced | Prototype security gateway blocking traversal, dangerous files, and oversized payloads. |
| **Dependencies** | Backend-enforced | Tracked via `npm audit` and CI scanning. |
| **Secrets Management** | Backend-enforced | Scan checks in place. No real secrets exist yet. |
| **Rate Limiting** | Backend-enforced | `express-rate-limit` implemented for abuse prevention. |
| **End-to-End Encryption (E2EE)** | Not started | Blocked. Requires significant architectural design (Signal/MLS). |
| **Device Trust** | Not started | Blocked. Requires hardware enclave integration. |
| **Trusted Contacts / Trust Levels** | Local-only | Self-declared organizational labels (Known / Trusted / Verified-in-person). Explicitly NOT cryptographic identity verification — the UI warns accordingly. Safety numbers, QR verification, and org-issued verification are documented future work. |
| **QA Event Log** | Local-only | Metadata-only event log for bug bashes (event type, route, IDs, success flag, short reason codes). Field whitelist enforced structurally; unit-tested to exclude message bodies, bios, trust notes, Activity content, and secrets. |
| **TLS/WSS Deployment** | Blocked | Awaiting production infrastructure design. |
| **Data Lifecycle** | Backend-enforced | Soft-deletes and physical sweepers implemented. |
| **Backup and Recovery** | Not started | Awaiting E2EE key recovery design. |
| **Incident Response** | Not started | Awaiting production launch. |

## Legend
- **Backend-enforced**: A real mitigation exists and is verified by the backend.
- **Frontend-only**: The UI restricts it, but the backend does not enforce it (Vulnerable).
- **Local-only**: Encryption or security that only exists on the physical device.
- **Prototype-only**: A functional placeholder that is not safe for real-world use.
- **Not started**: A planned feature that has not been built.
- **Blocked**: A feature that cannot be built until prerequisites are met.
- **Needs production design**: Requires significant architectural planning.
