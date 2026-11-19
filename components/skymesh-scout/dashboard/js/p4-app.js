/* ============================================================
   AegisNet Expansion Layer — p4-app.js
   Bootstrap: starts CommsRouter, TrackingRouter,
   wires P3 + P4 together. Does not replace p3 app.js.
   ============================================================ */
"use strict";

/* ── wait for P3 app to finish its first tick, then boot P4 ── */
setTimeout(async () => {

  /* 1. Start all comms adapters */
  await window.CommsRouter?.connectAll();

  /* 2. Start all tracking adapters */
  await window.TrackingRouter?.startAll();

  /* 3. Wire TrackingRouter entity stream into P3 scope data
        so aircraft/vessel/team all appear on the existing scopes */
  window.TrackingRouter?.on("update", entities => {
    // Only override aircraft from tracking router if live ADS-B is down
    // (P3 sources.js still drives aircraft in normal operation)
    const teamNodes = entities.filter(e => e.type === "team_node");
    if (teamNodes.length) window.MESH_STATE.nodes = teamNodes.map(n => ({
      id: n.id, name: n.name, lat: n.lat, lon: n.lon,
      alt: n.altitude, battery: n.extra?.battery, lastSeen: n.lastSeen
    }));
  });

  /* 4. Wire inbound radio sim messages into MESH_STATE and chat */
  const radioAdapter = window.CommsRouter?.getAdapter("radio");
  radioAdapter?.onMessage(msg => {
    window.MESH_STATE?.messages.unshift(msg);
    window.MESH_STATE?.onMessage?.(msg);
    window.INCIDENT?.add({ text: `[RADIO SIM] ${msg.from}: ${msg.text}`, tag: "team" });
  });

  /* 5. Marine adapter gets its API key from config */
  const cfg = window.SOURCES?.CFG || {};
  const marineAdapter = window.TrackingRouter?.getAdapter("marine");
  if (marineAdapter && cfg.apiKeys?.aishub) marineAdapter.configure(cfg.apiKeys.aishub);

  /* 6. Initial dashboard render */
  window.p4RefreshDashboard?.();

  console.info("AegisNet P4 expansion layer booted.");

}, 1500);

/* ── P4 checklist (runs in console) ── */
const P4_CHECKLIST = [
  /* Preserve P3 */
  ["P3 aircraft scope exists",        () => !!document.getElementById("acScope")],
  ["P3 incident log present",         () => typeof window.INCIDENT?.add === "function"],
  ["P3 MQTT bridge module loaded",    () => typeof window.MQTT !== "undefined"],
  ["P3 field.js alert profiles present", () => window.ALERT_PROFILES?.length === 5],
  ["P3 sources.js isLive() present",  () => typeof window.SOURCES?.isLive === "function"],
  /* Comms adapters */
  ["CommsAdapter base class defined", () => typeof window.CommsAdapters?.CommsAdapter === "function"],
  ["InternetAdapter registered",      () => !!window.CommsRouter?.getAdapter("internet")],
  ["P2PAdapter registered",           () => !!window.CommsRouter?.getAdapter("p2p")],
  ["LocalNetworkAdapter registered",  () => !!window.CommsRouter?.getAdapter("local")],
  ["MeshtasticMqttAdapter registered",() => !!window.CommsRouter?.getAdapter("mesh_mqtt")],
  ["MeshtasticLocalAdapter registered",()=> !!window.CommsRouter?.getAdapter("mesh_local")],
  ["AegisRadioFallbackAdapter registered",()=> !!window.CommsRouter?.getAdapter("radio")],
  ["SatelliteAdapter registered",     () => !!window.CommsRouter?.getAdapter("satellite")],
  /* Router services */
  ["MessageQueueService present",     () => typeof window.CommsRouter?.queue?.enqueue === "function"],
  ["DeliveryStatusService present",   () => typeof window.CommsRouter?.delivery?.create === "function"],
  ["NetworkHealthMonitor present",    () => typeof window.CommsRouter?.health?.summary === "function"],
  ["MediaTransferService present",    () => typeof window.CommsRouter?.media?.canSend === "function"],
  ["CommsRouter.send() present",      () => typeof window.CommsRouter?.send === "function"],
  ["CommsRouter.bestAdapter() present",()=> typeof window.CommsRouter?.bestAdapter === "function"],
  ["Low-bandwidth mode toggle",       () => typeof window.CommsRouter?.setLowBandwidth === "function"],
  /* Tracking */
  ["TrackingRouter present",          () => !!window.TrackingRouter],
  ["AircraftTrackingAdapter registered",()=> !!window.TrackingRouter?.getAdapter("aircraft")],
  ["MarineTrackingAdapter registered",()=> !!window.TrackingRouter?.getAdapter("marine")],
  ["TeamNodeTrackingAdapter registered",()=> !!window.TrackingRouter?.getAdapter("team")],
  ["FutureAssetTrackingAdapter registered",()=>!!window.TrackingRouter?.getAdapter("future_asset")],
  ["TrackingRouter filter API present",()=> typeof window.TrackingRouter?.setFilter === "function"],
  /* WebRTC */
  ["WebRTCVoiceVideoService present", () => typeof window.WebRTCService?.call === "function"],
  ["PTTService present (placeholder)",() => typeof window.PTTService?.initialize === "function"],
  ["PTT available=false (not a real transmitter)", () => window.PTTService?.available === false],
  /* Dashboard */
  ["Comms dashboard page slot exists",() => !!document.getElementById("pg-comms")],
  ["CommsRouter route list renders",  () => !!document.getElementById("commsRouteList")],
  ["Delivery panel renders",          () => !!document.getElementById("deliveryPanel")],
  ["Radio mode selector present",     () => !!document.getElementById("radioModeSelect")],
  ["Radio fallback in simulator mode",() => window.CommsRouter?.getAdapter("radio")?._mode === "simulator"],
  ["Satellite shows offline/placeholder",()=> window.CommsRouter?.getAdapter("satellite")?.status === "offline"],
  /* Safety */
  ["Prototype warning visible in dashboard", () => document.getElementById("pg-comms")?.textContent.includes("PROTOTYPE")],
  ["No public safety radio claim",    () => !document.body.textContent.includes("CAP radio") && !document.body.textContent.includes("police radio")],
  ["No restricted frequency claim",   () => !document.body.textContent.includes("transmit on")],
  /* Merge readiness */
  ["Module boundary: CommsAdapters on window", () => typeof window.CommsAdapters === "object"],
  ["Module boundary: TrackingAdapters on window",()=> typeof window.TrackingAdapters === "object"],
  ["No P3 files deleted (sources.js still present)", () => typeof window.SOURCES !== "undefined"],
];

window.runP4Checklist = function() {
  console.group("AegisNet Expansion Layer P4 — Task Checklist");
  let pass = 0;
  for (const [label, fn] of P4_CHECKLIST) {
    let ok = false; try { ok = !!fn(); } catch {}
    console.log(`${ok ? "✅" : "❌"} ${label}`);
    if (ok) pass++;
  }
  console.log(`\n${pass}/${P4_CHECKLIST.length} checks passed`);
  console.groupEnd();
  return pass === P4_CHECKLIST.length;
};
setTimeout(window.runP4Checklist, 2500);
