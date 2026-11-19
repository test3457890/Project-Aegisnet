/* ============================================================
   AegisNet P4.3 — p4.3-pages.js
   Network Settings page + Safety Tips panel.
   All controls wired to NetworkSettings and CommsRouter.
   AegisNet's own design and wording.
   ============================================================ */
"use strict";

/* ── status label helper ── */
function _routeLabel(adapter) {
  if (!adapter) return "MISSING";
  const s = adapter.status;
  if (s === "ready")      return "CONNECTED";
  if (s === "degraded")   return "DEGRADED";
  if (s === "connecting") return "CONNECTING";
  if (s === "error")      return "ERROR";
  if (s === "offline")    return "OFFLINE";
  return "DISABLED";
}
function _routeColor(adapter) {
  if (!adapter) return "var(--dim)";
  const s = adapter.status;
  if (s === "ready")      return "var(--green)";
  if (s === "degraded")   return "var(--amber)";
  if (s === "connecting") return "var(--cyan)";
  return "var(--red)";
}
function _adapterDot(adapter, extraLabel) {
  const color = _routeColor(adapter);
  const lbl   = extraLabel || _routeLabel(adapter);
  return `<span style="display:inline-flex;align-items:center;gap:5px">
    <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
    <span style="font-size:10px;color:${color}">${lbl}</span>
  </span>`;
}

