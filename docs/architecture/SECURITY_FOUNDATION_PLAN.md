# AegisNet Security Foundation Plan

## 1. Overview
AegisNet is currently a frontend-first local prototype. This document outlines the architectural plan for transitioning the application from a mocked UI to a genuinely secure, decentralized, end-to-end encrypted (E2EE) communication platform. 

The security architecture focuses on three pillars:
1.  **Identity and Key Exchange:** Establishing trust without a central authority.
2.  **Transport and Routing:** Ensuring data delivery across varied, potentially hostile networks (Internet, Mesh, Radio).
3.  **Data Security (E2EE):** Ensuring that even if the transport layer is compromised, payload data remains inaccessible to anyone but the intended recipients.

## 2. Double-Ratchet End-to-End Encryption

The core messaging layer will implement the Double Ratchet Algorithm (similar to Signal).

### 2.1 Identity Keys
Each client will generate a long-term Curve25519 Identity Key Pair upon first launch. This identity is the user's root of trust. Public keys will be exchanged out-of-band (e.g., QR codes) or via a trusted introduction.

### 2.2 X3DH (Extended Triple Diffie-Hellman)
To establish a shared secret for the Double Ratchet without requiring both parties to be online simultaneously, we will use X3DH. 
*   **Prekeys:** Clients will periodically publish (to a relay node or DHT) a set of signed, one-time prekeys.
*   **Initial Message:** When Alice messages Bob for the first time, she fetches one of Bob's one-time prekeys, performs the X3DH exchange, and sends the resulting initial message.

### 2.3 The Ratchet Mechanism
*   **KDF (Key Derivation Function):** Every message sent derives a new message key and a new chain key using a KDF (e.g., HKDF-SHA256).
*   **Forward Secrecy:** Because message keys are derived via a one-way function, compromising a current key does not expose past messages.
*   **Future Secrecy:** Periodically (with each new message round-trip), new Diffie-Hellman public keys are attached to the messages, rotating the root key material and ensuring that if a key is compromised, future messages become secure again once a new DH exchange completes.

### 2.4 Group Chats
Group chats will utilize Sender Keys (Signal's approach to group messaging). Each participant generates a Sender Key and distributes it securely via pairwise Double Ratchet sessions to all group members. The Sender Key is then ratcheted forward for each message sent to the group.

## 3. WebRTC Signaling Security

Voice and Video calling currently rely on standard browser `getUserMedia` APIs. In production, calls will run over WebRTC.

### 3.1 Encrypted Signaling
WebRTC requires a signaling server to exchange SDP (Session Description Protocol) and ICE candidates. 
*   **E2EE Signaling Payload:** The SDP offers/answers and ICE candidates will be wrapped as standard encrypted text messages and sent over the existing Double Ratchet messaging channel. 
*   **Signaling Server Blindness:** The signaling relay will only see encrypted blobs, completely unaware of the call metadata or IP addresses contained within.

### 3.2 SRTP (Secure Real-Time Transport Protocol)
Once the WebRTC peer-to-peer connection is established, the media streams are secured using SRTP. The keys for SRTP (DTLS-SRTP) are negotiated via the DTLS handshake over the established P2P connection, meaning the media is natively E2EE.

## 4. Decentralized Transport Mesh Integration

AegisNet's defining feature is its ability to route traffic over non-standard transports when the internet fails. The React frontend will communicate with a local daemon (e.g., a Rust or Go binary running on the device) responsible for hardware interfacing.

### 4.1 The Local Hardware Daemon
*   **Responsibilities:** Managing Bluetooth LE, WiFi Direct, LoRa radios, or Satellite modems.
*   **Frontend Interface:** The React app will communicate with the local daemon via secure WebSockets (WSS) over `localhost`. 
*   **Transport Agnostic:** The frontend will hand an encrypted binary blob (the Double Ratchet message) to the daemon. The daemon is responsible for fragmenting and routing the blob over the available physical transport.

### 4.2 Mesh Routing Protocol
*   **Routing:** The daemon will implement a lightweight mesh routing protocol (like B.A.T.M.A.N. or a custom ad-hoc routing protocol tailored for low bandwidth).
*   **Store and Forward:** For intermittent connectivity, the daemon will hold encrypted payloads until a valid route to the destination (or a relay node) becomes available.

## 5. File Vault Security

### 5.1 Local Storage
Files uploaded to the Vault are stored locally via IndexedDB.
*   **Local at-rest encryption (IMPLEMENTED — prototype):** Vault file *contents* are now encrypted with
    AES-GCM-256 (Web Crypto) and a unique per-file IV *before* being written to IndexedDB. The key is a
    random 256-bit AES-GCM key generated per browser profile and stored in a local IndexedDB key store.
    This is **local at-rest only** — not E2EE, not zero-knowledge. The key is co-located with the data and
    not yet protected by a user secret or hardware-backed key store. Metadata, thumbnails, and chat
    attachments remain unencrypted. See `FILE_VAULT_SECURITY_PLAN.md` for the full threat model, limits,
    and the production hardening path (passphrase/PBKDF2 wrapping, hardware-backed keys, per-workspace key
    hierarchy, recovery, crypto agility).
*   **Integrity:** SHA-256 hashing (computed over the plaintext before encryption) verifies file integrity;
    AES-GCM additionally provides tamper detection on the stored ciphertext.

### 5.2 Secure File Transfer
*   **Symmetric Encryption:** When sending a file over the network, a random AES-GCM-256 key and IV are generated. The file is encrypted with this key.
*   **Key Distribution:** The symmetric key and IV are then encrypted using the established Double Ratchet session and sent as a normal text message alongside a pointer (or chunked payload) for the encrypted file data.
