import { Router } from "express";
import { allQuery, runQuery } from "../db/db";
import { logAudit } from "../utils/audit";

const router = Router();

router.get("/", async (request, response) => {
  const userId = request.userContext?.id || "user_me";
  try {
    const trustLabels = await allQuery(
      "SELECT targetId AS targetUserId, trustLevel, lastReviewedAt AS lastVerifiedAt FROM trusted_contacts WHERE userId = ?",
      [userId]
    );
    response.json(trustLabels);
  } catch (err) {
    response.status(500).json({ error: "Failed to fetch trust labels" });
  }
});

router.put("/:targetId", async (request, response) => {
  const userId = request.userContext?.id || "user_me";
  const { trustLevel } = request.body;
  try {
    // We only save trustLevel, not privateNotes!
    await runQuery(
      "INSERT INTO trusted_contacts (userId, targetId, trustLevel, lastReviewedAt) VALUES (?, ?, ?, ?) ON CONFLICT(userId, targetId) DO UPDATE SET trustLevel = excluded.trustLevel, lastReviewedAt = excluded.lastReviewedAt",
      [userId, request.params.targetId, trustLevel, new Date().toISOString()]
    );
    
    await logAudit("trust.updated", userId, request.params.targetId, { trustLevel });
    response.json({ success: true, requestId: `req_${Math.random().toString(36).substring(2, 9)}` });
  } catch (err) {
    response.status(500).json({ error: "Failed to update trust label" });
  }
});

export default router;
