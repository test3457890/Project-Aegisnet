# Bots and Integrations Architecture Plan

## Overview
This document outlines the foundation for Bots and Integrations in AegisNet. As an Advanced Prototype / Early Alpha, AegisNet currently simulates bot behavior and does not execute arbitrary code or connect to live production endpoints. This plan establishes how real bots and integrations will be structured in the future, while maintaining the "no production security" guardrails.

## Terminology
- **Bots:** Automated users that can participate in Rooms, send messages, and respond to commands.
- **Integrations:** Webhooks and external service connectors that push data into AegisNet or trigger external actions.
- **Network Apps:** The overarching term for both bots and integrations installed within a Network.

## Current State (Prototype — updated June 10, 2026)
- The `NetworkSettingsScreen` Integrations & Bots tab is now a working **local-only prototype management UI** (`src/app/components/network-settings/NetworkBotsTab.tsx`):
  - Installed-bots list with empty state, bot name/icon/status, permissions-requested preview, allowed Rooms, added-by/added-date, enable/disable toggle, and remove-with-confirmation.
  - "Add Bot (prototype)" installs entries from a small sample catalog (Welcome Bot, Check-In Reminder Bot, File Organizer Bot). Entries are stored in `localStorage` per Network.
  - The tab displays an explicit warning that **real bots do not execute** — no bot code runs, no external webhooks fire, no third-party services are contacted.
- **What bots cannot do yet:** execute any code, read or send real messages, call webhooks, install from a marketplace, or run third-party plugins.
- Bot add/remove actions emit metadata-only QA events (`network.bot.added` / `network.bot.removed`).

### Why arbitrary bot code is not allowed yet
Running untrusted code inside a private communication app is the highest-risk feature class (message exfiltration, token theft, supply-chain compromise). Until production authentication, audit logging, and an isolation boundary exist (WebAssembly or isolated-worker sandbox, see §4), bots remain display-only entries.

### Admin approval and audit requirements (future)
- Installing or enabling a bot must require Network owner/admin approval. The Safety Setup tab already models a "Bot approval required" toggle (local-only).
- Every bot install/enable/disable/remove and every permission grant must produce a metadata-only audit event.

## Planned Architecture

### 1. Bot Identity and Permissions
- Bots will have unique `bot_id`s distinct from regular `user_id`s.
- They will require explicit permission grants during installation (e.g., `Send Messages`, `Read Message History`, `Manage Roles`).
- Bot roles will be sandboxed. A bot cannot grant permissions it does not possess.

### 2. Webhooks
- **Incoming Webhooks:** Unique URLs generated per Room to allow external services to post messages without a full bot identity.
- **Outgoing Webhooks (Planned):** Configurable endpoints that AegisNet will POST to when specific events occur (e.g., message sent, member joined).

### 3. API Surface
Bots will interact with AegisNet via a REST API and a WebSocket gateway.
- **REST API:** Used for stateful actions (e.g., sending messages, updating profiles, managing roles).
- **WebSocket Gateway:** Used for real-time event streaming (e.g., receiving new messages, presence updates).

### 4. Security Considerations (Future Production)
- **Authentication:** Bots will authenticate using bearer tokens.
- **Rate Limiting:** Strict rate limits will apply per bot and per network to prevent abuse and spam.
- **E2EE Support:** If AegisNet implements end-to-end encryption for Rooms, bots will need to negotiate keys, or be explicitly excluded from E2EE Rooms.

## Next Steps for Implementation
1. Add a `Bot` interface to the backend database schema.
2. ~~Implement the `NetworkBotsTab` UI to list mock bots~~ — **Done (June 10, 2026, local-only)**. Mock webhooks remain.
3. Create the REST endpoints for webhook execution (requires product + security approval first).
4. Establish the OAuth2/Installation flow for Network Apps.
5. Design the execution sandbox (WebAssembly or isolated worker) before any bot code runs.
