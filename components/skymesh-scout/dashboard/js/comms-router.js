/* ============================================================
   AegisNet Expansion Layer — comms-router.js
   CommsRouter, MessageQueueService, DeliveryStatusService,
   NetworkHealthMonitor, MediaTransferService
   ============================================================ */
"use strict";

/* ──────────────────────────────────────────────
   DELIVERY STATUS
   pending | queued | sending | sent | delivered | failed | expired
   ────────────────────────────────────────────── */
class DeliveryStatusService {
  constructor() { this._records = new Map(); }
  create(msgId, adapterId) {
    const r = { msgId, adapterId, status: "pending", ts: Date.now(), attempts: 0, error: null };
    this._records.set(msgId, r);
    this._notify(r); return r;
  }
  update(msgId, status, extra = {}) {
    const r = this._records.get(msgId);
    if (!r) return;
    Object.assign(r, { status, ...extra, updatedAt: Date.now() });
    if (status === "failed" || status === "delivered") r.resolvedAt = Date.now();
    this._notify(r);
  }
  get(msgId) { return this._records.get(msgId); }
  getAll() { return [...this._records.values()]; }
  pending() { return this.getAll().filter(r => ["pending","queued","sending"].includes(r.status)); }
  _notify(r) { window.CommsRouter?._onDeliveryUpdate(r); }
}

/* ──────────────────────────────────────────────
   MESSAGE QUEUE
   Stores messages when no route is available.
   Retries when a route comes back up.
   ────────────────────────────────────────────── */
class MessageQueueService {
  constructor(deliveryService) {
    this._q = [];
    this._ds = deliveryService;
    this._retryTimer = null;
    this._maxAge = 30 * 60 * 1000;  // 30 min before expiry
  }
  enqueue(message) {
    const id = message.id || _uid();
    const entry = { ...message, id, queuedAt: Date.now(), attempts: 0 };
    this._q.push(entry);
    this._ds.update(id, "queued");
    return id;
  }
  dequeue() { return this._q.shift(); }
  size() { return this._q.length; }
  peek() { return [...this._q]; }
  expire() {
    const now = Date.now();
    this._q = this._q.filter(m => {
      if (now - m.queuedAt > this._maxAge) { this._ds.update(m.id, "expired"); return false; }
      return true;
    });
  }
  startRetry(routerRef) {
    if (this._retryTimer) return;
    this._retryTimer = setInterval(async () => {
      this.expire();
      if (this._q.length === 0 || !routerRef.bestAdapter()) return;
      const msg = this.dequeue();
      if (!msg) return;
      msg.attempts++;
      this._ds.update(msg.id, "sending", { attempts: msg.attempts });
      try {
        await routerRef.send(msg, true);
      } catch {
        if (msg.attempts < 3) this._q.unshift(msg);   // put back at front
        else this._ds.update(msg.id, "failed", { error: "Max retries exceeded" });
      }
    }, 8000);
  }
  stopRetry() { clearInterval(this._retryTimer); this._retryTimer = null; }
}

/* ──────────────────────────────────────────────
   NETWORK HEALTH MONITOR
   Polls adapters and reports aggregate health.
   ────────────────────────────────────────────── */
class NetworkHealthMonitor {
  constructor() {
    this._adapters = [];
    this._history = [];   // [{ts, counts}] last 20 snapshots
    this._timer = null;
  }
  register(adapter) { this._adapters.push(adapter); }
  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this._snapshot(), 10000);
    this._snapshot();
  }
  stop() { clearInterval(this._timer); this._timer = null; }
  _snapshot() {
    const counts = { ready: 0, degraded: 0, offline: 0, error: 0, connecting: 0 };
    for (const a of this._adapters) counts[a.status] = (counts[a.status] || 0) + 1;
    this._history.push({ ts: Date.now(), counts });
    if (this._history.length > 20) this._history.shift();
    window.CommsRouter?._onHealthUpdate(counts);
  }
  summary() {
    const counts = { ready: 0, degraded: 0, offline: 0, error: 0 };
    for (const a of this._adapters) counts[a.status] = (counts[a.status] || 0) + 1;
    return counts;
  }
  getHistory() { return [...this._history]; }
}

/* ──────────────────────────────────────────────
   MEDIA TRANSFER SERVICE
   Handles image chunking for low-bandwidth paths.
   Blocks media when the active route cannot support it.
   ────────────────────────────────────────────── */
class MediaTransferService {
  canSend(adapter, type) {
    if (!adapter) return false;
    return adapter.canSend(type);
  }
  reasonBlocked(adapter, type) {
    if (!adapter) return "No route available";
    if (!adapter.isAvailable()) return `${adapter.displayName} is ${adapter.status}`;
    if (!adapter.supports[type]) return `${adapter.displayName} does not support ${type} — use internet or P2P for media`;
    return null;
  }
  async prepareImage(file, adapter) {
    if (!this.canSend(adapter, "images")) throw new Error(this.reasonBlocked(adapter, "images"));
    const maxKB = adapter.bandwidth === "high" ? 2048 : adapter.bandwidth === "medium" ? 256 : 0;
    if (maxKB === 0) throw new Error("Image blocked: bandwidth too low for this route");
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = e => res({ dataUrl: e.target.result, size: file.size, name: file.name });
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }
}

/* ──────────────────────────────────────────────
   COMMS ROUTER
   Chooses the best route, falls back, queues, retries.
   Priority order: local > internet > p2p > mesh_mqtt
                   > mesh_local > radio > satellite
   ────────────────────────────────────────────── */
