# AegisNet Security Audit Notes

## Overview
A comprehensive vulnerability and security audit was performed on the AegisNet prototype. The goal was to identify and remediate basic vulnerabilities, harden the prototype for future readiness, and document remaining gaps that require production-grade solutions.

**Important Security Notice**: AegisNet is **NOT** production secure, government-grade, or safe for real-world sensitive communication. It remains an early alpha prototype.

## Remediation Applied

### 1. Backend Authentication (Prototype Middleware)
- **Status**: Prototype-only.
- **Fix**: Implemented a prototype `requireAuth` middleware to enforce authentication on all sensitive read/write routes.
- **Limitation**: This does not use standard JWTs or cryptographically secure tokens. It trusts the token to be the user's ID for the sake of prototype demonstration. Missing user contexts are now rejected in production mode.

### 2. Client-Provided IDs
- **Status**: Backend-enforced.
- **Fix**: The backend no longer trusts client-provided `ownerId`, `uploadedBy`, `senderId`, or `actorId` fields in POST requests. It instead resolves these fields from the authenticated user context (`req.userContext`).

### 3. File Uploads & Path Traversal
- **Status**: Backend-enforced.
- **Fix**: Upload endpoints are protected against directory traversal (`../`). Added defense-in-depth to the file deletion mechanism to ensure targets reside securely inside the `UPLOAD_DIR`. Download endpoints enforce `Content-Disposition: inline` for safe preview types (images, pdfs) and `attachment` for everything else, preventing inline script execution. SVG and active previews remain strictly blocked.

### 4. WebSocket Hardening
- **Status**: Backend-enforced.
- **Fix**: Payload size limits (5 KB max) and origin validation (CORS restrictions) were added to the WebSocket server. Malformed JSON crashes the connection rather than the server.
- **Limitation**: Event spoofing is partially mitigated but full connection-bound user authentication is not yet implemented over WS.

### 5. UI and Admin Center Terminology
- **Status**: Frontend-only.
- **Fix**: Replaced "server" terminology with civilian-friendly terms (e.g., "Network"). Clearly labeled local/prototype operations in the Admin Center as `(Dev Only)` to avoid creating a false sense of security regarding local operations.

### 6. SQL Injection & Cross-Site Scripting (XSS)
- **Status**: Backend/Frontend-enforced.
- **Fix**: Confirmed that all `runQuery`, `getQuery`, and `allQuery` instances use parameterized prepared statements. `dangerouslySetInnerHTML` is only used safely by local component libraries (Shadcn UI charts).

### 7. Secure Headers & Dependencies
- **Status**: Backend-enforced.
- **Fix**: Added `helmet` to the Express server to enforce `X-Content-Type-Options: nosniff` and basic security headers. Audited dependencies (`npm audit`) and confirmed 0 vulnerabilities.

### 8. AegisNet Guard (App Security Gateway)
- **Status**: Backend-enforced.
- **Fix**: Implemented AegisNet Guard middleware to monitor and block abuse patterns (path traversal, sensitive file access, oversized payloads, dangerous file types). Integrated `express-rate-limit` for global and auth-specific endpoints. 
- **Limitation**: AegisNet Guard is a prototype filter and not a replacement for a production WAF, IPS/IDS, or real firewall.

## Known Security Limitations (Future Work)

The following gaps remain and must be resolved before any production or sensitive usage:

1. **Production Authentication**: The prototype uses a mock bypass authentication. Strong Auth (JWT/Passkeys/PBKDF2/Argon2) must be implemented.
2. **WebSocket Authentication**: WebSockets do not currently require an auth token during connection handshake, allowing unauthorized read access to broadcasts if the endpoint is known.
3. **End-to-End Encryption (E2EE)**: Messages and metadata are currently sent to the backend in plaintext. No hardware enclave or proper E2EE is implemented.
4. **Local Vault Encryption**: Vault AES-GCM keys are stored in the browser alongside local ciphertext without passphrase wrapping.
5. **No Production WAF**: AegisNet Guard provides prototype abuse-control, but a real WAF and firewall are still needed for production deployments.
