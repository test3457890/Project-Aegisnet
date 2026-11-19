/* ============================================================================
 * cap-room-bridge.js
 * AegisNet / SkyMesh — CAP Field Coordination Module
 * Bridge: CAP mission  <->  AegisNet "mission room"
 *
 * Connects a CAP mission profile to the AegisNet mission room so that CAP
 * coordination (check-ins, tasking, positions) appears in the room, and room
 * membership/presence flows back into CAP team status.
 *
 * TRANSPORT (feature-detected, best first):
 *   1. window.AegisRoom  — native AegisNet mission-room API (preferred)
 *   2. window.MQTT       — fall back to the mission's mesh channel
 *   3. window.CommsRouter — last resort, tagged room traffic
 *
 *   NOTE: the exact AegisRoom method names below are the EXPECTED interface and
 *   should be confirmed against AegisNet's real mission-room API. The bridge is
 *   defensive: if AegisRoom is absent it uses the MQTT channel instead.
 *
 * HONESTY: the mission room is an AegisNet COORDINATION room (mesh / internet),
 * NOT a CAP, military, or public-safety radio net. Everything is tagged
 * TRAINING-EXERCISE. Position into the room stays OPT-IN (enforced upstream).
 *
 * Sovereignty: first-party vanilla JS, zero foreign deps.
 *
 * Exposes window.CAPRoomBridge. Feature-detects AegisRoom, MQTT, CommsRouter,
 * CAPCoordination, CAPPositioning, CAPAudit, NODE_IDENTITY.
 * ==========================================================================*/

(function (global) {
  'use strict';

  var TRAINING_TAG = 'TRAINING-EXERCISE';

  function audit(action, details) {
    if (global.CAPAudit && typeof global.CAPAudit.log === 'function') {
      global.CAPAudit.log({ action: action, module: 'room-bridge', details: details || {} });
    }
  }
  function nodeId() {
    var n = global.NODE_IDENTITY;
    return (n && typeof n.getId === 'function') ? n.getId() : 'local';
  }

  var state = {
    roomId: null,
    transport: null,   // 'aegis-room' | 'mqtt' | 'comms-router' | null
    unsubscribers: []
  };

  // Room id derived from the mission. Channel scopes it on the mesh side.
  function roomIdFor(mission) {
    return 'cap-room:' + (mission.missionId || 'NO-MISSION');
  }

  // ------------------------------------------------------------------------
  // Transport selection
  // ------------------------------------------------------------------------
  function pickTransport() {
    if (global.AegisRoom && typeof global.AegisRoom.join === 'function') return 'aegis-room';
    if (global.MQTT && typeof global.MQTT.setChannel === 'function') return 'mqtt';
    if (global.CommsRouter && typeof global.CommsRouter.send === 'function') return 'comms-router';
    return null;
  }

  function roomSend(message) {
    var env = { tag: TRAINING_TAG, room: state.roomId, from: nodeId(), payload: message };
    switch (state.transport) {
      case 'aegis-room':
        if (typeof global.AegisRoom.send === 'function') global.AegisRoom.send(state.roomId, env);
        return true;
      case 'mqtt':
        if (typeof global.MQTT.sendText === 'function') { global.MQTT.sendText(JSON.stringify(env)); return true; }
        return false;
      case 'comms-router':
        global.CommsRouter.send(env); return true;
      default:
        return false;
    }
  }

  // ------------------------------------------------------------------------
  // Forward CAP coordination events into the room
  // ------------------------------------------------------------------------
  function wireCoordination() {
    var coord = global.CAPCoordination;
    if (!coord || typeof coord.on !== 'function') return;
    ['checkin', 'position', 'tasking', 'ack'].forEach(function (evt) {
      var off = coord.on(evt, function (data) {
        if (!state.roomId) return;
        roomSend({ kind: evt, data: data });
      });
      if (typeof off === 'function') state.unsubscribers.push(off);
    });
  }

  function unwire() {
    state.unsubscribers.forEach(function (off) { try { off(); } catch (e) {} });
    state.unsubscribers = [];
  }

  // ------------------------------------------------------------------------
  // Public API: window.CAPRoomBridge
  // ------------------------------------------------------------------------
  var CAPRoomBridge = {
    // Join (or create) the AegisNet mission room for this mission.
    join: function (mission) {
      mission = mission || {};
      state.transport = pickTransport();
      if (!state.transport) {
        audit('room_join_failed', { reason: 'no transport available' });
        return { bridged: false, reason: 'No AegisRoom, MQTT, or CommsRouter available.' };
      }
      state.roomId = roomIdFor(mission);

      if (state.transport === 'aegis-room') {
        global.AegisRoom.join(state.roomId, {
          callsign: mission.callsignLabel, role: mission.teamRole,
          tag: TRAINING_TAG, training: true
        });
        if (typeof global.AegisRoom.setPresence === 'function') {
          global.AegisRoom.setPresence(state.roomId, 'on-station');
        }
      } else if (state.transport === 'mqtt') {
        // Scope the mesh channel to the mission so the room maps to a channel.
        global.MQTT.setChannel(mission.meshChannel || state.roomId);
      }
      // comms-router needs no join; traffic is tagged with the room id.

      wireCoordination();
      audit('room_joined', { roomId: state.roomId, transport: state.transport });
      return { bridged: true, roomId: state.roomId, transport: state.transport };
    },

    leave: function () {
      unwire();
      if (state.transport === 'aegis-room' && global.AegisRoom &&
          typeof global.AegisRoom.leave === 'function' && state.roomId) {
        global.AegisRoom.leave(state.roomId);
      }
      var was = state.roomId;
      state.roomId = null; state.transport = null;
      audit('room_left', { roomId: was });
      return { bridged: false, left: was };
    },

    // Members of the room (from AegisRoom if available, else CAP team status).
    members: function () {
      if (state.transport === 'aegis-room' && global.AegisRoom &&
          typeof global.AegisRoom.members === 'function' && state.roomId) {
        return global.AegisRoom.members(state.roomId) || [];
      }
      if (global.CAPCoordination && typeof global.CAPCoordination.getTeamStatus === 'function') {
        return global.CAPCoordination.getTeamStatus().map(function (t) {
          return { id: t.nodeId, callsign: t.callsign, presence: t.online ? 'online' : 'offline' };
        });
      }
      return [];
    },

    // Manually push a message into the room (e.g., from a mission board).
    say: function (message) {
      if (!state.roomId) return { sent: false, reason: 'not bridged' };
      return { sent: roomSend({ kind: 'message', data: message }) };
    },

    status: function () {
      return {
        bridged: !!state.roomId,
        roomId: state.roomId,
        transport: state.transport,
        note: 'AegisNet coordination room (mesh/internet). Not a CAP/military radio net. Training only.'
      };
    },

    _reset: function () { unwire(); state.roomId = null; state.transport = null; }
  };

  global.CAPRoomBridge = CAPRoomBridge;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CAPRoomBridge: CAPRoomBridge };
  }

})(typeof window !== 'undefined' ? window : globalThis);
