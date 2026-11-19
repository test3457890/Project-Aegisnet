import { listPrototypeFiles, clearPrototypeFiles } from "../storage/prototypeFileStore";
import { downloadText } from "../components/admin/adminShared";

const DATABASE_NAME = "aegisnet-prototype-files";
const DATABASE_VERSION = 1;
const STORE_NAME = "files";

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function base64ToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function exportLocalData() {
  const data: any = {
    localStorage: {},
    indexedDB: []
  };

  // Export localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("aegisnet_")) {
      data.localStorage[key] = localStorage.getItem(key);
    }
  }

  // Export IndexedDB
  const files = await listPrototypeFiles();
  for (const file of files) {
    const exportedFile: any = {
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      storedAt: file.storedAt,
      encrypted: file.encrypted,
      algorithm: file.algorithm
    };

    if (file.blob) {
      exportedFile.blobBase64 = await blobToBase64(file.blob);
    }
    if (file.cipher) {
      exportedFile.cipherBase64 = arrayBufferToBase64(file.cipher);
    }
    if (file.iv) {
      exportedFile.iv = Array.from(file.iv);
    }
    
    data.indexedDB.push(exportedFile);
  }

  const json = JSON.stringify(data, null, 2);
  downloadText(`aegisnet-export-${Date.now()}.json`, json);
}

export async function importLocalData(jsonString: string) {
  const data = JSON.parse(jsonString);

  if (!data || !data.localStorage) {
    throw new Error("Invalid AegisNet export file.");
  }

  // Restore localStorage
  for (const key of Object.keys(data.localStorage)) {
    if (key.startsWith("aegisnet_")) {
      localStorage.setItem(key, data.localStorage[key]);
    }
  }

  // Restore IndexedDB
  if (data.indexedDB && Array.isArray(data.indexedDB)) {
    await clearPrototypeFiles();

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const transaction = db.transaction(STORE_NAME, "readwrite");
    for (const exportedFile of data.indexedDB) {
      const storedFile: any = {
        id: exportedFile.id,
        name: exportedFile.name,
        type: exportedFile.type,
        size: exportedFile.size,
        storedAt: exportedFile.storedAt,
        encrypted: exportedFile.encrypted,
        algorithm: exportedFile.algorithm
      };

      if (exportedFile.blobBase64) {
        storedFile.blob = await base64ToBlob(exportedFile.blobBase64);
      }
      if (exportedFile.cipherBase64) {
        storedFile.cipher = base64ToArrayBuffer(exportedFile.cipherBase64);
      }
      if (exportedFile.iv) {
        storedFile.iv = exportedFile.iv;
      }

      transaction.objectStore(STORE_NAME).put(storedFile);
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    db.close();
  }
}
