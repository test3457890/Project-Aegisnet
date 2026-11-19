import { Router } from "express";
import path from "path";
import { DB_PATH, getQuery } from "../db/db";
import { getUploadStatus } from "../utils/uploads";
import { getWebSocketStatus } from "../websocket/ws";

const router = Router();

router.get("/", async (_request, response) => {
  let database: Record<string, unknown>;
  try {
    await getQuery("SELECT 1 AS ready");
    const tables = await getQuery<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    );
    const versionRow = await getQuery<{ version: number }>(
      "SELECT MAX(version) AS version FROM schema_migrations"
    );
    database = {
      status: "ok",
      path: DB_PATH === ":memory:" ? ":memory:" : path.resolve(DB_PATH),
      tables: Number(tables?.count || 0),
      schemaVersion: versionRow?.version || 0,
    };
  } catch (error) {
    database = {
      status: "error",
      path: DB_PATH,
      error: error instanceof Error ? error.message : "SQLite is unavailable",
    };
  }

  const uploads = getUploadStatus();
  const websocket = getWebSocketStatus();
  const healthy = database.status === "ok" && uploads.status === "ok";

  response.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    service: "AegisNet MVP API",
    version: "0.2.0",
    timestamp: new Date().toISOString(),
    database,
    uploads,
    websocket,
  });
});

export default router;
