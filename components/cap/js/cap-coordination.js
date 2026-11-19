/* ============================================================================
 * cap-coordination.js
 * AegisNet / SkyMesh — CAP Field Coordination Module
 * Build 2: mesh-based team coordination (check-ins, tasking, position, status)
 *
 * SOVEREIGNTY (American tech only):
 *   - Zero third-party / foreign dependencies. First-party vanilla JS only.
 *   - Positions come from cap-positioning.js, which is locked to US GNSS
 *     (GPS + WAAS) and constellation-independent fallbacks (mesh RSSI, dead
 *     reckoning, manual). No foreign positioning system is ever required.
 *
 * HONESTY CONTRACT (matches the CAP module framing):
 *   - Text and position only over mesh. No voice/video over LoRa (bandwidth).
 *   - Every message is tagged TRAINING-EXERCISE and labeled with the route used.
 *   - "NEED ASSISTANCE" is a TRAINING check-in. It is explicitly NOT a real
 *     distress signal and is flagged so it can never be mistaken for one.
 *   - Position sharing is OPT-IN (enforced by cap-positioning.js).
 *   - Audit logs the action, never the coordinates.
 *
 * Rides on existing SkyMesh/AegisNet globals (all feature-detected):
 *   window.CommsRouter, window.MQTT, window.MESH_STATE, window.NODE_IDENTITY,
 *   window.CAPMission, window.CAPAudit, window.CAPPositioning
 * ==========================================================================*/