/* ══════════════════════════════════════════════
   NETWORK SETTINGS PAGE
══════════════════════════════════════════════ */
function buildNetworkSettingsPage() {
  const pg = document.getElementById("pg-network"); if (!pg) return;
  pg.innerHTML = `
  <div style="height:100%;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px">

    <!-- disclaimer -->
    <div style="border:1px solid var(--amber-dim);border-radius:4px;background:#120e00;padding:10px 14px;color:var(--amber);font-size:11px;line-height:1.7">
      ⚠ PROTOTYPE — This is not a commercial VPN. Not an anonymity guarantee.
      Property owners must understand what network services are enabled on this node.
      Tor fallback is optional and may be slower. Private tunnel requires external setup.
    </div>

    <!-- TRANSPORT MODE -->
    <div class="fPanel">
      <h3 style="display:flex;align-items:center;justify-content:space-between">
        TRANSPORT MODE
        <span id="activeModeLabel" style="font-size:10px;color:var(--cyan);letter-spacing:.12em">SMART</span>
      </h3>
      <div class="fbody">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px" id="modePicker"></div>
      </div>
    </div>

    <!-- ROUTING SECTION -->
    <div class="fPanel">
      <h3>ROUTING</h3>
      <div class="fbody" style="display:flex;flex-direction:column;gap:0">
        ${_routeToggle("local",      "LAN / Local Network",      "lanEnabled",    "allowLan")}
        ${_routeToggle("internet",   "Direct Internet",           "internetEnabled","allowInternet")}
        ${_routeToggle("p2p",        "P2P / WebRTC",              "p2pEnabled",    "allowP2P")}
        ${_routeToggle("tunnel",     "Private Tunnel",            "tunnelEnabled", "allowTunnel",  true)}
        ${_routeToggle("mesh_mqtt",  "Meshtastic MQTT Bridge",    "mqttEnabled",   "allowMqtt")}
        ${_routeToggle("mesh_local", "Meshtastic Serial",         "meshLocalEnabled","allowMeshLocal", true)}
        ${_routeToggle("radio",      "Radio Fallback Simulator",  "radioEnabled",  "allowRadio",   true)}
        ${_routeToggle("satellite",  "Satellite",                 "satEnabled",    "allowSat",     true)}
        ${_routeToggle("tor",        "Tor Fallback (text only)",  "torEnabled",    "allowTor",     true, true)}
      </div>
      <div class="fNote" id="torNote" style="display:none;color:var(--amber)">
        🧅 Tor is enabled. Text and status only — voice, video, and images are blocked on this route.
        Tor may be slower or unstable. This is not an anonymity guarantee.
      </div>
    </div>

    <!-- SAFETY CONTROLS -->
    <div class="fPanel">
      <h3>SAFETY CONTROLS</h3>
      <div class="fbody" style="display:flex;flex-direction:column;gap:2px">
        <label style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--panel2)">
          <div>
            <div style="font-size:12.5px;color:var(--txt)">Kill Switch</div>
            <div style="font-size:10.5px;color:var(--dim)">Queue messages instead of using blocked routes</div>
          </div>
          <input type="checkbox" id="killSwitchToggle" style="accent-color:var(--cyan);width:16px;height:16px" onchange="p43SetKillSwitch(this.checked)">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--panel2)">
          <div>
            <div style="font-size:12.5px;color:var(--txt)">Block media on low-bandwidth routes</div>
            <div style="font-size:10.5px;color:var(--dim)">Prevents images, voice, video on LoRa, radio, or Tor</div>
          </div>
          <input type="checkbox" id="blockMediaToggle" checked style="accent-color:var(--cyan);width:16px;height:16px" onchange="NetworkSettings.setBlockMediaLowBW(this.checked)">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
          <div>
            <div style="font-size:12.5px;color:var(--txt)">Route Lock (mission test mode)</div>
            <div style="font-size:10.5px;color:var(--dim)">Freezes route selection — messages use the current best route only</div>
          </div>
          <input type="checkbox" id="routeLockToggle" style="accent-color:var(--amber);width:16px;height:16px" onchange="p43SetRouteLock(this.checked)">
        </label>
      </div>
      <div id="killSwitchWarning" style="display:none;padding:8px 13px;font-size:11px;color:var(--amber);border-top:1px solid var(--line)">
        ⚠ Kill switch is active. Messages will queue until an approved route is available.
      </div>
    </div>

    <!-- DNS AND NETWORK -->
    <div class="fPanel">
      <h3>DNS AND NETWORK</h3>
      <div class="fbody" style="display:flex;flex-direction:column;gap:10px" id="dnsWarningTarget">
        <div style="font-size:11px;color:var(--dim);margin-bottom:2px">Leave blank to use system/DHCP DNS.</div>
        <label style="display:flex;justify-content:space-between;align-items:center">
          Primary DNS
          <input type="text" id="dns1" placeholder="e.g. 1.1.1.1" style="width:140px;background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:5px 8px;border-radius:3px;font-size:12px" onchange="p43UpdateDns()">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center">
          Secondary DNS
          <input type="text" id="dns2" placeholder="e.g. 8.8.8.8" style="width:140px;background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:5px 8px;border-radius:3px;font-size:12px" onchange="p43UpdateDns()">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-top:1px solid var(--line)">
          IPv6 support
          <input type="checkbox" id="ipv6Toggle" style="accent-color:var(--cyan);width:16px;height:16px" onchange="NetworkSettings.setIpv6(this.checked)">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center">
          IPv6 leak protection
          <input type="checkbox" id="ipv6LeakToggle" checked style="accent-color:var(--cyan);width:16px;height:16px" onchange="NetworkSettings.setIpv6LeakProt(this.checked)">
        </label>
        <div style="font-size:10.5px;color:var(--dim);line-height:1.6">
          NAT type: <span id="natType" style="color:var(--txt)">detecting…</span> &nbsp;·&nbsp;
          IPv4: <span id="ipv4Status" style="color:var(--green)">available</span> &nbsp;·&nbsp;
          Port forwarding: <span id="portFwdStatus" style="color:var(--dim)">not configured</span>
        </div>
      </div>
    </div>

    <!-- PRIVATE TUNNEL -->
    <div class="fPanel">
      <h3>PRIVATE TUNNEL <span class="badge-exp">REQUIRES SETUP</span></h3>
      <div class="fbody" id="tunnelPanel">
        <div style="font-size:12px;color:var(--dim);line-height:1.8" id="tunnelStatus">
          No tunnel configured. Supports WireGuard, Tailscale, or similar.<br>
          Configure externally then point AegisNet to the tunnel interface.
        </div>
        <label style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          Tunnel type
          <select id="tunnelTypeSelect" style="background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:4px 7px;border-radius:3px;font-size:11px">
            <option value="unset">Not configured</option>
            <option value="wireguard">WireGuard</option>
            <option value="tailscale">Tailscale</option>
            <option value="openvpn">OpenVPN</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>
      <div class="fNote" style="color:var(--dim)">Private tunnel is a placeholder. This does not install WireGuard or Tailscale. It detects whether they are already running on this node.</div>
    </div>

    <!-- TOR FALLBACK -->
    <div class="fPanel">
      <h3>TOR FALLBACK <span class="badge-exp">OPTIONAL · DISABLED BY DEFAULT</span></h3>
      <div class="fbody" id="torConfigTarget">
        <label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          Enable Tor fallback
          <input type="checkbox" id="torEnableCheck" style="accent-color:var(--amber);width:16px;height:16px" onchange="p43ToggleTor(this.checked)">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center">
          SOCKS proxy host
          <input type="text" id="torHost" value="127.0.0.1" style="width:120px;background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:4px 7px;border-radius:3px;font-size:11px">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
          SOCKS proxy port
          <input type="number" id="torPort" value="9050" style="width:80px;background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:4px 7px;border-radius:3px;font-size:11px">
        </label>
      </div>
      <div class="fNote" style="color:var(--amber);font-size:10.5px">
        Tor routes text and status only — never voice, video, or images.
        Tor may be slower or unstable. Not an anonymity guarantee.
        Requires Tor to be installed and running on this node separately.
        No hardcoded onion addresses. Owner must configure.
      </div>
    </div>

    <!-- PERFORMANCE -->
    <div class="fPanel">
      <h3>PERFORMANCE</h3>
      <div class="fbody" style="font-size:12px;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--dim)">Active route</span>
          <span id="perfActiveRoute" style="color:var(--txt)">—</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--dim)">Last successful route</span>
          <span id="perfLastSuccess" style="color:var(--txt)">—</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--dim)">Last failed route</span>
          <span id="perfLastFail" style="color:var(--dim)">—</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--dim)">Bandwidth class</span>
          <span id="perfBandwidth" style="color:var(--cyan)">—</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--dim)">WebRTC ICE state</span>
          <span id="perfIceState" style="color:var(--dim)">—</span>
        </div>
        <div class="btnRow" style="margin-top:4px">
          <button class="btn" onclick="NetworkSettings.runLatencyTest()">LATENCY TEST</button>
          <button class="btn" onclick="p43RefreshRouteHealth()">REFRESH ROUTES</button>
        </div>
      </div>
    </div>

    <!-- ADVANCED -->
    <div class="fPanel">
      <h3>ADVANCED</h3>
      <div class="fbody" style="font-size:12px;color:var(--dim);line-height:1.9">
        <div>STUN servers: <span style="color:var(--txt)">stun.l.google.com:19302 (default)</span></div>
        <div>TURN: <span style="color:var(--dim)">not configured (placeholder)</span></div>
        <div>Dashboard bind: <select id="bindMode" style="background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:3px 6px;border-radius:3px;font-size:11px;margin-left:6px">
          <option value="lan">LAN only (recommended)</option>
          <option value="localhost">Localhost only</option>
          <option value="all">All interfaces (⚠ use with VPN/auth)</option>
        </select></div>
        <div style="margin-top:8px">
          <button class="btn" onclick="p43ExportNetDiag()">EXPORT NETWORK DIAGNOSTICS</button>
        </div>
      </div>
    </div>

    <!-- SAFETY SETTINGS -->
    <div class="fPanel">
      <h3>SAFETY EDUCATION SETTINGS</h3>
      <div class="fbody" style="font-size:12px;display:flex;flex-direction:column;gap:6px">
        <label style="display:flex;justify-content:space-between">Show safety reminders <input type="checkbox" id="sfReminders" checked style="accent-color:var(--cyan);width:16px;height:16px" onchange="SafetySettings.showReminders=this.checked;SafetySettings.save()"></label>
        <label style="display:flex;justify-content:space-between">Show beginner tips <input type="checkbox" id="sfBeginner" checked style="accent-color:var(--cyan);width:16px;height:16px" onchange="SafetySettings.showBeginnerTips=this.checked;SafetySettings.save()"></label>
        <label style="display:flex;justify-content:space-between">Show advanced network warnings <input type="checkbox" id="sfAdvanced" checked style="accent-color:var(--cyan);width:16px;height:16px" onchange="SafetySettings.showAdvancedWarnings=this.checked;SafetySettings.save()"></label>
        <button class="btn" style="margin-top:6px" onclick="SafetySettings.reset();toast('Safety tip history reset','ok')">Reset dismissed tips</button>
      </div>
      <div class="fNote">Critical warnings (remote access, Tor, port forwarding, API keys, recovery codes) cannot be permanently dismissed.</div>
    </div>

  </div>`;

  renderModePicker();
  refreshNetworkStatus();
  /* Wire contextual warnings */
  showSafetyWarning("nodeTransparency",    "torConfigTarget");
  showSafetyWarning("remoteAccessWarning", "dnsWarningTarget");
}

