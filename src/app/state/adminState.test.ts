import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSION_KEYS,
  auditEventsToCsv,
  auditEventsToJson,
  buildAuditEvent,
  buildDiagnosticsBundle,
  createDefaultPermissionMatrix,
  createInitialAuditEvents,
  createInitialTickets,
  filterAuditEvents,
  roleHasPermission,
} from "./adminState";

const ALLOWED_EVENT_KEYS = ["id", "at", "actorId", "action", "category", "severity", "target", "networkId", "summary"];

describe("audit events", () => {
  it("resolves category and severity from the action catalog", () => {
    const event = buildAuditEvent("network.created", { actorId: "user_me", target: "SAR", networkId: "net_sar" });
    expect(event.category).toBe("network");
    expect(event.severity).toBe("notice");
    expect(event.actorId).toBe("user_me");
  });

  it("defaults the actor to system", () => {
    expect(buildAuditEvent("system.ws_disconnected").actorId).toBe("system");
  });

  it("never carries message bodies, content, or secret fields", () => {
    const event = buildAuditEvent("file.uploaded", { target: "plan.pdf", summary: "File uploaded" });
    expect(Object.keys(event).every((key) => ALLOWED_EVENT_KEYS.includes(key))).toBe(true);
    const serialized = JSON.stringify(event).toLowerCase();
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("\"body\"");
  });

  it("filters by category, severity, actor, and search", () => {
    const events = [
      buildAuditEvent("network.created", { actorId: "user_me", summary: "Network created" }, 100, "a"),
      buildAuditEvent("system.storage_warning", { actorId: "system", summary: "Storage warning" }, 90, "b"),
      buildAuditEvent("file.uploaded", { actorId: "user_sarah", summary: "File uploaded" }, 80, "c"),
    ];
    expect(filterAuditEvents(events, { category: "network" }).map((e) => e.id)).toEqual(["a"]);
    expect(filterAuditEvents(events, { severity: "warning" }).map((e) => e.id)).toEqual(["b"]);
    expect(filterAuditEvents(events, { actorId: "user_sarah" }).map((e) => e.id)).toEqual(["c"]);
    expect(filterAuditEvents(events, { search: "storage" }).map((e) => e.id)).toEqual(["b"]);
    expect(filterAuditEvents(events, { category: "all", severity: "all" })).toHaveLength(3);
  });

  it("exports CSV with a header and JSON", () => {
    const events = [buildAuditEvent("room.created", { summary: "Room created" }, 0, "x")];
    const csv = auditEventsToCsv(events);
    expect(csv.split("\n")[0]).toContain("id,at,actorId,action");
    expect(csv).toContain("room.created");
    expect(JSON.parse(auditEventsToJson(events))).toHaveLength(1);
  });
});

describe("roles & permissions", () => {
  it("gives the org owner every permission and read-only a view-only subset", () => {
    const matrix = createDefaultPermissionMatrix();
    expect(matrix.org_owner).toHaveLength(ALL_PERMISSION_KEYS.length);
    expect(roleHasPermission(matrix, "org_owner", "network.delete")).toBe(true);
    expect(roleHasPermission(matrix, "read_only", "network.delete")).toBe(false);
    expect(matrix.read_only.every((key) => key.includes("view"))).toBe(true);
  });

  it("gives members send permissions but not network deletion", () => {
    const matrix = createDefaultPermissionMatrix();
    expect(roleHasPermission(matrix, "member", "room.send_messages")).toBe(true);
    expect(roleHasPermission(matrix, "member", "network.delete")).toBe(false);
  });
});

describe("diagnostics bundle", () => {
  it("is sanitized: counts and statuses only, with an explicit note", () => {
    const bundle = buildDiagnosticsBundle({
      org: { name: "Org", deploymentType: "on-premise" },
      backendConnected: false,
      counts: { networks: 2, rooms: 5, users: 3, vaultFiles: 1, tickets: 0, auditEvents: 10 },
      recentWarnings: [{ at: 1, action: "system.storage_warning", summary: "Storage warning" }],
    });
    expect(bundle.kind).toBe("aegisnet-sanitized-diagnostics");
    expect(bundle.note.toLowerCase()).toContain("no message content");
    expect(bundle.services.backendApi).toBe("local-fallback");
    // No secret-bearing fields anywhere in the bundle (the disclaimer note legitimately says "secrets").
    const serialized = JSON.stringify(bundle).toLowerCase();
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("apikey");
    expect(serialized).not.toContain('"token"');
    expect(serialized).not.toContain('"secret"');
  });
});

describe("seed data", () => {
  it("seeds representative audit events and a local ticket", () => {
    expect(createInitialAuditEvents().length).toBeGreaterThan(5);
    const tickets = createInitialTickets();
    expect(tickets[0].status).toBe("saved-local");
  });
});
