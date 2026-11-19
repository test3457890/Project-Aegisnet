/* ============================================================
   AegisNet Expansion Layer — test-mode.js
   NJ–AZ bridge test mode. Tracks latency, queue, retry,
   delivery, position packets, team node visibility.
   Exports as JSON, CSV, and plain text.
   ============================================================ */
"use strict";

window.TestMode = (function() {
  const _log = [];
  let _active = false;
  let _session = null;
  let _pingInterval = null;

  function _newSession(nodeA, nodeB, broker) {
    return {
      sessionId:   "test-" + Date.now().toString(36),
      startedAt:   new Date().toISOString(),
      endedAt:     null,
      nodeA, nodeB, broker,
      topic:       `msh/US/2/json/LongFast/#`,
      mqttConnected: false,
      pings: [],         // [{ts, sentAt, receivedAt, latencyMs, status}]
      failedSends:   0,
      queuedMsgs:    0,
      retriedMsgs:   0,
      deliveredMsgs: 0,
      positionReceived: false,
      teamNodeVisible:  false,
      adapterSummary:   {},
      browserClient:    navigator.userAgent.slice(0, 60),
      events: []
    };
  }

  function start(opts = {}) {
    if (_active) stop();
    _active = true;
    _session = _newSession(
      opts.nodeA || "NJ Node",
      opts.nodeB || "AZ Node",
      opts.broker || (window.SOURCES?.CFG?.mqttSelfHost || "mqtt.meshtastic.org")
    );
    _event("TEST_START", `NJ–AZ bridge test started. A=${_session.nodeA} B=${_session.nodeB}`);
    _snapshot();
    // Wire into CommsRouter delivery updates
    window.CommsRouter?.on("deliveryUpdate", rec => {
      if (!_active) return;
      if (rec.status === "failed")    { _session.failedSends++;   _event("FAIL",    "Delivery failed: " + rec.msgId); }
      if (rec.status === "queued")    { _session.queuedMsgs++;    _event("QUEUED",  "Queued: " + rec.msgId); }
      if (rec.status === "delivered") { _session.deliveredMsgs++; _event("DELIVER", "Delivered via " + rec.adapterId); }
    });
    // Wire into MESH_STATE for position and team nodes
    const origNode = window.MESH_STATE?.onNodeUpdate;
    window.MESH_STATE && (window.MESH_STATE.onNodeUpdate = () => {
      origNode?.();
      if (!_active || !_session) return;
      if ((window.MESH_STATE.nodes || []).length > 0) {
        _session.teamNodeVisible = true;
        _event("NODE_SEEN", `Team node visible: ${window.MESH_STATE.nodes.map(n=>n.name||n.id).join(", ")}`);
      }
    });
    // Start ping loop
    _pingInterval = setInterval(_sendPing, opts.pingIntervalMs || 15000);
    _sendPing();
    return _session.sessionId;
  }

  async function _sendPing() {
    if (!_active || !_session) return;
    _snapshot();
    const pingId = "ping-" + Date.now().toString(36);
    const sentAt = Date.now();
    const ping = { ts: sentAt, pingId, sentAt, receivedAt: null, latencyMs: null, status: "pending" };
    _session.pings.push(ping);
    _event("PING_SENT", `Ping ${pingId}`);
    try {
      const result = await window.CommsRouter?.send({
        id: pingId, type: "text",
        text: `AEGISNET-PING ${pingId} from ${_session.nodeA} to ${_session.nodeB}`,
        ts: sentAt
      });
      if (result?.delivered) {
        ping.status = "delivered";
        ping.receivedAt = Date.now();
        ping.latencyMs = ping.receivedAt - ping.sentAt;
        _event("PING_ACK", `Ping ${pingId} delivered via ${result.adapter} in ${ping.latencyMs}ms`);
      } else if (result?.queued) {
        ping.status = "queued";
        _event("PING_QUEUED", `Ping ${pingId} queued — no route`);
      }
    } catch (e) {
      ping.status = "failed";
      _event("PING_FAIL", `Ping ${pingId} failed: ${e.message}`);
    }
  }

  function _snapshot() {
    if (!_session) return;
    _session.mqttConnected = window.MESH_STATE?.connected ?? false;
    const adapters = window.CommsRouter?.getAll() || [];
    _session.adapterSummary = Object.fromEntries(adapters.map(a => [a.id, a.status]));
    // Check for queued retries
    const qSize = window.CommsRouter?.queue.size() || 0;
    if (qSize > _session.queuedMsgs) _session.retriedMsgs++;
  }

  function _event(type, msg) {
    const ev = { ts: new Date().toISOString(), type, msg };
    _session?.events.push(ev);
    _log.push(ev);
    renderTestPanel();
  }

  function stop() {
    _active = false;
    clearInterval(_pingInterval);
    _pingInterval = null;
    if (_session) { _session.endedAt = new Date().toISOString(); _event("TEST_END", "Test stopped"); }
    renderTestPanel();
  }

  function isActive() { return _active; }
  function getSession() { return _session ? { ..._session } : null; }

  /* ── stats summary ── */
  function summary() {
    if (!_session) return null;
    const pings = _session.pings;
    const delivered = pings.filter(p => p.status === "delivered");
    const latencies = delivered.map(p => p.latencyMs).filter(Boolean);
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a,b)=>a+b,0) / latencies.length) : null;
    return {
      nodeA: _session.nodeA,
      nodeB: _session.nodeB,
      broker: _session.broker,
      mqttConnected: _session.mqttConnected,
      pingSent: pings.length,
      pingDelivered: delivered.length,
      pingFailed: pings.filter(p => p.status === "failed").length,
      pingQueued: pings.filter(p => p.status === "queued").length,
      avgLatencyMs: avgLatency,
      minLatencyMs: latencies.length ? Math.min(...latencies) : null,
      maxLatencyMs: latencies.length ? Math.max(...latencies) : null,
      failedSends: _session.failedSends,
      queuedMsgs: _session.queuedMsgs,
      retriedMsgs: _session.retriedMsgs,
      deliveredMsgs: _session.deliveredMsgs,
      positionReceived: _session.positionReceived,
      teamNodeVisible: _session.teamNodeVisible,
      adapterSummary: _session.adapterSummary,
      browserClient: _session.browserClient,
      startedAt: _session.startedAt,
      endedAt: _session.endedAt || new Date().toISOString(),
      eventCount: _session.events.length
    };
  }

  /* ── exports ── */
  function exportJSON() {
    const data = { session: _session, summary: summary(), exportedAt: new Date().toISOString() };
    _dl(JSON.stringify(data, null, 2), `aegisnet-test-${_session?.sessionId || "log"}.json`, "application/json");
  }

  function exportCSV() {
    const pings = _session?.pings || [];
    const rows = ["pingId,sentAt,status,latencyMs,adapter"];
    for (const p of pings) rows.push(`${p.pingId},${new Date(p.sentAt).toISOString()},${p.status},${p.latencyMs||""},`);
    _dl(rows.join("\n"), `aegisnet-test-pings.csv`, "text/csv");
  }

  function exportText() {
    const s = summary();
    if (!s) { _dl("No test session active.", "aegisnet-test.txt", "text/plain"); return; }
    const lines = [
      "AegisNet NJ–AZ Bridge Test Report",
      "=================================",
      `Session:       ${_session?.sessionId}`,
      `Node A:        ${s.nodeA}`,
      `Node B:        ${s.nodeB}`,
      `Broker:        ${s.broker}`,
      `MQTT:          ${s.mqttConnected ? "CONNECTED" : "DISCONNECTED"}`,
      `Started:       ${s.startedAt}`,
      `Ended:         ${s.endedAt}`,
      "",
      "Ping Results",
      "------------",
      `Sent:          ${s.pingSent}`,
      `Delivered:     ${s.pingDelivered}`,
      `Failed:        ${s.pingFailed}`,
      `Queued:        ${s.pingQueued}`,
      `Avg latency:   ${s.avgLatencyMs != null ? s.avgLatencyMs + "ms" : "N/A"}`,
      `Min latency:   ${s.minLatencyMs != null ? s.minLatencyMs + "ms" : "N/A"}`,
      `Max latency:   ${s.maxLatencyMs != null ? s.maxLatencyMs + "ms" : "N/A"}`,
      "",
      "Message Queue",
      "-------------",
      `Total queued:  ${s.queuedMsgs}`,
      `Total retried: ${s.retriedMsgs}`,
      `Total delivered: ${s.deliveredMsgs}`,
      "",
      "Team & Mesh",
      "-----------",
      `Position rcvd: ${s.positionReceived ? "YES" : "NO"}`,
      `Team node seen:${s.teamNodeVisible ? "YES" : "NO"}`,
      "",
      "Adapter Status",
      "--------------",
      ...Object.entries(s.adapterSummary).map(([k,v]) => `  ${k}: ${v}`),
      "",
      "Event Log",
      "---------",
      ...(_session?.events || []).map(e => `[${e.ts.slice(11,19)}Z] ${e.type}: ${e.msg}`),
      "",
      `Browser: ${s.browserClient}`,
      "",
      "PROTOTYPE TEST LOG — Not for emergency use.",
      "Send this file to your team for review.",
    ];
    _dl(lines.join("\n"), `aegisnet-test-report.txt`, "text/plain");
  }

  function _dl(content, name, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  return { start, stop, isActive, getSession, summary, exportJSON, exportCSV, exportText };
})();

