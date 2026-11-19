import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { wsClient } from "./wsClient";

// We need to capture ws instances as they're created
let latestWsInstance: any = null;

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  onopen: any;
  onclose: any;
  onmessage: any;
  onerror: any;
  readyState = MockWebSocket.OPEN;
  send = vi.fn();
  close = vi.fn();

  constructor(public url: string) {
    latestWsInstance = this;
  }
}

describe("wsClient", () => {
  let originalWebSocket: any;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket as any;
    latestWsInstance = null;
    wsClient.disconnect();
    // Clear reconnect timer
    const reconnectTimer = (wsClient as any)["reconnectTimer"];
    if (reconnectTimer) clearTimeout(reconnectTimer);
    (wsClient as any)["reconnectTimer"] = null;
    (wsClient as any)["reconnectAttempts"] = 0;
    (wsClient as any)["state"] = "offline";
    (wsClient as any)["ws"] = null;
    (wsClient as any)["activeTopics"] = new Set();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    wsClient.disconnect();
  });

  it("should connect and fire onopen, then go offline on close", () => {
    const stateChanges: string[] = [];
    const off = wsClient.onStateChange((s) => stateChanges.push(s));

    wsClient.connect();
    expect(latestWsInstance).not.toBeNull();
    
    latestWsInstance.onopen();
    expect(stateChanges).toContain("connected");

    latestWsInstance.onclose();
    expect(stateChanges.at(-1)).toMatch(/offline|reconnecting/);

    off();
  });

  it("should subscribe and send the subscribe message when connected", () => {
    wsClient.connect();
    latestWsInstance.onopen();

    wsClient.subscribe("chat:testchat1");
    expect(latestWsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "subscribe", topic: "chat:testchat1" })
    );

    wsClient.unsubscribe("chat:testchat1");
    expect(latestWsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "unsubscribe", topic: "chat:testchat1" })
    );
  });

  it("should resubscribe to all active topics on reconnect", () => {
    wsClient.connect();
    latestWsInstance.onopen();
    wsClient.subscribe("room:room1");
    wsClient.subscribe("chat:chat1");

    // Simulate disconnect + reconnect
    latestWsInstance.send.mockClear();
    latestWsInstance.onclose();

    wsClient.connect();
    latestWsInstance.onopen();

    const sentTopics = latestWsInstance.send.mock.calls.map((c: any) => JSON.parse(c[0]).topic);
    expect(sentTopics).toContain("room:room1");
    expect(sentTopics).toContain("chat:chat1");
  });

  it("should dispatch SyncEvents to registered listeners", () => {
    wsClient.connect();
    latestWsInstance.onopen();

    const listener = vi.fn();
    wsClient.on("message.created", listener);

    const syncEvent = {
      eventId: "evt-1",
      eventType: "message.created",
      actorId: "user_sarah",
      createdAt: "2026-01-01T00:00:00Z",
      schemaVersion: 1,
      payload: { body: "hello" }
    };

    latestWsInstance.onmessage({ data: JSON.stringify(syncEvent) });

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      eventId: "evt-1",
      eventType: "message.created",
      payload: { body: "hello" }
    }));

    wsClient.off("message.created", listener);
  });

  it("should deduplicate off() calls correctly", () => {
    wsClient.connect();
    latestWsInstance.onopen();

    const listener = vi.fn();
    wsClient.on("typing:start", listener);

    latestWsInstance.onmessage({
      data: JSON.stringify({ eventId: "1", eventType: "typing:start", actorId: "user_a", createdAt: "2026-01-01", schemaVersion: 1, payload: {} })
    });
    expect(listener).toHaveBeenCalledTimes(1);

    wsClient.off("typing:start", listener);
    latestWsInstance.onmessage({
      data: JSON.stringify({ eventId: "2", eventType: "typing:start", actorId: "user_a", createdAt: "2026-01-01", schemaVersion: 1, payload: {} })
    });
    expect(listener).toHaveBeenCalledTimes(1); // Not called again
  });
});
