/* ============================================================================
 * cap-integrations.js
 * AegisNet / SkyMesh — CAP Field Coordination Module
 * Build 7: AZ Wing interop — CACTUS, TAK/ATAK (CoT), and radio coordination
 *
 * SCOPE AND HONESTY (read before changing anything):
 *
 *   CACTUS (AZ Wing Comprehensive Tracking & Utility System):
 *     - One-way EXPORT only. Produces CACTUS-aligned mission/log records that an
 *       AUTHORIZED AZ Wing member can import or reference.
 *     - Field names here are ALIGNED to CACTUS logging concepts, NOT confirmed
 *       against AZ Wing's real import spec. Confirm mapping before operational use.
 *     - Live push is DISABLED. It requires AZ Wing's real endpoint + your
 *       authorization. We do not fake a connection to an official CAP system.
 *
 *   TAK / ATAK (Cursor-on-Target):
 *     - Emits/parses CoT so positions + check-ins appear on ATAK as map markers.
 *     - Routes over the existing mesh (Meshtastic ATAK/TAK plugin path).
 *     - CoT carries position, so it is OPT-IN, mirroring position sharing.
 *     - "how" reflects the real method (GPS vs estimate), so ATAK never shows an
 *       estimate as a hard GPS fix.
 *
 *   CAP GUARD (150.2250 MHz) and tactical channels:
 *     - HARD BOUNDARY: this device NEVER transmits on Guard or any federal/
 *       tactical frequency. It is a Part 15 LoRa device and cannot, by design.
 *     - We provide NON-TRANSMITTING reference data and mesh TEXT advisories
 *       ("switch to TAC 1"). The human acts on their real CAP radio. The mesh
 *       never touches the RF channel.
 *
 *   Sovereignty: first-party vanilla JS, zero foreign deps. CoT/TAK is US DoD
 *   originated. CACTUS is AZ Wing. No foreign code or services.
 *
 * Rides on (all feature-detected): window.CommsRouter, window.CAPPositioning,
 *   window.CAPCoordination, window.CAPAudit, window.NODE_IDENTITY, window.CAPMission
 * ==========================================================================*/

