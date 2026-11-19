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

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "offline" | "unauthorized";
export type WSEventCallback = (payload: any | SyncEvent) => void;
export type StateCallback = (state: ConnectionState) => void;

const apiUrl = (import.meta.env.VITE_AEGIS_API_URL as string | undefined) || "http://localhost:8000";
const configuredWsUrl = import.meta.env.VITE_AEGIS_WS_URL as string | undefined;
const defaultWsUrl = `${apiUrl.replace(/^http/, "ws").replace(/\/$/, "")}/ws`;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url = configuredWsUrl || defaultWsUrl;
  private listeners: Record<string, WSEventCallback[]> = {};
  private activeTopics: Set<string> = new Set();
  private stateListeners: Set<StateCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 7;
  private reconnectDelay = 1000;
  private state: ConnectionState = "offline";
  private reconnectTimer: any = null;

  connect() {
    if (this.state === "connected" || this.state === "connecting") return;
    this.updateState("connecting");

    try {
      const mockToken = localStorage.getItem("aegis_mock_token") || "user_me";
      const connectionUrl = `${this.url}?token=${mockToken}`;
      
      this.ws = new WebSocket(connectionUrl);
      
      this.ws.onopen = () => {
        console.info('[AegisNet] Shared API WebSocket connected.');
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.updateState("connected");
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "system:ready") {
            // Connected
          } else if (data.type === "system:subscribed") {
            // Subscribed confirmation
          } else if (data.type === "system:error") {
            console.error('[AegisNet] WS Error:', data.payload?.message);
            if (data.payload?.message === "Unauthorized") {
              this.updateState("unauthorized");
              this.disconnect();
            }
          } else if (data.eventId && data.eventType) {
             // Topic-based SyncEvent
             if (this.listeners[data.eventType]) {
               this.listeners[data.eventType].forEach(cb => cb(data));
             }
          } else if (data.type && this.listeners[data.type]) {
             // Legacy global event
             this.listeners[data.type].forEach(cb => cb(data.payload));
          }
        } catch (e) {
          console.error('[AegisNet] Failed to parse WS message', e);
        }
      };

      this.ws.onclose = () => {
        console.info('[AegisNet] Shared API WebSocket disconnected.');
        this.ws = null;
        if (this.state !== "unauthorized") {
          this.updateState("offline");
          this.scheduleReconnect();
        }
      };
      
      this.ws.onerror = () => {
        if (this.ws) this.ws.close();
      };
    } catch (e) {
      console.info('[AegisNet] Shared API WebSocket is unavailable.', e);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.state !== "unauthorized") {
       this.updateState("offline");
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  subscribe(topic: string) {
    this.activeTopics.add(topic);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", topic }));
    }
  }

  unsubscribe(topic: string) {
    this.activeTopics.delete(topic);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "unsubscribe", topic }));
    }
  }

  private resubscribeAll() {
    for (const topic of this.activeTopics) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "subscribe", topic }));
      }
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateState("offline");
      return;
    }
    this.updateState("reconnecting");
    if (!this.reconnectTimer) {
      const delay = Math.min(30000, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
      this.reconnectAttempts++;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, delay);
    }
  }

  on(type: string, cb: WSEventCallback) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  }

  off(type: string, cb: WSEventCallback) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(listener => listener !== cb);
  }

  onStateChange(cb: StateCallback) {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  getState() {
    return this.state;
  }

  private updateState(newState: ConnectionState) {
    if (this.state !== newState) {
      this.state = newState;
      for (const listener of this.stateListeners) {
        listener(newState);
      }
    }
  }

  send(type: string, payload: any, topic?: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, topic }));
    }
  }
}

export const wsClient = new WebSocketClient();
