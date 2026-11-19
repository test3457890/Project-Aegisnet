# Mesh and P2P Networking Plan

## Overview
AegisNet's long-term goal is to function entirely off-grid using decentralized protocols. This document outlines the planned technical architecture for migrating the current "Mock Local" architecture to a true Peer-to-Peer (P2P) and Mesh network.

## Core Concepts
1. **Local-First Sync**: Devices must be able to operate entirely locally, queuing messages when disconnected and syncing asynchronously when connected.
2. **Transport Agnostic**: The application should not care how a message is transmitted (Internet, Local WiFi, Bluetooth, Radio Relay). It only cares that a payload reaches a recipient.
3. **Decentralized Relay**: Hardware nodes and mobile devices will act as relays, passing encrypted packets across the network without requiring a centralized server.

## Technologies Under Consideration
- **WebRTC**: For high-bandwidth internet or local network P2P (calls, large files).
- **Bluetooth Low Energy (BLE)**: For short-range mesh messaging in dense environments.
- **LoRa / Meshtastic Protocol**: For long-range, low-bandwidth text messaging and telemetry via dedicated hardware nodes.
- **CRDTs (Conflict-free Replicated Data Types)**: e.g., Yjs or Automerge for managing distributed state across peers without conflicts.

## Phased Implementation
### Phase 1: Local Network Sync (Planned)
- Implement WebRTC data channels for discovery and sync on the same local network (mDNS).
- Introduce the `OfflineQueue` pattern to store outgoing messages in IndexedDB when a connection is unavailable.

### Phase 2: Bluetooth / BLE Mesh (Planned)
- Integrate React Native BLE plugins (for the mobile app) to establish a localized mesh.
- Develop a bridging layer where a device connected to both BLE and WiFi acts as a bridge for isolated peers.

### Phase 3: Hardware Node Integration (Planned)
- Connect to LoRa radios via Serial/USB/Bluetooth.
- Implement packet chunking for large payloads over low-bandwidth connections.

## Security Considerations
All payloads must be encrypted client-side using the `SECURITY_FOUNDATION_PLAN.md` specifications before entering the transport layer. Relays will route packets based on obfuscated headers, without the ability to read the contents.
