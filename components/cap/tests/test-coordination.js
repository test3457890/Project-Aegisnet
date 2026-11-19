/* Integration test: cap-coordination.js riding on simulated AegisNet globals.
 * Verifies envelopes, routing, training tags, team status, and the
 * positioning <-> coordination handoff. Node-only, no browser, no foreign deps. */

// --- Simulate the existing SkyMesh/AegisNet globals BEFORE loading modules ---
var wire = []; // captures everything "transmitted"
global.NODE_IDENTITY = { getId: function () { return 'NODE-A'; } };
global.CAPMission = {
  getMission: function () {
    return { missionId: 'COMEX-2026-03', teamRole: 'Ground Team',
             callsignLabel: 'GT-1' };
  }
};
var auditTrail = [];
global.CAPAudit = { log: function (e) { auditTrail.push(e); } };

// Minimal mesh: onMessage registers a handler we can push into.
var meshHandlers = [];
global.MESH_STATE = {
  nodes: [],
  onMessage: function (fn) { meshHandlers.push(fn); }
};
function meshDeliver(env) { meshHandlers.forEach(function (h) { h(env); }); }

// CommsRouter captures sends and reports a best adapter.
global.CommsRouter = {
  bestAdapter: function () { return 'mesh-lora'; },
  send: function (env) { wire.push(env); }
};

// --- Load modules (order: positioning first, then coordination) ---
require('../js/cap-positioning.js');
require('../js/cap-coordination.js');
var CAP = global.CAPPositioning;
var COORD = global.CAPCoordination;

var pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}
function lastWire() { return wire[wire.length - 1]; }

COORD.start();

console.log('\n[1] Check-in builds a tagged, routed, mission-stamped envelope');
var r = COORD.checkin(COORD.CHECKIN.ON_STATION);
var e = lastWire();
check('sent over a route', r.sent === true && r.route === 'mesh-lora', r.route);
check('tagged TRAINING-EXERCISE', e.tag === 'TRAINING-EXERCISE', e.tag);
check('carries mission id', e.mission === 'COMEX-2026-03', e.mission);
check('carries role + callsign', e.role === 'Ground Team' && e.callsign === 'GT-1', [e.role, e.callsign]);
check('check-in type correct', e.checkin === 'ON STATION', e.checkin);

console.log('\n[2] NEED ASSISTANCE is flagged training-only, never a real distress');
COORD.checkin(COORD.CHECKIN.NEED_ASSISTANCE);
var na = lastWire();
check('assistance trainingOnly flag', na.trainingOnly === true);
check('assistance note disclaims emergency', /NOT A REAL EMERGENCY/.test(na.note || ''), na.note);

console.log('\n[3] Tasking + acknowledgment round-trip');
var t = COORD.shareTasking('Move to grid 12S 0456 7890', 'NODE-B');
check('tasking returns a ref', typeof t.ref === 'string' && t.ref.indexOf('TSK-') === 0, t.ref);
check('tasking addressed to node', lastWire().to === 'NODE-B', lastWire().to);
COORD.acknowledge(t.ref);
check('ack references the tasking', lastWire().type === 'ack' && lastWire().ref === t.ref, lastWire().ref);

console.log('\n[4] Inbound from another node populates team status');
meshDeliver({
  tag: 'TRAINING-EXERCISE', type: 'checkin', from: 'NODE-B',
  role: 'Base', callsign: 'BASE-1', checkin: 'OK', ts: new Date().toISOString()
});
var nodeB = COORD.getNode('NODE-B');
check('NODE-B is tracked', !!nodeB && nodeB.online === true, nodeB && nodeB.online);
check('NODE-B role captured', nodeB.role === 'Base', nodeB && nodeB.role);

console.log('\n[5] Non-training traffic is ignored');
var before = COORD.getTeamStatus().length;
meshDeliver({ tag: 'SOMETHING-ELSE', type: 'checkin', from: 'NODE-X' });
check('untagged message ignored', COORD.getTeamStatus().length === before);

console.log('\n[6] Positioning -> coordination handoff (opt-in enforced)');
CAP.ingestGnssDetailed({ lat: 34.615, lon: -112.45, accuracy: 6, systems: ['GPS', 'WAAS'] });
check('share blocked before opt-in', CAP.shareNow() === false);
CAP.enableSharing();
var shared = CAP.shareNow();
check('share succeeds after opt-in', shared === true, shared);
var posMsg = lastWire();
check('position message tagged training', posMsg.tag === 'TRAINING-EXERCISE', posMsg.tag);
check('position carries method label', typeof posMsg.method === 'string', posMsg.method);
check('live US GPS not flagged estimate', posMsg.isEstimate === false, posMsg.isEstimate);

console.log('\n[7] Audit logs actions but never coordinates');
var posAudits = auditTrail.filter(function (a) { return a.action === 'position_sent'; });
check('position_sent audited', posAudits.length >= 1, posAudits.length);
var leaks = auditTrail.filter(function (a) {
  var d = JSON.stringify(a.details || {});
  return /"lat"|"lon"/.test(d);
});
check('no coordinates in any audit entry', leaks.length === 0, leaks.length);

console.log('\n[8] Own node appears in team status');
var me = COORD.getNode('NODE-A');
check('self tracked with position', !!me && !!me.position, me && me.position);

console.log('\n----------------------------------------');
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
