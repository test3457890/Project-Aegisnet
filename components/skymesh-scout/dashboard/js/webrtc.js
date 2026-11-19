/* ============================================================
   AegisNet Expansion Layer — webrtc.js
   WebRTCVoiceVideoService: P2P voice and video over internet.
   PushToTalkVoiceService: placeholder for future legal radio PTT.

   NOTICE:
   Voice and video require sufficient bandwidth.
   They do not work over Meshtastic, radio fallback, or satellite.
   The system automatically falls back to text when P2P fails.
   PushToTalkVoiceService does not transmit on any radio frequency
   in the current implementation. It is a placeholder only.
   ============================================================ */
"use strict";

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];

/* ──────────────────────────────────────────────
   CALL STATES
   idle | ringing | connecting | connected | ended | failed
   ────────────────────────────────────────────── */
class CallSession {
  constructor(id, peerId, type) {
    this.id       = id;
    this.peerId   = peerId;
    this.type     = type;   // voice | video | data
    this.state    = "idle";
    this.startedAt = null;
    this.endedAt  = null;
    this.quality  = null;   // good | fair | poor | unknown
    this.error    = null;
    this._pc      = null;
    this._localStream  = null;
    this._remoteStream = null;
  }
  duration() {
    if (!this.startedAt) return 0;
    return Math.floor(((this.endedAt || Date.now()) - this.startedAt) / 1000);
  }
}

/* ──────────────────────────────────────────────
   WEBRTC VOICE / VIDEO SERVICE
   ────────────────────────────────────────────── */
class WebRTCVoiceVideoService {
  constructor() {
    this._sessions  = new Map();
    this._listeners = { callState: [], inboundCall: [], message: [] };
    this._signalingFn = null;  // set by caller: fn(signal) -> send to peer
  }

  /* Signaling transport is intentionally decoupled.
     The caller provides a function that delivers SDP/ICE signals
     to the remote peer via MQTT, local server, or any other channel. */
  setSignaling(fn) { this._signalingFn = fn; }

  /* Handle a signal arriving from a peer */
  async handleSignal(signal) {
    const session = this._sessions.get(signal.sessionId);
    if (!session || !session._pc) return;
    if (signal.type === "answer")  await session._pc.setRemoteDescription(signal.sdp);
    if (signal.type === "ice" && signal.candidate) await session._pc.addIceCandidate(signal.candidate);
    if (signal.type === "offer") {
      // inbound call
      await session._pc.setRemoteDescription(signal.sdp);
      const answer = await session._pc.createAnswer();
      await session._pc.setLocalDescription(answer);
      this._signalingFn?.({ ...signal, type: "answer", sdp: answer, sessionId: signal.sessionId });
    }
    if (signal.type === "hangup") this._endSession(signal.sessionId, "remote hangup");
  }

  /* Start an outbound call */
  async call(peerId, type = "voice") {
    if (!navigator.mediaDevices) return this._fail(null, "Media devices not available in this browser");
    const sessionId = _uid();
    const session = new CallSession(sessionId, peerId, type);
    this._sessions.set(sessionId, session);
    this._emit("callState", session);
    try {
      session._pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      this._wirePC(session);
      // Get media
      const constraints = type === "video" ? { video: true, audio: true } : { audio: true };
      session._localStream = await navigator.mediaDevices.getUserMedia(constraints).catch(e => {
        throw new Error("Media access denied: " + e.message);
      });
      session._localStream.getTracks().forEach(t => session._pc.addTrack(t, session._localStream));
      // Create offer
      const offer = await session._pc.createOffer();
      await session._pc.setLocalDescription(offer);
      this._signalingFn?.({ type: "offer", sdp: offer, sessionId, peerId, callType: type });
      session.state = "ringing";
      this._emit("callState", session);
      return session;
    } catch (e) { return this._fail(session, e.message); }
  }

  /* Answer an inbound call */
  async answer(sessionId) {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error("No session " + sessionId);
    session.state = "connecting";
    this._emit("callState", session);
  }

  /* Hang up */
  hangup(sessionId) {
    this._signalingFn?.({ type: "hangup", sessionId });
    this._endSession(sessionId, "local hangup");
  }

  /* Data channel — text/image over P2P (no media needed) */
  async openDataChannel(peerId) {
    const sessionId = _uid();
    const session = new CallSession(sessionId, peerId, "data");
    this._sessions.set(sessionId, session);
    session._pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    this._wirePC(session);
    const dc = session._pc.createDataChannel("aegisnet-data", { ordered: true });
    dc.onopen    = () => { session.state = "connected"; session.startedAt = Date.now(); this._emit("callState", session); };
    dc.onmessage = e => { try { this._emit("message", JSON.parse(e.data)); } catch {} };
    session._dc = dc;
    const offer = await session._pc.createOffer();
    await session._pc.setLocalDescription(offer);
    this._signalingFn?.({ type: "offer", sdp: offer, sessionId, peerId, callType: "data" });
    return session;
  }

