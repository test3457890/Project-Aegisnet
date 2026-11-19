/* ============================================================
   AegisNet P4.4 — p4.4-pages.js
   Upgrades projector page to use SkyProjector engine.
   Adds Mesh Map page with NodeRegistry.
   ============================================================ */
"use strict";

/* ══════════════════════════════════════════════
   UPGRADE PROJECTOR PAGE
   Replaces the P3 blob canvas with SkyProjector
══════════════════════════════════════════════ */
function upgradeProjectorPage() {
  const pg = document.getElementById("pg-projector"); if (!pg) return;
  pg.style.background = "#000";
  pg.style.flexDirection = "column";

  pg.innerHTML = `
    <div style="display:flex;gap:6px;padding:10px 14px;align-items:center;border-bottom:1px solid #111;flex-shrink:0;flex-wrap:wrap">
      <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;letter-spacing:.2em;color:#62D9F7;margin-right:4px">PROJECTION</div>
      <button class="projBtn on" id="pBtn-ceiling" onclick="p44SetProjMode('ceiling')">CEILING SKY</button>
      <button class="projBtn" id="pBtn-wall"    onclick="p44SetProjMode('wall')">WALL MAP</button>
      <button class="projBtn" id="pBtn-briefing" onclick="p44SetProjMode('briefing')">BRIEFING</button>
      <button class="projBtn" id="pBtn-camp"    onclick="p44SetProjMode('camp')">NIGHT</button>
      <div style="width:1px;height:20px;background:#1E2A36;margin:0 4px"></div>
      <button class="projBtn" id="pBtn-autocycle" onclick="p44AutoCycle()">AUTO CYCLE</button>
      <button class="projBtn" onclick="document.documentElement.requestFullscreen?.()">FULLSCREEN</button>
      <div style="margin-left:auto;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <label style="font-size:11px;color:#6B7B88;display:flex;align-items:center;gap:5px">
          Range: <input type="range" id="projRange" min="5" max="60" value="25" style="width:70px;accent-color:#62D9F7" oninput="p44SetRange(this.value)">
          <span id="projRangeVal" style="color:#62D9F7;min-width:28px">25nm</span>
        </label>
        <label style="font-size:11px;color:#6B7B88;display:flex;align-items:center;gap:5px">
          <input type="checkbox" id="projStars" checked style="accent-color:#62D9F7" onchange="p44ProjOpt('showStars',this.checked)"> Stars
        </label>
        <label style="font-size:11px;color:#6B7B88;display:flex;align-items:center;gap:5px">
          <input type="checkbox" id="projConst" checked style="accent-color:#62D9F7" onchange="p44ProjOpt('showConstellations',this.checked)"> Constellations
        </label>
        <label style="font-size:11px;color:#6B7B88;display:flex;align-items:center;gap:5px">
          <input type="checkbox" id="projMoon" checked style="accent-color:#62D9F7" onchange="p44ProjOpt('showMoon',this.checked)"> Moon
        </label>
        <label style="font-size:11px;color:#6B7B88;display:flex;align-items:center;gap:5px">
          <input type="checkbox" id="projISS" checked style="accent-color:#F0B541" onchange="p44ProjOpt('showISS',this.checked)"> ISS
        </label>
        <div style="font-size:10px;color:#3A4A58">AWARENESS ONLY</div>
      </div>
    </div>
    <canvas id="skyCanvas" style="flex:1;width:100%;display:block"></canvas>
    <style>
      .projBtn{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;background:#101822;border:1px solid #1E2A36;color:#C7D3DC;padding:5px 12px;border-radius:3px;cursor:pointer}
      .projBtn:hover{border-color:#2E6D80;color:#62D9F7}
      .projBtn.on{border-color:#2E6D80;color:#62D9F7;background:rgba(98,217,247,.08)}
    </style>`;

  /* Init SkyProjector on the new canvas */
  setTimeout(() => {
    const canvas = document.getElementById("skyCanvas");
    if (!canvas || !window.SkyProjector) return;
    window.SkyProjector.init(canvas, {
      lat: window.SOURCES?.CFG?.rxLat,
      lon: window.SOURCES?.CFG?.rxLon
    });
  }, 100);
}

let _projAutoCycleTimer = null;
window.p44SetProjMode = function(mode) {
  window.SkyProjector?.setMode(mode);
  ["ceiling","wall","briefing","camp"].forEach(m => {
    const b = document.getElementById("pBtn-" + m);
    if (b) b.className = "projBtn" + (m === mode ? " on" : "");
  });
};
window.p44SetRange = function(nm) {
  window.SkyProjector?.setOverheadRange?.(parseInt(nm));
  const lbl = document.getElementById("projRangeVal");
  if (lbl) lbl.textContent = nm + "nm";
};
window.p44ProjOpt = function(key, val) {
  window.SkyProjector?.setOptions({ [key]: val });
};
window.p44AutoCycle = function() {
  const modes = ["ceiling","wall","briefing","camp"];
  let i = 0;
  const btn = document.getElementById("pBtn-autocycle");
  if (_projAutoCycleTimer) {
    clearInterval(_projAutoCycleTimer); _projAutoCycleTimer = null;
    if (btn) { btn.textContent = "AUTO CYCLE"; btn.classList.remove("on"); }
    window.toast?.("Auto cycle stopped");
    return;
  }
  if (btn) { btn.textContent = "AUTO CYCLE ■"; btn.classList.add("on"); }
  _projAutoCycleTimer = setInterval(() => {
    i = (i + 1) % modes.length;
    window.p44SetProjMode(modes[i]);
  }, 9000);
  window.toast?.("Auto cycle: 9s per mode");
};

