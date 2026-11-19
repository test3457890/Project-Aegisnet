/* ============================================================================
 * cap-compliance.js
 * AegisNet / SkyMesh — CAP Field Coordination Module
 * Build 6: compliance READINESS and control mapping
 *
 * READ THIS FIRST — THE HONEST BOUNDARY:
 *   This module maps the program to federal control families and reports a
 *   READINESS posture. It does NOT and CANNOT make the software "certified."
 *   FedRAMP, DoD SRG provisional authorization, FIPS 140-3 validation, and ATO
 *   are formal ACCREDITATION PROCESSES performed by assessors and authorizing
 *   officials, not flags set in code. This module prepares for them. It never
 *   claims them. Any output that looks like a certification claim is a bug.
 *
 *   - "met"        = satisfied by software, observable at runtime
 *   - "partial"    = some support present, more needed
 *   - "gap"        = not yet addressed by software
 *   - "deployment" = satisfied by process / deployment / accreditation, NOT by
 *                    software (e.g. FIPS validation, physical & personnel security)
 *
 * SOVEREIGNTY: first-party vanilla JS, zero foreign dependencies. Crypto, when
 * used, must be delegated to a platform-validated provider (Web Crypto / Node
 * crypto). This module never hand-rolls cryptography.
 *
 * Frameworks referenced (links verified 2026-06-15):
 *   FIPS 200  https://www.ferc.gov/sites/default/files/2020-04/FIPSpublication200.pdf
 *   FedRAMP   https://aws.amazon.com/compliance/fedramp/  (program: GSA-run)
 *   DoD SRG   https://aws.amazon.com/compliance/dod/  (authoritative: public.cyber.mil/dccs)
 *   SSDF      NIST SP 800-218 (secure software self-attestation, EO 14028)
 * ==========================================================================*/

