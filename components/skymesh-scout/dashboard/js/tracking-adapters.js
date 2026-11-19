/* ============================================================
   AegisNet Expansion Layer — tracking-adapters.js
   Modular tracking adapter interface.
   Preserves all P3 aircraft tracking. Adds marine and team.

   TRACKING NOTICE:
   Data may be live, delayed, cached, simulated, or prototype.
   Do not treat any tracking source as guaranteed or complete.
   Marine tracking requires legal AIS sources or approved APIs.
   No paid source scraping. No API bypassing.
   No API keys exposed in guest config.
   ============================================================ */
"use strict";

/* ──────────────────────────────────────────────
   BASE TRACKING ADAPTER INTERFACE
   ────────────────────────────────────────────── */
class TrackingAdapter {
  constructor(id, displayName, sourceType) {
    this.id            = id;
    this.displayName   = displayName;
    this.sourceType    = sourceType;  // aircraft | vessel | team | asset
    this.status        = "offline";   // offline | connecting | live | delayed | cached | simulated | error
    this.dataQuality   = "unknown";   // live | delayed | cached | simulated | prototype
    this.lastUpdateAt  = null;
    this.objectCount   = 0;
    this.supportedTypes = [];
    this.confidenceLevel = "none";    // none | low | medium | high
    this.requiresApiKey  = false;
    this.prototypeOnly   = false;
    this.lastError       = null;
    this._listeners      = [];
    this._entities       = new Map();  // id -> normalized entity
  }
  /* Subclasses must implement: */
  async start()  { throw new Error(`${this.id}.start() not implemented`); }
  async stop()   {}
  async fetch()  { return []; }

  /* Shared helpers */
  _normalize(raw) { throw new Error(`${this.id}._normalize() not implemented`); }
  _setState(status, extra = {}) {
    this.status = status;
    Object.assign(this, extra);
    window.TrackingRouter?._onAdapterChange(this);
  }
  _store(entities) {
    this._entities.clear();
    for (const e of entities) this._entities.set(e.id, e);
    this.objectCount  = entities.length;
    this.lastUpdateAt = Date.now();
  }
  getEntities() { return [...this._entities.values()]; }
  onUpdate(fn) { this._listeners.push(fn); }
  _emit()      { this._listeners.forEach(fn => { try { fn(this.getEntities()); } catch {} }); }
  toStatus() {
    return {
      id: this.id, displayName: this.displayName, sourceType: this.sourceType,
      status: this.status, dataQuality: this.dataQuality,
      lastUpdateAt: this.lastUpdateAt, objectCount: this.objectCount,
      supportedTypes: this.supportedTypes, confidenceLevel: this.confidenceLevel,
      requiresApiKey: this.requiresApiKey, prototypeOnly: this.prototypeOnly,
      lastError: this.lastError
    };
  }
}

/* ──────────────────────────────────────────────
   AIRCRAFT TRACKING ADAPTER
   Wraps the P3 SOURCES.fetchAll() aircraft result.
   Modular wrapper — does not change P3 internals.
   ────────────────────────────────────────────── */
class AircraftTrackingAdapter extends TrackingAdapter {
  constructor() {
    super("aircraft", "Aircraft (ADS-B + online)", "aircraft");
    this.supportedTypes  = ["aircraft"];
    this.confidenceLevel = "high";
    this.dataQuality     = "live";
    this._timer = null;
  }
  async start() {
    this._setState("live", { dataQuality: "live" });
    // Aircraft data is driven by the main SOURCES poll loop in app.js.
    // This adapter simply mirrors the latest data from window._lastData.
    this._timer = setInterval(() => this._mirror(), 3000);
    this._mirror();
  }
  async stop() { clearInterval(this._timer); this._setState("offline"); }
  _mirror() {
    const data = window._lastData?.aircraft || [];
    const quality = window.SOURCES?.isLive() ? "live" : "simulated";
    this.dataQuality = quality;
    this._setState(quality === "live" ? "live" : "simulated", { dataQuality: quality });
    this._store(data.map(e => ({ ...e, _trackingSource: this.id })));
    this._emit();
  }
  _normalize(raw) { return raw; }  // already normalized by sources.js
}

/* ──────────────────────────────────────────────
   MARINE / VESSEL TRACKING ADAPTER

   Supported legal sources:
   a) MarineTraffic API (requires API key)
   b) AISHub (free registration, redistributed AIS)
   c) VesselFinder API (requires key)
   d) OpenCPN / local AIS decoder via serial (future)
   e) Demo feed (always available)

   Does NOT scrape paid websites.
   Does NOT bypass API restrictions.
   ────────────────────────────────────────────── */
class MarineTrackingAdapter extends TrackingAdapter {
  constructor() {
    super("marine", "Marine / AIS", "vessel");
    this.supportedTypes  = ["vessel","ferry","cargo","tanker","fishing","tug"];
    this.confidenceLevel = "medium";
    this.dataQuality     = "simulated";
    this.requiresApiKey  = true;
    this.prototypeOnly   = true;
    this._apiKey = "";
    this._timer  = null;
    this._useLiveApi = false;
  }
  configure(apiKey) {
    this._apiKey = apiKey;
    this._useLiveApi = !!apiKey;
  }
  async start() {
    this._setState("connecting");
    if (this._useLiveApi) {
      await this._tryLiveApi();
    } else {
      this._setState("simulated", { dataQuality: "simulated" });
      this._startDemoFeed();
    }
  }
  async stop() { clearInterval(this._timer); this._setState("offline"); }

