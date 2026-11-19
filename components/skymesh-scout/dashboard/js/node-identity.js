/* ============================================================
   AegisNet Expansion Layer — node-identity.js
   Node ID, status card, local identity system.
   NodeRegistryAdapter placeholder for future cloud reg.
   ============================================================ */
"use strict";

/* ── Node Identity ── */
window.NODE_IDENTITY = (function() {
  const _store = window.localStorage || { getItem: ()=>null, setItem: ()=>{} };

  function _gen() { return "aegis-" + Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b=>b.toString(16).padStart(2,"0")).join(""); }

  let _id    = _store.getItem("aegisnet_nodeId") || "";
  let _cfg   = {};
  let _boot  = Date.now();
  let _checkin = null;

  function init(cfg) {
    _cfg = cfg || {};
    if (!_id) { _id = _cfg.nodeId || _gen(); _store.setItem("aegisnet_nodeId", _id); }
    else if (_cfg.nodeId && _cfg.nodeId !== _id) { _id = _cfg.nodeId; }
    _checkin = Date.now();
  }

  function get() {
    return {
      nodeId:      _id,
      nodeName:    _cfg.nodeName    || "AegisNet Node",
      nodeRole:    _cfg.nodeRole    || "home",
      nodeLocation:_cfg.nodeLocation|| "",
      nodeContact: _cfg.nodeContact || "",
      nodePublic:  _cfg.nodePublic  ?? true,
      version:     "4.2",
      hardwareProfile: _detectHardware(),
      lastBootAt:  new Date(_boot).toISOString(),
      lastCheckinAt: _checkin ? new Date(_checkin).toISOString() : null,
      enabledAdapters: _enabledAdapters(),
      healthStatus: _healthStatus()
    };
  }

  function _detectHardware() {
    const ua = navigator.userAgent || "";
    if (ua.includes("armv7") || ua.includes("aarch64")) return "raspberry-pi";
    if (ua.includes("Linux")) return "linux";
    if (ua.includes("Mac")) return "mac";
    return "browser-demo";
  }

  function _enabledAdapters() {
    const router = window.CommsRouter;
    if (!router) return [];
    return router.getAll().filter(a => a.isAvailable()).map(a => a.id);
  }

  function _healthStatus() {
    const router = window.CommsRouter;
    if (!router) return "unknown";
    const best = router.bestAdapter();
    return best ? "online" : (router.queue.size() > 0 ? "queued" : "offline");
  }

  function bump() { _checkin = Date.now(); }

  return { init, get, bump, getId: () => _id };
})();

/* ── Node Status Card (renders into #nodeStatusCard) ── */
function renderNodeStatusCard() {
  const el = document.getElementById("nodeStatusCard"); if (!el) return;
  const n = window.NODE_IDENTITY.get();
  const router = window.CommsRouter;
  const best = router?.bestAdapter();
  const qSize = router?.queue.size() || 0;
  const healthColor = n.healthStatus === "online" ? "var(--green)"
                    : n.healthStatus === "queued" ? "var(--amber)" : "var(--red)";
  el.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <div style="font-family:var(--disp);font-weight:700;font-size:18px;color:var(--bright);letter-spacing:.06em">${n.nodeName}</div>
        <div style="font-size:11px;color:var(--dim);margin-top:2px">${n.nodeId}</div>
        <div style="margin-top:8px;font-size:12px;line-height:2;color:var(--txt)">
          <span style="color:var(--dim)">ROLE</span> &nbsp;${n.nodeRole.toUpperCase()}<br>
          <span style="color:var(--dim)">LOC</span> &nbsp;${n.nodeLocation || "—"}<br>
          <span style="color:var(--dim)">VER</span> &nbsp;${n.version}<br>
          <span style="color:var(--dim)">HW</span> &nbsp;${n.hardwareProfile}
        </div>
      </div>
      <div style="flex:1;min-width:200px">
        <div style="font-size:11px;color:var(--dim);letter-spacing:.12em;margin-bottom:6px">STATUS</div>
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
          <span style="width:10px;height:10px;border-radius:50%;background:${healthColor};display:inline-block;flex-shrink:0"></span>
          <span style="color:var(--txt);font-size:13px">${n.healthStatus.toUpperCase()}</span>
        </div>
        <div style="font-size:11.5px;line-height:2;color:var(--dim)">
          Route: <span style="color:${best ? "var(--txt)" : "var(--red)"}">${best ? best.displayName : "none"}</span><br>
          Queue: <span style="color:${qSize > 0 ? "var(--amber)" : "var(--txt)"}">${qSize} msg${qSize !== 1 ? "s" : ""}</span><br>
          Boot: <span style="color:var(--txt)">${n.lastBootAt?.slice(11,19)}Z</span><br>
          Check-in: <span style="color:var(--txt)">${n.lastCheckinAt?.slice(11,19) || "—"}Z</span>
        </div>
      </div>
      <div style="flex:1;min-width:200px">
        <div style="font-size:11px;color:var(--dim);letter-spacing:.12em;margin-bottom:6px">ADAPTERS</div>
        ${(window.CommsRouter?.getAll() || []).slice(0, 7).map(a =>
          `<div style="font-size:11px;display:flex;align-items:center;gap:5px;padding:2px 0">
            <span style="width:7px;height:7px;border-radius:50%;background:${a.isAvailable()?"var(--green)":"var(--dim)"};flex-shrink:0"></span>
            <span style="color:${a.isAvailable()?"var(--txt)":"var(--dim)"}">${a.displayName}</span>
          </div>`
        ).join("")}
      </div>
    </div>`;
}

setInterval(() => {
  window.NODE_IDENTITY.bump();
  renderNodeStatusCard();
}, 8000);

/* ── NodeRegistryAdapter placeholder ──
   Future: registers node with AegisNet cloud / peer directory.
   Not implemented. Placeholder only.                           */
window.NodeRegistryAdapter = {
  id: "node_registry",
  status: "offline",
  prototypeOnly: true,
  async register(identity) {
    console.info("[NodeRegistry] placeholder — registration not yet implemented");
    return { registered: false, reason: "NodeRegistry not configured. Placeholder only." };
  },
  async heartbeat(identity) { return { ok: false }; },
  async lookup(nodeId)      { return null; }
};

// Init after config loads
fetch("config.json").then(r => r.json()).then(cfg => {
  window.NODE_IDENTITY.init(cfg);
  renderNodeStatusCard();
}).catch(() => {
  window.NODE_IDENTITY.init({});
  renderNodeStatusCard();
});