(function (global) {
  'use strict';

  var TRAINING_TAG = 'TRAINING-EXERCISE';

  var CONFIG = {
    cotStaleSeconds: 120,            // ATAK marker goes stale after this
    cotType: 'a-f-G-U-C',            // friendly ground unit (MIL-STD-2525 via CoT)
    cactusMappingConfirmed: false    // set true ONLY after AZ Wing confirms field map
  };

  function audit(action, details) {
    if (global.CAPAudit && typeof global.CAPAudit.log === 'function') {
      global.CAPAudit.log({ action: action, module: 'integrations', details: details || {} });
    }
  }
  function nodeId() {
    var n = global.NODE_IDENTITY;
    return (n && typeof n.getId === 'function') ? n.getId() : 'local';
  }
  function missionId() {
    var m = global.CAPMission;
    if (m && typeof m.getMission === 'function') {
      var mis = m.getMission();
      if (mis && mis.missionId) return mis.missionId;
    }
    return 'NO-MISSION';
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ======================================================================
   * 1) CACTUS export adapter (one-way; mapping unconfirmed; push disabled)
   * ==================================================================== */
  var Cactus = {
    // Build a CACTUS-aligned mission log from team status + audit entries.
    buildMissionLog: function (teamStatus, auditEntries) {
      teamStatus = teamStatus || (global.CAPCoordination &&
        global.CAPCoordination.getTeamStatus ? global.CAPCoordination.getTeamStatus() : []);
      auditEntries = auditEntries || [];

      var personnel = teamStatus.map(function (t) {
        return {
          callsign: t.callsign,        // AZ Wing exercise callsign (training)
          role: t.role,
          lastCheckin: t.lastCheckin,
          checkinStatus: t.checkinType,
          online: t.online
          // NOTE: position intentionally omitted unless member opted in to share.
        };
      });

      var groundMovements = auditEntries
        .filter(function (e) { return e.action === 'checkin_sent' || e.action === 'checkin_received'; })
        .map(function (e) { return { action: e.action, details: e.details, ts: e.ts || null }; });

      return {
        _meta: {
          source: 'AegisNet/SkyMesh CAP Module (training prototype)',
          mappingConfirmed: CONFIG.cactusMappingConfirmed,
          warning: 'Field mapping is ALIGNED to CACTUS concepts, not confirmed against AZ Wing import spec. Confirm before operational use.',
          generatedAt: new Date().toISOString()
        },
        missionId: missionId(),
        exerciseType: 'TRAINING-EXERCISE',
        personnel: personnel,
        groundTeamMovements: groundMovements,
        operationalStats: {
          nodes: personnel.length,
          online: personnel.filter(function (p) { return p.online; }).length,
          loggedActions: auditEntries.length
        }
      };
    },

    exportJSON: function (teamStatus, auditEntries) {
      return JSON.stringify(Cactus.buildMissionLog(teamStatus, auditEntries), null, 2);
    },

    exportCSV: function (teamStatus, auditEntries) {
      var log = Cactus.buildMissionLog(teamStatus, auditEntries);
      var rows = [['callsign', 'role', 'checkinStatus', 'lastCheckin', 'online'].join(',')];
      log.personnel.forEach(function (p) {
        rows.push([p.callsign, p.role, p.checkinStatus, p.lastCheckin, p.online]
          .map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; })
          .join(','));
      });
      return rows.join('\n');
    },

    // Live push is intentionally disabled. We will not fake a connection to an
    // official CAP system. Returns guidance instead of pretending.
    pushToCactus: function () {
      audit('cactus_push_blocked', { reason: 'no authorized endpoint' });
      return {
        sent: false,
        reason: 'CACTUS live push is disabled.',
        howToEnable: 'Requires AZ Wing\'s real CACTUS import endpoint + your authorized credentials + confirmed field mapping. Use exportJSON/exportCSV and import through an authorized member until then.'
      };
    }
  };

  /* ======================================================================
   * 2) TAK / ATAK — Cursor-on-Target (CoT)
   * ==================================================================== */
  var Tak = {
    // Map our position method to a CoT "how" so ATAK shows provenance honestly.
    howFromMethod: function (method) {
      switch (method) {
        case 'gnss':           return 'm-g'; // GPS
        case 'gnss_stale':     return 'm-g'; // GPS-derived; staleness shown via stale time
        case 'dead_reckoning': return 'm-i'; // inertial
        case 'mesh_trilat':    return 'm-r'; // ranged/derived
        case 'mesh_proximity': return 'm-r';
        case 'manual':         return 'h-e'; // human estimated
        default:               return 'h-g-i-g-o';
      }
    },

    // Build a CoT event from a fused position + node context.
    toCoT: function (pos, node) {
      node = node || {};
      var now = new Date();
      var stale = new Date(now.getTime() + CONFIG.cotStaleSeconds * 1000);
      var uid = node.uid || ('AEGIS-' + (node.nodeId || nodeId()));
      var how = Tak.howFromMethod(pos.method);
      var ce = (pos.accuracy == null) ? 9999999 : pos.accuracy;
      var remarks = TRAINING_TAG + ' - AegisNet/SkyMesh prototype - method:' +
                    pos.method + (pos.isEstimate ? ' (ESTIMATE)' : '');
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<event version="2.0" uid="' + esc(uid) + '" type="' + CONFIG.cotType + '" how="' + how + '"' +
        ' time="' + now.toISOString() + '" start="' + now.toISOString() + '" stale="' + stale.toISOString() + '">' +
        '<point lat="' + pos.lat + '" lon="' + pos.lon + '" hae="9999999.0" ce="' + ce + '" le="9999999.0"/>' +
        '<detail>' +
        '<contact callsign="' + esc(node.callsign || uid) + '"/>' +
        '<__group name="Cyan" role="' + esc(node.role || 'Team Member') + '"/>' +
        '<remarks>' + esc(remarks) + '</remarks>' +
        '</detail></event>';
    },

    // Minimal, dependency-free CoT parser for the fields we need.
    fromCoT: function (xml) {
      if (typeof xml !== 'string' || xml.indexOf('<event') < 0) return null;
      function attr(tag, name) {
        var m = new RegExp('<' + tag + '\\b[^>]*\\b' + name + '="([^"]*)"').exec(xml);
        return m ? m[1] : null;
      }
      function evAttr(name) {
        var m = new RegExp('<event\\b[^>]*\\b' + name + '="([^"]*)"').exec(xml);
        return m ? m[1] : null;
      }
      var lat = parseFloat(attr('point', 'lat'));
      var lon = parseFloat(attr('point', 'lon'));
      if (isNaN(lat) || isNaN(lon)) return null;
      var ce = parseFloat(attr('point', 'ce'));
      var callsign = attr('contact', 'callsign');
      var roleM = /<__group\b[^>]*\brole="([^"]*)"/.exec(xml);
      return {
        uid: evAttr('uid'),
        type: evAttr('type'),
        how: evAttr('how'),
        time: evAttr('time'),
        stale: evAttr('stale'),
        lat: lat, lon: lon,
        accuracy: isNaN(ce) ? null : ce,
        callsign: callsign,
        role: roleM ? roleM[1] : null
      };
    },

    enabled: false, // OPT-IN (CoT carries position). Off by default.
    unsub: null,

    enable: function () {
      Tak.enabled = true;
      // Mirror positions to CoT only when position sharing is also opted in.
      var p = global.CAPPositioning;
      if (p && typeof p.subscribe === 'function' && !Tak.unsub) {
        Tak.unsub = p.subscribe(function (pos) {
          if (!Tak.enabled) return;
          if (!pos || !pos.hasFix) return;
          if (typeof p.isSharing === 'function' && !p.isSharing()) return; // respect opt-in
          Tak.sendCoT(pos);
        });
      }
      audit('cot_enabled', {});
    },
    disable: function () {
      Tak.enabled = false;
      if (Tak.unsub) { Tak.unsub(); Tak.unsub = null; }
      audit('cot_disabled', {});
    },

    // Route CoT over the existing comms (Meshtastic ATAK/TAK plugin path).
    sendCoT: function (pos) {
      var node = {
        nodeId: nodeId(),
        callsign: (global.CAPCoordination && global.CAPCoordination.getNode &&
                   global.CAPCoordination.getNode(nodeId()) || {}).callsign,
        role: (global.CAPMission && global.CAPMission.getMission &&
               (global.CAPMission.getMission() || {}).teamRole)
      };
      var cot = Tak.toCoT(pos, node);
      var router = global.CommsRouter;
      if (router && typeof router.send === 'function') {
        router.send({ type: 'cot', tag: TRAINING_TAG, payload: cot, from: nodeId() });
        audit('cot_sent', { method: pos.method }); // method only, no coords
        return true;
      }
      return false;
    }
  };

  /* ======================================================================
   * 3) Radio coordination reference (CAP Guard / tactical) — NON-TRANSMITTING
   * ==================================================================== */
  var Radio = {
    // Reference data ONLY. Including a frequency here is documentation, paired
    // with an explicit non-transmit flag. The device cannot and must not key it.
    CHANNELS: [
      { id: 'GUARD', label: 'CAP Guard (Guard 1)', freqMHz: 150.2250,
        purpose: 'Emergency calling / channel coordination on real CAP VHF-FM radios.',
        transmitByThisDevice: false,
        note: 'Federal narrowband frequency. This prototype NEVER transmits here. Reference only.' },
      { id: 'TAC1', label: 'TAC 1 (tactical)', freqMHz: null,
        purpose: 'Working tactical channel; set per mission comms plan on real radios.',
        transmitByThisDevice: false, note: 'Reference label only.' },
      { id: 'AIR1', label: 'Air 1 (air-to-ground)', freqMHz: null,
        purpose: 'Air-to-ground coordination on real radios.',
        transmitByThisDevice: false, note: 'Reference label only.' }
    ],

    referenceChannel: function (id) {
      var c = Radio.CHANNELS.filter(function (x) { return x.id === id; })[0];
      return c || null;
    },

    // Send a TEXT advisory over the mesh telling teams which REAL radio channel
    // to switch to. The mesh carries the label. Humans act on their CAP radios.
    // This mirrors CAP Guard's real channel-coordination use, without any RF.
    adviseChannelSwitch: function (toChannelId, note) {
      var c = Radio.referenceChannel(toChannelId);
      var label = c ? c.label : String(toChannelId);
      var text = 'COMMS ADVISORY: switch to ' + label +
                 ' on your CAP radio' + (note ? (' - ' + note) : '');
      var sent = false;
      if (global.CAPCoordination && typeof global.CAPCoordination.shareTasking === 'function') {
        global.CAPCoordination.shareTasking(text, 'ALL');
        sent = true;
      }
      // Hard invariant: this function carries TEXT only. It never sets, keys,
      // or transmits a frequency. It cannot reach RF hardware.
      audit('channel_advisory_sent', { to: toChannelId }); // no RF action
      return { sent: sent, text: text, transmittedRF: false };
    }
  };

  /* ======================================================================
   * Public API
   * ==================================================================== */
  var CAPIntegrations = {
    config: CONFIG,
    cactus: {
      buildMissionLog: Cactus.buildMissionLog,
      exportJSON: Cactus.exportJSON,
      exportCSV: Cactus.exportCSV,
      pushToCactus: Cactus.pushToCactus
    },
    tak: {
      toCoT: Tak.toCoT,
      fromCoT: Tak.fromCoT,
      howFromMethod: Tak.howFromMethod,
      enable: Tak.enable,
      disable: Tak.disable,
      isEnabled: function () { return Tak.enabled; },
      sendCoT: Tak.sendCoT
    },
    radio: {
      channels: function () { return Radio.CHANNELS.slice(); },
      referenceChannel: Radio.referenceChannel,
      adviseChannelSwitch: Radio.adviseChannelSwitch
    }
  };

  global.CAPIntegrations = CAPIntegrations;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CAPIntegrations: CAPIntegrations, Cactus: Cactus, Tak: Tak, Radio: Radio };
  }

})(typeof window !== 'undefined' ? window : globalThis);
