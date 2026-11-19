/* ============================================================
   AegisNet Expansion Layer — comms-adapters.js
   Modular communications adapter interface + implementations.
   Designed to be copied into the main AegisNet codebase later.

   PROTOTYPE NOTICE:
   This is a prototype communications framework.
   Not emergency-certified. Not CAP-approved.
   Does not use CAP, police, fire, EMS, aviation, or public
   safety radios. Does not transmit on restricted frequencies.
   Radio use depends on local laws, licensing, and hardware.
   Satellite support is a placeholder only.
   ============================================================ */
"use strict";

/* ──────────────────────────────────────────────
   BASE INTERFACE
   Every adapter must implement this contract.
   ────────────────────────────────────────────── */
class CommsAdapter {
  constructor(id, displayName) {
    this.id          = id;
    this.displayName = displayName;
    this.status      = "offline";   // offline | connecting | ready | degraded | error
    this.latencyMs   = null;
    this.bandwidth   = "none";      // none | low | medium | high
    this.supports    = { text: false, images: false, voice: false, video: false, location: false };
    this.prototypeOnly   = false;
    this.requiresApproval = false;
    this.lastError   = null;
    this.lastSentAt  = null;
    this._listeners  = [];
  }
  /* Subclasses must implement: */
  async connect() { throw new Error(`${this.id}.connect() not implemented`); }
  async disconnect() {}
  async send(message) { throw new Error(`${this.id}.send() not implemented`); }
  isAvailable() { return this.status === "ready" || this.status === "degraded"; }
  canSend(msgType) { return this.isAvailable() && (this.supports[msgType] ?? false); }
  onMessage(fn) { this._listeners.push(fn); }
  _emit(msg) { this._listeners.forEach(fn => { try { fn(msg); } catch {} }); }
  _setState(status, extra = {}) {
    this.status = status;
    Object.assign(this, extra);
    window.CommsRouter?._onAdapterChange(this);
  }
  toStatus() {
    return {
      id: this.id, displayName: this.displayName, status: this.status,
      latencyMs: this.latencyMs, bandwidth: this.bandwidth,
      supports: { ...this.supports },
      prototypeOnly: this.prototypeOnly, requiresApproval: this.requiresApproval,
      lastError: this.lastError, lastSentAt: this.lastSentAt
    };
  }
}

/* ──────────────────────────────────────────────
   1. INTERNET ADAPTER
   Standard fetch/WebSocket over internet.
   ────────────────────────────────────────────── */
class InternetAdapter extends CommsAdapter {
  constructor() {
    super("internet", "Internet");
    this.supports = { text: true, images: true, voice: true, video: true, location: true };
    this.bandwidth = "high";
  }
  async connect() {
    this._setState("connecting");
    const t0 = Date.now();
    try {
      await fetch("https://www.gstatic.com/generate_204", { method: "HEAD", mode: "no-cors", cache: "no-store", signal: AbortSignal.timeout(5000) });
      this._setState("ready", { latencyMs: Date.now() - t0, bandwidth: "high" });
    } catch {
      this._setState("error", { lastError: "No internet connectivity" });
    }
  }
  async send(message) {
    if (!this.isAvailable()) throw new Error("Internet not available");
    // Relay through the local server's /api/comms/send endpoint
    const r = await fetch("api/comms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...message, adapter: this.id })
    });
    if (!r.ok) throw new Error("Server relay failed: " + r.status);
    this.lastSentAt = Date.now();
    return await r.json();
  }
}

/* ──────────────────────────────────────────────
   2. P2P ADAPTER (WebRTC data channel transport)
   Text and images over direct P2P connection.
   Voice/video handled by WebRTCService separately.
   ────────────────────────────────────────────── */
