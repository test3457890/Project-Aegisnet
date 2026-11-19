/* Test cap-mission-profile.js + cap-room-bridge.js. Node-only, no foreign deps. */

global.NODE_IDENTITY = { getId: function () { return 'NODE-A'; } };
require('../js/cap-audit-log.js');
var AU = global.CAPAudit;

// CommsRouter present so coordination can send; MQTT/AegisRoom toggled per test.
var routerWire = [];
global.CommsRouter = { send: function (e) { routerWire.push(e); }, bestAdapter: function () { return 'mesh'; } };

require('../js/cap-coordination.js');
require('../js/cap-room-bridge.js');
require('../js/cap-mission-profile.js');
var COORD = global.CAPCoordination, BRIDGE = global.CAPRoomBridge, M = global.CAPMission;

var pass = 0, fail = 0;
function check(n, c, x) { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } }

var goodCfg = {
  missionId: 'COMEX-2026-03', missionName: 'Spring Ground Team Exercise',
  teamRole: 'Ground Team', callsignLabel: 'GT-1', meshChannel: 'cap-spring',
  adsbAwareness: true, disclaimerAccepted: true, confirmTrainingPrototype: true
};

console.log('\n[1] Hard gate: cannot activate without disclaimer + training ack');
M._reset();
var r1 = M.activateProfile({ missionId: 'X', disclaimerAccepted: false, confirmTrainingPrototype: true });
check('blocked without disclaimer', r1.activated === false && r1.errors.some(function (e) { return /disclaimerAccepted/.test(e); }));
var r2 = M.activateProfile({ missionId: 'X', disclaimerAccepted: true, confirmTrainingPrototype: false });
check('blocked without training ack', r2.activated === false && r2.errors.some(function (e) { return /confirmTrainingPrototype/.test(e); }));
var r3 = M.activateProfile({ disclaimerAccepted: true, confirmTrainingPrototype: true });
check('blocked without missionId', r3.activated === false && r3.errors.some(function (e) { return /missionId/.test(e); }));
check('blocked activation is audited', AU.getEntries({ action: 'mission_activation_blocked' }).length >= 1);

console.log('\n[2] Invalid teamRole rejected');
M._reset();
var rRole = M.activateProfile(Object.assign({}, goodCfg, { teamRole: 'Wizard' }));
check('bad role rejected', rRole.activated === false && rRole.errors.some(function (e) { return /teamRole/.test(e); }));

console.log('\n[3] Valid profile activates + sets mission context');
M._reset();
var ok = M.activateProfile(goodCfg);
check('activated', ok.activated === true, ok.errors);
var mis = M.getMission();
check('missionId set', mis.missionId === 'COMEX-2026-03');
check('teamRole set', mis.teamRole === 'Ground Team');
check('callsign set', mis.callsignLabel === 'GT-1');
check('adsb receive-only flag set', mis.adsbAwareness === true);
check('low-bandwidth default', mis.lowBandwidth === true);
check('activation audited', AU.getEntries({ action: 'mission_activated' }).length === 1);

console.log('\n[4] Bridge falls back to comms-router when no AegisRoom/MQTT');
check('bridged via comms-router', ok.room && ok.room.bridged === true && ok.room.transport === 'comms-router', ok.room);
check('room id derived from mission', ok.room.roomId === 'cap-room:COMEX-2026-03', ok.room.roomId);
check('bridge status not a radio net', /Not a CAP\/military radio net/.test(BRIDGE.status().note));

console.log('\n[5] CAP check-ins are forwarded into the room');
routerWire.length = 0;
COORD.checkin(COORD.CHECKIN.ON_STATION);
var roomMsgs = routerWire.filter(function (e) { return e.room === 'cap-room:COMEX-2026-03'; });
check('check-in forwarded to room', roomMsgs.length >= 1, roomMsgs.length);
check('room traffic tagged training', roomMsgs.every(function (e) { return e.tag === 'TRAINING-EXERCISE'; }));

console.log('\n[6] endMission leaves the room and clears context');
var end = M.endMission();
check('mission ended', end.ended === true && end.missionId === 'COMEX-2026-03');
check('mission cleared', M.getMission() === null);
check('bridge no longer bridged', BRIDGE.status().bridged === false);
check('room_left audited', AU.getEntries({ action: 'room_left' }).length >= 1);

console.log('\n[7] Prefers native AegisRoom API when present');
M._reset(); BRIDGE._reset();
var roomCalls = [];
global.AegisRoom = {
  join: function (id, opts) { roomCalls.push(['join', id, opts]); },
  leave: function (id) { roomCalls.push(['leave', id]); },
  send: function (id, env) { roomCalls.push(['send', id, env]); },
  setPresence: function (id, p) { roomCalls.push(['presence', id, p]); },
  members: function () { return [{ id: 'NODE-A', callsign: 'GT-1', presence: 'online' }]; }
};
var ok2 = M.activateProfile(goodCfg);
check('bridged via aegis-room', ok2.room.transport === 'aegis-room', ok2.room.transport);
check('AegisRoom.join called', roomCalls.some(function (c) { return c[0] === 'join' && c[1] === 'cap-room:COMEX-2026-03'; }));
check('presence set on join', roomCalls.some(function (c) { return c[0] === 'presence'; }));
check('members from AegisRoom', BRIDGE.members().length === 1 && BRIDGE.members()[0].callsign === 'GT-1');
COORD.checkin(COORD.CHECKIN.OK);
check('check-in sent into AegisRoom', roomCalls.some(function (c) { return c[0] === 'send'; }));
M.endMission();
check('AegisRoom.leave called', roomCalls.some(function (c) { return c[0] === 'leave'; }));
delete global.AegisRoom;

console.log('\n[8] Tier gate: demo mode (Tier 0) cannot run a mission');
M._reset(); BRIDGE._reset();
require('../js/cap-access-control.js');
global.CAPAccess._reset(); // no key -> Tier 0 demo
var rDemo = M.activateProfile(goodCfg);
check('demo blocked', rDemo.activated === false && /Demo mode/.test(rDemo.errors[0]), rDemo.errors);
// raise to Tier 1
global.CAPAccess.configureSecret('s'); global.CAPAccess.setRole('coordinator');
global.CAPAccess.validateOrgKey(global.CAPAccess.issueOrgKey({ org: 'AZWG', tier: 1, exp: new Date(Date.now() + 86400000).toISOString() }));
global.CAPAccess.setDeploymentMode('standard');
var rT1 = M.activateProfile(goodCfg);
check('activates at Tier 1', rT1.activated === true, rT1.errors);

console.log('\n----------------------------------------');
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
