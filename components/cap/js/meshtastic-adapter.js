/* ============================================================================
 * meshtastic-adapter.js
 * AegisNet / SkyMesh — CAP Field Coordination Module
 * Transport: Meshtastic LoRa radio  (the working radio for this system)
 *
 * RADIO BOUNDARY — NON-NEGOTIABLE:
 *   This adapter speaks ONLY to a Meshtastic device on the 915 MHz ISM band
 *   (FCC Part 15, license-free, US region US915). It NEVER interfaces with,
 *   transmits on, or bridges to CAP, military, aviation, marine, or any
 *   public-safety radio. It cannot: it only talks to a Meshtastic node over
 *   USB serial, the device IP/HTTP API, or BLE. The frequency is whatever the
 *   Meshtastic firmware is configured for (must be US915). There is no function
 *   here that tunes an arbitrary frequency.
 *
 * What this provides to the CAP modules:
 *   - window.MESH_STATE { connected, nodes, onMessage } — inbound text frames
 *   - sendText() / a CommsRouter adapter named 'mesh-lora' — outbound
 *   CAP coordination envelopes (JSON text, TRAINING-tagged) ride over LoRa.
 *
 * Protobuf field numbers below are from the official meshtastic/protobufs
 * schema (mesh.proto, portnums.proto). The minimal text/position/nodeinfo
 * codec is round-trip tested against itself; validate against a real device
 * before operational use.
 *
 * Sovereignty: first-party vanilla JS, zero foreign deps. Meshtastic is
 * open-source; LoRa silicon (Semtech) is US.
 * ==========================================================================*/

