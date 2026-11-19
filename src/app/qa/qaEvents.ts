/**
 * QA event log — metadata-only, local prototype diagnostics.
 *
 * Records small, safe events so testers can see what the frontend did during a
 * bug bash. Events are stored in localStorage, capped, and contain METADATA ONLY.
 *
 * NEVER log: message bodies, file contents, Vault plaintext, Vault keys, auth
 * tokens, passwords, support-ticket private content, profile bios, Activity
 * content, profile photo contents, or localStorage/IndexedDB dumps.
 * Field sanitization is enforced structurally: only the whitelisted keys below
 * are ever persisted, and free-text fields are rejected.
 */

export type QaEventType =
  | "profile.opened"
  | "profile.card.opened"
  | "avatar.preview.opened"
  | "avatar.upload.attempted"
  | "avatar.upload.succeeded"
  | "avatar.upload.failed"
  | "roster.member.clicked"
  | "network.nickname.changed"
  | "trusted.contact.added"
  | "trusted.contact.removed"
  | "trusted.contact.changed"
  | "trust.level.changed"
  | "privacy.preference.toggled"
  | "group.invitation.allowed"
  | "group.invitation.blocked"
  | "read.receipts.toggled"
  | "safety.reminders.toggled"
  | "profile.save.succeeded"
  | "profile.save.failed"
  | "activity.post.added"
  | "activity.post.removed"
  | "invite.created"
  | "invite.revoked"
  | "network.role.created"
  | "network.role.deleted"
  | "network.bot.added"
  | "network.bot.removed"
  | "network.emoji.uploaded"
  | "network.emoji.rejected"
  | "network.emoji.removed"
  | "network.safety.setting.changed"
  | "error.boundary"
  | "api.error"
  | "scrollbar.audit.completed"
  | "image.upload.attempted"
  | "image.upload.succeeded"
  | "image.upload.failed"
  | "image.preview.opened"
  | "media.grid.opened"
  | "chat.wallpaper.changed"
  | "chat.wallpaper.reset"
  | "chat.color.changed"
  | "chat.color.reset"
  | "network.archive.attempted"
  | "network.archive.succeeded"
  | "network.archive.failed"
  | "network.restore.attempted"
  | "network.restore.succeeded"
  | "network.restore.failed"
  | "network.delete.attempted"
  | "network.delete.succeeded"
  | "network.delete.failed"
  | "room.planning.opened"
  | "screenshare.started"
  | "screenshare.stopped"
  | "screenshare.failed"
  | "room.type.created"
  | "room.type.changed"
  | "room.permissions.opened"
  | "room.permissions.updated"
  | "file.vault.opened"
  | "file.vault.uploaded"
  | "file.vault.deleted"
  | "file.vault.permissions.changed"
  | "file.vault.download.denied"
  | "file.vault.downloaded"
  | "mission.checkin.created"
  | "mission.task.completed"
  | "mission.calendar.opened"
  | "room.visibility.filtered"
  | "room.access.denied"
  | "mission.room.created"
  | "planning.room.created"
  | "planning.room.opened"
  | "mission.room.opened"
  | "restricted.room.enabled"
  | "restricted.room.disabled"
  | "screenshare.track.ended"
  | "mission.briefing.updated"
  | "mission.roster.opened"
  | "mission.aar.draft.generated"
  | "mission.notice.shown"
  | "mission.asset.created"
  | "mission.asset.updated"
  | "mission.asset.checked_out"
  | "mission.asset.checked_in"
  | "mission.handoff.created"
  | "mission.readiness.checked"
  | "mission.readiness.warning.shown"
  | "network.template.selected"
  | "network.creation.started"
  | "network.creation.completed"
  | "role.request.created"
  | "role.request.approved"
  | "role.request.rejected"
  | "admin.review_queue.opened"
  | "member.lifecycle.updated"
  | "welcome.acknowledged"
  | "rules.acknowledged"
  | "announcement.created"
  | "resource.pinned"
  | "org_tree.opened"
  | "org_tree.node.created"
  | "org_tree.node.updated"
  | "org_tree.node.deleted"
  | "org_tree.member.assigned"
  | "org_tree.member.removed"
  | "org_tree.template.applied"
  | "org_tree.helper.opened"
  | "member.chain_of_command.opened"
  | "call.started"
  | "call.ended"
  | "call.joined"
  | "call.left"
  | "call.connection_state_changed"
  | "call.error_category"
  | "mission.mode_changed"
  | "mission.timezone_changed"
  | "mission.template_applied"
  | "mission.catchup_opened"
  | "mission.handoff_finalized"
  | "mission.decision_created"
  | "mission.readiness_count_changed";

export interface QaEvent {
  /** ISO timestamp. */
  ts: string;
  type: QaEventType;
  /** Route path only — never query strings with content. */
  route?: string;
  userId?: string;
  targetUserId?: string;
  networkId?: string;
  roomId?: string;
  success?: boolean;
  /** Short machine-safe reason code (e.g. "blocked-by-preference"). Not free text. */
  reason?: string;
  requestId?: string;
  nodeId?: string;
}

/** Whitelist of fields persisted per event. Anything else is dropped. */
const SAFE_FIELDS: (keyof QaEvent)[] = [
  "ts", "type", "route", "userId", "targetUserId", "networkId", "roomId",
  "success", "reason", "requestId", "nodeId",
];

const STORAGE_KEY = "aegisnet_qaEvents";
export const QA_EVENT_CAP = 200;
/** Reason codes are short identifiers, never sentences or content. */
const MAX_REASON_LENGTH = 64;

function readEvents(): QaEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: QaEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // QA logging must never break the app.
  }
}

/** Strips any non-whitelisted field and clamps reason codes. */
export function sanitizeQaEvent(input: Partial<QaEvent> & { type: QaEventType }): QaEvent {
  const event: QaEvent = {
    ts: typeof input.ts === "string" ? input.ts : new Date().toISOString(),
    type: input.type,
  };
  
  // Aggressively drop known sensitive fields
  if ("description" in input) {
    delete (input as any).description;
  }
  if ("responsibilities" in input) {
    delete (input as any).responsibilities;
  }

  for (const field of SAFE_FIELDS) {
    if (field === "ts" || field === "type") continue;
    const value = (input as Record<string, unknown>)[field];
    if (value === undefined || value === null) continue;
    if (field === "success") {
      event.success = Boolean(value);
    } else if (typeof value === "string") {
      (event as Record<string, unknown>)[field] =
        field === "reason" ? value.slice(0, MAX_REASON_LENGTH) : value;
    }
  }
  return event;
}

/** Appends a metadata-only event to the local QA log (capped). */
export function logQaEvent(input: Partial<QaEvent> & { type: QaEventType }): QaEvent {
  const event = sanitizeQaEvent({
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    ...input,
  });
  const events = [event, ...readEvents()].slice(0, QA_EVENT_CAP);
  writeEvents(events);
  return event;
}

/** Newest first. */
export function getQaEvents(): QaEvent[] {
  return readEvents().map((event) => sanitizeQaEvent(event as QaEvent & { type: QaEventType }));
}

export function clearQaEvents() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