(function (global) {
  'use strict';

  var TRAINING_TAG = 'TRAINING-EXERCISE';

  // Check-in vocabulary. Short, fixed set keeps LoRa payloads tiny.
  var CHECKIN = {
    OK:              'OK',
    MOVING:          'MOVING',
    ON_STATION:      'ON STATION',
    RETURNING:       'RETURNING',
    NEED_ASSISTANCE: 'NEED ASSISTANCE' // training-only; see honesty contract
  };

  var MSG = {
    CHECKIN:  'checkin',
    TASKING:  'tasking',
    ACK:      'ack',
    POSITION: 'position'
  };

  // ------------------------------------------------------------------------
  // Local node context (feature-detected from existing modules)
  // ------------------------------------------------------------------------
  function nodeId() {
    var n = global.NODE_IDENTITY;
    return (n && typeof n.getId === 'function') ? n.getId() : 'local';
  }
  function nodeRole() {
    var m = global.CAPMission;
    if (m && typeof m.getMission === 'function') {
      var mis = m.getMission();
      if (mis && mis.teamRole) return mis.teamRole;
    }
    return 'Team Member';
  }
  function callsign() {
    var m = global.CAPMission;
    if (m && typeof m.getMission === 'function') {
      var mis = m.getMission();
      if (mis && mis.callsignLabel) return mis.callsignLabel;
    }
    return nodeId();
  }
  function missionId() {
    var m = global.CAPMission;
    if (m && typeof m.getMission === 'function') {
      var mis = m.getMission();
      if (mis && mis.missionId) return mis.missionId;
    }
    return 'NO-MISSION';
  }
  function audit(action, details) {
    if (global.CAPAudit && typeof global.CAPAudit.log === 'function') {
      global.CAPAudit.log({ action: action, module: 'coordination', details: details || {} });
    }
  }

  // ------------------------------------------------------------------------
  // Team status table: nodeId -> live coordination state
  // ------------------------------------------------------------------------
  var team = {}; // { nodeId: { role, callsign, lastCheckin, checkinType, position, lastSeen, online } }

  function touch(id, fields) {
    if (!team[id]) {
      team[id] = { nodeId: id, role: null, callsign: id, lastCheckin: null,
                   checkinType: null, position: null, lastSeen: 0, online: false };
    }
    for (var k in fields) { if (fields.hasOwnProperty(k)) team[id][k] = fields[k]; }
    team[id].lastSeen = Date.now();
    team[id].online = true;
    return team[id];
  }

  // ------------------------------------------------------------------------
  // Outbound: build a tagged envelope and send over the best available route
  // ------------------------------------------------------------------------
  function send(envelope) {
    envelope.tag = TRAINING_TAG;
    envelope.mission = missionId();
    envelope.from = nodeId();
    envelope.role = nodeRole();
    envelope.callsign = callsign();
    envelope.ts = new Date().toISOString();

    var route = 'none';
    var router = global.CommsRouter;
    if (router && typeof router.send === 'function') {
      // Let the existing router pick the best path (mesh, MQTT bridge, etc.).
      if (typeof router.bestAdapter === 'function') {
        try { route = router.bestAdapter() || 'router'; } catch (e) { route = 'router'; }
      } else { route = 'router'; }
      envelope.route = route;
      router.send(envelope);
    } else if (global.MQTT && typeof global.MQTT.sendText === 'function') {
      route = 'mqtt';
      envelope.route = route;
      global.MQTT.sendText(JSON.stringify(envelope));
    } else {
      // No route available. Stay silent rather than fake a transmission.
      envelope.route = 'unsent';
      return { sent: false, route: 'none', envelope: envelope };
    }
    return { sent: true, route: route, envelope: envelope };
  }

  // ------------------------------------------------------------------------
  // Inbound: route incoming envelopes into the team table
  // ------------------------------------------------------------------------
  function receive(envelope) {
    if (!envelope || typeof envelope !== 'object') return;
    // Only handle our own training-tagged coordination messages.
    if (envelope.tag !== TRAINING_TAG) return;
    var id = envelope.from;
    if (!id) return;

    switch (envelope.type) {
      case MSG.CHECKIN:
        touch(id, { role: envelope.role, callsign: envelope.callsign,
                    lastCheckin: envelope.ts, checkinType: envelope.checkin });
        audit('checkin_received', { from: id, type: envelope.checkin });
        emit('checkin', envelope);
        break;

      case MSG.POSITION:
        // Sender already opted in to share (enforced on their side).
        touch(id, { role: envelope.role, callsign: envelope.callsign,
                    position: { lat: envelope.lat, lon: envelope.lon,
                                accuracy: envelope.accuracy, method: envelope.method,
                                isEstimate: envelope.isEstimate } });
        audit('position_received', { from: id, method: envelope.method }); // no coords
        emit('position', envelope);
        break;

      case MSG.TASKING:
        audit('tasking_received', { from: id, to: envelope.to });
        emit('tasking', envelope);
        break;

      case MSG.ACK:
        audit('ack_received', { from: id, ref: envelope.ref });
        emit('ack', envelope);
        break;
    }
  }

  // Simple event emitter for UI / mission board.
  var listeners = {};
  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function () {
      var a = listeners[evt]; if (!a) return;
      var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
    };
  }
  function emit(evt, data) {
    (listeners[evt] || []).forEach(function (fn) { try { fn(data); } catch (e) {} });
  }

  // ------------------------------------------------------------------------
  // Mark stale nodes offline (no traffic within a window)
  // ------------------------------------------------------------------------
  var OFFLINE_AFTER_MS = 120000; // 2 min of silence -> offline
  function reapStale() {
    var now = Date.now();
    for (var id in team) {
      if (team.hasOwnProperty(id) && team[id].online &&
          now - team[id].lastSeen > OFFLINE_AFTER_MS) {
        team[id].online = false;
        emit('node_offline', team[id]);
      }
    }
  }

  // ------------------------------------------------------------------------
  // Wire to inbound mesh + start housekeeping
  // ------------------------------------------------------------------------
  var reapTimer = null;
  function bindInbound() {
    var ms = global.MESH_STATE;
    if (ms && typeof ms.onMessage === 'function') {
      ms.onMessage(function (raw) {
        var env = raw;
        if (typeof raw === 'string') { try { env = JSON.parse(raw); } catch (e) { return; } }
        receive(env);
      });
    }
  }

  // ------------------------------------------------------------------------
  // Public API: window.CAPCoordination
  // ------------------------------------------------------------------------
  var CAPCoordination = {
    CHECKIN: CHECKIN,

    start: function () {
      bindInbound();
      if (!reapTimer) reapTimer = setInterval(reapStale, 30000);
      audit('coordination_start', {});
      return CAPCoordination;
    },
    stop: function () {
      if (reapTimer) { clearInterval(reapTimer); reapTimer = null; }
      audit('coordination_stop', {});
    },

    // --- Check-ins -------------------------------------------------------
    checkin: function (type) {
      if (!type) type = CHECKIN.OK;
      var isAssist = (type === CHECKIN.NEED_ASSISTANCE);
      var res = send({
        type: MSG.CHECKIN,
        checkin: type,
        trainingOnly: true,
        // Make absolutely sure an assistance call cannot read as a real distress msg.
        note: isAssist ? 'TRAINING EXERCISE ONLY - NOT A REAL EMERGENCY' : undefined
      });
      audit('checkin_sent', { type: type });
      // Reflect our own check-in locally too.
      touch(nodeId(), { role: nodeRole(), callsign: callsign(),
                        lastCheckin: res.envelope.ts, checkinType: type });
      emit('checkin', res.envelope); // so the board + room bridge see our own check-in
      return res;
    },

    // --- Tasking (Base -> team or 1:1) -----------------------------------
    // to = nodeId for 1:1, or null/'ALL' for team-visible.
    shareTasking: function (text, to) {
      var ref = 'TSK-' + Date.now().toString(36);
      var res = send({
        type: MSG.TASKING,
        to: to || 'ALL',
        text: String(text).slice(0, 200), // keep LoRa payload small
        ref: ref
      });
      audit('tasking_sent', { to: to || 'ALL', ref: ref });
      emit('tasking', res.envelope);
      return { ref: ref, result: res };
    },

    // --- Acknowledge a tasking note --------------------------------------
    acknowledge: function (ref) {
      var res = send({ type: MSG.ACK, ref: ref });
      audit('ack_sent', { ref: ref });
      emit('ack', res.envelope);
      return res;
    },

    // --- Position sharing (called by cap-positioning.js shareNow) ---------
    // cap-positioning enforces opt-in; this just puts it on the wire + table.
    sharePosition: function (payload) {
      var res = send({
        type: MSG.POSITION,
        lat: payload.lat, lon: payload.lon,
        accuracy: payload.accuracy, method: payload.method,
        isEstimate: payload.isEstimate
      });
      // Update our own row so the board shows us too.
      touch(nodeId(), { role: nodeRole(), callsign: callsign(),
                        position: { lat: payload.lat, lon: payload.lon,
                                    accuracy: payload.accuracy, method: payload.method,
                                    isEstimate: payload.isEstimate } });
      audit('position_sent', { method: payload.method }); // no coords
      emit('position', res.envelope);
      return res;
    },

    // --- Status / queries ------------------------------------------------
    getTeamStatus: function () {
      return Object.keys(team).map(function (id) {
        var t = team[id];
        return {
          nodeId: t.nodeId, role: t.role, callsign: t.callsign,
          lastCheckin: t.lastCheckin, checkinType: t.checkinType,
          position: t.position, online: t.online,
          lastSeenMs: Date.now() - t.lastSeen
        };
      });
    },
    getNode: function (id) { return team[id] || null; },

    // --- Events for UI / mission board -----------------------------------
    on: on,

    // --- Test / external inject hook -------------------------------------
    _receive: receive
  };

  global.CAPCoordination = CAPCoordination;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CAPCoordination: CAPCoordination, CHECKIN: CHECKIN, MSG: MSG };
  }

})(typeof window !== 'undefined' ? window : globalThis);
