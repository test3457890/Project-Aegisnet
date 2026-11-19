/**
 * Local-only prototype settings for Network operations screens
 * (Safety Setup, join approvals, bots, emoji). Stored per Network in
 * localStorage. NOT backend-enforced — labels in the UI must say so.
 */

export interface NetworkSafetySettings {
  requireJoinApproval: boolean;
  showMembersInRoomList: boolean;
  verificationLevel: "none" | "manual-review";
  inviteRequireApproval: boolean;
  botApprovalRequired: boolean;
  attachmentSafetyStrict: boolean;
}

export const DEFAULT_SAFETY_SETTINGS: NetworkSafetySettings = {
  requireJoinApproval: true,
  showMembersInRoomList: true,
  verificationLevel: "manual-review",
  inviteRequireApproval: true,
  botApprovalRequired: true,
  attachmentSafetyStrict: true,
};

export type ProtectedPolicyMode = "off" | "warning-only" | "require-second-person" | "require-supervisor" | "convert-to-supervised-thread" | "block" | "custom";
export type ProtectedPolicyTemplate = "youth" | "intern" | "school" | "corporate" | "government" | "volunteer" | "custom";

export interface NetworkProtectedSettings {
  enabled: boolean;
  template: ProtectedPolicyTemplate;
  mode: ProtectedPolicyMode;
  protectedCategories: string[];
  supervisorRoles: string[];
  requireSecondPerson: boolean;
  convertUnsafe: boolean;
  blockUnsafe: boolean;
  showWarning: boolean;
  pauseIfSupervisorLeaves: boolean;
  showPolicyBadge: boolean;
  enableMetadataAudit: boolean;
}

export const DEFAULT_PROTECTED_SETTINGS: NetworkProtectedSettings = {
  enabled: false,
  template: "youth",
  mode: "off",
  protectedCategories: ["youth", "cadet", "student"],
  supervisorRoles: ["supervisor", "senior_member", "safety_monitor", "instructor"],
  requireSecondPerson: true,
  convertUnsafe: false,
  blockUnsafe: false,
  showWarning: true,
  pauseIfSupervisorLeaves: true,
  showPolicyBadge: true,
  enableMetadataAudit: true,
};

export interface NetworkRestrictedSettings {
  isRestricted: boolean;
  hideFromNonMembers: boolean;
  hideMemberList: boolean;
}

export const DEFAULT_RESTRICTED_SETTINGS: NetworkRestrictedSettings = {
  isRestricted: false,
  hideFromNonMembers: false,
  hideMemberList: false,
};

export interface JoinRequest {
  id: string;
  userId: string;
  displayName: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: string;
  answers?: Record<string, string>;
}

export interface PrototypeBot {
  id: string;
  name: string;
  icon: string;
  description: string;
  permissions: string[];
  allowedRooms: string;
  addedBy: string;
  addedAt: string;
  enabled: boolean;
}

export interface NetworkEmoji {
  id: string;
  name: string;
  dataUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function readArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local prototype storage failures never break the UI.
  }
}

export function loadSafetySettings(networkId: string): NetworkSafetySettings {
  return read(`aegisnet_networkSafety_${networkId}`, DEFAULT_SAFETY_SETTINGS);
}

export function saveSafetySettings(networkId: string, settings: NetworkSafetySettings) {
  write(`aegisnet_networkSafety_${networkId}`, settings);
}

export function loadRestrictedSettings(networkId: string): NetworkRestrictedSettings {
  return read(`aegisnet_networkRestricted_${networkId}`, DEFAULT_RESTRICTED_SETTINGS);
}

export function saveRestrictedSettings(networkId: string, settings: NetworkRestrictedSettings) {
  write(`aegisnet_networkRestricted_${networkId}`, settings);
}

export function loadProtectedSettings(networkId: string): NetworkProtectedSettings {
  return read(`aegisnet_networkProtected_${networkId}`, DEFAULT_PROTECTED_SETTINGS);
}

export function saveProtectedSettings(networkId: string, settings: NetworkProtectedSettings) {
  write(`aegisnet_networkProtected_${networkId}`, settings);
}

/** Seeded pending applications so the join-approval flow is testable. */
export function seedJoinRequests(): JoinRequest[] {
  return [
    {
      id: "join_demo_1",
      userId: "user_elena",
      displayName: "Elena Rostova",
      requestedAt: "2026-06-09T15:00:00.000Z",
      status: "pending",
    },
    {
      id: "join_demo_2",
      userId: "user_keira",
      displayName: "Keira Walsh",
      requestedAt: "2026-06-10T09:30:00.000Z",
      status: "pending",
    },
  ];
}

export function loadJoinRequests(networkId: string): JoinRequest[] {
  return readArray(`aegisnet_joinRequests_${networkId}`, seedJoinRequests());
}

export function saveJoinRequests(networkId: string, requests: JoinRequest[]) {
  write(`aegisnet_joinRequests_${networkId}`, requests);
}

export function reviewJoinRequest(
  requests: JoinRequest[],
  requestId: string,
  decision: "approved" | "rejected",
): JoinRequest[] {
  return requests.map((request) =>
    request.id === requestId
      ? { ...request, status: decision, reviewedAt: new Date().toISOString() }
      : request,
  );
}

export function loadBots(networkId: string): PrototypeBot[] {
  return readArray<PrototypeBot>(`aegisnet_networkBots_${networkId}`, []);
}

export function saveBots(networkId: string, bots: PrototypeBot[]) {
  write(`aegisnet_networkBots_${networkId}`, bots);
}

export function loadEmoji(networkId: string): NetworkEmoji[] {
  return readArray<NetworkEmoji>(`aegisnet_networkEmoji_${networkId}`, []);
}

export function saveEmoji(networkId: string, emoji: NetworkEmoji[]) {
  write(`aegisnet_networkEmoji_${networkId}`, emoji);
}

export const EMOJI_MAX_SLOTS = 25;
export const EMOJI_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const EMOJI_BLOCKED_HINT = "SVG, HTML, scripts, and executable files are blocked.";
/** Max source file size for an emoji upload (512 KB). */
export const EMOJI_MAX_BYTES = 512 * 1024;

/**
 * Validates an emoji upload candidate. SVG/HTML/executables are rejected
 * because they can carry active content; only safe raster images pass.
 */
export function validateEmojiFile(file: { name: string; type: string; size: number }):
  | { ok: true }
  | { ok: false; reason: string } {
  const lowered = file.name.toLowerCase();
  const blockedExtensions = [
    ".svg", ".html", ".htm", ".xhtml", ".js", ".mjs", ".exe", ".msi", ".bat",
    ".cmd", ".ps1", ".sh", ".dll", ".scr", ".jar", ".vbs", ".php",
  ];
  if (blockedExtensions.some((extension) => lowered.endsWith(extension))) {
    return { ok: false, reason: "blocked-file-type" };
  }
  if (!EMOJI_ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, reason: "unsupported-type" };
  }
  if (file.size > EMOJI_MAX_BYTES) {
    return { ok: false, reason: "too-large" };
  }
  return { ok: true };
}
