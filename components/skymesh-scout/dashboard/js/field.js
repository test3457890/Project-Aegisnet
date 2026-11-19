/* field.js — SkyMesh Scout P3
   Alert profiles, incident log, alert engine, team overlay pins.
*/
"use strict";

/* ══════════════════════════════════════════════
   ALERT PROFILES
══════════════════════════════════════════════ */
const PROFILES = [
  {
    id: "search_grid",
    name: "Search Grid",
    desc: "Low and slow aircraft, helicopters. Tight range. Good for SAR, drop zones, training areas.",
    maxRangeNm: 8, maxAltFt: 3000, repeatMin: 5,
    filterFn: e => e.altitude < 3000 || (e.extra?.acType || "").startsWith("H")
  },
  {
    id: "event_perimeter",
    name: "Event Perimeter",
    desc: "All traffic within 5 nm regardless of altitude. Event security and airshow coverage.",
    maxRangeNm: 5, maxAltFt: 99999, repeatMin: 8,
    filterFn: () => true
  },
  {
    id: "general_awareness",
    name: "General Awareness",
    desc: "Default wide-area filter. 10 nm, 8,000 ft ceiling. Good for field operations.",
    maxRangeNm: 10, maxAltFt: 8000, repeatMin: 10,
    filterFn: () => true
  },
  {
    id: "helicopter_watch",
    name: "Helicopter Watch",
    desc: "Helicopters and low GA only. Any range. Useful near hospitals, ranches, or helipads.",
    maxRangeNm: 15, maxAltFt: 4000, repeatMin: 6,
    filterFn: e => (e.extra?.acType || "").startsWith("H") || e.altitude < 2500
  },
  {
    id: "quiet",
    name: "Quiet",
    desc: "Minimal alerts. Only aircraft inside 3 nm and below 2,000 ft. For low-noise environments.",
    maxRangeNm: 3, maxAltFt: 2000, repeatMin: 15,
    filterFn: () => true
  }
];

let _activeProfile = "general_awareness";
window.ALERT_PROFILES = PROFILES;
window.getActiveProfile = () => PROFILES.find(p => p.id === _activeProfile) || PROFILES[2];
window.setActiveProfile = function(id) {
  _activeProfile = id;
  const p = window.getActiveProfile();
  // sync sliders in field page if visible
  const rRange = document.getElementById("rRange");
  const rAlt   = document.getElementById("rAlt");
  const rRep   = document.getElementById("rRepeat");
  if (rRange) rRange.value = p.maxRangeNm;
  if (rAlt)   rAlt.value   = p.maxAltFt;
  if (rRep)   rRep.value   = p.repeatMin;
  document.querySelectorAll(".profileCard").forEach(c => c.classList.toggle("active", c.dataset.pid === id));
  toast("Profile: " + p.name, "ok");
};

/* ══════════════════════════════════════════════
   INCIDENT LOG
══════════════════════════════════════════════ */
const _incidents = [];
window.INCIDENT = {
  add(entry) {
    const rec = { ts: Date.now(), text: entry.text || "", tag: entry.tag || "manual", from: entry.from || "" };
    _incidents.unshift(rec);
    if (_incidents.length > 500) _incidents.pop();
    renderIncidents();
    return rec;
  },
  getAll() { return _incidents; },
  export() {
    const rows = ["timestamp,tag,text"];
    for (const i of _incidents)
      rows.push(`"${new Date(i.ts).toISOString()}","${i.tag}","${i.text.replace(/"/g, '""')}"`);
    return rows.join("\n");
  }
};

function renderIncidents() {
  const el = document.getElementById("ilList"); if (!el) return;
  el.innerHTML = _incidents.slice(0, 80).map(i => `
    <div class="ilEntry">
      <div class="ilTs">${new Date(i.ts).toISOString().slice(0, 19).replace("T", " ")}Z</div>
      <div class="ilText"><span class="ilTag ${i.tag}">${i.tag.toUpperCase()}</span>${i.text}</div>
    </div>`).join("");
}