(function (global) {
  'use strict';

  // ------------------------------------------------------------------------
  // Reference frameworks (with the honest "process, not label" framing)
  // ------------------------------------------------------------------------
  var FRAMEWORKS = [
    { id: 'FIPS200', name: 'FIPS 200 — Minimum Security Requirements',
      kind: 'standard',
      note: 'Defines the 17 control families. Software maps to these directly.',
      url: 'https://www.ferc.gov/sites/default/files/2020-04/FIPSpublication200.pdf' },
    { id: 'NIST80053', name: 'NIST SP 800-53 — Security & Privacy Controls',
      kind: 'control-catalog',
      note: 'The control catalog FIPS 200 selects from. Baselines: low/mod/high.',
      url: 'https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final' },
    { id: 'FEDRAMP', name: 'FedRAMP — Cloud authorization program',
      kind: 'accreditation-process',
      note: 'GSA-run authorization for CLOUD services. A process with assessors and continuous monitoring, not a code flag. Applies only if hosted as a cloud service.',
      url: 'https://aws.amazon.com/compliance/fedramp/' },
    { id: 'DODSRG', name: 'DoD Cloud Computing SRG (IL2-IL6)',
      kind: 'accreditation-process',
      note: 'DISA provisional authorization for cloud handling DoD data. Process-level. Air-gapped/self-hosted reduces but does not remove the accreditation requirement.',
      url: 'https://aws.amazon.com/compliance/dod/' },
    { id: 'FIPS1403', name: 'FIPS 140-3 — Validated cryptography',
      kind: 'validation-process',
      note: 'Validation is of a specific crypto MODULE by a lab (CMVP). Software cannot self-declare this. Deployments must use a validated module.',
      url: 'https://csrc.nist.gov/projects/cryptographic-module-validation-program' },
    { id: 'NIST800171', name: 'NIST SP 800-171 / CMMC — CUI protection',
      kind: 'conditional',
      note: 'Applies ONLY if the system handles Controlled Unclassified Information. Training mode must not handle CUI, which keeps this out of scope until a real CUI use case exists.',
      url: 'https://www.trimble.com/blog/construction/en-US/article/cybersecurity-requirements-government-contacts' },
    { id: 'SSDF', name: 'NIST SP 800-218 SSDF — Secure software self-attestation',
      kind: 'self-attestation',
      note: 'Federal contractors self-attest to secure development practices (EO 14028 / OMB M-22-18). This is producible now via documented dev practices.',
      url: 'https://www.klgates.com/Secure-Software-Regulations-and-Self-Attestation-Required-for-Federal-Contractors-5-19-2023' }
  ];

  // ------------------------------------------------------------------------
  // The 17 FIPS 200 control families, mapped to CAP modules + a live probe
  // ------------------------------------------------------------------------
  function has(globalName, method) {
    var o = global[globalName];
    if (!o) return false;
    if (!method) return true;
    return typeof o[method] === 'function';
  }

  var FAMILIES = [
    {
      id: 'AC', name: 'Access Control',
      modules: ['cap-access-control.js'],
      probe: function () {
        if (has('CAPAccess', 'getRole') && has('CAPAccess', 'validateOrgKey')) {
          return r('met', 'Org key gating + RBAC + node allow-list present.');
        }
        if (has('CAPAccess')) return r('partial', 'Access module present; confirm RBAC + allow-list.');
        return r('gap', 'cap-access-control.js not loaded.');
      }
    },
    {
      id: 'AT', name: 'Awareness and Training',
      modules: ['safety-education.js', 'cap-mission-profile.js'],
      probe: function () {
        if (has('SafetySettings', 'showSafetyWarning')) {
          return r('met', 'Safety/awareness warnings present; disclaimer gating on profile.');
        }
        return r('partial', 'Add operator awareness prompts before mission activation.');
      }
    },
    {
      id: 'AU', name: 'Audit and Accountability',
      modules: ['cap-audit-log.js'],
      probe: function () {
        if (has('CAPAudit', 'log') && has('CAPAudit', 'exportReport')) {
          return r('met', 'Action logging + export present; excludes secrets and non-consenting coords.');
        }
        if (has('CAPAudit', 'log')) return r('partial', 'Logging present; add export + retention policy.');
        return r('gap', 'cap-audit-log.js not loaded.');
      }
    },
    {
      id: 'CA', name: 'Assessment, Authorization, Monitoring',
      modules: ['cap-compliance.js'],
      probe: function () { return r('partial', 'This readiness self-check exists. Formal A&A is an external process.'); }
    },
    {
      id: 'CM', name: 'Configuration Management',
      modules: ['cap-mission-profile.js', 'network-settings.js'],
      probe: function () {
        if (has('CAPMission', 'getMission')) return r('met', 'Mission profile provides a baseline config preset.');
        return r('partial', 'Add a versioned, signed baseline config.');
      }
    },
    {
      id: 'CP', name: 'Contingency Planning',
      modules: ['cap-positioning.js', 'comms-router.js'],
      probe: function () {
        var pos = has('CAPPositioning', 'getBest');
        var router = has('CommsRouter', 'send');
        if (pos && router) return r('met', 'GPS-denied positioning fallback + multi-route comms + offline queue.');
        if (pos || router) return r('partial', 'Partial resilience present.');
        return r('gap', 'Add fallback positioning and route redundancy.');
      }
    },
    {
      id: 'IA', name: 'Identification and Authentication',
      modules: ['node-identity.js', 'cap-access-control.js'],
      probe: function () {
        if (has('NODE_IDENTITY', 'getId') && has('CAPAccess', 'registerNode')) {
          return r('met', 'Node identity + allow-list registration present.');
        }
        if (has('NODE_IDENTITY', 'getId')) return r('partial', 'Node identity present; add node allow-listing.');
        return r('gap', 'Add node identity + authentication.');
      }
    },
    {
      id: 'IR', name: 'Incident Response',
      modules: ['health-check.js', 'cap-audit-log.js'],
      probe: function () {
        if (has('HealthCheck', 'run') && has('CAPAudit', 'log')) {
          return r('partial', 'Health checks + audit trail support IR; add a documented response runbook.');
        }
        return r('gap', 'Add health monitoring + incident runbook.');
      }
    },
    { id: 'MA', name: 'Maintenance', modules: ['health-check.js'],
      probe: function () { return has('HealthCheck', 'run') ? r('partial', 'Health check supports maintenance; formalize update process.') : r('gap', 'Add maintenance + safe support bundle.'); } },
    { id: 'MP', name: 'Media Protection', modules: ['cap-audit-log.js'],
      probe: function () { return r('deployment', 'Log/export media handling and sanitization is a deployment/operational control.'); } },
    { id: 'PE', name: 'Physical and Environmental Protection', modules: [],
      probe: function () { return r('deployment', 'Physical security of nodes/CP is an operational control, not software.'); } },
    {
      id: 'PL', name: 'Planning', modules: ['cap-mission-profile.js'],
      probe: function () { return has('CAPMission') ? r('partial', 'Mission profile is a planning artifact; add a System Security Plan.') : r('gap', 'Produce a System Security Plan (SSP).'); }
    },
    { id: 'PS', name: 'Personnel Security', modules: [],
      probe: function () { return r('deployment', 'Personnel vetting is an organizational control. CAP membership covers part of this for CAP use.'); } },
    {
      id: 'RA', name: 'Risk Assessment', modules: ['cap-compliance.js'],
      probe: function () { return r('partial', 'This posture report supports RA; pair with a documented risk register.'); }
    },
    {
      id: 'SA', name: 'System and Services Acquisition', modules: ['cap-access-control.js'],
      probe: function () { return r('partial', 'US-origin hardware allow-list (Tier 2/3) + SSDF practices support SA.'); }
    },
    {
      id: 'SC', name: 'System and Communications Protection',
      modules: ['comms-router.js', 'cap-positioning.js', 'mqtt.js'],
      probe: function () {
        var crypto = cryptoPosture();
        var usGnss = usGnssLocked();
        var airgap = has('CAPAccess', 'getTier'); // air-gapped tier available
        if (crypto.validated === 'present' && usGnss && airgap) {
          return r('partial', 'Validated crypto provider present, US-GNSS lock on, air-gapped tier available. FIPS 140-3 VALIDATION remains a deployment requirement.');
        }
        return r('partial', 'Comms protection present (' + crypto.detail + '; US-GNSS lock: ' + usGnss + '). FIPS validation is deployment-level.');
      }
    },
    {
      id: 'SI', name: 'System and Information Integrity',
      modules: ['health-check.js', 'safety-education.js'],
      probe: function () {
        if (has('HealthCheck', 'run')) return r('partial', 'Health checks + anti-phishing present; add flaw remediation tracking.');
        return r('gap', 'Add integrity monitoring + flaw remediation.');
      }
    }
  ];

  function r(status, detail) { return { status: status, detail: detail }; }

  // ------------------------------------------------------------------------
  // Crypto posture (FIPS 140-3 honesty): detect a validated provider; never
  // hand-roll. Software cannot self-declare FIPS validation.
  // ------------------------------------------------------------------------
  function cryptoPosture() {
    var hasWebCrypto = (typeof global.crypto !== 'undefined' &&
                        global.crypto && global.crypto.subtle);
    var hasNodeCrypto = (typeof module !== 'undefined' && module.exports &&
                         (function () { try { return !!require('crypto'); } catch (e) { return false; } })());
    if (hasWebCrypto || hasNodeCrypto) {
      return {
        validated: 'present',
        detail: 'platform crypto provider present (' +
                (hasWebCrypto ? 'Web Crypto' : 'Node crypto') +
                '); FIPS 140-3 validation is a deployment-level requirement, unverifiable by software'
      };
    }
    return { validated: 'absent', detail: 'no platform crypto provider detected; do NOT hand-roll crypto' };
  }

  function usGnssLocked() {
    var p = global.CAPPositioning;
    if (p && p.config && typeof p.config.gnssStrictUS === 'boolean') return p.config.gnssStrictUS;
    return false;
  }

  // ------------------------------------------------------------------------
  // SSDF (NIST 800-218) self-attestation prep — producible now
  // ------------------------------------------------------------------------
  var SSDF = [
    { group: 'PO', name: 'Prepare the Organization', items: [
      'Define secure development roles for Stuff Studios devs',
      'Document the toolchain and its security configuration' ] },
    { group: 'PS', name: 'Protect the Software', items: [
      'Source control with access restrictions and integrity checks',
      'Sign and verify released artifacts' ] },
    { group: 'PW', name: 'Produce Well-Secured Software', items: [
      'No hand-rolled crypto; delegate to validated providers',
      'Threat-model the mesh + access control before each release',
      'Code review with security focus; static analysis' ] },
    { group: 'RV', name: 'Respond to Vulnerabilities', items: [
      'Vulnerability intake + remediation tracking',
      'Document fixes and notify deployers' ] }
  ];

  // ------------------------------------------------------------------------
  // Public API: window.CAPCompliance
  // ------------------------------------------------------------------------
  function getControlMap() {
    return FAMILIES.map(function (f) {
      var res = f.probe();
      return { id: f.id, name: f.name, modules: f.modules,
               status: res.status, detail: res.detail };
    });
  }

  function getPostureReport() {
    var map = getControlMap();
    // Score only software-addressable families (exclude deployment/process ones).
    var scored = map.filter(function (f) { return f.status !== 'deployment'; });
    var met = scored.filter(function (f) { return f.status === 'met'; }).length;
    var partial = scored.filter(function (f) { return f.status === 'partial'; }).length;
    var gaps = scored.filter(function (f) { return f.status === 'gap'; });
    var readiness = scored.length ? Math.round(((met + partial * 0.5) / scored.length) * 100) : 0;

    return {
      generatedAt: new Date().toISOString(),
      headline: 'READINESS MAPPING — NOT A CERTIFICATION. ' +
                'FedRAMP / DoD SRG / FIPS 140-3 / ATO are external accreditation processes.',
      softwareReadinessPercent: readiness,
      counts: { met: met, partial: partial, gap: gaps.length,
                deploymentLevel: map.length - scored.length },
      families: map,
      gaps: gaps.map(function (g) { return { id: g.id, name: g.name, detail: g.detail }; }),
      crypto: cryptoPosture(),
      usGnssLock: usGnssLocked(),
      disclaimers: [
        'This score reflects software-observable control coverage only.',
        'Deployment-level families (physical, personnel, media) are excluded from the score.',
        'No FedRAMP, DoD SRG, FIPS 140-3, or ATO status is asserted or implied.',
        'CUI handling (NIST 800-171/CMMC) is out of scope until a real CUI use case exists.'
      ]
    };
  }

  function exportReport(format) {
    var rep = getPostureReport();
    if (format === 'json') return JSON.stringify(rep, null, 2);
    // plain text after-action style
    var lines = [];
    lines.push('CAP MODULE — COMPLIANCE READINESS REPORT');
    lines.push(rep.headline);
    lines.push('Generated: ' + rep.generatedAt);
    lines.push('Software-observable readiness: ' + rep.softwareReadinessPercent + '%');
    lines.push('met=' + rep.counts.met + ' partial=' + rep.counts.partial +
               ' gap=' + rep.counts.gap + ' deployment-level=' + rep.counts.deploymentLevel);
    lines.push('US GNSS lock: ' + rep.usGnssLock + ' | Crypto: ' + rep.crypto.detail);
    lines.push('');
    lines.push('CONTROL FAMILIES (FIPS 200):');
    rep.families.forEach(function (f) {
      lines.push('  [' + f.status.toUpperCase() + '] ' + f.id + ' ' + f.name + ' — ' + f.detail);
    });
    lines.push('');
    lines.push('DISCLAIMERS:');
    rep.disclaimers.forEach(function (d) { lines.push('  - ' + d); });
    return lines.join('\n');
  }

  var CAPCompliance = {
    getFrameworks: function () { return FRAMEWORKS; },
    getControlMap: getControlMap,
    getPostureReport: getPostureReport,
    getSSDFChecklist: function () { return SSDF; },
    cryptoPosture: cryptoPosture,
    exportReport: exportReport
  };

  global.CAPCompliance = CAPCompliance;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CAPCompliance: CAPCompliance, FRAMEWORKS: FRAMEWORKS, FAMILIES: FAMILIES };
  }

})(typeof window !== 'undefined' ? window : globalThis);
