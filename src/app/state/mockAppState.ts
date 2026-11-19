import { createContext, useContext } from "react";
import { MockChat, MockMessage } from "../data/mockChats";
import { MockNetwork, RoomVisibility, MockOrgTreeNode } from "../data/mockNetworks";
import { MockUser } from "../data/mockUsers";
import { PrivacyMode } from "../utils/privacy";
import { TrustLevel, TrustRecord } from "./trust";
import { ChatAppearance } from "./chatAppearance";

export type { PrivacyMode } from "../utils/privacy";
export type { TrustLevel, TrustRecord } from "./trust";
export type { ChatAppearance } from "./chatAppearance";

/**
 * Activity post — local-only prototype status updates shown on a profile's
 * Activity tab. Content is never logged, exported, or sent to diagnostics.
 */
export interface ActivityPost {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface MockNetworkFolder {
  id: string;
  name: string;
  color: string;
  networkIds: string[];
  isCollapsed: boolean;
}

export interface MockNetworkProfile {
  displayName?: string;
  avatarColor?: string;
  avatarUrl?: string; // Optional local/backend profile photo
  bio?: string; // Optional bio up to ~250 chars
  status?: string;
  role?: string;
}

export type CallState =
  | "ringing"
  | "incoming"
  | "missed"
  | "declined"
  | "ended"
  | "secure-connected"
  | "weak-signal"
  | "reconnecting"
  | "restoring-audio"
  | "restoring-video"
  | "audio-fallback"
  | "text-fallback"
  | "back-online";

export interface MockVaultFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  accessState: string;
  status: "available" | "syncing";
  storageId?: string;
  storageScope?: "api-local" | "browser-local";
  safeUrl?: string;
  thumbnailUrl?: string;
  hash?: string;
  /** True when the file's bytes are stored AES-GCM encrypted at rest (local prototype encryption). */
  encrypted?: boolean;
}

export interface PrototypePreferences {
  readReceipts: boolean;
  safetyCheckReminders: boolean;
  groupInvites: boolean;
  watermarkEnabled: boolean;
  lowBandwidthMode: boolean;
  defaultMicrophone: boolean;
  defaultCamera: boolean;
  joinMuted: boolean;
  inboundCallFilter: "nobody" | "trusted" | "known" | "network" | "all";
}

export interface DevErrorLog {
  id: string;
  timestamp: string;
  environment: string;
  route: string;
  errorName: string;
  errorMessage: string;
  requestId: string;
}


export interface DeviceRecord {
  id: string;
  name: string;
  type: string;
  browser: string;
  firstSeen: string;
  lastActive: string;
  trustState: "trusted" | "untrusted" | "unknown";
  currentDevice: boolean;
  revoked?: boolean;
}

export interface SessionRecord {
  id: string;
  deviceId: string;
  createdAt: string;
  lastActive: string;
  currentSession: boolean;
  reviewed: boolean;
  revoked?: boolean;
}

export interface PrototypeInvitation {
  id: string;
  targetType: "group" | "network";
  targetId: string;
  code: string;
  createdAt: string;
  /** Prototype-only label, e.g. "Never", "7 days". Not enforced remotely. */
  expiresLabel?: string;
  /** Prototype-only label. Not enforced remotely. */
  maxUses?: number;
  /** When false, the invite is marked as bypassing join approval (prototype-only). */
  requireApproval?: boolean;
  /** Prototype-only array of onboarding questions strings to ask the user. */
  onboardingQuestions?: string[];
}

export interface PrototypeCallDetails {
  mode: "voice" | "video";
  chatId?: string;
  roomId?: string;
  receiverId?: string;
}

