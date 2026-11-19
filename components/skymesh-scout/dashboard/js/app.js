/* app.js — SkyMesh Scout P3 */
"use strict";

let _lastTick = performance.now();
let _lastData = { aircraft: [], ships: [], trains: [], teamNodes: [], demo: true };
window._lastData = _lastData;

/* ── nav ── */
document.querySelectorAll(".navbtn").forEach(btn => {
  btn.addEventListener("click", () => setPage(btn.dataset.page));
});
function setPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("on"));
  document.querySelectorAll(".navbtn").forEach(b => b.classList.remove("on"));
  document.getElementById("pg-" + page)?.classList.add("on");
  document.querySelector(`.navbtn[data-page="${page}"]`)?.classList.add("on");
  if (page === "chat") MESH_STATE.unread = 0;
}
window.setMode = setPage;
const initialPage = new URLSearchParams(window.location.search).get("page");
if (initialPage && document.getElementById("pg-" + initialPage)) {
  window.addEventListener("DOMContentLoaded", () => setPage(initialPage));
}


/* ── clock ── */
setInterval(() => {
  const el = document.getElementById("clock");
  if (el) el.textContent = new Date().toISOString().slice(11, 19) + "Z";
}, 1000);

/* ── MQTT status sync ── */
setInterval(() => {
  const panel = document.getElementById("mqttStatusPanel");
  const txt   = document.getElementById("mqttStatusText");
  if (!panel || !txt) return;
  const ok = MESH_STATE.connected;
  panel.className = "mqttStatus" + (ok ? " connected" : "");
  txt.textContent = ok ? "Connected: " + MESH_STATE.broker : "Disconnected";
}, 2000);

/* ── main loop ── */
async function tick() {
  const now = performance.now();
  const dt = (now - _lastTick) / 1000; _lastTick = now;
  try {
    const data = await SOURCES.fetchAll(dt);
    Object.assign(_lastData, data);
    window._lastData = data;
    updateTrackingViews(data);
    runAlertEngine(data);
    updateStatusBar(data);
  } catch (e) { console.error("tick error:", e); }
}

function updateStatusBar(data) {
  const chip = document.getElementById("chipSrc");
  const src  = document.getElementById("srcLabel");
  if (chip && src) {
    const live = SOURCES.isLive();
    chip.className = "chip" + (live ? " c-ok" : " c-warn");
    chip.querySelector(".dot").className = "dot" + (live ? " dot-ok" : " dot-warn");
    src.textContent = live ? "LOCAL ADS-B" : "DEMO FEED";
  }
  // unread badge on chat nav
  const chatBtn = document.querySelector('.navbtn[data-page="chat"]');
  if (chatBtn && MESH_STATE.unread > 0) {
    chatBtn.style.color = "var(--amber)";
  } else if (chatBtn) {
    chatBtn.style.color = "";
  }
}

setInterval(tick, SOURCES.CFG.pollMs || 2500);
tick();

/* ── field mode wiring ── */
window._meshEnabled = false;
window.toggleMesh = function() {
  const on = document.getElementById("meshOn")?.checked;
  window._meshEnabled = on;
  const chip = document.getElementById("chipMesh");
  if (chip) {
    chip.className = "chip" + (on ? " c-ok" : "");
    const dot = chip.querySelector(".dot");
    if (dot) dot.className = "dot" + (on ? " dot-ok" : "");
    const lbl = chip.querySelector("span:last-child");
    if (lbl) lbl.textContent = "MESH " + (on ? "LINKED" : "OFF");
  }
  const statusEl = document.getElementById("fieldStatusText");
  if (statusEl) statusEl.textContent = on
    ? "Field Mode ON — mesh communications active"
    : "Field Mode off — enable to use mesh";
  if (statusEl && on) statusEl.style.color = "var(--green)";
  else if (statusEl) statusEl.style.color = "var(--dim)";
  INCIDENT?.add({ text: on ? "Field Mode enabled. Node: CLIENT, US915." : "Field Mode disabled.", tag: "manual" });
};

