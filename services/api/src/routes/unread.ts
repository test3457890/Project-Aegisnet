import { Router } from "express";
import { allQuery, getQuery, runQuery } from "../db/db";

const router = Router();

interface ReadStateRow {
  userId: string;
  targetId: string;
  lastReadMessageId: string | null;
  lastReadAt: string;
  unreadCount: number;
}

// Fetch all read states for a user
router.get("/:userId", async (request, response) => {
  try {
    const states = await allQuery<ReadStateRow>(
      "SELECT * FROM user_read_states WHERE userId = ?",
      [request.params.userId]
    );
    response.json(states);
  } catch (err) {
    response.status(500).json({ error: "Failed to fetch read states." });
  }
});

// Update read state for a specific room or chat
router.post("/:userId/read", async (request, response) => {
  const { targetId, lastReadMessageId } = request.body;
  if (!targetId) {
    response.status(400).json({ error: "Missing targetId." });
    return;
  }
  
  try {
    await runQuery(
      `INSERT INTO user_read_states (userId, targetId, lastReadMessageId, lastReadAt, unreadCount)
       VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(userId, targetId) DO UPDATE SET
         lastReadMessageId=excluded.lastReadMessageId,
         lastReadAt=excluded.lastReadAt,
         unreadCount=0`,
      [request.params.userId, targetId, lastReadMessageId || null, new Date().toISOString()]
    );
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to update read state." });
  }
});

export default router;
