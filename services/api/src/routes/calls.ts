import { randomUUID } from "crypto";
import { Router } from "express";
import { getQuery, runQuery } from "../db/db";
import { broadcast } from "../websocket/ws";

const router = Router();
const allowedModes = new Set(["voice", "video"]);
const allowedStates = new Set([
  "secure-connected",
  "weak-signal",
  "reconnecting",
  "restoring-audio",
  "restoring-video",
  "audio-fallback",
  "text-fallback",
  "back-online",
  "ended",
]);

interface CallRow {
  id: string;
  callerId: string;
  receiverId?: string | null;
  roomId?: string | null;
  chatId?: string | null;
  mode: string;
  state: string;
  startedAt: string;
  updatedAt: string;
  endedAt?: string | null;
}

router.post("/start", async (request, response) => {
  try {
    const id = request.body.id ? String(request.body.id) : `call_${randomUUID()}`;
    const mode = String(request.body.mode || "voice");
    const state = String(request.body.state || "secure-connected");
    if (!allowedModes.has(mode) || !allowedStates.has(state)) {
      response.status(400).json({ error: "Unsupported prototype call mode or state." });
      return;
    }
    const now = new Date().toISOString();
    await runQuery(
      `INSERT INTO call_sessions
        (id, callerId, receiverId, roomId, chatId, mode, state, startedAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET state=excluded.state, updatedAt=excluded.updatedAt`,
      [
        id,
        String(request.body.callerId || "user_me"),
        request.body.receiverId ? String(request.body.receiverId) : null,
        request.body.roomId ? String(request.body.roomId) : null,
        request.body.chatId ? String(request.body.chatId) : null,
        mode,
        state,
        now,
        now,
      ],
    );
    const call = await getQuery<CallRow>("SELECT * FROM call_sessions WHERE id = ?", [id]);
    broadcast("call:state", {
      eventId: randomUUID(),
      eventType: "call:state",
      actorId: String(request.body.callerId || "user_me"),
      createdAt: new Date().toISOString(),
      schemaVersion: 1,
      payload: call
    });
    response.status(201).json(call);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Call state could not be started." });
  }
});

router.post("/:callId/state", async (request, response) => {
  try {
    const call = await getQuery<CallRow>("SELECT * FROM call_sessions WHERE id = ?", [request.params.callId]);
    if (!call) {
      response.status(404).json({ error: "Call state not found." });
      return;
    }
    const nextState = String(request.body.state || call.state);
    if (!allowedStates.has(nextState) || nextState === "ended") {
      response.status(400).json({ error: "Unsupported prototype call state." });
      return;
    }
    await runQuery(
      "UPDATE call_sessions SET state = ?, updatedAt = ? WHERE id = ?",
      [nextState, new Date().toISOString(), call.id],
    );
    const updated = await getQuery<CallRow>("SELECT * FROM call_sessions WHERE id = ?", [call.id]);
    broadcast("call:state", {
      eventId: randomUUID(),
      eventType: "call:state",
      actorId: request.userContext?.id || "user_me",
      createdAt: new Date().toISOString(),
      schemaVersion: 1,
      payload: updated
    });
    response.json(updated);
  } catch {
    response.status(500).json({ error: "Call state could not be updated." });
  }
});

router.post("/:callId/end", async (request, response) => {
  try {
    const call = await getQuery<CallRow>("SELECT * FROM call_sessions WHERE id = ?", [request.params.callId]);
    if (!call) {
      response.status(404).json({ error: "Call state not found." });
      return;
    }
    const now = new Date().toISOString();
    await runQuery(
      "UPDATE call_sessions SET state = 'ended', updatedAt = ?, endedAt = ? WHERE id = ?",
      [now, now, call.id],
    );
    const updated = await getQuery<CallRow>("SELECT * FROM call_sessions WHERE id = ?", [call.id]);
    broadcast("call:state", {
      eventId: randomUUID(),
      eventType: "call:state",
      actorId: request.userContext?.id || "user_me",
      createdAt: new Date().toISOString(),
      schemaVersion: 1,
      payload: updated
    });
    response.json(updated);
  } catch {
    response.status(500).json({ error: "Call state could not be ended." });
  }
});

router.get("/:callId", async (request, response) => {
  try {
    const call = await getQuery<CallRow>("SELECT * FROM call_sessions WHERE id = ?", [request.params.callId]);
    if (!call) {
      response.status(404).json({ error: "Call state not found." });
      return;
    }
    response.json(call);
  } catch {
    response.status(500).json({ error: "Failed to fetch call state." });
  }
});

export default router;
