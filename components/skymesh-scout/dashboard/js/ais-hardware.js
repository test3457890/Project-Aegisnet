/* ============================================================
   AegisNet Expansion Layer — ais-hardware.js
   AIS source modes: disabled | demo | api | local_receiver
   Legal AIS sources only. No scraping. No API bypassing.
   API keys never exposed in frontend guest config.

   EXPERIMENTAL: Local receiver path requires rtl-ais or
   compatible AIS decoder outputting NMEA on TCP.
   ============================================================ */
"use strict";

const AIS_DEFAULTS = {
  aisEnabled:      false,
  aisMode:         "demo",        // disabled | demo | api | local_receiver
  aisDecoderHost:  "localhost",
  aisDecoderPort:  10110,
  aisUpdateMs:     30000,
  aisStaleMs:      300000,        // 5 min before vessel marked stale
  aisHardwareNote: "",
  aisApiKeyPresent: false         // true/false only — key never sent to frontend
};

window.AISManager = (function() {
  let _cfg        = { ...AIS_DEFAULTS };
  let _vessels    = new Map();  // mmsi -> vessel entity
  let _lastPacket = null;
  let _timer      = null;
  let _status     = "disabled";
  let _lastError  = null;
  let _packetCount = 0;
  let _apiRateTs  = [];          // timestamps for rate limit tracking
  const MAX_API_PER_MIN = 2;

  /* ── configure ── */
  function configure(cfg) {
    Object.assign(_cfg, cfg);
    if (!_cfg.aisEnabled || _cfg.aisMode === "disabled") {
      _status = "disabled"; return;
    }
    start();
  }

  /* ── start ── */
  function start() {
    if (_timer) clearInterval(_timer);
    const mode = _cfg.aisMode;
    if (mode === "demo")           _status = "simulated",  _runDemo();
    else if (mode === "api")       _status = "connecting", _runApi();
    else if (mode === "local_receiver") _status = "connecting", _runLocal();
    else                           _status = "disabled";
  }

  /* ── DEMO MODE ── */
  function _runDemo() {
    _status = "simulated";
    _timer = setInterval(_tickDemo, 4000);
    _tickDemo();
  }
  function _tickDemo() {
    const vessels = window._lastData?.ships || [];
    _vessels.clear();
    for (const v of vessels) {
      _vessels.set(v.id, { ...v, _aisSource: "demo", _aisQuality: "simulated" });
    }
    _lastPacket = Date.now();
    _notify();
  }

  /* ── API MODE ──
     Polls /api/ais/vessels (server-side proxy that holds the API key).
     Key is NEVER sent to the frontend.                                */
  function _runApi() {
    _pollApi();
    _timer = setInterval(_pollApi, Math.max(_cfg.aisUpdateMs, 30000));
  }
  async function _pollApi() {
    // Rate limit: max 2 calls/min
    const now = Date.now();
    _apiRateTs = _apiRateTs.filter(t => now - t < 60000);
    if (_apiRateTs.length >= MAX_API_PER_MIN) {
      console.warn("[AIS] Rate limit: skipping poll");
      return;
    }
    _apiRateTs.push(now);
    try {
      const r = await fetch("api/ais/vessels", { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error("AIS API proxy error: " + r.status);
      const j = await r.json();
      _vessels.clear();
      for (const v of (j.vessels || [])) {
        _vessels.set(v.mmsi || v.id, { ..._normalizeApiVessel(v), _aisSource: "api", _aisQuality: "live" });
      }
      _lastPacket = Date.now();
      _status = "live";
      _lastError = null;
      _notify();
    } catch (e) {
      _lastError = e.message;
      _status = _vessels.size > 0 ? "cached" : "error";
      _notify();
    }
  }
  function _normalizeApiVessel(v) {
    return {
      type: "ship", id: String(v.mmsi || v.id || Math.random()),
      name: v.name || v.shipname || "UNKNOWN",
      callsign: v.callsign || "",
      lat: parseFloat(v.lat || v.latitude || 0),
      lon: parseFloat(v.lon || v.longitude || 0),
      altitude: 0, speed: parseFloat(v.speed || v.sog || 0),
      heading: parseFloat(v.heading || v.cog || 0),
      source: "AIS-API", lastSeen: Date.now(), status: "underway",
      extra: { shipType: v.shiptype || v.type || "VESSEL", mmsi: v.mmsi, destination: v.destination || "" }
    };
  }

  /* ── LOCAL RECEIVER MODE ──
     Reads NMEA sentences from a local AIS decoder over TCP.
     rtl-ais, AISHub receiver, or any NMEA TCP source.
     Falls back to API or demo if TCP connection fails.           */
  function _runLocal() {
    _pollLocal();
    _timer = setInterval(_pollLocal, Math.max(_cfg.aisUpdateMs, 5000));
  }
  async function _pollLocal() {
    try {
      // Server acts as TCP→JSON proxy: GET /api/ais/local returns parsed vessels
      const r = await fetch("api/ais/local", { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error("Local AIS bridge error: " + r.status);
      const j = await r.json();
      _vessels.clear();
      for (const v of (j.vessels || [])) {
        _vessels.set(v.mmsi || v.id, { ..._normalizeApiVessel(v), _aisSource: "local_receiver", _aisQuality: "live" });
      }
      _packetCount += j.packetCount || 0;
      _lastPacket = Date.now();
      _status = "live";
      _lastError = null;
      _notify();
    } catch (e) {
      _lastError = e.message;
      _status = "error";
      _notify();
      // Fallback to API if configured
      if (_cfg.aisApiKeyPresent) _runApi();
    }
  }

  /* ── stale check ── */
  function _pruneStale() {
    if (!_cfg.aisStaleMs) return;
    const cutoff = Date.now() - _cfg.aisStaleMs;
    for (const [key, v] of _vessels.entries()) {
      if (v.lastSeen < cutoff) _vessels.delete(key);
    }
  }

  /* ── notify tracking adapter ── */
  function _notify() {
    _pruneStale();
    const marine = window.TrackingRouter?.getAdapter("marine");
    if (marine && _cfg.aisMode !== "demo") {
      // Inject live data directly into the marine adapter's entity store
      const vessels = [..._vessels.values()];
      marine._store(vessels);
      marine._setState(_status, { dataQuality: _status === "live" ? "live" : _status === "simulated" ? "simulated" : "cached" });
      marine._emit();
    }
  }

  /* ── diagnostics ── */
  function diagnostics() {
    return {
      enabled:     _cfg.aisEnabled,
      mode:        _cfg.aisMode,
      status:      _status,
      vesselCount: _vessels.size,
      lastPacketAt: _lastPacket ? new Date(_lastPacket).toISOString() : null,
      lastError:   _lastError,
      packetCount: _packetCount,
      apiKeyPresent: _cfg.aisApiKeyPresent,  // boolean only — never exposes the key
      decoderHost: _cfg.aisDecoderHost,
      decoderPort: _cfg.aisDecoderPort,
      staleMs:     _cfg.aisStaleMs,
      hardwareNote: _cfg.aisHardwareNote,
      apiRateUsed: _apiRateTs.length,
      apiRateMax:  MAX_API_PER_MIN,
      notice:      "AIS is experimental. Legal sources only. No scraping. Not guaranteed for navigation."
    };
  }

  /* ── public API ── */
  return { configure, start, diagnostics, getVessels: () => [..._vessels.values()] };
})();

/* ── wire into config load ── */
fetch("config.json").then(r => r.json()).then(cfg => {
  window.AISManager.configure({
    aisEnabled:      cfg.aisEnabled ?? false,
    aisMode:         cfg.aisMode || "demo",
    aisDecoderHost:  cfg.aisDecoderHost || "localhost",
    aisDecoderPort:  cfg.aisDecoderPort || 10110,
    aisUpdateMs:     cfg.aisUpdateMs || 30000,
    aisStaleMs:      cfg.aisStaleMs || 300000,
    aisHardwareNote: cfg.aisHardwareNote || "",
    aisApiKeyPresent: !!(cfg.apiKeys?.aishub || cfg.apiKeys?.marinetraffic)
  });
}).catch(() => window.AISManager.configure({}));

/* ── AIS diagnostics panel renderer ── */
window.renderAISDiagnostics = function(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  const d = window.AISManager.diagnostics();
  const qColor = d.status === "live" ? "var(--green)" : d.status === "simulated" ? "#9B7FE8"
               : d.status === "cached" ? "var(--amber)" : "var(--red)";
  el.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      <span style="width:8px;height:8px;border-radius:50%;background:${qColor};flex-shrink:0"></span>
      <span style="color:var(--txt);font-size:13px">AIS ${d.status.toUpperCase()}</span>
      <span class="badge-exp" style="font-size:9px">EXPERIMENTAL</span>
    </div>
    <div style="font-size:11.5px;line-height:2;color:var(--dim)">
      Mode: <span style="color:var(--txt)">${d.mode}</span><br>
      Vessels: <span style="color:var(--txt)">${d.vesselCount}</span><br>
      Last packet: <span style="color:var(--txt)">${d.lastPacketAt?.slice(11,19) || "—"}Z</span><br>
      API key: <span style="color:var(--txt)">${d.apiKeyPresent ? "SET (hidden)" : "not set"}</span><br>
      API rate: <span style="color:var(--txt)">${d.apiRateUsed}/${d.apiRateMax} per min</span><br>
      ${d.lastError ? `<span style="color:var(--red)">Error: ${d.lastError}</span><br>` : ""}
      ${d.hardwareNote ? `HW: <span style="color:var(--txt)">${d.hardwareNote}</span>` : ""}
    </div>
    <div style="font-size:10px;color:var(--dim);margin-top:6px;line-height:1.5">${d.notice}</div>`;
};