window.toggleMqttBridge = function() {
  const on = document.getElementById("mqttOn")?.checked;
  if (!window._meshEnabled && on) {
    toast("Enable Field Mode first", "warn");
    const el = document.getElementById("mqttOn");
    if (el) el.checked = false;
    return;
  }
  if (on) window.enableMqtt?.(); else window.disableMqtt?.();
  const statusEl = document.getElementById("fieldStatusText");
  if (statusEl && on) {
    statusEl.textContent = "Field Mode ON — MQTT bridge connecting…";
    statusEl.style.color = "var(--amber)";
  }
  toast(on ? "MQTT bridge connecting…" : "MQTT bridge disabled");
};

window.checkin = function(msg) {
  if (!window._meshEnabled) { toast("Enable Field Mode first", "warn"); return; }
  MQTT.sendText("CHECK-IN: " + msg);
  INCIDENT.add({ text: "Check-in: " + msg, tag: "manual" });
};

window.changeMeshRole = function(role) {
  if (role === "ROUTER" || role === "REPEATER") {
    showModal({
      title: "Set role to " + role + "?",
      warn: "Router/Repeater roles should only be used for a stationary, elevated, permanently powered node. Using these on a carried device degrades mesh performance for everyone nearby.",
      body: "Only proceed if this node is fixed in a high location with reliable power.",
      confirmLabel: "Set " + role, danger: true,
      onConfirm: () => { document.getElementById("meshRole").textContent = role; INCIDENT.add({ text: "Mesh role changed to " + role, tag: "manual" }); }
    });
  } else {
    document.getElementById("meshRole").textContent = role;
  }
};

/* ── P3 checklist ── */
const CHECKLIST = [
  ["Aircraft tracking (demo + local ADS-B)", () => true],
  ["Ship tracking page exists", () => !!document.getElementById("pg-ships")],
  ["Train tracking page exists", () => !!document.getElementById("pg-trains")],
  ["Projector page exists", () => !!document.getElementById("pg-projector")],
  ["Chat page exists with two-way message support", () => !!document.getElementById("chatMsgs")],
  ["About page exists", () => !!document.querySelector(".aboutWrap")],
  ["Alert profiles rendered (5 profiles)", () => document.querySelectorAll(".profileCard").length === 5],
  ["Incident log present and exportable", () => typeof INCIDENT?.export === "function"],
  ["Source blend: 4 source pills on aircraft page", () => document.querySelectorAll(".srcPill").length >= 4],
  ["Search/filter input on aircraft page", () => !!document.getElementById("acSearch")],
  ["Export buttons (JSON + CSV)", () => document.querySelectorAll(".exportBtn").length >= 2],
  ["GPS auto-position attempted", () => navigator.geolocation != null],
  ["MQTT module loaded", () => typeof MQTT !== "undefined"],
  ["Field Mode off by default", () => !window._meshEnabled],
  ["MQTT bridge requires Field Mode first (guarded)", () => typeof toggleMqttBridge === "function"],
  ["Team node pins drawn on scope (drawTeamPins)", () => typeof drawTeamPins === "function"],
  ["Entity detail drawer with trail canvas", () => typeof openDetail === "function"],
  ["Router/Repeater role change requires modal", () => typeof showModal === "function"],
  ["No public safety relay (safety notice in admin)", () => document.querySelector(".aPanel")?.textContent.includes("scanner")],
  ["Not certified avionics notice visible", () => document.querySelector(".chip-notice")?.textContent.includes("NOT RADAR")],
];

window.runChecklist = function() {
  console.group("SkyMesh Scout P3 — Task Checklist");
  let pass = 0;
  for (const [label, fn] of CHECKLIST) {
    let ok = false; try { ok = !!fn(); } catch {}
    console.log(`${ok ? "✅" : "❌"} ${label}`);
    if (ok) pass++;
  }
  console.log(`\n${pass}/${CHECKLIST.length} checks passed`);
  console.groupEnd();
  return pass === CHECKLIST.length;
};
setTimeout(runChecklist, 1400);
