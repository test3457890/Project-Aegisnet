/* ============================================================
   AegisNet Expansion Layer — p4-pages.js
   New pages and page upgrades. Does not modify P3 pages.
   Appended to the DOM after p3 pages.js loads.
   ============================================================ */
"use strict";

/* ──────────────────────────────────────────────
   HELPER: status dot color
   ────────────────────────────────────────────── */
function _statusColor(s) {
  return s === "ready" || s === "live"       ? "var(--green)"
       : s === "degraded" || s === "delayed" ? "var(--amber)"
       : s === "connecting"                  ? "#62D9F7"
       : s === "simulated"                   ? "#9B7FE8"
       : "var(--dim)";
}
function _statusDot(s) {
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${_statusColor(s)};flex-shrink:0;margin-right:6px"></span>`;
}
function _bandwidthLabel(bw) {
  return bw === "high" ? "HIGH" : bw === "medium" ? "MED" : bw === "low" ? "LOW" : "—";
}

/* ──────────────────────────────────────────────
   MISSION COMMS DASHBOARD PAGE
   ────────────────────────────────────────────── */
function buildCommsDashboardPage() {
  const pg = document.getElementById("pg-comms");
  if (!pg) return;
  pg.innerHTML = `
  <div style="overflow-y:auto;height:100%;padding:16px;display:flex;flex-direction:column;gap:14px">

    <!-- What Comms does - plain English -->
    <div style="border:1px solid var(--cyan-dim);border-radius:4px;background:rgba(98,217,247,.04);padding:12px 14px;font-size:12px;color:var(--txt);line-height:1.9">
      <b style="color:var(--cyan);font-family:var(--disp);font-size:14px;letter-spacing:.1em;display:block;margin-bottom:4px">WHAT COMMS DOES</b>
      AegisNet can send messages through multiple routes depending on what's available.
      This page shows which routes are working, which are offline, and lets you control how messages are sent.
      <br><br>
      <b style="color:var(--txt)">Routes in priority order:</b><br>
      1 · <b style="color:var(--green)">Local network</b> — fastest, same Wi-Fi as the Pi<br>
      2 · <b style="color:var(--cyan)">Internet</b> — direct connection when online<br>
      3 · <b style="color:var(--cyan)">P2P / WebRTC</b> — direct device-to-device, no server<br>
      4 · <b style="color:var(--purple)">Private tunnel</b> — WireGuard/Tailscale (if configured)<br>
      5 · <b style="color:var(--sea)">Meshtastic MQTT</b> — mesh over internet (NJ→AZ bridge)<br>
      6 · <b style="color:var(--sea)">Meshtastic serial</b> — LoRa radio, no internet needed<br>
      7 · <b style="color:var(--amber)">Radio fallback</b> — simulator mode (future hardware)<br>
      8 · <b style="color:var(--dim)">Satellite</b> — placeholder, not yet configured
    </div>

    <!-- Route status grid -->
    <div class="fPanel">
      <h3>ROUTE STATUS <span style="font-size:10px;font-family:var(--mono);color:var(--dim);letter-spacing:0;font-weight:400;margin-left:8px">Updates every 5 seconds</span></h3>
      <div class="fbody" id="commsRouteList" style="font-size:12px">
        <div style="color:var(--dim)">Loading routes…</div>
      </div>
    </div>

    <!-- Active route -->
    <div class="fPanel">
      <h3>ACTIVE ROUTE</h3>
      <div class="fbody" id="activeRoutePanel">
        <div style="color:var(--dim);font-size:12px">Checking routes…</div>
      </div>
    </div>

    <!-- Message queue -->
    <div class="fPanel">
      <h3>MESSAGE QUEUE</h3>
      <div class="fbody" id="msgQueuePanel">
        <div style="font-size:12px;color:var(--green)">Queue empty</div>
      </div>
      <div class="fNote">When no route is available, messages queue here and retry automatically every 8 seconds.</div>
    </div>

    <!-- Delivery log -->
    <div class="fPanel">
      <h3>RECENT DELIVERIES</h3>
      <div class="fbody" id="deliveryPanel" style="max-height:160px;overflow-y:auto;font-size:11.5px">
        <div style="color:var(--dim)">No messages sent yet</div>
      </div>
    </div>

    <!-- P2P voice/video -->
    <div class="fPanel">
      <h3>P2P VOICE &amp; VIDEO <span style="font-size:10px;color:var(--dim);letter-spacing:0;font-weight:400;margin-left:6px">Requires internet · Does not use Meshtastic or radio</span></h3>
      <div class="fbody" style="font-size:12px">
        <div style="color:var(--dim);margin-bottom:10px">
          Direct device-to-device calls using WebRTC. Both devices need internet access.
          Falls back to text automatically if P2P fails.
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="color:var(--dim);width:100px;flex-shrink:0">Peer address</span>
          <input type="text" id="rtcPeerId" placeholder="peer node ID or address" style="flex:1;background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:6px 9px;border-radius:3px;font-size:12px">
        </label>
        <div class="btnRow">
          <button class="btn" onclick="p4StartVoice()">📞 VOICE CALL</button>
          <button class="btn" onclick="p4StartVideo()">📹 VIDEO CALL</button>
          <button class="btn" onclick="p4OpenData()">⇄ DATA CHANNEL</button>
        </div>
        <div id="callStatusBox" style="margin-top:8px;font-size:11.5px;color:var(--dim)">No active call</div>
      </div>
    </div>

    <!-- Radio fallback -->
    <div class="fPanel">
      <h3>RADIO FALLBACK <span class="badge-exp">PROTOTYPE · SIMULATOR MODE</span></h3>
      <div class="fbody" style="font-size:12px">
        <div style="color:var(--dim);margin-bottom:8px;line-height:1.7">
          Short text messages only. For future use with approved radio hardware.
          Currently runs in simulator mode — no real radio transmission.
        </div>
        <label style="display:flex;align-items:center;justify-content:space-between">
          Mode
          <select id="radioModeSelect" onchange="p4SetRadioMode(this.value)" style="background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:4px 7px;border-radius:3px;font-size:11px">
            <option value="simulator" selected>Simulator (no transmission)</option>
            <option value="hardware">Hardware (requires setup + approval)</option>
          </select>
        </label>
        <div id="radioStatus" style="margin-top:8px;font-size:11px;color:var(--dim)">Checking…</div>
      </div>
      <div class="fNote" style="color:var(--amber)">Does NOT transmit on any radio frequency in simulator mode. Hardware mode requires legal approval and compatible hardware.</div>
    </div>

    <!-- Satellite -->
    <div class="fPanel">
      <h3>SATELLITE <span class="badge-exp">PLACEHOLDER</span></h3>
      <div class="fbody" style="font-size:12px;color:var(--dim);line-height:1.8">
        No satellite hardware configured. Future options: Starlink, Iridium, Garmin inReach, SPOT.<br>
        Text and location only when configured — not for voice or video.
      </div>
    </div>

    <!-- Bandwidth mode -->
    <div class="fPanel">
      <h3>BANDWIDTH MODE</h3>
      <div class="fbody">
        <label style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:12.5px;color:var(--txt)">Low-bandwidth / field mode</div>
            <div style="font-size:11px;color:var(--dim)">Blocks images, voice, video. Text and alerts only. Good for Meshtastic and radio routes.</div>
          </div>
          <input type="checkbox" id="lowBwOn" style="accent-color:var(--cyan);width:16px;height:16px" onchange="p4SetLowBw(this.checked)">
        </label>
      </div>
    </div>

    <!-- Tracking sources -->
    <div class="fPanel">
      <h3>TRACKING SOURCES</h3>
      <div class="fbody" id="trackingStatusPanel" style="font-size:12px">
        <div style="color:var(--dim)">Loading…</div>
      </div>
      <div class="fNote">Aircraft, vessel, and team data. Sources may be live, delayed, cached, or demo.</div>
    </div>

    <!-- Node status shortcut -->
    <div class="fPanel" style="grid-column:1/-1">
      <h3>NODE STATUS
        <a href="#" onclick="window.setMode('admin');return false" style="float:right;font-size:10px;color:var(--cyan);text-decoration:none;letter-spacing:.1em">OPEN ADMIN →</a>
      </h3>
      <div class="fbody" id="nodeStatusCard" style="font-size:12px">
        <div style="color:var(--dim)">Loading…</div>
      </div>
    </div>

    <!-- Safety notice -->
    <div style="border:1px solid var(--amber-dim);border-radius:4px;background:#120e00;padding:10px 14px;color:var(--amber);font-size:11px;line-height:1.7">
      ⚠ PROTOTYPE — Not emergency-certified. Not a commercial VPN. Not guaranteed for emergency use.
      Does not use CAP, police, fire, EMS, aviation, or public safety radios.
    </div>

  </div>`;
}


