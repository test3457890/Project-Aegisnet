/* ============================================================================
 * cap-access-control.js
 * AegisNet / SkyMesh — CAP Field Coordination Module
 * Build 4: authorized-organization access framework
 *
 * HONESTY (read first):
 *   These are DEPLOYMENT POLICY TIERS, not security clearance levels. Access
 *   control restricts WHO can deploy and WHAT features run. It is NOT a security
 *   certification and does not provide FIPS/FedRAMP/ATO guarantees.
 *
 *   Client-side key validation is POLICY GATING. A determined client can bypass
 *   purely client-side checks. Real enforcement happens server-side (self-hosted
 *   broker at Tier 2+, air-gapped isolation at Tier 3). Tiers 2 and 3 therefore
 *   REQUIRE a cryptographically verified key; an unsigned/unverified key is
 *   capped at Tier 1 no matter what it claims.
 *
 *   Crypto is delegated to the platform provider (Node crypto / Web Crypto).
 *   This module NEVER hand-rolls cryptography.
 *
 *   Sovereignty: first-party vanilla JS, zero foreign deps. Tier 3 can require
 *   US-origin hardware via the allow-list (a procurement control, since software
 *   cannot verify silicon origin on its own).
 *
 * Exposes window.CAPAccess. Feature-detects window.CAPAudit.
 * ==========================================================================*/

