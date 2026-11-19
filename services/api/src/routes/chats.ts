import { Router } from "express";
import { allQuery, getQuery, runQuery } from "../db/db";
import { createMessage, getMessages, MessageInput } from "../services/messages";
import { broadcast } from "../websocket/ws";

const router = Router();

interface ChatRow {
  id: string;
  type: "direct" | "group";
  name?: string;
  ownerId?: string;
  createdAt: string;
}

async function toChatDto(chat: ChatRow) {
  const members = await allQuery<{ userId: string }>(
    "SELECT userId FROM chat_members WHERE chatId = ? ORDER BY userId",
    [chat.id],
  );
  const lastMessage = await getQuery<{ body?: string; createdAt?: string }>(
    "SELECT body, createdAt FROM messages WHERE chatId = ? ORDER BY createdAt DESC, id DESC LIMIT 1",
    [chat.id],
  );
  return {
    ...chat,
    participants: members.map((member) => member.userId),
    unreadCount: 0,
    lastMessageSnippet: lastMessage?.body || "",
    lastActivityAt: lastMessage?.createdAt || chat.createdAt,
  };
}

router.get("/", async (request, response) => {
  try {
    const chats = await allQuery<ChatRow>(
      `SELECT c.* FROM chats c
       JOIN chat_members cm ON c.id = cm.chatId
       WHERE cm.userId = ?
       ORDER BY c.createdAt, c.id`,
       [request.userContext?.id || "user_me"]
    );
    response.json(await Promise.all(chats.map(toChatDto)));
  } catch {
    response.status(500).json({ error: "Failed to fetch chats." });
  }
});

router.get("/:chatId/messages", async (request, response) => {
  try {
    const userId = request.userContext?.id || "user_me";
    const chat = await getQuery<ChatRow>(
      `SELECT c.* FROM chats c 
       JOIN chat_members cm ON c.id = cm.chatId 
       WHERE c.id = ? AND cm.userId = ?`,
      [request.params.chatId, userId]
    );
    if (!chat) {
      response.status(403).json({ error: "Access denied or chat not found." });
      return;
    }
    response.json(await getMessages(chat.id));
  } catch {
    response.status(500).json({ error: "Failed to fetch chat messages." });
  }
});

router.post("/:chatId/messages", async (request, response) => {
  try {
    const userId = request.userContext?.id || "user_me";
    const chat = await getQuery<ChatRow>(
      `SELECT c.* FROM chats c 
       JOIN chat_members cm ON c.id = cm.chatId 
       WHERE c.id = ? AND cm.userId = ?`,
      [request.params.chatId, userId]
    );
    if (!chat) {
      response.status(403).json({ error: "Access denied or chat not found." });
      return;
    }
    const result = await createMessage(chat.id, {
      ...request.body,
      senderId: request.userContext?.id || "user_me",
    } as MessageInput);
    if (result.created) {
      broadcast(`chat:${chat.id}`, {
        eventId: require('crypto').randomUUID(),
        eventType: "message.created",
        conversationId: chat.id,
        actorId: userId,
        createdAt: new Date().toISOString(),
        schemaVersion: 1,
        clientMutationId: request.body.clientMutationId || request.body.id,
        payload: result.message
      });
    }
    response.status(result.created ? 201 : 200).json(result.message);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Failed to send message." });
  }
});

router.get("/:chatId", async (request, response) => {
  try {
    const userId = request.userContext?.id || "user_me";
    const chat = await getQuery<ChatRow>(
      `SELECT c.* FROM chats c 
       JOIN chat_members cm ON c.id = cm.chatId 
       WHERE c.id = ? AND cm.userId = ?`,
      [request.params.chatId, userId]
    );
    if (!chat) {
      response.status(403).json({ error: "Access denied or chat not found." });
      return;
    }
    response.json(await toChatDto(chat));
  } catch {
    response.status(500).json({ error: "Failed to fetch chat." });
  }
});

router.post("/", async (request, response) => {
  const { id, type, name, ownerId, participants } = request.body;
  if (!id || !type || !participants || !Array.isArray(participants)) {
    response.status(400).json({ error: "Missing required fields." });
    return;
  }
  try {
    await runQuery(
      `INSERT INTO chats (id, type, name, ownerId, createdAt) VALUES (?, ?, ?, ?, ?)`,
      [id, type, name || null, request.userContext?.id || "user_me", new Date().toISOString()]
    );
    for (const userId of participants) {
      await runQuery("INSERT INTO chat_members (chatId, userId) VALUES (?, ?)", [id, userId]);
    }
    response.status(201).json({ success: true, id });
  } catch (err) {
    response.status(500).json({ error: "Failed to create Chat." });
  }
});

router.patch("/:chatId", async (request, response) => {
  const { name } = request.body;
  try {
    await runQuery(
      `UPDATE chats SET name = COALESCE(?, name) WHERE id = ?`,
      [name ?? null, request.params.chatId]
    );
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to update Chat." });
  }
});

router.delete("/:chatId", async (request, response) => {
  try {
    await runQuery("UPDATE chats SET archivedAt = ? WHERE id = ?", [new Date().toISOString(), request.params.chatId]);
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to archive Chat." });
  }
});

// --- Group chat members ---

router.get("/:chatId/members", async (request, response) => {
  try {
    const members = await allQuery<{ userId: string }>(
      "SELECT userId FROM chat_members WHERE chatId = ? ORDER BY userId",
      [request.params.chatId],
    );
    response.json(members.map((m) => m.userId));
  } catch (err) {
    response.status(500).json({ error: "Failed to fetch chat members." });
  }
});

router.post("/:chatId/members", async (request, response) => {
  const { participants } = request.body;
  if (!participants || !Array.isArray(participants)) {
    response.status(400).json({ error: "Missing participants array." });
    return;
  }
  try {
    for (const userId of participants) {
      // NOTE: Here we allow adding participants specified in the body.
      await runQuery("INSERT OR IGNORE INTO chat_members (chatId, userId) VALUES (?, ?)", [request.params.chatId, userId]);
    }
    response.status(201).json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to add members." });
  }
});

router.delete("/:chatId/members/:userId", async (request, response) => {
  try {
    await runQuery("DELETE FROM chat_members WHERE chatId = ? AND userId = ?", [request.params.chatId, request.params.userId]);
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to remove member." });
  }
});

export default router;
