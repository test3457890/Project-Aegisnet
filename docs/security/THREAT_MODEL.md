# AegisNet Threat Model

## 1. What AegisNet Protects
AegisNet protects basic coordination and data exchange for a civilian Network. It protects:
- Messages in transit (against trivial snooping using HTTPS/WSS when deployed correctly).
- Local files at rest (via browser-local Vault AES-GCM encryption).
- Identity isolation (a user's real identity is meant to be separate from their Network profiles).
- Offline availability (the app continues to function and sync when connectivity drops).

## 2. What AegisNet Does Not Protect Yet
AegisNet **does not** protect against:
- Backend compromise: The backend currently sees all messages, files, and metadata in plaintext.
- Malicious node operators: There is no End-to-End Encryption (E2EE) yet.
- Strong network attackers: The prototype uses mock bypass authentication and lacks hardware enclave support or True Device Trust.
- Advanced persistent threats (APTs) or state actors.
- Law enforcement or subpoena (backend data is available to whoever controls the database).

## 3. User Types
- **Normal User**: Interacts with the Network, creates messages, uploads files.
- **Network Owner**: Creates and manages Networks, roles, and rooms.
- **Network Admin**: Assists the owner with moderation.
- **Backend Operator**: Controls the physical machine running the `services/api` Node server. (Currently has full access to all plaintext).
- **Attacker**: An external actor attempting to compromise the network, spoof data, or crash the service.
- **Malicious Member**: An authorized user within a Network attempting to escalate privileges or access data they shouldn't.
- **Stolen Device Attacker**: An attacker with physical access to a user's unlocked device.

## 4. Data Types
- **Messages**: Plaintext chat history. (Not E2EE).
- **Files**: Uploaded media and documents.
- **Vault Files**: Files encrypted locally before upload.
- **Metadata**: Who talked to whom, when, and from where. (Unencrypted).
- **Profile Data**: Display names, avatars, bios.
- **Audit Logs**: Records of critical actions (metadata only).
- **Support Tickets**: User-submitted diagnostics.
- **Local Settings**: User preferences stored in `localStorage`.
- **Prototype Auth Tokens**: Currently mock tokens (`mock-demo-token-user_me`) providing context.

## 5. Trust Boundaries
- **Browser (Frontend)**: Untrusted by the backend. User can manipulate memory, IndexedDB, and WebSocket payloads.
- **Backend API**: Trusted by the frontend. Enforces IDOR, rate limits, and roles.
- **SQLite Database**: Trusted by the backend. Contains plaintext data.
- **Upload Folder**: Trusted to hold files, but files are untrusted (no execution allowed).
- **WebSocket**: Untrusted boundary. All incoming events must be validated and authenticated.

## 6. Attack Surfaces
- **API Routes**: REST endpoints for CRUD operations.
- **WebSocket**: Real-time event streaming and payload handling.
- **Uploads/Downloads**: File handling, path traversal, malicious content types.
- **Admin Tools**: High-privilege actions (kick, ban, timeout).
- **OfflineSyncQueue**: Local mutation queue that could be replayed maliciously.
- **Local Browser Storage**: IndexedDB containing local Vault keys and cached data.
- **Logs**: Backend logs that could leak sensitive plaintext if not sanitized.

## 7. STRIDE Analysis

### Spoofing
- **Scenario**: A user attempts to spoof another user's ID to send a message on their behalf.
- **Current Mitigations**: The backend ignores `senderId` in request bodies and uses the authenticated `req.userContext.id`.
- **Missing Mitigations**: Connection-bound WebSocket authentication to prevent event spoofing over WS. (Addressed in Sprint 6). True cryptographic identity (Passkeys/E2EE).

### Tampering
- **Scenario**: A user modifies their offline sync queue to bypass restrictions before syncing.
- **Current Mitigations**: The backend re-validates all offline mutations upon sync.
- **Missing Mitigations**: Message signing to prevent the backend from tampering with messages.

### Repudiation
- **Scenario**: A user deletes a Network and denies doing so.
- **Current Mitigations**: Basic audit logs (metadata only) are planned.
- **Missing Mitigations**: Cryptographic non-repudiation.

### Information Disclosure
- **Scenario**: An attacker guesses a file ID to download a private document.
- **Current Mitigations**: File IDs are UUIDv4. Vault files are encrypted client-side.
- **Missing Mitigations**: E2EE for all messages and metadata. Secure key management (passphrase wrapping for Vault keys).

### Denial of Service
- **Scenario**: An attacker spams the login or message creation routes to crash the server.
- **Current Mitigations**: Payload size limits (1MB HTTP, 5KB WS), rate limiting, and AegisNet Guard filtering.
- **Missing Mitigations**: Production WAF/DDoS protection (e.g. Cloudflare).

### Elevation of Privilege
- **Scenario**: A normal user attempts to delete a Network.
- **Current Mitigations**: Backend authorization checks verify `network_members` roles. (Addressed in Sprint 6).
- **Missing Mitigations**: Cryptographic access controls (e.g., group key ratcheting).

## 8. Worst-Case Abuse Scenarios
1. **Backend Compromise**: An attacker gains access to the backend SQLite database, reading all user messages and metadata.
2. **Path Traversal**: An attacker uploads a malicious file and uses directory traversal to overwrite `server.ts`. (Mitigated via strict path checks).
3. **Cross-Site Scripting (XSS)**: An attacker uploads an HTML/SVG file that executes JavaScript when viewed. (Mitigated via `Content-Disposition: attachment`).
4. **WebSocket Crash**: An attacker sends malformed JSON to crash the WS server. (Mitigated via `try/catch`).

## 9. Blocked Future Security Work
The following mitigations cannot be implemented until the core architecture matures:
- Production Authentication (JWT, Passkeys, Argon2).
- Production End-to-End Encryption (E2EE) with Signal Protocol or MLS.
- Device Trust & Hardware Enclaves.
- Real TLS/WSS certificate management.
- Cryptographic Key Recovery.
- Independent third-party security audits.