/* ══════════════════════════════════════════════
   ALERT ENGINE (called from app.js each tick)
══════════════════════════════════════════════ */
const _alertTs = {};
window.runAlertEngine = function(data) {
  if (!window._meshEnabled) return;
  const profile = window.getActiveProfile();
  const maxR  = +( document.getElementById("rRange")?.value  || profile.maxRangeNm);
  const maxA  = +( document.getElementById("rAlt")?.value    || profile.maxAltFt);
  const repMs = +( document.getElementById("rRepeat")?.value || profile.repeatMin) * 60000;
  const now = Date.now();

  const tryAlert = (arr, typeLabel, enabled) => {
    if (!enabled) return;
    for (const e of arr) {
      if ((e.rng || 99) > maxR) continue;
      if (typeLabel === "AC" && e.altitude > maxA) continue;
      if (!profile.filterFn(e)) continue;
      if (_alertTs[e.id] && now - _alertTs[e.id] < repMs) continue;
      _alertTs[e.id] = now;
      const msg = typeLabel === "AC"
        ? `AC ${e.name} ${Math.round(e.altitude)}ft ${(e.rng||0).toFixed(1)}nm ${SOURCES.compass(e.brg||0)}`
        : `${typeLabel} ${e.name.slice(0,12)} ${(e.rng||0).toFixed(1)}nm ${SOURCES.compass(e.brg||0)}`;
      MQTT.sendText(msg);
      INCIDENT.add({ text: msg, tag: "ac" });
      break; // one per tick
    }
  };

  tryAlert(data.aircraft, "AC",   document.getElementById("alertsOn")?.checked);
  tryAlert(data.ships,    "SHIP", document.getElementById("shipAlertsOn")?.checked);
  tryAlert(data.trains,   "TRAIN",document.getElementById("trainAlertsOn")?.checked);
};

/* ══════════════════════════════════════════════
   EXPORT SNAPSHOT
══════════════════════════════════════════════ */
window.exportSnapshot = function(data, format) {
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  if (format === "json") {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2)], { type: "application/json" });
    _download(blob, `skymesh-snapshot-${ts}.json`);
  } else {
    const rows = ["type,name,callsign,lat,lon,altitude_ft,speed_kt,heading,range_nm,bearing,source,lastSeen"];
    for (const arr of [data.aircraft, data.ships, data.trains])
      for (const e of arr)
        rows.push([e.type,e.name,e.callsign||"",e.lat,e.lon,Math.round(e.altitude),Math.round(e.speed),Math.round(e.heading),
          (e.rng||0).toFixed(2),(e.brg||0).toFixed(0),e.source,new Date(e.lastSeen).toISOString()].join(","));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    _download(blob, `skymesh-snapshot-${ts}.csv`);
  }
  INCIDENT.add({ text: `Snapshot exported (${format.toUpperCase()})`, tag: "manual" });
};

function _download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ══════════════════════════════════════════════
   TEAM NODE OVERLAY (draws pins on scope canvases)
══════════════════════════════════════════════ */
window.drawTeamPins = function(ctx, nodes, cx, cy, pxPerNm) {
  for (const n of nodes) {
    if (n.rng == null) continue;
    const ang = (n.brg || 0) * Math.PI / 180;
    const x = cx + Math.sin(ang) * n.rng * pxPerNm;
    const y = cy - Math.cos(ang) * n.rng * pxPerNm;
    // pin shape: diamond
    ctx.save();
    ctx.fillStyle = "#4DCFB4";
    ctx.strokeStyle = "#0F6E56";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 6, y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#C7D3DC"; ctx.font = "10px 'IBM Plex Mono'";
    ctx.textAlign = "left"; ctx.globalAlpha = 0.9;
    ctx.fillText((n.name || n.id).slice(0, 10), x + 10, y + 4);
    ctx.restore();
  }
};