(function (global) {
  'use strict';

  var nodeCrypto = (function () { try { return require('crypto'); } catch (e) { return null; } })();

  // ------------------------------------------------------------------------
  // Roles and permissions (RBAC)
  // ------------------------------------------------------------------------
  var ROLE_PERMS = {
    admin:       ['manage_nodes', 'issue_profile', 'export_audit', 'create_mission',
                  'send_tasking', 'view_all', 'checkin', 'share_position', 'view_board'],
    coordinator: ['create_mission', 'send_tasking', 'view_all', 'checkin', 'share_position', 'view_board'],
    team_member: ['checkin', 'share_position', 'receive_tasking', 'view_board'],
    observer:    ['view_board']
  };

  // Feature -> minimum tier required to run it.
  var FEATURE_MIN_TIER = {
    mesh_coordination: 1,
    mission_board:     1,
    tasking:           1,
    position_sharing:  1,
    audit_export:      1,
    cactus_export:     1,
    cot_tak:           1
  };

  var DEPLOY_MODES = ['demo', 'standard', 'self-hosted', 'air-gapped'];

  // Mode -> maximum tier the mode can support (Tier 3 also needs hardware list).
  function modeMaxTier(mode, hwOk) {
    switch (mode) {
      case 'demo':        return 0;
      case 'standard':    return 1;
      case 'self-hosted': return 2;
      case 'air-gapped':  return hwOk ? 3 : 2;
      default:            return 0;
    }
  }

  // ------------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------------
  var state = {
    secret: null,              // operator verification secret (server-side in real use)
    requireUsOrigin: true,     // Tier 3 hardware-origin policy (US-only by default)
    key: null,                 // last validated key result
    role: 'observer',          // default least-privilege
    mode: 'demo',              // default least-privilege
    nodes: {},                 // nodeId -> { registered: bool, ts }
    hardware: {}               // nodeId -> { origin, model, ts }
  };

  function audit(action, details) {
    if (global.CAPAudit && typeof global.CAPAudit.log === 'function') {
      global.CAPAudit.log({ action: action, module: 'access', details: details || {} });
    }
  }

  // ------------------------------------------------------------------------
  // Crypto helpers (HMAC-SHA256 via platform provider; never hand-rolled)
  // ------------------------------------------------------------------------
  function b64urlEncode(str) {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf8').toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    if (typeof Buffer !== 'undefined') return Buffer.from(s, 'base64').toString('utf8');
    return decodeURIComponent(escape(atob(s)));
  }
  function hmacHex(secret, data) {
    if (nodeCrypto) return nodeCrypto.createHmac('sha256', secret).update(data).digest('hex');
    return null; // browser path: inject a verifier or use server-side validation
  }
  function safeEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    if (nodeCrypto && nodeCrypto.timingSafeEqual) {
      try { return nodeCrypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch (e) { return false; }
    }
    var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return r === 0;
  }

  // ------------------------------------------------------------------------
  // Hardware allow-list status (Tier 3 gate)
  // ------------------------------------------------------------------------
  function hardwareOk() {
    var ids = Object.keys(state.hardware);
    if (ids.length === 0) return false; // Tier 3 needs an explicit allow-list
    if (!state.requireUsOrigin) return true;
    return ids.every(function (id) { return state.hardware[id].origin === 'US'; });
  }

  // ------------------------------------------------------------------------
  // Effective tier = min(key cap, mode cap)
  // ------------------------------------------------------------------------
  function keyTierCap() {
    if (!state.key || !state.key.valid) return 0;       // no/invalid key -> demo
    if (!state.key.verified) return Math.min(state.key.tier, 1); // unverified -> max Tier 1
    return state.key.tier;                               // verified -> as encoded
  }

  function effectiveTier() {
    return Math.min(keyTierCap(), modeMaxTier(state.mode, hardwareOk()));
  }

  // ------------------------------------------------------------------------
  // Public API: window.CAPAccess
  // ------------------------------------------------------------------------
  var CAPAccess = {
    ROLES: Object.keys(ROLE_PERMS),
    MODES: DEPLOY_MODES.slice(),

    // --- Operator: configure secret + mint keys -------------------------
    configureSecret: function (secret) { state.secret = secret || null; },
    setRequireUsOrigin: function (on) { state.requireUsOrigin = !!on; },

    // Mint an org key. Signed if a secret is supplied; unsigned keys cap at T1.
    issueOrgKey: function (payload, secret) {
      var body = b64urlEncode(JSON.stringify({
        org: payload.org, tier: payload.tier,
        exp: payload.exp, features: payload.features || []
      }));
      var sec = secret || state.secret;
      var sig = sec ? hmacHex(sec, body) : '';
      return body + '.' + (sig || '');
    },

    // --- Validate an org key --------------------------------------------
    validateOrgKey: function (key) {
      var result = { valid: false, verified: false, tier: 0, org: null,
                     exp: null, features: [], reason: '' };
      if (typeof key !== 'string' || key.indexOf('.') < 0) {
        result.reason = 'malformed key'; state.key = result; audit('orgkey_invalid', { reason: result.reason }); return result;
      }
      var parts = key.split('.');
      var body = parts[0], sig = parts[1] || '';
      var payload;
      try { payload = JSON.parse(b64urlDecode(body)); }
      catch (e) { result.reason = 'undecodable payload'; state.key = result; audit('orgkey_invalid', { reason: result.reason }); return result; }

      if (!payload.org || typeof payload.tier !== 'number' || !payload.exp) {
        result.reason = 'missing required fields'; state.key = result; audit('orgkey_invalid', { reason: result.reason }); return result;
      }
      if (new Date(payload.exp).getTime() < Date.now()) {
        result.reason = 'expired'; state.key = result; audit('orgkey_invalid', { reason: 'expired', org: payload.org }); return result;
      }

      result.valid = true;
      result.org = payload.org;
      result.tier = payload.tier;
      result.exp = payload.exp;
      result.features = payload.features || [];

      // Verify signature if we have a secret + crypto. Otherwise unverified.
      if (state.secret && sig) {
        var expect = hmacHex(state.secret, body);
        result.verified = !!expect && safeEqual(expect, sig);
        result.reason = result.verified ? 'verified' : 'signature mismatch (treated as unverified, capped to Tier 1)';
      } else {
        result.verified = false;
        result.reason = sig ? 'no operator secret configured to verify; capped to Tier 1'
                            : 'unsigned key; capped to Tier 1';
      }

      state.key = result;
      audit('orgkey_validated', { org: result.org, claimedTier: result.tier, verified: result.verified });
      return result;
    },

    clearOrgKey: function () { state.key = null; audit('orgkey_cleared', {}); },
    getOrg: function () { return state.key && state.key.valid ? state.key.org : null; },

    // --- Tier + deployment mode -----------------------------------------
    setDeploymentMode: function (mode) {
      if (DEPLOY_MODES.indexOf(mode) < 0) return false;
      state.mode = mode; audit('deploy_mode_set', { mode: mode }); return true;
    },
    getDeploymentMode: function () { return state.mode; },
    getTier: function () { return effectiveTier(); },

    // Why is the effective tier what it is? Full, honest breakdown.
    getAccessState: function () {
      var eff = effectiveTier();
      var violations = [];
      if (state.key && state.key.valid && !state.key.verified && state.key.tier > 1) {
        violations.push('Key claims Tier ' + state.key.tier + ' but is unverified; capped to Tier 1.');
      }
      if (keyTierCap() > modeMaxTier(state.mode, hardwareOk())) {
        violations.push('Deployment mode "' + state.mode + '" limits to Tier ' +
                        modeMaxTier(state.mode, hardwareOk()) + '.');
      }
      if (state.mode === 'air-gapped' && !hardwareOk()) {
        violations.push('Tier 3 requires a non-empty hardware allow-list' +
                        (state.requireUsOrigin ? ' with US-origin hardware only.' : '.'));
      }
      return {
        headline: 'DEPLOYMENT POLICY TIERS — NOT security clearance levels. ' +
                  'Access control is not a security certification.',
        org: CAPAccess.getOrg(),
        keyVerified: !!(state.key && state.key.verified),
        keyTierCap: keyTierCap(),
        deploymentMode: state.mode,
        modeMaxTier: modeMaxTier(state.mode, hardwareOk()),
        hardwareAllowListOk: hardwareOk(),
        requireUsOrigin: state.requireUsOrigin,
        effectiveTier: eff,
        violations: violations
      };
    },

    // --- Roles (RBAC) ----------------------------------------------------
    setRole: function (role) {
      if (!ROLE_PERMS[role]) return false;
      state.role = role; audit('role_set', { role: role }); return true;
    },
    getRole: function () { return state.role; },
    can: function (action) { return (ROLE_PERMS[state.role] || []).indexOf(action) >= 0; },

    // Combined gate: role permits the action AND tier enables the feature.
    authorize: function (action, feature) {
      var roleOk = CAPAccess.can(action);
      var tierOk = feature ? CAPAccess.featureEnabled(feature) : true;
      var ok = roleOk && tierOk;
      if (!ok) audit('action_denied', { action: action, feature: feature || null,
                                        role: state.role, tier: effectiveTier() });
      return ok;
    },

    // --- Feature gating by tier -----------------------------------------
    featureEnabled: function (feature) {
      var min = FEATURE_MIN_TIER[feature];
      if (min == null) return false;
      return effectiveTier() >= min;
    },

    // --- Node allow-list -------------------------------------------------
    registerNode: function (nodeId) {
      if (!CAPAccess.can('manage_nodes')) { audit('action_denied', { action: 'manage_nodes' }); return false; }
      state.nodes[nodeId] = { registered: true, ts: Date.now() };
      audit('node_registered', { nodeId: nodeId }); return true;
    },
    removeNode: function (nodeId) {
      if (!CAPAccess.can('manage_nodes')) return false;
      delete state.nodes[nodeId]; audit('node_removed', { nodeId: nodeId }); return true;
    },
    isRegistered: function (nodeId) { return !!(state.nodes[nodeId] && state.nodes[nodeId].registered); },
    nodeStatus: function (nodeId) { return CAPAccess.isRegistered(nodeId) ? 'verified' : 'unverified'; },
    // Unregistered nodes are visible but cannot receive tasking.
    canReceiveTasking: function (nodeId) { return CAPAccess.isRegistered(nodeId); },
    listNodes: function () {
      return Object.keys(state.nodes).map(function (id) {
        return { nodeId: id, status: CAPAccess.nodeStatus(id) };
      });
    },

    // --- Hardware allow-list (Tier 3, US-origin policy) ------------------
    registerHardware: function (nodeId, info) {
      if (!CAPAccess.can('manage_nodes')) return false;
      info = info || {};
      state.hardware[nodeId] = { origin: info.origin || 'unknown', model: info.model || null, ts: Date.now() };
      audit('hardware_registered', { nodeId: nodeId, origin: state.hardware[nodeId].origin });
      return true;
    },
    hardwareList: function () {
      return Object.keys(state.hardware).map(function (id) {
        return { nodeId: id, origin: state.hardware[id].origin, model: state.hardware[id].model };
      });
    },

    // --- Test/reset ------------------------------------------------------
    _reset: function () {
      state.secret = null; state.requireUsOrigin = true; state.key = null;
      state.role = 'observer'; state.mode = 'demo'; state.nodes = {}; state.hardware = {};
    }
  };

  global.CAPAccess = CAPAccess;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CAPAccess: CAPAccess };
  }

})(typeof window !== 'undefined' ? window : globalThis);
