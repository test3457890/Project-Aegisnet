import { describe, expect, it } from "vitest";
import {
  computeExpiresAt,
  formatTimeLeft,
  hashLockPin,
  isExpired,
  LOCKDOWN_ENFORCED_SECONDS,
  maskSnippet,
  resolveDisappearSeconds,
} from "./privacy";

describe("resolveDisappearSeconds", () => {
  it("passes through a chosen lifetime in normal and shield modes", () => {
    expect(resolveDisappearSeconds(3600, "normal")).toBe(3600);
    expect(resolveDisappearSeconds(3600, "shield")).toBe(3600);
  });

  it("treats off (0) as no expiry outside lockdown", () => {
    expect(resolveDisappearSeconds(0, "normal")).toBe(0);
    expect(resolveDisappearSeconds(0, "shield")).toBe(0);
  });

  it("enforces a 24h lifetime in lockdown when off is selected", () => {
    expect(resolveDisappearSeconds(0, "lockdown")).toBe(LOCKDOWN_ENFORCED_SECONDS);
  });

  it("never lets lockdown exceed the enforced ceiling", () => {
    expect(resolveDisappearSeconds(60 * 60 * 24 * 7, "lockdown")).toBe(LOCKDOWN_ENFORCED_SECONDS);
    expect(resolveDisappearSeconds(60, "lockdown")).toBe(60);
  });
});

describe("computeExpiresAt", () => {
  it("returns undefined when the message should never expire", () => {
    expect(computeExpiresAt(1_000, 0, "normal")).toBeUndefined();
  });

  it("returns an absolute timestamp for a finite lifetime", () => {
    expect(computeExpiresAt(1_000, 3600, "shield")).toBe(1_000 + 3600 * 1000);
  });

  it("applies the lockdown floor", () => {
    expect(computeExpiresAt(0, 0, "lockdown")).toBe(LOCKDOWN_ENFORCED_SECONDS * 1000);
  });
});

describe("isExpired", () => {
  it("is false when there is no expiry", () => {
    expect(isExpired({ expiresAt: undefined }, 10_000)).toBe(false);
  });

  it("is true once the expiry time has passed", () => {
    expect(isExpired({ expiresAt: 5_000 }, 5_000)).toBe(true);
    expect(isExpired({ expiresAt: 5_000 }, 5_001)).toBe(true);
    expect(isExpired({ expiresAt: 5_000 }, 4_999)).toBe(false);
  });
});

describe("maskSnippet", () => {
  it("shows the real snippet in normal mode", () => {
    expect(maskSnippet("See you at 5", "normal")).toBe("See you at 5");
  });

  it("hides the snippet in shield and lockdown modes", () => {
    expect(maskSnippet("See you at 5", "shield")).toBe("Message hidden for privacy");
    expect(maskSnippet("See you at 5", "lockdown")).toBe("Message hidden for privacy");
  });
});

describe("formatTimeLeft", () => {
  it("describes remaining minutes, hours, and days", () => {
    const now = 0;
    expect(formatTimeLeft(30 * 60 * 1000, now)).toBe("30m left");
    expect(formatTimeLeft(3 * 60 * 60 * 1000, now)).toBe("3h left");
    expect(formatTimeLeft(5 * 24 * 60 * 60 * 1000, now)).toBe("5d left");
  });

  it("reports expiring when no time remains", () => {
    expect(formatTimeLeft(1_000, 2_000)).toBe("Expiring");
  });
});

describe("hashLockPin", () => {
  it("is stable for the same PIN and differs for different PINs", () => {
    expect(hashLockPin("1234")).toBe(hashLockPin("1234"));
    expect(hashLockPin("1234")).not.toBe(hashLockPin("4321"));
  });

  it("does not contain the raw PIN", () => {
    expect(hashLockPin("9876")).not.toContain("9876");
  });
});