const ADAPTER_PRIORITY = ["local","internet","p2p","mesh_mqtt","mesh_local","radio","satellite"];

class CommsRouter {
  constructor() {
    this._adapters   = new Map();
    this.delivery    = new DeliveryStatusService();
    this.queue       = new MessageQueueService(this.delivery);
    this.health      = new NetworkHealthMonitor();
    this.media       = new MediaTransferService();
    this._listeners  = { adapterChange: [], deliveryUpdate: [], healthUpdate: [], message: [] };
    this._lowBandwidth = false;
  }

  register(adapter) {
    this._adapters.set(adapter.id, adapter);
    this.health.register(adapter);
    adapter.onMessage(msg => this._onInbound(msg, adapter));
  }

  getAdapter(id) { return this._adapters.get(id); }
  getAll() { return [...this._adapters.values()]; }

  bestAdapter(msgType = "text") {
    for (const id of ADAPTER_PRIORITY) {
      const a = this._adapters.get(id);
      if (a && a.canSend(msgType)) return a;
    }
    return null;
  }

  async connectAll() {
    this.health.start();
    await Promise.allSettled(this.getAll().map(a => a.connect().catch(e => {
      a._setState("error", { lastError: e.message });
    })));
    this.queue.startRetry(this);
  }

  async send(message, fromQueue = false) {
    const msgId = message.id || _uid();
    message.id = msgId;
    message.ts = message.ts || Date.now();
    if (!fromQueue) this.delivery.create(msgId, "pending");

    const msgType = message.type || "text";
    const preferLow = this._lowBandwidth;

    // find best adapter that supports this message type
    let adapter = null;
    for (const id of ADAPTER_PRIORITY) {
      const a = this._adapters.get(id);
      if (!a || !a.canSend(msgType)) continue;
      if (preferLow && a.bandwidth === "high" && id !== "local") continue;  // skip high-BW in low-BW mode
      adapter = a; break;
    }

    if (!adapter) {
      // no route — queue
      this.delivery.update(msgId, "queued");
      if (!fromQueue) this.queue.enqueue(message);
      return { queued: true, msgId, reason: "No available route — message queued" };
    }

    // media check
    if (["images","voice","video"].includes(msgType)) {
      const blocked = this.media.reasonBlocked(adapter, msgType);
      if (blocked) { this.delivery.update(msgId, "failed", { error: blocked }); throw new Error(blocked); }
    }

    try {
      this.delivery.update(msgId, "sending", { adapterId: adapter.id });
      const result = await adapter.send(message);
      this.delivery.update(msgId, "delivered", { adapterId: adapter.id });
      return { ...result, msgId, adapter: adapter.id, delivered: true };
    } catch (e) {
      this.delivery.update(msgId, "failed", { error: e.message, adapterId: adapter.id });
      // try next adapter
      const fallback = this._nextAdapter(adapter.id, msgType);
      if (fallback) {
        this.delivery.update(msgId, "sending", { adapterId: fallback.id });
        try {
          const result = await fallback.send(message);
          this.delivery.update(msgId, "delivered", { adapterId: fallback.id });
          return { ...result, msgId, adapter: fallback.id, delivered: true, fallback: true };
        } catch (e2) {
          this.delivery.update(msgId, "failed", { error: e2.message });
          if (!fromQueue) this.queue.enqueue(message);
          throw new Error("All adapters failed — message queued");
        }
      }
      if (!fromQueue) this.queue.enqueue(message);
      throw new Error(e.message + " — message queued");
    }
  }

  _nextAdapter(currentId, msgType) {
    const idx = ADAPTER_PRIORITY.indexOf(currentId);
    for (let i = idx + 1; i < ADAPTER_PRIORITY.length; i++) {
      const a = this._adapters.get(ADAPTER_PRIORITY[i]);
      if (a && a.canSend(msgType)) return a;
    }
    return null;
  }

  setLowBandwidth(on) { this._lowBandwidth = on; }
  isLowBandwidth() { return this._lowBandwidth; }

  /* internal callbacks */
  _onAdapterChange(adapter) { this._listeners.adapterChange.forEach(fn => fn(adapter)); }
  _onDeliveryUpdate(rec)    { this._listeners.deliveryUpdate.forEach(fn => fn(rec)); }
  _onHealthUpdate(counts)   { this._listeners.healthUpdate.forEach(fn => fn(counts)); }
  _onInbound(msg, adapter)  { this._listeners.message.forEach(fn => fn({ ...msg, _adapter: adapter.id })); }

  on(event, fn) { if (this._listeners[event]) this._listeners[event].push(fn); }
}

function _uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* ── instantiate and expose globally ── */
const router = new CommsRouter();

router.register(new window.CommsAdapters.InternetAdapter());
router.register(new window.CommsAdapters.P2PAdapter());
router.register(new window.CommsAdapters.LocalNetworkAdapter());
router.register(new window.CommsAdapters.MeshtasticMqttAdapter());
router.register(new window.CommsAdapters.MeshtasticLocalAdapter());
router.register(new window.CommsAdapters.AegisRadioFallbackAdapter());
router.register(new window.CommsAdapters.SatelliteAdapter());

window.CommsRouter = router;
window.DeliveryStatusService = DeliveryStatusService;
window.MessageQueueService = MessageQueueService;
window.NetworkHealthMonitor = NetworkHealthMonitor;
window.MediaTransferService = MediaTransferService;
