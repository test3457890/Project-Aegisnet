# Hardware Node Plan

## Overview
AegisNet Hardware Nodes will serve as dedicated, always-on infrastructure to support the decentralized mesh network. These devices will function as relays, local network controllers, and secure data vaults.

## Node Types
1. **Base Station Node**: High-power device (e.g., Raspberry Pi or custom board) connected to mains power and an external antenna. Acts as the primary local relay and persistent storage vault for a specific Network (Group).
2. **Tactical Node**: Battery-powered portable node with LoRa and BLE. Designed to be carried in a backpack to provide a mobile mesh bridge for a squad or family group.
3. **Emergency Drop Node**: Small, low-cost solar-powered repeaters that can be left in elevated positions to extend range.

## Software Stack (Planned)
- **Language**: **[IN PROGRESS - Sprint 5]** Go (Golang) is chosen for the backend daemon for its high concurrency, easy cross-compilation, and zero-dependency binaries. Scaffolding is located in `services/daemon/`.
- **OS**: Minimal Linux distribution or RTOS (for drop nodes).
- **Daemon**: A headless version of the AegisNet backend written in Go for high performance and low memory footprint.
- **Interface**: Managed via the AegisNet mobile or desktop app using a Bluetooth or Local WiFi pairing process.

## Connectivity integration
- Nodes will interface with the `connectionModes.ts` router. If the internet is down, the mobile app will automatically failover to communicating with the nearest Hardware Node via Local Network or Bluetooth.
