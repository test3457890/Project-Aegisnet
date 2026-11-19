/* mqtt.js — SkyMesh Scout P3
   MQTT internet bridge for Meshtastic nodes.
   Connects to the community broker (mqtt.meshtastic.org)
   or a self-hosted broker from config.mqttSelfHost.

   Meshtastic MQTT topics:
     msh/US/2/json/LongFast/!<node_id>   — per-node JSON payloads
     msh/US/2/json/LongFast/#            — wildcard, all nodes on channel

   This module:
   - Connects over WebSocket (port 9001 for community, configurable for self-host)
   - Subscribes to the team channel
   - Parses position, text, and nodeinfo packets
   - Exposes MESH_STATE for the dashboard
   - Provides sendText() for outbound messages
*/
"use strict";

/* MESH_STATE is the shared bus — sources.js reads nodes, field.js reads messages */
window.MESH_STATE = {
  connected: false,
  broker: "",
  nodes: [],       // [{id, name, lat, lon, alt, battery, lastSeen, snr}]
  messages: [],    // [{ts, from, text, channel}]
  unread: 0,
  onMessage: null, // callback set by chat page
  onNodeUpdate: null
};

const COMMUNITY_WS  = "wss://mqtt.meshtastic.org:8883";
const COMMUNITY_MQTT = "mqtt.meshtastic.org";

let _client = null;
let _retryTimer = null;
let _enabled = false;
let _channel = "LongFast";
let _nodeId  = "skymesh-" + Math.random().toString(16).slice(2, 8);

function getBrokerWsUrl() {
  const cfg = window.SOURCES?.CFG || {};
  if (cfg.mqttSelfHost) {
    // self-hosted: expect ws://host:9001 or wss://host:9001
    const h = cfg.mqttSelfHost;
    return h.startsWith("ws") ? h : `ws://${h}:9001`;
  }
  return COMMUNITY_WS;
}

