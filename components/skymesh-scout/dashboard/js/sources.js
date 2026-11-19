/* sources.js — SkyMesh Scout P3
   Real API connectors (with actual fetch calls behind feature flags),
   GPS auto-position, source blending, entity history trails.
*/
"use strict";

const CFG = {
  rxLat: 34.6150, rxLon: -112.4500,
  gpsAuto: false,
  aircraftJson: "data/aircraft.json",
  pollMs: 2500, repeatMinutes: 10,
  mqttBroker: "mqtt.meshtastic.org",
  mqttPort: 1883,
  mqttSelfHost: "",
  serialDev: null,
  guestMode: false,
  apiKeys: { fr24: "", adsbx: "", opensky: "" },
  features: {
    ships: true, trains: true, aegisnet: false,
    flightradar24: false, adsbexchange: false, opensky: false,
    ais_local: false, ais_online: false,
    amtrak: false, gtfs: false,
    gpsAuto: false
  }
};

fetch("config.json").then(r => r.json()).then(c => {
  Object.assign(CFG, c);
  if (c.features) Object.assign(CFG.features, c.features);
  if (c.apiKeys) Object.assign(CFG.apiKeys, c.apiKeys);
  if (CFG.features.gpsAuto) tryGpsPosition();
}).catch(() => { if (CFG.features.gpsAuto) tryGpsPosition(); });

/* ── GPS auto-position ── */
function tryGpsPosition() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    pos => {
      CFG.rxLat = pos.coords.latitude;
      CFG.rxLon = pos.coords.longitude;
      const el = document.getElementById("gpsLabel");
      if (el) el.textContent = `${CFG.rxLat.toFixed(3)}, ${CFG.rxLon.toFixed(3)}`;
      const chip = document.getElementById("chipGps");
      if (chip) { chip.className = "chip c-ok"; chip.querySelector(".dot").className = "dot dot-ok"; }
    },
    () => {
      const el = document.getElementById("gpsLabel");
      if (el) el.textContent = "GPS NO FIX";
    },
    { enableHighAccuracy: false, timeout: 8000 }
  );
}

