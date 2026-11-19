/**
 * Privacy posture helpers for AegisNet.
 *
 * These are local, prototype behaviours. They change what is shown on screen and
 * how long local messages are kept. They are NOT production security:
 * - There is no encryption here.
 * - The local lock is a convenience screen guard, not account protection.
 * Keep all user-facing wording honest about these limits.
 */
import { MockMessage } from "../data/mockChats";

export type PrivacyMode = "normal" | "shield" | "lockdown";

export interface PrivacyModeMeta {
  id: PrivacyMode;
  label: string;
  summary: string;
}

export const PRIVACY_MODES: PrivacyModeMeta[] = [
  {
    id: "normal",
    label: "Normal",
    summary: "Everyday use. Previews are visible and messages stay until you remove them.",
  },
  {
    id: "shield",
    label: "Shield Mode",
    summary: "Message previews are hidden in lists and media is tap-to-reveal. The screen blurs when you switch away.",
  },
  {
    id: "lockdown",
    label: "Lockdown Mode",
    summary: "Everything in Shield, plus a local app lock, enforced disappearing messages, and restricted in-app downloads.",
  },
];

export interface DisappearOption {
  label: string;
  seconds: number;
}

export const DISAPPEAR_OPTIONS: DisappearOption[] = [
  { label: "Off", seconds: 0 },
  { label: "1 hour", seconds: 60 * 60 },
  { label: "24 hours", seconds: 60 * 60 * 24 },
  { label: "1 week", seconds: 60 * 60 * 24 * 7 },
];

/** Lockdown forces a maximum lifetime when the user has not picked a shorter one. */
export const LOCKDOWN_ENFORCED_SECONDS = 60 * 60 * 24;

/**
 * Resolve the lifetime (in seconds) that should apply to a newly sent message,
 * accounting for the active privacy mode. Returns 0 when the message should not expire.
 */
export function resolveDisappearSeconds(chosenSeconds: number, mode: PrivacyMode): number {
  const safeChosen = Number.isFinite(chosenSeconds) && chosenSeconds > 0 ? chosenSeconds : 0;
  if (mode === "lockdown") {
    if (safeChosen === 0) return LOCKDOWN_ENFORCED_SECONDS;
    return Math.min(safeChosen, LOCKDOWN_ENFORCED_SECONDS);
  }
  return safeChosen;
}

/** Compute an absolute expiry timestamp (epoch ms), or undefined when the message never expires. */
export function computeExpiresAt(now: number, chosenSeconds: number, mode: PrivacyMode): number | undefined {
  const seconds = resolveDisappearSeconds(chosenSeconds, mode);
  if (seconds <= 0) return undefined;
  return now + seconds * 1000;
}

export function isExpired(message: Pick<MockMessage, "expiresAt">, now: number): boolean {
  return typeof message.expiresAt === "number" && message.expiresAt <= now;
}

/** Short human label for how long a disappearing message has left, e.g. "23h left". */
export function formatTimeLeft(expiresAt: number, now: number): string {
  const remainingMs = expiresAt - now;
  if (remainingMs <= 0) return "Expiring";
  const minutes = Math.ceil(remainingMs / 60000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `${hours}h left`;
  const days = Math.ceil(hours / 24);
  return `${days}d left`;
}

/** Mask a conversation preview snippet when a privacy mode hides previews. */
export function maskSnippet(snippet: string, mode: PrivacyMode): string {
  return mode === "normal" ? snippet : "Message hidden for privacy";
}

/** True when previews/media should be hidden by default for the given mode. */
export function hidesPreviews(mode: PrivacyMode): boolean {
  return mode !== "normal";
}

/**
 * Lightweight, NON-cryptographic hash for the local convenience lock PIN.
 * Deliberately not a security primitive: it only avoids storing the raw PIN in
 * localStorage. It does not protect data and must never be described as encryption.
 */
export function hashLockPin(pin: string): string {
  let hash = 5381;
  for (let i = 0; i < pin.length; i += 1) {
    hash = ((hash << 5) + hash + pin.charCodeAt(i)) | 0;
  }
  return `lp_${(hash >>> 0).toString(36)}_${pin.length}`;
}
