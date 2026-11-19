import { beforeEach, describe, expect, it } from "vitest";
import {
  clearQaEvents,
  getQaEvents,
  logQaEvent,
  QA_EVENT_CAP,
  sanitizeQaEvent,
} from "./qaEvents";

describe("qaEvents (metadata-only QA log)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("logs an event with safe metadata fields", () => {
    logQaEvent({ type: "profile.opened", userId: "user_me", targetUserId: "user_sarah" });
    const events = getQaEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("profile.opened");
    expect(events[0].userId).toBe("user_me");
    expect(events[0].targetUserId).toBe("user_sarah");
    expect(events[0].ts).toBeTruthy();
  });

  it("strips non-whitelisted fields so private content can never be stored", () => {
    const event = sanitizeQaEvent({
      type: "trusted.contact.changed",
      userId: "user_me",
      // These must all be dropped — they are not safe metadata fields.
      ...({
        messageBody: "secret message text",
        bio: "private bio",
        note: "private trust note",
        password: "hunter2",
        token: "auth-token",
        fileContents: "binary",
        activityText: "private activity post",
        adminNotes: "private admin note text",
        adminNoteText: "private admin note text",
        roleRequestReason: "private role request reason text",
        announcementBodyText: "private announcement body text",
        onboardingAnswerText: "private onboarding answer text",
        messageText: "private message text"
      } as object),
    });
    const keys = Object.keys(event);
    expect(keys).not.toContain("messageBody");
    expect(keys).not.toContain("bio");
    expect(keys).not.toContain("note");
    expect(keys).not.toContain("password");
    expect(keys).not.toContain("token");
    expect(keys).not.toContain("fileContents");
    expect(keys).not.toContain("activityText");
    expect(keys).not.toContain("adminNotes");
    expect(keys).not.toContain("adminNoteText");
    expect(keys).not.toContain("roleRequestReason");
    expect(keys).not.toContain("announcementBodyText");
    expect(keys).not.toContain("onboardingAnswerText");
    expect(keys).not.toContain("messageText");
  });

  it("clamps reason codes so they cannot carry long free text", () => {
    const event = sanitizeQaEvent({ type: "api.error", reason: "x".repeat(500) });
    expect(event.reason!.length).toBeLessThanOrEqual(64);
  });

  it("caps the stored log", () => {
    for (let i = 0; i < QA_EVENT_CAP + 25; i++) {
      logQaEvent({ type: "privacy.preference.toggled", reason: `toggle-${i}` });
    }
    expect(getQaEvents().length).toBe(QA_EVENT_CAP);
    // Newest first.
    expect(getQaEvents()[0].reason).toBe(`toggle-${QA_EVENT_CAP + 24}`);
  });

  it("clears the log", () => {
    logQaEvent({ type: "roster.member.clicked" });
    clearQaEvents();
    expect(getQaEvents()).toHaveLength(0);
  });

  it("serialized log contains no secret-bearing keys", () => {
    logQaEvent({ type: "trust.level.changed", targetUserId: "user_sarah", reason: "level:trusted" });
    const raw = localStorage.getItem("aegisnet_qaEvents") || "";
    for (const banned of [
      "message", "body", "bio", "password", "token", "key", "plaintext", "content",
      "adminNotes", "adminNoteText", "roleRequestReason", "announcementBodyText", "onboardingAnswerText", "messageText"
    ]) {
      expect(raw.toLowerCase()).not.toContain(`"${banned.toLowerCase()}"`);
    }
  });
});
