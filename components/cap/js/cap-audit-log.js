/* ============================================================================
 * cap-audit-log.js
 * AegisNet / SkyMesh — CAP Field Coordination Module
 * Build 5: audit log for after-action review and accountability
 *
 * This is the concrete sink that every other CAP module already writes to via
 * CAPAudit.log(). It enriches each entry, REDACTS sensitive data, chains entries
 * with a hash so tampering is detectable, and exports JSON / CSV / after-action.
 *
 * NEVER stored (defense in depth, even if a caller passes them by mistake):
 *   - API keys, org-key secrets, passwords, tokens, credentials
 *   - GPS coordinates of anyone who did not opt in (lat/lon stripped by default)
 *
 * Honesty: a full, tamper-evident audit trail is what lets an organization
 * trust the system. It is the FOUNDATION a future accreditation builds on, not
 * a certification by itself.
 *
 * Sovereignty: first-party vanilla JS, zero foreign deps. Hashing uses the
 * platform provider (Node crypto / Web Crypto); never hand-rolled.
 *
 * Exposes window.CAPAudit. Feature-detects NODE_IDENTITY, CAPAccess, CAPMission.
 * ==========================================================================*/

(function (global) {
  'use strict';

  var nodeCrypto = (function () { try { return require('crypto'); } catch (e) { return null; } })();

  var CONFIG = {
    maxEntries: 5000,        // ring buffer cap; oldest dropped past this
    redactPositions: true    // strip lat/lon unless entry.consentedPosition === true
  };

  // Keys whose VALUES must never be stored.
  var SECRET_KEY = /(secret|password|passwd|pwd|api[_-]?key|token|credential|private[_-]?key|orgkey)/i;
  // Keys that are coordinates (stripped unless consented).
  var POSITION_KEY = /^(lat|lon|lng|latitude|longitude|coord|coordinates|gps)$/i;

  var log = [];     // entries
  var seq = 0;      // monotonic sequence
  var lastHash = 'GENESIS';

  // ------------------------------------------------------------------------
  // Context enrichment (feature-detected; never required from callers)
  // ------------------------------------------------------------------------
  function ctxNodeId() {
    var n = global.NODE_IDENTITY;
    return (n && typeof n.getId === 'function') ? n.getId() : 'local';
  }
  function ctxRole() {
    var a = global.CAPAccess;
    return (a && typeof a.getRole === 'function') ? a.getRole() : null;
  }
  function ctxMission() {
    var m = global.CAPMission;
    if (m && typeof m.getMission === 'function') {
      var mis = m.getMission();
      if (mis && mis.missionId) return mis.missionId;
    }
    return null;
  }

  // ------------------------------------------------------------------------
  // Redaction (recursive; defense in depth)
  // ------------------------------------------------------------------------
  function redact(value, consented) {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map(function (v) { return redact(v, consented); });
    if (typeof value === 'object') {
      var out = {};
      for (var k in value) {
        if (!value.hasOwnProperty(k)) continue;
        if (SECRET_KEY.test(k)) { out[k] = '[REDACTED-SECRET]'; continue; }
        if (CONFIG.redactPositions && POSITION_KEY.test(k) && !consented) {
          out[k] = '[REDACTED-POSITION]'; continue;
        }
        out[k] = redact(value[k], consented);
      }
      return out;
    }
    return value;
  }

  // ------------------------------------------------------------------------
  // Hashing for the tamper-evident chain
  // ------------------------------------------------------------------------
  function sha256(str) {
    if (nodeCrypto) return nodeCrypto.createHash('sha256').update(str).digest('hex');
    return null; // browser: Web Crypto is async; chain marked unsupported if absent
  }
  function canonical(e) {
    return JSON.stringify({ seq: e.seq, ts: e.ts, nodeId: e.nodeId, role: e.role,
                            missionId: e.missionId, module: e.module,
                            action: e.action, details: e.details });
  }

  // ------------------------------------------------------------------------
  // Public API: window.CAPAudit
  // ------------------------------------------------------------------------
  var CAPAudit = {
    config: CONFIG,

    // Accepts { action, module?, details?, consentedPosition? }. Auto-enriches.
    log: function (entry) {
      entry = entry || {};
      var consented = entry.consentedPosition === true;
      var e = {
        seq: ++seq,
        ts: new Date().toISOString(),
        nodeId: ctxNodeId(),
        role: ctxRole(),
        missionId: ctxMission(),
        module: entry.module || 'unknown',
        action: entry.action || 'unspecified',
        details: redact(entry.details || {}, consented)
      };
      var prev = lastHash;
      var h = sha256(prev + canonical(e));
      e.prevHash = prev;
      e.hash = h; // null if no crypto provider
      lastHash = h || prev;

      log.push(e);
      if (log.length > CONFIG.maxEntries) {
        log.shift();
        // Note the truncation once, without recursing into log().
        if (!CAPAudit._truncatedNoted) {
          CAPAudit._truncatedNoted = true;
        }
      }
      return e.seq;
    },

    // --- Queries ---------------------------------------------------------
    getEntries: function (filter) {
      filter = filter || {};
      return log.filter(function (e) {
        if (filter.module && e.module !== filter.module) return false;
        if (filter.action && e.action !== filter.action) return false;
        if (filter.since && new Date(e.ts).getTime() < new Date(filter.since).getTime()) return false;
        if (filter.until && new Date(e.ts).getTime() > new Date(filter.until).getTime()) return false;
        return true;
      }).slice(filter.limit ? -filter.limit : 0);
    },

    count: function () { return log.length; },

    summary: function () {
      var byAction = {}, byModule = {};
      log.forEach(function (e) {
        byAction[e.action] = (byAction[e.action] || 0) + 1;
        byModule[e.module] = (byModule[e.module] || 0) + 1;
      });
      return { total: log.length, byAction: byAction, byModule: byModule };
    },

    // --- Integrity -------------------------------------------------------
    verifyChain: function () {
      if (!nodeCrypto) return { supported: false, reason: 'no platform hash provider' };
      var prev = 'GENESIS';
      for (var i = 0; i < log.length; i++) {
        var e = log[i];
        var expect = sha256(prev + canonical(e));
        if (e.hash !== expect) {
          return { supported: true, ok: false, brokenAtSeq: e.seq, index: i };
        }
        prev = e.hash;
      }
      return { supported: true, ok: true, entries: log.length };
    },

    // --- Exports (the export itself is audited) --------------------------
    exportJSON: function () {
      CAPAudit.log({ action: 'audit_exported', module: 'audit', details: { format: 'json' } });
      return JSON.stringify(log, null, 2);
    },

    exportCSV: function () {
      CAPAudit.log({ action: 'audit_exported', module: 'audit', details: { format: 'csv' } });
      var cols = ['seq', 'ts', 'nodeId', 'role', 'missionId', 'module', 'action', 'details'];
      var rows = [cols.join(',')];
      log.forEach(function (e) {
        rows.push(cols.map(function (c) {
          var v = c === 'details' ? JSON.stringify(e.details) : e[c];
          return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
        }).join(','));
      });
      return rows.join('\n');
    },

    exportReport: function () {
      var sum = CAPAudit.summary();
      var integ = CAPAudit.verifyChain();
      var lines = [];
      lines.push('AFTER-ACTION AUDIT REPORT');
      lines.push('AegisNet / SkyMesh CAP Module — Training Prototype');
      lines.push('Generated: ' + new Date().toISOString());
      lines.push('Mission: ' + (ctxMission() || 'n/a'));
      lines.push('Entries: ' + sum.total +
                 '  |  Integrity: ' + (integ.supported ? (integ.ok ? 'VERIFIED' : 'BROKEN at seq ' + integ.brokenAtSeq) : 'unsupported'));
      lines.push('');
      lines.push('ACTION SUMMARY:');
      Object.keys(sum.byAction).sort().forEach(function (a) {
        lines.push('  ' + a + ': ' + sum.byAction[a]);
      });
      lines.push('');
      lines.push('CHRONOLOGICAL LOG:');
      log.forEach(function (e) {
        lines.push('  #' + e.seq + ' ' + e.ts + ' [' + e.module + '] ' +
                   (e.role ? e.role + ' ' : '') + e.action +
                   ' ' + JSON.stringify(e.details));
      });
      lines.push('');
      lines.push('NOTE: Positions of non-consenting nodes and all secrets are redacted.');
      lines.push('This trail is for after-action review. It is not a security certification.');
      return lines.join('\n');
    },

    // --- Persistence hooks (deployment provides storage) -----------------
    snapshot: function () {
      return JSON.stringify({ seq: seq, lastHash: lastHash, log: log });
    },
    restore: function (json) {
      try {
        var s = JSON.parse(json);
        log = s.log || []; seq = s.seq || log.length;
        lastHash = s.lastHash || (log.length ? log[log.length - 1].hash : 'GENESIS');
        return true;
      } catch (e) { return false; }
    },

    _reset: function () { log = []; seq = 0; lastHash = 'GENESIS'; CAPAudit._truncatedNoted = false; }
  };

  global.CAPAudit = CAPAudit;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CAPAudit: CAPAudit };
  }

})(typeof window !== 'undefined' ? window : globalThis);
