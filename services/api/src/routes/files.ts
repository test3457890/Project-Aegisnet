import { Router } from "express";
import { getFile, listFiles, saveFileMetadata } from "../services/files";
import { sanitizeFilename, validateUpload } from "../utils/uploads";
import { broadcast } from "../websocket/ws";

const router = Router();

router.get("/", async (_request, response) => {
  try {
    response.json(await listFiles());
  } catch {
    response.status(500).json({ error: "Failed to fetch File Vault metadata." });
  }
});

router.post("/", async (request, response) => {
  try {
    const originalName = sanitizeFilename(String(request.body.originalName || request.body.name || ""));
    const mimeType = String(request.body.mimeType || request.body.type || "application/octet-stream");
    const size = Number(request.body.size || 0);
    const validationError = validateUpload(originalName, mimeType, size);
    if (validationError) {
      response.status(400).json({ error: validationError });
      return;
    }

    const file = await saveFileMetadata({
      id: request.body.id ? String(request.body.id) : undefined,
      originalName,
      mimeType,
      size,
      uploadedBy: request.userContext?.id || "user_me",
      accessLevel: String(request.body.accessState || request.body.accessLevel || "Private prototype"),
      hash: request.body.hash ? String(request.body.hash) : null,
      storageScope: "browser-local",
      clientStorageId: request.body.storageId ? String(request.body.storageId) : null,
      clientEncrypted: Boolean(request.body.encrypted),
      sourceTargetId: request.body.sourceTargetId ? String(request.body.sourceTargetId) : null,
      thumbnailUrl: request.body.thumbnailUrl ? String(request.body.thumbnailUrl) : null,
    });
    broadcast("user:" + (request.userContext?.id || "user_me"), {
      eventId: require('crypto').randomUUID(),
      eventType: "file:uploaded",
      actorId: request.userContext?.id || "user_me",
      createdAt: new Date().toISOString(),
      schemaVersion: 1,
      payload: file
    });
    response.status(201).json(file);
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "File metadata could not be saved." });
  }
});

router.get("/:fileId", async (request, response) => {
  if (request.params.fileId === "clear") {
    response.status(400).json({ error: "Invalid file id." });
    return;
  }
  try {
    const file = await getFile(request.params.fileId);
    if (!file) {
      response.status(404).json({ error: "File metadata not found." });
      return;
    }
    response.json(file);
  } catch {
    response.status(500).json({ error: "Failed to fetch file metadata." });
  }
});

import { runQuery, allQuery } from "../db/db";
import fs from "fs";
import path from "path";
import { UPLOAD_DIR } from "../utils/uploads";

router.delete("/clear", async (request, response) => {
  try {
    const filesInDb = await allQuery<{ id: string; storedName: string }>("SELECT id, storedName FROM files WHERE storageScope = 'api-local'");
    
    let deletedCount = 0;
    if (fs.existsSync(UPLOAD_DIR)) {
      for (const file of filesInDb) {
        if (file.storedName) {
          try {
            const filePath = path.join(UPLOAD_DIR, file.storedName);
            if (filePath.startsWith(UPLOAD_DIR)) {
              fs.unlinkSync(filePath);
              deletedCount++;
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }

    await runQuery("DELETE FROM files WHERE storageScope = 'api-local'");
    for (const file of filesInDb) {
      // No topic broadcast needed for bulk clear — clients will re-fetch on reconnect
    }
    
    response.json({ success: true, deletedCount });
  } catch (err) {
    response.status(500).json({ error: "Failed to clear binary storage." });
  }
});

router.delete("/:fileId", async (request, response) => {
  try {
    const file = await getFile(request.params.fileId);
    if (!file) {
      response.status(404).json({ error: "File not found." });
      return;
    }

    // Delete physical file if it exists and is managed locally
    if (file.storageScope === "api-local" && file.storedName) {
      const filePath = path.join(UPLOAD_DIR, file.storedName);
      if (filePath.startsWith(UPLOAD_DIR) && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn(`[AegisNet API] Failed to delete file ${filePath}`, e);
        }
      }
    }

    await runQuery("DELETE FROM files WHERE id = ?", [request.params.fileId]);
    // No topic broadcast needed — clients will re-fetch on reconnect
    
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to delete file." });
  }
});

router.post("/cleanup-orphans", async (request, response) => {
  try {
    const filesInDb = await allQuery<{ storedName: string }>("SELECT storedName FROM files WHERE storedName IS NOT NULL AND storageScope = 'api-local'");
    const validNames = new Set(filesInDb.map((f) => f.storedName));
    
    let deletedCount = 0;
    if (fs.existsSync(UPLOAD_DIR)) {
      const filesOnDisk = fs.readdirSync(UPLOAD_DIR);
      for (const fileName of filesOnDisk) {
        if (!validNames.has(fileName) && fileName !== ".gitkeep") {
          try {
            fs.unlinkSync(path.join(UPLOAD_DIR, fileName));
            deletedCount++;
          } catch (e) {
            // ignore
          }
        }
      }
    }

    response.json({ success: true, deletedCount });
  } catch (err) {
    response.status(500).json({ error: "Failed to cleanup orphan files." });
  }
});

export default router;
