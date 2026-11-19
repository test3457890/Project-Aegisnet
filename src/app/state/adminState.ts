import { createContext, useContext } from "react";

/**
 * Admin Center state model (local prototype).
 *
 * HONESTY BOUNDARY:
 * - This is a LOCAL prototype admin layer persisted in localStorage. There is no production
 *   authentication, no production RBAC enforcement, and no real support endpoint.
 * - Audit logs are METADATA ONLY. They must never contain private message bodies, decrypted file
 *   contents, passwords, tokens, API keys, or encryption keys.
 * - Support tickets are saved locally and are NOT transmitted to Stuff Studios LLC in this prototype.
 * See docs/architecture/ADMIN_CENTER_PLAN.md, AUDIT_LOGGING_PLAN.md, PERMISSIONS_AND_RBAC_PLAN.md,
 * PHYSICAL_SERVER_OPERATIONS_PLAN.md, and SUPPORT_TICKET_WORKFLOW.md.
 */

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

export type AuditCategory =
  | "network" | "room" | "category" | "member" | "permission" | "file"
  | "privacy" | "call" | "device" | "support" | "system";

export type AuditSeverity = "info" | "notice" | "warning" | "critical";

export interface AuditEvent {
  id: string;
  at: number;
  actorId: string;
  /** Stable machine action key (see AUDIT_ACTIONS). */
  action: string;
  category: AuditCategory;
  severity: AuditSeverity;
  /** Human label of the thing acted on (a name/id, never content). */
  target?: string;
  networkId?: string;
  /** Metadata-only summary. NEVER include message bodies, file contents, or secrets. */
  summary: string;
}

interface AuditActionMeta {
  category: AuditCategory;
  severity: AuditSeverity;
  label: string;
}

/** Catalog of every supported audit action (Discord-style, AegisNet wording). */
export const AUDIT_ACTIONS: Record<string, AuditActionMeta> = {
  "network.created": { category: "network", severity: "notice", label: "Network created" },
  "network.updated": { category: "network", severity: "info", label: "Network updated" },
  "network.reordered": { category: "network", severity: "info", label: "Network reordered" },
  "network.deleted": { category: "network", severity: "warning", label: "Network deleted (mock)" },
  "room.created": { category: "room", severity: "info", label: "Room created" },
  "room.updated": { category: "room", severity: "info", label: "Room updated" },
  "room.deleted": { category: "room", severity: "warning", label: "Room deleted (mock)" },
  "category.created": { category: "category", severity: "info", label: "Category created" },
  "category.updated": { category: "category", severity: "info", label: "Category updated" },
  "category.reordered": { category: "category", severity: "info", label: "Category reordered" },
  "member.invited": { category: "member", severity: "info", label: "Member invited" },
  "member.joined": { category: "member", severity: "info", label: "Member joined" },
  "member.removed": { category: "member", severity: "warning", label: "Member removed" },
  "member.role_changed": { category: "member", severity: "notice", label: "Member role changed" },
  "permission.changed": { category: "permission", severity: "notice", label: "Permission changed" },
  "file.uploaded": { category: "file", severity: "info", label: "File uploaded" },
  "file.deleted": { category: "file", severity: "warning", label: "File deleted" },
  "file.policy_changed": { category: "file", severity: "notice", label: "File access policy changed" },
  "file.download_restricted": { category: "file", severity: "notice", label: "File download restricted" },
  "privacy.mode_changed": { category: "privacy", severity: "notice", label: "Privacy mode changed" },
  "privacy.shield_enabled": { category: "privacy", severity: "notice", label: "Shield Mode enabled" },
  "privacy.lockdown_enabled": { category: "privacy", severity: "warning", label: "Lockdown Mode enabled" },
  "privacy.disappearing_changed": { category: "privacy", severity: "notice", label: "Disappearing message policy changed" },
  "call.started": { category: "call", severity: "info", label: "Call started" },
  "call.ended": { category: "call", severity: "info", label: "Call ended" },
  "device.permission_changed": { category: "device", severity: "info", label: "Device permission changed" },
  "support.ticket_created": { category: "support", severity: "notice", label: "Support ticket created" },
  "support.bundle_exported": { category: "support", severity: "notice", label: "Support bundle exported" },
  "system.backend_health_warning": { category: "system", severity: "warning", label: "Backend health warning" },
  "system.storage_warning": { category: "system", severity: "warning", label: "Storage warning" },
  "system.failed_upload": { category: "system", severity: "warning", label: "Failed upload" },
  "system.failed_message": { category: "system", severity: "warning", label: "Failed message send" },
  "system.ws_disconnected": { category: "system", severity: "warning", label: "WebSocket disconnected" },
  "system.ws_reconnected": { category: "system", severity: "info", label: "WebSocket reconnected" },
};

