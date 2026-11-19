# AegisNet Guard Plan

## Overview
AegisNet Guard is a prototype app security gateway and abuse-control layer for the AegisNet backend. It functions as an Express middleware and WebSocket filter that monitors and blocks basic malicious payloads before they hit protected app logic.

**Important Security Reality:** AegisNet Guard is NOT a production WAF, NOT a government-grade or military-grade firewall, NOT an antivirus, and NOT hacker-proof zero-trust enforcement. It provides defense-in-depth during the prototype phase and is not a replacement for Cloudflare, nginx, OS firewalls, enterprise IDS/IPS, or proper production key management and authentication.

## What it Blocks
- Path traversal attempts (`../`, `%2e%2e%2f`).
- Access to sensitive backend files (`.env`, `.git`, `node_modules`, `.sqlite`, `.log`).
- Dangerous upload file types (`.exe`, `.bat`, `.sh`, `.ps1`, `.dll`, `.msi`, `.html`, `.svg`).
- Oversized JSON payloads.
- Oversized File Vault uploads.
- Oversized WebSocket messages.
- Malformed or unrecognized WebSocket event types.
- Repeated connection and authentication attempts (Rate limiting).

## What it Monitors (Flags without Blocking)
- Suspected HTML or script injection payloads in JSON bodies. We monitor instead of blocking to prevent censorship of normal chat conversations (e.g., sharing a code snippet or discussing cybersecurity).

## Configuration
Controlled via environment variables (see `.env.example`):
- `AEGIS_GUARD_ENABLED`: `true` or `false`
- `AEGIS_GUARD_MODE`: `monitor` (log only) or `block` (rejects requests)
- `AEGIS_GUARD_MAX_JSON_BYTES`: Limit for JSON body (default: 1MB)
- `AEGIS_GUARD_MAX_WS_BYTES`: Limit for WebSocket payloads (default: 5KB)
- `AEGIS_GUARD_MAX_UPLOAD_BYTES`: Limit for file uploads (default: 25MB)
- `AEGIS_GUARD_RATE_LIMIT_WINDOW_MS`: Window for rate limiting
- `AEGIS_GUARD_RATE_LIMIT_MAX`: Max requests per window
- `AEGIS_GUARD_LOG_LEVEL`: `warn`, `info`, or `off`

## Safe Logging
AegisNet Guard never logs sensitive content. It logs metadata only:
- Timestamp, IP hash, user ID (if authenticated), route, method, status code, reason code, and payload size.
- It NEVER logs full request bodies, chat messages, file contents, passwords, authentication tokens, Vault contents, or Vault plaintext.

## What remains unsafe for real-world use
- E2EE is not implemented; messages are visible to the backend.
- WebSocket payloads and HTTP bodies are in plaintext (or TLS transport, but readable at the application layer).
- Backend SQLite lacks hardware encryption or production enterprise safeguards.
- Rate limits are in-memory and will not scale or survive restarts without a Redis store.
