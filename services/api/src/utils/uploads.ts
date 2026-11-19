import fs from "fs";
import path from "path";

import { AegisSecurityConfig } from "../config/security";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
export const MAX_UPLOAD_BYTES = AegisSecurityConfig.maxUploadBytes;

const dangerousExtensions = new Set([
  ".bat", ".cmd", ".com", ".cpl", ".dll", ".exe", ".hta", ".html", ".js", ".jse", ".lnk",
  ".msi", ".ps1", ".scr", ".svg", ".vbs", ".wsf",
]);

const acceptedExtensions = new Set([".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".gif"]);

const mimeByExtension: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
  ".txt": ["text/plain", "application/octet-stream"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
  ".gif": ["image/gif"],
};

const dangerousMimes = new Set([
  "image/svg+xml",
  "text/html",
  "application/javascript",
  "text/javascript",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-sh",
  "application/x-powershell",
]);

export function ensureUploadDirectory() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function getUploadStatus() {
  try {
    ensureUploadDirectory();
    fs.accessSync(UPLOAD_DIR, fs.constants.R_OK | fs.constants.W_OK);
    return { status: "ok", path: UPLOAD_DIR, writable: true };
  } catch (error) {
    return {
      status: "error",
      path: UPLOAD_DIR,
      writable: false,
      error: error instanceof Error ? error.message : "Upload directory is not writable",
    };
  }
}

export function sanitizeFilename(input: string) {
  const basename = path.basename(input || "upload.bin");
  const ext = path.extname(basename).toLowerCase();
  const name = path.basename(basename, ext)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "upload";
  return `${name}${ext}`;
}

export function getUploadKind(mimeType: string, originalName: string): "image" | "gif" | "file" {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === ".gif" || mimeType === "image/gif") return "gif";
  if (mimeType.startsWith("image/")) return "image";
  return "file";
}

export function validateUpload(originalName: string, mimeType: string, size: number) {
  const ext = path.extname(originalName).toLowerCase();
  const lowerMime = (mimeType || "application/octet-stream").toLowerCase();

  if (size > MAX_UPLOAD_BYTES) {
    return `File is too large. Maximum upload size is ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`;
  }
  if (dangerousExtensions.has(ext) || dangerousMimes.has(lowerMime)) {
    return "This file type is blocked for the prototype.";
  }
  if (!acceptedExtensions.has(ext)) {
    return "Unsupported file type. Use PDF, DOCX, TXT, PNG, JPG, WEBP, or GIF.";
  }
  const acceptedMimes = mimeByExtension[ext] || [];
  if (lowerMime && !acceptedMimes.includes(lowerMime)) {
    return "The file extension and content type do not match an allowed prototype upload.";
  }
  return null;
}

export function toPublicUploadUrl(storedName: string) {
  return `/uploads/files/${encodeURIComponent(storedName)}`;
}
