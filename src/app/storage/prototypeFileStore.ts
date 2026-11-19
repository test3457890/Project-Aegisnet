import { decryptBytes, encryptBytes, VAULT_CRYPTO_ALGORITHM } from "./vaultCrypto";

const DATABASE_NAME = "aegisnet-prototype-files";
const DATABASE_VERSION = 1;
const STORE_NAME = "files";

export interface StoredPrototypeFile {
  id: string;
  name: string;
  type: string;
  size: number;
  storedAt: string;
  /** Plaintext bytes for unencrypted records (e.g. message attachments). Absent when `encrypted`. */
  blob?: Blob;
  /** True when the stored bytes are AES-GCM ciphertext held in `cipher` and must be decrypted before use. */
  encrypted?: boolean;
  /** AES-GCM ciphertext bytes (only present when `encrypted`). */
  cipher?: ArrayBuffer;
  /** Per-file AES-GCM IV (only present when `encrypted`). */
  iv?: number[];
  /** Encryption algorithm label (only present when `encrypted`). */
  algorithm?: string;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local file storage is not available in this browser."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local file storage could not be opened."));
  });
}

function completeTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error("The local file operation was cancelled."));
    transaction.onerror = () => reject(transaction.error || new Error("The local file operation failed."));
  });
}

export async function storePrototypeFile(file: File, id = `stored_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put({
    id,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    storedAt: new Date().toISOString(),
    blob: file,
  } satisfies StoredPrototypeFile);
  await completeTransaction(transaction);
  database.close();
  return id;
}

/**
 * Encrypt a file's bytes with the local Vault key (AES-GCM, unique IV) and store the ciphertext.
 * Plaintext never touches IndexedDB. The original name/type are kept as metadata for later download.
 */
export async function storeEncryptedPrototypeFile(file: File, id = `stored_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`) {
  const plaintext = await file.arrayBuffer();
  const { iv, ciphertext, algorithm } = await encryptBytes(plaintext);

  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put({
    id,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: ciphertext.byteLength,
    storedAt: new Date().toISOString(),
    encrypted: true,
    cipher: ciphertext,
    iv,
    algorithm,
  } satisfies StoredPrototypeFile);
  await completeTransaction(transaction);
  database.close();
  return id;
}

export async function getPrototypeFile(id: string) {
  const database = await openDatabase();
  const result = await new Promise<StoredPrototypeFile | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as StoredPrototypeFile | undefined);
    request.onerror = () => reject(request.error || new Error("The local file could not be read."));
  });
  database.close();
  return result || null;
}

export async function deletePrototypeFile(id: string) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(id);
  await completeTransaction(transaction);
  database.close();
}

export async function clearPrototypeFiles() {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).clear();
  await completeTransaction(transaction);
  database.close();
}

export async function listPrototypeFiles() {
  const database = await openDatabase();
  const result = await new Promise<StoredPrototypeFile[]>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result || []) as StoredPrototypeFile[]);
    request.onerror = () => reject(request.error || new Error("Local file inventory could not be read."));
  });
  database.close();
  return result;
}

export async function getPrototypeStorageUsage() {
  const files = await listPrototypeFiles();
  return {
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + file.size, 0),
  };
}

export async function cleanupPrototypeFiles(referencedIds: Iterable<string>) {
  const referenced = new Set(referencedIds);
  const files = await listPrototypeFiles();
  const unused = files.filter((file) => !referenced.has(file.id));
  await Promise.all(unused.map((file) => deletePrototypeFile(file.id)));
  return {
    removedCount: unused.length,
    removedBytes: unused.reduce((total, file) => total + file.size, 0),
  };
}

/**
 * Return a usable (decrypted if necessary) Blob for a stored file. Throws a friendly error when an
 * encrypted file cannot be decrypted with the local key (e.g. the key was cleared).
 */
export async function getDecryptedPrototypeBlob(storageId: string): Promise<Blob | null> {
  const storedFile = await getPrototypeFile(storageId);
  if (!storedFile) return null;
  if (!storedFile.encrypted) return storedFile.blob || null;

  try {
    const plaintext = await decryptBytes({ iv: storedFile.iv || [], ciphertext: storedFile.cipher || new ArrayBuffer(0) });
    return new Blob([plaintext], { type: storedFile.type || "application/octet-stream" });
  } catch {
    throw new Error("This encrypted file could not be unlocked with the local key on this device.");
  }
}

export async function downloadPrototypeFile(storageId: string, fallbackName: string) {
  const storedFile = await getPrototypeFile(storageId);
  if (!storedFile) {
    throw new Error("This file is no longer available in local browser storage.");
  }

  const blob = storedFile.encrypted ? await getDecryptedPrototypeBlob(storageId) : storedFile.blob;
  if (!blob) {
    throw new Error("This file is no longer available in local browser storage.");
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = storedFile.name || fallbackName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
