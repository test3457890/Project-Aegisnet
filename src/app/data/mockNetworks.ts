/**
 * Room visibility levels for prototype access control.
 * IMPORTANT: These are UI-only prototype controls and are NOT a production security boundary.
 * Backend enforcement of allowedRoles is required for real access control.
 */
export type RoomVisibility = "public" | "private" | "restricted" | "opsec";

export interface MockRoom {
  id: string;
  name: string;
  type: "text" | "voice" | "video" | "vault" | "planning" | "announcement" | "check-in" | "mission";
  unread?: number;
  archived?: boolean;
  /** Prototype access control. UI filtering only — not a production security boundary. */
  visibility?: RoomVisibility;
  /** Role IDs (from network.roles[].id) that can view this room. Empty = everyone. Owner/admin always see all. */
  allowedRoles?: string[];
  
  // Supervised Thread properties
  isSupervisedThread?: boolean;
  protectedUserId?: string;
  initiatingUserId?: string;
  supervisorIds?: string[];
  supervisionReason?: string;
  supervisionPaused?: boolean;
}

/**
 * Prototype room access check.
 * - Owners always see all rooms.
 * - Admins always see all rooms.
 * - If allowedRoles is empty or undefined, the room is visible to all members.
 * - Otherwise the user must have at least one of the allowed role IDs.
 *
 * NOTE: This is UI-only prototype filtering. Backend enforcement is a required future step.
 */
export function canViewRoom(
  room: MockRoom,
  userId: string,
  network: { ownerId?: string; roles?: { id: string }[]; memberRoles?: Record<string, string[]> }
): boolean {
  // Owners always see all rooms
  if (network.ownerId === userId) return true;

  // Check if the user has the Admin role (by permissions or name — use role ID lookup)
  const userRoleIds = network.memberRoles?.[userId] || [];
  const userRoles = (network.roles || []).filter((r) => userRoleIds.includes(r.id));
  const isAdmin = userRoles.some((r) => (r as any).permissions?.includes("manage_rooms") || (r as any).name === "Admin");
  if (isAdmin) return true;

  // If no allowedRoles are set, anyone can view (public/private rooms with no role gate)
  if (!room.allowedRoles || room.allowedRoles.length === 0) return true;

  // User must have at least one allowed role
  return userRoleIds.some((rid) => room.allowedRoles!.includes(rid));
}

export interface MockNetwork {
  id: string;
  name: string;
  initials: string;
  color: string;
  iconUrl?: string; // Optional custom network icon (prototype only)
  ownerId?: string;
  memberIds?: string[];
  rooms: {
    category: string;
    items: MockRoom[];
  }[];
  roles?: { id: string; name: string; color: string; permissions: string[] }[];
  memberRoles?: Record<string, string[]>;
  memberProtectedCategories?: Record<string, string[]>; // Map userId to protected category IDs
  memberSupervisorRoles?: Record<string, string[]>; // Map userId to supervisor role IDs
  accessLevel?: "open" | "private" | "restricted" | "opsec" | "mission" | "archived";
  memberLifecycle?: Record<string, "pending" | "approved" | "active" | "limited" | "suspended" | "removed">;
  welcomeAcknowledged?: Record<string, boolean>;
  rulesAcknowledged?: Record<string, boolean>;
  roleRequests?: {
    id: string;
    userId: string;
    roleName: string;
    reason?: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
  }[];
  announcements?: {
    id: string;
    title: string;
    body: string;
    authorId: string;
    createdAt: string;
    expiresAt?: string;
    important?: boolean;
  }[];
  pinnedResources?: {
    id: string;
    title: string;
    url?: string;
    roomId?: string;
    vaultFileId?: string;
    addedBy: string;
    createdAt: string;
  }[];
  adminNotes?: Record<string, string>;
  orgNodes?: MockOrgTreeNode[];
}

export type OrgTreeNodeType = "network_command" | "department" | "team" | "flight" | "group" | "staff_section" | "duty_position" | "mission_position" | "member" | "vacancy" | "external_liaison" | "custom";

