/* ============================================================================
 * cap-positioning.js
 * AegisNet / SkyMesh — CAP Field Coordination Module
 * Positioning layer: GPS primary + GPS-denied fallback (resilience, not spoofing)
 *
 * HONESTY CONTRACT (matches the CAP module framing):
 *   - GPS-alternative methods produce ESTIMATES. They are never presented as a
 *     precise GNSS fix. Every position carries a method label + accuracy (meters).
 *   - This is a TRAINING PROTOTYPE. Not for life-safety navigation.
 *   - This NEVER transmits on GNSS bands. It does not jam, spoof, or replace GPS.
 *     It only estimates position when the real fix is unavailable or stale.
 *   - Position sharing (real OR estimated) is OPT-IN and OFF by default.
 *   - Audit logging records the METHOD and share events, never the coordinates
 *     of any node that did not opt in to position sharing.
 *
 * Built on the existing SkyMesh/AegisNet globals (all feature-detected, so this
 * module also runs standalone for testing):
 *   window.CommsRouter, window.MESH_STATE, window.NODE_IDENTITY,
 *   window.CAPCoordination, window.CAPAudit
 * ==========================================================================*/

(function (global) {
  'use strict';

  // ------------------------------------------------------------------------
  // Config
  // ------------------------------------------------------------------------
  var CONFIG = {
    // GNSS
    staleAfterMs:        5000,    // a GNSS fix older than this is "stale"
    deadAfterMs:         60000,   // drop GNSS entirely past this age
    staleGrowMetersPerS: 1.5,     // accuracy radius growth while coasting a stale fix

    // GNSS sovereignty (American tech only): accept US systems only.
    gnssStrictUS:        true,    // reject fixes that used non-US constellations
    gnssAllowedSystems:  ['GPS', 'WAAS'], // US constellation + US augmentation

    // Dead reckoning (pedestrian, on foot)
    strideMeters:        0.74,    // default stride; calibrate per operator
    stepAccelThreshold:  1.2,     // m/s^2 above gravity-removed magnitude
    stepRefractoryMs:    300,     // min time between counted steps
    drErrorFraction:     0.12,    // accuracy radius grows ~12% of distance walked

    // Mesh RSSI positioning (log-distance path-loss model)
    rssiAt1m:            -40,     // calibrated RSSI at 1 m (A)
    pathLossExponent:    2.8,     // n: 2.0 free space, 2.7-3.5 typical outdoor
    rssiMinAnchors:      3,       // need >=3 anchors for a 2D solve
    rssiAccuracyFloor:   30,      // never claim better than this for RSSI (m)

    // Sharing / mesh hygiene
    shareMinIntervalMs:  15000,   // LoRa is low bandwidth; rate-limit broadcasts
    trainingTag:         'TRAINING-EXERCISE'
  };

  // Method labels, best-to-worst, with default accuracy expectations (m).
  var METHOD = {
    GNSS:        { id: 'gnss',          label: 'GPS fix',            rank: 0 },
    GNSS_STALE:  { id: 'gnss_stale',    label: 'GPS (stale)',        rank: 1 },
    DEAD_RECK:   { id: 'dead_reckoning',label: 'Dead reckoning',     rank: 2 },
    MESH_TRILAT: { id: 'mesh_trilat',   label: 'Mesh trilateration', rank: 3 },
    MESH_PROX:   { id: 'mesh_proximity',label: 'Mesh proximity',     rank: 4 },
    MANUAL:      { id: 'manual',        label: 'Manual / landmark',  rank: 5 },
    NONE:        { id: 'none',          label: 'No position',        rank: 9 }
  };

  // ------------------------------------------------------------------------
  // Geo utilities (local-tangent-plane math; fine at field-exercise scale)
  // ------------------------------------------------------------------------
  var Geo = {
    R: 6378137, // WGS84 mean radius (m)

    toRad: function (d) { return d * Math.PI / 180; },
    toDeg: function (r) { return r * 180 / Math.PI; },

    // meters of north/east offset -> new lat/lon
    offset: function (lat, lon, dNorth, dEast) {
      var dLat = dNorth / 111320;
      var dLon = dEast / (111320 * Math.cos(Geo.toRad(lat)));
      return { lat: lat + dLat, lon: lon + dLon };
    },

    // lat/lon -> local east/north meters relative to a reference point
    toENU: function (lat, lon, refLat, refLon) {
      var dLat = Geo.toRad(lat - refLat);
      var dLon = Geo.toRad(lon - refLon);
      var north = dLat * Geo.R;
      var east  = dLon * Geo.R * Math.cos(Geo.toRad(refLat));
      return { e: east, n: north };
    },

    // local east/north meters -> lat/lon relative to a reference point
    fromENU: function (e, n, refLat, refLon) {
      var lat = refLat + Geo.toDeg(n / Geo.R);
      var lon = refLon + Geo.toDeg(e / (Geo.R * Math.cos(Geo.toRad(refLat))));
      return { lat: lat, lon: lon };
    },

    haversine: function (lat1, lon1, lat2, lon2) {
      var dLat = Geo.toRad(lat2 - lat1);
      var dLon = Geo.toRad(lon2 - lon1);
      var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(Geo.toRad(lat1)) * Math.cos(Geo.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * Geo.R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
  };

  // ------------------------------------------------------------------------
  // Source 1: GNSS (browser geolocation, or external feed from node GPS)
  // ------------------------------------------------------------------------
  var Gnss = {
    last: null, // { lat, lon, accuracy, t, provenance }
    watchId: null,

    ingest: function (lat, lon, accuracy) {
      // Simple path (e.g. browser geolocation). The browser fuses constellations
      // opaquely and will not tell us which systems it used, so we cannot verify
      // US-only origin here. Mark it so higher tiers can require a verified feed.
      Gnss.last = {
        lat: lat, lon: lon,
        accuracy: (accuracy == null ? 8 : accuracy),
        t: Date.now(),
        provenance: 'unverified-constellation'
      };
      DeadReckoning.anchorTo(Gnss.last);
    },

    // Verified path: a node GPS feed that reports which systems produced the fix.
    // fix = { lat, lon, accuracy, systems: ['GPS', ...] }
    // Under gnssStrictUS, any non-US system in the fix rejects it outright.
    ingestDetailed: function (fix) {
      var systems = fix.systems || [];
      if (CONFIG.gnssStrictUS && systems.length) {
        var ok = systems.every(function (s) {
          return CONFIG.gnssAllowedSystems.indexOf(s) >= 0;
        });
        if (!ok) {
          audit('gnss_rejected_non_us', { systems: systems });
          return false; // refuse the fix rather than silently use foreign GNSS
        }
      }
      Gnss.last = {
        lat: fix.lat, lon: fix.lon,
        accuracy: (fix.accuracy == null ? 8 : fix.accuracy),
        t: Date.now(),
        provenance: systems.length ? 'verified-us' : 'unverified-constellation'
      };
      DeadReckoning.anchorTo(Gnss.last);
      return true;
    },

    start: function () {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        Gnss.watchId = navigator.geolocation.watchPosition(
          function (p) { Gnss.ingest(p.coords.latitude, p.coords.longitude, p.coords.accuracy); },
          function () { /* coast on last fix; do not throw */ },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 }
        );
      }
    },

    stop: function () {
      if (Gnss.watchId != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(Gnss.watchId);
        Gnss.watchId = null;
      }
    },

    // Returns a fix tagged GNSS, GNSS_STALE, or null if past deadAfterMs.
    read: function () {
      if (!Gnss.last) return null;
      var age = Date.now() - Gnss.last.t;
      if (age > CONFIG.deadAfterMs) return null;
      if (age <= CONFIG.staleAfterMs) {
        return {
          lat: Gnss.last.lat, lon: Gnss.last.lon,
          accuracy: Gnss.last.accuracy,
          method: METHOD.GNSS, age: age,
          provenance: Gnss.last.provenance
        };
      }
      // stale: coast, but grow the error radius so we never lie about precision
      var grown = Gnss.last.accuracy + (age / 1000) * CONFIG.staleGrowMetersPerS;
      return {
        lat: Gnss.last.lat, lon: Gnss.last.lon,
        accuracy: grown, method: METHOD.GNSS_STALE, age: age,
        provenance: Gnss.last.provenance
      };
    }
  };

  // ------------------------------------------------------------------------
  // Source 2: Dead reckoning (pedestrian, IMU step + heading integration)
  // ------------------------------------------------------------------------
  var DeadReckoning = {
    enabled: false,
    origin: null,        // { lat, lon } last trusted anchor
    pos: null,           // current estimated { lat, lon }
    distanceWalked: 0,   // meters since last anchor (feeds error radius)
    heading: 0,          // degrees, 0 = north
    lastStepT: 0,
    accelHist: [],

    anchorTo: function (fix) {
      DeadReckoning.origin = { lat: fix.lat, lon: fix.lon };
      DeadReckoning.pos = { lat: fix.lat, lon: fix.lon };
      DeadReckoning.distanceWalked = 0;
    },

    onOrientation: function (ev) {
      // iOS exposes webkitCompassHeading; others use 360 - alpha
      if (typeof ev.webkitCompassHeading === 'number') {
        DeadReckoning.heading = ev.webkitCompassHeading;
      } else if (typeof ev.alpha === 'number') {
        DeadReckoning.heading = (360 - ev.alpha) % 360;
      }
    },

    onMotion: function (ev) {
      var a = ev.accelerationIncludingGravity || ev.acceleration;
      if (!a) return;
      var mag = Math.sqrt((a.x || 0) * (a.x || 0) +
                          (a.y || 0) * (a.y || 0) +
                          (a.z || 0) * (a.z || 0));
      DeadReckoning.detectStep(mag - 9.81);
    },

    // Peak detection with a refractory period to count walking steps.
    detectStep: function (linMag) {
      var now = Date.now();
      if (linMag > CONFIG.stepAccelThreshold &&
          now - DeadReckoning.lastStepT > CONFIG.stepRefractoryMs) {
        DeadReckoning.lastStepT = now;
        DeadReckoning.step();
      }
    },

    // Manual injection for testing / external pedometers.
    step: function () {
      if (!DeadReckoning.pos) return;
      var rad = Geo.toRad(DeadReckoning.heading);
      var dN = CONFIG.strideMeters * Math.cos(rad);
      var dE = CONFIG.strideMeters * Math.sin(rad);
      var np = Geo.offset(DeadReckoning.pos.lat, DeadReckoning.pos.lon, dN, dE);
      DeadReckoning.pos = np;
      DeadReckoning.distanceWalked += CONFIG.strideMeters;
    },

    start: function () {
      DeadReckoning.enabled = true;
      if (typeof global.addEventListener === 'function') {
        global.addEventListener('deviceorientation', DeadReckoning.onOrientation, true);
        global.addEventListener('devicemotion', DeadReckoning.onMotion, true);
      }
    },

    stop: function () {
      DeadReckoning.enabled = false;
      if (typeof global.removeEventListener === 'function') {
        global.removeEventListener('deviceorientation', DeadReckoning.onOrientation, true);
        global.removeEventListener('devicemotion', DeadReckoning.onMotion, true);
      }
    },

    read: function () {
      if (!DeadReckoning.enabled || !DeadReckoning.pos) return null;
      // No usable estimate without a trusted origin to integrate from.
      if (!DeadReckoning.origin) return null;
      var acc = 5 + DeadReckoning.distanceWalked * CONFIG.drErrorFraction;
      return {
        lat: DeadReckoning.pos.lat, lon: DeadReckoning.pos.lon,
        accuracy: acc, method: METHOD.DEAD_RECK,
        age: 0, distanceWalked: DeadReckoning.distanceWalked
      };
    }
  };

  // ------------------------------------------------------------------------
  // Source 3: Mesh RSSI positioning (trilateration / proximity)
  // ------------------------------------------------------------------------
  var Mesh = {
    // anchors: [{ id, lat, lon, rssi }] — nodes at KNOWN positions we hear.
    rssiToMeters: function (rssi) {
      var exp = (CONFIG.rssiAt1m - rssi) / (10 * CONFIG.pathLossExponent);
      return Math.pow(10, exp);
    },

    // Collect anchors from MESH_STATE: nodes with a known fix + an RSSI to us.
    collectAnchors: function () {
      var anchors = [];
      var ms = global.MESH_STATE;
      if (ms && Array.isArray(ms.nodes)) {
        ms.nodes.forEach(function (n) {
          if (n && n.knownPosition && typeof n.rssi === 'number') {
            anchors.push({
              id: n.id,
              lat: n.knownPosition.lat,
              lon: n.knownPosition.lon,
              rssi: n.rssi
            });
          }
        });
      }
      return anchors;
    },

    read: function (anchorsIn) {
      var anchors = anchorsIn || Mesh.collectAnchors();
      if (anchors.length === 0) return null;

      // Reference frame = centroid of anchors.
      var refLat = 0, refLon = 0;
      anchors.forEach(function (a) { refLat += a.lat; refLon += a.lon; });
      refLat /= anchors.length; refLon /= anchors.length;

      var pts = anchors.map(function (a) {
        var enu = Geo.toENU(a.lat, a.lon, refLat, refLon);
        return { e: enu.e, n: enu.n, r: Math.max(1, Mesh.rssiToMeters(a.rssi)) };
      });

      // 1-2 anchors: proximity ring around the nearest anchor only.
      if (pts.length < CONFIG.rssiMinAnchors) {
        var nearest = pts.reduce(function (m, p) { return p.r < m.r ? p : m; }, pts[0]);
        var ll = Geo.fromENU(nearest.e, nearest.n, refLat, refLon);
        return {
          lat: ll.lat, lon: ll.lon,
          accuracy: Math.max(CONFIG.rssiAccuracyFloor, nearest.r),
          method: METHOD.MESH_PROX, age: 0, anchors: anchors.length
        };
      }

      // >=3 anchors: linear least-squares multilateration.
      // Subtract anchor 0's circle equation from each i>=1 to linearize.
      var x0 = pts[0].e, y0 = pts[0].n, r0 = pts[0].r;
      var A = [], b = [];
      for (var i = 1; i < pts.length; i++) {
        var xi = pts[i].e, yi = pts[i].n, ri = pts[i].r;
        A.push([2 * (xi - x0), 2 * (yi - y0)]);
        b.push((r0 * r0 - ri * ri) - (x0 * x0 - xi * xi) - (y0 * y0 - yi * yi));
      }
      var sol = Mesh.lstsq2(A, b);
      if (!sol) return null;

      var lls = Geo.fromENU(sol.x, sol.y, refLat, refLon);
      // Accuracy proxy: RMS residual between solved point and each range circle.
      var resid = 0;
      pts.forEach(function (p) {
        var d = Math.sqrt((sol.x - p.e) * (sol.x - p.e) + (sol.y - p.n) * (sol.y - p.n));
        resid += (d - p.r) * (d - p.r);
      });
      var rms = Math.sqrt(resid / pts.length);
      return {
        lat: lls.lat, lon: lls.lon,
        accuracy: Math.max(CONFIG.rssiAccuracyFloor, rms),
        method: METHOD.MESH_TRILAT, age: 0, anchors: anchors.length
      };
    },

    // 2-variable least squares via normal equations (A^T A x = A^T b).
    lstsq2: function (A, b) {
      var a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
      for (var i = 0; i < A.length; i++) {
        a11 += A[i][0] * A[i][0];
        a12 += A[i][0] * A[i][1];
        a22 += A[i][1] * A[i][1];
        b1  += A[i][0] * b[i];
        b2  += A[i][1] * b[i];
      }
      var det = a11 * a22 - a12 * a12;
      if (Math.abs(det) < 1e-9) return null; // anchors collinear / degenerate
      return {
        x: (a22 * b1 - a12 * b2) / det,
        y: (a11 * b2 - a12 * b1) / det
      };
    }
  };

  // ------------------------------------------------------------------------
  // Source 4: Manual / landmark fix (human-in-the-loop, always available)
  // ------------------------------------------------------------------------
  var Manual = {
    fix: null, // { lat, lon, accuracy, t }
    set: function (lat, lon, statedAccuracy) {
      Manual.fix = { lat: lat, lon: lon, accuracy: statedAccuracy || 50, t: Date.now() };
    },
    clear: function () { Manual.fix = null; },
    read: function () {
      if (!Manual.fix) return null;
      return {
        lat: Manual.fix.lat, lon: Manual.fix.lon,
        accuracy: Manual.fix.accuracy, method: METHOD.MANUAL,
        age: Date.now() - Manual.fix.t
      };
    }
  };

  // ------------------------------------------------------------------------
  // Fusion: pick the best available estimate
  // ------------------------------------------------------------------------
  function fuse() {
    var candidates = [
      Gnss.read(),
      DeadReckoning.read(),
      Mesh.read(),
      Manual.read()
    ].filter(Boolean);

    if (candidates.length === 0) {
      return { method: METHOD.NONE, label: METHOD.NONE.label, hasFix: false };
    }

    // Prefer lower method rank (better source); break ties by smaller accuracy.
    candidates.sort(function (a, b) {
      if (a.method.rank !== b.method.rank) return a.method.rank - b.method.rank;
      return a.accuracy - b.accuracy;
    });

    var best = candidates[0];
    var confidence = Math.max(0, Math.min(1, 1 - (best.method.rank / 6)));
    return {
      hasFix: true,
      lat: round(best.lat, 6),
      lon: round(best.lon, 6),
      accuracy: Math.round(best.accuracy),
      method: best.method.id,
      label: best.method.label,
      isEstimate: best.method.rank > 0, // anything but a live GNSS fix is an estimate
      confidence: round(confidence, 2),
      ageMs: best.age || 0,
      provenance: best.provenance || null,
      sources: candidates.map(function (c) {
        return { method: c.method.id, accuracy: Math.round(c.accuracy) };
      })
    };
  }

  function round(v, d) { var f = Math.pow(10, d); return Math.round(v * f) / f; }

  // ------------------------------------------------------------------------
  // Integration adapters (all feature-detected, never hard dependencies)
  // ------------------------------------------------------------------------
  function audit(action, details) {
    if (global.CAPAudit && typeof global.CAPAudit.log === 'function') {
      global.CAPAudit.log({ action: action, module: 'positioning', details: details || {} });
    }
  }

  // ------------------------------------------------------------------------
  // Public API: window.CAPPositioning
  // ------------------------------------------------------------------------
  var subscribers = [];
  var pollTimer = null;
  var lastShareT = 0;
  var shareEnabled = false; // OPT-IN. Off by default. Privacy-critical.

  var CAPPositioning = {
    METHOD: METHOD,
    config: CONFIG,

    // Start position sourcing. opts: { gnss, deadReckoning } booleans.
    start: function (opts) {
      opts = opts || {};
      if (opts.gnss !== false) Gnss.start();
      if (opts.deadReckoning) DeadReckoning.start();
      if (!pollTimer) {
        pollTimer = setInterval(function () { tick(); }, 1000);
      }
      audit('positioning_start', { gnss: opts.gnss !== false, dr: !!opts.deadReckoning });
      return CAPPositioning;
    },

    stop: function () {
      Gnss.stop();
      DeadReckoning.stop();
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      audit('positioning_stop', {});
    },

    // Best available position right now.
    getBest: function () { return fuse(); },

    // Subscribe to position updates: fn(positionObj). Returns unsubscribe().
    subscribe: function (fn) {
      subscribers.push(fn);
      return function () {
        var i = subscribers.indexOf(fn);
        if (i >= 0) subscribers.splice(i, 1);
      };
    },

    // External feeds (e.g., node GPS over mesh, or a paired phone).
    ingestGnss: function (lat, lon, accuracy) { Gnss.ingest(lat, lon, accuracy); },
    // Verified feed with constellation info; honors gnssStrictUS (US systems only).
    ingestGnssDetailed: function (fix) { return Gnss.ingestDetailed(fix); },
    setUsOnly: function (on) { CONFIG.gnssStrictUS = !!on; },
    setManual:  function (lat, lon, acc) { Manual.set(lat, lon, acc); audit('manual_fix_set', {}); },
    clearManual: function () { Manual.clear(); },
    injectStep: function () { DeadReckoning.step(); }, // for test / external pedometer
    calibrateStride: function (m) { CONFIG.strideMeters = m; },
    calibratePathLoss: function (rssiAt1m, n) {
      if (rssiAt1m != null) CONFIG.rssiAt1m = rssiAt1m;
      if (n != null) CONFIG.pathLossExponent = n;
    },

    // OPT-IN position sharing. Returns false if blocked or rate-limited.
    enableSharing: function () { shareEnabled = true; audit('share_enabled', {}); },
    disableSharing: function () { shareEnabled = false; audit('share_disabled', {}); },
    isSharing: function () { return shareEnabled; },

    // Broadcast position over the existing CommsRouter / CAPCoordination, tagged.
    shareNow: function () {
      if (!shareEnabled) return false;
      var now = Date.now();
      if (now - lastShareT < CONFIG.shareMinIntervalMs) return false; // LoRa hygiene
      var pos = fuse();
      if (!pos.hasFix) return false;

      var payload = {
        type: 'position',
        tag: CONFIG.trainingTag,
        lat: pos.lat, lon: pos.lon,
        accuracy: pos.accuracy,
        method: pos.method,
        isEstimate: pos.isEstimate,
        node: nodeId()
      };

      // Prefer the CAP coordination layer if present; else raw CommsRouter.
      if (global.CAPCoordination && typeof global.CAPCoordination.sharePosition === 'function') {
        global.CAPCoordination.sharePosition(payload);
      } else if (global.CommsRouter && typeof global.CommsRouter.send === 'function') {
        global.CommsRouter.send(payload);
      } else {
        return false; // nothing to send over; stay silent rather than fake it
      }
      lastShareT = now;
      // Audit the METHOD, never the coordinates (privacy contract).
      audit('position_shared', { method: pos.method, accuracy: pos.accuracy });
      return true;
    }
  };

  function nodeId() {
    if (global.NODE_IDENTITY && typeof global.NODE_IDENTITY.getId === 'function') {
      return global.NODE_IDENTITY.getId();
    }
    return 'local';
  }

  function tick() {
    var pos = fuse();
    subscribers.forEach(function (fn) { try { fn(pos); } catch (e) {} });
    if (shareEnabled) CAPPositioning.shareNow();
  }

  // ------------------------------------------------------------------------
  // Export
  // ------------------------------------------------------------------------
  global.CAPPositioning = CAPPositioning;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CAPPositioning: CAPPositioning, Geo: Geo, Mesh: Mesh,
                       DeadReckoning: DeadReckoning, Gnss: Gnss, Manual: Manual, fuse: fuse };
  }

})(typeof window !== 'undefined' ? window : globalThis);
