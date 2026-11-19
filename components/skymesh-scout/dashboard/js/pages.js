/* pages.js — SkyMesh Scout P3 */
"use strict";

/* ── helpers ── */
window.toast = function(msg, type = "") {
  const d = document.createElement("div");
  d.className = "toastMsg " + type; d.textContent = msg;
  document.getElementById("toast").appendChild(d);
  setTimeout(() => d.remove(), 3800);
};
window.showModal = function({ title, body, warn, confirmLabel, danger, onConfirm }) {
  const bg = document.createElement("div"); bg.className = "modal-bg";
  bg.innerHTML = `<div class="modal"><h2>${title}</h2>${warn ? `<div class="warn-box">${warn}</div>` : ""}<p>${body}</p>
    <div class="btnRow"><button class="btn" id="m-cancel">Cancel</button>
    <button class="btn${danger ? " danger" : ""}" id="m-ok">${confirmLabel || "Confirm"}</button></div></div>`;
  document.body.appendChild(bg);
  bg.querySelector("#m-cancel").onclick = () => bg.remove();
  bg.querySelector("#m-ok").onclick = () => { bg.remove(); onConfirm?.(); };
};

/* ══════════════════════════════════════════════
   SCOPE ENGINE (shared)
══════════════════════════════════════════════ */
const RING_CFG = { aircraft: { rings: 4, ringNm: 5 }, ship: { rings: 3, ringNm: 10 }, train: { rings: 3, ringNm: 20 } };
const BLIP_COLOR = { aircraft: "#62D9F7", ship: "#4DCFB4", train: "#F0B541" };
const SWEEP_MS = 4000;
const _lastPaint = {};
window._scopeData = { aircraft: [], ship: [], train: [] };
let _searchFilter = "";
let _srcFilter = { "LOCAL·1090": true, FR24: true, ADSBx: true, OpenSky: true, DEMO: true };

