/* ============================================================
   AegisNet P4.4 — node-registry.js
   Lightweight node directory via MQTT announcements.
   Nodes announce themselves on a shared topic.
   No cloud infrastructure needed — just the MQTT broker.
   ============================================================ */
"use strict";

const REGISTRY_TOPIC = "msh/US/2/json/AegisNet-Registry/#";
const ANNOUNCE_INTERVAL_MS = 30000;   // announce self every 30s
const STALE_TIMEOUT_MS     = 120000;  // remove nodes not seen in 2min

window.NodeRegistry = (function() {
  const _nodes  = new Map();  // nodeId -> node record
  const _listeners = [];
  let   _announceTimer = null;
  let   _pruneTimer    = null;

  /* ── node record schema ── */
  function _makeRecord(pkt) {
    return {
      nodeId:       pkt.nodeId      || pkt.from || "unknown",
      nodeName:     pkt.nodeName    || "Unknown Node",
      nodeRole:     pkt.nodeRole    || "unknown",
      nodeLocation: pkt.nodeLocation|| "",
      lat:          typeof pkt.lat === "number" ? pkt.lat : null,
      lon:          typeof pkt.lon === "number" ? pkt.lon : null,
      version:      pkt.version     || "?",
      healthStatus: pkt.healthStatus|| "unknown",
      adapters:     pkt.adapters    || [],
      mqttBroker:   pkt.mqttBroker  || "",
      lastSeen:     Date.now(),
      rng:          null,
      brg:          null,
      isSelf:       false
    };
  }

  /* ── incoming MQTT packet handler ── */
  function _onPacket(msg) {
    try {
      // Registry announcements are prefixed __AEGISNET_NODE__
      if (!msg.text?.startsWith("__AEGISNET_NODE__")) return;
      const pkt = JSON.parse(msg.text.slice(17));
      const existing = _nodes.get(pkt.nodeId);
      const record   = { ...(existing || {}), ..._makeRecord(pkt) };
      // Enrich with range/bearing if we have our position
      const cfg = window.SOURCES?.CFG;
      if (cfg && record.lat != null) {
        record.rng = window.GEO?.haversineNm?.(cfg.rxLat, cfg.rxLon, record.lat, record.lon);
        record.brg = window.GEO?.bearingDeg?.(cfg.rxLat, cfg.rxLon, record.lat, record.lon);
      }
      _nodes.set(record.nodeId, record);
      _notify();
    } catch {}
  }

  /* ── announce self ── */
  function _announce() {
    if (!window.MQTT?.isConnected?.()) return;
    const identity = window.NODE_IDENTITY?.get?.() || {};
    const cfg      = window.SOURCES?.CFG || {};
    const pkt = {
      nodeId:       identity.nodeId || "unknown",
      nodeName:     identity.nodeName,
      nodeRole:     identity.nodeRole,
      nodeLocation: identity.nodeLocation,
      lat:          cfg.rxLat || null,
      lon:          cfg.rxLon || null,
      version:      identity.version || "4.4",
      healthStatus: identity.healthStatus || "unknown",
      adapters:     (window.CommsRouter?.getAll() || [])
                      .filter(a => a.isAvailable()).map(a => a.id),
      mqttBroker:   cfg.mqttSelfHost || "mqtt.meshtastic.org"
    };
    window.MQTT.sendText("__AEGISNET_NODE__" + JSON.stringify(pkt), "AegisNet-Registry");
    // Mark self in registry
    const selfRecord = _makeRecord(pkt);
    selfRecord.isSelf = true;
    _nodes.set(pkt.nodeId, selfRecord);
  }

  /* ── prune stale nodes ── */
  function _prune() {
    const cutoff = Date.now() - STALE_TIMEOUT_MS;
    let changed  = false;
    for (const [id, node] of _nodes.entries()) {
      if (!node.isSelf && node.lastSeen < cutoff) {
        _nodes.delete(id); changed = true;
      }
    }
    if (changed) _notify();
  }

  function _notify() {
    const all = [..._nodes.values()];
    _listeners.forEach(fn => { try { fn(all); } catch {} });
    renderRegistryPanel();
    // Also inject team nodes into MESH_STATE for scope overlay
    if (window.MESH_STATE) {
      window.MESH_STATE.nodes = all
        .filter(n => n.lat != null && n.lon != null && !n.isSelf)
        .map(n => ({ id: n.nodeId, name: n.nodeName, lat: n.lat, lon: n.lon, alt: 0, lastSeen: n.lastSeen }));
    }
  }

  /* ── wire into MQTT message bus ── */
  function start() {
    // Hook MESH_STATE.onMessage
    const orig = window.MESH_STATE?.onMessage;
    if (window.MESH_STATE) {
      window.MESH_STATE.onMessage = (msg) => {
        orig?.(msg);
        _onPacket(msg);
      };
    }
    // Subscribe to registry topic via MQTT module
    window.MQTT?.setChannel?.("AegisNet-Registry");

    // Announce self immediately then on interval
    _announce();
    _announceTimer = setInterval(_announce, ANNOUNCE_INTERVAL_MS);
    _pruneTimer    = setInterval(_prune,    30000);
  }

  function stop() {
    clearInterval(_announceTimer);
    clearInterval(_pruneTimer);
  }

  function getNodes()    { return [..._nodes.values()]; }
  function getOnline()   { return getNodes().filter(n => !n.isSelf); }
  function getSelf()     { return getNodes().find(n => n.isSelf) || null; }
  function on(fn)        { _listeners.push(fn); }

  /* ── start automatically when MQTT connects ── */
  setTimeout(() => {
    start();
    setInterval(() => {
      if (window.MESH_STATE?.connected) _announce();
    }, ANNOUNCE_INTERVAL_MS);
  }, 2000);

  return { start, stop, getNodes, getOnline, getSelf, on };
})();

