import { describe, expect, it } from "vitest";
import { MockNetwork } from "../data/mockNetworks";
import {
  buildTrustRecord,
  isAtLeast,
  mutualNetworks,
  mutualTrustedContacts,
  seededTrustRecords,
  TRUST_LEVELS,
  TRUST_PROTOTYPE_WARNING,
  trustLevelInfo,
} from "./trust";

const networks: Record<string, MockNetwork> = {
  net_a: {
    id: "net_a", name: "Family Network", initials: "FA", color: "bg-indigo-600",
    ownerId: "user_me", memberIds: ["user_me", "user_sarah", "user_john"], rooms: [],
  },
  net_b: {
    id: "net_b", name: "Hiking Club Network", initials: "HC", color: "bg-green-600",
    ownerId: "user_marcus", memberIds: ["user_marcus", "user_sarah"], rooms: [],
  },
};

describe("trust model (local prototype)", () => {
  it("exposes the four implemented trust levels", () => {
    expect(TRUST_LEVELS.map((l) => l.level)).toEqual([
      "not-trusted", "known", "trusted", "verified-in-person",
    ]);
  });

  it("orders levels for at-least comparisons", () => {
    expect(isAtLeast("trusted", "known")).toBe(true);
    expect(isAtLeast("known", "trusted")).toBe(false);
    expect(isAtLeast("verified-in-person", "trusted")).toBe(true);
  });

  it("builds a record with trustedAt preserved across reviews", () => {
    const first = buildTrustRecord("user_sarah", "known", "user_me", { reason: "neighbor" });
    const reviewed = buildTrustRecord("user_sarah", "trusted", "user_me", { previous: first });
    expect(reviewed.trustedAt).toBe(first.trustedAt);
    expect(reviewed.level).toBe("trusted");
    expect(reviewed.reason).toBe("neighbor");
    expect(Date.parse(reviewed.lastReviewedAt)).toBeGreaterThanOrEqual(Date.parse(first.lastReviewedAt));
  });

  it("clears a note when an empty note is explicitly provided", () => {
    const first = buildTrustRecord("user_sarah", "trusted", "user_me", { note: "met at school" });
    expect(first.note).toBe("met at school");
    const cleared = buildTrustRecord("user_sarah", "trusted", "user_me", { note: "", previous: first });
    expect(cleared.note).toBeUndefined();
  });

  it("computes Mutual Networks from shared membership", () => {
    const shared = mutualNetworks("user_me", "user_sarah", networks);
    expect(shared.map((n) => n.id)).toEqual(["net_a"]);
    expect(mutualNetworks("user_me", "user_marcus", networks)).toHaveLength(0);
  });

  it("computes mutual trusted contacts through shared Networks", () => {
    const trusted = {
      user_sarah: buildTrustRecord("user_sarah", "trusted", "user_me"),
      user_john: buildTrustRecord("user_john", "known", "user_me"),
    };
    // Sarah is trusted and shares net_b with Marcus.
    expect(mutualTrustedContacts("user_marcus", trusted, networks)).toEqual(["user_sarah"]);
    // John is only "known", so he never counts as a mutual *trusted* contact.
    expect(mutualTrustedContacts("user_sarah", trusted, networks)).toEqual([]);
  });

  it("uses honest prototype wording with no cryptographic claims", () => {
    expect(TRUST_PROTOTYPE_WARNING).toContain("local prototype label");
    expect(TRUST_PROTOTYPE_WARNING).toContain("not cryptographic identity verification");
    const verified = trustLevelInfo("verified-in-person");
    expect(verified.description.toLowerCase()).toContain("not cryptographic");
  });

  it("seeds demo records marked by the local user", () => {
    const seeded = seededTrustRecords("user_me");
    expect(seeded.user_sarah.level).toBe("trusted");
    expect(seeded.user_mom.level).toBe("verified-in-person");
    expect(Object.values(seeded).every((r) => r.markedBy === "user_me")).toBe(true);
  });
});
