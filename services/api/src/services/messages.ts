import { randomUUID } from "crypto";
import { allQuery, getQuery, runQuery } from "../db/db";

export interface AttachmentInput {
  id?: string;
  fileId?: string;
  type?: string;
  url?: string;
  fileName?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  storageId?: string;
  thumbnailUrl?: string;
}

export interface MessageInput {
  id?: string;
  clientId?: string;
  senderId: string;
  body?: string;
  text?: string;
  messageType?: string;
  deliveryStatus?: string;
  expiresAt?: string | number | null;
  attachments?: AttachmentInput[];
}

interface MessageRow {
  id: string;
  clientId?: string | null;
  chatId: string;
  senderId: string;
  body?: string | null;
  messageType: string;
  deliveryStatus: string;
  expiresAt?: string | null;
  createdAt: string;
}

interface AttachmentRow {
  id: string;
  messageId: string;
  fileId?: string | null;
  type?: string | null;
  url?: string | null;
  fileName?: string | null;
  size?: number | null;
  mimeType?: string | null;
  storageId?: string | null;
  thumbnailUrl?: string | null;
}

function normalizeOptionalId(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) return null;
  return /^[\w:.-]+$/.test(trimmed) ? trimmed : null;
}

function normalizeExpiresAt(value: MessageInput["expiresAt"]) {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function toMessageDto(row: MessageRow, attachments: AttachmentRow[] = []) {
  const expiresAt = row.expiresAt ? Date.parse(row.expiresAt) : undefined;
  return {
    id: row.id,
    clientId: row.clientId || undefined,
    chatId: row.chatId,
    targetId: row.chatId,
    senderId: row.senderId,
    body: row.body || "",
    text: row.body || "",
    messageType: row.messageType,
    deliveryStatus: row.deliveryStatus,
    status: row.deliveryStatus,
    createdAt: row.createdAt,
    timestamp: new Date(row.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      fileId: attachment.fileId || undefined,
      type: attachment.type || "file",
      url: attachment.url || undefined,
      fileName: attachment.fileName || undefined,
      name: attachment.fileName || undefined,
      size: attachment.size || undefined,
      mimeType: attachment.mimeType || undefined,
      storageId: attachment.storageId || undefined,
      thumbnailUrl: attachment.thumbnailUrl || undefined,
    })),
  };
}

async function getAttachmentsForMessages(messageIds: string[]) {
  if (!messageIds.length) return new Map<string, AttachmentRow[]>();
  const placeholders = messageIds.map(() => "?").join(",");
  const rows = await allQuery<AttachmentRow>(
    `SELECT * FROM message_attachments WHERE messageId IN (${placeholders}) ORDER BY id ASC`,
    messageIds,
  );
  return rows.reduce((map, attachment) => {
    const list = map.get(attachment.messageId) || [];
    list.push(attachment);
    map.set(attachment.messageId, list);
    return map;
  }, new Map<string, AttachmentRow[]>());
}

export async function getMessages(targetId: string) {
  const rows = await allQuery<MessageRow>(
    "SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt ASC, id ASC",
    [targetId],
  );
  const attachmentMap = await getAttachmentsForMessages(rows.map((row) => row.id));
  return rows.map((row) => toMessageDto(row, attachmentMap.get(row.id) || []));
}

export async function getMessageById(messageId: string) {
  const row = await getQuery<MessageRow>("SELECT * FROM messages WHERE id = ?", [messageId]);
  if (!row) return null;
  const attachmentMap = await getAttachmentsForMessages([row.id]);
  return toMessageDto(row, attachmentMap.get(row.id) || []);
}

export async function createMessage(targetId: string, input: MessageInput) {
  const clientId = normalizeOptionalId(input.clientId || input.id);
  if (clientId) {
    const existing = await getQuery<MessageRow>("SELECT * FROM messages WHERE clientId = ?", [clientId]);
    if (existing) {
      const attachmentMap = await getAttachmentsForMessages([existing.id]);
      return { message: toMessageDto(existing, attachmentMap.get(existing.id) || []), created: false };
    }
  }

  const id = normalizeOptionalId(input.id) || clientId || `msg_${randomUUID()}`;
  const body = String(input.body ?? input.text ?? "").trim();
  const attachments = Array.isArray(input.attachments) ? input.attachments : [];
  const messageType = input.messageType || attachments[0]?.type || "text";
  const createdAt = new Date().toISOString();

  await runQuery(
    `INSERT INTO messages
      (id, clientId, chatId, senderId, body, messageType, deliveryStatus, expiresAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      clientId,
      targetId,
      input.senderId,
      body,
      messageType,
      input.deliveryStatus || "delivered",
      normalizeExpiresAt(input.expiresAt),
      createdAt,
    ],
  );

  for (const [index, attachment] of attachments.entries()) {
    await runQuery(
      `INSERT INTO message_attachments
        (id, messageId, fileId, type, url, fileName, size, mimeType, storageId, thumbnailUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attachment.id || `att_${id}_${index}`,
        id,
        attachment.fileId || null,
        attachment.type || "file",
        attachment.url || null,
        attachment.fileName || attachment.name || null,
        attachment.size || null,
        attachment.mimeType || null,
        attachment.storageId || null,
        attachment.thumbnailUrl || null,
      ],
    );
  }

  const message = await getMessageById(id);
  if (!message) throw new Error("Message could not be saved.");
  return { message, created: true };
}
