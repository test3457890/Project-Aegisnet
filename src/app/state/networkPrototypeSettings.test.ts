import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SAFETY_SETTINGS,
  loadJoinRequests,
  loadSafetySettings,
  reviewJoinRequest,
  saveSafetySettings,
  seedJoinRequests,
  validateEmojiFile,
} from "./networkPrototypeSettings";

describe("network prototype settings (local-only)", () => {
  beforeEach(() => localStorage.clear());

  describe("emoji upload safety", () => {
    it("accepts safe raster image types", () => {
      expect(validateEmojiFile({ name: "wave.png", type: "image/png", size: 1000 })).toEqual({ ok: true });
      expect(validateEmojiFile({ name: "wave.gif", type: "image/gif", size: 1000 })).toEqual({ ok: true });
      expect(validateEmojiFile({ name: "wave.webp", type: "image/webp", size: 1000 })).toEqual({ ok: true });
    });

    it("blocks SVG, HTML, scripts, and executables", () => {
      expect(validateEmojiFile({ name: "active.svg", type: "image/svg+xml", size: 100 })).toMatchObject({ ok: false, reason: "blocked-file-type" });
      expect(validateEmojiFile({ name: "page.html", type: "text/html", size: 100 })).toMatchObject({ ok: false, reason: "blocked-file-type" });
      expect(validateEmojiFile({ name: "evil.exe", type: "application/octet-stream", size: 100 })).toMatchObject({ ok: false, reason: "blocked-file-type" });
      expect(validateEmojiFile({ name: "script.js", type: "text/javascript", size: 100 })).toMatchObject({ ok: false, reason: "blocked-file-type" });
      // Even a renamed file with a dangerous MIME type is rejected.
      expect(validateEmojiFile({ name: "sneaky.png.svg", type: "image/png", size: 100 })).toMatchObject({ ok: false, reason: "blocked-file-type" });
    });

    it("rejects unsupported MIME types and oversized files", () => {
      expect(validateEmojiFile({ name: "doc.pdf", type: "application/pdf", size: 100 })).toMatchObject({ ok: false, reason: "unsupported-type" });
      expect(validateEmojiFile({ name: "big.png", type: "image/png", size: 10 * 1024 * 1024 })).toMatchObject({ ok: false, reason: "too-large" });
    });
  });

  describe("safety settings", () => {
    it("round-trips per network with defaults", () => {
      expect(loadSafetySettings("net_x")).toEqual(DEFAULT_SAFETY_SETTINGS);
      saveSafetySettings("net_x", { ...DEFAULT_SAFETY_SETTINGS, requireJoinApproval: false });
      expect(loadSafetySettings("net_x").requireJoinApproval).toBe(false);
      // Another network keeps its own defaults.
      expect(loadSafetySettings("net_y").requireJoinApproval).toBe(true);
    });
  });

  describe("join approval workflow", () => {
    it("seeds pending applications and reviews them", () => {
      const requests = loadJoinRequests("net_x");
      expect(requests.length).toBeGreaterThan(0);
      expect(requests.every((request) => request.status === "pending")).toBe(true);

      const approved = reviewJoinRequest(requests, requests[0].id, "approved");
      expect(approved[0].status).toBe("approved");
      expect(approved[0].reviewedAt).toBeTruthy();

      const rejected = reviewJoinRequest(approved, approved[1].id, "rejected");
      expect(rejected[1].status).toBe("rejected");
    });

    it("seed data only contains safe display metadata", () => {
      for (const request of seedJoinRequests()) {
        expect(Object.keys(request).sort()).toEqual(["displayName", "id", "requestedAt", "status", "userId"]);
      }
    });
  });
});
