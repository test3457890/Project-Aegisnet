/* Self-test for cap-positioning.js math (runs in Node, no browser needed). */
var m = require('../js/cap-positioning.js');
var Geo = m.Geo, Mesh = m.Mesh, DR = m.DeadReckoning, Gnss = m.Gnss, fuse = m.fuse, CAP = m.CAPPositioning;

function near(a, b, tol) { return Math.abs(a - b) <= tol; }
var pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  -> ' + extra : '')); }
}

// Reference point: ERAU Prescott area
var BASE = { lat: 34.6150, lon: -112.4500 };

console.log('\n[1] Geo round-trip (ENU <-> lat/lon)');
var enu = Geo.toENU(BASE.lat + 0.001, BASE.lon + 0.001, BASE.lat, BASE.lon);
var back = Geo.fromENU(enu.e, enu.n, BASE.lat, BASE.lon);
check('lat round-trips', near(back.lat, BASE.lat + 0.001, 1e-6), back.lat);
check('lon round-trips', near(back.lon, BASE.lon + 0.001, 1e-6), back.lon);

console.log('\n[2] RSSI -> distance is monotonic (stronger signal = closer)');
var dNear = Mesh.rssiToMeters(-60);
var dFar  = Mesh.rssiToMeters(-90);
check('weaker RSSI is farther', dFar > dNear, dNear.toFixed(1) + ' vs ' + dFar.toFixed(1));

console.log('\n[3] Mesh trilateration recovers a known truth point');
// Truth: 100m east, 50m north of BASE. Three anchors at known spots.
var truth = Geo.offset(BASE.lat, BASE.lon, 50, 100);
var anchorDefs = [
  Geo.offset(BASE.lat, BASE.lon, 0, 0),
  Geo.offset(BASE.lat, BASE.lon, 0, 300),
  Geo.offset(BASE.lat, BASE.lon, 300, 0)
];
// Synthesize the RSSI each anchor would hear from truth, via the path-loss model.
function metersToRssi(d) { return CAP.config.rssiAt1m - 10 * CAP.config.pathLossExponent * Math.log10(d); }
var anchors = anchorDefs.map(function (a, i) {
  var d = Geo.haversine(truth.lat, truth.lon, a.lat, a.lon);
  return { id: 'A' + i, lat: a.lat, lon: a.lon, rssi: metersToRssi(d) };
});
var est = Mesh.read(anchors);
var err = Geo.haversine(truth.lat, truth.lon, est.lat, est.lon);
check('trilateration method tag', est.method.id === 'mesh_trilat', est.method.id);
check('trilateration error < 5m (clean model)', err < 5, err.toFixed(2) + 'm');

console.log('\n[4] 1-2 anchors degrade to proximity, not a false precise fix');
var prox = Mesh.read([anchors[0]]);
check('single anchor = proximity method', prox.method.id === 'mesh_proximity', prox.method.id);
check('proximity accuracy >= floor', prox.accuracy >= CAP.config.rssiAccuracyFloor, prox.accuracy);

console.log('\n[5] Dead reckoning integrates steps from an anchor');
DR.anchorTo({ lat: BASE.lat, lon: BASE.lon });
DR.heading = 90; // due east
DR.enabled = true;
for (var s = 0; s < 100; s++) DR.step(); // 100 steps east
var drRead = DR.read();
var drDist = Geo.haversine(BASE.lat, BASE.lon, drRead.lat, drRead.lon);
var expected = 100 * CAP.config.strideMeters;
check('DR distance ~ steps*stride', near(drDist, expected, 2), drDist.toFixed(1) + ' vs ' + expected.toFixed(1));
check('DR accuracy grows with distance', drRead.accuracy > 5, drRead.accuracy.toFixed(1));
check('DR flagged as estimate (rank>0)', drRead.method.rank > 0, drRead.method.rank);
DR.enabled = false;

console.log('\n[6] Fusion prefers a live GNSS fix over estimates');
Gnss.ingest(BASE.lat, BASE.lon, 6);
var fused = fuse();
check('fusion picks gnss', fused.method === 'gnss', fused.method);
check('live gnss is NOT an estimate', fused.isEstimate === false, fused.isEstimate);
check('confidence high for gnss', fused.confidence >= 0.9, fused.confidence);

console.log('\n[7] Stale GNSS grows error radius, stays honest');
Gnss.last.t = Date.now() - 20000; // 20s old
var staleRead = Gnss.read();
check('stale tag applied', staleRead.method.id === 'gnss_stale', staleRead.method.id);
check('stale accuracy grew', staleRead.accuracy > 6, staleRead.accuracy.toFixed(1));

console.log('\n[8] Sharing is opt-in and rate-limited');
check('sharing off by default', CAP.isSharing() === false);
check('shareNow blocked while off', CAP.shareNow() === false);

console.log('\n[9] GNSS sovereignty: US constellations only');
var okUs = CAP.ingestGnssDetailed({ lat: BASE.lat, lon: BASE.lon, accuracy: 5, systems: ['GPS', 'WAAS'] });
check('US-only fix accepted', okUs === true, okUs);
check('accepted fix tagged verified-us', Gnss.last.provenance === 'verified-us', Gnss.last.provenance);
var okForeign = CAP.ingestGnssDetailed({ lat: BASE.lat, lon: BASE.lon, accuracy: 5, systems: ['GPS', 'BeiDou'] });
check('mixed foreign fix rejected', okForeign === false, okForeign);
var okNoInfo = CAP.ingestGnssDetailed({ lat: BASE.lat, lon: BASE.lon, accuracy: 5 });
check('no-constellation fix accepted but flagged', okNoInfo === true && Gnss.last.provenance === 'unverified-constellation', Gnss.last.provenance);

console.log('\n----------------------------------------');
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