export interface MockAppState {
  me: MockUser;
  activeChatId: string | null;
  selectedNetworkId: string | null;
  selectedRoomId: string | null;
  networks: Record<string, MockNetwork>;
  chats: Record<string, MockChat>;
  messages: Record<string, MockMessage[]>;
  users: Record<string, MockUser>;
  networkOrder: string[]; // Can contain network IDs or folder IDs
  networkFolders: Record<string, MockNetworkFolder>;
  networkProfiles: Record<string, MockNetworkProfile>;
  vaultFiles: MockVaultFile[];
  fileAccessLogs: FileAccessLogEntry[];
  invitations: PrototypeInvitation[];
  lastReadMessageIds: Record<string, string | null>;
  drafts: Record<string, string>;
  notificationPreferences: Record<string, "all" | "mentions" | "muted">;
  preferences: PrototypePreferences;
  /** Local-only prototype trust labels keyed by user ID. Not identity verification. */
  trustedContacts: Record<string, TrustRecord>;
  /** Local-only prototype Activity posts keyed by author user ID. */
  activityPosts: Record<string, ActivityPost[]>;
  /** Local-only per-chat color/wallpaper customization keyed by conversation target ID. */
  chatAppearance: Record<string, ChatAppearance>;
  /** IDs of Networks the user archived (local-only; hidden from the sidebar). */
  archivedNetworkIds: string[];
  devErrorLogs: DevErrorLog[];
  privacyMode: PrivacyMode;
  devices: DeviceRecord[];
  sessions: SessionRecord[];
  /** Per-conversation disappearing-message lifetime in seconds (0 = off). */
  conversationExpiry: Record<string, number>;
  /** Default disappearing-message lifetime applied to new direct messages (0 = off). */
  disappearDefaultSeconds: number;
  /** Whether a local convenience-lock PIN has been set. */
  lockPinSet: boolean;
  /** Detailed error logs for the Admin Center (prototype dev-only feature) */
  devErrorLogs: DevErrorLog[];
  isRightPanelCollapsed: boolean;
  toggleRightPanel: () => void;
  /** Whether the local lock screen is currently engaged. */
  isLocked: boolean;
  selectedChatId: string | null;
  selectedNetworkId: string | null;
  selectedRoomId: string | null;
  callState: CallState;
  sendMessage: (targetId: string, text: string, attachment?: MockMessage["attachment"]) => string | null;
  createDirectChat: (userId: string) => string;
  createGroupChat: (name: string, participantIds: string[]) => string;
  createNetwork: (name: string, templateId?: string) => { networkId: string; roomId: string };
  createRoom: (networkId: string, name: string, category?: string, type?: "text" | "announcement" | "check-in" | "vault" | "voice" | "video") => string | null;
  updateRoomPermissions: (networkId: string, roomId: string, permissions: { visibility?: "public" | "private" | "restricted" | "opsec"; allowedRoles?: string[] }) => void;
  setNetworkAccessLevel: (networkId: string, accessLevel: string) => void;
  createCategory: (networkId: string, name: string) => void;
  renameCategory: (networkId: string, oldName: string, newName: string) => void;
  deleteCategory: (networkId: string, name: string, fallbackCategory?: string) => void;
  reorderCategory: (networkId: string, fromIndex: number, toIndex: number) => void;
  moveCategory: (networkId: string, category: string, direction: "up" | "down") => void;
  renameGroupChat: (chatId: string, name: string) => void;
  updateGroupMembers: (chatId: string, participantIds: string[]) => void;
  leaveGroupChat: (chatId: string) => void;
  deleteGroupChat: (chatId: string) => void;
  renameNetwork: (networkId: string, name: string) => void;
  updateNetworkIcon: (networkId: string, iconUrl: string | null) => void;
  createNetworkFolder: (name: string, networkIds: string[]) => void;
  updateNetworkFolder: (folderId: string, updates: Partial<MockNetworkFolder>) => void;
  deleteNetworkFolder: (folderId: string) => void;
  updateNetworkMembers: (networkId: string, memberIds: string[]) => void;
  leaveNetwork: (networkId: string) => void;
  deleteNetwork: (networkId: string) => void;
  updateCurrentUserProfile: (updates: Partial<MockUser>) => void;
  removeNetworkMember: (networkId: string, userId: string) => void;
  updateNetworkMemberRoles: (networkId: string, userId: string, roleIds: string[]) => void;
  createNetworkRole: (networkId: string, name: string, color: string, permissions: string[]) => void;
  timeoutNetworkMember: (networkId: string, userId: string, durationSeconds: number) => void;
  banNetworkMember: (networkId: string, userId: string) => void;
  requestRole: (networkId: string, roleName: string, reason?: string) => void;
  approveRoleRequest: (networkId: string, requestId: string) => void;
  rejectRoleRequest: (networkId: string, requestId: string) => void;
  updateMemberLifecycle: (networkId: string, userId: string, status: "pending" | "approved" | "active" | "limited" | "suspended" | "removed") => void;
  acknowledgeWelcome: (networkId: string) => void;
  acknowledgeRules: (networkId: string) => void;
  createAnnouncement: (networkId: string, title: string, body: string, important?: boolean) => void;
  pinResource: (networkId: string, title: string, url?: string, roomId?: string, vaultFileId?: string) => void;
  updateAdminNote: (networkId: string, userId: string, note: string) => void;
  acceptInvitation: (code: string, answers?: Record<string, string>) => Promise<string | void>;
  createInvitation: (
    targetType: PrototypeInvitation["targetType"],
    targetId: string,
    options?: { expiresLabel?: string; maxUses?: number; requireApproval?: boolean; onboardingQuestions?: string[] },
  ) => PrototypeInvitation;
  revokeInvitation: (invitationId: string) => void;
  deleteNetworkRole: (networkId: string, roleId: string) => void;
  /** Sets or updates a local trust label for a contact. Local prototype only. */
  setTrustLevel: (userId: string, level: TrustLevel, options?: { reason?: string; note?: string }) => void;
  removeTrustedContact: (userId: string) => void;
  addActivityPost: (text: string) => void;
  deleteActivityPost: (postId: string) => void;
  /** Merge per-chat appearance settings (local-only). */
  updateChatAppearance: (targetId: string, updates: Partial<ChatAppearance>) => void;
  /** Reset a chat back to the theme default appearance (local-only). */
  resetChatAppearance: (targetId: string) => void;
  /** Archive (hide) or restore a Network locally. Owner-only in the UI. */
  setNetworkArchived: (networkId: string, archived: boolean) => void;
  renameRoom: (networkId: string, roomId: string, name: string) => void;
  moveRoom: (networkId: string, roomId: string, direction: "up" | "down") => void;
  moveRoomToCategory: (networkId: string, roomId: string, newCategory: string) => void;
  reorderRoom: (networkId: string, sourceCategory: string, roomId: string, targetCategory: string, toIndex: number) => void;
  moveNetwork: (networkId: string, direction: "up" | "down") => void;
  reorderNetwork: (fromIndex: number, toIndex: number) => void;
  updateNetworkProfile: (networkId: string, profile: MockNetworkProfile) => void;
  setRoomArchived: (networkId: string, roomId: string, archived: boolean) => void;
  deleteRoom: (networkId: string, roomId: string) => void;
  /** Update visibility level and allowed role IDs for a room (prototype UI-only). */
  updateRoomVisibility: (networkId: string, roomId: string, visibility: RoomVisibility, allowedRoles: string[]) => void;
  markConversationRead: (targetId: string) => void;
  markConversationUnread: (targetId: string) => void;
  activeVoiceVideoRooms: Record<string, string[]>;
  joinRoomSession: (roomId: string) => void;
  leaveRoomSession: (roomId: string) => void;
  toggleMessageReaction: (targetId: string, messageId: string, emoji: string) => void;
  setCallState: (state: CallState) => void;
  startPrototypeCall: (details: PrototypeCallDetails) => string;
  endPrototypeCall: () => void;
  setSelectedChatId: (id: string | null) => void;
  setSelectedNetworkId: (id: string | null) => void;
  setSelectedRoomId: (id: string | null) => void;
  uploadVaultFile: (file: MockVaultFile) => void;
  deleteVaultFile: (id: string) => void;
  updateVaultFilePermissions: (id: string, permissions: FilePermissions) => void;
  logFileAccess: (fileId: string, action: FileAccessLogEntry["action"]) => void;
  updatePreference: (key: keyof PrototypePreferences, value: boolean) => void;
  setDraft: (targetId: string, text: string) => void;
  setNotificationPreference: (targetId: string, level: "all" | "mentions" | "muted") => void;
  setPrivacyMode: (mode: PrivacyMode) => void;
  markDeviceTrusted: (id: string, trusted: boolean) => void;
  renameDevice: (id: string, newName: string) => void;
  revokeDevice: (id: string) => void;
  revokeOtherDevices: () => void;
  revokeSession: (id: string) => void;
  revokeOtherSessions: () => void;
  markSessionReviewed: (id: string) => void;
  setConversationExpiry: (targetId: string, seconds: number) => void;
  setDisappearDefault: (seconds: number) => void;
  setLockPin: (pin: string) => void;
  clearLockPin: () => void;
  lockApp: () => void;
  /** Returns true when the PIN matched (or no PIN is set) and the app unlocked. */
  unlockApp: (pin: string) => boolean;
  clearLocalData: () => void;
  isBackendConnected: boolean;
  logDevError: (error: Omit<DevErrorLog, "id" | "timestamp">) => void;
  clearDevErrors: () => void;
  
