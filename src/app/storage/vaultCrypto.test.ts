import { describe, expect, it } from "vitest";
import {
  __resetVaultKeyCacheForTests,
  decryptBytes,
  encryptBytes,
  getOrCreateVaultKey,
  isVaultCryptoAvailable,
} from "./vaultCrypto";

const toBuffer = (text: string): ArrayBuffer => {
  const encoded = new TextEncoder().encode(text);
  return encoded.buffer.slice(0, encoded.byteLength);
};
const toText = (buffer: ArrayBuffer): string => new TextDecoder().decode(new Uint8Array(buffer));

describe("vaultCrypto", () => {
  it("exposes Web Crypto in this environment", () => {
    expect(isVaultCryptoAvailable()).toBe(true);
  });

  it("round-trips data through AES-GCM with a 12-byte IV", async () => {
    const payload = await encryptBytes(toBuffer("vault secret 123"));
    expect(payload.algorithm).toBe("AES-GCM");
    expect(payload.iv).toHaveLength(12);

    const plaintext = await decryptBytes(payload);
    expect(toText(plaintext)).toBe("vault secret 123");
  });

  it("uses a unique IV (and produces different ciphertext) for identical input", async () => {
    const first = await encryptBytes(toBuffer("same data"));
    const second = await encryptBytes(toBuffer("same data"));
    expect(first.iv).not.toEqual(second.iv);
    expect(new Uint8Array(first.ciphertext)).not.toEqual(new Uint8Array(second.ciphertext));
  });

  it("fails to decrypt when the IV is altered", async () => {
    const payload = await encryptBytes(toBuffer("tamper me"));
    const altered = { ...payload, iv: payload.iv.map((value, index) => (index === 0 ? value ^ 0xff : value)) };
    await expect(decryptBytes(altered)).rejects.toBeDefined();
  });

  it("reuses one persisted key across cache resets (same profile)", async () => {
    await getOrCreateVaultKey();
    const payload = await encryptBytes(toBuffer("persisted"));

    // Simulate a fresh page load: drop the in-memory cache, reload the key from IndexedDB.
    __resetVaultKeyCacheForTests();
    const plaintext = await decryptBytes(payload);
    expect(toText(plaintext)).toBe("persisted");
  });
});