/* ── mode picker ── */
function renderModePicker() {
  const el = document.getElementById("modePicker"); if (!el) return;
  const state = window.NetworkSettings?.getState() || {};
  const modes = window.NetworkSettings?.getModes() || [];
  el.innerHTML = modes.map(m => `
    <button onclick="p43SetMode('${m.id}')" style="
      border:1px solid ${state.mode === m.id ? "var(--cyan)" : "var(--line)"};
      border-radius:4px;background:${state.mode === m.id ? "rgba(98,217,247,.1)" : "var(--panel2)"};
      color:${state.mode === m.id ? "var(--cyan)" : "var(--txt)"};
      padding:10px 12px;cursor:pointer;text-align:left;font-family:var(--mono);font-size:12px;
      transition:border-color .1s">
      <div style="font-family:var(--disp);font-weight:600;font-size:13px;letter-spacing:.1em;margin-bottom:4px">${m.label.toUpperCase()}</div>
      <div style="font-size:10.5px;color:var(--dim);line-height:1.5">${m.description}</div>
    </button>`).join("");
}

/* ── route toggle row builder ── */
function _routeToggle(adapterId, label, stateKey, checkId, proto=false, isTor=false) {
  const badges = proto ? `<span class="badge-exp" style="font-size:9px;margin-left:4px">${isTor ? "TEXT ONLY" : "PROTO"}</span>` : "";
  return `<label style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--panel2)">
    <div style="display:flex;align-items:center;gap:8px">
      <span id="dot_${adapterId}" style="width:8px;height:8px;border-radius:50%;background:var(--dim);flex-shrink:0"></span>
      <div>
        <span style="font-size:12.5px;color:var(--txt)">${label}</span>${badges}
        <div style="font-size:10px;color:var(--dim)" id="status_${adapterId}">checking…</div>
      </div>
    </div>
    <input type="checkbox" id="${checkId}" ${!isTor ? "checked" : ""} style="accent-color:${isTor ? "var(--amber)" : "var(--cyan)"};width:16px;height:16px"
      onchange="p43ToggleAdapter('${adapterId}',this.checked)">
  </label>`;
}

