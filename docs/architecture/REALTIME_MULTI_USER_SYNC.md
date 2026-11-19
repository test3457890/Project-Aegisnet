# Real-Time Multi-User Sync Foundation

This document outlines the foundation for real-time multi-user synchronization in the AegisNet prototype.

## Architecture Overview

AegisNet's real-time synchronization uses a topic-based publish/subscribe (Pub/Sub) model over WebSockets. This design ensures that clients only receive updates for the contexts they are actively participating in (e.g., specific Networks, Rooms, or Direct Messages).

### Key Components

1. **WebSocket Server (`services/api/src/websocket/ws.ts`)**
   - Handles client connections and manages subscriptions to topics.
   - Enforces database-backed authorization checks before allowing subscriptions.
   - Broadcasts `SyncEvent` envelopes to subscribed clients.

2. **SyncEvent Envelope**
   All broadcast messages are encapsulated in a standard envelope:
   ```typescript
   interface SyncEvent {
     eventId: string;        // Unique identifier for the event
     eventType: string;      // Event type (e.g., 'message:created', 'typing:started')
     actorId: string;        // ID of the user who triggered the event
     createdAt: string;      // Timestamp of the event
     schemaVersion: number;  // Schema version (currently 1)
     payload: any;           // Event-specific data
     clientMutationId?: string; // Optional client-provided ID for deduplication
   }
   ```

3. **Frontend WebSocket Client (`src/app/api/wsClient.ts`)**
   - Maintains the WebSocket connection to the backend.
   - Implements exponential backoff for reconnections.
   - Manages active subscriptions and automatically re-subscribes after a reconnection.
   - Dispatches incoming events to registered listeners.

### Topic Model

Subscriptions are scoped to specific entities to minimize unnecessary data transfer and improve privacy.
The primary topic formats are:

- `network:<networkId>`: For events relevant to an entire network (e.g., role changes, room creation).
- `room:<roomId>`: For events within a specific room (e.g., messages, typing indicators).
- `user:<userId>`: For events specific to a single user (e.g., file uploads, direct messages).
- `call:state`: For tracking active prototype call states.

## Feature Implementation Details

### Subscriptions & Authorization

Clients must explicitly request to subscribe to a topic using a `subscribe` message.
The backend intercepts these requests and verifies the user's access rights using the `network_members` database table or other relevant checks.

### Typing Indicators

Typing indicators are broadcast via the WebSocket connection but are **not persisted** to the database. They are ephemeral events designed to improve user experience.
- The UI places typing indicators at the bottom of the message timeline.
- To protect privacy, typed text and draft content are never logged or transmitted in typing events.
- Indicators automatically expire after a short timeout if a "stopped typing" event is missed.

### Deduplication

To prevent duplicate messages when a client sends a message via the REST API and receives the same message back via the WebSocket broadcast, a `clientMutationId` is used. The frontend client generates this ID, includes it in the REST payload, and ignores incoming WebSocket events with a matching `clientMutationId`.

## Constraints & Security Notes

- **Prototype Status:** This foundation is built for the prototype phase. It does not implement production-grade end-to-end encryption (E2EE), Signal protocol, or MLS.
- **Privacy:** Message bodies and drafts must never be logged in QA events, audit logs, or diagnostics. Only metadata is logged.
- **Ephemeral State:** Real-time presence and typing states are explicitly ephemeral and are not stored.