function initScope(id, kind) {
  _lastPaint[id] = {};
  function draw(ts) {
    const canvas = document.getElementById(id); if (!canvas) { requestAnimationFrame(draw); return; }
    const wrap = canvas.parentElement;
    const size = Math.min(wrap.clientWidth - 4, wrap.clientHeight - 4);
    if (size <= 56) {
      requestAnimationFrame(draw);
      return;
    }
    if (canvas.width !== size) { canvas.width = size; canvas.height = size; }
    const ctx = canvas.getContext("2d");
    const { rings, ringNm } = RING_CFG[kind];
    const c = size / 2, R = c - 28, pxPerNm = R / (ringNm * rings);
    ctx.clearRect(0, 0, size, size);
    // rings
    ctx.strokeStyle = "#1E2A36"; ctx.fillStyle = "#3A4A58";
    ctx.font = "10px 'IBM Plex Mono'"; ctx.textAlign = "center";
    for (let i = 1; i <= rings; i++) {
      ctx.beginPath(); ctx.arc(c, c, pxPerNm * ringNm * i, 0, 7); ctx.stroke();
      ctx.fillText(ringNm * i + "", c + 4, c - pxPerNm * ringNm * i + 12);
    }
    ctx.beginPath(); ctx.moveTo(c - R, c); ctx.lineTo(c + R, c);
    ctx.moveTo(c, c - R); ctx.lineTo(c, c + R); ctx.stroke();
    for (const [lbl, a] of [["N",0],["E",90],["S",180],["W",270]]) {
      const r = a * Math.PI / 180;
      ctx.fillText(lbl, c + Math.sin(r) * (R + 13), c - Math.cos(r) * (R + 13) + 3);
    }
    // sweep
    const sweepAngle = (ts % SWEEP_MS) / SWEEP_MS * 360;
    const sr = sweepAngle * Math.PI / 180;
    ctx.strokeStyle = BLIP_COLOR[kind] + "bb";
    ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + Math.sin(sr) * R, c - Math.cos(sr) * R); ctx.stroke();
    // entities
    const lp = _lastPaint[id];
    for (const e of window._scopeData[kind] || []) {
      if (e.rng == null || e.rng > ringNm * rings) continue;
      if (!_srcFilter[e.source]) continue;
      const ang = (e.brg || 0) * Math.PI / 180;
      const x = c + Math.sin(ang) * e.rng * pxPerNm;
      const y = c - Math.cos(ang) * e.rng * pxPerNm;
      const diff = Math.abs(((e.brg - sweepAngle) + 540) % 360 - 180);
      if (diff < 5) lp[e.id] = ts;
      const age = (ts - (lp[e.id] || 0)) / 1000;
      const glow = Math.max(0.3, 1 - age / (SWEEP_MS / 1000));
      ctx.save(); ctx.translate(x, y); ctx.rotate((e.heading || 0) * Math.PI / 180);
      ctx.globalAlpha = glow; ctx.fillStyle = BLIP_COLOR[kind];
      if (kind === "aircraft") {
        ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(4.5,6); ctx.lineTo(0,3.4); ctx.lineTo(-4.5,6); ctx.closePath(); ctx.fill();
      } else if (kind === "ship") {
        ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(5,7); ctx.lineTo(-5,7); ctx.closePath(); ctx.fill();
      } else { ctx.fillRect(-5,-4,10,8); }
      ctx.restore();
      ctx.globalAlpha = Math.max(0.45, glow);
      ctx.textAlign = "left"; ctx.font = "10px 'IBM Plex Mono'";
      ctx.fillStyle = "#C7D3DC"; ctx.fillText(e.name.slice(0, 10), x + 9, y - 3);
      ctx.fillStyle = "#6B7B88";
      ctx.fillText(kind === "aircraft" ? Math.round(e.altitude/100).toString().padStart(3,"0")+" "+Math.round(e.speed) : Math.round(e.speed)+" kt", x+9, y+9);
      ctx.globalAlpha = 1;
    }
    // team node pins
    if (window.drawTeamPins && kind === "aircraft") {
      window.drawTeamPins(ctx, MESH_STATE?.nodes || [], c, c, pxPerNm);
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

/* ── source pill toggle ── */
window.toggleSrc = function(src, btn) {
  _srcFilter[src] = !_srcFilter[src];
  btn.classList.toggle("on", _srcFilter[src]);
};

/* ── cards ── */
function buildCards(containerId, entities, kind) {
  const el = document.getElementById(containerId); if (!el) return;
  const acc = kind === "aircraft" ? "ac-b" : kind === "ship" ? "sh-b" : "tr-b";
  const hotCls = kind === "aircraft" ? "hot-ac" : kind === "ship" ? "hot-sh" : "hot-tr";
  const filtered = entities.filter(e => !_searchFilter || e.name.toLowerCase().includes(_searchFilter) || (e.callsign||"").toLowerCase().includes(_searchFilter));
  el.innerHTML = filtered.slice(0, 8).map((e, i) => `
    <div class="ecard ${i === 0 ? hotCls : ""}" onclick="openDetail(window._entityMap?.get('${e.id}') || {})">
      <span class="etype">${e.extra?.acType || e.extra?.shipType || "—"}</span>
      <div class="eid">${e.name.slice(0,12)}</div>
      <div class="erow">
        <div class="ef"><span>ALT</span><b class="${acc}">${Math.round(e.altitude).toLocaleString()}ft</b></div>
        <div class="ef"><span>SPD</span><b class="${acc}">${Math.round(e.speed)}kt</b></div>
        <div class="ef"><span>RNG</span><b class="${acc}">${(e.rng||0).toFixed(1)}nm</b></div>
        <div class="ef"><span>BRG</span><b class="${acc}">${SOURCES.compass(e.brg||0)}</b></div>
      </div>
      <div style="margin-top:5px"><span class="srcTag${e.source !== "DEMO" ? " live" : ""}">${e.source}</span></div>
    </div>`).join("");
}

/* ── map table ── */
function buildTable(tbodyId, entities) {
  const el = document.getElementById(tbodyId); if (!el) return;
  const filtered = entities.filter(e => !_searchFilter || e.name.toLowerCase().includes(_searchFilter) || (e.callsign||"").toLowerCase().includes(_searchFilter));
  el.innerHTML = filtered.map(e => `
    <tr style="cursor:pointer" onclick="openDetail(window._entityMap?.get('${e.id}') || {})">
      <td class="name-cell">${e.name}</td>
      <td>${e.extra?.acType || e.extra?.shipType || "—"}</td>
      <td style="color:var(--cyan)">${Math.round(e.altitude).toLocaleString()}</td>
      <td style="color:var(--cyan)">${Math.round(e.speed)}</td>
      <td style="color:var(--cyan)">${(e.rng||0).toFixed(1)}</td>
      <td>${Math.round(e.brg||0).toString().padStart(3,"0")}° ${SOURCES.compass(e.brg||0)}</td>
      <td><span class="srcTag${e.source!=="DEMO"?" live":""}">${e.source}</span></td>
    </tr>`).join("");
}

window.updateTrackingViews = function(data) {
  window._entityMap = new Map([...data.aircraft, ...data.ships, ...data.trains].map(e => [e.id, e]));
  window._scopeData.aircraft = data.aircraft;
  window._scopeData.ship = data.ships;
  window._scopeData.train = data.trains;
  buildCards("acCards", data.aircraft, "aircraft");
  buildCards("shCards", data.ships, "ship");
  buildCards("trCards", data.trains, "train");
  buildTable("acTbody", data.aircraft);
  const hudAC = document.getElementById("hudSrcAC");
  if (hudAC) hudAC.textContent = data.demo ? "DEMO" : "LOCAL·1090";
  document.getElementById("acCount").textContent = data.aircraft.length;
  document.getElementById("shCount").textContent = data.ships.length;
  document.getElementById("trCount").textContent = data.trains.length;
};

/* ══════════════════════════════════════════════
   AIRCRAFT PAGE
══════════════════════════════════════════════ */
(function() {
  const pg = document.getElementById("pg-aircraft");
  pg.innerHTML = `
    <div class="srcBlend">
      <span style="font-size:11px;color:var(--dim);margin-right:4px;align-self:center">SOURCES</span>
      <span class="srcPill on local" onclick="toggleSrc('LOCAL·1090',this)" title="Local ADS-B 1090 MHz">LOCAL</span>
      <span class="srcPill on fr24"  onclick="toggleSrc('FR24',this)"  title="FlightRadar24 Pi24">FR24</span>
      <span class="srcPill on adsbx" onclick="toggleSrc('ADSBx',this)" title="ADS-B Exchange">ADSBx</span>
      <span class="srcPill on"       onclick="toggleSrc('OpenSky',this)" style="border-color:var(--green);color:var(--green)" title="OpenSky Network">OpenSky</span>
      <span class="srcPill on"       onclick="toggleSrc('DEMO',this)" title="Demo feed">DEMO</span>
      <div class="searchBar" style="margin-left:auto;border:none;padding:0 0 0 12px">
        <input id="acSearch" placeholder="filter callsign / type…" oninput="_searchFilter=this.value.toLowerCase();buildCards('acCards',window._scopeData.aircraft||[],'aircraft');buildTable('acTbody',window._scopeData.aircraft||[])">
        <select id="altFilter" onchange="filterByAlt(this.value)">
          <option value="">All altitudes</option>
          <option value="3000">Below 3,000 ft</option>
          <option value="10000">Below 10,000 ft</option>
          <option value="18000">Below 18,000 ft</option>
        </select>
        <button class="exportBtn" onclick="exportSnapshot(window._lastData||{},'json')">JSON</button>
        <button class="exportBtn" onclick="exportSnapshot(window._lastData||{},'csv')">CSV</button>
      </div>
    </div>
    <div class="trackLayout" style="flex:1">
      <div class="scopeWrap">
        <canvas class="scope" id="acScope"></canvas>
        <div class="scopeHud ac-hud">RINGS <b>5 NM</b><br>SRC <b id="hudSrcAC">—</b></div>
      </div>
      <aside class="trackSidebar">
        <div class="sideTitle">NEAREST AIRCRAFT</div>
        <div id="acCards"></div>
      </aside>
    </div>
    <div style="overflow:auto;max-height:220px;border-top:1px solid var(--line)">
      <table><thead><tr>
        <th>CALLSIGN</th><th>TYPE</th><th>ALT FT</th><th>SPD KT</th><th>RNG NM</th><th>BRG</th><th>SRC</th>
      </tr></thead><tbody id="acTbody"></tbody></table>
    </div>`;
  setTimeout(() => initScope("acScope", "aircraft"), 200);
  window.filterByAlt = function(v) {
    const cap = v ? +v : Infinity;
    window._altCap = cap;
  };
})();

/* ══════════════════════════════════════════════
   SHIPS PAGE
══════════════════════════════════════════════ */
(function() {
  const pg = document.getElementById("pg-ships");
  pg.innerHTML = `
    <div class="trackLayout">
      <div class="scopeWrap">
        <canvas class="scope" id="shScope"></canvas>
        <div class="scopeHud sh-hud">RINGS <b>10 NM</b><br>SRC <b id="hudSrcSH">DEMO</b>
          <br><span class="badge-exp" style="margin-top:4px;display:inline-block">AIS DEMO MODE</span>
          <br><span style="font-size:10px;color:var(--dim)">Legal AIS sources only</span></div>
      </div>
      <aside class="trackSidebar">
        <div class="sideTitle">NEAREST VESSELS</div>
        <div id="shCards"></div>
      </aside>
    </div>`;
  setTimeout(() => initScope("shScope", "ship"), 200);
})();

/* ══════════════════════════════════════════════
   TRAINS PAGE
══════════════════════════════════════════════ */
(function() {
  const pg = document.getElementById("pg-trains");
  pg.innerHTML = `
    <div class="trackLayout">
      <div class="scopeWrap">
        <canvas class="scope" id="trScope"></canvas>
        <div class="scopeHud tr-hud">RINGS <b>20 NM</b><br>SRC <b>DEMO/AMTRAK</b>
          <br><span style="font-size:10px;color:var(--dim)">Freight data not public</span></div>
      </div>
      <aside class="trackSidebar">
        <div class="sideTitle">NEARBY TRAINS</div>
        <div id="trCards"></div>
      </aside>
    </div>`;
  setTimeout(() => initScope("trScope", "train"), 200);
})();

/* PROJECTOR PAGE — managed by sky-projector.js + p4.4-pages.js */
(function() {
  const pg = document.getElementById("pg-projector");
  if (pg) pg.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#000;color:#2E6D80;font-family:monospace;font-size:12px">Loading sky projection…</div>';
})();

/* ══════════════════════════════════════════════
   PUBLIC AWARENESS / LINKS PAGE
══════════════════════════════════════════════ */
(function() {
  document.getElementById("pg-awareness").innerHTML = `<div style="padding:16px;height:100%;overflow-y:auto;display:flex;flex-direction:column;gap:12px">

    <div style="border:1px solid var(--cyan-dim);border-radius:4px;background:rgba(98,217,247,.04);padding:10px 14px;font-size:12px;color:var(--txt);line-height:1.7">
      <b style="color:var(--cyan)">EXTERNAL LINKS</b> — These open aviation, marine, rail, and weather websites in a new tab.
      <br>If links don't open: this is a browser security restriction on local HTML files.
      Deploy to the Pi and open <b>http://[pi-ip]:8080</b> from your browser — all links work there.
    </div>

    <div class="awareGrid" style="margin:0">
      <div class="aCard">
        <h3>✈ AVIATION</h3>
        <a class="aLink" href="https://www.flightradar24.com" target="_blank" rel="noopener">FlightRadar24</a>
        <a class="aLink" href="https://globe.adsbexchange.com" target="_blank" rel="noopener">ADS-B Exchange Globe</a>
        <a class="aLink" href="https://opensky-network.org" target="_blank" rel="noopener">OpenSky Network</a>
        <a class="aLink" href="https://aviationweather.gov" target="_blank" rel="noopener">Aviation Weather Center</a>
        <a class="aLink" href="https://www.faa.gov/air_traffic/flight_info/aeronav/nfd/" target="_blank" rel="noopener">FAA NOTAMs</a>
        <div class="aNote">Receive only. Not certified avionics. Not collision avoidance equipment.</div>
      </div>

      <div class="aCard">
        <h3>⛵ MARINE</h3>
        <a class="aLink" href="https://www.marinetraffic.com" target="_blank" rel="noopener">MarineTraffic</a>
        <a class="aLink" href="https://www.vesseltracker.com" target="_blank" rel="noopener">VesselTracker</a>
        <a class="aLink" href="https://www.navcen.uscg.gov" target="_blank" rel="noopener">USCG Navigation Center</a>
        <a class="aLink" href="https://www.aishub.net" target="_blank" rel="noopener">AISHub (free AIS data)</a>
        <div class="aNote">No AIS transmission. Receive only. Legal sources only.</div>
      </div>

      <div class="aCard">
        <h3>🚂 RAIL</h3>
        <a class="aLink" href="https://www.amtrak.com/train-status" target="_blank" rel="noopener">Amtrak Train Status</a>
        <a class="aLink" href="https://www.amtrak.com/track-your-train.html" target="_blank" rel="noopener">Amtrak Live Map</a>
        <div class="aNote">Freight train locations are not public. Only official Amtrak data used.</div>
      </div>

      <div class="aCard">
        <h3>🌤 WEATHER</h3>
        <a class="aLink" href="https://www.weather.gov" target="_blank" rel="noopener">NOAA / NWS</a>
        <a class="aLink" href="https://zoom.earth" target="_blank" rel="noopener">Zoom Earth (satellite radar)</a>
        <a class="aLink" href="https://tidesandcurrents.noaa.gov" target="_blank" rel="noopener">NOAA Tides and Currents</a>
        <a class="aLink" href="https://aviationweather.gov/metar" target="_blank" rel="noopener">Aviation METARs</a>
      </div>

      <div class="aCard">
        <h3>📡 MESHTASTIC</h3>
        <a class="aLink" href="https://meshtastic.org" target="_blank" rel="noopener">Meshtastic.org</a>
        <a class="aLink" href="https://flasher.meshtastic.org" target="_blank" rel="noopener">Web Flasher (firmware)</a>
        <a class="aLink" href="https://meshtastic.org/docs/hardware/devices/" target="_blank" rel="noopener">Supported Hardware</a>
        <a class="aLink" href="https://meshtastic.org/docs/configuration/tips/" target="_blank" rel="noopener">Config Tips</a>
      </div>

      <div class="aCard">
        <h3>📻 SDR / ADS-B</h3>
        <a class="aLink" href="https://www.rtl-sdr.com/store" target="_blank" rel="noopener">RTL-SDR Blog Store</a>
        <a class="aLink" href="https://www.adsbexchange.com/ways-to-join-the-exchange/build-your-own/" target="_blank" rel="noopener">ADS-B Exchange DIY</a>
        <a class="aLink" href="https://www.flightradar24.com/build-your-own" target="_blank" rel="noopener">FlightRadar24 Pi24</a>
        <a class="aLink" href="https://github.com/wiedehopf/adsb-scripts" target="_blank" rel="noopener">wiedehopf readsb scripts</a>
      </div>
    </div>

    <style>
      .aLink {
        display:block;padding:5px 0;color:var(--cyan);font-size:12px;
        text-decoration:none;border-bottom:1px solid var(--line);
      }
      .aLink:hover { color:#fff; }
      .aLink:last-of-type { border:none; }
    </style>

  </div>`;
})();

/* ══════════════════════════════════════════════
   FIELD PAGE — clear, functional field mode UI
══════════════════════════════════════════════ */
(function() {
  const pg = document.getElementById("pg-field");
  pg.innerHTML = `
  <div style="height:100%;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px">

    <!-- What field mode does -->
    <div style="border:1px solid var(--cyan-dim);border-radius:4px;background:rgba(98,217,247,.04);padding:12px 14px;font-size:12px;color:var(--txt);line-height:1.8">
      <b style="color:var(--cyan);font-family:var(--disp);font-size:13px;letter-spacing:.1em">WHAT FIELD MODE DOES</b><br>
      Field Mode enables off-grid mesh communications through your Meshtastic node.
      When on, you can send check-ins, text messages, and short aircraft alerts to other nodes
      on the mesh — with or without internet, using LoRa radio.
      MQTT Bridge extends this over the internet for long-range links like NJ to AZ.
    </div>

    <!-- Step 1: Enable -->
    <div class="fPanel">
      <h3>STEP 1 — ENABLE FIELD MODE</h3>
      <div class="fbody">
        <label style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
          <div>
            <div style="font-size:13px;color:var(--bright)">Field Mode</div>
            <div style="font-size:11px;color:var(--dim)">Activates mesh communications via Meshtastic node on USB</div>
          </div>
          <input type="checkbox" id="meshOn" style="accent-color:var(--cyan);width:18px;height:18px" onchange="window.toggleMesh()">
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-top:1px solid var(--line);margin-top:6px">
          <div>
            <div style="font-size:13px;color:var(--bright)">MQTT Internet Bridge</div>
            <div style="font-size:11px;color:var(--dim)">Routes mesh messages over internet — required for NJ to AZ</div>
          </div>
          <input type="checkbox" id="mqttOn" style="accent-color:var(--cyan);width:18px;height:18px" onchange="window.toggleMqttBridge()">
        </label>
        <div style="margin-top:10px;font-size:12px;color:var(--dim)">
          Status: <span id="fieldStatusText" style="color:var(--dim)">Field Mode off</span>
        </div>
      </div>
      <div class="fNote">Requires a Meshtastic US915 node connected via USB. Does not use aviation, police, fire, or public safety frequencies.</div>
    </div>

    <!-- Step 2: Check in -->
    <div class="fPanel">
      <h3>STEP 2 — SEND A CHECK-IN</h3>
      <div class="fbody">
        <div style="font-size:12px;color:var(--dim);margin-bottom:10px">Sends a short status message to all nodes on your mesh channel.</div>
        <div class="btnRow">
          <button class="btn" onclick="window.checkin('OK')">✓ OK</button>
          <button class="btn" onclick="window.checkin('MOVING')">→ MOVING</button>
          <button class="btn" onclick="window.checkin('AT BASE')">⌂ AT BASE</button>
          <button class="btn" onclick="window.checkin('NEED SUPPORT')">! NEED SUPPORT</button>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--dim)">Enable Field Mode first. Check-ins appear in the Chat page and on other nodes.</div>
      </div>
    </div>

    <!-- Step 3: Node role -->
    <div class="fPanel">
      <h3>STEP 3 — NODE ROLE</h3>
      <div class="fbody">
        <div style="font-size:12px;color:var(--dim);margin-bottom:8px">
          Controls how your Meshtastic node behaves on the mesh.
        </div>
        <select id="meshRoleSelect" style="background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:7px 10px;border-radius:3px;font-size:12px;width:100%" onchange="window.changeMeshRole(this.value)">
          <option value="CLIENT">Client — normal node, also relays (default for carried devices)</option>
          <option value="CLIENT_MUTE">Client Mute — receives only, does not relay</option>
          <option value="ROUTER">Router — priority relay, use only when fixed and elevated</option>
          <option value="REPEATER">Repeater — relay only, for infrastructure nodes</option>
        </select>
        <div id="roleWarning" style="display:none;margin-top:8px;padding:8px 10px;background:#120e00;border:1px solid var(--amber-dim);border-radius:3px;font-size:11px;color:var(--amber);line-height:1.6">
          ⚠ Router and Repeater roles should only be used for a fixed, elevated, permanently powered node.
          Using these on a carried device degrades mesh performance for everyone nearby.
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--dim)">Current role: <span id="meshRole" style="color:var(--cyan)">CLIENT</span></div>
      </div>
    </div>

    <!-- Step 4: Aircraft alerts -->
    <div class="fPanel">
      <h3>STEP 4 — AIRCRAFT ALERTS TO MESH (optional)</h3>
      <div class="fbody">
        <div style="font-size:12px;color:var(--dim);margin-bottom:10px">
          When enabled, sends a short alert when an aircraft, vessel, or train enters the range threshold.
          One message per entity per repeat window — designed to protect LoRa airtime.
        </div>
        <label style="display:flex;justify-content:space-between;align-items:center;padding:3px 0">Aircraft alerts <input type="checkbox" id="alertsOn" style="accent-color:var(--cyan);width:16px;height:16px"></label>
        <label style="display:flex;justify-content:space-between;align-items:center;padding:3px 0">Vessel alerts <input type="checkbox" id="shipAlertsOn" style="accent-color:var(--sea);width:16px;height:16px"></label>
        <label style="display:flex;justify-content:space-between;align-items:center;padding:3px 0">Train alerts <input type="checkbox" id="trainAlertsOn" style="accent-color:var(--amber);width:16px;height:16px"></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
          <label style="font-size:12px;color:var(--dim)">Alert range (nm)
            <input type="number" id="rRange" value="10" min="1" max="50" style="display:block;width:100%;margin-top:3px;background:var(--panel2);border:1px solid var(--line);color:var(--cyan);font-family:var(--mono);padding:5px 8px;border-radius:3px;font-size:12px">
          </label>
          <label style="font-size:12px;color:var(--dim)">Max altitude (ft)
            <input type="number" id="rAlt" value="8000" min="500" step="500" style="display:block;width:100%;margin-top:3px;background:var(--panel2);border:1px solid var(--line);color:var(--cyan);font-family:var(--mono);padding:5px 8px;border-radius:3px;font-size:12px">
          </label>
          <label style="font-size:12px;color:var(--dim)">Repeat window (min)
            <input type="number" id="rRepeat" value="10" min="1" style="display:block;width:100%;margin-top:3px;background:var(--panel2);border:1px solid var(--line);color:var(--cyan);font-family:var(--mono);padding:5px 8px;border-radius:3px;font-size:12px">
          </label>
        </div>
      </div>
      <div class="fNote">Alerts are short text only. Never repeats aviation, police, fire, or public safety traffic.</div>
    </div>

    <!-- Incident log -->
    <div class="fPanel">
      <h3>INCIDENT LOG</h3>
      <div class="fbody">
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <input id="ilInput" placeholder="Add a manual note…" style="flex:1;background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:6px 9px;border-radius:3px;font-size:12px">
          <button class="btn" onclick="window.addManualNote()">LOG</button>
          <button class="btn" onclick="window.downloadIncident('csv')">CSV</button>
          <button class="btn" onclick="window.downloadIncident('json')">JSON</button>
        </div>
        <div id="ilList" style="max-height:200px;overflow-y:auto;font-size:11.5px"></div>
      </div>
    </div>

  </div>`;

  // Wire role select warning
  document.getElementById("meshRoleSelect")?.addEventListener("change", function() {
    const warn = document.getElementById("roleWarning");
    if (warn) warn.style.display = ["ROUTER","REPEATER"].includes(this.value) ? "" : "none";
  });
})();

/* ══════════════════════════════════════════════
   CHAT PAGE — two-way mesh text, channel selector
══════════════════════════════════════════════ */
(function() {
  const pg = document.getElementById("pg-chat");
  pg.innerHTML = `
    <div class="chatWrap">
      <div class="chatChanRow">
        <span style="color:var(--dim);font-size:11px">CHANNEL</span>
        <button class="chanBtn on" id="ch-LongFast" onclick="switchChan('LongFast')">LongFast</button>
        <button class="chanBtn" id="ch-Admin" onclick="switchChan('Admin')">Admin</button>
        <button class="chanBtn" id="ch-Custom" onclick="switchChan('Custom')">Custom</button>
        <input id="chanCustom" placeholder="channel name" style="display:none;width:110px;background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:3px 7px;border-radius:3px;font-size:11px">
        <span style="margin-left:auto;font-size:11px;color:var(--dim)" id="meshNodeList">— no nodes seen</span>
      </div>
      <div class="chatMsgs" id="chatMsgs">
        <div class="chatMsg rx"><div class="cm-meta">system</div>Mesh chat ready. Enable Field Mode and MQTT Bridge to connect.</div>
      </div>
      <div class="chatInput">
        <input id="chatIn" placeholder="message…" onkeydown="if(event.key==='Enter')sendChat()">
        <button onclick="sendChat()">SEND</button>
      </div>
    </div>`;

  MESH_STATE.onMessage = msg => {
    const el = document.getElementById("chatMsgs"); if (!el) return;
    const d = document.createElement("div");
    d.className = "chatMsg " + (msg.tx ? "tx" : "rx");
    d.innerHTML = `<div class="cm-meta">${new Date(msg.ts).toISOString().slice(11,19)}Z · ${msg.from}</div>${msg.text}`;
    el.appendChild(d); el.scrollTop = el.scrollHeight;
    MESH_STATE.unread = 0;
  };
  MESH_STATE.onNodeUpdate = () => {
    const el = document.getElementById("meshNodeList"); if (!el) return;
    const nodes = MESH_STATE.nodes;
    el.textContent = nodes.length ? nodes.map(n => n.name || n.id).join(" · ") : "— no nodes seen";
  };
})();

window.switchChan = function(ch) {
  document.querySelectorAll(".chanBtn").forEach(b => b.classList.remove("on"));
  const custom = document.getElementById("chanCustom");
  if (ch === "Custom") {
    if (custom) custom.style.display = ""; return;
  }
  if (custom) custom.style.display = "none";
  document.getElementById("ch-" + ch)?.classList.add("on");
  MQTT.setChannel(ch);
};
window.sendChat = function() {
  const el = document.getElementById("chatIn"); if (!el || !el.value.trim()) return;
  if (!window._meshEnabled) { toast("Enable Field Mode first", "warn"); return; }
  MQTT.sendText(el.value.trim()); el.value = "";
};

/* ══════════════════════════════════════════════
   ADMIN PAGE — real save functionality
══════════════════════════════════════════════ */
setTimeout(function() {
  if (!document.getElementById("pg-admin")) return;
  document.getElementById("pg-admin").innerHTML = `<div class="adminWrap">

    <div class="aPanel"><h3>RECEIVER POSITION</h3><div class="abody">
      <label>Latitude  <input type="number" id="cfgLat" step="0.0001" value="${window.SOURCES?.CFG?.rxLat || 34.6150}"></label>
      <label>Longitude <input type="number" id="cfgLon" step="0.0001" value="${window.SOURCES?.CFG?.rxLon || -112.4500}"></label>
      <label>Auto GPS  <input type="checkbox" id="cfgGpsAuto" checked onchange="if(this.checked)window.tryGpsPosition?.()"></label>
      <div class="btnRow" style="margin-top:8px">
        <button class="btn" onclick="window.adminSavePos()">Save position</button>
      </div>
    </div></div>

    <div class="aPanel"><h3>MQTT / MESH</h3><div class="abody">
      <label>MQTT broker <input type="text" id="cfgMqttBroker" value="${window.SOURCES?.CFG?.mqttBroker || 'mqtt.meshtastic.org'}"></label>
      <label>Self-hosted broker URL <input type="text" id="cfgMqttSelf" placeholder="ws://yourserver:9001" value="${window.SOURCES?.CFG?.mqttSelfHost || ''}"></label>
      <div class="btnRow" style="margin-top:8px">
        <button class="btn" onclick="window.adminSaveMqtt()">Save MQTT settings</button>
      </div>
      <div style="font-size:11px;color:var(--dim);margin-top:6px">Community broker: free, no setup needed. Self-hosted: private, requires Mosquitto or similar.</div>
    </div></div>

    <div class="aPanel"><h3>AIRCRAFT RECEIVER</h3><div class="abody">
      <label>aircraft.json path <input type="text" id="cfgJson" value="${window.SOURCES?.CFG?.aircraftJson || '/run/readsb/aircraft.json'}"></label>
      <label>Poll interval (ms)  <input type="number" id="cfgPoll" value="${window.SOURCES?.CFG?.pollMs || 2500}" min="1000" step="500"></label>
      <div class="btnRow" style="margin-top:8px">
        <button class="btn" onclick="window.adminSaveReceiver()">Save receiver settings</button>
      </div>
    </div></div>

    <div class="aPanel"><h3>API CONNECTORS</h3><div class="abody">
      <div style="font-size:11.5px;color:var(--dim);margin-bottom:8px;line-height:1.6">
        API keys are stored in <code>config.secrets.json</code> on the Pi — never in the browser.
        Enter keys here to save them to the server. They will not be visible in guest mode.
      </div>
      <label>FlightRadar24 Pi24 token <input type="password" id="kFR24" placeholder="leave blank to keep existing"></label>
      <label>ADSBx API key          <input type="password" id="kADSBx" placeholder="leave blank to keep existing"></label>
      <label>OpenSky user:pass       <input type="password" id="kOpenSky" placeholder="user:pass (optional)"></label>
      <label>AISHub username         <input type="password" id="kAISHub" placeholder="leave blank to keep existing"></label>
      <div class="btnRow" style="margin-top:8px">
        <button class="btn" onclick="window.adminSaveKeys()">Save API keys (server-side only)</button>
      </div>
    </div></div>

    <div class="aPanel"><h3>NODE IDENTITY</h3><div class="abody">
      <label>Node name     <input type="text" id="cfgNodeName" value="${window.NODE_IDENTITY?.get?.()?.nodeName || ''}"></label>
      <label>Location label <input type="text" id="cfgNodeLoc"  value="${window.NODE_IDENTITY?.get?.()?.nodeLocation || ''}"></label>
      <label>Node role
        <select id="cfgNodeRole" style="flex:1;background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:4px 7px;border-radius:3px">
          <option value="home">Home node</option>
          <option value="relay">Relay node</option>
          <option value="mobile">Mobile node</option>
          <option value="field">Field node</option>
          <option value="test">Test node</option>
        </select>
      </label>
      <div class="btnRow" style="margin-top:8px">
        <button class="btn" onclick="window.adminSaveIdentity()">Save identity</button>
      </div>
    </div></div>

    <div class="aPanel"><h3>NETWORK</h3><div class="abody">
      <label>Hotspot SSID   <input type="text" id="cfgSSID" value="SkyMesh-Scout"></label>
      <label>Guest read-only <input type="checkbox" id="guestMode"></label>
      <label>Admin password  <input type="password" id="adminPw" placeholder="set password"></label>
      <div class="btnRow" style="margin-top:8px">
        <button class="btn" onclick="window.adminSaveNetwork()">Save network settings</button>
      </div>
      <div style="font-size:11px;color:var(--dim);margin-top:6px">Dashboard: <b style="color:var(--cyan)">http://skymesh.local:8080</b></div>
    </div></div>

    <div class="aPanel"><h3>SAFETY AND LEGAL</h3><div class="abody" style="line-height:2;font-size:11.5px;color:var(--dim)">
      <p>✓ Receive only — 1090 / 978 MHz</p>
      <p>✓ No aviation frequency transmission</p>
      <p>✓ No scanner relay through mesh</p>
      <p>✓ Meshtastic LoRa — FCC Part 15</p>
      <p>✓ MQTT bridge — internet transport only</p>
      <p>✓ AIS receive only</p>
      <p style="color:var(--amber);margin-top:6px">Label for org use:<br>"ADS-B situational awareness, training/prototype only."</p>
    </div></div>

    <div id="adminSaveStatus" style="display:none;padding:10px 14px;border-radius:4px;font-size:12px;margin-top:4px"></div>

  </div>`;
}, 100);

/* Admin save handlers */
window.adminSavePos = function() {
  const lat = parseFloat(document.getElementById("cfgLat")?.value);
  const lon = parseFloat(document.getElementById("cfgLon")?.value);
  if (isNaN(lat)||isNaN(lon)) { window.toast?.("Invalid coordinates","warn"); return; }
  if (window.SOURCES?.CFG) { window.SOURCES.CFG.rxLat = lat; window.SOURCES.CFG.rxLon = lon; }
  window.SkyProjector?.setPosition(lat, lon);
  window._adminSave({ rxLat: lat, rxLon: lon });
  window.toast?.("Position saved: "+lat.toFixed(4)+", "+lon.toFixed(4), "ok");
};
window.adminSaveMqtt = function() {
  const broker = document.getElementById("cfgMqttBroker")?.value || "";
  const self   = document.getElementById("cfgMqttSelf")?.value  || "";
  if (window.SOURCES?.CFG) { window.SOURCES.CFG.mqttBroker = broker; window.SOURCES.CFG.mqttSelfHost = self; }
  window._adminSave({ mqttBroker: broker, mqttSelfHost: self });
  window.toast?.("MQTT settings saved", "ok");
};
window.adminSaveReceiver = function() {
  const json = document.getElementById("cfgJson")?.value || "";
  const poll = parseInt(document.getElementById("cfgPoll")?.value || "2500");
  if (window.SOURCES?.CFG) { window.SOURCES.CFG.aircraftJson = json; window.SOURCES.CFG.pollMs = poll; }
  window._adminSave({ aircraftJson: json, pollMs: poll });
  window.toast?.("Receiver settings saved", "ok");
};
window.adminSaveKeys = function() {
  const keys = {};
  const fr24   = document.getElementById("kFR24")?.value;
  const adsbx  = document.getElementById("kADSBx")?.value;
  const opensky= document.getElementById("kOpenSky")?.value;
  const aishub = document.getElementById("kAISHub")?.value;
  if (fr24)    keys.fr24    = fr24;
  if (adsbx)   keys.adsbx   = adsbx;
  if (opensky) keys.opensky = opensky;
  if (aishub)  keys.aishub  = aishub;
  if (!Object.keys(keys).length) { window.toast?.("No keys entered","warn"); return; }
  // Send to server — keys stored server-side only, never in browser storage
  fetch("api/config/save", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ _apiKeyUpdate: keys })
  }).then(r => r.ok ? window.toast?.("API keys saved (server-side only)","ok") : window.toast?.("Server save failed","warn"))
    .catch(() => window.toast?.("Could not reach server — keys NOT saved","warn"));
  // Clear the fields
  ["kFR24","kADSBx","kOpenSky","kAISHub"].forEach(id => { const el=document.getElementById(id); if(el) el.value=""; });
};
window.adminSaveIdentity = function() {
  const name = document.getElementById("cfgNodeName")?.value || "";
  const loc  = document.getElementById("cfgNodeLoc")?.value  || "";
  const role = document.getElementById("cfgNodeRole")?.value || "home";
  window._adminSave({ nodeName: name, nodeLocation: loc, nodeRole: role });
  window.toast?.("Identity saved", "ok");
};
window.adminSaveNetwork = function() {
  const guest = document.getElementById("guestMode")?.checked ?? false;
  window._adminSave({ guestMode: guest });
  window.toast?.("Network settings saved", "ok");
};
window._adminSave = function(patch) {
  fetch("api/config/save", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify(patch)
  }).then(r => {
    if (!r.ok) window.toast?.("Server save failed — changes in memory only","warn");
  }).catch(() => window.toast?.("Server unreachable — changes in memory only","warn"));
};