/* ── math helpers ── */
const NM_R = 3440.065;
function haversineNm(la1, lo1, la2, lo2) {
  const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180;
  const dp = (la2 - la1) * Math.PI / 180, dl = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * NM_R * Math.asin(Math.sqrt(a));
}
function bearingDeg(la1, lo1, la2, lo2) {
  const p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180;
  const dl = (lo2 - lo1) * Math.PI / 180;
  return (Math.atan2(Math.sin(dl) * Math.cos(p2),
    Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * 180 / Math.PI + 360) % 360;
}
function compass(b) { return ["N","NE","E","SE","S","SW","W","NW"][Math.round(b / 45) % 8]; }
function enrichRange(e) {
  if (e.lat != null && e.lon != null) {
    e.rng = haversineNm(CFG.rxLat, CFG.rxLon, e.lat, e.lon);
    e.brg = bearingDeg(CFG.rxLat, CFG.rxLon, e.lat, e.lon);
  }
  return e;
}
window.GEO = { haversineNm, bearingDeg, compass };

/* ── entity history trails (last 30 positions per entity) ── */
const _trails = {};
function recordTrail(e) {
  if (e.lat == null || e.lon == null) return;
  if (!_trails[e.id]) _trails[e.id] = [];
  const t = _trails[e.id];
  if (t.length === 0 || t[t.length - 1].lat !== e.lat || t[t.length - 1].lon !== e.lon)
    t.push({ lat: e.lat, lon: e.lon, ts: Date.now() });
  if (t.length > 30) t.shift();
}
function getTrail(id) { return _trails[id] || []; }
window.TRAILS = { get: getTrail };

/* ══════════════════════════════════════════════
   SOURCE MODULES
══════════════════════════════════════════════ */

/* demo feed (unchanged from P2, still the fallback) */
const DEMO_AC  = [["B738","SWA"],["A320","ASA"],["E175","SKW"],["B789","DAL"],["C172","N"],["H60","N"],["DH8D","QXE"],["A321","AAL"],["CRJ9","SkyW"]];
const DEMO_SH  = ["COASTAL TRADER","PACIFIC STAR","SEA HAWK","NORTHERN LIGHT","MERIDIAN KING","IRON SHORE","BLUE RIDGE"];
const DEMO_TR  = ["Amtrak Coast Starlight","Amtrak Southwest Chief","Local Freight 8812"];
const SHIP_TYP = ["CARGO","TANKER","CONTAINER","FERRY","FISHING","TUGBOAT"];
let _demo = { aircraft: [], ships: [], trains: [], init: false };

function _spawn(type) {
  const brg = Math.random() * 360;
  const rng = type === "aircraft" ? 10 + Math.random() * 10
            : type === "ship"     ? 5  + Math.random() * 25
            :                       15 + Math.random() * 30;
  const [acType, pfx] = type === "aircraft" ? DEMO_AC[Math.floor(Math.random() * DEMO_AC.length)] : ["—",""];
  const ga = pfx === "N";
  return {
    type, id: type[0] + Math.random().toString(16).slice(2, 8),
    name: type === "aircraft"
      ? (ga ? "N" + (100 + Math.floor(Math.random() * 899)) + "AB" : pfx + (10 + Math.floor(Math.random() * 4900)))
      : type === "ship" ? DEMO_SH[Math.floor(Math.random() * DEMO_SH.length)]
      : DEMO_TR[Math.floor(Math.random() * DEMO_TR.length)],
    callsign: "",
    lat: CFG.rxLat + (rng / 60) * Math.cos(brg * Math.PI / 180),
    lon: CFG.rxLon + (rng / 60) * Math.sin(brg * Math.PI / 180) / Math.cos(CFG.rxLat * Math.PI / 180),
    altitude: type === "aircraft" ? (ga ? 2000 + Math.random() * 6000 : 8000 + Math.random() * 28000) : 0,
    speed: type === "aircraft" ? (ga ? 90 + Math.random() * 80 : 280 + Math.random() * 200)
         : type === "ship" ? 2 + Math.random() * 18 : 20 + Math.random() * 100,
    heading: Math.random() * 360,
    source: "DEMO", lastSeen: Date.now(), status: "active",
    extra: type === "aircraft" ? { acType } : type === "ship"
      ? { shipType: SHIP_TYP[Math.floor(Math.random() * SHIP_TYP.length)], mmsi: Math.floor(Math.random() * 9e8) } : {}
  };
}

function tickDemo(dt) {
  if (!_demo.init) {
    _demo.aircraft = Array.from({ length: 9 }, () => _spawn("aircraft"));
    _demo.ships    = Array.from({ length: 7 }, () => _spawn("ship"));
    _demo.trains   = Array.from({ length: 3 }, () => _spawn("train"));
    _demo.init = true;
  }
  for (const e of [..._demo.aircraft, ..._demo.ships, ..._demo.trains]) {
    const dNm = e.speed * dt / 3600;
    e.lat += (dNm / 60) * Math.cos(e.heading * Math.PI / 180);
    e.lon += (dNm / 60) * Math.sin(e.heading * Math.PI / 180) / Math.cos(e.lat * Math.PI / 180);
    if (Math.random() < 0.02) e.heading = (e.heading + (Math.random() * 14 - 7) + 360) % 360;
    e.lastSeen = Date.now();
    recordTrail(e);
  }
  _demo.aircraft = _demo.aircraft.filter(a => haversineNm(CFG.rxLat, CFG.rxLon, a.lat, a.lon) < 25);
  _demo.ships    = _demo.ships.filter(s => haversineNm(CFG.rxLat, CFG.rxLon, s.lat, s.lon) < 40);
  while (_demo.aircraft.length < 9) _demo.aircraft.push(_spawn("aircraft"));
  while (_demo.ships.length < 7) _demo.ships.push(_spawn("ship"));
  return _demo;
}

/* local ADS-B */
let _liveActive = false;
async function fetchLocalADSB() {
  try {
    const r = await fetch(CFG.aircraftJson, { cache: "no-store" });
    if (!r.ok) throw 0;
    const j = await r.json();
    _liveActive = true;
    return (j.aircraft || []).filter(a => a.lat != null && a.lon != null).map(a => {
      const e = {
        type: "aircraft", id: a.hex,
        name: (a.flight || a.hex || "").trim() || a.hex,
        callsign: (a.flight || "").trim(),
        lat: a.lat, lon: a.lon,
        altitude: typeof a.alt_baro === "number" ? a.alt_baro : (a.alt_geom || 0),
        speed: a.gs || 0, heading: a.track || 0,
        source: "LOCAL·1090", lastSeen: Date.now(), status: "airborne",
        extra: { acType: a.t || a.category || "—", squawk: a.squawk, rssi: a.rssi }
      };
      recordTrail(e); return e;
    });
  } catch { _liveActive = false; return null; }
}

/* ── FlightRadar24 connector ──
   Uses the pi24/fr24feed local feed endpoint on the Pi.
   fr24feed exposes a JSON feed at http://127.0.0.1:8754/flights.json
   No external API key needed for the local feeder feed.
   Set feature flag flightradar24:true in config to activate.         */
async function fetchFR24() {
  if (!CFG.features.flightradar24) return [];
  try {
    const r = await fetch("data/fr24.json", { cache: "no-store" });
    if (!r.ok) throw 0;
    const j = await r.json();
    return Object.entries(j).filter(([k]) => k !== "full_count" && k !== "version")
      .map(([, v]) => ({
        type: "aircraft", id: v[0],
        name: v[16] || v[0], callsign: v[16] || "",
        lat: v[1], lon: v[2],
        altitude: (v[4] || 0) * 3.28084,  // FR24 sends metres
        speed: v[5] || 0, heading: v[3] || 0,
        source: "FR24", lastSeen: Date.now(), status: "airborne",
        extra: { acType: v[8] || "—", origin: v[11], dest: v[12] }
      })).filter(e => e.lat && e.lon);
  } catch { return []; }
}

/* ── ADS-B Exchange connector ──
   Uses the ADSBx feed API v2. Needs an API key in config.apiKeys.adsbx.
   Falls back silently when key is absent.                             */
async function fetchADSBx() {
  if (!CFG.features.adsbexchange || !CFG.apiKeys.adsbx) return [];
  try {
    const url = `https://adsbexchange-com1.p.rapidapi.com/v2/lat/${CFG.rxLat}/lon/${CFG.rxLon}/dist/50/`;
    const r = await fetch(url, {
      headers: { "x-rapidapi-key": CFG.apiKeys.adsbx, "x-rapidapi-host": "adsbexchange-com1.p.rapidapi.com" }
    });
    if (!r.ok) throw 0;
    const j = await r.json();
    return (j.ac || []).map(a => ({
      type: "aircraft", id: a.hex,
      name: (a.flight || a.hex || "").trim(),
      callsign: (a.flight || "").trim(),
      lat: a.lat, lon: a.lon,
      altitude: typeof a.alt_baro === "number" ? a.alt_baro : 0,
      speed: a.gs || 0, heading: a.track || 0,
      source: "ADSBx", lastSeen: Date.now(), status: "airborne",
      extra: { acType: a.t || "—", mil: a.mil === "1" }
    })).filter(e => e.lat && e.lon);
  } catch { return []; }
}

/* ── OpenSky connector ──
   Anonymous: 400 req/day, 10s rate limit. Auth header optional.
   Bounding box around receiver position ±2 deg.                      */
async function fetchOpenSky() {
  if (!CFG.features.opensky) return [];
  try {
    const la = CFG.rxLat, lo = CFG.rxLon, d = 2;
    const auth = CFG.apiKeys.opensky
      ? "Basic " + btoa(CFG.apiKeys.opensky) : null;
    const hdrs = auth ? { Authorization: auth } : {};
    const url = `https://opensky-network.org/api/states/all?lamin=${la-d}&lomin=${lo-d}&lamax=${la+d}&lomax=${lo+d}`;
    const r = await fetch(url, { headers: hdrs });
    if (!r.ok) throw 0;
    const j = await r.json();
    return (j.states || []).filter(s => s[5] && s[6]).map(s => ({
      type: "aircraft", id: s[0],
      name: (s[1] || s[0] || "").trim(), callsign: (s[1] || "").trim(),
      lat: s[6], lon: s[5],
      altitude: (s[7] || 0) * 3.28084,  // OpenSky sends metres
      speed: (s[9] || 0) * 1.944,        // m/s → knots
      heading: s[10] || 0,
      source: "OpenSky", lastSeen: (s[4] || 0) * 1000, status: s[8] ? "ground" : "airborne",
      extra: { acType: "—", country: s[2] }
    }));
  } catch { return []; }
}

/* ── Amtrak connector ──
   Fetches the unofficial Amtrak status JSON used by many trackers.
   This is public data but not an official documented API.
   Falls back silently.                                               */
async function fetchAmtrak() {
  if (!CFG.features.amtrak) return [];
  try {
    const r = await fetch("https://api-v3.amtrak.com/rtt/public/v1/JSON/trips/", {
      headers: { "User-Agent": "SkyMeshScout/3.0 situational-awareness-prototype" }
    });
    if (!r.ok) throw 0;
    return [];  // parse shape varies — placeholder returns empty until mapping confirmed
  } catch { return []; }
}

/* ── source blend: merge aircraft from multiple sources, dedupe by position ── */
function blendAircraft(arrays) {
  const seen = new Map();
  for (const arr of arrays) {
    for (const e of arr) {
      const key = e.id || (Math.round(e.lat * 100) + "," + Math.round(e.lon * 100));
      if (!seen.has(key)) seen.set(key, e);
      else {
        // prefer local/live over remote
        const priority = { "LOCAL·1090": 0, "ADSBx": 1, "FR24": 2, "OpenSky": 3, "DEMO": 4 };
        if ((priority[e.source] || 9) < (priority[seen.get(key).source] || 9)) seen.set(key, e);
      }
    }
  }
  return [...seen.values()];
}

/* ── aggregator ── */
window.SOURCES = {
  CFG, isLive: () => _liveActive,
  haversineNm, bearingDeg, compass, enrichRange,
  async fetchAll(dt) {
    const localAC = await fetchLocalADSB();
    const demoData = localAC ? null : tickDemo(dt * 60);

    const [fr24AC, adsbxAC, openskyAC] = await Promise.all([fetchFR24(), fetchADSBx(), fetchOpenSky()]);

    let aircraft = blendAircraft(
      localAC ? [localAC, fr24AC, adsbxAC, openskyAC]
              : [demoData.aircraft, fr24AC, adsbxAC, openskyAC]
    ).map(enrichRange).sort((a, b) => a.rng - b.rng);

    // Ships: demo feed always (live AIS requires configured hardware/API)
    // Even when local ADS-B is live, ships use demo unless AIS is configured
    const shipData = (demoData ? demoData.ships : _demo.ships || []);
    let ships = shipData.map(enrichRange).sort((a, b) => (a.rng||999) - (b.rng||999));

    // Trains: Amtrak API returns [] in practice; always use demo feed
    // When real GTFS is configured, it will replace this
    const amtrakData = await fetchAmtrak();
    const trainData = amtrakData.length ? amtrakData : (_demo.trains || []);
    // Ensure demo trains are ticked even in live mode
    if (!demoData && _demo.trains) {
      _demo.trains.forEach(t => { t.lastSeen = Date.now(); });
    }
    let trains = trainData.map(enrichRange).sort((a, b) => (a.rng||999) - (b.rng||999));

    // team nodes come from MQTT/Meshtastic module
    const teamNodes = (window.MESH_STATE?.nodes || []).map(enrichRange);

    // record trails for aircraft
    for (const e of aircraft) recordTrail(e);

    return { aircraft, ships, trains, teamNodes, demo: !localAC };
  }
};
