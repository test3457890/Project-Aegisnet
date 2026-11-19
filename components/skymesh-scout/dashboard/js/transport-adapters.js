/* ============================================================
   AegisNet P4.3 — transport-adapters.js
   Adds TorTransportAdapter and PrivateTunnelAdapter to the
   existing CommsAdapters registry.

   IMPORTANT NOTICES:
   - Tor is OPTIONAL and DISABLED BY DEFAULT.
   - Tor does NOT route voice, video, or large media.
   - Tor is NOT an anonymity guarantee.
   - Tor may be slower or unstable depending on network.
   - PrivateTunnel is a PLACEHOLDER — requires external setup.
   - This is not a commercial VPN.
   - Property owners must know what network services are enabled.
   ============================================================ */
"use strict";

/* ── pull in base class from existing registry ── */


/* ══════════════════════════════════════════════
   TOR TRANSPORT ADAPTER
   Optional fallback for text/status only.
   Uses local Tor SOCKS proxy (127.0.0.1:9050 default).
   Dashboard remote access concept only.
══════════════════════════════════════════════ */
class TorTransportAdapter extends window.CommsAdapters.CommsAdapter {
  constructor() {
    super("tor", "Tor Fallback");
    /* Tor only supports text and status — never voice/video/images */
    this.supports    = { text: true, images: false, voice: false, video: false, location: true };
    this.bandwidth   = "low";
    this.prototypeOnly    = true;
    this.requiresApproval = true;
    this._enabled    = false;
    this._socksHost  = "127.0.0.1";
    this._socksPort  = 9050;
    this._onionAddr  = "";   // never hardcoded — set by owner config only
    this.warnings = [
      "Tor fallback is optional and disabled by default.",
      "Tor does not route voice, video, or large media.",
      "Tor is not an anonymity guarantee.",
      "Tor may be slower or unstable depending on network conditions.",
      "No hardcoded onion addresses. Owner must configure.",
      "Not intended for low-latency operations.",
      "Property owners must know this service is enabled."
    ];
  }

  configure(opts = {}) {
    this._enabled   = opts.enabled   ?? false;
    this._socksHost = opts.socksHost ?? "127.0.0.1";
    this._socksPort = opts.socksPort ?? 9050;
    this._onionAddr = opts.onionAddr ?? "";
    if (!this._enabled) this._setState("offline");
  }

  async connect() {
    if (!this._enabled) {
      this._setState("offline", { lastError: "Tor disabled by user. Enable in Network Settings." });
      return;
    }
    this._setState("connecting");
    /* In a real deployment the Pi would run Tor and expose a SOCKS5 proxy.
       Here we check if the server-side /api/tor/status endpoint says the
       proxy is reachable. Falls back gracefully if not configured. */
    try {
      const r = await fetch("api/tor/status", { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const j = await r.json();
        if (j.running) {
          this._setState("ready", { latencyMs: null, bandwidth: "low" });
        } else {
          this._setState("offline", { lastError: "Tor daemon not running on this node" });
        }
      } else {
        this._setState("offline", { lastError: "Tor status endpoint not available" });
      }
    } catch {
      this._setState("offline", { lastError: "Tor SOCKS proxy unreachable — not installed or not running" });
    }
  }

  async send(message) {
    /* Enforce: text and location only over Tor */
    if (message.type && !["text","checkin","alert","location","status"].includes(message.type)) {
      throw new Error(`Tor adapter: '${message.type}' blocked — Tor is text/status only`);
    }
    if (!this.isAvailable()) throw new Error("Tor adapter not available");
    const r = await fetch("api/tor/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...message, adapter: this.id })
    });
    if (!r.ok) throw new Error("Tor send failed: " + r.status);
    this.lastSentAt = Date.now();
    return await r.json();
  }

  canSend(msgType) {
    if (!this._enabled || !this.isAvailable()) return false;
    /* Hard block on media regardless of enabled state */
    if (["images","voice","video"].includes(msgType)) return false;
    return this.supports[msgType] ?? false;
  }