/* ══════════════════════════════════════════════
   ABOUT PAGE
══════════════════════════════════════════════ */
(function() {
  document.getElementById("pg-about").innerHTML = `<div class="aboutWrap">
    <h1>SKY<b>MESH</b> SCOUT</h1>
    <div class="buildBadge"><span>Prototype 3</span> <span>Stuff Studios</span> <span>AegisNet test bed</span></div>
    <h2>WHAT IT IS</h2>
    <p>SkyMesh Scout is a portable aircraft, ship, and train tracking projector. It uses local ADS-B reception as the primary aircraft source, with optional online connectors for FlightRadar24, ADS-B Exchange, and OpenSky. It projects live traffic onto walls and ceilings.</p>
    <p>The optional Field Connectivity module adds off-grid Meshtastic mesh messaging, team GPS tracking, and short alert delivery over LoRa. The MQTT internet bridge connects geographically separated nodes — tested NJ to AZ — using the Meshtastic community broker or a self-hosted private broker.</p>
    <h2>WHY PEOPLE WANT IT ON THEIR PROPERTY</h2>
    <p>A property node with internet access acts as a mesh gateway, extending the AegisNet network for nearby field nodes that have no internet. The more nodes deployed, the wider and more resilient the mesh. The aircraft tracker is what makes the device worth owning even when there's no field operation.</p>
    <div class="notBox">
      <b>This device is not:</b><br>
      · Radar or an active sensor<br>
      · Certified avionics or collision avoidance equipment<br>
      · A public safety radio repeater<br>
      · An aviation frequency transmitter<br>
      · A scanner relay<br>
      · A replacement for approved pilot, mariner, or ATC tools
    </div>
    <h2>BUILD</h2>
    <ul>
      <li>Raspberry Pi 5 8GB — readsb + tar1090 + this dashboard</li>
      <li>RTL-SDR Blog V4 — 1090 MHz ADS-B receive only</li>
      <li>Optional SDR #2 — 978 MHz UAT weather</li>
      <li>Meshtastic node — LILYGO T-Beam Supreme or RAK WisBlock, US915</li>
      <li>Mini 1080p HDMI projector</li>
      <li>65W+ USB-C PD battery</li>
      <li>Rugged case, external antenna ports</li>
    </ul>
    <h2>NETWORK TOPOLOGY</h2>
    <p>Local LoRa mesh handles the last mile between nearby nodes. Nodes with internet relay through MQTT to connect distant locations. The community broker at mqtt.meshtastic.org is used by default. A self-hosted WireGuard/VPS broker can be configured for private AegisNet operation.</p>
    <h2>PROTOTYPE STATUS</h2>
    <p>P3 is a working prototype and test bed. It is not a production product. Label for organizational use: "ADS-B situational awareness, training/prototype only."</p>
  </div>`;
})();