/* ──────────────────────────────────────────────
   COMMS DIAGNOSTICS PANEL (inline renders)
   ────────────────────────────────────────────── */
function renderCommsRouteList() {
  const el = document.getElementById("commsRouteList"); if (!el) return;
  const adapters = window.CommsRouter?.getAll() || [];
  if (!adapters.length) { el.innerHTML = '<div style="color:var(--dim);font-size:11px">No adapters registered</div>'; return; }
  el.innerHTML = adapters.map(a => {
    const s = a.toStatus();
    return `<div style="display:flex;align-items:center;padding:7px 0;border-bottom:1px solid var(--panel2);gap:8px">
      ${_statusDot(s.status)}
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;color:var(--txt)">${s.displayName}</div>
        <div style="font-size:10px;color:var(--dim)">${s.status.toUpperCase()} · ${_bandwidthLabel(s.bandwidth)} BW · ${[s.supports.text?"TXT":"",s.supports.images?"IMG":"",s.supports.voice?"VOICE":"",s.supports.video?"VID":""].filter(Boolean).join(" ")}</div>
        ${s.lastError ? `<div style="font-size:10px;color:var(--red)">${s.lastError}</div>` : ""}
        ${s.prototypeOnly ? '<span class="badge-exp" style="font-size:9px">PROTO</span>' : ""}
      </div>
      ${s.latencyMs ? `<div style="font-size:10px;color:var(--dim);flex-shrink:0">${s.latencyMs}ms</div>` : ""}
    </div>`;
  }).join("");
}

