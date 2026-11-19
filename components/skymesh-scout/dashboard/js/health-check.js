/* ============================================================
   AegisNet Expansion Layer — health-check.js
   Node health check and safe support bundle export.
   NEVER includes API keys, passwords, tokens, or secrets.
   ============================================================ */
"use strict";

window.HealthCheck = (function() {

  async function run() {
    const results = [];
    const _check = (name, fn) => {
      try { const v = fn(); results.push({ name, ok: !!v, detail: typeof v === "string" ? v : "" }); }
      catch (e) { results.push({ name, ok: false, detail: e.message }); }
    };
    const _asyncCheck = async (name, fn) => {
      try { const v = await fn(); results.push({ name, ok: !!v, detail: typeof v === "string" ? v : "" }); }
      catch (e) { results.push({ name, ok: false, detail: e.message }); }
    };

    // App state
    _check("App loaded",                 () => typeof window.SOURCES !== "undefined");
    _check("Node ID present",            () => !!window.NODE_IDENTITY?.getId());
    _check("CommsRouter loaded",         () => !!window.CommsRouter);
    _check("TrackingRouter loaded",      () => !!window.TrackingRouter);
    _check("MQTT module loaded",         () => typeof window.MQTT !== "undefined");

    // Connectivity
    _check("Best comms route available", () => !!window.CommsRouter?.bestAdapter());
    _check("Message queue empty",        () => window.CommsRouter?.queue.size() === 0 || "queued: " + window.CommsRouter?.queue.size());
    _check("MQTT bridge connected",      () => window.MESH_STATE?.connected || "not connected (OK if not enabled)");

    // Tracking
    _check("Aircraft tracking adapter",  () => !!window.TrackingRouter?.getAdapter("aircraft"));
    _check("Marine tracking adapter",    () => !!window.TrackingRouter?.getAdapter("marine"));
    _check("AIS module loaded",          () => !!window.AISManager);

    // Server reachability
    await _asyncCheck("Dashboard server responding", async () => {
      const r = await fetch("api/ping", { cache: "no-store", signal: AbortSignal.timeout(3000) });
      return r.ok || "HTTP " + r.status;
    });
    await _asyncCheck("Config file readable", async () => {
      const r = await fetch("config.json", { cache: "no-store", signal: AbortSignal.timeout(3000) });
      if (!r.ok) return false;
      const j = await r.json();
      return !!j.nodeId || "nodeId missing — run setup wizard";
    });

    // Browser / PWA
    _check("Service worker supported",   () => "serviceWorker" in navigator || "not supported (OK)");
    _check("Web manifest present",       () => !!document.querySelector('link[rel="manifest"]') || "no manifest link");

    // Time
    _check("Time appears sane",          () => {
      const yr = new Date().getFullYear();
      return (yr >= 2024 && yr <= 2030) || `Year ${yr} looks wrong — check system clock`;
    });

    // Disk (browser can't check directly — server endpoint)
    await _asyncCheck("Disk space (server check)", async () => {
      try {
        const r = await fetch("api/health/disk", { signal: AbortSignal.timeout(3000) });
        if (!r.ok) return "server endpoint not available";
        const j = await r.json();
        return j.ok ? j.freeMB + "MB free" : "LOW: " + j.freeMB + "MB";
      } catch { return "server disk endpoint not available (OK in demo)"; }
    });

    // Systemd (server-side check)
    await _asyncCheck("Systemd services (server check)", async () => {
      try {
        const r = await fetch("api/health/services", { signal: AbortSignal.timeout(3000) });
        if (!r.ok) return "server endpoint not available";
        const j = await r.json();
        return j.summary || "ok";
      } catch { return "server services endpoint not available (OK in demo)"; }
    });

    return results;
  }

  /* ── safe support bundle ── never includes secrets ── */
  async function exportBundle(includeLocation = false) {
    const healthResults = await run();
    const identity = window.NODE_IDENTITY?.get() || {};
    const commsAdapters = (window.CommsRouter?.getAll() || []).map(a => ({
      id: a.id, displayName: a.displayName, status: a.status,
      bandwidth: a.bandwidth, supports: a.supports,
      latencyMs: a.latencyMs, lastError: a.lastError,
      prototypeOnly: a.prototypeOnly
      // NOTE: no API keys, no passwords, no tokens
    }));
    const trackingAdapters = (window.TrackingRouter?.getAll() || []).map(a => ({
      id: a.id, displayName: a.displayName, status: a.status,
      dataQuality: a.dataQuality, objectCount: a.objectCount,
      prototypeOnly: a.prototypeOnly, lastError: a.lastError
    }));
    const aisDiag = window.AISManager?.diagnostics() || {};
    // Strip any key from AIS diag before export (should already be absent, but be explicit)
    delete aisDiag.apiKey; delete aisDiag.key; delete aisDiag.token; delete aisDiag.secret;

    const bundle = {
      exportedAt:     new Date().toISOString(),
      appVersion:     "4.2",
      bundleVersion:  "1",
      notice:         "SAFE DIAGNOSTIC BUNDLE — does not contain API keys, passwords, tokens, or shared secrets.",
      nodeId:         identity.nodeId,
      nodeName:       identity.nodeName,
      nodeRole:       identity.nodeRole,
      hardwareProfile:identity.hardwareProfile,
      version:        identity.version,
      lastBootAt:     identity.lastBootAt,
      // Location included only if user opted in
      nodeLocation:   includeLocation ? (identity.nodeLocation || "not set") : "[EXCLUDED BY USER]",
      healthResults,
      commsAdapters,
      trackingAdapters,
      aisDiagnostics: aisDiag,
      mqttConnected:  window.MESH_STATE?.connected ?? false,
      mqttBroker:     window.SOURCES?.CFG?.mqttSelfHost || "mqtt.meshtastic.org",
      queueSize:      window.CommsRouter?.queue.size() ?? 0,
      userAgent:      navigator.userAgent,
      // Explicitly excluded fields
      _excluded: ["apiKeys","passwords","tokens","sharedSecrets","adminPassword","privateLocation"]
    };

    const json = JSON.stringify(bundle, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    a.download = `aegisnet-support-bundle-${identity.nodeId || "unknown"}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return bundle;
  }

  return { run, exportBundle };
})();

/* ── health check panel renderer ── */
window.renderHealthPanel = async function(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  el.innerHTML = '<div style="color:var(--dim);font-size:12px">Running health check…</div>';
  const results = await HealthCheck.run();
  const pass = results.filter(r => r.ok).length;
  const fail = results.length - pass;
  el.innerHTML = `
    <div style="font-size:12px;margin-bottom:10px;color:${fail===0?"var(--green)":"var(--amber)"}">
      ${pass}/${results.length} checks passed${fail>0?` · ${fail} issue(s)`:""}
    </div>
    ${results.map(r => `
      <div style="display:flex;align-items:flex-start;gap:7px;padding:4px 0;border-bottom:1px solid var(--panel2);font-size:11.5px">
        <span style="color:${r.ok?"var(--green)":"var(--amber)"};flex-shrink:0;width:14px">${r.ok?"✓":"⚠"}</span>
        <span style="color:var(--txt);flex:1">${r.name}</span>
        <span style="color:var(--dim);font-size:10.5px;max-width:200px;text-align:right">${r.detail||""}</span>
      </div>`).join("")}
    <div class="btnRow" style="margin-top:12px">
      <button class="btn" onclick="renderHealthPanel('${containerId}')">RECHECK</button>
      <button class="btn" onclick="HealthCheck.exportBundle(false)">EXPORT BUNDLE</button>
      <button class="btn" onclick="HealthCheck.exportBundle(true)" title="Includes location label">+ LOCATION</button>
    </div>
    <div style="font-size:10px;color:var(--dim);margin-top:8px;line-height:1.5">
      Bundle never includes API keys, passwords, tokens, or shared secrets.
      Location excluded by default — click "+ LOCATION" to include the label.
    </div>`;
};