export const AUDIT_CATEGORIES: AuditCategory[] = [
  "network", "room", "category", "member", "permission", "file", "privacy", "call", "device", "support", "system",
];

export const AUDIT_SEVERITIES: AuditSeverity[] = ["info", "notice", "warning", "critical"];

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------

export type RoleId =
  | "org_owner" | "org_admin" | "net_owner" | "net_admin" | "room_mod"
  | "vault_manager" | "security_auditor" | "support_operator" | "server_operator"
  | "compliance_officer" | "member" | "guest" | "read_only";

export interface RoleMeta { id: RoleId; label: string; description: string; }

export const ROLES: RoleMeta[] = [
  { id: "org_owner", label: "Organization Owner", description: "Full control of the organization and all Networks." },
  { id: "org_admin", label: "Organization Admin", description: "Manage Networks, members, roles, and policies." },
  { id: "net_owner", label: "Network Owner", description: "Owns a Network and its rooms, members, and settings." },
  { id: "net_admin", label: "Network Admin", description: "Manage a Network's rooms, members, and settings." },
  { id: "room_mod", label: "Room Moderator", description: "Moderate rooms and manage room privacy." },
  { id: "vault_manager", label: "File Vault Manager", description: "Manage File Vault files, policies, and metadata." },
  { id: "security_auditor", label: "Security Auditor", description: "Read-only access to audit logs and health." },
  { id: "support_operator", label: "Support Operator", description: "Create tickets and export support bundles." },
  { id: "server_operator", label: "Physical Server Operator", description: "View server health and operate on-premise deployments." },
  { id: "compliance_officer", label: "Compliance Officer", description: "Review policies, retention, and audit exports." },
  { id: "member", label: "Member", description: "Standard participant in Networks and rooms." },
  { id: "guest", label: "Guest", description: "Limited, temporary participant." },
  { id: "read_only", label: "Read Only", description: "Can view but not change anything." },
];

