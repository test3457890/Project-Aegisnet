import { describe, expect, it } from "vitest";
import {
  cleanupPrototypeFiles,
  deletePrototypeFile,
  getDecryptedPrototypeBlob,
  getPrototypeStorageUsage,
  getPrototypeFile,
  storeEncryptedPrototypeFile,
  storePrototypeFile,
} from "./prototypeFileStore";

describe("prototype IndexedDB file store", () => {
  it("stores, retrieves, and deletes a local file", async () => {
    const file = new File(["family plans"], "plans.txt", { type: "text/plain" });
    const storageId = await storePrototypeFile(file, "stored_test_file");

    const stored = await getPrototypeFile(storageId);
    expect(stored?.name).toBe("plans.txt");
    expect(stored?.size).toBe(file.size);
    expect(stored?.type).toBe("text/plain");

    await deletePrototypeFile(storageId);
    expect(await getPrototypeFile(storageId)).toBeNull();
  });

  it("reports usage and removes only unreferenced files", async () => {
    await storePrototypeFile(new File(["keep"], "keep.txt"), "stored_keep");
    await storePrototypeFile(new File(["remove me"], "remove.txt"), "stored_remove");

    const before = await getPrototypeStorageUsage();
    expect(before.fileCount).toBeGreaterThanOrEqual(2);

    const result = await cleanupPrototypeFiles(["stored_keep"]);
    expect(result.removedCount).toBeGreaterThanOrEqual(1);
    expect(await getPrototypeFile("stored_keep")).not.toBeNull();
    expect(await getPrototypeFile("stored_remove")).toBeNull();

    await deletePrototypeFile("stored_keep");
  });

  it("stores file bytes encrypted at rest and decrypts them back", async () => {
    const file = new File(["top secret vault contents"], "secret.txt", { type: "text/plain" });
    const storageId = await storeEncryptedPrototypeFile(file, "stored_encrypted");

    const stored = await getPrototypeFile(storageId);
    expect(stored?.encrypted).toBe(true);
    expect(stored?.algorithm).toBe("AES-GCM");
    expect(stored?.iv).toHaveLength(12);
    expect(stored?.blob).toBeUndefined();

    // The bytes actually stored in IndexedDB are ciphertext, not the plaintext.
    const storedBytes = new Uint8Array(stored!.cipher!);
    expect(new TextDecoder().decode(storedBytes)).not.toContain("top secret");

    // The same browser profile can decrypt and recover the original content.
    const decrypted = await getDecryptedPrototypeBlob(storageId);
    expect(decrypted).not.toBeNull();
    expect(decrypted!.size).toBe(file.size);

    await deletePrototypeFile(storageId);
  });
});