  sendData(sessionId, payload) {
    const session = this._sessions.get(sessionId);
    if (!session?._dc || session._dc.readyState !== "open") throw new Error("Data channel not open");
    session._dc.send(JSON.stringify(payload));
  }

  getSession(id) { return this._sessions.get(id); }
  getActiveSessions() { return [...this._sessions.values()].filter(s => ["ringing","connecting","connected"].includes(s.state)); }

  _wirePC(session) {
    const pc = session._pc;
    pc.onicecandidate = e => {
      if (e.candidate) this._signalingFn?.({ type: "ice", candidate: e.candidate, sessionId: session.id });
    };
    pc.ontrack = e => {
      session._remoteStream = e.streams[0];
      session.state = "connected";
      session.startedAt = session.startedAt || Date.now();
      this._emit("callState", session);
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "failed" || s === "disconnected") this._endSession(session.id, "connection " + s);
      if (s === "connected") session.quality = "good";
    };
    pc.onicegatheringstatechange = () => {};
    // Basic quality estimation via getStats
    const statsInterval = setInterval(async () => {
      if (!pc || pc.connectionState !== "connected") { clearInterval(statsInterval); return; }
      try {
        const stats = await pc.getStats();
        stats.forEach(r => {
          if (r.type === "candidate-pair" && r.state === "succeeded") {
            const rtt = r.currentRoundTripTime * 1000;
            session.quality = rtt < 100 ? "good" : rtt < 300 ? "fair" : "poor";
          }
        });
      } catch {}
    }, 5000);
  }

  _endSession(sessionId, reason) {
    const session = this._sessions.get(sessionId);
    if (!session) return;
    session.state = "ended";
    session.endedAt = Date.now();
    session.error = reason;
    session._localStream?.getTracks().forEach(t => t.stop());
    session._pc?.close();
    this._emit("callState", session);
    setTimeout(() => this._sessions.delete(sessionId), 30000);
  }

  _fail(session, msg) {
    if (session) { session.state = "failed"; session.error = msg; this._emit("callState", session); }
    return null;
  }

  on(event, fn) { if (this._listeners[event]) this._listeners[event].push(fn); }
  _emit(event, data) { (this._listeners[event] || []).forEach(fn => { try { fn(data); } catch {} }); }
}

/* ──────────────────────────────────────────────
   PUSH-TO-TALK VOICE SERVICE (placeholder)

   LEGAL NOTICE:
   This service is a PLACEHOLDER ONLY.
   It does NOT transmit on any radio frequency.
   Future activation requires:
   - Compatible licensed radio hardware
   - Appropriate license (FCC Part 97 or equivalent)
   - Legal approval for the intended use case
   - Organization approval if applicable
   PTT over radio is NOT available in prototype mode.
   ────────────────────────────────────────────── */
class PushToTalkVoiceService {
  constructor() {
    this.available     = false;
    this.prototypeOnly = true;
    this.state         = "unavailable";  // unavailable | ready | transmitting | receiving
    this._listeners    = [];
  }
  async initialize(hardwareConfig) {
    this.state = "unavailable";
    this._notify({ state: "unavailable", reason: "PTT radio hardware not configured. Placeholder only." });
    return false;
  }
  startTransmit() {
    this._notify({ state: "unavailable", reason: "PTT not available — no hardware configured" });
    window.toast?.("PTT unavailable: no radio hardware configured", "warn");
  }
  stopTransmit() {}
  on(fn) { this._listeners.push(fn); }
  _notify(ev) { this._listeners.forEach(fn => { try { fn(ev); } catch {} }); }
}

function _uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* ── instantiate ── */
const webrtcService = new WebRTCVoiceVideoService();
const pttService    = new PushToTalkVoiceService();

// Wire signaling through the MQTT bridge (available channel)
webrtcService.setSignaling(signal => {
  if (window.MQTT?.isConnected?.()) {
    window.MQTT.sendText("__SIGNAL__" + JSON.stringify(signal), "Admin");
  }
  // also try server relay
  fetch("api/signal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signal) }).catch(() => {});
});

// Handle inbound signals from MQTT
if (window.MESH_STATE) {
  const orig = window.MESH_STATE.onMessage;
  window.MESH_STATE.onMessage = msg => {
    orig?.(msg);
    if (msg?.text?.startsWith("__SIGNAL__")) {
      try { webrtcService.handleSignal(JSON.parse(msg.text.slice(10))); } catch {}
    }
  };
}

window.WebRTCService = webrtcService;
window.PTTService    = pttService;
