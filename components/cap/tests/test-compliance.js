/* Test cap-compliance.js: verify it maps controls honestly and never
 * fabricates a certification claim. Node-only, no foreign deps. */

// Simulate a realistic subset of loaded CAP modules.
global.NODE_IDENTITY = { getId: function () { return 'NODE-A' }, get: function(){} };
global.CAPAudit = { log: function () {}, exportReport: function () { return ''; } };
global.HealthCheck = { run: function () {} };
global.SafetySettings = { showSafetyWarning: function () {} };
global.CAPMission = { getMission: function () { return { missionId: 'X' }; } };
global.CommsRouter = { send: function () {}, bestAdapter: function () { return 'mesh'; } };
// access control + positioning loaded:
global.CAPAccess = { getRole: function(){}, validateOrgKey: function(){},
                     registerNode: function(){}, getTier: function(){} };
require('../js/cap-positioning.js'); // brings CAPPositioning with gnssStrictUS=true
require('../js/cap-compliance.js');
var C = global.CAPCompliance;

var pass = 0, fail = 0;
function check(n, c, x) { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } }

console.log('\n[1] Frameworks list is present and labeled by kind');
var fw = C.getFrameworks();
check('has FedRAMP as accreditation-process', fw.some(function (f) { return f.id === 'FEDRAMP' && f.kind === 'accreditation-process'; }));
check('has FIPS 140-3 as validation-process', fw.some(function (f) { return f.id === 'FIPS1403' && f.kind === 'validation-process'; }));
check('every framework has a URL', fw.every(function (f) { return /^https?:\/\//.test(f.url); }));

console.log('\n[2] Control map covers all 17 FIPS 200 families');
var map = C.getControlMap();
check('17 families', map.length === 17, map.length);
var ids = map.map(function (m) { return m.id; }).sort().join(',');
check('expected family ids', ids === 'AC,AT,AU,CA,CM,CP,IA,IR,MA,MP,PE,PL,PS,RA,SA,SC,SI', ids);

console.log('\n[3] Probes reflect actual module presence');
function fam(id) { return map.find(function (m) { return m.id === id; }); }
check('AC met (access control simulated)', fam('AC').status === 'met', fam('AC').status);
check('AU met (audit simulated)', fam('AU').status === 'met', fam('AU').status);
check('CP met (positioning + router)', fam('CP').status === 'met', fam('CP').status);
check('PE is deployment-level (physical)', fam('PE').status === 'deployment', fam('PE').status);
check('PS is deployment-level (personnel)', fam('PS').status === 'deployment', fam('PS').status);

console.log('\n[4] Posture report is honest about what it is');
var rep = C.getPostureReport();
check('headline disavows certification', /NOT A CERTIFICATION/.test(rep.headline));
check('readiness is a number 0-100', rep.softwareReadinessPercent >= 0 && rep.softwareReadinessPercent <= 100, rep.softwareReadinessPercent);
check('deployment families excluded from score', rep.counts.deploymentLevel >= 3, rep.counts.deploymentLevel);
check('US GNSS lock reported true', rep.usGnssLock === true, rep.usGnssLock);

console.log('\n[5] Crypto posture never claims FIPS validation');
var cp = C.cryptoPosture();
check('crypto provider detected in node', cp.validated === 'present', cp.validated);
check('crypto detail flags validation as deployment-level', /deployment-level|hand-roll/.test(cp.detail), cp.detail);

console.log('\n[6] No output asserts a certification we do not have');
var txt = C.exportReport('text');
check('export contains readiness disclaimer', /NOT A CERTIFICATION/.test(txt));
var bad = /(is|are)\s+(FedRAMP|FIPS 140-3|ATO|DoD SRG)\s+(certified|authorized|compliant)/i.test(txt);
check('no false certified/authorized/compliant claim', bad === false, bad);

console.log('\n[7] SSDF self-attestation checklist present');
var ssdf = C.getSSDFChecklist();
check('SSDF has PO/PS/PW/RV groups', ssdf.map(function (g) { return g.group; }).join(',') === 'PO,PS,PW,RV', ssdf.map(function(g){return g.group;}));

console.log('\n----------------------------------------');
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
