/**
 * Trusted Contacts — local prototype trust model.
 *
 * IMPORTANT HONESTY BOUNDARY:
 * "Trusted Contact" is a local prototype label. It helps the user organize
 * people they know. It is NOT cryptographic identity verification, NOT device
 * trust, NOT organization-issued verification, and NOT account security.
 * Safety numbers, QR verification, org-issued certificates, device approval,
 * and passkeys are documented future work only (see NEXT_STEPS.md).
 */

import { MockNetwork } from "../data/mockNetworks";

export type TrustLevel =
  | "not-trusted"
  | "known"
  | "trusted"
  | "verified-in-person";

/** Planned-only levels shown in the UI as disabled/future options. */
export type PlannedTrustLevel = "organization-verified" | "device-verified";

export interface TrustRecord {
  userId: string;
  level: TrustLevel;
  /** Short reason chosen by the user, e.g. "family", "met-in-person". */
  reason?: string;
  /** Free-text note, stored locally only. Never logged or exported. */
  note?: string;
  /** Who marked this contact trusted (always the local user in this prototype). */
  markedBy: string;
  trustedAt: string;
  lastReviewedAt: string;
}

export interface TrustLevelInfo {
  level: TrustLevel;
  label: string;
  description: string;
}

export const TRUST_LEVELS: TrustLevelInfo[] = [
  {
    level: "not-trusted",
    label: "Not trusted",
    description: "No trust label. Treat as an unknown person.",
  },
  {
    level: "known",
    label: "Known contact",
    description: "You recognize this person, but have not verified anything.",
  },
  {
    level: "trusted",
    label: "Trusted contact",
    description: "You personally trust this person. This is a local label only.",
  },
  {
    level: "verified-in-person",
    label: "Verified in person",
    description: "You confirmed who this is face to face. Saved as a local note only — not cryptographic verification.",
  },
];

export const PLANNED_TRUST_LEVELS: { level: PlannedTrustLevel; label: string }[] = [
  { level: "organization-verified", label: "Organization verified (planned)" },
  { level: "device-verified", label: "Device verified (planned)" },
];

export const TRUST_PROTOTYPE_WARNING =
  "Trusted Contact is a local prototype label. It helps you organize people you know, but it is not cryptographic identity verification yet.";

export function trustLevelInfo(level: TrustLevel): TrustLevelInfo {
  return TRUST_LEVELS.find((info) => info.level === level) ?? TRUST_LEVELS[0];
}

/** Order used for "is at least" comparisons. */
const LEVEL_ORDER: TrustLevel[] = ["not-trusted", "known", "trusted", "verified-in-person"];

export function isAtLeast(level: TrustLevel, minimum: TrustLevel): boolean {
  return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(minimum);
}

export function buildTrustRecord(
  userId: string,
  level: TrustLevel,
  markedBy: string,
  options: { reason?: string; note?: string; previous?: TrustRecord } = {},
): TrustRecord {
  const now = new Date().toISOString();
  return {
    userId,
    level,
    reason: options.reason?.trim() || options.previous?.reason,
    note: options.note !== undefined ? options.note.trim() || undefined : options.previous?.note,
    markedBy,
    trustedAt: options.previous?.trustedAt ?? now,
    lastReviewedAt: now,
  };
}

/** Networks that both users belong to (Mutual Networks — never "Mutual Servers"). */
export function mutualNetworks(
  userIdA: string,
  userIdB: string,
  networks: Record<string, MockNetwork>,
): MockNetwork[] {
  return Object.values(networks).filter((network) => {
    const members = new Set([network.ownerId, ...(network.memberIds ?? [])].filter(Boolean));
    return members.has(userIdA) && members.has(userIdB);
  });
}

/**
 * Contacts (other than the two users) that both have marked at a given level.
 * In this single-profile prototype only the local user's labels exist, so this
 * returns contacts the local user trusts who share a Network with the target.
 */
export function mutualTrustedContacts(
  targetUserId: string,
  trustedContacts: Record<string, TrustRecord>,
  networks: Record<string, MockNetwork>,
): string[] {
  const trustedIds = Object.values(trustedContacts)
    .filter((record) => record.userId !== targetUserId && isAtLeast(record.level, "trusted"))
    .map((record) => record.userId);
  return trustedIds.filter((contactId) =>
    mutualNetworks(contactId, targetUserId, networks).length > 0,
  );
}

/** Seeded demo trust records so the prototype is testable out of the box. */
export function seededTrustRecords(meId: string): Record<string, TrustRecord> {
  const seededAt = "2026-06-01T12:00:00.000Z";
  const seed = (userId: string, level: TrustLevel, reason: string): TrustRecord => ({
    userId,
    level,
    reason,
    markedBy: meId,
    trustedAt: seededAt,
    lastReviewedAt: seededAt,
  });
  return {
    user_sarah: seed("user_sarah", "trusted", "Seeded demo data"),
    user_mom: seed("user_mom", "verified-in-person", "Seeded demo data"),
    user_john: seed("user_john", "known", "Seeded demo data"),
  };
}
