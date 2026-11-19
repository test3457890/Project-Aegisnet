# Data Lifecycle, Retention & Export Plan

This document establishes the expectations for data retention, cleanup, and portability within the AegisNet MVP. Because AegisNet is a civilian-first privacy prototype, user expectations must exactly match technical behavior.

## 1. Backend Uploads (Retention & Cleanup)

The `services/api` backend currently acts as a shared MVP testing server. It is NOT a durable cloud storage service.

* **Retention:** Uploaded file binaries (`/uploads`) and their normalized SQLite metadata (`files` table) persist indefinitely by default until explicitly deleted by a user or an admin cleanup action.
* **Cleanup Behavior:**
  * **Explicit Deletion:** Calling `DELETE /files/:id` removes the database record and synchronously deletes the file binary from disk.
  * **Orphan Cleanup:** The endpoint `POST /files/cleanup-orphans` allows administrators to sweep the database and filesystem to identify and remove binaries that have no corresponding metadata, or metadata that points to missing binaries.
* **Future Evolution:** If a production service is ever launched, a TTL (Time-To-Live) sweeping cron job must be introduced to automatically prune expired messages and their attached media based on network or conversation retention policies.

## 2. Browser-Local IndexedDB (The File Vault)

The File Vault stores encrypted file binaries locally inside the browser's IndexedDB.

* **Retention:** Files remain in IndexedDB until manually deleted by the user via the File Vault UI, or until the browser evicts the storage due to low disk space (Quota Exceeded).
* **Cleanup Behavior:** Deleting a file from the Vault drops the `blob` from IndexedDB instantly. The Vault provides manual reference-aware cleanup and a one-click "Wipe All Local Files" action.
* **Privacy Boundary:** Vault contents are never synchronized to the backend. The encryption key is randomly generated per browser profile and stored in `localStorage`. If the browser clears site data, the key is destroyed and the files are cryptographically unrecoverable.

## 3. Export and Import Lifecycle

The Export/Import function (found in Settings > Device Settings > Data Management) provides local portability without involving the backend.

* **Scope:** It exports the contents of `localStorage` (preferences, encryption keys, unread state) and `IndexedDB` (encrypted Vault binaries).
* **Privacy Expectation:** The exported JSON bundle is **unencrypted**. While the Vault file binaries inside the JSON are still encrypted AES-GCM blobs, everything else (keys, settings, chat drafts) is plaintext. Users must treat the exported `.json` file as sensitive material.
* **Import Behavior:** Importing a bundle completely overwrites the existing local state. It clears IndexedDB, drops current `localStorage` AegisNet keys, and restores the imported ones. It forces a browser reload upon success.

## 4. Disappearing Messages

Disappearing messages are an explicitly **local-only** feature.

* When a message expires locally, it is filtered from the UI and swept from `localStorage`.
* If the message contained an attachment, its local cached binary is also swept.
* **Critically:** This does not issue a remote recall or deletion command to the backend or to other participants' devices. It is solely an on-device privacy cleanup mechanism.