/* ── test panel renderer ── */
window.renderTestPanel = function() {
  const el = document.getElementById("testModePanel"); if (!el) return;
  const s = window.TestMode.summary();
  const active = window.TestMode.isActive();
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <div style="font-family:var(--disp);font-weight:700;font-size:15px;color:var(--bright)">NJ–AZ BRIDGE TEST</div>
      <span style="font-size:10px;border:1px solid ${active?"var(--green)":"var(--line)"};border-radius:2px;padding:2px 7px;color:${active?"var(--green)":"var(--dim)"};">${active?"RUNNING":"IDLE"}</span>
    </div>
    ${!active && !s ? `
      <div style="font-size:12px;color:var(--dim);margin-bottom:12px">Configure nodes and start a test session.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <input id="testNodeA" placeholder="Node A name (NJ)" value="NJ Node" style="flex:1;min-width:120px;background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:6px 9px;border-radius:3px;font-size:12px">
        <input id="testNodeB" placeholder="Node B name (AZ)" value="AZ Node" style="flex:1;min-width:120px;background:var(--panel2);border:1px solid var(--line);color:var(--txt);font-family:var(--mono);padding:6px 9px;border-radius:3px;font-size:12px">
      </div>
      <button class="btn" style="background:rgba(91,207,142,.1);border-color:#1F6355;color:var(--green)" onclick="TestMode.start({nodeA:document.getElementById('testNodeA').value,nodeB:document.getElementById('testNodeB').value})">START TEST</button>
    ` : s ? `
      <div style="font-size:12px;line-height:2;color:var(--dim);margin-bottom:10px">
        <span style="color:var(--txt)">${s.nodeA}</span> ↔ <span style="color:var(--txt)">${s.nodeB}</span>
        via <span style="color:var(--cyan)">${s.broker}</span>
        · MQTT <span style="color:${s.mqttConnected?"var(--green)":"var(--red)"}">${s.mqttConnected?"CONNECTED":"DISCONNECTED"}</span>
        <br>
        Pings: <b style="color:var(--txt)">${s.pingSent}</b> sent
        · <b style="color:var(--green)">${s.pingDelivered}</b> delivered
        · <b style="color:var(--red)">${s.pingFailed}</b> failed
        · avg <b style="color:var(--cyan)">${s.avgLatencyMs != null ? s.avgLatencyMs+"ms" : "—"}</b>
        <br>
        Queue: <b style="color:var(--txt)">${s.queuedMsgs}</b>
        · Retried: <b style="color:var(--txt)">${s.retriedMsgs}</b>
        · Team node: <b style="color:${s.teamNodeVisible?"var(--green)":"var(--dim)"}">${s.teamNodeVisible?"VISIBLE":"NOT SEEN"}</b>
      </div>
      <div class="btnRow" style="flex-wrap:wrap">
        ${active ? '<button class="btn danger" onclick="TestMode.stop()">STOP TEST</button>' : ""}
        <button class="btn" onclick="TestMode.exportJSON()">JSON</button>
        <button class="btn" onclick="TestMode.exportCSV()">CSV</button>
        <button class="btn" onclick="TestMode.exportText()">TEXT REPORT</button>
      </div>
    ` : ""}`;
};

// Initial render
setTimeout(renderTestPanel, 500);