  async _tryLiveApi() {
    // AISHub example — free with registration, returns JSON
    // https://www.aishub.net/api
    const lat = window.SOURCES?.CFG?.rxLat || 34.615;
    const lon = window.SOURCES?.CFG?.rxLon || -112.45;
    try {
      const url = `https://data.aishub.net/ws.php?username=${this._apiKey}&format=1&output=json&latmin=${lat-2}&latmax=${lat+2}&lonmin=${lon-2}&lonmax=${lon+2}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error("AISHub API error: " + r.status);
      const j = await r.json();
      const vessels = Array.isArray(j[1]) ? j[1] : [];
      const entities = vessels.map(v => this._normalize(v));
      this._store(entities);
      this._setState("live", { dataQuality: "live", confidenceLevel: "high" });
      this._emit();
      this._timer = setInterval(() => this._tryLiveApi(), 60000);
    } catch (e) {
      this._setState("degraded", { lastError: e.message, dataQuality: "cached" });
      this._startDemoFeed();
    }
  }
  _normalize(v) {
    return {
      type: "ship", id: String(v.MMSI || v.mmsi || Math.random()),
      name: v.NAME || v.name || "UNKNOWN VESSEL",
      callsign: v.CALLSIGN || v.callsign || "",
      lat: parseFloat(v.LATITUDE || v.lat || 0),
      lon: parseFloat(v.LONGITUDE || v.lon || 0),
      altitude: 0,
      speed: parseFloat(v.SPEED || v.speed || 0),
      heading: parseFloat(v.COURSE || v.heading || 0),
      source: "AISHub", lastSeen: Date.now(), status: "underway",
      _trackingSource: this.id,
      extra: {
        shipType: v.SHIPTYPE || v.type || "VESSEL",
        mmsi: v.MMSI || v.mmsi,
        destination: v.DESTINATION || ""
      }
    };
  }
  _startDemoFeed() {
    if (this._timer) return;
    this._timer = setInterval(() => {
      // Mirror demo ships from P3 sources
      const ships = window._lastData?.ships || [];
      this._store(ships.map(s => ({ ...s, _trackingSource: this.id })));
      this._emit();
    }, 4000);
    const ships = window._lastData?.ships || [];
    this._store(ships.map(s => ({ ...s, _trackingSource: this.id })));
    this._emit();
  }
}

/* ──────────────────────────────────────────────
   TEAM NODE TRACKING ADAPTER
   Reads from MESH_STATE nodes (MQTT / Meshtastic).
   Live when mesh bridge is connected.
   ────────────────────────────────────────────── */
class TeamNodeTrackingAdapter extends TrackingAdapter {
  constructor() {
    super("team", "Meshtastic Team Nodes", "team");
    this.supportedTypes  = ["team_node"];
    this.confidenceLevel = "high";
    this.dataQuality     = "live";
    this._timer = null;
  }
  async start() {
    this._setState("connecting");
    this._timer = setInterval(() => this._mirror(), 5000);
    this._mirror();
  }
  async stop() { clearInterval(this._timer); this._setState("offline"); }
  _mirror() {
    const nodes = window.MESH_STATE?.nodes || [];
    const connected = window.MESH_STATE?.connected;
    const entities = nodes.filter(n => n.lat && n.lon).map(n => ({
      type: "team_node", id: n.id,
      name: n.name || n.id, callsign: "",
      lat: n.lat, lon: n.lon, altitude: n.alt || 0,
      speed: 0, heading: 0,
      source: "Meshtastic", lastSeen: n.lastSeen || Date.now(), status: "active",
      _trackingSource: this.id,
      extra: { battery: n.battery, snr: n.snr }
    }));
    const quality = connected ? "live" : (entities.length ? "cached" : "simulated");
    this._setState(connected ? "live" : "degraded", { dataQuality: quality });
    this._store(entities);
    this._emit();
  }
  _normalize(raw) { return raw; }
}

/* ──────────────────────────────────────────────
   FUTURE ASSET TRACKING ADAPTER (placeholder)
   Drones, vehicles, custom mission assets.
   Disabled until real data source configured.
   ────────────────────────────────────────────── */
class FutureAssetTrackingAdapter extends TrackingAdapter {
  constructor() {
    super("future_asset", "Future Mission Assets", "asset");
    this.supportedTypes  = ["drone","vehicle","asset"];
    this.confidenceLevel = "none";
    this.dataQuality     = "prototype";
    this.prototypeOnly   = true;
  }
  async start() {
    this._setState("offline", { lastError: "No asset source configured. Placeholder only." });
  }
  _normalize(raw) { return raw; }
}

/* ── export ── */
window.TrackingAdapters = {
  TrackingAdapter, AircraftTrackingAdapter, MarineTrackingAdapter,
  TeamNodeTrackingAdapter, FutureAssetTrackingAdapter
};
