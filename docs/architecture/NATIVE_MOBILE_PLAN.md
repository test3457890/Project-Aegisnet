# Native Mobile Plan

## Overview
While the current prototype is a React web application, AegisNet is ultimately designed to be a civilian-first mobile application (iOS/Android). This document outlines the migration path and architecture for the native mobile clients.

## Technology Choice
- **React Native / Expo**: To maximize code reuse from this React web prototype, the mobile app will be built using React Native.
- **Why?**: The state management, crypto logic (WebCrypto polyfills), and UI component logic can be largely shared between the desktop/web client and the mobile clients.

## Native Capabilities Required
1. **Bluetooth Low Energy (BLE)**: For local mesh networking and hardware node pairing.
2. **Local Networking API**: For mDNS discovery and local WebRTC signaling without internet.
3. **Background Tasks**: To keep the mesh network alive and relay packets while the app is backgrounded.
4. **Secure Enclave / Keystore**: For secure, hardware-backed storage of private keys.
5. **Camera/Microphone**: Native WebRTC implementation for high-performance encrypted calls.

## Migration Path
1. **[IN PROGRESS - Sprint 5]** Scaffold the baseline Expo App in `apps/mobile/`.
2. Abstract all UI components from DOM elements (e.g., `div`, `span`) into cross-platform primitives or use a library like Tamagui.
3. Port the `MockAppStateContext` into a robust SQLite + Zustand/Redux architecture.
4. Develop Native Modules for the specific networking requirements (LoRa serial via USB OTG, BLE mesh).