export interface MockOrgTreeNode {
  id: string;
  name: string;
  type: OrgTreeNodeType;
  parentId?: string;
  assignedMemberId?: string;
  dutyPosition?: string;
  roleId?: string;
  missionRole?: string;
  departmentLabel?: string;
  isVacant?: boolean;
  isActing?: boolean;
  isAssistant?: boolean;
  sortOrder?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  localOnlyLabel?: string;
}

export const mockNetworks: Record<string, MockNetwork> = {
  "net_family": {
    id: "net_family",
    name: "Family Network",
    initials: "FAM",
    color: "bg-indigo-600",
    ownerId: "user_me",
    memberIds: ["user_me", "user_mom", "user_john", "user_sarah"],
    rooms: [
      {
        category: "Important",
        items: [
          { id: "room_fam_announcements", name: "Announcements", type: "announcement" },
          { id: "room_fam_chat", name: "Family Chat", type: "text", unread: 2 }
        ]
      },
      {
        category: "Plans",
        items: [
          { id: "room_fam_weekend", name: "Weekend Plans", type: "text" },
          { id: "room_fam_roadtrip", name: "Road Trip", type: "text" }
        ]
      },
      {
        category: "Media",
        items: [
          { id: "room_fam_photos", name: "Photos", type: "text" },
          { id: "room_fam_files", name: "Files", type: "vault" }
        ]
      },
      {
        category: "Safety",
        items: [
          { id: "room_fam_checkins", name: "Check-ins", type: "check-in" },
          { id: "room_fam_trusted", name: "Trusted Contacts", type: "text" }
        ]
      }
    ]
  },
  "net_roadtrip": {
    id: "net_roadtrip",
    name: "Road Trip Network",
    initials: "RT",
    color: "bg-rose-600",
    ownerId: "user_me",
    memberIds: ["user_me", "user_sarah", "user_david", "user_keira"],
    rooms: [
      {
        category: "Rooms",
        items: [
          { id: "room_rt_planning", name: "Planning", type: "text" },
          { id: "room_rt_route", name: "Route", type: "planning" },
          { id: "room_rt_hotels", name: "Hotels", type: "text" },
          { id: "room_rt_food", name: "Food Stops", type: "text" },
          { id: "room_rt_photos", name: "Photos", type: "text" },
          { id: "room_rt_files", name: "Files", type: "vault" }
        ]
      }
    ]
  },
  "net_hiking": {
    id: "net_hiking",
    name: "Hiking Club Network",
    initials: "HC",
    color: "bg-emerald-600",
    ownerId: "user_marcus",
    memberIds: ["user_marcus", "user_me", "user_sarah", "user_david", "user_elena"],
    rooms: [
      {
        category: "Club",
        items: [
          { id: "room_hc_general", name: "General", type: "text" },
          { id: "room_hc_announcements", name: "Announcements", type: "announcement" }
        ]
      },
      {
        category: "Trips",
        items: [
          { id: "room_hc_trails", name: "Trail Plans", type: "text" },
          { id: "room_hc_gear", name: "Gear", type: "text" },
          { id: "room_hc_weather", name: "Weather", type: "text" }
        ]
      },
      {
        category: "Media",
        items: [
          { id: "room_hc_photos", name: "Photos", type: "text" },
          { id: "room_hc_files", name: "Files", type: "vault" }
        ]
      },
      {
        category: "Safety",
        items: [
          { id: "room_hc_checkins", name: "Check-ins", type: "check-in" },
          { id: "room_hc_emergency", name: "Emergency Plan", type: "text" }
        ]
      }
    ]
  },
  "net_neighborhood": {
    id: "net_neighborhood",
    name: "Neighborhood Network",
    initials: "NBH",
    color: "bg-amber-600",
    ownerId: "user_john",
    memberIds: ["user_john", "user_me", "user_mom", "user_elena"],
    rooms: [
      {
        category: "Rooms",
        items: [
          { id: "room_nbh_general", name: "General Chat", type: "text" }
        ]
      }
    ]
  },
  "net_school": {
    id: "net_school",
    name: "School Group Network",
    initials: "SCH",
    color: "bg-blue-500",
    ownerId: "user_keira",
    memberIds: ["user_keira", "user_me", "user_mom"],
    rooms: [
      {
        category: "Rooms",
        items: [
          { id: "room_school_announcements", name: "Announcements", type: "announcement" }
        ]
      }
    ]
  },
  "net_cyber": {
    id: "net_cyber",
    name: "Cyber Team Network",
    initials: "CYB",
    color: "bg-purple-600",
    ownerId: "user_me",
    memberIds: ["user_me", "user_david", "user_elena"],
    roles: [
      { id: "role_cyber_owner", name: "Owner", color: "bg-danger-readable", permissions: ["*"] },
      { id: "role_cyber_incident_lead", name: "Incident Lead", color: "bg-rose-600", permissions: ["manage_roles", "manage_rooms", "manage_members", "send_messages", "view_audit", "join_voice", "start_calls"] },
      { id: "role_cyber_analyst", name: "Analyst", color: "bg-slate-600", permissions: ["send_messages", "view_audit", "join_voice", "start_calls"] }
    ],
    memberRoles: {
      "user_me": ["role_cyber_incident_lead"],
      "user_david": ["role_cyber_analyst"],
      "user_elena": ["role_cyber_analyst"]
    },
    rooms: [
      {
        category: "Operations",
        items: [
          { id: "room_cyber_general", name: "General", type: "text" },
          { id: "room_cyber_incident", name: "Incident Room", type: "mission", visibility: "restricted" as const, allowedRoles: ["role_cyber_incident_lead"] }
        ]
      },
      {
        category: "Planning",
        items: [
          { id: "room_cyber_planning", name: "Planning Room", type: "planning", visibility: "opsec" as const, allowedRoles: ["role_cyber_incident_lead"] }
        ]
      },
      {
        category: "Secure",
        items: [
          { id: "room_cyber_evidence", name: "Evidence Vault", type: "vault", visibility: "restricted" as const, allowedRoles: ["role_cyber_incident_lead"] },
          { id: "room_cyber_audit", name: "Audit Metadata", type: "text" }
        ]
      }
    ]
  },
  "net_sar": {
    id: "net_sar",
    name: "SAR Training Network",
    initials: "SAR",
    color: "bg-slate-700",
    ownerId: "user_marcus",
    memberIds: ["user_marcus", "user_me", "user_john", "user_david"],
    roles: [
      { id: "role_sar_owner", name: "Owner", color: "bg-danger-readable", permissions: ["*"] },
      { id: "role_sar_mission_lead", name: "Mission Lead", color: "bg-amber-600", permissions: ["manage_rooms", "manage_members", "send_messages", "manage_mission", "join_voice", "start_calls"] },
      { id: "role_sar_safety", name: "Safety Officer", color: "bg-emerald-600", permissions: ["send_messages", "manage_safety", "join_voice", "start_calls"] },
      { id: "role_sar_operator", name: "Operator", color: "bg-slate-600", permissions: ["send_messages", "join_voice", "start_calls"] }
    ],
    memberRoles: {
      "user_marcus": ["role_sar_mission_lead"],
      "user_me": ["role_sar_operator"],
      "user_john": ["role_sar_safety"],
      "user_david": ["role_sar_operator"]
    },
    rooms: [
      {
        category: "Operations",
        items: [
          { id: "room_sar_briefing", name: "Briefing", type: "text" },
          { id: "room_sar_radio", name: "Radio Practice", type: "text" },
          { id: "room_sar_training", name: "Training Plan", type: "text" }
        ]
      },
      {
        category: "Command",
        items: [
          { id: "room_sar_mission", name: "Mission Room", type: "mission", visibility: "restricted" as const, allowedRoles: ["role_sar_mission_lead", "role_sar_operator"] },
          { id: "room_sar_planning", name: "Planning Room", type: "planning", visibility: "opsec" as const, allowedRoles: ["role_sar_mission_lead"] }
        ]
      },
      {
        category: "Live Spaces",
        items: [
          { id: "room_sar_voice", name: "Voice Net", type: "voice" },
          { id: "room_sar_video", name: "Video Briefing", type: "video" }
        ]
      },
      {
        category: "Secure",
        items: [
          { id: "room_sar_vault", name: "File Vault", type: "vault", visibility: "restricted" as const, allowedRoles: ["role_sar_mission_lead", "role_sar_safety"] },
          { id: "room_sar_roster", name: "Roster", type: "text" },
          { id: "room_sar_checkins", name: "Check-ins", type: "check-in" }
        ]
      }
    ]
  }
};
