import { Router } from "express";
import { allQuery, getQuery, runQuery } from "../db/db";

const router = Router();

// --- Audit Logs ---

router.get("/audit", async (_request, response) => {
  try {
    const logs = await allQuery("SELECT * FROM audit_logs ORDER BY createdAt DESC LIMIT 100");
    response.json(logs.map((log: any) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : undefined
    })));
  } catch (error) {
    response.status(500).json({ error: "Failed to fetch audit logs." });
  }
});

router.post("/audit", async (request, response) => {
  const { id, action, targetId, metadata } = request.body;
  const actorId = request.userContext?.id || "user_me";
  if (!id || !action || !actorId) {
    response.status(400).json({ error: "Missing required fields." });
    return;
  }
  try {
    await runQuery(
      `INSERT INTO audit_logs (id, action, actorId, targetId, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, action, actorId, targetId || null, metadata ? JSON.stringify(metadata) : null, new Date().toISOString()]
    );
    response.status(201).json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to create audit log." });
  }
});

// --- Support Tickets ---

router.get("/tickets", async (_request, response) => {
  try {
    const tickets = await allQuery("SELECT * FROM support_tickets ORDER BY createdAt DESC");
    response.json(tickets);
  } catch (error) {
    response.status(500).json({ error: "Failed to fetch support tickets." });
  }
});

router.post("/tickets", async (request, response) => {
  const { id, summary, description } = request.body;
  const userId = request.userContext?.id || "user_me";
  if (!id || !userId || !summary) {
    response.status(400).json({ error: "Missing required fields." });
    return;
  }
  try {
    await runQuery(
      `INSERT INTO support_tickets (id, userId, summary, description, status, createdAt) VALUES (?, ?, ?, ?, 'open', ?)`,
      [id, userId, summary, description || null, new Date().toISOString()]
    );
    response.status(201).json({ success: true, id });
  } catch (err) {
    response.status(500).json({ error: "Failed to create support ticket." });
  }
});

router.patch("/tickets/:id", async (request, response) => {
  const { status } = request.body;
  try {
    await runQuery("UPDATE support_tickets SET status = ? WHERE id = ?", [status, request.params.id]);
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to update support ticket." });
  }
});

export default router;
