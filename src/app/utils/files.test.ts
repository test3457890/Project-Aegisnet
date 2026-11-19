import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_IMAGE_BYTES,
  formatBytes,
  getRoomConversationId,
  validatePrototypeFile,
} from "./files";

describe("prototype file validation", () => {
  it("accepts supported document and image types", () => {
    expect(validatePrototypeFile(new File(["hello"], "notes.txt", { type: "text/plain" }))).toBeNull();
    expect(validatePrototypeFile(new File(["image"], "photo.webp", { type: "image/webp" }), true)).toBeNull();
  });

  it("returns friendly errors for unsupported and oversized files", () => {
    expect(validatePrototypeFile(new File(["bad"], "script.exe"))).toContain("not supported");
    expect(validatePrototypeFile(new File([new Uint8Array(MAX_ATTACHMENT_BYTES + 1)], "big.pdf"))).toContain("too large");
    expect(validatePrototypeFile(new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "photo.jpg"), true)).toContain("Image previews");
  });

  it("keeps same-named rooms separate by Network", () => {
    expect(getRoomConversationId("net_family", "room_photos")).toBe("network:net_family:room:room_photos");
    expect(getRoomConversationId("net_hiking", "room_photos")).not.toBe(getRoomConversationId("net_family", "room_photos"));
  });

  it("formats file sizes for display", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
});
