import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { MockChat, MockMessage, initialMockChatList, initialMockMessages } from "../data/mockChats";
import { MockNetwork, mockNetworks } from "../data/mockNetworks";
import { currentUser, mockUsers, type MockUser } from "../data/mockUsers";
import { mockFiles } from "../data/mockFiles";
import { networkTemplates } from "../data/networkTemplates";
import { API_URL, apiClient, checkBackendHealth, setDemoSessionToken } from "../api/client";
import { wsClient } from "../api/wsClient";
import { cleanupPrototypeFiles, clearPrototypeFiles, deletePrototypeFile, getDecryptedPrototypeBlob } from "../storage/prototypeFileStore";
import { clearVaultKey } from "../storage/vaultCrypto";
import { computeExpiresAt, hashLockPin, isExpired, PrivacyMode } from "../utils/privacy";
import { loadRestrictedSettings } from "./networkPrototypeSettings";
import {
  ActivityPost,
  CallState,
  ChatAppearance,
  MockAppStateContext,
  MockNetworkProfile,
  MockVaultFile,
  PrototypeInvitation,
  PrototypePreferences,
  hasNetworkPermission,
} from "./mockAppState";
import { buildTrustRecord, seededTrustRecords, TrustLevel, TrustRecord } from "./trust";
import { logQaEvent } from "../qa/qaEvents";
import { SyncQueue } from "./syncQueue";

const initialVaultFiles: MockVaultFile[] = Object.values(mockFiles).map((file) => ({
  id: file.id,
  name: file.name,
  type: file.type,
  size: file.size,
  uploadedAt: file.uploadedAt,
  uploadedBy: file.uploadedBy,
  accessState: file.accessState,
  status: "available",
}));

const initialPreferences: PrototypePreferences = {
  readReceipts: true,
  safetyCheckReminders: true,
  groupInvites: true,
  watermarkEnabled: false,
  lowBandwidthMode: false,
  defaultMicrophone: true,
  defaultCamera: true,
  joinMuted: false,
  inboundCallFilter: "all",
};

// Local-only seeded Activity posts so other-user profiles are testable.
// Activity content stays on this device and is never logged or exported.
const initialActivityPosts: Record<string, ActivityPost[]> = {
  user_sarah: [
    { id: "act_sarah_1", authorId: "user_sarah", text: "Back from the trail — great weather today.", createdAt: "2026-06-09T16:20:00.000Z" },
    { id: "act_sarah_2", authorId: "user_sarah", text: "Planning the weekend picnic. Suggestions welcome!", createdAt: "2026-06-08T10:05:00.000Z" },
  ],
  user_mom: [
    { id: "act_mom_1", authorId: "user_mom", text: "Arrived home safe. ❤️", createdAt: "2026-06-10T08:45:00.000Z" },
  ],
};

const STORAGE_VERSION = "3";

function migrateLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("aegisnet_storageVersion", STORAGE_VERSION);
  } catch {
    // The in-memory prototype remains usable when browser storage is unavailable.
  }
}

