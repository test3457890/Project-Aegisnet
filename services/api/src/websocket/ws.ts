import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";
import { AegisSecurityConfig } from "../config/security";
import { logAegisGuardEvent } from "../security/aegisGuard";
import { getQuery } from "../db/db";

export interface SyncEvent {
  eventId: string;
  eventType: string;
  networkId?: string;
  roomId?: string;
  conversationId?: string;
  actorId: string;
  createdAt: string;
  schemaVersion: number;
  requestId?: string;
  clientMutationId?: string;
  payload: any;
}

let wss: WebSocketServer | null = null;
const topicSubscribers = new Map<string, Set<WebSocket>>();
const clientSubscriptions = new Map<WebSocket, Set<string>>();

export const initWebSocket = (server: Server) => {
  wss = new WebSocketServer({ 
    server, 
    path: "/ws",
    verifyClient: (info, callback) => {
      const origin = info.req.headers.origin;
      const configured = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").split(",").map(i => i.trim());
      const isLocal = !origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      if (origin && !configured.includes(origin) && !isLocal) {
        return callback(false, 403, "Forbidden Origin");
      }
      
      const url = new URL(info.req.url || "", `http://${info.req.headers.host || "localhost"}`);
      const token = url.searchParams.get("token");
      if (!token) {
        return callback(false, 401, "Unauthorized");
      }
      
      (info.req as any).userContext = { id: token };
      callback(true);
    }
  });

  const interval = setInterval(() => {
    wss?.clients.forEach((socket: any) => {
      if (socket.isAlive === false) {
        cleanupSocket(socket);
        return socket.terminate();
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);
  interval.unref();
  const socketServer = wss;
  server.once("close", () => socketServer.close());

  wss.on("close", () => {
    clearInterval(interval);
  });

  wss.on("connection", (socket: any, request) => {
    const userId = (request as any).userContext?.id || "user_me";
    const connectionId = crypto.randomUUID();
    socket.userId = userId;
    socket.connectionId = connectionId;
    socket.isAlive = true;
    clientSubscriptions.set(socket, new Set());

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.send(JSON.stringify({
      type: "system:ready",
      payload: { connectedAt: new Date().toISOString() },
    }));

    socket.on("message", async (raw: Buffer) => {
      const rawString = raw.toString();
      const ip = (request.socket.remoteAddress as string) || "unknown";

      if (rawString.length > AegisSecurityConfig.maxWsBytes) {
        if (AegisSecurityConfig.enabled) {
          logAegisGuardEvent({
            requestId: socket.connectionId, ip, method: "WS", route: "/ws",
            statusCode: 1009, reasonCode: "OVERSIZED_WS_PAYLOAD",
            userId: socket.userId, payloadSize: rawString.length, blocked: true,
          });
        }
        socket.close(1009, "Payload Too Large");
        return;
      }

      try {
        const event = JSON.parse(rawString);
        
        if (event.type === "subscribe") {
          const topic = event.topic;
          if (typeof topic === "string") {
            const authorized = await authorizeSubscription(socket.userId, topic);
            if (authorized) {
              if (!topicSubscribers.has(topic)) topicSubscribers.set(topic, new Set());
              topicSubscribers.get(topic)!.add(socket);
              clientSubscriptions.get(socket)!.add(topic);
              socket.send(JSON.stringify({ type: "system:subscribed", topic }));
            } else {
              socket.send(JSON.stringify({ type: "system:error", payload: { message: "Unauthorized subscription to topic.", topic } }));
            }
          }
          return;
        }

        if (event.type === "unsubscribe") {
          const topic = event.topic;
          if (typeof topic === "string") {
            topicSubscribers.get(topic)?.delete(socket);
            clientSubscriptions.get(socket)?.delete(topic);
          }
          return;
        }

        // Handle typing and reaction events routing
        if (event.type === "typing:start" || event.type === "typing:stop" || event.type === "message.reaction") {
           const topic = event.topic;
           if (topic && clientSubscriptions.get(socket)?.has(topic)) {
             // Only broadcast if they are subscribed to this topic
             broadcast(topic, {
                eventId: crypto.randomUUID(),
                eventType: event.type,
                actorId: socket.userId,
                createdAt: new Date().toISOString(),
                schemaVersion: 1,
                payload: event.payload || { senderId: socket.userId }
             }, socket);
           }
           return;
        }

        socket.send(JSON.stringify({
          type: "system:error",
          payload: { message: "Unknown or rejected event type." },
        }));
      } catch {
        socket.send(JSON.stringify({
          type: "system:error",
          payload: { message: "WebSocket event could not be read." },
        }));
      }
    });

    socket.on("close", () => {
      cleanupSocket(socket);
    });
  });

  return wss;
};

function cleanupSocket(socket: WebSocket) {
  const subs = clientSubscriptions.get(socket);
  if (subs) {
    for (const topic of subs) {
      topicSubscribers.get(topic)?.delete(socket);
    }
  }
  clientSubscriptions.delete(socket);
}

async function authorizeSubscription(userId: string, topic: string): Promise<boolean> {
  if (topic === `user:${userId}`) return true;
  
  if (topic.startsWith("network:")) {
    const networkId = topic.split(":")[1];
    const member = await getQuery("SELECT 1 FROM network_members WHERE networkId = ? AND userId = ?", [networkId, userId]);
    return !!member;
  }
  
  if (topic.startsWith("room:")) {
    const roomId = topic.split(":")[1];
    const room = await getQuery<{ visibility: string, networkId: string }>("SELECT visibility, networkId FROM rooms WHERE id = ?", [roomId]);
    if (!room) return false;
    const member = await getQuery("SELECT 1 FROM network_members WHERE networkId = ? AND userId = ?", [room.networkId, userId]);
    if (!member) return false;
    // Basic restriction check: if it's not restricted, member can join. If restricted, need room_members check (to be added)
    if (room.visibility === "restricted" || room.visibility === "opsec") {
       const roomMember = await getQuery("SELECT 1 FROM room_members WHERE roomId = ? AND userId = ?", [roomId, userId]);
       return !!roomMember;
    }
    return true;
  }

  if (topic.startsWith("chat:")) {
    const chatId = topic.split(":")[1];
    const member = await getQuery("SELECT 1 FROM chat_members WHERE chatId = ? AND userId = ?", [chatId, userId]);
    return !!member;
  }

  return false;
}

export const broadcast = (topic: string, event: SyncEvent, excludedSocket?: WebSocket) => {
  if (!wss) return;
  const serialized = JSON.stringify(event);
  const subscribers = topicSubscribers.get(topic);
  if (subscribers) {
    for (const client of subscribers) {
      if (client !== excludedSocket && client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  }
};

export const getWebSocketStatus = () => ({
  status: wss ? "ok" : "not-started",
  path: "/ws",
  clients: wss?.clients.size || 0,
});
