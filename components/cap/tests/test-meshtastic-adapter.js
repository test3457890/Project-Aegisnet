/* Test meshtastic-adapter.js codec + framing + boundary. Node-only. */
var m = require('../js/meshtastic-adapter.js');
var C = m.MeshtasticAdapter._codec;
var PB = C.PB;

var pass = 0, fail = 0;
function check(n, c, x) { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n + (x !== undefined ? ' -> ' + JSON.stringify(x) : '')); } }

console.log('\n[1] protobuf primitives');
function vroundtrip(n) { var b = PB.varint(n); var r = PB.readVarint(b, 0); return r.value === n && r.next === b.length; }
check('varint 0', vroundtrip(0));
check('varint 1', vroundtrip(1));
check('varint 300', vroundtrip(300));
check('varint 1e6', vroundtrip(1000000));
check('tag(4,2) = 0x22', PB.tag(4, 2)[0] === 0x22, PB.tag(4, 2));
check('fixed32 LE', JSON.stringify(PB.fixed32(0x01020304)) === JSON.stringify([4, 3, 2, 1]));

console.log('\n[2] Text ToRadio encodes, and decodes back as text');
// Build ToRadio(text), extract MeshPacket (ToRadio.packet=field1), rewrap as
// FromRadio(packet=field2), and decode -> must recover text + from.
var toRadio = C.encodeToRadioText('CHECKIN ON STATION', 0xFFFFFFFF, 0);
var topFields = PB.readFields(toRadio);
var mpBytes = PB.find(topFields, 1); // MeshPacket from ToRadio.packet
check('ToRadio has packet field 1', !!mpBytes);
// add a from(1,fixed32) to the MeshPacket so decode can read sender
var withFrom = [].concat(PB.tag(1, 5), PB.fixed32(0x12345678), Array.from(mpBytes));
var fromRadio = Uint8Array.from([].concat(PB.tag(2, 2), PB.varint(withFrom.length), withFrom));
var dec = C.decodeFromRadio(fromRadio);
check('decoded kind text', dec.kind === 'text', dec.kind);
check('text recovered', dec.text === 'CHECKIN ON STATION', dec.text);
check('from recovered', dec.from === 0x12345678, dec.from && dec.from.toString(16));

console.log('\n[3] JSON CAP envelope survives a round-trip over the codec');
var env = JSON.stringify({ tag: 'TRAINING-EXERCISE', type: 'checkin', checkin: 'OK', from: 'NODE-A' });
var tr = C.encodeToRadioText(env);
var mp2 = PB.find(PB.readFields(tr), 1);
var fr2 = Uint8Array.from([].concat(PB.tag(2, 2), PB.varint(mp2.length), Array.from(mp2)));
var dec2 = C.decodeFromRadio(fr2);
check('json text intact', dec2.text === env, dec2.text);
var parsed = JSON.parse(dec2.text);
check('parses back to envelope', parsed.tag === 'TRAINING-EXERCISE' && parsed.checkin === 'OK');

console.log('\n[4] Encrypted packet (no decoded) is reported, not faked');
var encMp = [].concat(PB.tag(1, 5), PB.fixed32(0xAABBCCDD), PB.tag(5, 2), PB.varint(3), [1, 2, 3]); // field 5 ~ encrypted
var frEnc = Uint8Array.from([].concat(PB.tag(2, 2), PB.varint(encMp.length), encMp));
var decE = C.decodeFromRadio(frEnc);
check('encrypted kind reported', decE.kind === 'encrypted', decE.kind);

console.log('\n[5] Stream framing round-trip + split chunks');
var payload = Uint8Array.from([10, 20, 30, 40, 50]);
var framed = C.frame(payload);
check('frame starts 0x94 0xC3', framed[0] === 0x94 && framed[1] === 0xC3);
check('frame length header', (framed[2] << 8 | framed[3]) === 5);
var got = [];
var df = new C.Deframer(function (p) { got.push(Array.from(p)); });
// feed in two split chunks to exercise buffering
df.push(framed.slice(0, 3));
df.push(framed.slice(3));
check('deframer recovers payload across chunks', JSON.stringify(got[0]) === JSON.stringify([10, 20, 30, 40, 50]), got);
// two frames back to back
got.length = 0;
var two = Uint8Array.from(Array.from(C.frame(Uint8Array.from([1, 2]))).concat(Array.from(C.frame(Uint8Array.from([3, 4, 5])))));
df.push(two);
check('deframer handles 2 concatenated frames', got.length === 2 && JSON.stringify(got[1]) === JSON.stringify([3, 4, 5]), got);

console.log('\n[6] Radio boundary is explicit and there is no frequency-tuning API');
check('frequency policy = 915 ISM only', /915 MHz ISM/.test(m.MeshtasticAdapter.FREQUENCY_POLICY));
check('policy forbids CAP/military', /Never CAP\/military/i.test(m.MeshtasticAdapter.FREQUENCY_POLICY));
var apiNames = Object.keys(m.MeshtasticAdapter).join(',');
check('no setFrequency/tune function exposed', !/setFrequency|tune|setFreq/i.test(apiNames), apiNames);

console.log('\n[7] MESH_STATE interface present for cap-coordination');
check('MESH_STATE.onMessage is a function', typeof m.MESH_STATE.onMessage === 'function');
var heard = null;
m.MESH_STATE.onMessage(function (t) { heard = t; });
m.MESH_STATE._emitText('{"tag":"TRAINING-EXERCISE"}');
check('onMessage delivers text', heard === '{"tag":"TRAINING-EXERCISE"}');
check('commsAdapter named mesh-lora', m.MeshtasticAdapter.commsAdapter.name === 'mesh-lora');

console.log('\n----------------------------------------');
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