function updateChip(state) {
  const chip = document.getElementById("chipMqtt");
  const label = document.getElementById("mqttLabel");
  if (!chip || !label) return;
  chip.className = "chip" + (state === "ok" ? " c-ok" : state === "connecting" ? " c-warn" : "");
  const dot = chip.querySelector(".dot");
  if (dot) dot.className = "dot" + (state === "ok" ? " dot-ok" : state === "connecting" ? " dot-warn" : "");
  const brokerShort = (window.SOURCES?.CFG?.mqttSelfHost || COMMUNITY_MQTT).replace(/^wss?:\/\//, "").split(":")[0];
  label.textContent = state === "ok" ? "MQTT " + brokerShort
                    : state === "connecting" ? "MQTT CONNECTING..."
                    : "MQTT OFF";
  MESH_STATE.connected = state === "ok";
  MESH_STATE.broker = brokerShort;
}

/* ── MQTT over WebSocket using a tiny native implementation ──
   We can't use the 'mqtt' npm package directly in a browser without a bundler,
   so we use a lightweight MQTT-over-WS approach: load the CDN build of mqtt.js
   and fall back to a no-op stub if blocked.                                    */
function loadMqttLib() {
  return new Promise(resolve => {
    if (window.mqtt) { resolve(window.mqtt); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mqtt@5/dist/mqtt.min.js";
    s.onload = () => resolve(window.mqtt);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

async function connect() {
  if (!_enabled) return;
  updateChip("connecting");
  const lib = await loadMqttLib();
  if (!lib) { console.warn("MQTT library unavailable — running offline"); updateChip(""); return; }

  const wsUrl = getBrokerWsUrl();
  const opts = {
    clientId: _nodeId,
    username: "skymesh",
    password: "skymesh",   // community broker accepts any creds
    reconnectPeriod: 0,    // we handle reconnect ourselves
    connectTimeout: 8000,
    clean: true
  };

  try {
    _client = lib.connect(wsUrl, opts);
  } catch (e) { updateChip(""); return; }

  _client.on("connect", () => {
    updateChip("ok");
    const topic = `msh/US/2/json/${_channel}/#`;
    _client.subscribe(topic, err => { if (err) console.warn("MQTT subscribe error", err); });
    toast("Mesh bridge connected: " + MESH_STATE.broker, "ok");
  });

  _client.on("message", (topic, payload) => {
    try { handlePacket(JSON.parse(payload.toString())); } catch {}
  });

  _client.on("error", e => { console.warn("MQTT error", e); updateChip(""); });
  _client.on("close", () => {
    updateChip("");
    if (_enabled) _retryTimer = setTimeout(connect, 12000);
  });
}

function handlePacket(pkt) {
  if (!pkt || !pkt.type) return;
  const from = pkt.from || pkt.sender || "unknown";

  if (pkt.type === "position" && pkt.payload) {
    const p = pkt.payload;
    const existing = MESH_STATE.nodes.find(n => n.id === from);
    const node = existing || { id: from, name: from, lat: null, lon: null, alt: 0, battery: null, lastSeen: 0, snr: null };
    if (!existing) MESH_STATE.nodes.push(node);
    if (p.latitude_i) node.lat = p.latitude_i / 1e7;
    if (p.longitude_i) node.lon = p.longitude_i / 1e7;
    if (p.altitude) node.alt = p.altitude;
    node.lastSeen = Date.now();
    MESH_STATE.onNodeUpdate?.();
  }

  if (pkt.type === "nodeinfo" && pkt.payload) {
    const p = pkt.payload;
    const existing = MESH_STATE.nodes.find(n => n.id === from);
    if (existing) existing.name = p.long_name || p.short_name || from;
    else MESH_STATE.nodes.push({ id: from, name: p.long_name || from, lat: null, lon: null, battery: null, lastSeen: Date.now() });
    MESH_STATE.onNodeUpdate?.();
  }

  if (pkt.type === "text" && pkt.payload) {
    const msg = { ts: Date.now(), from, text: pkt.payload.text || String(pkt.payload), channel: _channel };
    MESH_STATE.messages.unshift(msg);
    if (MESH_STATE.messages.length > 200) MESH_STATE.messages.pop();
    MESH_STATE.unread++;
    MESH_STATE.onMessage?.(msg);
    addIncidentEntry(msg.text, "rx", from);
  }

  if (pkt.type === "telemetry" && pkt.payload?.device_metrics) {
    const batt = pkt.payload.device_metrics.battery_level;
    const node = MESH_STATE.nodes.find(n => n.id === from);
    if (node && batt != null) node.battery = batt;
  }
}

/* ── outbound ── */
function sendText(text, channel) {
  channel = channel || _channel;
  if (_client && _client.connected) {
    const pkt = JSON.stringify({ from: _nodeId, type: "text", payload: { text }, channel });
    _client.publish(`msh/US/2/json/${channel}/${_nodeId}`, pkt);
  }
  // also push to server for serial relay
  fetch("api/mesh/send", { method: "POST", body: text }).catch(() => {});
  // record locally
  const msg = { ts: Date.now(), from: "me (" + _nodeId + ")", text, channel, tx: true };
  MESH_STATE.messages.unshift(msg);
  MESH_STATE.onMessage?.(msg);
  addIncidentEntry(text, "tx", "me");
}

function setChannel(ch) {
  _channel = ch;
  if (_client && _client.connected) {
    _client.subscribe(`msh/US/2/json/${ch}/#`);
  }
}

function disconnect() {
  _enabled = false;
  clearTimeout(_retryTimer);
  if (_client) { try { _client.end(true); } catch {} _client = null; }
  updateChip("");
}

/* ── incident log bridge ── */
function addIncidentEntry(text, dir, from) {
  window.INCIDENT?.add({ text: `[MESH ${dir.toUpperCase()}] ${from}: ${text}`, tag: "team" });
}

/* ── public API ── */
window.MQTT = { connect, disconnect, sendText, setChannel, isConnected: () => MESH_STATE.connected };

window.enableMqtt = function() {
  _enabled = true;
  connect();
};
window.disableMqtt = function() {
  disconnect();
};
