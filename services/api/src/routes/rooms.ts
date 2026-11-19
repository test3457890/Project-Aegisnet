import { Router } from "express";
import { allQuery, getQuery, runQuery } from "../db/db";
import { createMessage, getMessages, MessageInput } from "../services/messages";
import { broadcast } from "../websocket/ws";

const router = Router();

interface RoomRow {
  id: string;
  networkId: string;
  categoryId?: string;
  name: string;
  icon?: string;
  type: string;
  sortOrder: number;
  archived: number;
  unread: number;
}

function toRoomDto(room: RoomRow) {
  return { ...room, archived: Boolean(room.archived), unread: Number(room.unread || 0) };
}

async function getRoom(roomId: string) {
  return getQuery<RoomRow>("SELECT * FROM rooms WHERE id = ?", [roomId]);
}

function targetIdForRoom(room: RoomRow) {
  return `network:${room.networkId}:room:${room.id}`;
}

router.get("/", async (request, response) => {
  try {
    const networkId = typeof request.query.networkId === "string" ? request.query.networkId : null;
    const rooms = networkId
      ? await allQuery<RoomRow>("SELECT * FROM rooms WHERE networkId = ? ORDER BY sortOrder, name", [networkId])
      : await allQuery<RoomRow>("SELECT * FROM rooms ORDER BY networkId, sortOrder, name");
    response.json(rooms.map(toRoomDto));
  } catch {
    response.status(500).json({ error: "Failed to fetch rooms." });
  }
});

router.get("/:roomId/messages", async (request, response) => {
  try {
    const room = await getRoom(request.params.roomId);
    if (!room) {
      response.status(404).json({ error: "Room not found." });
      return;
    }
    response.json(await getMessages(targetIdForRoom(room)));
  } catch {
    response.status(500).json({ error: "Failed to fetch room messages." });
  }
});

router.post("/:roomId/messages", async (request, response) => {
  try {
    const room = await getRoom(request.params.roomId);
    if (!room) {
      response.status(404).json({ error: "Room not found." });
      return;
    }
    const result = await createMessage(targetIdForRoom(room), {
      ...request.body,
      senderId: request.userContext?.id || "user_me",
    } as MessageInput);
    if (result.created) {
      broadcast(`room:${room.id}`, {
        eventId: require('crypto').randomUUID(),
        eventType: "message.created",
        roomId: room.id,
        networkId: room.networkId,
        actorId: request.userContext?.id || "user_me",
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

router.get("/:roomId", async (request, response) => {
  try {
    const room = await getRoom(request.params.roomId);
    if (!room) {
      response.status(404).json({ error: "Room not found." });
      return;
    }
    response.json(toRoomDto(room));
  } catch {
    response.status(500).json({ error: "Failed to fetch room." });
  }
});
router.patch("/:roomId", async (request, response) => {
  const { name, icon, type, privacyMode, categoryId } = request.body;
  try {
    await runQuery(
      `UPDATE rooms SET 
        name = COALESCE(?, name),
        icon = COALESCE(?, icon),
        type = COALESCE(?, type),
        privacyMode = COALESCE(?, privacyMode),
        categoryId = COALESCE(?, categoryId)
       WHERE id = ?`,
      [name ?? null, icon ?? null, type ?? null, privacyMode ?? null, categoryId ?? null, request.params.roomId]
    );
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to update Room." });
  }
});

router.delete("/:roomId", async (request, response) => {
  try {
    await runQuery("UPDATE rooms SET deletedAt = ? WHERE id = ?", [new Date().toISOString(), request.params.roomId]);
    response.json({ success: true });
  } catch (err) {
    response.status(500).json({ error: "Failed to delete Room." });
  }
});

export default router;
