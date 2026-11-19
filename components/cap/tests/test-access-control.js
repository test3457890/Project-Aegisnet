/* Test cap-access-control.js. Node-only, no foreign deps. */
var auditTrail = [];
global.CAPAudit = { log: function (e) { auditTrail.push(e); } };
require('../js/cap-access-control.js');
var A = global.CAPAccess;

var pass = 0, fail = 0;
function check(n, c, x) { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } }
function future() { return new Date(Date.now() + 86400000).toISOString(); }
function past() { return new Date(Date.now() - 86400000).toISOString(); }

console.log('\n[1] No key = Tier 0 demo, full features off');
A._reset();
check('tier 0 without key', A.getTier() === 0, A.getTier());
check('mesh coordination off at T0', A.featureEnabled('mesh_coordination') === false);
check('mission board off at T0', A.featureEnabled('mission_board') === false);

console.log('\n[2] Unsigned key claiming Tier 3 is capped to Tier 1');
A._reset();
A.setRole('admin'); A.setDeploymentMode('air-gapped');
var unsigned = A.issueOrgKey({ org: 'AZWG-Training', tier: 3, exp: future() }); // no secret
var rU = A.validateOrgKey(unsigned);
check('key valid but unverified', rU.valid === true && rU.verified === false, [rU.valid, rU.verified]);
check('effective tier capped to 1', A.getTier() === 1, A.getTier());
check('access state explains the cap', A.getAccessState().violations.some(function (v) { return /unverified/i.test(v); }));

console.log('\n[3] Signed + verified key reaches its tier when mode allows');
A._reset();
A.configureSecret('operator-secret-xyz');
A.setRole('admin');
var signed2 = A.issueOrgKey({ org: 'AZWG', tier: 2, exp: future() });
var r2 = A.validateOrgKey(signed2);
check('signature verified', r2.verified === true, r2.reason);
A.setDeploymentMode('self-hosted');
check('tier 2 in self-hosted', A.getTier() === 2, A.getTier());
A.setDeploymentMode('standard');
check('same key capped to 1 in standard mode', A.getTier() === 1, A.getTier());
A.setDeploymentMode('demo');
check('same key capped to 0 in demo mode', A.getTier() === 0, A.getTier());

console.log('\n[4] Tier 3 requires air-gapped + US-origin hardware allow-list');
A._reset();
A.configureSecret('s'); A.setRole('admin');
var signed3 = A.issueOrgKey({ org: 'GOV', tier: 3, exp: future() });
A.validateOrgKey(signed3);
A.setDeploymentMode('air-gapped');
check('tier capped to 2 without hardware list', A.getTier() === 2, A.getTier());
A.registerHardware('NODE-A', { origin: 'US', model: 'Semtech-SX1262 board' });
check('tier 3 with US hardware allow-list', A.getTier() === 3, A.getTier());
A.registerHardware('NODE-B', { origin: 'CN', model: 'foreign board' });
check('foreign hardware drops back to tier 2', A.getTier() === 2, A.getTier());
A.setRequireUsOrigin(false);
check('tier 3 returns if US-origin not required', A.getTier() === 3, A.getTier());

console.log('\n[5] Expired and tampered keys are rejected/unverified');
A._reset(); A.configureSecret('s');
var expired = A.issueOrgKey({ org: 'X', tier: 1, exp: past() });
check('expired key invalid', A.validateOrgKey(expired).valid === false);
var good = A.issueOrgKey({ org: 'X', tier: 2, exp: future() });
var tampered = good.slice(0, -2) + (good.slice(-2) === 'aa' ? 'bb' : 'aa'); // corrupt sig
var rt = A.validateOrgKey(tampered);
check('tampered key not verified', rt.verified === false, rt.reason);

console.log('\n[6] RBAC: role gates actions');
A._reset();
A.setRole('observer');
check('observer can view board', A.can('view_board') === true);
check('observer cannot send tasking', A.can('send_tasking') === false);
A.setRole('team_member');
check('team member can checkin', A.can('checkin') === true);
check('team member cannot export audit', A.can('export_audit') === false);
A.setRole('coordinator');
check('coordinator can send tasking', A.can('send_tasking') === true);
check('coordinator cannot manage nodes', A.can('manage_nodes') === false);
A.setRole('admin');
check('admin can export audit', A.can('export_audit') === true);

console.log('\n[7] Combined authorize(): role AND tier');
A._reset(); A.configureSecret('s'); A.setRole('coordinator');
A.validateOrgKey(A.issueOrgKey({ org: 'AZWG', tier: 1, exp: future() }));
A.setDeploymentMode('standard');
check('coordinator may send tasking at T1', A.authorize('send_tasking', 'tasking') === true);
A.setDeploymentMode('demo');
check('same denied at T0 (feature gated)', A.authorize('send_tasking', 'tasking') === false);

console.log('\n[8] Node allow-list: unregistered cannot receive tasking');
A._reset(); A.setRole('admin');
A.registerNode('NODE-A');
check('registered node verified', A.nodeStatus('NODE-A') === 'verified');
check('unregistered node unverified', A.nodeStatus('NODE-Z') === 'unverified');
check('registered can receive tasking', A.canReceiveTasking('NODE-A') === true);
check('unregistered cannot receive tasking', A.canReceiveTasking('NODE-Z') === false);
A.setRole('observer');
check('non-admin cannot register nodes', A.registerNode('NODE-Q') === false);

console.log('\n[9] Honesty: state disavows clearance/certification');
var st = A.getAccessState();
check('headline says policy not clearance', /NOT security clearance/i.test(st.headline));
check('headline says not a certification', /not a security certification/i.test(st.headline));

console.log('\n----------------------------------------');
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
