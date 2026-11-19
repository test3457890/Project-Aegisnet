import { ReactNode, useCallback, useEffect, useState } from "react";
import { currentUser } from "../data/mockUsers";
import {
  AdminStateContext,
  AuditEvent,
  buildAuditEvent,
  createDefaultPermissionMatrix,
  createInitialAuditEvents,
  createInitialTickets,
  DEFAULT_POLICIES,
  OrgInfo,
  PermissionMatrix,
  PolicySettings,
  RoleId,
  ROLES,
  SupportTicket,
  makeAdminId,
} from "./adminState";

import { apiClient } from "../api/client";

const DEFAULT_ORG: OrgInfo = { name: "AegisNet Prototype Org", deploymentType: "local-prototype" };
const MAX_AUDIT_EVENTS = 500;

function load<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The prototype keeps working in memory if storage is unavailable.
  }
}

function policyLogAction(key: keyof PolicySettings): string {
  if (key === "defaultNetworkPrivacy" || key === "screenshotPolicy") return "privacy.mode_changed";
  if (key === "vaultDefaultEncrypted" || key === "vaultAllowDownload") return "file.policy_changed";
  if (key === "retentionDays") return "privacy.disappearing_changed";
  return "permission.changed";
}

export function AdminStateProvider({ children }: { children: ReactNode }) {
  const [org, setOrgState] = useState<OrgInfo>(() => load("aegisnet_org", DEFAULT_ORG));
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => {
    const stored = load<AuditEvent[] | null>("aegisnet_audit", null);
    return stored && stored.length ? stored : createInitialAuditEvents();
  });
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    const stored = load<SupportTicket[] | null>("aegisnet_tickets", null);
    return stored && stored.length ? stored : createInitialTickets();
  });
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>(() => {
    const stored = load<PermissionMatrix | null>("aegisnet_permissions", null);
    return stored || createDefaultPermissionMatrix();
  });
  const [policies, setPolicies] = useState<PolicySettings>(() => ({ ...DEFAULT_POLICIES, ...load("aegisnet_policies", {}) }));

  useEffect(() => persist("aegisnet_org", org), [org]);
  useEffect(() => persist("aegisnet_audit", auditEvents), [auditEvents]);
  useEffect(() => persist("aegisnet_tickets", tickets), [tickets]);
  useEffect(() => persist("aegisnet_permissions", permissionMatrix), [permissionMatrix]);
  useEffect(() => persist("aegisnet_policies", policies), [policies]);

  const policiesLoggingEnabled = policies.loggingEnabled;

  // Best-effort hydration from the PLANNED admin routes. They do not exist yet, so these calls fail
  // silently and the local prototype data is used. Only valid arrays are applied.
  useEffect(() => {
    apiClient.get("/admin/audit").then((res) => {
      if (Array.isArray(res) && res.length) setAuditEvents(res as AuditEvent[]);
    }).catch(() => {});
    apiClient.get("/admin/tickets").then((res) => {
      if (Array.isArray(res) && res.length) setTickets(res as SupportTicket[]);
    }).catch(() => {});
  }, []);

  const logAudit = useCallback((action: string, details: { actorId?: string; target?: string; networkId?: string; summary?: string } = {}) => {
    if (!policiesLoggingEnabled) return;
    const event = buildAuditEvent(action, { actorId: details.actorId || currentUser.id, ...details });
    setAuditEvents((previous) => [event, ...previous].slice(0, MAX_AUDIT_EVENTS));
    // Metadata-only sync to the planned audit route. Never includes message bodies, files, or secrets.
    apiClient.post("/admin/audit", {
      id: event.id,
      at: event.at,
      action: event.action,
      category: event.category,
      severity: event.severity,
      actorId: event.actorId,
      target: event.target || null,
      networkId: event.networkId || null,
      summary: event.summary,
    }).catch(() => {});
  }, [policiesLoggingEnabled]);

  const setOrg = useCallback((next: Partial<OrgInfo>) => {
    setOrgState((previous) => ({ ...previous, ...next }));
  }, []);

  const createTicket = useCallback((input: Omit<SupportTicket, "id" | "createdAt" | "status">) => {
    const ticket: SupportTicket = { ...input, id: makeAdminId("ticket"), createdAt: Date.now(), status: "saved-local" };
    setTickets((previous) => [ticket, ...previous]);
    logAudit("support.ticket_created", { target: ticket.summary, summary: "Support ticket created (saved locally)" });
    // Best-effort sync to the planned support route. Tickets remain "saved-local"; nothing here claims
    // external submission to Stuff Studios LLC until a real endpoint exists.
    apiClient.post("/admin/tickets", {
      id: ticket.id,
      organizationName: ticket.organizationName,
      category: ticket.category,
      severity: ticket.severity,
      summary: ticket.summary,
      description: ticket.description,
      deploymentType: ticket.deploymentType,
    }).catch(() => {});
    return ticket;
  }, [logAudit]);

  const togglePermission = useCallback((roleId: RoleId, key: string) => {
    let nowEnabled = false;
    setPermissionMatrix((previous) => {
      const current = previous[roleId] || [];
      const has = current.includes(key);
      nowEnabled = !has;
      return { ...previous, [roleId]: has ? current.filter((k) => k !== key) : [...current, key] };
    });
    const roleLabel = ROLES.find((role) => role.id === roleId)?.label || roleId;
    logAudit("permission.changed", {
      target: `${roleLabel} → ${key}`,
      summary: `Permission ${nowEnabled ? "granted" : "revoked"} (local prototype)`,
    });
  }, [logAudit]);

  const resetPermissions = useCallback(() => {
    setPermissionMatrix(createDefaultPermissionMatrix());
    logAudit("permission.changed", { target: "All roles", summary: "Permissions reset to defaults" });
  }, [logAudit]);

  const setPolicy = useCallback(<K extends keyof PolicySettings>(key: K, value: PolicySettings[K]) => {
    setPolicies((previous) => ({ ...previous, [key]: value }));
    // Logging-policy changes are recorded before the toggle may disable logging.
    logAudit(policyLogAction(key), { target: String(key), summary: `Policy updated: ${String(key)} = ${String(value)}` });
  }, [logAudit]);

  return (
    <AdminStateContext.Provider
      value={{
        org,
        auditEvents,
        tickets,
        permissionMatrix,
        policies,
        setOrg,
        logAudit,
        createTicket,
        togglePermission,
        resetPermissions,
        setPolicy,
      }}
    >
      {children}
    </AdminStateContext.Provider>
  );
}