/* ── refresh all adapter status dots ── */
function refreshNetworkStatus() {
  const adapters = window.CommsRouter?.getAll() || [];
  for (const a of adapters) {
    const dot = document.getElementById("dot_" + a.id);
    const lbl = document.getElementById("status_" + a.id);
    if (dot) dot.style.background = _routeColor(a);
    if (lbl) lbl.textContent = _routeLabel(a) + (a.latencyMs ? ` · ${a.latencyMs}ms` : "") + (a.prototypeOnly ? " · PROTOTYPE" : "");
  }
  /* Performance panel */
  const best = window.CommsRouter?.bestAdapter();
  const el = (id) => document.getElementById(id);
  if (el("perfActiveRoute")) el("perfActiveRoute").textContent = best ? best.displayName : "None";
  if (el("perfBandwidth"))   el("perfBandwidth").textContent   = best ? best.bandwidth.toUpperCase() : "—";
  const state = window.NetworkSettings?.getState() || {};
  if (el("activeModeLabel")) el("activeModeLabel").textContent = (state.modeLabel || "SMART").toUpperCase();
  if (el("killSwitchWarning")) el("killSwitchWarning").style.display = state.killSwitch ? "" : "none";
  if (el("torNote")) el("torNote").style.display = state.torEnabled ? "" : "none";
  /* Tunnel status */
  const tunnel = window.CommsRouter?.getAdapter("tunnel");
  if (el("tunnelStatus") && tunnel) {
    const ts = tunnel.getStatus();
    el("tunnelStatus").textContent = ts.configured
      ? `${ts.tunnelType.toUpperCase()} · ${ts.connected ? "CONNECTED" : "DISCONNECTED"} · Peers: ${ts.peerCount} · ${ts.localTunnelIp || "no IP"}`
      : "No tunnel configured. Supports WireGuard, Tailscale, or similar.";
  }
  /* NAT type placeholder */
  if (el("natType")) el("natType").textContent = "not tested";
  /* ICE state */
  const sessions = window.WebRTCService?.getActiveSessions() || [];
  if (el("perfIceState")) el("perfIceState").textContent = sessions.length ? sessions[0].state : "no active P2P";
}

window.p4_3RefreshNetworkUI = function() {
  renderModePicker();
  refreshNetworkStatus();
};

/* ── action handlers ── */
window.p43SetMode = function(modeId) {
  window.NetworkSettings?.setMode(modeId);
  renderModePicker();
  refreshNetworkStatus();
  toast("Transport mode: " + (window.NetworkSettings?.MODES[modeId]?.label || modeId), "ok");
  if (modeId === "field") showReleaseNote("lowBwActive");
};