class P2PAdapter extends CommsAdapter {
  constructor() {
    super("p2p", "P2P Direct");
    this.supports = { text: true, images: true, voice: false, video: false, location: true };
    this.bandwidth = "high";
    this._pc = null;
    this._dc = null;
    this._peerId = null;
  }
  async connect(peerId, signalingFn) {
    this._peerId = peerId;
    this._setState("connecting");
    try {
      this._pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      this._dc = this._pc.createDataChannel("aegisnet-comms", { ordered: true });
      this._dc.onopen  = () => this._setState("ready",   { latencyMs: 0, bandwidth: "high" });
      this._dc.onclose = () => this._setState("offline");
      this._dc.onerror = e => this._setState("error", { lastError: e.message });
      this._dc.onmessage = e => { try { this._emit(JSON.parse(e.data)); } catch {} };
      this._pc.onicecandidate = e => signalingFn?.({ type: "ice", candidate: e.candidate });
      const offer = await this._pc.createOffer();
      await this._pc.setLocalDescription(offer);
      signalingFn?.({ type: "offer", sdp: offer });
    } catch (e) {
      this._setState("error", { lastError: e.message });
    }
  }
  async handleSignal(signal) {
    if (!this._pc) return;
    if (signal.type === "answer") await this._pc.setRemoteDescription(signal.sdp);
    if (signal.type === "ice" && signal.candidate) await this._pc.addIceCandidate(signal.candidate);
  }
  async send(message) {
    if (!this._dc || this._dc.readyState !== "open") throw new Error("P2P channel not open");
    this._dc.send(JSON.stringify(message));
    this.lastSentAt = Date.now();
  }
  async disconnect() { this._pc?.close(); this._setState("offline"); }
}

/* ──────────────────────────────────────────────
   3. LOCAL NETWORK ADAPTER
   LAN/hotspot — direct to server on same network.
   ────────────────────────────────────────────── */
class LocalNetworkAdapter extends CommsAdapter {
  constructor() {
    super("local", "Local Network");
    this.supports = { text: true, images: true, voice: true, video: true, location: true };
    this.bandwidth = "high";
  }
  async connect() {
    this._setState("connecting");
    const t0 = Date.now();
    try {
      const r = await fetch("api/ping", { cache: "no-store", signal: AbortSignal.timeout(3000) });
      if (r.ok) this._setState("ready", { latencyMs: Date.now() - t0, bandwidth: "high" });
      else throw new Error("ping failed");
    } catch { this._setState("offline"); }
  }
  async send(message) {
    if (!this.isAvailable()) throw new Error("Local network not available");
    const r = await fetch("api/comms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...message, adapter: this.id })
    });
    this.lastSentAt = Date.now();
    return r.ok ? await r.json() : Promise.reject("Local relay failed");
  }
}

/* ──────────────────────────────────────────────
   4. MESHTASTIC MQTT ADAPTER
   Wraps the existing MQTT bridge from mqtt.js.
   Low bandwidth — text, location, short alerts only.
   ────────────────────────────────────────────── */
class MeshtasticMqttAdapter extends CommsAdapter {
  constructor() {
    super("mesh_mqtt", "Meshtastic MQTT");
    this.supports = { text: true, images: false, voice: false, video: false, location: true };
    this.bandwidth = "low";
  }
  async connect() {
    this._setState("connecting");
    // Delegate to existing MQTT module from mqtt.js
    if (window.MQTT) {
      window.enableMqtt();
      // Poll until connected or timeout
      let tries = 0;
      await new Promise(res => {
        const check = setInterval(() => {
          tries++;
          if (window.MESH_STATE?.connected) { clearInterval(check); this._setState("ready", { latencyMs: 300, bandwidth: "low" }); res(); }
          if (tries > 12) { clearInterval(check); this._setState("degraded", { lastError: "MQTT slow to connect" }); res(); }
        }, 1000);
      });
    } else { this._setState("error", { lastError: "MQTT module not loaded" }); }
  }
  async send(message) {
    if (!window.MQTT || !window.MESH_STATE?.connected) throw new Error("MQTT not connected");
    if (message.type === "text" || message.type === "checkin" || message.type === "alert") {
      window.MQTT.sendText(message.text || message.content || JSON.stringify(message));
      this.lastSentAt = Date.now();
    } else { throw new Error("MQTT adapter: message type not supported — text/checkin/alert only"); }
  }
  isAvailable() { return !!window.MESH_STATE?.connected; }
}

/* ──────────────────────────────────────────────
   5. MESHTASTIC LOCAL / SERIAL ADAPTER (placeholder)
   Direct serial connection to a local Meshtastic node.
   Bypasses MQTT — works without internet.
   Requires: Python bridge running on the Pi.
   ────────────────────────────────────────────── */
class MeshtasticLocalAdapter extends CommsAdapter {
  constructor() {
    super("mesh_local", "Meshtastic Serial");
    this.supports = { text: true, images: false, voice: false, video: false, location: true };
    this.bandwidth = "low";
    this.prototypeOnly = true;
  }
  async connect() {
    this._setState("connecting");
    try {
      // Checks if the Python bridge exposes a serial health endpoint
      const r = await fetch("api/mesh/serial/health", { signal: AbortSignal.timeout(3000) });
      if (r.ok) this._setState("ready", { latencyMs: null, bandwidth: "low" });
      else this._setState("offline", { lastError: "Serial bridge not running" });
    } catch { this._setState("offline", { lastError: "Serial bridge unreachable" }); }
  }
  async send(message) {
    const r = await fetch("api/mesh/send", { method: "POST", body: message.text || message.content || "" });
    if (!r.ok) throw new Error("Serial send failed");
    this.lastSentAt = Date.now();
  }
}