/* Keep SkyProjector position synced with config */
setInterval(() => {
  const cfg = window.SOURCES?.CFG;
  if (cfg) window.SkyProjector?.setPosition(cfg.rxLat, cfg.rxLon);
}, 10000);

/* ══════════════════════════════════════════════
   MESH MAP PAGE
══════════════════════════════════════════════ */
function buildMeshMapPage() {
  const pg = document.getElementById("pg-meshmap"); if (!pg) return;
  pg.innerHTML = `
    <div style="height:100%;display:flex;flex-direction:column;overflow:hidden">

      <!-- header -->
      <div style="padding:12px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px;flex-shrink:0">
        <div style="font-family:var(--disp);font-weight:700;font-size:16px;letter-spacing:.18em;color:var(--bright)">MESH MAP</div>
        <div style="font-size:11px;color:var(--dim)">AegisNet node directory via MQTT</div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
          <span id="registryCount" style="font-size:12px;color:var(--dim)">0 remote nodes</span>
          <button class="btn" onclick="window.NodeRegistry?.start?.();toast('Announcing node…','ok')">ANNOUNCE</button>
          <button class="btn" onclick="renderRegistryPanel()">REFRESH</button>
        </div>
      </div>

      <!-- map + list split -->
      <div style="display:flex;flex:1;overflow:hidden">

        <!-- canvas map -->
        <div style="flex:1;position:relative;min-width:0;background:var(--panel2)">
          <canvas id="registryMapCanvas" style="width:100%;height:100%;display:block"></canvas>
          <div style="position:absolute;bottom:10px;left:14px;font-size:10px;color:var(--dim);line-height:1.8">
            <span style="color:var(--cyan)">●</span> This node &nbsp;
            <span style="color:var(--green)">●</span> Online (&lt;60s) &nbsp;
            <span style="color:var(--amber)">●</span> Recent &nbsp;
            <span style="color:var(--red)">●</span> Stale &nbsp;
            <span style="color:var(--dim)">- - -</span> MQTT link
          </div>
        </div>

        <!-- node list -->
        <div style="width:320px;border-left:1px solid var(--line);background:var(--panel2);overflow-y:auto;flex-shrink:0">
          <div style="font-family:var(--disp);font-weight:600;font-size:11px;letter-spacing:.22em;color:var(--dim);padding:12px 14px 8px;border-bottom:1px solid var(--line)">DISCOVERED NODES</div>
          <div style="padding:10px 12px" id="registryNodeList">
            <div style="color:var(--dim);font-size:12px">Enable Field Mode and MQTT Bridge to discover nodes.</div>
          </div>
          <!-- self card -->
          <div style="border-top:1px solid var(--line);padding:12px 14px">
            <div style="font-family:var(--disp);font-weight:600;font-size:11px;letter-spacing:.22em;color:var(--dim);margin-bottom:8px">THIS NODE</div>
            <div id="selfNodeCard" style="font-size:12px;color:var(--dim);line-height:1.8">Loading…</div>
          </div>
        </div>
      </div>

      <div style="padding:8px 14px;border-top:1px solid var(--line);font-size:10.5px;color:var(--dim)">
        Nodes announce themselves over MQTT every 30 seconds. Nodes not seen in 2 minutes are removed.
        Node announcements include: nodeId, name, role, location label, version, and active adapters.
        No API keys, passwords, or secrets are included in announcements.
      </div>
    </div>`;

  /* Render self card */
  function renderSelfCard() {
    const el = document.getElementById("selfNodeCard"); if (!el) return;
    const id = window.NODE_IDENTITY?.get?.() || {};
    const cfg = window.SOURCES?.CFG || {};
    el.innerHTML = `
      <div><span style="color:var(--dim)">ID</span> &nbsp;<span style="color:var(--cyan)">${id.nodeId || "—"}</span></div>
      <div><span style="color:var(--dim)">Name</span> &nbsp;<span style="color:var(--txt)">${id.nodeName || "—"}</span></div>
      <div><span style="color:var(--dim)">Role</span> &nbsp;<span style="color:var(--txt)">${id.nodeRole || "—"}</span></div>
      <div><span style="color:var(--dim)">Location</span> &nbsp;<span style="color:var(--txt)">${id.nodeLocation || "—"}</span></div>
      <div><span style="color:var(--dim)">MQTT</span> &nbsp;<span style="color:${window.MESH_STATE?.connected ? "var(--green)" : "var(--red)"}">${window.MESH_STATE?.connected ? "CONNECTED" : "DISCONNECTED"}</span></div>
      <div><span style="color:var(--dim)">Position</span> &nbsp;<span style="color:var(--txt)">${cfg.rxLat?.toFixed(3) || "?"}, ${cfg.rxLon?.toFixed(3) || "?"}</span></div>`;
    // Update count
    const countEl = document.getElementById("registryCount");
    if (countEl) countEl.textContent = `${window.NodeRegistry?.getOnline?.().length || 0} remote node(s)`;
  }

  setInterval(() => { renderSelfCard(); renderRegistryMap("registryMapCanvas"); }, 5000);
  renderSelfCard();
  renderRegistryPanel();
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
setTimeout(() => {
  upgradeProjectorPage();
  buildMeshMapPage();
}, 700);