/* ══════════════════════════════════════════════
   DETAIL DRAWER (aircraft / ship / train click)
══════════════════════════════════════════════ */
window.openDetail = function(e) {
  let drawer = document.getElementById("entityDrawer");
  if (!drawer) {
    drawer = document.createElement("div");
    drawer.id = "entityDrawer";
    drawer.className = "drawer";
    document.getElementById("pages").appendChild(drawer);
  }
  const trail = TRAILS.get(e.id);
  const acType = e.extra?.acType || e.extra?.shipType || "—";
  drawer.innerHTML = `
    <div class="drawer-head">
      <h2>${e.name}</h2>
      <button class="drawer-close" onclick="closeDetail()">✕</button>
    </div>
    <canvas class="trail-canvas" id="trailCanvas" width="320" height="120"></canvas>
    <div class="drawer-row"><span>TYPE</span><b>${acType}</b></div>
    <div class="drawer-row"><span>ALT</span><b>${Math.round(e.altitude).toLocaleString()} ft</b></div>
    <div class="drawer-row"><span>SPEED</span><b>${Math.round(e.speed)} kt</b></div>
    <div class="drawer-row"><span>HEADING</span><b>${Math.round(e.heading)}°</b></div>
    <div class="drawer-row"><span>RANGE</span><b>${(e.rng||0).toFixed(1)} nm</b></div>
    <div class="drawer-row"><span>BEARING</span><b>${Math.round(e.brg||0)}° ${SOURCES.compass(e.brg||0)}</b></div>
    <div class="drawer-row"><span>LAT / LON</span><b>${e.lat?.toFixed(4)}, ${e.lon?.toFixed(4)}</b></div>
    <div class="drawer-row"><span>SOURCE</span><b>${e.source}</b></div>
    <div class="drawer-row"><span>LAST SEEN</span><b>${new Date(e.lastSeen).toISOString().slice(11,19)}Z</b></div>
    ${e.extra?.squawk ? `<div class="drawer-row"><span>SQUAWK</span><b>${e.extra.squawk}</b></div>` : ""}
    ${e.extra?.origin ? `<div class="drawer-row"><span>ORIGIN</span><b>${e.extra.origin}</b></div>` : ""}
    ${e.extra?.dest   ? `<div class="drawer-row"><span>DEST</span><b>${e.extra.dest}</b></div>` : ""}
    ${e.extra?.mil    ? `<div class="drawer-row"><span>MILITARY</span><b style="color:var(--red)">YES</b></div>` : ""}
    <div class="drawer-row" style="cursor:pointer" onclick="INCIDENT.add({text:'Manual note: ${e.name.replace(/'/g,"\\'")}',tag:'manual'});closeDetail();toast('Logged to incident log','ok')">
      <span>LOG TO INCIDENT</span><b style="color:var(--amber)">TAP</b>
    </div>`;
  drawer.classList.add("open");

  // draw trail on canvas
  setTimeout(() => {
    const c = document.getElementById("trailCanvas"); if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#101822"; ctx.fillRect(0, 0, 320, 120);
    if (trail.length < 2) {
      ctx.fillStyle = "#6B7B88"; ctx.font = "11px 'IBM Plex Mono'";
      ctx.textAlign = "center"; ctx.fillText("No trail yet", 160, 62); return;
    }
    const lats = trail.map(t => t.lat), lons = trail.map(t => t.lon);
    const minLa = Math.min(...lats), maxLa = Math.max(...lats);
    const minLo = Math.min(...lons), maxLo = Math.max(...lons);
    const pad = 14;
    const scX = lo => pad + (lo - minLo) / (maxLo - minLo + 1e-9) * (320 - pad * 2);
    const scY = la => 120 - pad - (la - minLa) / (maxLa - minLa + 1e-9) * (120 - pad * 2);
    ctx.strokeStyle = "#62D9F7"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const x = scX(trail[i].lon), y = scY(trail[i].lat);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      ctx.globalAlpha = 0.3 + 0.7 * (i / trail.length);
    }
    ctx.stroke();
    // current position dot
    const last = trail[trail.length - 1];
    ctx.globalAlpha = 1; ctx.fillStyle = "#62D9F7";
    ctx.beginPath(); ctx.arc(scX(last.lon), scY(last.lat), 4, 0, 7); ctx.fill();
  }, 50);
};

window.closeDetail = function() {
  const d = document.getElementById("entityDrawer");
  if (d) d.classList.remove("open");
};
