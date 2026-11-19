import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { WebSocket } from "ws";

async function jsonRequest(baseUrl: string, route: string, init?: RequestInit) {
  const finalInit = {
    ...init,
    headers: {
      "Authorization": "Bearer user_me",
      ...init?.headers,
    }
  };
  const response = await fetch(`${baseUrl}${route}`, finalInit);
  const payload = await response.json() as any;
  return { response, payload };
}

async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  return (server.address() as AddressInfo).port;
}

async function closeServer(server: Server | null) {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

function waitForEvent(
  socket: WebSocket,
  matches: (event: Record<string, any>) => boolean,
  description: string
) {
  return new Promise<Record<string, any>>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error(`Timed out waiting for ${description}.`));
    }, 5000);
    const onMessage = (raw: Buffer) => {
      const event = JSON.parse(raw.toString()) as Record<string, any>;
      if (!matches(event)) return;
      clearTimeout(timeout);
      socket.off("message", onMessage);
      resolve(event);
    };
    socket.on("message", onMessage);
  });
}

async function main() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "aegisnet-api-smoke-"));
  const uploadDir = path.join(temporaryRoot, "uploads");
  process.env.DATABASE_URL = path.join(temporaryRoot, "test.db");
  process.env.UPLOAD_DIR = uploadDir;
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";

  let server: Server | null = null;
  let socket: WebSocket | null = null;
  let closeDatabase: (() => Promise<void>) | null = null;

  try {
    const [{ app }, { initDb, closeDb }, { seedDb }, { initWebSocket }] = await Promise.all([
      import("../server"),
      import("../db/db"),
      import("../db/seed"),
      import("../websocket/ws"),
    ]);

    closeDatabase = closeDb;
    await initDb();
    await seedDb({ initialize: false });
    server = createServer(app);
    initWebSocket(server);
    const port = await listen(server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const health = await jsonRequest(baseUrl, "/health");
    assert.equal(health.response.status, 200);
    assert.equal(health.payload.status, "ok");
    assert.equal(health.payload.database.status, "ok");
    assert.equal(health.payload.uploads.status, "ok");
    assert.equal(health.payload.websocket.status, "ok");

    const users = await jsonRequest(baseUrl, "/users");
    assert.equal(users.response.status, 200);
    assert.ok(users.payload.some((user: { id: string }) => user.id === "user_me"));

    const networks = await jsonRequest(baseUrl, "/networks");
    assert.equal(networks.response.status, 200);
    assert.equal(networks.payload.length, 7);

    const family = await jsonRequest(baseUrl, "/networks/net_family");
    assert.equal(family.response.status, 200);
    assert.ok(family.payload.categories.some((category: { rooms: Array<{ id: string }> }) => (
      category.rooms.some((room) => room.id === "room_fam_chat")
    )));

    const chats = await jsonRequest(baseUrl, "/chats");
    assert.equal(chats.response.status, 200);
    assert.ok(chats.payload.some((chat: { id: string }) => chat.id === "chat_family"));

    socket = new WebSocket(`ws://127.0.0.1:${port}/ws?token=user_me`);
    await new Promise<void>((resolve, reject) => {
      socket?.once("open", () => resolve());
      socket?.once("error", reject);
    });

    const topic = "chat:chat_sarah";
    const subscription = waitForEvent(socket, (event) => event.type === "system:subscribed" && event.topic === topic, "chat subscription");
    socket.send(JSON.stringify({ type: "subscribe", topic }));
    await subscription;

    const messageId = "msg_smoke_dedupe";
    const eventPromise = waitForEvent(
      socket,
      (event) => event.eventType === "message.created" && event.payload?.id === messageId,
      "message.created"
    );
    const messageBody = JSON.stringify({
      id: messageId,
      clientId: messageId,
      senderId: "user_me",
      body: "Smoke test message",
      deliveryStatus: "delivered",
    });
    const firstMessage = await jsonRequest(baseUrl, "/chats/chat_sarah/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: messageBody,
    });
    assert.equal(firstMessage.response.status, 201);
    assert.equal(firstMessage.payload.id, messageId);
    assert.equal((await eventPromise).payload.id, messageId);

    const duplicateMessage = await jsonRequest(baseUrl, "/chats/chat_sarah/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: messageBody,
    });
    assert.equal(duplicateMessage.response.status, 200);
    const hydratedMessages = await jsonRequest(baseUrl, "/chats/chat_sarah/messages");
    assert.equal(
      hydratedMessages.payload.filter((message: { id: string }) => message.id === messageId).length,
      1,
    );

    const roomMessage = await jsonRequest(baseUrl, "/rooms/room_fam_chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "msg_smoke_room",
        clientId: "msg_smoke_room",
        senderId: "user_me",
        body: "Room smoke test",
      }),
    });
    assert.equal(roomMessage.response.status, 201);
    assert.equal(roomMessage.payload.targetId, "network:net_family:room:room_fam_chat");

    const form = new FormData();
    form.append("file", new Blob(["AegisNet smoke upload"], { type: "text/plain" }), "smoke.txt");
    form.append("uploadedBy", "user_me");
    form.append("accessState", "Private prototype");
    const upload = await jsonRequest(baseUrl, "/uploads", { method: "POST", body: form });
    assert.equal(upload.response.status, 201);
    assert.equal(upload.payload.mimeType, "text/plain");
    assert.equal(upload.payload.storageScope, "api-local");
    assert.ok(upload.payload.safeUrl.startsWith("/uploads/files/"));
    const uploadedBytes = await readFile(path.join(uploadDir, upload.payload.storedName));
    assert.equal(uploadedBytes.toString(), "AegisNet smoke upload");

    const call = await jsonRequest(baseUrl, "/calls/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "call_smoke",
        callerId: "user_me",
        chatId: "chat_sarah",
        mode: "voice",
        state: "secure-connected",
      }),
    });
    assert.equal(call.response.status, 201);
    const callState = await jsonRequest(baseUrl, "/calls/call_smoke/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "reconnecting" }),
    });
    assert.equal(callState.payload.state, "reconnecting");
    const callEnd = await jsonRequest(baseUrl, "/calls/call_smoke/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(callEnd.payload.state, "ended");

    console.log("[AegisNet API] Smoke test passed.");
    socket.close();
    socket = null;
    await closeServer(server);
    server = null;
    await closeDb();
    closeDatabase = null;
  } finally {
    socket?.close();
    await closeServer(server).catch(() => undefined);
    await closeDatabase?.().catch(() => undefined);
    await rm(temporaryRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error("[AegisNet API] Smoke test failed:", error);
  process.exitCode = 1;
});