window.p43ToggleAdapter = function(adapterId, enabled) {
  window.NetworkSettings?.setAdapterEnabled(adapterId, enabled);
  if (adapterId === "tor") {
    showSafetyWarning("torWarning", "torConfigTarget", { force: !enabled });
    document.getElementById("torNote").style.display = enabled ? "" : "none";
    if (enabled) showReleaseNote("torTextOnly");
  }
  if (adapterId === "local" && !enabled) toast("LAN disabled — local peer discovery stopped", "warn");
  if (adapterId === "tunnel" && enabled) showSafetyWarning("remoteAccessWarning", "tunnelPanel", { force: true });
  refreshNetworkStatus();
};

window.p43ToggleTor = function(enabled) {
  document.getElementById("torNote").style.display = enabled ? "" : "none";
  window.NetworkSettings?.setAdapterEnabled("tor", enabled);
  if (enabled) {
    const host = document.getElementById("torHost")?.value || "127.0.0.1";
    const port = parseInt(document.getElementById("torPort")?.value || "9050");
    const torA = window.CommsRouter?.getAdapter("tor");
    if (torA) { torA.configure({ enabled: true, socksHost: host, socksPort: port }); torA.connect(); }
    showSafetyWarning("torWarning", "torConfigTarget", { force: true });
    showReleaseNote("torTextOnly");
  }
  refreshNetworkStatus();
};

window.p43SetKillSwitch = function(on) {
  window.NetworkSettings?.setKillSwitch(on);
  document.getElementById("killSwitchWarning").style.display = on ? "" : "none";
  if (on) { showSafetyWarning("killSwitchInfo", "dnsWarningTarget"); showReleaseNote("messageQueued"); }
  toast(on ? "Kill switch ON — messages queue until approved route available" : "Kill switch OFF", on ? "warn" : "ok");
};

window.p43SetRouteLock = function(on) {
  if (window.CommsRouter) window.CommsRouter._routeLocked = on;
  toast(on ? "Route locked for mission test" : "Route lock released", "ok");
};

window.p43UpdateDns = function() {
  const p = document.getElementById("dns1")?.value || "";
  const s = document.getElementById("dns2")?.value || "";
  window.NetworkSettings?.setCustomDns(p, s);
  if (p || s) showSafetyWarning("customDnsWarning", "dnsWarningTarget");
};

window.p43RefreshRouteHealth = function() {
  const adapters = window.CommsRouter?.getAll() || [];
  Promise.allSettled(adapters.map(a => a.connect().catch(() => {}))).then(() => {
    refreshNetworkStatus();
    toast("Route health refreshed", "ok");
  });
};

window.p43ExportNetDiag = function() {
  const state = window.NetworkSettings?.getState() || {};
  const adapters = (window.CommsRouter?.getAll() || []).map(a => a.toStatus());
  const diag = {
    exportedAt: new Date().toISOString(),
    transportMode: state.mode,
    killSwitch: state.killSwitch,
    torEnabled: state.torEnabled,
    disabledAdapters: state.disabledAdapters,
    adapters,
    notice: "No API keys, passwords, or secrets included"
  };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(diag, null, 2)], { type: "application/json" }));
  a.download = "aegisnet-network-diag-" + new Date().toISOString().slice(0,10) + ".json";
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast("Network diagnostics exported", "ok");
};

/* ══════════════════════════════════════════════
   SAFETY TIPS PAGE
══════════════════════════════════════════════ */
function buildSafetyPage() {
  const pg = document.getElementById("pg-safety"); if (!pg) return;
  pg.innerHTML = `
    <div style="max-width:680px;margin:0 auto;padding:20px;height:100%;overflow-y:auto">
      <div style="font-family:var(--disp);font-weight:700;font-size:20px;letter-spacing:.15em;color:var(--bright);margin-bottom:4px">SAFETY &amp; EDUCATION</div>
      <div style="font-size:11px;color:var(--dim);letter-spacing:.12em;margin-bottom:18px">AEGISNET SECURITY AWARENESS · PROTOTYPE 4.3</div>
      <div id="safetyPanelContent"></div>
    </div>`;
  renderSafetyPanel("safetyPanelContent");
}

/* ══════════════════════════════════════════════
   INIT — build pages after DOM settles
══════════════════════════════════════════════ */
setTimeout(() => {
  buildNetworkSettingsPage();
  buildSafetyPage();
  /* Show release note if field mode was set */
  if (window.NetworkSettings?.getState().mode === "field") showReleaseNote("lowBwActive");
  /* Periodic refresh */
  setInterval(refreshNetworkStatus, 8000);
}, 600);
