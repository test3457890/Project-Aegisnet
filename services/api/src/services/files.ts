import { randomUUID } from "crypto";
import { allQuery, getQuery, runQuery } from "../db/db";

export interface FileRow {
  id: string;
  originalName: string;
  storedName?: string | null;
  mimeType: string;
  size: number;
  uploadedBy?: string | null;
  uploadedAt: string;
  accessLevel?: string | null;
  safeUrl?: string | null;
  hash?: string | null;
  storageScope?: string | null;
  clientStorageId?: string | null;
  clientEncrypted?: number | null;
  sourceTargetId?: string | null;
  thumbnailUrl?: string | null;
}

export interface FileInput {
  id?: string;
  originalName: string;
  storedName?: string | null;
  mimeType: string;
  size: number;
  uploadedBy?: string;
  accessLevel?: string;
  safeUrl?: string | null;
  hash?: string | null;
  storageScope?: string;
  clientStorageId?: string | null;
  clientEncrypted?: boolean;
  sourceTargetId?: string | null;
  thumbnailUrl?: string | null;
}

export function toFileDto(row: FileRow) {
  return {
    id: row.id,
    originalName: row.originalName,
    name: row.originalName,
    storedName: row.storedName || undefined,
    mimeType: row.mimeType,
    type: row.mimeType,
    size: Number(row.size || 0),
    uploadedBy: row.uploadedBy || "user_me",
    uploadedAt: row.uploadedAt,
    accessLevel: row.accessLevel || "Private prototype",
    accessState: row.accessLevel || "Private prototype",
    safeUrl: row.safeUrl || undefined,
    url: row.safeUrl || undefined,
    hash: row.hash || undefined,
    storageScope: row.storageScope || "api-local",
    clientStorageId: row.clientStorageId || undefined,
    storageId: row.clientStorageId || undefined,
    clientEncrypted: Boolean(row.clientEncrypted),
    encrypted: Boolean(row.clientEncrypted),
    sourceTargetId: row.sourceTargetId || undefined,
    thumbnailUrl: row.thumbnailUrl || undefined,
  };
}

export async function listFiles() {
  const rows = await allQuery<FileRow>("SELECT * FROM files ORDER BY uploadedAt DESC, id ASC");
  return rows.map(toFileDto);
}

export async function getFile(id: string) {
  const row = await getQuery<FileRow>("SELECT * FROM files WHERE id = ?", [id]);
  return row ? toFileDto(row) : null;
}

export async function saveFileMetadata(input: FileInput) {
  const id = input.id || `file_${randomUUID()}`;
  const uploadedAt = new Date().toISOString();
  await runQuery(
    `INSERT INTO files
      (id, originalName, storedName, mimeType, size, uploadedBy, uploadedAt, accessLevel,
       safeUrl, hash, storageScope, clientStorageId, clientEncrypted, sourceTargetId, thumbnailUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       originalName=excluded.originalName,
       storedName=COALESCE(excluded.storedName, files.storedName),
       mimeType=excluded.mimeType,
       size=excluded.size,
       uploadedBy=excluded.uploadedBy,
       accessLevel=excluded.accessLevel,
       safeUrl=COALESCE(excluded.safeUrl, files.safeUrl),
       hash=COALESCE(excluded.hash, files.hash),
       storageScope=excluded.storageScope,
       clientStorageId=COALESCE(excluded.clientStorageId, files.clientStorageId),
       clientEncrypted=excluded.clientEncrypted,
       sourceTargetId=COALESCE(excluded.sourceTargetId, files.sourceTargetId),
       thumbnailUrl=COALESCE(excluded.thumbnailUrl, files.thumbnailUrl)`,
    [
      id,
      input.originalName,
      input.storedName || null,
      input.mimeType,
      input.size,
      input.uploadedBy || "user_me",
      uploadedAt,
      input.accessLevel || "Private prototype",
      input.safeUrl || null,
      input.hash || null,
      input.storageScope || "api-local",
      input.clientStorageId || null,
      input.clientEncrypted ? 1 : 0,
      input.sourceTargetId || null,
      input.thumbnailUrl || null,
    ],
  );
  const file = await getFile(id);
  if (!file) throw new Error("File metadata could not be saved.");
  return file;
}