/* ══════════════════════════════════════════════
   REGISTRY MAP RENDERER
   Renders into #registryMapContainer
   Uses canvas — no external map library needed
══════════════════════════════════════════════ */
window.renderRegistryMap = function(canvasId) {
  const canvas = document.getElementById(canvasId); if (!canvas) return;
  const ctx    = canvas.getContext("2d");
  const w = canvas.clientWidth, h = canvas.clientHeight || 400;
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

  const nodes = window.NodeRegistry.getNodes();
  const cfg   = window.SOURCES?.CFG || {};
  const homeLat = cfg.rxLat || 34.615;
  const homeLon = cfg.rxLon || -112.45;

  ctx.fillStyle = "#0D131C";
  ctx.fillRect(0, 0, w, h);

  if (nodes.length === 0) {
    ctx.fillStyle = "#6B7B88";
    ctx.font = "12px 'IBM Plex Mono'";
    ctx.textAlign = "center";
    ctx.fillText("No nodes discovered yet. MQTT bridge must be connected.", w/2, h/2);
    return;
  }

  // Find bounding box of all node locations
  const lats = nodes.filter(n=>n.lat).map(n=>n.lat);
  const lons = nodes.filter(n=>n.lon).map(n=>n.lon);
  lats.push(homeLat); lons.push(homeLon);
  const minLat = Math.min(...lats) - 2, maxLat = Math.max(...lats) + 2;
  const minLon = Math.min(...lons) - 2, maxLon = Math.max(...lons) + 2;
  const pad = 30;
  const scX = lon => pad + (lon - minLon) / (maxLon - minLon) * (w - pad * 2);
  const scY = lat => h - pad - (lat - minLat) / (maxLat - minLat) * (h - pad * 2);

  // Draw MQTT connection lines between nodes
  for (const n of nodes) {
    if (!n.lat || n.isSelf) continue;
    const hx = scX(homeLon), hy = scY(homeLat);
    const nx = scX(n.lon),   ny = scY(n.lat);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = "rgba(98,217,247,.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw self node (home)
  const hx = scX(homeLon), hy = scY(homeLat);
  ctx.fillStyle = "#62D9F7";
  ctx.shadowColor = "#62D9F7"; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#EDF2F5";
  ctx.font = "700 11px 'Rajdhani'";
  ctx.textAlign = "center";
  ctx.fillText(window.NODE_IDENTITY?.get()?.nodeName || "THIS NODE", hx, hy - 13);

  // Draw remote nodes
  for (const n of nodes) {
    if (!n.lat || n.isSelf) continue;
    const nx = scX(n.lon), ny = scY(n.lat);
    const age = (Date.now() - n.lastSeen) / 1000;
    const color = age < 60 ? "#5BCF8E" : age < 120 ? "#F0B541" : "#F06A5C";
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(nx, ny, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#C7D3DC";
    ctx.font = "700 10px 'Rajdhani'";
    ctx.textAlign = "center";
    ctx.fillText(n.nodeName.slice(0, 16), nx, ny - 11);
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillStyle = "#6B7B88";
    ctx.fillText(n.nodeRole + " · " + (n.rng ? n.rng.toFixed(0) + " nm" : n.nodeLocation || "?"), nx, ny + 17);
  }
};

/* ── node list panel renderer ── */
window.renderRegistryPanel = function() {
  const el = document.getElementById("registryNodeList"); if (!el) return;
  const nodes = window.NodeRegistry.getOnline();
  if (!nodes.length) {
    el.innerHTML = `<div style="color:var(--dim);font-size:12px;padding:8px 0">No remote nodes discovered. Enable Field Mode and MQTT Bridge to connect.</div>`;
    return;
  }
  el.innerHTML = nodes.map(n => {
    const age = Math.round((Date.now() - n.lastSeen) / 1000);
    const ageColor = age < 60 ? "var(--green)" : age < 120 ? "var(--amber)" : "var(--red)";
    return `<div style="border:1px solid var(--line);border-radius:4px;background:var(--panel2);padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="width:8px;height:8px;border-radius:50%;background:${ageColor};flex-shrink:0"></span>
        <span style="font-family:var(--disp);font-weight:700;font-size:15px;color:var(--bright)">${n.nodeName}</span>
        <span style="font-size:9px;border:1px solid var(--line);border-radius:2px;padding:1px 5px;color:var(--dim);margin-left:auto">${n.nodeRole.toUpperCase()}</span>
      </div>
      <div style="font-size:11.5px;color:var(--dim);line-height:1.8">
        ID: <span style="color:var(--txt)">${n.nodeId}</span><br>
        Location: <span style="color:var(--txt)">${n.nodeLocation || "—"}</span><br>
        ${n.rng != null ? `Range: <span style="color:var(--cyan)">${n.rng.toFixed(1)} nm ${window.GEO?.compass?.(n.brg) || ""}</span><br>` : ""}
        Version: <span style="color:var(--txt)">${n.version}</span> &nbsp;·&nbsp;
        Adapters: <span style="color:var(--txt)">${n.adapters.join(", ") || "—"}</span><br>
        Last seen: <span style="color:${ageColor}">${age}s ago</span>
      </div>
    </div>`;
  }).join("");

  // Refresh map
  renderRegistryMap("registryMapCanvas");
};

setInterval(() => renderRegistryPanel(), 5000);