  getConfig() {
    return {
      enabled: this._enabled,
      socksHost: this._socksHost,
      socksPort: this._socksPort,
      onionConfigured: !!this._onionAddr,
      warnings: this.warnings
    };
  }
}

/* ══════════════════════════════════════════════
   PRIVATE TUNNEL ADAPTER
   Placeholder for WireGuard, Tailscale, or similar.
   Does not install these tools — represents the
   transport path when they are already configured.
══════════════════════════════════════════════ */
class PrivateTunnelAdapter extends window.CommsAdapters.CommsAdapter {
  constructor() {
    super("tunnel", "Private Tunnel");
    this.supports    = { text: true, images: true, voice: true, video: true, location: true };
    this.bandwidth   = "high";
    this.prototypeOnly    = true;
    this.requiresApproval = true;
    this._tunnelType = "unset";    // wireguard | tailscale | openvpn | custom
    this._peerCount  = 0;
    this._localTunnelIp = null;
    this._subnetRouting = false;
    this._configured = false;
  }

  configure(opts = {}) {
    this._tunnelType    = opts.tunnelType    ?? "unset";
    this._configured    = opts.configured    ?? false;
    this._localTunnelIp = opts.localTunnelIp ?? null;
    this._subnetRouting = opts.subnetRouting ?? false;
  }

  async connect() {
    if (!this._configured) {
      this._setState("offline", { lastError: "Private tunnel not configured — requires external setup by owner" });
      return;
    }
    this._setState("connecting");
    try {
      const r = await fetch("api/tunnel/status", { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const j = await r.json();
        this._peerCount    = j.peers ?? 0;
        this._localTunnelIp = j.localIp ?? null;
        this._subnetRouting = j.subnetRouting ?? false;
        if (j.connected) {
          this._setState("ready", { latencyMs: j.latencyMs ?? null, bandwidth: "high" });
        } else {
          this._setState("offline", { lastError: "Tunnel interface not connected" });
        }
      } else {
        this._setState("offline", { lastError: "Tunnel status endpoint unavailable" });
      }
    } catch {
      this._setState("offline", { lastError: "Tunnel not running on this node" });
    }
  }

  async send(message) {
    if (!this.isAvailable()) throw new Error("Tunnel not connected");
    const r = await fetch("api/tunnel/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...message, adapter: this.id })
    });
    if (!r.ok) throw new Error("Tunnel send failed: " + r.status);
    this.lastSentAt = Date.now();
    return await r.json();
  }

  getStatus() {
    return {
      configured:     this._configured,
      tunnelType:     this._tunnelType,
      connected:      this.status === "ready",
      peerCount:      this._peerCount,
      localTunnelIp:  this._localTunnelIp,
      subnetRouting:  this._subnetRouting,
      lastError:      this.lastError
    };
  }
}

/* ── Register the new adapters ── */
if (window.CommsRouter) {
  window.CommsRouter.register(new TorTransportAdapter());
  window.CommsRouter.register(new PrivateTunnelAdapter());
}

/* ── Extend CommsAdapters registry ── */
Object.assign(window.CommsAdapters, { TorTransportAdapter, PrivateTunnelAdapter });

/* ── Load config ── */
fetch("config.json").then(r => r.json()).then(cfg => {
  const tor = window.CommsRouter?.getAdapter("tor");
  if (tor) tor.configure({
    enabled:   cfg.torEnabled   ?? false,
    socksHost: cfg.torSocksHost ?? "127.0.0.1",
    socksPort: cfg.torSocksPort ?? 9050,
    onionAddr: cfg.torOnionAddr ?? ""
  });
  const tunnel = window.CommsRouter?.getAdapter("tunnel");
  if (tunnel) tunnel.configure({
    tunnelType:     cfg.tunnelType    ?? "unset",
    configured:     cfg.tunnelEnabled ?? false,
    localTunnelIp:  cfg.tunnelLocalIp ?? null,
    subnetRouting:  cfg.tunnelSubnet  ?? false
  });
}).catch(() => {});