  /** Local prototype state mutations for Organization Tree */
  createOrgNode: (networkId: string, node: Omit<MockOrgTreeNode, "id">) => string;
  updateOrgNode: (networkId: string, nodeId: string, updates: Partial<MockOrgTreeNode>) => void;
  deleteOrgNode: (networkId: string, nodeId: string) => void;
  assignMemberToOrgNode: (networkId: string, nodeId: string, memberId: string | undefined) => void;
}
export function hasNetworkPermission(network: MockNetwork | undefined, userId: string, permission: string): boolean {
  if (!network) return false;
  if (network.ownerId === userId) return true;

  const userRoleIds = network.memberRoles?.[userId] || [];
  if (userRoleIds.length === 0 || !network.roles) return false;

  const userRoles = network.roles.filter(r => userRoleIds.includes(r.id));
  
  return userRoles.some(r => 
    r.permissions.includes("*") ||
    r.permissions.includes("admin") ||
    r.permissions.includes("manage_network") ||
    r.permissions.includes(permission)
  );
}

export const MockAppStateContext = createContext<MockAppState | undefined>(undefined);

export function useMockAppState() {
  const context = useContext(MockAppStateContext);
  if (!context) throw new Error("useMockAppState must be used within MockAppStateProvider");
  return context;
}
