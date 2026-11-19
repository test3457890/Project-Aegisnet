/* Test cap-integrations.js: CoT, CACTUS export, and the radio non-transmit
 * boundary. Node-only, no foreign deps. */

var wire = [];
var auditTrail = [];
global.NODE_IDENTITY = { getId: function () { return 'NODE-A'; } };
global.CAPAudit = { log: function (e) { auditTrail.push(e); } };
global.CAPMission = { getMission: function () { return { missionId: 'COMEX-2026-03', teamRole: 'Ground Team', callsignLabel: 'GT-1' }; } };
global.CommsRouter = { send: function (e) { wire.push(e); }, bestAdapter: function () { return 'mesh'; } };

var taskings = [];
global.CAPCoordination = {
  getTeamStatus: function () {
    return [
      { callsign: 'GT-1', role: 'Ground Team', lastCheckin: '2026-06-15T10:00:00Z', checkinType: 'ON STATION', online: true },
      { callsign: 'BASE-1', role: 'Base', lastCheckin: '2026-06-15T10:01:00Z', checkinType: 'OK', online: true }
    ];
  },
  getNode: function (id) { return { callsign: 'GT-1' }; },
  shareTasking: function (text, to) { taskings.push({ text: text, to: to }); return { ref: 'TSK-x' }; }
};

require('../js/cap-positioning.js');
require('../js/cap-integrations.js');
var I = global.CAPIntegrations;
var CAP = global.CAPPositioning;

var pass = 0, fail = 0;
function check(n, c, x) { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } }
function lastWire() { return wire[wire.length - 1]; }

console.log('\n[1] CACTUS export: shape + honest mapping warning');
var log = I.cactus.buildMissionLog();
check('mission id present', log.missionId === 'COMEX-2026-03', log.missionId);
check('personnel captured', log.personnel.length === 2, log.personnel.length);
check('mapping flagged unconfirmed', log._meta.mappingConfirmed === false && /not confirmed/i.test(log._meta.warning));
check('personnel omits position by default', log.personnel.every(function (p) { return p.lat === undefined; }));
var csv = I.cactus.exportCSV();
check('CSV has header + rows', csv.split('\n').length === 3, csv.split('\n').length);

console.log('\n[2] CACTUS live push is disabled, not faked');
var push = I.cactus.pushToCactus();
check('push not sent', push.sent === false, push.sent);
check('push explains authorization path', /authoriz/i.test(push.howToEnable));

console.log('\n[3] CoT: method -> how mapping is honest about provenance');
check('gnss -> m-g', I.tak.howFromMethod('gnss') === 'm-g');
check('dead_reckoning -> m-i', I.tak.howFromMethod('dead_reckoning') === 'm-i');
check('mesh_trilat -> m-r', I.tak.howFromMethod('mesh_trilat') === 'm-r');
check('manual -> h-e', I.tak.howFromMethod('manual') === 'h-e');

console.log('\n[4] CoT round-trip recovers position + identity');
var pos = { hasFix: true, lat: 34.615, lon: -112.45, accuracy: 7, method: 'gnss', isEstimate: false };
var cot = I.tak.toCoT(pos, { nodeId: 'NODE-A', callsign: 'GT-1', role: 'Ground Team' });
check('CoT is event XML', /^<\?xml/.test(cot) && /<event /.test(cot));
check('CoT marks training in remarks', /TRAINING-EXERCISE/.test(cot));
var parsed = I.tak.fromCoT(cot);
check('lat recovered', Math.abs(parsed.lat - 34.615) < 1e-6, parsed.lat);
check('lon recovered', Math.abs(parsed.lon - (-112.45)) < 1e-6, parsed.lon);
check('callsign recovered', parsed.callsign === 'GT-1', parsed.callsign);
check('how recovered (m-g)', parsed.how === 'm-g', parsed.how);
check('ce (accuracy) recovered', parsed.accuracy === 7, parsed.accuracy);

console.log('\n[5] CoT estimate is labeled, never shown as hard GPS');
var est = { hasFix: true, lat: 34.6, lon: -112.4, accuracy: 120, method: 'mesh_trilat', isEstimate: true };
var cotEst = I.tak.toCoT(est, { nodeId: 'NODE-A' });
check('estimate flagged in remarks', /\(ESTIMATE\)/.test(cotEst));
check('estimate how is m-r not m-g', /how="m-r"/.test(cotEst));

console.log('\n[6] CoT emission is opt-in (respects position sharing)');
I.tak.enable();
CAP.ingestGnssDetailed({ lat: 34.615, lon: -112.45, accuracy: 6, systems: ['GPS', 'WAAS'] });
// sharing still OFF -> sendCoT via subscription should not fire; direct send still gated by router only
var before = wire.length;
// simulate a position tick without sharing opted in
check('CoT respects share opt-in (none sent yet)', wire.filter(function (w) { return w.type === 'cot'; }).length === 0);
CAP.enableSharing();
I.tak.sendCoT(pos);
check('CoT sent after opt-in', lastWire().type === 'cot' && /<event /.test(lastWire().payload));
check('CoT audit logs method only, no coords', auditTrail.some(function (a) { return a.action === 'cot_sent' && JSON.stringify(a.details).indexOf('lat') < 0; }));

console.log('\n[7] Radio: reference only, NEVER transmits');
var guard = I.radio.referenceChannel('GUARD');
check('Guard reference present', guard && guard.id === 'GUARD', guard && guard.id);
check('Guard marked non-transmit', guard.transmitByThisDevice === false);
check('Guard note says reference only', /never transmits|reference only/i.test(guard.note));
var adv = I.radio.adviseChannelSwitch('TAC1', 'keep Guard clear');
check('advisory sent as TEXT tasking', adv.sent === true && /switch to/.test(adv.text));
check('advisory transmitted NO RF', adv.transmittedRF === false);
check('advisory reached coordination as text', taskings.some(function (t) { return /switch to TAC 1/i.test(t.text); }));
check('no frequency keyed anywhere in advisory text', /150\.2250|MHz/.test(adv.text) === false, adv.text);

console.log('\n----------------------------------------');
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
