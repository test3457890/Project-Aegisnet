/**
 * Local at-rest encryption for the File Vault (prototype).
 *
 * HONESTY BOUNDARY — read before relying on this:
 * - This encrypts Vault file *contents* at rest in the browser using AES-GCM-256 via the Web Crypto API.
 * - It is NOT end-to-end encryption, NOT zero-knowledge, and NOT military/government-grade security.
 * - The encryption key is generated randomly per browser profile and stored locally in IndexedDB,
 *   i.e. next to the encrypted data. This protects against casual inspection or copying of the file
 *   store on its own, but NOT against an attacker with full access to this browser profile's storage.
 * - If the local key is lost (e.g. the user clears site data / "Wipe Device"), encrypted prototype
 *   files cannot be recovered. There is no key backup or recovery in this prototype.
 *
 * See docs/architecture/FILE_VAULT_SECURITY_PLAN.md for the full threat model and limitations.
 */

const KEY_DATABASE = "aegisnet-vault-keys";
const KEY_DATABASE_VERSION = 1;
const KEY_STORE = "keys";
const KEY_ID = "vault-master-key-v1";

export const VAULT_CRYPTO_ALGORITHM = "AES-GCM";
const KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12; // 96-bit IV is the recommended size for AES-GCM.

export interface EncryptedFilePayload {
  algorithm: typeof VAULT_CRYPTO_ALGORITHM;
  /** Unique random IV for this file, stored as a plain number array for IndexedDB. */
  iv: number[];
  ciphertext: ArrayBuffer;
}

/** True when the browser exposes the Web Crypto primitives needed for Vault encryption. */
export function isVaultCryptoAvailable(): boolean {
  return (
    typeof crypto !== "undefined"
    && typeof crypto.subtle !== "undefined"
    && typeof crypto.getRandomValues === "function"
  );
}

function openKeyDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local key storage is not available in this browser."));
      return;
    }
    const request = indexedDB.open(KEY_DATABASE, KEY_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(KEY_STORE)) {
        request.result.createObjectStore(KEY_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local key storage could not be opened."));
  });
}

async function readStoredRawKey(): Promise<ArrayBuffer | null> {
  const database = await openKeyDatabase();
  const result = await new Promise<ArrayBuffer | undefined>((resolve, reject) => {
    const request = database.transaction(KEY_STORE, "readonly").objectStore(KEY_STORE).get(KEY_ID);
    request.onsuccess = () => resolve(request.result as ArrayBuffer | undefined);
    request.onerror = () => reject(request.error || new Error("Local key could not be read."));
  });
  database.close();
  return result || null;
}

async function writeStoredRawKey(raw: ArrayBuffer): Promise<void> {
  const database = await openKeyDatabase();
  const transaction = database.transaction(KEY_STORE, "readwrite");
  transaction.objectStore(KEY_STORE).put(raw, KEY_ID);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Local key could not be saved."));
    transaction.onabort = () => reject(transaction.error || new Error("Saving the local key was cancelled."));
  });
  database.close();
}

let cachedKey: CryptoKey | null = null;

/**
 * Return the per-profile Vault key, generating and persisting a fresh random key the first time.
 * The key is unique per browser profile and is never hardcoded or shared between users.
 */
export async function getOrCreateVaultKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const existing = await readStoredRawKey();
  if (existing) {
    cachedKey = await crypto.subtle.importKey(
      "raw",
      existing,
      { name: VAULT_CRYPTO_ALGORITHM },
      true,
      ["encrypt", "decrypt"],
    );
    return cachedKey;
  }

  const key = await crypto.subtle.generateKey(
    { name: VAULT_CRYPTO_ALGORITHM, length: KEY_LENGTH_BITS },
    true,
    ["encrypt", "decrypt"],
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  await writeStoredRawKey(raw);
  cachedKey = key;
  return key;
}

/** Encrypt raw bytes with the Vault key and a fresh, unique IV. */
export async function encryptBytes(data: ArrayBuffer): Promise<EncryptedFilePayload> {
  const key = await getOrCreateVaultKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const ciphertext = await crypto.subtle.encrypt({ name: VAULT_CRYPTO_ALGORITHM, iv }, key, data);
  return { algorithm: VAULT_CRYPTO_ALGORITHM, iv: Array.from(iv), ciphertext };
}

/** Decrypt bytes previously produced by {@link encryptBytes}. Throws if the key/IV do not match. */
export async function decryptBytes(payload: { iv: number[]; ciphertext: ArrayBuffer }): Promise<ArrayBuffer> {
  const key = await getOrCreateVaultKey();
  const iv = new Uint8Array(payload.iv);
  return crypto.subtle.decrypt({ name: VAULT_CRYPTO_ALGORITHM, iv }, key, payload.ciphertext);
}

/**
 * Remove the local Vault key. After this, previously encrypted Vault files cannot be decrypted.
 * Used by the "Wipe Device" / clear-local-data flow.
 */
export async function clearVaultKey(): Promise<void> {
  cachedKey = null;
  if (typeof indexedDB === "undefined") return;
  const database = await openKeyDatabase();
  const transaction = database.transaction(KEY_STORE, "readwrite");
  transaction.objectStore(KEY_STORE).delete(KEY_ID);
  await new Promise<void>((resolve) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  database.close();
}

/** Test-only: drop the in-memory key cache so a fresh key state can be exercised. */
export function __resetVaultKeyCacheForTests(): void {
  cachedKey = null;
}