function loadInitialState<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(`aegisnet_${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function persistState(key: string, value: unknown) {
  try {
    localStorage.setItem(`aegisnet_${key}`, JSON.stringify(value));
  } catch {
    if (key !== "messages") return;

    try {
      const metadataOnly = Object.fromEntries(
        Object.entries(value as Record<string, MockMessage[]>).map(([conversationId, conversationMessages]) => [
          conversationId,
          conversationMessages.map((message) => (
            message.attachment?.url.startsWith("data:")
              ? { ...message, attachment: { ...message.attachment, url: "" } }
              : message
          )),
        ]),
      );
      localStorage.setItem("aegisnet_messages", JSON.stringify(metadataOnly));
      console.info("[AegisNet] Media previews exceeded browser storage; message metadata was preserved.");
    } catch {
      console.info("[AegisNet] Browser storage is full; the current session remains available in memory.");
    }
  }
}

function normalizeBackendFile(file: any): MockVaultFile {
  return {
    id: String(file.id || `file_${Date.now()}`),
    name: String(file.name || file.originalName || "Uploaded file"),
    type: String(file.type || file.mimeType || "application/octet-stream"),
    size: Number(file.size || 0),
    uploadedAt: String(file.uploadedAt || new Date().toISOString()),
    uploadedBy: String(file.uploadedBy || currentUser.id),
    accessState: String(file.accessState || file.accessLevel || "Private prototype"),
    status: "available",
    storageId: file.storageId || file.clientStorageId ? String(file.storageId || file.clientStorageId) : undefined,
    storageScope: file.storageScope === "api-local" || file.storageScope === "browser-local" ? file.storageScope : undefined,
    safeUrl: file.safeUrl ? String(file.safeUrl) : undefined,
    thumbnailUrl: file.thumbnailUrl ? String(file.thumbnailUrl) : undefined,
    hash: file.hash ? String(file.hash) : undefined,
    encrypted: Boolean(file.encrypted || file.clientEncrypted),
  };
}

function formatBackendTimestamp(value: unknown) {
  return new Date(typeof value === "string" || typeof value === "number" ? value : Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeBackendUser(user: any) {
  return {
    id: String(user.id),
    name: String(user.name || "AegisNet contact"),
    status: ["online", "offline", "busy", "away"].includes(user.status) ? user.status : "offline",
    avatarColor: String(user.avatarColor || "bg-slate-700"),
    initials: String(user.initials || "AN"),
    role: user.role ? String(user.role) : undefined,
  };
}

function normalizeBackendChat(chat: any): MockChat {
  const participants = Array.isArray(chat.participants) ? chat.participants.map(String) : [currentUser.id];
  const lastActivityAt = chat.lastActivityAt && !String(chat.lastActivityAt).includes("T")
    ? String(chat.lastActivityAt)
    : formatBackendTimestamp(chat.lastActivityAt || chat.createdAt);
  return {
    id: String(chat.id),
    type: chat.type === "group" ? "group" : "direct",
    name: chat.name ? String(chat.name) : undefined,
    participants,
    ownerId: chat.ownerId ? String(chat.ownerId) : undefined,
    unreadCount: Number(chat.unreadCount || 0),
    lastActivityAt,
    lastMessageSnippet: String(chat.lastMessageSnippet || ""),
  };
}

function normalizeBackendNetwork(network: any): MockNetwork {
  const categories = Array.isArray(network.categories) ? network.categories : [];
  const rooms = categories.map((category: any) => ({
    category: String(category.name || category.category || "Rooms"),
    items: (Array.isArray(category.rooms) ? category.rooms : []).map((room: any) => ({
      id: String(room.id),
      name: String(room.name || "Room"),
      type: room.type || "text",
      unread: Number(room.unread || 0),
      archived: Boolean(room.archived),
    })),
  }));
  return {
    id: String(network.id),
    name: String(network.name || "Network"),
    initials: String(network.initials || "NET"),
    color: String(network.color || "bg-slate-700"),
    ownerId: network.ownerId ? String(network.ownerId) : currentUser.id,
    memberIds: Array.isArray(network.memberIds) ? network.memberIds.map(String) : [currentUser.id],
    rooms,
  };
}

function normalizeBackendAttachment(attachment: any): MockMessage["attachment"] | undefined {
  if (!attachment) return undefined;
  const type = ["image", "gif", "audio", "file"].includes(attachment.type) ? attachment.type : "file";
  const rawUrl = attachment.url || attachment.safeUrl || "";
  const url = rawUrl && String(rawUrl).startsWith("/") ? `${API_URL}${rawUrl}` : String(rawUrl || "");
  return {
    type,
    url,
    name: attachment.name || attachment.fileName ? String(attachment.name || attachment.fileName) : undefined,
    size: attachment.size ? Number(attachment.size) : undefined,
    mimeType: attachment.mimeType ? String(attachment.mimeType) : undefined,
    fileId: attachment.fileId ? String(attachment.fileId) : undefined,
    storageId: attachment.storageId ? String(attachment.storageId) : undefined,
    thumbnailUrl: attachment.thumbnailUrl ? String(attachment.thumbnailUrl) : undefined,
  };
}

function normalizeBackendMessage(payload: any): MockMessage | null {
  if (!payload?.id || !payload?.senderId) return null;
  const status = ["sent", "delivered", "read"].includes(payload.status || payload.deliveryStatus)
    ? (payload.status || payload.deliveryStatus)
    : "delivered";
  const attachment = normalizeBackendAttachment(Array.isArray(payload.attachments) ? payload.attachments[0] : payload.attachment);
  return {
    id: String(payload.id),
    senderId: String(payload.senderId),
    text: String(payload.text ?? payload.body ?? ""),
    timestamp: payload.timestamp ? String(payload.timestamp) : formatBackendTimestamp(payload.createdAt),
    status,
    createdAt: payload.createdAt ? Date.parse(String(payload.createdAt)) : Date.now(),
    expiresAt: typeof payload.expiresAt === "number"
      ? payload.expiresAt
      : (payload.expiresAt ? Date.parse(String(payload.expiresAt)) : undefined),
    attachment,
  };
}

function mergeMessageLists(localItems: MockMessage[] = [], incomingItems: MockMessage[] = []) {
  const merged = [...localItems];
  for (const incoming of incomingItems) {
    const index = merged.findIndex((message) => message.id === incoming.id);
    if (index >= 0) {
      const existing = merged[index];
      merged[index] = {
        ...existing,
        ...incoming,
        attachment: incoming.attachment
          ? { ...(existing.attachment || {}), ...incoming.attachment }
          : existing.attachment,
      };
    }
    else merged.push(incoming);
  }
  return merged.sort((left, right) => (left.createdAt || 0) - (right.createdAt || 0));
}

function roomTargetId(networkId: string, roomId: string) {
  return `network:${networkId}:room:${roomId}`;
}

function messageEndpoint(targetId: string) {
  const roomMatch = targetId.match(/^network:[^:]+:room:(.+)$/);
  return roomMatch ? `/rooms/${roomMatch[1]}/messages` : `/chats/${targetId}/messages`;
}

function attachmentForBackend(attachment: NonNullable<MockMessage["attachment"]>) {
  return {
    type: attachment.type,
    url: attachment.url,
    fileName: attachment.name,
    name: attachment.name,
    size: attachment.size,
    mimeType: attachment.mimeType,
    fileId: attachment.fileId,
    thumbnailUrl: attachment.thumbnailUrl,
  };
}

function loadMessages() {
  const stored = loadInitialState<Record<string, MockMessage[]>>("messages", {});
  const conversationIds = new Set([...Object.keys(initialMockMessages), ...Object.keys(stored)]);
  return Object.fromEntries([...conversationIds].map((conversationId) => {
    const combined = [...(initialMockMessages[conversationId] || []), ...(stored[conversationId] || [])];
    return [
      conversationId,
      combined.filter((message, index) => combined.findIndex((item) => item.id === message.id) === index),
    ];
  }));
}

function loadVaultFiles() {
  const stored = loadInitialState<any[]>("vaultFiles", []);
  const combined = [...stored.map(normalizeBackendFile), ...initialVaultFiles];
  return combined.filter((file, index) => combined.findIndex((item) => item.id === file.id) === index);
}

function loadNetworks() {
  const stored = loadInitialState<Record<string, MockNetwork>>("networks", mockNetworks);
  return Object.fromEntries(Object.entries(stored).map(([networkId, network]) => [
    networkId,
    {
      ...network,
      ownerId: network.ownerId || currentUser.id,
      memberIds: network.memberIds || [currentUser.id, ...Object.keys(mockUsers).slice(0, 4)],
    },
  ]));
}

function createLocalId(prefix: string, value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "new";
  return `${prefix}_${slug}_${Date.now().toString(36)}`;
}

export function MockAppStateProvider({ children }: { children: ReactNode }) {
  migrateLocalStorage();
  const [activeVoiceVideoRooms, setActiveVoiceVideoRooms] = useState<Record<string, string[]>>({});
  const [me, setMe] = useState<MockUser>(() => loadInitialState("me", currentUser));
  const [users, setUsers] = useState<Record<string, MockUser>>(() => ({ ...mockUsers }));
  const [chatList, setChatList] = useState<Record<string, MockChat>>(
    () => loadInitialState("chatList", initialMockChatList),
  );
  const [networks, setNetworks] = useState<Record<string, MockNetwork>>(
    loadNetworks,
  );
  const [networkOrder, setNetworkOrder] = useState<string[]>(() => 
    loadInitialState("networkOrder", Object.keys(mockNetworks))
  );
  const [networkFolders, setNetworkFolders] = useState<Record<string, MockNetworkFolder>>(() => 
    loadInitialState("networkFolders", {})
  );
  const [networkProfiles, setNetworkProfiles] = useState<Record<string, MockNetworkProfile>>(() => 
    loadInitialState("networkProfiles", {})
  );
  const [messages, setMessages] = useState<Record<string, MockMessage[]>>(
    loadMessages,
  );
  const [vaultFiles, setVaultFiles] = useState<MockVaultFile[]>(
    loadVaultFiles,
  );
  const [fileAccessLogs, setFileAccessLogs] = useState<FileAccessLogEntry[]>([]);
  const [invitations, setInvitations] = useState<PrototypeInvitation[]>(
    () => loadInitialState("invitations", []),
  );
  const [lastReadMessageIds, setLastReadMessageIds] = useState<Record<string, string | null>>(
    () => loadInitialState("lastReadMessageIds", {}),
  );
  const [drafts, setDrafts] = useState<Record<string, string>>(
    () => loadInitialState("drafts", {}),
  );
  const [notificationPreferences, setNotificationPreferences] = useState<Record<string, "all" | "mentions" | "muted">>(
    () => loadInitialState("notificationPreferences", {}),
  );
  const [preferences, setPreferences] = useState<PrototypePreferences>(
    () => loadInitialState("preferences", initialPreferences),
  );
  const [trustedContacts, setTrustedContacts] = useState<Record<string, TrustRecord>>(
    () => loadInitialState("trustedContacts", seededTrustRecords(currentUser.id)),
  );
  const [activityPosts, setActivityPosts] = useState<Record<string, ActivityPost[]>>(
    () => loadInitialState("activityPosts", initialActivityPosts),
  );
  const [chatAppearance, setChatAppearanceState] = useState<Record<string, ChatAppearance>>(
    () => loadInitialState("chatAppearance", {}),
  );
  // Stored separately from the networks map so backend hydration cannot clobber it.
  const [archivedNetworkIds, setArchivedNetworkIds] = useState<string[]>(
    () => loadInitialState("archivedNetworkIds", [])
  );
  const [devErrorLogs, setDevErrorLogs] = useState<DevErrorLog[]>(
    () => loadInitialState("devErrorLogs", [])
  );
  const [privacyMode, setPrivacyModeState] = useState<PrivacyMode>(
    () => loadInitialState<PrivacyMode>("privacyMode", "normal"),
  );
  const [devices, setDevices] = useState<DeviceRecord[]>(() => loadInitialState("devices", [
    { id: "dev-01", name: "My Work Laptop", type: "desktop", browser: "Chrome / Windows", firstSeen: "2026-06-01T10:00:00Z", lastActive: new Date().toISOString(), trustState: "trusted", currentDevice: true },
    { id: "dev-02", name: "Personal Phone", type: "mobile", browser: "Safari / iOS", firstSeen: "2026-05-15T08:30:00Z", lastActive: "2026-06-10T12:00:00Z", trustState: "untrusted", currentDevice: false },
  ]));
  const [sessions, setSessions] = useState<SessionRecord[]>(() => loadInitialState("sessions", [
    { id: "sess-01", deviceId: "dev-01", createdAt: "2026-06-11T00:00:00Z", lastActive: new Date().toISOString(), currentSession: true, reviewed: true },
    { id: "sess-02", deviceId: "dev-02", createdAt: "2026-06-09T18:00:00Z", lastActive: "2026-06-10T12:00:00Z", currentSession: false, reviewed: false },
  ]));
  const [conversationExpiry, setConversationExpiryState] = useState<Record<string, number>>(
    () => loadInitialState("conversationExpiry", {}),
  );
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(() => {
    try {
      return localStorage.getItem("aegisnet_right_panel_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleRightPanel = () => {
    setIsRightPanelCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("aegisnet_right_panel_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const [disappearDefaultSeconds, setDisappearDefaultState] = useState<number>(
    () => loadInitialState("disappearDefaultSeconds", 0),
  );
  const [lockPinHash, setLockPinHash] = useState<string>(
    () => loadInitialState("lockPinHash", ""),
  );
  // The lock engages on load only when Lockdown is active and a PIN exists.
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const mode = loadInitialState<PrivacyMode>("privacyMode", "normal");
    const pin = loadInitialState("lockPinHash", "");
    return mode === "lockdown" && Boolean(pin);
  });
  const [callState, setCallStateState] = useState<CallState>("secure-connected");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    () => loadInitialState("selectedChatId", "chat_sarah"),
  );
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(
    () => loadInitialState("selectedNetworkId", "net_family"),
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    () => loadInitialState("selectedRoomId", "room_fam_chat"),
  );
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const initialized = useRef(false);
  const selectedChatIdRef = useRef(selectedChatId);
  const selectedNetworkIdRef = useRef(selectedNetworkId);
  const selectedRoomIdRef = useRef(selectedRoomId);
  const activeCallIdRef = useRef<string | null>(null);

  const emitAuditEvent = useCallback((action: string, targetId: string | null = null, metadata: any = null) => {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    apiClient.post("/admin/audit", {
      id,
      action,
      actorId: currentUser.id,
      targetId,
      metadata
    }).catch(() => {
      SyncQueue.push({ method: "POST", path: "/admin/audit", body: { id, action, actorId: currentUser.id, targetId, metadata } });
    });
  }, []);
  const knownMessageIdsRef = useRef(new Set(
    Object.values(messages).flatMap((conversation) => conversation.map((message) => message.id)),
  ));

  useEffect(() => {
    const referencedIds = [
      ...vaultFiles.map((file) => file.storageId),
      ...Object.values(messages).flatMap((conversation) => conversation.map((message) => message.attachment?.storageId)),
    ].filter((id): id is string => Boolean(id));
    cleanupPrototypeFiles(referencedIds).catch(() => {
      console.info("[AegisNet] Unused local file cleanup was unavailable.");
    });
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let active = true;

    const handleMessageCreated = (event: any) => {
      // In the new topic-based system, event is a SyncEvent.
      // If it's the old global system, it might just be the payload.
      const payload = event.payload || event;
      const message = normalizeBackendMessage(payload);
      const targetId = String(payload?.targetId || payload?.chatId || event.roomId ? `network:${event.networkId}:room:${event.roomId}` : (event.conversationId || ""));
      
      if (!message || !targetId) return;

      // Deduplicate optimistic messages
      if (event.clientMutationId) {
         // Optionally confirm the SyncQueue mutation here.
         // Since we already added it locally, we just make sure we don't duplicate it.
         if (knownMessageIdsRef.current.has(event.clientMutationId)) {
           // We might need to map clientMutationId to real ID if they differ,
           // but our prototype uses clientMutationId as the message ID.
           // Let's just return to avoid duplicate.
           return;
         }
      }

      const isNew = !knownMessageIdsRef.current.has(message.id);
      knownMessageIdsRef.current.add(message.id);
      setMessages((previous) => ({
        ...previous,
        [targetId]: mergeMessageLists(previous[targetId], [message]),
      }));
      if (!isNew || message.senderId === currentUser.id) return;

      const roomMatch = targetId.match(/^network:([^:]+):room:(.+)$/);
      if (roomMatch) {
        const [, networkId, roomId] = roomMatch;
        if (selectedNetworkIdRef.current !== networkId || selectedRoomIdRef.current !== roomId) {
          setNetworks((previous) => ({
            ...previous,
            [networkId]: previous[networkId]
              ? {
                  ...previous[networkId],
                  rooms: previous[networkId].rooms.map((section) => ({
                    ...section,
                    items: section.items.map((room) => (
                      room.id === roomId ? { ...room, unread: (room.unread || 0) + 1 } : room
                    )),
                  })),
                }
              : previous[networkId],
          }));
        }
      } else if (selectedChatIdRef.current !== targetId) {
        setChatList((previous) => ({
          ...previous,
          [targetId]: previous[targetId]
            ? { ...previous[targetId], unreadCount: previous[targetId].unreadCount + 1 }
            : previous[targetId],
        }));
      }
    };

    const handleUploadedFile = (payload: any) => {
      const normalized = normalizeBackendFile(payload);
      setVaultFiles((previous) => {
        const existing = previous.find((file) => file.id === normalized.id);
        return existing
          ? previous.map((file) => file.id === normalized.id ? { ...normalized, ...file } : file)
          : [normalized, ...previous];
      });
    };

    const handleMessageReaction = (event: SyncEvent) => {
      const { targetId, messageId, emoji, hasReacted } = event.payload;
      setMessages(prev => {
        const items = prev[targetId];
        if (!items) return prev;

        return {
          ...prev,
          [targetId]: items.map(msg => {
            if (msg.id !== messageId) return msg;

            const currentReactions = msg.reactions || {};
            const usersForEmoji = currentReactions[emoji] || [];
            
            let newUsersForEmoji = [...usersForEmoji];
            if (hasReacted && !newUsersForEmoji.includes(event.actorId)) {
              newUsersForEmoji.push(event.actorId);
            } else if (!hasReacted) {
              newUsersForEmoji = newUsersForEmoji.filter(id => id !== event.actorId);
            }

            const newReactions = { ...currentReactions };
            if (newUsersForEmoji.length === 0) {
              delete newReactions[emoji];
            } else {
              newReactions[emoji] = newUsersForEmoji;
            }

            return { ...msg, reactions: newReactions };
          })
        };
      });
    };

    const handleCallState = (payload: any) => {
      const allowedStates: CallState[] = [
        "secure-connected", "weak-signal", "reconnecting", "restoring-audio",
        "restoring-video", "audio-fallback", "text-fallback", "back-online",
      ];
      if (allowedStates.includes(payload?.state)) setCallStateState(payload.state);
    };

    const initializeBackend = async () => {
      if (!(await checkBackendHealth())) {
        console.info("[AegisNet] Shared API is offline; using local prototype data.");
        return;
      }

      try {
        const login = await apiClient.post("/auth/demo-login", { userId: currentUser.id });
        if (!login?.token || !active) return;

        const [backendUsers, backendNetworkList, backendChats, backendFiles] = await Promise.all([
          apiClient.get("/users", login.token),
          apiClient.get("/networks", login.token),
          apiClient.get("/chats", login.token),
          apiClient.get("/files", login.token),
        ]);
        const backendNetworkDetails = await Promise.all(
          (Array.isArray(backendNetworkList) ? backendNetworkList : []).map((network: any) => (
            apiClient.get(`/networks/${network.id}`, login.token)
          )),
        );
        const normalizedNetworks: Record<string, MockNetwork> = Object.fromEntries(
          backendNetworkDetails.map((network: any) => [String(network.id), normalizeBackendNetwork(network)]),
        );
        const normalizedChats: Record<string, MockChat> = Object.fromEntries(
          (Array.isArray(backendChats) ? backendChats : []).map((chat: any) => {
            const normalized = normalizeBackendChat(chat);
            return [normalized.id, normalized];
          }),
        );
        const messageRequests = [
          ...Object.keys(normalizedChats).map((targetId) => ({
            targetId,
            path: `/chats/${targetId}/messages`,
          })),
          ...Object.values(normalizedNetworks).flatMap((network) => (
            network.rooms.flatMap((section) => section.items.map((room) => ({
              targetId: roomTargetId(network.id, room.id),
              path: `/rooms/${room.id}/messages`,
            })))
          )),
        ];
        const hydratedMessages = await Promise.all(messageRequests.map(async ({ targetId, path }) => {
          const payload = await apiClient.get(path, login.token);
          const normalized = (Array.isArray(payload) ? payload : [])
            .map(normalizeBackendMessage)
            .filter((message): message is MockMessage => Boolean(message));
          return [targetId, normalized] as const;
        }));
        if (!active) return;

        const normalizedUsers: Record<string, MockUser> = Object.fromEntries(
          (Array.isArray(backendUsers) ? backendUsers : [])
            .filter((user: any) => user?.id && user.id !== currentUser.id)
            .map((user: any) => {
              const normalized = normalizeBackendUser(user);
              return [normalized.id, normalized];
            }),
        );
        setUsers((previous) => ({ ...previous, ...normalizedUsers }));
        setNetworks((previous) => ({ ...previous, ...normalizedNetworks }));
        setNetworkOrder((previous) => [
          ...Object.keys(normalizedNetworks),
          ...previous.filter((networkId) => !normalizedNetworks[networkId]),
        ]);
        setChatList((previous) => ({ ...previous, ...normalizedChats }));
        setMessages((previous) => {
          const next = { ...previous };
          for (const [targetId, items] of hydratedMessages) {
            for (const message of items) knownMessageIdsRef.current.add(message.id);
            next[targetId] = mergeMessageLists(previous[targetId], items);
          }
          return next;
        });
        setDemoSessionToken(login.token);
        setIsBackendConnected(true);
        if (Array.isArray(backendFiles) && backendFiles.length > 0) {
          setVaultFiles((previous) => {
            const byId = new Map(previous.map((file) => [file.id, file]));
            for (const payload of backendFiles) {
              const normalized = normalizeBackendFile(payload);
              byId.set(normalized.id, { ...normalized, ...byId.get(normalized.id) });
            }
            return [...byId.values()].sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
          });
        }

        wsClient.on("message.created", handleMessageCreated);
        wsClient.on("message:new", handleMessageCreated); // Legacy support
        wsClient.on("message.reaction", handleMessageReaction);
        wsClient.on("file:uploaded", handleUploadedFile);
        wsClient.on("call:state", handleCallState);
        wsClient.connect();
      } catch (error) {
        if (active) {
          setIsBackendConnected(false);
          console.info("[AegisNet] Shared API hydration was unavailable; using local prototype data.", error);
        }
      }
    };

    initializeBackend();

    return () => {
      active = false;
      setDemoSessionToken(undefined);
      wsClient.off("message.created", handleMessageCreated);
      wsClient.off("message:new", handleMessageCreated);
      wsClient.off("message.reaction", handleMessageReaction);
      wsClient.off("file:uploaded", handleUploadedFile);
      wsClient.off("call:state", handleCallState);
    };
  }, []);

  useEffect(() => {
    persistState("me", me);
  }, [me]);
  useEffect(() => {
    persistState("chatList", chatList);
  }, [chatList]);
  useEffect(() => {
    persistState("networks", networks);
  }, [networks]);
  useEffect(() => {
    persistState("networkOrder", networkOrder);
  }, [networkOrder]);

  useEffect(() => {
    persistState("networkFolders", networkFolders);
  }, [networkFolders]);
  useEffect(() => {
    persistState("networkProfiles", networkProfiles);
  }, [networkProfiles]);
  useEffect(() => {
    persistState("messages", messages);
  }, [messages]);
  useEffect(() => {
    persistState("vaultFiles", vaultFiles);
  }, [vaultFiles]);
  useEffect(() => {
    persistState("invitations", invitations);
  }, [invitations]);
  useEffect(() => {
    persistState("lastReadMessageIds", lastReadMessageIds);
  }, [lastReadMessageIds]);
  useEffect(() => {
    persistState("drafts", drafts);
  }, [drafts]);
  useEffect(() => {
    persistState("notificationPreferences", notificationPreferences);
  }, [notificationPreferences]);
  useEffect(() => {
    persistState("preferences", preferences);
  }, [preferences]);
  useEffect(() => {
    persistState("trustedContacts", trustedContacts);
  }, [trustedContacts]);
  useEffect(() => {
    persistState("activityPosts", activityPosts);
  }, [activityPosts]);
  useEffect(() => persistState("chatAppearance", chatAppearance), [chatAppearance]);
  useEffect(() => persistState("archivedNetworkIds", archivedNetworkIds), [archivedNetworkIds]);
  useEffect(() => persistState("devErrorLogs", devErrorLogs), [devErrorLogs]);
  useEffect(() => persistState("privacyMode", privacyMode), [privacyMode]);
  useEffect(() => {
    persistState("conversationExpiry", conversationExpiry);
  }, [conversationExpiry]);
  useEffect(() => {
    persistState("disappearDefaultSeconds", disappearDefaultSeconds);
  }, [disappearDefaultSeconds]);
  useEffect(() => {
    persistState("lockPinHash", lockPinHash);
  }, [lockPinHash]);

  // Disappearing messages: periodically remove expired messages from local state
  // and drop their local attachment binaries from IndexedDB.
  useEffect(() => {
    const sweepExpired = () => {
      const now = Date.now();
      setMessages((previous) => {
        let changed = false;
        const next: Record<string, MockMessage[]> = {};
        for (const [conversationId, conversationMessages] of Object.entries(previous)) {
          const kept = conversationMessages.filter((message) => {
            if (!isExpired(message, now)) return true;
            changed = true;
            if (message.attachment?.storageId) {
              deletePrototypeFile(message.attachment.storageId).catch(() => undefined);
            }
            return false;
          });
          next[conversationId] = kept;
        }
        return changed ? next : previous;
      });
    };

    sweepExpired();
    const interval = window.setInterval(sweepExpired, 30_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
    if (selectedChatId) {
      persistState("selectedChatId", selectedChatId);
      wsClient.subscribe(`chat:${selectedChatId}`);
      return () => wsClient.unsubscribe(`chat:${selectedChatId}`);
    }
  }, [selectedChatId]);
  useEffect(() => {
    selectedNetworkIdRef.current = selectedNetworkId;
    if (selectedNetworkId) {
      persistState("selectedNetworkId", selectedNetworkId);
      wsClient.subscribe(`network:${selectedNetworkId}`);
      return () => wsClient.unsubscribe(`network:${selectedNetworkId}`);
    }
  }, [selectedNetworkId]);
  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
    if (selectedRoomId) {
      persistState("selectedRoomId", selectedRoomId);
      wsClient.subscribe(`room:${selectedRoomId}`);
      return () => wsClient.unsubscribe(`room:${selectedRoomId}`);
    }
  }, [selectedRoomId]);

  const sendMessage = (targetId: string, text: string, attachment?: MockMessage["attachment"]) => {
    const cleanText = text.trim();
    if (!cleanText && !attachment) return null;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const chosenExpiry = conversationExpiry[targetId] ?? disappearDefaultSeconds;
    const newMessage: MockMessage = {
      id: messageId,
      senderId: currentUser.id,
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
      attachment,
      createdAt: now,
      expiresAt: computeExpiresAt(now, chosenExpiry, privacyMode),
    };
    knownMessageIdsRef.current.add(messageId);

    setMessages((previous) => ({
      ...previous,
      [targetId]: [...(previous[targetId] || []), newMessage],
    }));

    if (chatList[targetId]) {
      setChatList((previous) => ({
        ...previous,
        [targetId]: {
          ...previous[targetId],
          lastMessageSnippet: attachment
            ? `${attachment.type === "file" ? "File" : "Media"}: ${attachment.name || "attachment"}`
            : cleanText,
          lastActivityAt: "Just now",
          unreadCount: 0,
        },
      }));
    }

    window.setTimeout(() => {
      setMessages((previous) => ({
        ...previous,
        [targetId]: (previous[targetId] || []).map((message) => (
          message.id === messageId ? { ...message, status: "delivered" } : message
        )),
      }));
    }, 500);

    if (isBackendConnected) {
      void (async () => {
        try {
          let syncedAttachment = attachment;
          if (attachment?.storageId) {
            const blob = await getDecryptedPrototypeBlob(attachment.storageId);
            if (blob) {
              const uploaded = await apiClient.upload("/uploads", blob, {
                fileName: attachment.name || `${messageId}.${attachment.type}`,
                uploaderId: currentUser.id,
                accessState: "Shared in conversation",
                sourceTargetId: targetId,
                thumbnailUrl: attachment.thumbnailUrl,
              });
              const rawUrl = uploaded?.url || uploaded?.safeUrl || "";
              syncedAttachment = {
                ...attachment,
                url: rawUrl && String(rawUrl).startsWith("/") ? `${API_URL}${rawUrl}` : String(rawUrl || attachment.url),
                name: String(uploaded?.name || uploaded?.originalName || attachment.name || "Attachment"),
                size: Number(uploaded?.size || attachment.size || 0),
                mimeType: String(uploaded?.type || uploaded?.mimeType || attachment.mimeType || "application/octet-stream"),
                fileId: uploaded?.id ? String(uploaded.id) : attachment.fileId,
              };
            }
          }

          const payload = await apiClient.post(messageEndpoint(targetId), {
            id: messageId,
            clientId: messageId,
            senderId: currentUser.id,
            body: cleanText,
            messageType: syncedAttachment?.type || "text",
            deliveryStatus: "delivered",
            expiresAt: newMessage.expiresAt || null,
            attachments: syncedAttachment ? [attachmentForBackend(syncedAttachment)] : [],
          }, currentUser.id);
          const normalized = normalizeBackendMessage(payload);
          if (!normalized) return;
          knownMessageIdsRef.current.add(normalized.id);
          setMessages((previous) => ({
            ...previous,
            [targetId]: mergeMessageLists(previous[targetId], [{
              ...normalized,
              attachment: normalized.attachment
                ? {
                    ...normalized.attachment,
                    storageId: attachment?.storageId || normalized.attachment.storageId,
                    thumbnailUrl: attachment?.thumbnailUrl || normalized.attachment.thumbnailUrl,
                  }
                : attachment,
            }]),
          }));
        } catch (error) {
          console.info("[AegisNet] Message stayed local because Shared API sync was unavailable.", error);
        }
      })();
    }

    return messageId;
  };

  const createDirectChat = (userId: string) => {
    const existing = Object.values(chatList).find((chat) => (
      chat.type === "direct"
      && chat.participants.includes(currentUser.id)
      && chat.participants.includes(userId)
    ));
    if (existing) {
      setSelectedChatId(existing.id);
      return existing.id;
    }

    const contact = mockUsers[userId];
    const chatId = createLocalId("chat", contact?.name || userId);
    setChatList((previous) => ({
      ...previous,
      [chatId]: {
        id: chatId,
        type: "direct",
        name: contact?.name || "Private contact",
        participants: [currentUser.id, userId],
        unreadCount: 0,
        lastActivityAt: "New",
        lastMessageSnippet: "Start a private conversation.",
      },
    }));
    setMessages((previous) => ({ ...previous, [chatId]: [] }));
    setSelectedChatId(chatId);
    return chatId;
  };

  const createGroupChat = (name: string, participantIds: string[]) => {
    const chatId = createLocalId("chat_group", name);
    const uniqueParticipants = [...new Set([currentUser.id, ...participantIds])];
    setChatList((previous) => ({
      ...previous,
      [chatId]: {
        id: chatId,
        type: "group",
        name: name.trim(),
        participants: uniqueParticipants,
        ownerId: currentUser.id,
        unreadCount: 0,
        lastActivityAt: "New",
        lastMessageSnippet: "Start the group conversation.",
      },
    }));
    setMessages((previous) => ({ ...previous, [chatId]: [] }));
    setSelectedChatId(chatId);
    return chatId;
  };

  const createNetwork = (name: string, templateId?: string) => {
    const cleanName = name.trim();
    if (!cleanName) return { networkId: "", roomId: "" };
    const networkId = `net_${Date.now()}`;
    const initials = name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() || "NET";

    let rooms: { category: string; items: any[] }[] = [];
    let roles: { id: string; name: string; color: string; permissions: string[] }[] = [];
    let firstRoomId = `room_${Date.now()}`;
    let accessLevel = "private"; // default

    const template = networkTemplates.find(t => t.id === templateId);
    if (template) {
      rooms = template.categories.map((cat, i) => ({
        category: cat.name,
        items: cat.rooms.map((room, j) => {
          const newRoomId = `room_${Date.now()}_${i}_${j}`;
          if (i === 0 && j === 0) firstRoomId = newRoomId;
          return {
            id: newRoomId,
            name: room.name || "Room",
            type: room.type || "text",
            visibility: room.visibility || "public"
          };
        })
      }));
      roles = template.roles.map((role, i) => ({
        id: `role_${Date.now()}_${i}`,
        name: role.name,
        color: role.color,
        permissions: role.permissions
      }));
      // Assign default safety
      if (template.defaultSafetySettings) {
        if (template.defaultSafetySettings.hideFromNonMembers) {
          accessLevel = "restricted";
        }
      }
    } else {
      rooms = [
        {
          category: "General",
          items: [{ id: firstRoomId, name: "General Chat", type: "text" }]
        }
      ];
    }

    setNetworks((previous) => {
      const newNetwork: MockNetwork = {
        id: networkId,
        name: cleanName,
        initials,
        color: "bg-indigo-600",
        ownerId: currentUser.id,
        memberIds: [currentUser.id],
        rooms,
        roles,
        memberRoles: {},
        accessLevel: accessLevel as "private" | "restricted" | "opsec" | "open",
        memberLifecycle: {
          [currentUser.id]: "active"
        },
        welcomeAcknowledged: {
          [currentUser.id]: true
        },
        rulesAcknowledged: {
          [currentUser.id]: true
        }
      };
      return { ...previous, [networkId]: newNetwork };
    });

    logQaEvent({
      type: "network.creation.completed",
      networkId,
      userId: currentUser.id,
      success: true
    });

    setMessages((previous) => ({ ...previous, [`network:${networkId}:room:${firstRoomId}`]: [] }));
    setSelectedNetworkId(networkId);
    setSelectedRoomId(firstRoomId);

    SyncQueue.push({ method: "POST", path: "/networks", body: { id: networkId, name: cleanName, ownerId: currentUser.id, color: "bg-indigo-600", initials } });
    
    emitAuditEvent("network.created", networkId, { name: cleanName });
    
    // Add QA Event
    import("../qa/qaEvents").then(({ logQaEvent }) => {
      logQaEvent({
        type: "network.template.created",
        userId: currentUser.id,
        networkId,
        metadata: { name: cleanName, templateId }
      } as any);
    });

    return { networkId, roomId: firstRoomId };
  };

  const acceptInvitation = async (code: string, answers?: Record<string, string>) => {
    // Local prototype invitation codes (created in this browser) resolve first.
    const localInvitation = invitations.find(
      (invitation) => invitation.code.toLowerCase() === code.trim().toLowerCase(),
    );
    if (localInvitation?.targetType === "group") {
      if (!preferences.groupInvites) {
        logQaEvent({
          type: "group.invitation.blocked",
          userId: currentUser.id,
          reason: "group-invites-disabled",
          success: false,
        });
        throw new Error(
          "Group invitations are turned off in your privacy preferences. Enable \"Allow group invitations\" in Profile & Safety to join private groups. (Local-only prototype setting.)",
        );
      }
      const chat = chatList[localInvitation.targetId];
      if (!chat) throw new Error("This group no longer exists.");
      updateGroupMembers(localInvitation.targetId, [...(chat.participants ?? []), currentUser.id]);
      logQaEvent({
        type: "group.invitation.allowed",
        userId: currentUser.id,
        reason: "local-invite-redeemed",
        success: true,
      });
      return localInvitation.targetId;
    }
    try {
      const response = await apiClient.post("/invitations/accept", { token: code, userId: currentUser.id });
      if (response.data.success && response.data.networkId) {
        const netId = response.data.networkId;
        const netRes = await apiClient.get(`/networks/${netId}`);
        const netData = netRes.data;
        
        if (response.data.requireApproval) {
          // In the prototype, if answers are provided, append them to local joinRequests.
          if (answers) {
            try {
              const raw = localStorage.getItem(`aegisnet_joinRequests_${netId}`);
              const existing = raw ? JSON.parse(raw) : [];
              // Avoid duplicates if we can't find it exactly, but just append
              existing.push({
                id: `join_proto_${Math.random().toString(36).substring(2, 9)}`,
                userId: currentUser.id,
                displayName: currentUser.name,
                requestedAt: new Date().toISOString(),
                status: "pending",
                answers,
              });
              localStorage.setItem(`aegisnet_joinRequests_${netId}`, JSON.stringify(existing));
            } catch (e) {}
          }
        } else {
          setNetworks((previous) => ({
            ...previous,
            [netData.id]: {
              ...netData,
              rooms: netData.categories || []
            }
          }));
          setNetworkOrder((prev) => prev.includes(netData.id) ? prev : [...prev, netData.id]);
        }
        
        emitAuditEvent("network.joined", netData.id, { code });
        return netId;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.error || "Failed to join network.");
    }
  };

  const createCategory = (networkId: string, name: string) => {
    if (!hasNetworkPermission(networks[networkId], currentUser.id, "manage_rooms")) return;
    const cleanName = name.trim();
    if (!cleanName) return;
    setNetworks((previous) => {
      const network = previous[networkId];
      if (!network || network.rooms.find((c) => c.category === cleanName)) return previous;
      return {
        ...previous,
        [networkId]: {
          ...network,
          rooms: [...network.rooms, { category: cleanName, items: [] }],
        },
      };
    });
  };

  const renameCategory = (networkId: string, oldName: string, newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName) return;
    setNetworks((previous) => {
      const network = previous[networkId];
      if (!network) return previous;
      return {
        ...previous,
        [networkId]: {
          ...network,
          rooms: network.rooms.map((c) => (c.category === oldName ? { ...c, category: cleanName } : c)),
        },
      };
    });
  };

  const deleteCategory = (networkId: string, name: string, fallbackCategory?: string) => {
    if (!hasNetworkPermission(networks[networkId], currentUser.id, "manage_rooms")) return;
    setNetworks((previous) => {
      const network = previous[networkId];
      if (!network) return previous;
      const targetCategory = network.rooms.find((c) => c.category === name);
      if (!targetCategory) return previous;

      const roomsWithoutDeleted = network.rooms.filter((c) => c.category !== name);
      const rooms = roomsWithoutDeleted.length ? roomsWithoutDeleted : [{ category: "Rooms", items: [] }];

      if (targetCategory.items.length > 0) {
        if (fallbackCategory) {
          const fallbackIndex = rooms.findIndex((c) => c.category === fallbackCategory);
          if (fallbackIndex >= 0) {
            rooms[fallbackIndex] = { ...rooms[fallbackIndex], items: [...rooms[fallbackIndex].items, ...targetCategory.items] };
          } else {
            rooms[0] = { ...rooms[0], items: [...rooms[0].items, ...targetCategory.items] };
          }
        } else {
          rooms[0] = { ...rooms[0], items: [...rooms[0].items, ...targetCategory.items] };
        }
      }
      return {
        ...previous,
        [networkId]: { ...network, rooms },
      };
    });
  };

  const reorderCategory = (networkId: string, fromIndex: number, toIndex: number) => {
    setNetworks((previous) => {
      const network = previous[networkId];
      if (!network) return previous;
      const newRooms = [...network.rooms];
      const [moved] = newRooms.splice(fromIndex, 1);
      newRooms.splice(toIndex, 0, moved);
      return {
        ...previous,
        [networkId]: { ...network, rooms: newRooms }
      };
    });
  };

  const moveCategory = (networkId: string, category: string, direction: "up" | "down") => {
    setNetworks((previous) => {
      const network = previous[networkId];
      if (!network) return previous;
      const index = network.rooms.findIndex((c) => c.category === category);
      if (index < 0) return previous;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= network.rooms.length) return previous;
      const newRooms = [...network.rooms];
      [newRooms[index], newRooms[nextIndex]] = [newRooms[nextIndex], newRooms[index]];
      return {
        ...previous,
        [networkId]: { ...network, rooms: newRooms }
      };
    });
  };

  const setNetworkAccessLevel = (networkId: string, accessLevel: string) => {
    if (!networks[networkId]) return;
    setNetworks((previous) => ({
      ...previous,
      [networkId]: {
        ...previous[networkId],
        accessLevel: accessLevel as any,
      },
    }));
    import("../qa/qaEvents").then(({ logQaEvent }) => {
      logQaEvent({
        type: "network.access.level.changed",
        userId: currentUser.id,
        networkId,
        metadata: { accessLevel }
      } as any);
    });
  };

  const createRoom = (networkId: string, name: string, category?: string, type?: "text" | "announcement" | "check-in" | "vault" | "voice" | "video" | "mission" | "planning", visibility?: "public" | "private" | "restricted" | "opsec", allowedRoles?: string[]) => {
    if (!hasNetworkPermission(networks[networkId], currentUser.id, "manage_rooms")) return null;
    if (!networks[networkId]) return null;
    const roomId = `room_${Date.now()}`;
    const roomType = type || "text";
    setNetworks((previous) => {
      const network = previous[networkId];
      if (!network) return previous;
      
      const targetCategory = category || (network.rooms[0]?.category || "Rooms");
      
      let foundCategory = false;
      let newRooms = network.rooms.map((c) => {
        if (c.category === targetCategory) {
          foundCategory = true;
          return { ...c, items: [...c.items, { id: roomId, name: name.trim(), type: roomType as any, unread: 0, archived: false, ...(visibility && { visibility }), ...(allowedRoles && { allowedRoles }) }] };
        }
        return c;
      });
      
      if (!foundCategory) {
        newRooms.push({ category: targetCategory, items: [{ id: roomId, name: name.trim(), type: roomType as any, unread: 0, archived: false, ...(visibility && { visibility }), ...(allowedRoles && { allowedRoles }) }] });
      }

      return { ...previous, [networkId]: { ...network, rooms: newRooms } };
    });
    setMessages((previous) => ({ ...previous, [`network:${networkId}:room:${roomId}`]: [] }));
    setSelectedNetworkId(networkId);
    setSelectedRoomId(roomId);
    
    apiClient.post(`/networks/${networkId}/rooms`, { id: roomId, name, type: roomType, category, ...(visibility && { visibility }), ...(allowedRoles && { allowedRoles }) })
      .catch(() => {
        SyncQueue.push({ method: "POST", path: `/networks/${networkId}/rooms`, body: { id: roomId, name, type: roomType, category, ...(visibility && { visibility }), ...(allowedRoles && { allowedRoles }) } });
      });
      
    emitAuditEvent("room.created", roomId, { networkId, name, type: roomType, category });
      
    return roomId;
  };

  const updateRoomPermissions = (
    networkId: string,
    roomId: string,
    permissions: { visibility?: "public" | "private" | "restricted" | "opsec"; allowedRoles?: string[] },
  ) => {
    setNetworks((previous) => {
      const network = previous[networkId];
      if (!network) return previous;
      const newRooms = network.rooms.map((section) => ({
        ...section,
        items: section.items.map((room) =>
          room.id === roomId
            ? {
                ...room,
                ...(permissions.visibility !== undefined && { visibility: permissions.visibility }),
                ...(permissions.allowedRoles !== undefined && { allowedRoles: permissions.allowedRoles }),
              }
            : room,
        ),
      }));
      return { ...previous, [networkId]: { ...network, rooms: newRooms } };
    });
    logQaEvent({ type: "room.permissions.updated", networkId, roomId, userId: currentUser.id });
  };

  const renameGroupChat = (chatId: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setChatList((previous) => ({
      ...previous,
      [chatId]: previous[chatId]?.type === "group"
        ? { ...previous[chatId], name: cleanName }
        : previous[chatId],
    }));
    
    apiClient.patch(`/chats/${chatId}`, { name: cleanName }).catch(() => {
      SyncQueue.push({ method: "PATCH", path: `/chats/${chatId}`, body: { name: cleanName } });
    });
  };

  const updateGroupMembers = (chatId: string, participantIds: string[]) => {
    setChatList((previous) => ({
      ...previous,
      [chatId]: previous[chatId]?.type === "group"
        ? { ...previous[chatId], participants: [...new Set([currentUser.id, ...participantIds])] }
        : previous[chatId],
    }));
    
    apiClient.post(`/chats/${chatId}/members`, { participants: participantIds }).catch(() => {
      SyncQueue.push({ method: "POST", path: `/chats/${chatId}/members`, body: { participants: participantIds } });
    });
  };

  const leaveGroupChat = (chatId: string) => {
    setChatList((previous) => {
      const next = { ...previous };
      delete next[chatId];
      return next;
    });
    if (selectedChatIdRef.current === chatId) setSelectedChatId("chat_sarah");
    
    apiClient.delete(`/chats/${chatId}/members/${currentUser.id}`).catch(() => {
      SyncQueue.push({ method: "DELETE", path: `/chats/${chatId}/members/${currentUser.id}` });
    });
  };

  const deleteGroupChat = (chatId: string) => {
    leaveGroupChat(chatId);
    setMessages((previous) => {
      const next = { ...previous };
      delete next[chatId];
      return next;
    });
    setInvitations((previous) => previous.filter((invitation) => invitation.targetId !== chatId));
    setLastReadMessageIds((previous) => {
      const next = { ...previous };
      delete next[chatId];
      return next;
    });
    
    apiClient.delete(`/chats/${chatId}`).catch(() => {
      SyncQueue.push({ method: "DELETE", path: `/chats/${chatId}` });
    });
  };

  const renameNetwork = (networkId: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const initials = cleanName.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
    setNetworks((previous) => ({
      ...previous,
      [networkId]: previous[networkId]
        ? { ...previous[networkId], name: cleanName, initials }
        : previous[networkId],
    }));
    
    apiClient.patch(`/networks/${networkId}`, { name: cleanName })
      .catch(() => {
        SyncQueue.push({ method: "PATCH", path: `/networks/${networkId}`, body: { name: cleanName } });
      });
  };

  const updateNetworkMembers = (networkId: string, memberIds: string[]) => {
    setNetworks((previous) => ({
      ...previous,
      [networkId]: previous[networkId]
        ? { ...previous[networkId], memberIds: [...new Set([currentUser.id, ...memberIds])] }
        : previous[networkId],
    }));
    
    apiClient.post(`/networks/${networkId}/members`, { participants: memberIds }).catch(() => {
      SyncQueue.push({ method: "POST", path: `/networks/${networkId}/members`, body: { participants: memberIds } });
    });
  };

  const leaveNetwork = (networkId: string) => {
    const fallbackNetwork = Object.values(networks).find((network) => network.id !== networkId);
    const fallbackRoom = fallbackNetwork?.rooms
      .flatMap((section) => section.items)
      .find((room) => !room.archived);
    setNetworks((previous) => {
      const next = { ...previous };
      delete next[networkId];
      return next;
    });
    if (selectedNetworkIdRef.current === networkId) {
      setSelectedNetworkId(fallbackNetwork?.id || null);
      setSelectedRoomId(fallbackRoom?.id || null);
    }
    
    apiClient.delete(`/networks/${networkId}/members/${currentUser.id}`).catch(() => {
      SyncQueue.push({ method: "DELETE", path: `/networks/${networkId}/members/${currentUser.id}` });
    });
  };

  const deleteNetwork = (networkId: string) => {
    leaveNetwork(networkId);
  };

  const updateCurrentUserProfile = (updates: Partial<MockUser>) => {
    setMe((prev) => ({ ...prev, ...updates }));
    if (updates.name || updates.bio || updates.avatarColor || updates.username || updates.status) {
      apiClient.patch('/users/me', {
        name: updates.name,
        username: updates.username,
        status: updates.status,
        bio: updates.bio,
        avatarColor: updates.avatarColor,
      }).catch(() => {
        SyncQueue.push({ method: "PATCH", path: "/users/me", body: updates });
      });
    }
  };

  const removeNetworkMember = (networkId: string, userId: string) => {
    if (!hasNetworkPermission(networks[networkId], currentUser.id, "manage_members")) return;
    setNetworks((prev) => {
      const network = prev[networkId];
      if (!network) return prev;
      return {
        ...prev,
        [networkId]: {
          ...network,
          memberIds: network.memberIds?.filter(id => id !== userId) || [],
        }
      };
    });
    emitAuditEvent("network.member.removed", networkId, { userId });
    apiClient.post(`/networks/${networkId}/members/${userId}/kick`, {}).catch(() => {
      SyncQueue.push({ method: "POST", path: `/networks/${networkId}/members/${userId}/kick`, body: {} });
    });
  };

  const updateNetworkMemberRoles = (networkId: string, userId: string, roleIds: string[]) => {
    setNetworks((prev) => {
      const network = prev[networkId];
      if (!network) return prev;
      return {
        ...prev,
        [networkId]: {
          ...network,
          memberRoles: {
            ...(network.memberRoles || {}),
            [userId]: roleIds,
          }
        }
      };
    });
    emitAuditEvent("network.member.roles_updated", networkId, { userId, roleIds });
  };

  const createNetworkRole = (networkId: string, name: string, color: string, permissions: string[]) => {
    if (!hasNetworkPermission(networks[networkId], currentUser.id, "manage_roles")) return;
    const newRole = { id: crypto.randomUUID(), name, color, permissions };
    setNetworks((prev) => {
      const network = prev[networkId];
      if (!network) return prev;
      return {
        ...prev,
        [networkId]: {
          ...network,
          roles: [...(network.roles || []), newRole],
        }
      };
    });
    emitAuditEvent("network.role.created", networkId, { name, permissions });
    apiClient.post(`/networks/${networkId}/roles`, newRole).catch(() => {
      SyncQueue.push({ method: "POST", path: `/networks/${networkId}/roles`, body: newRole });
    });
  };

  const deleteNetworkRole = (networkId: string, roleId: string) => {
    setNetworks((prev) => {
      const network = prev[networkId];
      if (!network) return prev;
      return {
        ...prev,
        [networkId]: {
          ...network,
          roles: (network.roles || []).filter((role) => role.id !== roleId),
          memberRoles: Object.fromEntries(
            Object.entries(network.memberRoles || {}).map(([memberId, roleIds]) => [
              memberId,
              roleIds.filter((id) => id !== roleId),
            ]),
          ),
        },
      };
    });
    emitAuditEvent("network.role.deleted", networkId, { roleId });
    logQaEvent({ type: "network.role.deleted", userId: currentUser.id, networkId, success: true });
    apiClient.delete(`/networks/${networkId}/roles/${roleId}`).catch(() => {
      SyncQueue.push({ method: "DELETE", path: `/networks/${networkId}/roles/${roleId}` });
    });
  };

  const timeoutNetworkMember = (networkId: string, userId: string, durationSeconds: number) => {
    emitAuditEvent("network.member.timeout", networkId, { userId, durationSeconds });
    apiClient.post(`/networks/${networkId}/members/${userId}/timeout`, { durationMinutes: Math.ceil(durationSeconds / 60) }).catch(() => {
      SyncQueue.push({ method: "POST", path: `/networks/${networkId}/members/${userId}/timeout`, body: { durationMinutes: Math.ceil(durationSeconds / 60) } });
    });
  };

  const banNetworkMember = (networkId: string, userId: string) => {
    removeNetworkMember(networkId, userId);
    emitAuditEvent("network.member.banned", networkId, { userId });
    apiClient.post(`/networks/${networkId}/members/${userId}/ban`, { reason: "Banned by admin" }).catch(() => {
      SyncQueue.push({ method: "POST", path: `/networks/${networkId}/members/${userId}/ban`, body: { reason: "Banned by admin" } });
    });
  };
  
  const deleteNetworkConfirmed = (networkId: string) => {
    setMessages((previous) => Object.fromEntries(
      Object.entries(previous).filter(([targetId]) => !targetId.startsWith(`network:${networkId}:room:`)),
    ));
    setInvitations((previous) => previous.filter((invitation) => invitation.targetId !== networkId));
    setLastReadMessageIds((previous) => Object.fromEntries(
      Object.entries(previous).filter(([targetId]) => !targetId.startsWith(`network:${networkId}:room:`)),
    ));
    setNetworkOrder(prev => prev.filter(id => id !== networkId));
    
    apiClient.delete(`/networks/${networkId}`).catch(() => {
      SyncQueue.push({ method: "DELETE", path: `/networks/${networkId}` });
    });
  };

  const moveNetwork = (networkId: string, direction: "up" | "down") => {
    setNetworkOrder(prev => {
      const index = prev.indexOf(networkId);
      if (index < 0) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const reorderNetwork = (fromIndex: number, toIndex: number) => {
    setNetworkOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const updateNetworkProfile = (networkId: string, profile: MockNetworkProfile) => {
    setNetworkProfiles(prev => ({
      ...prev,
      [networkId]: { ...prev[networkId], ...profile }
    }));
    apiClient.patch(`/networks/${networkId}/members/me`, profile).catch(() => {
      SyncQueue.push({ method: "PATCH", path: `/networks/${networkId}/members/me`, body: profile });
    });
  };

  const createInvitation = (
    targetType: PrototypeInvitation["targetType"],
    targetId: string,
    options: { expiresLabel?: string; maxUses?: number; requireApproval?: boolean; onboardingQuestions?: string[] } = {},
  ) => {
    const invitation: PrototypeInvitation = {
      id: createLocalId("invite", targetId),
      targetType,
      targetId,
      code: `AEGIS-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      expiresLabel: options.expiresLabel,
      maxUses: options.maxUses,
      requireApproval: options.requireApproval ?? true,
      onboardingQuestions: options.onboardingQuestions,
    };
    setInvitations((previous) => [invitation, ...previous]);
    if (targetType === "network") {
      apiClient.post(`/invitations/network/${targetId}`, {
        maxUses: options.maxUses,
        requireApproval: options.requireApproval ?? true,
        // Backend support for onboarding questions would go here.
        // onboardingQuestions: options.onboardingQuestions
      }).catch(() => {
        SyncQueue.push({ method: "POST", path: `/invitations/network/${targetId}`, body: { maxUses: options.maxUses, requireApproval: options.requireApproval ?? true } });
      });
    }
    logQaEvent({
      type: "invite.created",
      userId: currentUser.id,
      networkId: targetType === "network" ? targetId : undefined,
      reason: `target:${targetType}`,
      success: true,
    });
    return invitation;
  };

  const revokeInvitation = (invitationId: string) => {
    setInvitations((previous) => previous.filter((invitation) => invitation.id !== invitationId));
    logQaEvent({ type: "invite.revoked", userId: currentUser.id, success: true });
  };

  const updateRoom = (
    networkId: string,
    roomId: string,
    updater: (room: MockNetwork["rooms"][number]["items"][number]) => MockNetwork["rooms"][number]["items"][number],
  ) => {
    if (!hasNetworkPermission(networks[networkId], currentUser.id, "manage_rooms")) return;
    setNetworks((previous) => ({
      ...previous,
      [networkId]: previous[networkId]
        ? {
            ...previous[networkId],
            rooms: previous[networkId].rooms.map((section) => ({
              ...section,
              items: section.items.map((room) => room.id === roomId ? updater(room) : room),
            })),
          }
        : previous[networkId],
    }));
  };

  const renameRoom = (networkId: string, roomId: string, name: string) => {
    const cleanName = name.trim();
    if (cleanName) {
      updateRoom(networkId, roomId, (room) => ({ ...room, name: cleanName }));
      apiClient.patch(`/rooms/${roomId}`, { name: cleanName }).catch(() => {
        SyncQueue.push({ method: "PATCH", path: `/rooms/${roomId}`, body: { name: cleanName } });
      });
    }
  };

  const moveRoomToCategory = (networkId: string, roomId: string, newCategory: string) => {
    setNetworks((previous) => {
      const network = previous[networkId];
      if (!network) return previous;
      
      let targetRoom: any = null;
      let currentCategory = "";
      
      network.rooms.forEach(c => {
        const item = c.items.find(r => r.id === roomId);
        if (item) {
          targetRoom = item;
          currentCategory = c.category;
        }
      });
      
      if (!targetRoom || currentCategory === newCategory) return previous;
      
      let newRooms = network.rooms.map(c => {
        if (c.category === currentCategory) {
          return { ...c, items: c.items.filter(r => r.id !== roomId) };
        }
        if (c.category === newCategory) {
          return { ...c, items: [...c.items, targetRoom] };
        }
        return c;
      });
      
      return {
        ...previous,
        [networkId]: { ...network, rooms: newRooms }
      };
    });
    
    apiClient.patch(`/rooms/${roomId}`, { category: newCategory }).catch(() => {
      SyncQueue.push({ method: "PATCH", path: `/rooms/${roomId}`, body: { category: newCategory } });
    });
  };

  const reorderRoom = (networkId: string, sourceCategory: string, roomId: string, targetCategory: string, toIndex: number) => {
    setNetworks((previous) => {
      const network = previous[networkId];
      if (!network) return previous;

      let targetRoom: any = null;
      network.rooms.forEach(c => {
        if (c.category === sourceCategory) {
          targetRoom = c.items.find(r => r.id === roomId);
        }
      });
      if (!targetRoom) return previous;

      const newRooms = network.rooms.map(c => {
        if (c.category === sourceCategory && sourceCategory !== targetCategory) {
          return { ...c, items: c.items.filter(r => r.id !== roomId) };
        }
        if (c.category === targetCategory) {
          const newItems = sourceCategory === targetCategory ? c.items.filter(r => r.id !== roomId) : [...c.items];
          newItems.splice(toIndex, 0, targetRoom);
          return { ...c, items: newItems };
        }
        return c;
      });

      return {
        ...previous,
        [networkId]: { ...network, rooms: newRooms }
      };
    });
    
    apiClient.patch(`/rooms/${roomId}`, { category: targetCategory }).catch(() => {
      SyncQueue.push({ method: "PATCH", path: `/rooms/${roomId}`, body: { category: targetCategory } });
    });
  };

  const moveRoom = (networkId: string, roomId: string, direction: "up" | "down") => {
    setNetworks((previous) => {
      const network = previous[networkId];
      if (!network) return previous;
      return {
        ...previous,
        [networkId]: {
          ...network,
          rooms: network.rooms.map((section) => {
            const index = section.items.findIndex((room) => room.id === roomId);
            if (index < 0) return section;
            const nextIndex = direction === "up" ? index - 1 : index + 1;
            if (nextIndex < 0 || nextIndex >= section.items.length) return section;
            const items = [...section.items];
            [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
            return { ...section, items };
          }),
        },
      };
    });
  };

  const updateNetworkIcon = (networkId: string, iconUrl: string | null) => {
    setNetworks((previous) => ({
      ...previous,
      [networkId]: previous[networkId]
        ? { ...previous[networkId], iconUrl: iconUrl || undefined }
        : previous[networkId],
    }));
  };

  const createNetworkFolder = (name: string, networkIds: string[]) => {
    const id = `folder_${Math.random().toString(36).substr(2, 9)}`;
    const newFolder: MockNetworkFolder = {
      id,
      name,
      color: "bg-surface-card border-border-default",
      networkIds,
      isCollapsed: false,
    };
    setNetworkFolders((prev) => ({ ...prev, [id]: newFolder }));
    setNetworkOrder((prev) => {
      // Remove the networks from the main order since they are in a folder
      const filtered = prev.filter(nId => !networkIds.includes(nId));
      return [...filtered, id];
    });
  };

  const updateNetworkFolder = (folderId: string, updates: Partial<MockNetworkFolder>) => {
    setNetworkFolders((prev) => ({
      ...prev,
      [folderId]: { ...prev[folderId], ...updates },
    }));
  };

  const deleteNetworkFolder = (folderId: string) => {
    const folder = networkFolders[folderId];
    if (!folder) return;
    
    setNetworkFolders((prev) => {
      const next = { ...prev };
      delete next[folderId];
      return next;
    });
    
    setNetworkOrder((prev) => {
      // Replace the folder ID with its contents
      const idx = prev.indexOf(folderId);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1, ...folder.networkIds);
      return next;
    });
  };

  const setRoomArchived = (networkId: string, roomId: string, archived: boolean) => {
    updateRoom(networkId, roomId, (room) => ({ ...room, archived }));
    apiClient.patch(`/rooms/${roomId}`, { archived }).catch(() => {
      SyncQueue.push({ method: "PATCH", path: `/rooms/${roomId}`, body: { archived } });
    });
  };

  const updateRoomVisibility = (
    networkId: string,
    roomId: string,
    visibility: import("../data/mockNetworks").RoomVisibility,
    allowedRoles: string[],
  ) => {
    updateRoom(networkId, roomId, (room) => ({ ...room, visibility, allowedRoles }));
    logQaEvent({ type: "room.permissions.updated", userId: currentUser.id, networkId, success: true });
  };

  const deleteRoom = (networkId: string, roomId: string) => {
    if (!hasNetworkPermission(networks[networkId], currentUser.id, "manage_rooms")) return;
    setNetworks((previous) => ({
      ...previous,
      [networkId]: previous[networkId]
        ? {
            ...previous[networkId],
            rooms: previous[networkId].rooms.map((section) => ({
              ...section,
              items: section.items.filter((room) => room.id !== roomId),
            })),
          }
        : previous[networkId],
    }));
    const targetId = `network:${networkId}:room:${roomId}`;
    setMessages((previous) => {
      const next = { ...previous };
      delete next[targetId];
      return next;
    });
    setLastReadMessageIds((previous) => {
      const next = { ...previous };
      delete next[targetId];
      return next;
    });
    
    apiClient.delete(`/rooms/${roomId}`).catch(() => {
      SyncQueue.push({ method: "DELETE", path: `/rooms/${roomId}` });
    });
  };

  const setConversationUnreadCount = (targetId: string, count: number) => {
    if (chatList[targetId]) {
      setChatList((previous) => ({
        ...previous,
        [targetId]: previous[targetId] ? { ...previous[targetId], unreadCount: count } : previous[targetId],
      }));
      return;
    }
    const match = targetId.match(/^network:([^:]+):room:(.+)$/);
    if (match) updateRoom(match[1], match[2], (room) => ({ ...room, unread: count }));
  };

  const joinRoomSession = useCallback((roomId: string) => {
    setActiveVoiceVideoRooms(prev => ({
      ...prev,
      [roomId]: Array.from(new Set([...(prev[roomId] || []), "me"]))
    }));
  }, []);

  const leaveRoomSession = useCallback((roomId: string) => {
    setActiveVoiceVideoRooms(prev => ({
      ...prev,
      [roomId]: (prev[roomId] || []).filter(id => id !== "me")
    }));
  }, []);

  const toggleMessageReaction = useCallback((targetId: string, messageId: string, emoji: string) => {
    setMessages(prev => {
      const items = prev[targetId];
      if (!items) return prev;

      return {
        ...prev,
        [targetId]: items.map(msg => {
          if (msg.id !== messageId) return msg;

          const currentReactions = msg.reactions || {};
          const usersForEmoji = currentReactions[emoji] || [];
          const hasReacted = usersForEmoji.includes(currentUser.id);

          const newUsersForEmoji = hasReacted
            ? usersForEmoji.filter(id => id !== currentUser.id)
            : [...usersForEmoji, currentUser.id];

          const newReactions = { ...currentReactions };
          if (newUsersForEmoji.length === 0) {
            delete newReactions[emoji];
          } else {
            newReactions[emoji] = newUsersForEmoji;
          }

          if (isBackendConnected) {
             const roomMatch = targetId.match(/^network:([^:]+):room:(.+)$/);
             const topic = roomMatch ? `room:${roomMatch[2]}` : `chat:${targetId}`;
             wsClient.send("message.reaction", { targetId, messageId, emoji, hasReacted: !hasReacted }, topic);
          }

          return { ...msg, reactions: newReactions };
        })
      };
    });
  }, [currentUser.id, isBackendConnected]);

  const markConversationRead = (targetId: string) => {
    const items = messages[targetId] || [];
    setLastReadMessageIds((previous) => ({
      ...previous,
      [targetId]: items.at(-1)?.id || null,
    }));
    setConversationUnreadCount(targetId, 0);
  };

  const markConversationUnread = (targetId: string) => {
    const items = messages[targetId] || [];
    setLastReadMessageIds((previous) => ({
      ...previous,
      [targetId]: items.length > 1 ? items.at(-2)?.id || null : null,
    }));
    setConversationUnreadCount(targetId, Math.max(1, items.length ? 1 : 0));
  };

  const uploadVaultFile = (file: MockVaultFile) => {
    setVaultFiles((previous) => [file, ...previous.filter((item) => item.id !== file.id)]);
    if (isBackendConnected) {
      void apiClient.post("/files", {
        id: file.id,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        uploadedBy: file.uploadedBy,
        accessState: file.accessState,
        storageId: file.storageId,
        encrypted: file.encrypted,
        hash: file.hash,
        thumbnailUrl: file.thumbnailUrl,
      }, currentUser.id).then((payload) => {
        const normalized = normalizeBackendFile(payload);
        setVaultFiles((previous) => previous.map((item) => (
          item.id === file.id ? { ...normalized, ...item } : item
        )));
      }).catch((error) => {
        console.info("[AegisNet] Vault metadata stayed local because Shared API sync was unavailable.", error);
      });
    }
    
    emitAuditEvent("file.uploaded", file.id, { name: file.name, size: file.size });
  };

  const deleteVaultFile = (id: string) => {
    setVaultFiles((previous) => previous.filter((file) => file.id !== id));
  };

  const updateVaultFilePermissions = (id: string, permissions: FilePermissions) => {
    setVaultFiles((prev) => prev.map((f) => (f.id === id ? { ...f, permissions } : f)));
  };

  const logFileAccess = (fileId: string, action: FileAccessLogEntry["action"]) => {
    const entry: FileAccessLogEntry = {
      id: `fal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fileId,
      action,
      userId: me.id,
      timestamp: new Date().toISOString(),
    };
    setFileAccessLogs((prev) => [entry, ...prev].slice(0, 1000));
  };

  const updatePreference = (key: keyof PrototypePreferences, value: boolean) => {
    setPreferences((previous) => ({ ...previous, [key]: value }));
    const eventType =
      key === "readReceipts" ? "read.receipts.toggled"
      : key === "safetyCheckReminders" ? "safety.reminders.toggled"
      : "privacy.preference.toggled";
    logQaEvent({
      type: eventType,
      userId: currentUser.id,
      reason: `${key}:${value ? "on" : "off"}`,
      success: true,
    });
  };

  // ----- Trusted Contacts (local prototype labels — not identity verification) -----

  const setTrustLevel = (
    userId: string,
    level: TrustLevel,
    options: { reason?: string; note?: string } = {},
  ) => {
    const previous = trustedContacts[userId];
    const record = buildTrustRecord(userId, level, currentUser.id, { ...options, previous });
    setTrustedContacts((prev) => ({ ...prev, [userId]: record }));
    logQaEvent({
      type: previous ? "trust.level.changed" : "trusted.contact.added",
      userId: currentUser.id,
      targetUserId: userId,
      reason: `level:${level}`,
      success: true,
    });
    apiClient.put(`/trust/${userId}`, { trustLevel: level, reason: options.reason }).catch(() => {
      SyncQueue.push({ method: "PUT", path: `/trust/${userId}`, body: { trustLevel: level, reason: options.reason } });
    });
  };

  const removeTrustedContact = (userId: string) => {
    setTrustedContacts((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    logQaEvent({
      type: "trusted.contact.removed",
      userId: currentUser.id,
      targetUserId: userId,
      success: true,
    });
    apiClient.delete(`/trust/${userId}`).catch(() => {
      SyncQueue.push({ method: "DELETE", path: `/trust/${userId}` });
    });
  };

  // ----- Activity posts (local-only; content never logged or exported) -----

  const addActivityPost = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const post: ActivityPost = {
      id: createLocalId("act", clean.slice(0, 8)),
      authorId: currentUser.id,
      text: clean,
      createdAt: new Date().toISOString(),
    };
    setActivityPosts((prev) => ({
      ...prev,
      [currentUser.id]: [post, ...(prev[currentUser.id] ?? [])],
    }));
    // Metadata only — the post text is intentionally NOT logged.
    logQaEvent({ type: "activity.post.added", userId: currentUser.id, success: true });
  };

  const deleteActivityPost = (postId: string) => {
    setActivityPosts((prev) => ({
      ...prev,
      [currentUser.id]: (prev[currentUser.id] ?? []).filter((post) => post.id !== postId),
    }));
    logQaEvent({ type: "activity.post.removed", userId: currentUser.id, success: true });
  };

  // ----- Chat appearance (local-only color/wallpaper presets) -----

  const updateChatAppearance = (targetId: string, updates: Partial<ChatAppearance>) => {
    setChatAppearanceState((prev) => ({
      ...prev,
      [targetId]: { ...prev[targetId], ...updates },
    }));
  };

  const resetChatAppearance = (targetId: string) => {
    setChatAppearanceState((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
  };

  // ----- Network archive (local-only hide; restore via Danger Zone) -----

  const setNetworkArchived = (networkId: string, archived: boolean) => {
    logQaEvent({
      type: archived ? "network.archive.attempted" : "network.restore.attempted",
      userId: currentUser.id,
      networkId,
    });
    setArchivedNetworkIds((prev) => {
      if (archived) return prev.includes(networkId) ? prev : [...prev, networkId];
      return prev.filter((id) => id !== networkId);
    });
    emitAuditEvent(archived ? "network.archived" : "network.restored", networkId, null);
    logQaEvent({
      type: archived ? "network.archive.succeeded" : "network.restore.succeeded",
      userId: currentUser.id,
      networkId,
      success: true,
    });
  };

  const startPrototypeCall = useCallback((details: {
    mode: "voice" | "video";
    chatId?: string;
    roomId?: string;
    receiverId?: string;
  }) => {
    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    activeCallIdRef.current = callId;
    setCallStateState("secure-connected");
    if (isBackendConnected) {
      void apiClient.post("/calls/start", {
        id: callId,
        callerId: currentUser.id,
        state: "secure-connected",
        ...details,
      }, currentUser.id).catch((error) => {
        console.info("[AegisNet] Call state stayed local because Shared API sync was unavailable.", error);
      });
    }
    return callId;
  }, [isBackendConnected]);

  const setCallState = useCallback((state: CallState) => {
    setCallStateState(state);
    const callId = activeCallIdRef.current;
    if (isBackendConnected && callId) {
      void apiClient.post(`/calls/${callId}/state`, { state }, currentUser.id).catch((error) => {
        console.info("[AegisNet] Call transition stayed local because Shared API sync was unavailable.", error);
      });
    }
  }, [isBackendConnected]);

  const endPrototypeCall = useCallback(() => {
    const callId = activeCallIdRef.current;
    activeCallIdRef.current = null;
    if (isBackendConnected && callId) {
      void apiClient.post(`/calls/${callId}/end`, {}, currentUser.id).catch((error) => {
        console.info("[AegisNet] Call end stayed local because Shared API sync was unavailable.", error);
      });
    }
  }, [isBackendConnected]);

  const logDevError = (errorInfo: Omit<DevErrorLog, "id" | "timestamp">) => {
    const log: DevErrorLog = {
      ...errorInfo,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    setDevErrorLogs((prev) => [log, ...prev].slice(0, 100)); // Keep last 100
  };

  const clearDevErrors = () => {
    setDevErrorLogs([]);
  };

  const setDraft = (targetId: string, text: string) => {
    setDrafts((prev) => ({ ...prev, [targetId]: text }));
  };

  const setNotificationPreference = (targetId: string, level: "all" | "mentions" | "muted") => {
    setNotificationPreferences((prev) => ({ ...prev, [targetId]: level }));
  };

  const setPrivacyMode = (mode: PrivacyMode) => {
    setPrivacyModeState(mode);
    // Leaving Lockdown clears any engaged lock so the user is not stranded.
    if (mode !== "lockdown") setIsLocked(false);
  };

  const markDeviceTrusted = (id: string, trusted: boolean) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, trustState: trusted ? "trusted" : "untrusted" } : d));
  };

  const renameDevice = (id: string, newName: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d));
  };

  const revokeDevice = (id: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, revoked: true } : d));
  };

  const revokeOtherDevices = () => {
    setDevices(prev => prev.map(d => !d.currentDevice ? { ...d, revoked: true } : d));
  };

  const revokeSession = (id: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, revoked: true } : s));
  };

  const revokeOtherSessions = () => {
    setSessions(prev => prev.map(s => !s.currentSession ? { ...s, revoked: true } : s));
  };

  const markSessionReviewed = (id: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, reviewed: true } : s));
  };

  const setConversationExpiry = (targetId: string, seconds: number) => {
    setConversationExpiryState((prev) => ({ ...prev, [targetId]: Math.max(0, seconds) }));
  };

  const setDisappearDefault = (seconds: number) => {
    setDisappearDefaultState(Math.max(0, seconds));
  };

  const setLockPin = (pin: string) => {
    const clean = pin.trim();
    if (clean.length < 4) return;
    setLockPinHash(hashLockPin(clean));
  };

  const clearLockPin = () => {
    setLockPinHash("");
    setIsLocked(false);
  };

  const lockApp = () => {
    // Only meaningful once a PIN exists; otherwise there is nothing to unlock with.
    if (lockPinHash) setIsLocked(true);
  };

  const unlockApp = (pin: string) => {
    if (!lockPinHash) {
      setIsLocked(false);
      return true;
    }
    if (hashLockPin(pin.trim()) === lockPinHash) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const clearLocalData = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("aegisnet_"))
      .forEach((key) => localStorage.removeItem(key));
    setChatList(initialMockChatList);
    setNetworks(mockNetworks);
    setMessages(initialMockMessages);
    setVaultFiles(initialVaultFiles);
    setFileAccessLogs([]);
    setInvitations([]);
    setLastReadMessageIds({});
    setDrafts({});
    setNotificationPreferences({});
    setPreferences(initialPreferences);
    setTrustedContacts(seededTrustRecords(currentUser.id));
    setActivityPosts(initialActivityPosts);
    setChatAppearanceState({});
    setArchivedNetworkIds([]);
    setDevErrorLogs([]);
    setPrivacyModeState("normal");
    setDevices([
      { id: "dev-01", name: "My Work Laptop", type: "desktop", browser: "Chrome / Windows", firstSeen: "2026-06-01T10:00:00Z", lastActive: new Date().toISOString(), trustState: "trusted", currentDevice: true },
      { id: "dev-02", name: "Personal Phone", type: "mobile", browser: "Safari / iOS", firstSeen: "2026-05-15T08:30:00Z", lastActive: "2026-06-10T12:00:00Z", trustState: "untrusted", currentDevice: false },
    ]);
    setSessions([
      { id: "sess-01", deviceId: "dev-01", createdAt: "2026-06-11T00:00:00Z", lastActive: new Date().toISOString(), currentSession: true, reviewed: true },
      { id: "sess-02", deviceId: "dev-02", createdAt: "2026-06-09T18:00:00Z", lastActive: "2026-06-10T12:00:00Z", currentSession: false, reviewed: false },
    ]);
    setConversationExpiryState({});
    setDisappearDefaultState(0);
    setLockPinHash("");
    setIsLocked(false);
    setSelectedChatId("chat_sarah");
    setSelectedNetworkId("net_family");
    setSelectedRoomId("room_fam_chat");
    setCallStateState("secure-connected");
    activeCallIdRef.current = null;
    clearPrototypeFiles().catch(() => {
      console.info("[AegisNet] Local file storage could not be cleared.");
    });
    clearVaultKey().catch(() => {
      console.info("[AegisNet] Local Vault encryption key could not be cleared.");
    });
  };


  const requestRole = (networkId: string, roleName: string, reason?: string) => {
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net) return prev;
      const newRequest = {
        id: `req_${Date.now()}`,
        userId: currentUser.id,
        roleName,
        reason,
        status: "pending" as const,
        createdAt: new Date().toISOString()
      };
      return {
        ...prev,
        [networkId]: {
          ...net,
          roleRequests: [...(net.roleRequests || []), newRequest]
        }
      };
    });
    logQaEvent({ type: "role.request.created", networkId, userId: currentUser.id, success: true, reason: "requested" });
  };

  const approveRoleRequest = (networkId: string, requestId: string) => {
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net) return prev;
      const request = (net.roleRequests || []).find(r => r.id === requestId);
      if (!request) return prev;
      
      const updatedRequests = (net.roleRequests || []).map(r => r.id === requestId ? { ...r, status: "approved" as const } : r);
      
      const targetRole = (net.roles || []).find(r => r.name === request.roleName);
      const updatedMemberRoles = { ...net.memberRoles };
      if (targetRole) {
        updatedMemberRoles[request.userId] = [...(updatedMemberRoles[request.userId] || []), targetRole.id];
      }

      return {
        ...prev,
        [networkId]: {
          ...net,
          roleRequests: updatedRequests,
          memberRoles: updatedMemberRoles
        }
      };
    });
    logQaEvent({ type: "role.request.approved", networkId, success: true, reason: "approved" });
  };

  const rejectRoleRequest = (networkId: string, requestId: string) => {
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net) return prev;
      const updatedRequests = (net.roleRequests || []).map(r => r.id === requestId ? { ...r, status: "rejected" as const } : r);
      return {
        ...prev,
        [networkId]: {
          ...net,
          roleRequests: updatedRequests
        }
      };
    });
    logQaEvent({ type: "role.request.rejected", networkId, success: true, reason: "rejected" });
  };

  const updateMemberLifecycle = (networkId: string, userId: string, status: "pending" | "approved" | "active" | "limited" | "suspended" | "removed") => {
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net) return prev;
      return {
        ...prev,
        [networkId]: {
          ...net,
          memberLifecycle: {
            ...(net.memberLifecycle || {}),
            [userId]: status
          }
        }
      };
    });
    logQaEvent({ type: "member.lifecycle.updated", networkId, userId, success: true, reason: status });
  };

  const acknowledgeWelcome = (networkId: string) => {
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net) return prev;
      return {
        ...prev,
        [networkId]: {
          ...net,
          welcomeAcknowledged: {
            ...(net.welcomeAcknowledged || {}),
            [currentUser.id]: true
          }
        }
      };
    });
    logQaEvent({ type: "welcome.acknowledged", networkId, userId: currentUser.id, success: true });
  };

  const acknowledgeRules = (networkId: string) => {
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net) return prev;
      return {
        ...prev,
        [networkId]: {
          ...net,
          rulesAcknowledged: {
            ...(net.rulesAcknowledged || {}),
            [currentUser.id]: true
          }
        }
      };
    });
    logQaEvent({ type: "rules.acknowledged", networkId, userId: currentUser.id, success: true });
  };

  const createAnnouncement = (networkId: string, title: string, body: string, important?: boolean) => {
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net) return prev;
      const newAnn = {
        id: `ann_${Date.now()}`,
        title,
        body,
        authorId: currentUser.id,
        createdAt: new Date().toISOString(),
        important
      };
      return {
        ...prev,
        [networkId]: {
          ...net,
          announcements: [newAnn, ...(net.announcements || [])]
        }
      };
    });
    logQaEvent({ type: "announcement.created", networkId, success: true });
  };

  const pinResource = (networkId: string, title: string, url?: string, roomId?: string, vaultFileId?: string) => {
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net) return prev;
      const newPin = {
        id: `pin_${Date.now()}`,
        title,
        url,
        roomId,
        vaultFileId,
        addedBy: currentUser.id,
        createdAt: new Date().toISOString()
      };
      return {
        ...prev,
        [networkId]: {
          ...net,
          pinnedResources: [...(net.pinnedResources || []), newPin]
        }
      };
    });
    logQaEvent({ type: "resource.pinned", networkId, success: true });
  };
  /** Local prototype state mutations for Organization Tree */
  const createOrgNode = (networkId: string, node: Omit<import("../data/mockNetworks").MockOrgTreeNode, "id">) => {
    const nodeId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullNode = { ...node, id: nodeId, createdAt: new Date().toISOString() };
    
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net) return prev;
      return {
        ...prev,
        [networkId]: {
          ...net,
          orgNodes: [...(net.orgNodes || []), fullNode],
        }
      };
    });
    
    logQaEvent({ type: "org_tree.node.created", networkId, nodeId, success: true });
    return nodeId;
  };

  const updateOrgNode = (networkId: string, nodeId: string, updates: Partial<import("../data/mockNetworks").MockOrgTreeNode>) => {
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net || !net.orgNodes) return prev;
      
      // Prevent circular references: Node cannot be its own parent.
      if (updates.parentId === nodeId) return prev;
      
      // Prevent circular references: Node cannot be a descendant of itself.
      if (updates.parentId) {
        let currentParent = updates.parentId;
        let isCircular = false;
        while (currentParent) {
          if (currentParent === nodeId) {
            isCircular = true;
            break;
          }
          const parentNode = net.orgNodes.find(n => n.id === currentParent);
          currentParent = parentNode?.parentId || "";
        }
        if (isCircular) return prev;
      }

      return {
        ...prev,
        [networkId]: {
          ...net,
          orgNodes: net.orgNodes.map(n => 
            n.id === nodeId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
          ),
        }
      };
    });
    logQaEvent({ type: "org_tree.node.updated", networkId, nodeId, success: true });
  };

  const deleteOrgNode = (networkId: string, nodeId: string) => {
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net || !net.orgNodes) return prev;
      
      return {
        ...prev,
        [networkId]: {
          ...net,
          orgNodes: net.orgNodes
            .filter(n => n.id !== nodeId)
            .map(n => n.parentId === nodeId ? { ...n, parentId: undefined } : n) // Children move to root
        }
      };
    });
    logQaEvent({ type: "org_tree.node.deleted", networkId, nodeId, success: true });
  };

  const assignMemberToOrgNode = (networkId: string, nodeId: string, memberId: string | undefined) => {
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net || !net.orgNodes) return prev;
      
      return {
        ...prev,
        [networkId]: {
          ...net,
          orgNodes: net.orgNodes.map(n => 
            n.id === nodeId ? { ...n, assignedMemberId: memberId, updatedAt: new Date().toISOString() } : n
          ),
        }
      };
    });
    logQaEvent({ 
      type: memberId ? "org_tree.member.assigned" : "org_tree.member.removed", 
      networkId, 
      nodeId,
      userId: memberId,
      success: true 
    });
  };


  const updateAdminNote = (networkId: string, userId: string, note: string) => {
    setNetworks((prev) => {
      const net = prev[networkId];
      if (!net) return prev;
      return {
        ...prev,
        [networkId]: {
          ...net,
          adminNotes: {
            ...(net.adminNotes || {}),
            [userId]: note
          }
        }
      };
    });
  };

  const visibleNetworks = Object.fromEntries(
    Object.entries(networks).filter(([id, network]) => {
      const isMember = network.ownerId === me.id || network.memberIds?.includes(me.id);
      if (isMember) return true;
      const restricted = loadRestrictedSettings(id);
      return !restricted.hideFromNonMembers;
    })
  );

  return (
    <MockAppStateContext.Provider value={{
      me,
      users,
      chatList,
      messages,
      networks: visibleNetworks,
      networkOrder,
      networkFolders,
      networkProfiles,
      vaultFiles,
      fileAccessLogs,
      invitations,
      lastReadMessageIds,
      drafts,
      notificationPreferences,
      preferences,
      privacyMode,
      conversationExpiry,
      disappearDefaultSeconds,
      lockPinSet: Boolean(lockPinHash),
      devices,
      sessions,
      devErrorLogs,
      isLocked,
      isRightPanelCollapsed,
      selectedChatId,
      selectedNetworkId,
      selectedRoomId,
      callState,
      sendMessage,
      createDirectChat,
      createGroupChat,
      createNetwork,
      acceptInvitation,
      createRoom,
      updateRoomPermissions,
      createCategory,
      renameCategory,
      deleteCategory,
      reorderCategory,
      moveCategory,
      renameGroupChat,
      updateGroupMembers,
      leaveGroupChat,
      deleteGroupChat,
      renameNetwork,
      updateNetworkIcon,
      createNetworkFolder,
      updateNetworkFolder,
      deleteNetworkFolder,
      updateNetworkMembers,
      leaveNetwork,
      deleteNetwork,
      updateCurrentUserProfile,
      removeNetworkMember,
      updateNetworkMemberRoles,
      createNetworkRole,
  
    requestRole,
    approveRoleRequest,
    rejectRoleRequest,
    updateMemberLifecycle,
    acknowledgeWelcome,
    acknowledgeRules,
    createAnnouncement,
    pinResource,
    updateAdminNote,
    timeoutNetworkMember,
    banNetworkMember,
    createOrgNode,
    updateOrgNode,
    deleteOrgNode,
    assignMemberToOrgNode,
      moveRoomToCategory,
      moveNetwork,
      reorderNetwork,
      updateNetworkProfile,
      createInvitation,
      revokeInvitation,
      deleteNetworkRole,
      trustedContacts,
      setTrustLevel,
      removeTrustedContact,
      activityPosts,
      addActivityPost,
      deleteActivityPost,
      chatAppearance,
      updateChatAppearance,
      resetChatAppearance,
      archivedNetworkIds,
      setNetworkAccessLevel,
      setNetworkArchived,
      renameRoom,
      moveRoom,
      reorderRoom,
      setRoomArchived,
      deleteRoom,
      updateRoomVisibility,
      markConversationRead,
      markConversationUnread,
      activeVoiceVideoRooms,
      joinRoomSession,
      leaveRoomSession,
      toggleMessageReaction,
      setCallState,
      startPrototypeCall,
      endPrototypeCall,
      setSelectedChatId,
      setSelectedNetworkId,
      setSelectedRoomId,
      uploadVaultFile,
      deleteVaultFile,
      updateVaultFilePermissions,
      logFileAccess,
      updatePreference,
      setDraft,
      setNotificationPreference,
      setPrivacyMode,
      markDeviceTrusted,
      renameDevice,
      revokeDevice,
      revokeOtherDevices,
      revokeSession,
      revokeOtherSessions,
      markSessionReviewed,
      setConversationExpiry,
      setDisappearDefault,
      setLockPin,
      clearLockPin,
      lockApp,
      unlockApp,
      toggleRightPanel,
      clearLocalData,
      isBackendConnected,
      logDevError,
      clearDevErrors,
    }}>
      {children}
    </MockAppStateContext.Provider>
  );
}