function renderActiveRoute() {
  const el = document.getElementById("activeRoutePanel"); if (!el) return;
  const best = window.CommsRouter?.bestAdapter();
  if (!best) { el.innerHTML = '<div style="font-size:12px;color:var(--red)">⚠ No route available — messages will queue</div>'; return; }
  const s = best.toStatus();
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      ${_statusDot(s.status)}
      <div style="font-family:var(--disp);font-weight:700;font-size:16px;color:var(--bright)">${s.displayName}</div>
    </div>
    <div style="font-size:11.5px;color:var(--dim);line-height:1.9">
      Status: <b style="color:var(--txt)">${s.status}</b><br>
      Bandwidth: <b style="color:var(--txt)">${_bandwidthLabel(s.bandwidth)}</b><br>
      ${s.latencyMs ? `Latency: <b style="color:var(--cyan)">${s.latencyMs}ms</b><br>` : ""}
      Supports: <b style="color:var(--txt)">${["text","images","voice","video"].filter(k => s.supports[k]).join(", ") || "—"}</b>
      ${s.prototypeOnly ? '<br><span style="color:var(--amber)">PROTOTYPE</span>' : ""}
      ${s.requiresApproval ? '<br><span style="color:var(--amber)">Requires approval</span>' : ""}
    </div>`;
}

function renderMsgQueue() {
  const el = document.getElementById("msgQueuePanel"); if (!el) return;
  const q = window.CommsRouter?.queue.peek() || [];
  if (!q.length) { el.innerHTML = '<div style="font-size:12px;color:var(--green)">Queue empty</div>'; return; }
  el.innerHTML = `<div style="font-size:11px;color:var(--amber);margin-bottom:6px">${q.length} message(s) queued</div>` +
    q.slice(0,5).map(m => `<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--panel2);color:var(--dim)">
      <span style="color:var(--txt)">${m.text || m.type || "message"}</span> — attempt ${m.attempts} — queued ${Math.round((Date.now()-m.queuedAt)/1000)}s ago
    </div>`).join("");
}

function renderDelivery() {
  const el = document.getElementById("deliveryPanel"); if (!el) return;
  const records = (window.CommsRouter?.delivery.getAll() || []).slice(0, 15);
  if (!records.length) { el.innerHTML = '<div style="color:var(--dim)">No messages sent yet</div>'; return; }
  const colorMap = { pending:"var(--dim)", queued:"var(--amber)", sending:"var(--cyan)", sent:"var(--txt)", delivered:"var(--green)", failed:"var(--red)", expired:"var(--dim)" };
  el.innerHTML = records.map(r => `
    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--panel2)">
      <span style="color:${colorMap[r.status]||"var(--dim)"};font-size:10px;min-width:62px">${r.status.toUpperCase()}</span>
      <span style="flex:1;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--txt)">${r.msgId}</span>
      <span style="font-size:10px;color:var(--dim);flex-shrink:0">${r.adapterId || "—"}</span>
    </div>`).join("");
}

function renderTrackingStatus() {
  const el = document.getElementById("trackingStatusPanel"); if (!el) return;
  const adapters = window.TrackingRouter?.getAll() || [];
  if (!adapters.length) { el.innerHTML = '<div style="color:var(--dim);font-size:11px">No tracking adapters</div>'; return; }
  el.innerHTML = adapters.map(a => {
    const s = a.toStatus();
    const qColor = s.dataQuality==="live"?"var(--green)":s.dataQuality==="simulated"?"#9B7FE8":s.dataQuality==="cached"?"var(--amber)":"var(--dim)";
    return `<div style="display:flex;align-items:center;padding:7px 0;border-bottom:1px solid var(--panel2);gap:8px">
      ${_statusDot(s.status)}
      <div style="flex:1">
        <div style="font-size:12px;color:var(--txt)">${s.displayName}</div>
        <div style="font-size:10px;color:var(--dim)">${s.objectCount} objects · <span style="color:${qColor}">${(s.dataQuality||"unknown").toUpperCase()}</span></div>
      </div>
      ${s.prototypeOnly ? '<span class="badge-exp" style="font-size:9px">PROTO</span>' : ""}
    </div>`;
  }).join("");
}

function renderRadioStatus() {
  const el = document.getElementById("radioStatus"); if (!el) return;
  const adapter = window.CommsRouter?.getAdapter("radio");
  if (!adapter) return;
  const s = adapter.toStatus();
  el.innerHTML = `${_statusDot(s.status)} ${s.status.toUpperCase()} · ${adapter._mode === "simulator" ? "SIMULATOR MODE (safe demo, no transmission)" : "HARDWARE MODE"}`;
}

/* ── call status ── */
function updateCallStatus() {
  const el = document.getElementById("callStatusBox"); if (!el) return;
  const sessions = window.WebRTCService?.getActiveSessions() || [];
  if (!sessions.length) { el.innerHTML = '<span style="color:var(--dim)">No active call</span>'; return; }
  const s = sessions[0];
  const qColor = s.quality==="good"?"var(--green)":s.quality==="fair"?"var(--amber)":"var(--red)";
  el.innerHTML = `
    <div style="color:var(--txt)">${s.type.toUpperCase()} CALL · <span style="color:${_statusColor(s.state)}">${s.state.toUpperCase()}</span></div>
    <div style="color:var(--dim);margin-top:2px">Peer: ${s.peerId} · ${s.duration()}s${s.quality ? ` · Quality: <span style="color:${qColor}">${s.quality}</span>` : ""}</div>
    <button class="btn" style="margin-top:6px" onclick="WebRTCService.hangup('${s.id}')">HANG UP</button>`;
}

/* ──────────────────────────────────────────────
   UPGRADED CHAT PAGE — replaces P3 chat page content
   Shows route, delivery status, sender, channel per msg
   ────────────────────────────────────────────── */
function upgradeChatPage() {
  const pg = document.getElementById("pg-chat"); if (!pg) return;
  pg.innerHTML = `
    <div style="background:var(--panel2);border-bottom:1px solid var(--line);padding:6px 12px;font-size:11px;color:var(--dim);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div id="chatRouteBadge" style="display:flex;align-items:center;gap:5px">Route: <span style="color:var(--dim)">—</span></div>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
        <input type="checkbox" id="chatLowBw" style="accent-color:var(--cyan)" onchange="p4SetLowBw(this.checked)"> Low-BW mode
      </label>
      <span style="margin-left:auto;color:var(--amber);font-size:10px">PROTOTYPE · NOT EMERGENCY-CERTIFIED</span>
    </div>
    <div class="chatChanRow">
      <span style="color:var(--dim);font-size:11px">CHANNEL</span>
      <button class="chanBtn on" id="ch-LongFast" onclick="switchChan('LongFast')">LongFast</button>
      <button class="chanBtn" id="ch-Admin" onclick="switchChan('Admin')">Admin</button>
      <button class="chanBtn" id="ch-Custom" onclick="switchChan('Custom')">Custom</button>
      <input id="chanCustom" placeholder="channel name" style="display:none;width:110px;background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:3px 7px;border-radius:3px;font-size:11px">
      <span style="margin-left:auto;font-size:11px;color:var(--dim)" id="meshNodeList">— no nodes seen</span>
    </div>
    <div class="chatMsgs" id="chatMsgs">
      <div class="chatMsg rx"><div class="cm-meta">system</div>Mesh chat ready. Routes: ${window.CommsRouter?.getAll().length || 0} adapters loaded.</div>
    </div>
    <div class="chatInput">
      <input id="chatIn" placeholder="message…" onkeydown="if(event.key==='Enter')sendChat()">
      <button onclick="sendChat()">SEND</button>
    </div>`;

  // Re-wire message handler
  MESH_STATE.onMessage = msg => {
    const el = document.getElementById("chatMsgs"); if (!el) return;
    const d = document.createElement("div");
    d.className = "chatMsg " + (msg.tx ? "tx" : "rx");
    const adapterLabel = msg._adapter || msg.via || (msg.tx ? "tx" : "mesh");
    d.innerHTML = `<div class="cm-meta">${new Date(msg.ts).toISOString().slice(11,19)}Z · ${msg.from} · ${msg.channel || ""} · <span style="color:var(--cyan)">${adapterLabel}</span>${msg.simulated ? ' · <span style="color:var(--purple)">SIM</span>' : ""}</div>${msg.text}`;
    el.appendChild(d); el.scrollTop = el.scrollHeight;
    MESH_STATE.unread = 0;
  };
  MESH_STATE.onNodeUpdate = () => {
    const el = document.getElementById("meshNodeList"); if (!el) return;
    const nodes = MESH_STATE.nodes;
    el.textContent = nodes.length ? nodes.map(n => n.name || n.id).join(" · ") : "— no nodes seen";
  };

  // Inbound from CommsRouter (radio sim, etc.)
  window.CommsRouter?.on("message", msg => {
    const el = document.getElementById("chatMsgs"); if (!el) return;
    const d = document.createElement("div");
    d.className = "chatMsg rx";
    d.innerHTML = `<div class="cm-meta">${new Date(msg.ts||Date.now()).toISOString().slice(11,19)}Z · ${msg.from||"unknown"} · via <span style="color:var(--cyan)">${msg._adapter||"?"}</span>${msg.simulated?' · <span style="color:var(--purple)">SIM</span>':""}</div>${msg.text||""}`;
    el.appendChild(d); el.scrollTop = el.scrollHeight;
  });

  updateChatRouteBadge();
}

function updateChatRouteBadge() {
  const el = document.getElementById("chatRouteBadge"); if (!el) return;
  const best = window.CommsRouter?.bestAdapter("text");
  el.innerHTML = best
    ? `Route: ${_statusDot(best.status)}<span style="color:var(--txt)">${best.displayName}</span>`
    : `Route: <span style="color:var(--red)">None — messages will queue</span>`;
}

/* ── global P4 action handlers ── */
window.p4StartVoice = function() {
  const peer = document.getElementById("rtcPeerId")?.value?.trim();
  if (!peer) { toast("Enter a peer ID first", "warn"); return; }
  WebRTCService.call(peer, "voice").then(() => updateCallStatus()).catch(e => toast(e.message, "warn"));
};
window.p4StartVideo = function() {
  const peer = document.getElementById("rtcPeerId")?.value?.trim();
  if (!peer) { toast("Enter a peer ID first", "warn"); return; }
  WebRTCService.call(peer, "video").then(() => updateCallStatus()).catch(e => toast(e.message, "warn"));
};
window.p4OpenData = function() {
  const peer = document.getElementById("rtcPeerId")?.value?.trim();
  if (!peer) { toast("Enter a peer ID first", "warn"); return; }
  WebRTCService.openDataChannel(peer).then(() => { toast("Data channel opening…", "ok"); updateCallStatus(); }).catch(e => toast(e.message, "warn"));
};
window.p4SetRadioMode = function(mode) {
  const adapter = window.CommsRouter?.getAdapter("radio");
  if (adapter) adapter.setMode(mode);
  renderRadioStatus();
  toast("Radio mode: " + mode);
};
window.p4SetLowBw = function(on) {
  window.CommsRouter?.setLowBandwidth(on);
  const el = document.getElementById("lowBwStatus");
  if (el) el.textContent = on ? "Low-bandwidth mode: images, voice, and video blocked. Text and alerts only." : "Normal mode: all message types allowed on capable routes.";
  const cb2 = document.getElementById("chatLowBw");
  if (cb2) cb2.checked = on;
  toast("Bandwidth mode: " + (on ? "LOW" : "NORMAL"), "ok");
};

/* ── send via CommsRouter instead of raw MQTT ── */
window.sendChat = function() {
  const el = document.getElementById("chatIn"); if (!el || !el.value.trim()) return;
  const text = el.value.trim(); el.value = "";
  if (!window._meshEnabled) { toast("Enable Field Mode first", "warn"); return; }
  window.CommsRouter?.send({ type: "text", text, ts: Date.now() })
    .then(r => { if (r?.queued) toast("No route — queued: " + text.slice(0,30), "warn"); })
    .catch(e => toast(e.message, "warn"));
  INCIDENT?.add({ text, tag: "team" });
};

/* ── refresh all dashboard panels ── */
window.p4RefreshDashboard = function() {
  renderCommsRouteList();
  renderActiveRoute();
  renderMsgQueue();
  renderDelivery();
  renderTrackingStatus();
  renderRadioStatus();
  updateChatRouteBadge();
  updateCallStatus();
};

/* ── wire CommsRouter callbacks to dashboard ── */
window.CommsRouter?.on("adapterChange", () => window.p4RefreshDashboard());
window.CommsRouter?.on("deliveryUpdate", () => renderDelivery());
window.CommsRouter?.on("healthUpdate", () => { renderCommsRouteList(); renderActiveRoute(); });
window.WebRTCService?.on("callState", updateCallStatus);

/* Initial render after DOM settles */
setTimeout(() => {
  buildCommsDashboardPage();
  upgradeChatPage();
  p4RefreshDashboard();
}, 300);
setInterval(p4RefreshDashboard, 5000);
