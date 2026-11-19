/* Test cap-audit-log.js + a cross-module leak check. Node-only, no foreign deps. */

global.NODE_IDENTITY = { getId: function () { return 'NODE-A'; } };
global.CAPMission = { getMission: function () { return { missionId: 'COMEX-2026-03', teamRole: 'Ground Team', callsignLabel: 'GT-1' }; } };

require('../js/cap-audit-log.js');
var AU = global.CAPAudit;
// access control provides role context to the audit log
require('../js/cap-access-control.js');
global.CAPAccess.setRole('coordinator');

var pass = 0, fail = 0;
function check(n, c, x) { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } }

console.log('\n[1] Entries are enriched with context the callers do not pass');
AU._reset();
global.CAPAccess.setRole('coordinator');
AU.log({ action: 'checkin_sent', module: 'coordination', details: { type: 'ON STATION' } });
var e = AU.getEntries()[0];
check('timestamp added', !!e.ts);
check('node id added', e.nodeId === 'NODE-A', e.nodeId);
check('role added from CAPAccess', e.role === 'coordinator', e.role);
check('mission id added', e.missionId === 'COMEX-2026-03', e.missionId);
check('seq assigned', e.seq === 1, e.seq);

console.log('\n[2] Secrets are redacted, even if a caller passes them');
AU._reset();
AU.log({ action: 'x', module: 'test', details: { apiKey: 'sk-12345', password: 'hunter2', orgKey: 'AAA.BBB', note: 'ok' } });
var d = AU.getEntries()[0].details;
check('apiKey redacted', d.apiKey === '[REDACTED-SECRET]', d.apiKey);
check('password redacted', d.password === '[REDACTED-SECRET]', d.password);
check('orgKey redacted', d.orgKey === '[REDACTED-SECRET]', d.orgKey);
check('non-secret kept', d.note === 'ok', d.note);

console.log('\n[3] Coordinates stripped by default, kept only when consented');
AU._reset();
AU.log({ action: 'pos', module: 'test', details: { lat: 34.6, lon: -112.4, method: 'gnss' } });
var dp = AU.getEntries()[0].details;
check('lat redacted by default', dp.lat === '[REDACTED-POSITION]', dp.lat);
check('lon redacted by default', dp.lon === '[REDACTED-POSITION]', dp.lon);
check('method kept', dp.method === 'gnss', dp.method);
AU.log({ action: 'pos', module: 'test', consentedPosition: true, details: { lat: 34.6, lon: -112.4 } });
var dc = AU.getEntries({ limit: 1 })[0].details;
check('consented position kept', dc.lat === 34.6, dc.lat);

console.log('\n[4] Hash chain is tamper-evident');
AU._reset();
for (var i = 0; i < 5; i++) AU.log({ action: 'a' + i, module: 'test', details: { i: i } });
var v1 = AU.verifyChain();
check('chain supported in node', v1.supported === true);
check('chain verifies clean', v1.ok === true, v1);
// tamper with an entry directly
AU.getEntries()[2].details.i = 999;
var v2 = AU.verifyChain();
check('tamper detected', v2.ok === false && v2.brokenAtSeq === 3, v2);

console.log('\n[5] Filters + summary');
AU._reset();
AU.log({ action: 'checkin_sent', module: 'coordination', details: {} });
AU.log({ action: 'checkin_sent', module: 'coordination', details: {} });
AU.log({ action: 'orgkey_validated', module: 'access', details: {} });
check('filter by module', AU.getEntries({ module: 'access' }).length === 1);
check('filter by action', AU.getEntries({ action: 'checkin_sent' }).length === 2);
var s = AU.summary();
check('summary counts action', s.byAction.checkin_sent === 2, s.byAction);
check('summary counts module', s.byModule.coordination === 2, s.byModule);

console.log('\n[6] Exports never contain redacted secrets/coords');
AU._reset();
AU.log({ action: 'leaky', module: 'test', details: { password: 'hunter2', lat: 34.6, lon: -112.4 } });
var json = AU.exportJSON();
var csv = AU.exportCSV();
var rep = AU.exportReport();
check('json has no raw password', json.indexOf('hunter2') < 0);
check('json has no raw coordinate 34.6', json.indexOf('34.6') < 0);
check('csv has no raw password', csv.indexOf('hunter2') < 0);
check('report flags integrity + redaction', /Integrity:/.test(rep) && /redacted/i.test(rep));
check('export itself was audited', AU.getEntries({ action: 'audit_exported' }).length >= 1);

console.log('\n[7] Snapshot / restore round-trip');
AU._reset();
AU.log({ action: 'one', module: 'test', details: {} });
var snap = AU.snapshot();
AU._reset();
check('reset clears log', AU.count() === 0);
AU.restore(snap);
check('restore brings entries back', AU.count() === 1 && AU.getEntries()[0].action === 'one');

console.log('\n[8] CROSS-MODULE: run real modules, confirm no leak in the trail');
AU._reset();
// load the live modules that write to CAPAudit
global.CommsRouter = { send: function () {}, bestAdapter: function () { return 'mesh'; } };
require('../js/cap-positioning.js');
require('../js/cap-coordination.js');
require('../js/cap-integrations.js');
var POS = global.CAPPositioning, COORD = global.CAPCoordination, INT = global.CAPIntegrations;
COORD.start();
COORD.checkin(COORD.CHECKIN.ON_STATION);
POS.ingestGnssDetailed({ lat: 34.615, lon: -112.45, accuracy: 6, systems: ['GPS', 'WAAS'] });
POS.enableSharing();
POS.shareNow();                       // shares a position -> audited as method only
INT.radio.adviseChannelSwitch('TAC1');
var fullJson = AU.exportJSON();
check('no lat leaked across modules', fullJson.indexOf('34.615') < 0, 'lat leak');
check('no lon leaked across modules', fullJson.indexOf('-112.45') < 0, 'lon leak');
check('no guard frequency in audit', fullJson.indexOf('150.2250') < 0);
check('position_shared logged (method only)', AU.getEntries({ action: 'position_shared' }).length >= 1);
check('chain still verifies after real traffic', AU.verifyChain().ok === true);

console.log('\n----------------------------------------');
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
