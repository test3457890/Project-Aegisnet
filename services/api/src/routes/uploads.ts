import { randomUUID } from "crypto";
import { Router } from "express";
import multer from "multer";
import path from "path";
import { listFiles, saveFileMetadata } from "../services/files";
import {
  ensureUploadDirectory,
  getUploadKind,
  MAX_UPLOAD_BYTES,
  sanitizeFilename,
  toPublicUploadUrl,
  UPLOAD_DIR,
  validateUpload,
} from "../utils/uploads";
import { broadcast } from "../websocket/ws";

const router = Router();
ensureUploadDirectory();

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_request, file, callback) => {
    const normalized = sanitizeFilename(file.originalname);
    callback(null, `upload_${randomUUID()}${path.extname(normalized).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_request, file, callback) => {
    const validationError = validateUpload(file.originalname, file.mimetype, 0);
    if (validationError) {
      callback(new Error(validationError));
    } else {
      callback(null, true);
    }
  },
});

router.post("/", (request, response) => {
  upload.single("file")(request, response, async (uploadError) => {
    if (uploadError) {
      const status = (uploadError as { code?: string }).code === "LIMIT_FILE_SIZE" ? 413 : 400;
      response.status(status).json({ error: uploadError.message || "File upload failed." });
      return;
    }

    try {
      if (!request.file) {
        response.status(400).json({ error: "Choose a file to upload." });
        return;
      }
      const originalName = sanitizeFilename(request.file.originalname);
      const validationError = validateUpload(originalName, request.file.mimetype, request.file.size);
      if (validationError) {
        response.status(400).json({ error: validationError });
        return;
      }

      const file = await saveFileMetadata({
        originalName,
        storedName: request.file.filename,
        mimeType: request.file.mimetype || "application/octet-stream",
        size: request.file.size,
        uploadedBy: request.userContext?.id || "user_me",
        accessLevel: String(request.body.accessState || request.body.accessLevel || "Private prototype"),
        safeUrl: toPublicUploadUrl(request.file.filename),
        hash: request.body.hash ? String(request.body.hash) : null,
        storageScope: "api-local",
        sourceTargetId: request.body.sourceTargetId ? String(request.body.sourceTargetId) : null,
        thumbnailUrl: request.body.thumbnailUrl ? String(request.body.thumbnailUrl) : null,
      });

      const payload = {
        ...file,
        attachmentType: getUploadKind(request.file.mimetype, originalName),
      };
      broadcast("user:" + (request.userContext?.id || "user_me"), {
        eventId: randomUUID(),
        eventType: "file:uploaded",
        actorId: request.userContext?.id || "user_me",
        createdAt: new Date().toISOString(),
        schemaVersion: 1,
        payload,
      });
      response.status(201).json(payload);
    } catch (error) {
      response.status(500).json({ error: error instanceof Error ? error.message : "File upload failed." });
    }
  });
});

// Compatibility alias for the original prototype client.
router.get("/", async (_request, response) => {
  try {
    response.json(await listFiles());
  } catch {
    response.status(500).json({ error: "Failed to fetch file metadata." });
  }
});

export default router;