export interface PermissionGroup { group: string; permissions: { key: string; label: string }[]; }

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: "Network",
    permissions: [
      { key: "network.create", label: "Create Network" },
      { key: "network.edit", label: "Edit Network" },
      { key: "network.delete", label: "Delete Network (mock)" },
      { key: "network.reorder", label: "Reorder Networks" },
      { key: "network.settings", label: "Manage Network settings" },
      { key: "network.profile", label: "Manage Network profile" },
      { key: "network.invite", label: "Invite members" },
      { key: "network.remove_member", label: "Remove members" },
      { key: "network.assign_roles", label: "Assign roles" },
    ],
  },
  {
    group: "Room",
    permissions: [
      { key: "room.create", label: "Create rooms" },
      { key: "room.edit", label: "Edit rooms" },
      { key: "room.delete", label: "Delete rooms (mock)" },
      { key: "room.categories", label: "Manage categories" },
      { key: "room.send_messages", label: "Send messages" },
      { key: "room.send_media", label: "Send media" },
      { key: "room.send_files", label: "Send files" },
      { key: "room.voice", label: "Start voice calls" },
      { key: "room.video", label: "Start video calls" },
      { key: "room.privacy", label: "Manage room privacy mode" },
    ],
  },
  {
    group: "File Vault",
    permissions: [
      { key: "vault.upload", label: "Upload files" },
      { key: "vault.view", label: "View files" },
      { key: "vault.download", label: "Download files" },
      { key: "vault.delete", label: "Delete files" },
      { key: "vault.access_policy", label: "Change access policy" },
      { key: "vault.expiration", label: "Change expiration policy" },
      { key: "vault.audit", label: "View Vault audit events" },
      { key: "vault.export_metadata", label: "Export file metadata" },
    ],
  },
  {
    group: "Privacy & Safety",
    permissions: [
      { key: "privacy.shield", label: "Enable Shield Mode" },
      { key: "privacy.lockdown", label: "Enable Lockdown Mode" },
      { key: "privacy.disappearing", label: "Set disappearing message defaults" },
      { key: "privacy.screenshot", label: "Manage screenshot protection policy" },
      { key: "privacy.download_restrict", label: "Manage download restriction policy" },
    ],
  },
  {
    group: "Admin & Logs",
    permissions: [
      { key: "admin.view_audit", label: "View audit logs" },
      { key: "admin.export_audit", label: "Export audit logs" },
      { key: "admin.view_health", label: "View system health" },
      { key: "admin.view_diagnostics", label: "View diagnostics" },
      { key: "admin.create_ticket", label: "Create support ticket" },
      { key: "admin.export_bundle", label: "Export support bundle" },
      { key: "admin.server_settings", label: "Manage physical server settings" },
    ],
  },
  {
    group: "Physical Server Operator",
    permissions: [
      { key: "server.view_health", label: "View server health" },
      { key: "server.view_backend", label: "View backend status" },
      { key: "server.view_database", label: "View database status" },
      { key: "server.view_storage", label: "View storage status" },
      { key: "server.view_logs", label: "View sanitized logs" },
      { key: "server.export_diagnostics", label: "Export diagnostics" },
      { key: "server.restart", label: "Restart service (planned)" },
      { key: "server.backups", label: "Configure backups (planned)" },
      { key: "server.tls", label: "Configure TLS (planned)" },
      { key: "server.update_channel", label: "Configure update channel (planned)" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

export type PermissionMatrix = Record<RoleId, string[]>;

function viewOnlyKeys(): string[] {
  return ALL_PERMISSION_KEYS.filter((k) => k.includes(".view") || k.endsWith(".view_audit") || k === "vault.view");
}

/** Sensible default role→permission matrix (local prototype defaults). */
export function createDefaultPermissionMatrix(): PermissionMatrix {
  const all = [...ALL_PERMISSION_KEYS];
  const memberKeys = [
    "room.send_messages", "room.send_media", "room.send_files", "room.voice", "room.video",
    "vault.upload", "vault.view", "vault.download", "privacy.shield", "privacy.disappearing", "admin.create_ticket",
  ];
  const serverKeys = PERMISSION_GROUPS.find((g) => g.group === "Physical Server Operator")!.permissions.map((p) => p.key);
  const auditKeys = ["admin.view_audit", "admin.export_audit", "admin.view_health", "admin.view_diagnostics", "vault.audit"];
  return {
    org_owner: all,
    org_admin: all.filter((k) => k !== "network.delete"),
    net_owner: all.filter((k) => k.startsWith("network.") || k.startsWith("room.") || k.startsWith("vault.") || k.startsWith("privacy.") || k === "admin.view_audit" || k === "admin.create_ticket"),
    net_admin: all.filter((k) => (k.startsWith("network.") && k !== "network.delete") || k.startsWith("room.") || k.startsWith("vault.") || k.startsWith("privacy.")),
    room_mod: ["room.edit", "room.categories", "room.send_messages", "room.send_media", "room.send_files", "room.voice", "room.video", "room.privacy"],
    vault_manager: PERMISSION_GROUPS.find((g) => g.group === "File Vault")!.permissions.map((p) => p.key),
    security_auditor: auditKeys,
    support_operator: ["admin.create_ticket", "admin.export_bundle", "admin.view_diagnostics", "admin.view_health"],
    server_operator: serverKeys.concat(["admin.view_health", "admin.view_diagnostics", "admin.server_settings"]),
    compliance_officer: auditKeys.concat(["vault.export_metadata", "vault.audit"]),
    member: memberKeys,
    guest: ["room.send_messages", "vault.view"],
    read_only: viewOnlyKeys(),
  };
}

export function roleHasPermission(matrix: PermissionMatrix, roleId: RoleId, key: string): boolean {
  return (matrix[roleId] || []).includes(key);
}

// ---------------------------------------------------------------------------
// Support tickets
// ---------------------------------------------------------------------------

export type DeploymentType = "cloud" | "local-prototype" | "on-premise";

export const TICKET_CATEGORIES = [
  "login/account", "permissions", "message sending", "file upload", "File Vault", "video call",
  "microphone/camera", "WebSocket/realtime", "database", "storage", "physical server",
  "launcher/startup", "privacy mode", "general bug", "feature request",
] as const;
export type TicketCategory = typeof TICKET_CATEGORIES[number];

export type TicketSeverity = "Low" | "Medium" | "High" | "Critical";

export interface SupportTicket {
  id: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  deploymentType: DeploymentType;
  affectedScope?: string;
  category: TicketCategory;
  severity: TicketSeverity;
  summary: string;
  description: string;
  steps?: string;
  includeLogs: boolean;
  includeDiagnostics: boolean;
  createdAt: number;
  /** Always local in this prototype — never claims external submission. */
  status: "saved-local";
}

// ---------------------------------------------------------------------------
// Policies & org info
// ---------------------------------------------------------------------------

export interface PolicySettings {
  defaultNetworkPrivacy: "normal" | "shield" | "lockdown";
  vaultDefaultEncrypted: boolean;
  vaultAllowDownload: boolean;
  screenshotPolicy: "allow" | "deter";
  guestPolicy: "off" | "read-only" | "limited";
  retentionDays: number;
  loggingEnabled: boolean;
  supportDataSharing: "ask" | "never";
}

export const DEFAULT_POLICIES: PolicySettings = {
  defaultNetworkPrivacy: "normal",
  vaultDefaultEncrypted: true,
  vaultAllowDownload: true,
  screenshotPolicy: "deter",
  guestPolicy: "read-only",
  retentionDays: 0,
  loggingEnabled: true,
  supportDataSharing: "ask",
};

export interface OrgInfo {
  name: string;
  deploymentType: DeploymentType;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface AdminState {
  org: OrgInfo;
  auditEvents: AuditEvent[];
  tickets: SupportTicket[];
  permissionMatrix: PermissionMatrix;
  policies: PolicySettings;
  setOrg: (org: Partial<OrgInfo>) => void;
  logAudit: (action: string, details?: { actorId?: string; target?: string; networkId?: string; summary?: string }) => void;
  createTicket: (ticket: Omit<SupportTicket, "id" | "createdAt" | "status">) => SupportTicket;
  togglePermission: (roleId: RoleId, key: string) => void;
  resetPermissions: () => void;
  setPolicy: <K extends keyof PolicySettings>(key: K, value: PolicySettings[K]) => void;
}

export const AdminStateContext = createContext<AdminState | undefined>(undefined);

export function useAdminState() {
  const ctx = useContext(AdminStateContext);
  if (!ctx) throw new Error("useAdminState must be used within AdminStateProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function makeAdminId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function buildAuditEvent(
  action: string,
  details: { actorId?: string; target?: string; networkId?: string; summary?: string } = {},
  at = Date.now(),
  id = makeAdminId("audit"),
): AuditEvent {
  const meta = AUDIT_ACTIONS[action] || { category: "system" as AuditCategory, severity: "info" as AuditSeverity, label: action };
  return {
    id,
    at,
    actorId: details.actorId || "system",
    action,
    category: meta.category,
    severity: meta.severity,
    target: details.target,
    networkId: details.networkId,
    summary: details.summary || meta.label,
  };
}

export interface AuditFilter {
  category?: AuditCategory | "all";
  severity?: AuditSeverity | "all";
  actorId?: string | "all";
  networkId?: string | "all";
  search?: string;
  since?: number;
}

export function filterAuditEvents(events: AuditEvent[], filter: AuditFilter): AuditEvent[] {
  const search = (filter.search || "").trim().toLowerCase();
  return events.filter((event) => {
    if (filter.category && filter.category !== "all" && event.category !== filter.category) return false;
    if (filter.severity && filter.severity !== "all" && event.severity !== filter.severity) return false;
    if (filter.actorId && filter.actorId !== "all" && event.actorId !== filter.actorId) return false;
    if (filter.networkId && filter.networkId !== "all" && event.networkId !== filter.networkId) return false;
    if (filter.since && event.at < filter.since) return false;
    if (search) {
      const haystack = `${event.action} ${event.summary} ${event.target || ""} ${event.actorId}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

const CSV_FIELDS: (keyof AuditEvent)[] = ["id", "at", "actorId", "action", "category", "severity", "target", "networkId", "summary"];

function csvCell(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function auditEventsToCsv(events: AuditEvent[]): string {
  const header = CSV_FIELDS.join(",");
  const rows = events.map((event) => CSV_FIELDS.map((field) => csvCell(
    field === "at" ? new Date(event.at).toISOString() : event[field],
  )).join(","));
  return [header, ...rows].join("\n");
}

export function auditEventsToJson(events: AuditEvent[]): string {
  return JSON.stringify(events, null, 2);
}

/**
 * Build a SANITIZED diagnostics bundle. By construction it contains only counts, statuses, and
 * environment metadata — never message bodies, file contents, secrets, tokens, or keys.
 */
export interface DiagnosticsInput {
  org: OrgInfo;
  backendConnected: boolean;
  counts: { networks: number; rooms: number; users: number; vaultFiles: number; tickets: number; auditEvents: number };
  storage?: { usage?: number; quota?: number };
  recentWarnings: { at: number; action: string; summary: string }[];
}

export function buildDiagnosticsBundle(input: DiagnosticsInput) {
  return {
    generatedAt: new Date().toISOString(),
    kind: "aegisnet-sanitized-diagnostics",
    note: "Sanitized prototype diagnostics. Contains no message content, file content, or secrets.",
    deploymentType: input.org.deploymentType,
    organization: input.org.name,
    environment: {
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      online: typeof navigator !== "undefined" ? navigator.onLine : true,
    },
    services: {
      frontend: "ok",
      backendApi: input.backendConnected ? "connected" : "local-fallback",
    },
    counts: input.counts,
    storage: input.storage || { usage: undefined, quota: undefined },
    recentWarnings: input.recentWarnings.slice(0, 20),
  };
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

export function createInitialAuditEvents(): AuditEvent[] {
  const now = Date.now();
  const min = 60 * 1000;
  const seed: { action: string; actorId: string; target?: string; networkId?: string; summary: string; ago: number }[] = [
    { action: "network.created", actorId: "user_me", target: "SAR Training Network", networkId: "net_sar", summary: "Network created", ago: 240 },
    { action: "member.invited", actorId: "user_me", target: "Sarah Connor", networkId: "net_sar", summary: "Invite generated (local code)", ago: 220 },
    { action: "member.joined", actorId: "user_sarah", target: "Sarah Connor", networkId: "net_sar", summary: "Member joined", ago: 210 },
    { action: "member.role_changed", actorId: "user_me", target: "Sarah Connor → Network Admin", networkId: "net_sar", summary: "Role changed", ago: 200 },
    { action: "room.created", actorId: "user_me", target: "Briefing", networkId: "net_sar", summary: "Room created", ago: 180 },
    { action: "file.uploaded", actorId: "user_me", target: "trail-map.pdf", networkId: "net_sar", summary: "File uploaded (encrypted at rest)", ago: 150 },
    { action: "privacy.shield_enabled", actorId: "user_me", target: "Shield Mode", summary: "Shield Mode enabled", ago: 120 },
    { action: "call.started", actorId: "user_me", target: "Voice Net", networkId: "net_sar", summary: "Voice call started", ago: 95 },
    { action: "call.ended", actorId: "user_me", target: "Voice Net", networkId: "net_sar", summary: "Voice call ended", ago: 80 },
    { action: "system.ws_disconnected", actorId: "system", summary: "Realtime link dropped", ago: 60 },
    { action: "system.ws_reconnected", actorId: "system", summary: "Realtime link restored", ago: 59 },
    { action: "system.storage_warning", actorId: "system", summary: "Local storage above 70% of quota", ago: 40 },
    { action: "file.download_restricted", actorId: "user_me", target: "incident-report.docx", summary: "Downloads restricted under Lockdown", ago: 30 },
    { action: "permission.changed", actorId: "user_me", target: "Room Moderator → Manage room privacy mode", summary: "Permission updated", ago: 15 },
    { action: "support.ticket_created", actorId: "user_me", target: "Upload fails on large PDF", summary: "Support ticket created (saved locally)", ago: 8 },
  ];
  return seed.map((entry, index) => buildAuditEvent(
    entry.action,
    { actorId: entry.actorId, target: entry.target, networkId: entry.networkId, summary: entry.summary },
    now - entry.ago * min,
    `audit_seed_${index + 1}`,
  ));
}

export function createInitialTickets(): SupportTicket[] {
  return [
    {
      id: "ticket_seed_1",
      organizationName: "AegisNet Prototype Org",
      contactName: "Alex",
      contactEmail: "ops@example.org",
      deploymentType: "local-prototype",
      affectedScope: "File Vault",
      category: "file upload",
      severity: "Medium",
      summary: "Upload fails on large PDF",
      description: "Uploading a 40MB PDF shows an error. Smaller files work.",
      steps: "1. Open File Vault. 2. Upload large PDF. 3. See error.",
      includeLogs: true,
      includeDiagnostics: false,
      createdAt: Date.now() - 8 * 60 * 1000,
      status: "saved-local",
    },
  ];
}