(function (global) {
  'use strict';

  // PortNum (portnums.proto)
  var PORT = { TEXT: 1, POSITION: 3, NODEINFO: 4 };
  var BROADCAST_ADDR = 0xFFFFFFFF;

  // ------------------------------------------------------------------------
  // Minimal protobuf wire-format codec
  // ------------------------------------------------------------------------
  var PB = {
    varint: function (n) {
      var b = []; n = n >>> 0;
      do { var x = n & 0x7f; n = n >>> 7; if (n) x |= 0x80; b.push(x); } while (n);
      return b;
    },
    readVarint: function (buf, i) {
      var shift = 0, result = 0, byte;
      do { byte = buf[i++]; result += (byte & 0x7f) * Math.pow(2, shift); shift += 7; }
      while (byte & 0x80);
      return { value: result, next: i };
    },
    fixed32: function (n) { n = n >>> 0; return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]; },
    tag: function (field, wtype) { return PB.varint((field << 3) | wtype); },

    // Walk one message level into {field, wtype, value}. value is a number
    // (varint/fixed32) or a Uint8Array (length-delimited).
    readFields: function (buf) {
      var i = 0, out = [];
      while (i < buf.length) {
        var t = PB.readVarint(buf, i); i = t.next;
        var field = Math.floor(t.value / 8), wtype = t.value & 7;
        if (wtype === 0) { var v = PB.readVarint(buf, i); out.push({ field: field, wtype: 0, value: v.value }); i = v.next; }
        else if (wtype === 5) { var v32 = (buf[i] | (buf[i + 1] << 8) | (buf[i + 2] << 16) | (buf[i + 3] << 24)) >>> 0; out.push({ field: field, wtype: 5, value: v32 }); i += 4; }
        else if (wtype === 1) { out.push({ field: field, wtype: 1, value: null }); i += 8; }
        else if (wtype === 2) { var ln = PB.readVarint(buf, i); i = ln.next; out.push({ field: field, wtype: 2, value: buf.slice(i, i + ln.value) }); i += ln.value; }
        else break;
      }
      return out;
    },
    find: function (fields, f) {
      for (var k = 0; k < fields.length; k++) if (fields[k].field === f) return fields[k].value;
      return null;
    }
  };

  function utf8(s) { return Array.from(new TextEncoder().encode(s)); }
  function fromUtf8(bytes) { return new TextDecoder().decode(Uint8Array.from(bytes)); }

  // ------------------------------------------------------------------------
  // Encode a text message as a ToRadio packet
  //   ToRadio.packet(1) = MeshPacket{ to(2,fixed32), channel(3,varint),
  //                                   decoded(4) = Data{ portnum(1), payload(2) } }
  // ------------------------------------------------------------------------
  function encodeData(portnum, payloadBytes) {
    return [].concat(
      PB.tag(1, 0), PB.varint(portnum),
      PB.tag(2, 2), PB.varint(payloadBytes.length), payloadBytes
    );
  }
  function encodeMeshPacket(toAddr, channel, dataBytes) {
    var out = [].concat(PB.tag(2, 5), PB.fixed32(toAddr));
    if (channel) out = out.concat(PB.tag(3, 0), PB.varint(channel));
    out = out.concat(PB.tag(4, 2), PB.varint(dataBytes.length), dataBytes);
    return out;
  }
  function encodeToRadioText(text, toAddr, channel) {
    var data = encodeData(PORT.TEXT, utf8(text));
    var mp = encodeMeshPacket((toAddr == null ? BROADCAST_ADDR : toAddr) >>> 0, channel || 0, data);
    return Uint8Array.from([].concat(PB.tag(1, 2), PB.varint(mp.length), mp));
  }

  // Decode a FromRadio packet to a friendly shape.
  //   FromRadio.packet(2) = MeshPacket{ from(1,fixed32), decoded(4)=Data{...} }
  function decodeFromRadio(buf) {
    var top = PB.readFields(buf);
    var packet = PB.find(top, 2);
    if (!packet) return { kind: 'other' };
    var mp = PB.readFields(packet);
    var from = PB.find(mp, 1);
    var decoded = PB.find(mp, 4);
    if (!decoded) return { kind: 'encrypted', from: from }; // radio handles PSK
    var d = PB.readFields(decoded);
    var portnum = PB.find(d, 1) || 0;
    var payload = PB.find(d, 2);
    if (portnum === PORT.TEXT) return { kind: 'text', from: from, text: fromUtf8(payload || []) };
    if (portnum === PORT.POSITION) return { kind: 'position', from: from, raw: payload };
    if (portnum === PORT.NODEINFO) return { kind: 'nodeinfo', from: from, raw: payload };
    return { kind: 'other', from: from, portnum: portnum };
  }

  // ------------------------------------------------------------------------
  // Stream framing (serial/TCP): 0x94 0xC3 <len_hi> <len_lo> <payload>
  // (HTTP transport returns raw FromRadio with no framing.)
  // ------------------------------------------------------------------------
  function frame(payload) {
    var len = payload.length;
    return Uint8Array.from([0x94, 0xC3, (len >>> 8) & 0xff, len & 0xff].concat(Array.from(payload)));
  }
  function Deframer(onPayload) {
    this.buf = []; this.onPayload = onPayload;
  }
  Deframer.prototype.push = function (chunk) {
    for (var i = 0; i < chunk.length; i++) this.buf.push(chunk[i]);
    while (true) {
      // find start marker
      while (this.buf.length >= 2 && !(this.buf[0] === 0x94 && this.buf[1] === 0xC3)) this.buf.shift();
      if (this.buf.length < 4) return;
      var len = (this.buf[2] << 8) | this.buf[3];
      if (this.buf.length < 4 + len) return;
      var payload = this.buf.slice(4, 4 + len);
      this.buf = this.buf.slice(4 + len);
      this.onPayload(Uint8Array.from(payload));
    }
  };

  // ------------------------------------------------------------------------
  // MESH_STATE the CAP modules read (cap-coordination subscribes to onMessage)
  // ------------------------------------------------------------------------
  var handlers = [];
  var MESH_STATE = {
    connected: false,
    nodes: [],
    onMessage: function (cb) { handlers.push(cb); return function () { var i = handlers.indexOf(cb); if (i >= 0) handlers.splice(i, 1); }; },
    _emitText: function (text) { handlers.forEach(function (h) { try { h(text); } catch (e) {} }); }
  };

  function onFromRadio(buf) {
    var msg = decodeFromRadio(buf);
    if (msg.kind === 'text') {
      MESH_STATE._emitText(msg.text); // cap-coordination JSON.parses + filters by tag
    } else if (msg.kind === 'nodeinfo') {
      if (msg.from != null && !MESH_STATE.nodes.some(function (n) { return n.id === msg.from; })) {
        MESH_STATE.nodes.push({ id: msg.from });
      }
    }
  }

  // ------------------------------------------------------------------------
  // Transports (feature-detected)
  // ------------------------------------------------------------------------
  var transport = null, transportKind = null;

  var Serial = {
    port: null, writer: null, reader: null, deframer: null, reading: false,
    available: function () { return typeof navigator !== 'undefined' && navigator.serial; },
    connect: function () {
      Serial.deframer = new Deframer(onFromRadio);
      return navigator.serial.requestPort().then(function (p) {
        Serial.port = p; return p.open({ baudRate: 115200 });
      }).then(function () {
        Serial.writer = Serial.port.writable.getWriter();
        Serial.reader = Serial.port.readable.getReader();
        Serial.reading = true; Serial._loop();
        return true;
      });
    },
    _loop: function () {
      Serial.reader.read().then(function (res) {
        if (res.value) Serial.deframer.push(res.value);
        if (!res.done && Serial.reading) Serial._loop();
      }).catch(function () {});
    },
    send: function (payload) { if (Serial.writer) Serial.writer.write(frame(payload)); },
    disconnect: function () { Serial.reading = false; if (Serial.reader) Serial.reader.cancel(); if (Serial.writer) Serial.writer.releaseLock(); if (Serial.port) Serial.port.close(); }
  };

  // Device HTTP API: PUT /api/v1/toradio (raw ToRadio), GET /api/v1/fromradio (raw FromRadio).
  var Http = {
    base: null, polling: false,
    connect: function (baseUrl) { Http.base = baseUrl.replace(/\/$/, ''); Http.polling = true; Http._poll(); return Promise.resolve(true); },
    _poll: function () {
      if (!Http.polling) return;
      fetch(Http.base + '/api/v1/fromradio?all=false', { method: 'GET' })
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (ab) { var b = new Uint8Array(ab); if (b.length) onFromRadio(b); })
        .catch(function () {})
        .then(function () { setTimeout(Http._poll, 1000); });
    },
    send: function (payload) {
      fetch(Http.base + '/api/v1/toradio', { method: 'PUT',
        headers: { 'Content-Type': 'application/x-protobuf' }, body: payload }).catch(function () {});
    },
    disconnect: function () { Http.polling = false; }
  };

  // BLE scaffold. Service UUID is the documented Meshtastic service; confirm
  // the ToRadio/FromRadio/FromNum characteristic UUIDs against the device.
  var Ble = {
    SERVICE: '6ba1b218-15a8-461f-9fa8-5dcae273eafd',
    available: function () { return typeof navigator !== 'undefined' && navigator.bluetooth; },
    connect: function () {
      return Promise.reject(new Error(
        'BLE scaffold present. Confirm ToRadio/FromRadio characteristic UUIDs for the device firmware, then wire write/notify. Use serial or http transport meanwhile.'));
    },
    send: function () {}, disconnect: function () {}
  };

  // ------------------------------------------------------------------------
  // Public adapter
  // ------------------------------------------------------------------------
  var MeshtasticAdapter = {
    PORT: PORT,
    FREQUENCY_POLICY: 'Meshtastic LoRa 915 MHz ISM (US915), FCC Part 15. Never CAP/military/aviation/marine/public-safety radio.',

    // opts: { transport: 'serial'|'http'|'ble', url?, channel? }
    connect: function (opts) {
      opts = opts || {};
      transportKind = opts.transport || (Serial.available() ? 'serial' : 'http');
      MeshtasticAdapter.channel = opts.channel || 0;
      var p;
      if (transportKind === 'serial') { transport = Serial; p = Serial.connect(); }
      else if (transportKind === 'http') { transport = Http; p = Http.connect(opts.url || 'http://meshtastic.local'); }
      else { transport = Ble; p = Ble.connect(); }
      return Promise.resolve(p).then(function () {
        MESH_STATE.connected = true;
        return { connected: true, transport: transportKind, policy: MeshtasticAdapter.FREQUENCY_POLICY };
      });
    },

    disconnect: function () { if (transport) transport.disconnect(); MESH_STATE.connected = false; },

    // Send a text payload (CAP envelopes are JSON strings) over LoRa.
    sendText: function (text, toAddr) {
      if (!transport || !MESH_STATE.connected) return false;
      transport.send(encodeToRadioText(text, toAddr, MeshtasticAdapter.channel));
      return true;
    },

    // CommsRouter adapter the existing AegisNet router can register.
    commsAdapter: {
      name: 'mesh-lora',
      isAvailable: function () { return MESH_STATE.connected; },
      send: function (envelope) { return MeshtasticAdapter.sendText(JSON.stringify(envelope)); }
    },

    // Register with an existing CommsRouter if it supports it.
    register: function () {
      var r = global.CommsRouter;
      if (r && typeof r.registerAdapter === 'function') { r.registerAdapter(MeshtasticAdapter.commsAdapter); return true; }
      return false;
    },

    // Exposed for tests / advanced use.
    _codec: { encodeToRadioText: encodeToRadioText, decodeFromRadio: decodeFromRadio,
              encodeMeshPacket: encodeMeshPacket, encodeData: encodeData,
              frame: frame, Deframer: Deframer, PB: PB, PORT: PORT }
  };

  global.MESH_STATE = global.MESH_STATE || MESH_STATE;
  global.MeshtasticAdapter = MeshtasticAdapter;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MeshtasticAdapter: MeshtasticAdapter, MESH_STATE: MESH_STATE };
  }

})(typeof window !== 'undefined' ? window : globalThis);