/* ──────────────────────────────────────────────
   6. AEGISNET RADIO FALLBACK ADAPTER

   LEGAL NOTICE — READ BEFORE ENABLING:
   This adapter is for organization-approved,
   user-owned radio hardware only. It does NOT
   connect to CAP, police, fire, EMS, aviation,
   government, or any public safety radio network.
   It does NOT transmit on restricted frequencies.
   Frequency selection and transmit power are the
   sole responsibility of the licensed operator.
   Prototype/simulator mode only until hardware
   and legal configuration are verified.
   ────────────────────────────────────────────── */
class AegisRadioFallbackAdapter extends CommsAdapter {
  constructor() {
    super("radio", "AegisNet Radio Fallback");
    this.supports  = { text: true, images: false, voice: false, video: false, location: true };
    this.bandwidth = "low";
    this.prototypeOnly   = true;
    this.requiresApproval = true;
    this._mode     = "simulator";   // simulator | hardware
    this._queue    = [];
    this._simDelay = 1400;
  }
  async connect() {
    this._setState("connecting");
    if (this._mode === "simulator") {
      await _delay(600);
      this._setState("ready", { latencyMs: 1400, bandwidth: "low" });
      this._startSimReceiver();
    } else {
      // hardware path — check Pi bridge endpoint
      try {
        const r = await fetch("api/radio/health", { signal: AbortSignal.timeout(4000) });
        if (r.ok) this._setState("ready", { latencyMs: null, bandwidth: "low" });
        else this._setState("offline", { lastError: "Radio bridge not running" });
      } catch { this._setState("offline", { lastError: "Radio hardware unreachable" }); }
    }
  }
  async send(message) {
    if (this._mode === "simulator") {
      await _delay(this._simDelay);
      const sim = {
        ...message, id: _uid(), adapter: this.id,
        deliveredAt: Date.now(), simulated: true,
        warning: "SIMULATED RADIO — not a real transmission"
      };
      this.lastSentAt = Date.now();
      return sim;
    }
    // hardware path
    const r = await fetch("api/radio/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message.text || message.content || "", ...message })
    });
    if (!r.ok) throw new Error("Radio send failed: " + r.status);
    this.lastSentAt = Date.now();
    return await r.json();
  }
  setMode(mode) {
    this._mode = mode;
    if (mode === "simulator") this._setState("ready", { latencyMs: 1400, bandwidth: "low" });
    else this._setState("offline");
  }
  _startSimReceiver() {
    // Occasional simulated inbound messages for demo
    if (this._simTimer) return;
    this._simTimer = setInterval(() => {
      if (Math.random() > 0.85) {
        this._emit({
          id: _uid(), adapter: this.id, type: "text", simulated: true,
          from: "SIM-NODE-" + Math.floor(Math.random() * 9),
          text: ["CHECK-IN: OK", "STATUS: MOVING", "ALERT: AC nearby", "RADIO TEST"][Math.floor(Math.random() * 4)],
          ts: Date.now()
        });
      }
    }, 12000);
  }
}

/* ──────────────────────────────────────────────
   7. SATELLITE ADAPTER (placeholder)
   For future integration with Starlink, Iridium,
   Garmin inReach, SPOT, or similar services.
   Disabled until real hardware/service configured.
   ────────────────────────────────────────────── */
class SatelliteAdapter extends CommsAdapter {
  constructor() {
    super("satellite", "Satellite");
    this.supports  = { text: true, images: false, voice: false, video: false, location: true };
    this.bandwidth = "low";
    this.prototypeOnly   = true;
    this.requiresApproval = true;
  }
  async connect() {
    this._setState("offline", { lastError: "Satellite: no hardware configured. Placeholder only." });
  }
  async send() { throw new Error("Satellite adapter: no hardware configured"); }
}

/* ── utils ── */
function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function _uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* ── export to global scope (AegisNet merge target) ── */
window.CommsAdapters = {
  CommsAdapter, InternetAdapter, P2PAdapter, LocalNetworkAdapter,
  MeshtasticMqttAdapter, MeshtasticLocalAdapter,
  AegisRadioFallbackAdapter, SatelliteAdapter
};
