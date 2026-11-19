/* ============================================================================
 * cap-mission-profile.js
 * AegisNet / SkyMesh — CAP Field Coordination Module
 * Build 1: CAP mission profile (field-exercise configuration preset)
 *
 * Activating a profile configures a node for a CAP field exercise: sets the
 * team role label, enables mesh coordination, enables RECEIVE-ONLY ADS-B
 * awareness, defaults to low-bandwidth, stamps a mission label on all logged
 * events, and joins the AegisNet mission room via the bridge.
 *
 * HARD ACTIVATION GATE (non-negotiable):
 *   The profile CANNOT activate until the operator has both:
 *     - set disclaimerAccepted: true, AND
 *     - set confirmTrainingPrototype: true
 *   acknowledging this is a TRAINING PROTOTYPE, not CAP communications.
 *
 * If access control is present, activation also requires Tier >= 1
 * (mesh_coordination feature). Tier 0 / demo cannot run a live mission.
 *
 * Sovereignty: first-party vanilla JS, zero foreign deps.
 *
 * Exposes window.CAPMission. Feature-detects CAPRoomBridge, CAPCoordination,
 * CAPAccess, SafetySettings, NetworkSettings, CAPAudit.
 * ==========================================================================*/

(function (global) {
  'use strict';

  var ROLES = ['Ground Team', 'Base', 'Mobile', 'UDF', 'Observer'];

  var DISCLAIMER =
    'TRAINING PROTOTYPE — NOT CAP-APPROVED COMMUNICATIONS. ' +
    'Situational awareness only. Does not connect to CAP, military, federal, ' +
    'police, fire, or EMS radio networks. Receive-only ADS-B/AIS.';

  var active = null; // the active mission object, or null

  function audit(action, details) {
    if (global.CAPAudit && typeof global.CAPAudit.log === 'function') {
      global.CAPAudit.log({ action: action, module: 'mission-profile', details: details || {} });
    }
  }

  function validate(cfg) {
    var errs = [];
    if (!cfg.missionId) errs.push('missionId is required.');
    if (cfg.teamRole && ROLES.indexOf(cfg.teamRole) < 0) {
      errs.push('teamRole must be one of: ' + ROLES.join(', ') + '.');
    }
    // The hard gate.
    if (cfg.disclaimerAccepted !== true) errs.push('disclaimerAccepted must be true.');
    if (cfg.confirmTrainingPrototype !== true) {
      errs.push('confirmTrainingPrototype must be true (acknowledge this is a training prototype, not CAP comms).');
    }
    return errs;
  }

  var CAPMission = {
    ROLES: ROLES.slice(),
    DISCLAIMER: DISCLAIMER,

    // Activate a field-exercise profile.
    activateProfile: function (cfg) {
      cfg = cfg || {};

      var errs = validate(cfg);
      if (errs.length) {
        audit('mission_activation_blocked', { reasons: errs });
        return { activated: false, errors: errs, disclaimer: DISCLAIMER };
      }

      // Tier gate: demo / Tier 0 cannot run a live mission.
      var access = global.CAPAccess;
      if (access && typeof access.featureEnabled === 'function' &&
          !access.featureEnabled('mesh_coordination')) {
        var reason = 'Demo mode (Tier 0): load a valid org key and set a deployment mode to run a mission.';
        audit('mission_activation_blocked', { reasons: [reason] });
        return { activated: false, errors: [reason], disclaimer: DISCLAIMER };
      }

      active = {
        missionId: cfg.missionId,
        missionName: cfg.missionName || cfg.missionId,
        teamRole: cfg.teamRole || 'Team Member',
        callsignLabel: cfg.callsignLabel || null,         // training callsign only
        meshChannel: cfg.meshChannel || ('cap-' + cfg.missionId),
        adsbAwareness: cfg.adsbAwareness === true,         // receive-only
        missionStartTime: cfg.missionStartTime || new Date().toISOString(),
        lowBandwidth: true,
        active: true
      };

      // Show the disclaimer prominently.
      if (global.SafetySettings && typeof global.SafetySettings.showSafetyWarning === 'function') {
        try { global.SafetySettings.showSafetyWarning(DISCLAIMER); } catch (e) {}
      }
      // Default to low-bandwidth (LoRa).
      if (global.NetworkSettings && typeof global.NetworkSettings.setLowBandwidth === 'function') {
        try { global.NetworkSettings.setLowBandwidth(true); } catch (e) {}
      }
      // Start coordination.
      if (global.CAPCoordination && typeof global.CAPCoordination.start === 'function') {
        try { global.CAPCoordination.start(); } catch (e) {}
      }

      // Join the AegisNet mission room via the bridge.
      var room = null;
      if (global.CAPRoomBridge && typeof global.CAPRoomBridge.join === 'function') {
        room = global.CAPRoomBridge.join(active);
      }

      audit('mission_activated', {
        missionId: active.missionId, teamRole: active.teamRole,
        adsbAwareness: active.adsbAwareness, room: room && room.roomId
      });

      return { activated: true, mission: CAPMission.getMission(), room: room, disclaimer: DISCLAIMER };
    },

    getMission: function () { return active ? JSON.parse(JSON.stringify(active)) : null; },
    isActive: function () { return !!active; },

    endMission: function () {
      if (!active) return { ended: false, reason: 'no active mission' };
      var id = active.missionId;
      if (global.CAPRoomBridge && typeof global.CAPRoomBridge.leave === 'function') {
        try { global.CAPRoomBridge.leave(); } catch (e) {}
      }
      active = null;
      audit('mission_ended', { missionId: id });
      return { ended: true, missionId: id };
    },

    _reset: function () { active = null; }
  };

  global.CAPMission = CAPMission;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CAPMission: CAPMission };
  }

})(typeof window !== 'undefined' ? window : globalThis);
