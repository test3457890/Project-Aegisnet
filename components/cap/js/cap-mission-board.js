/* ============================================================================
 * cap-mission-board.js
 * AegisNet / SkyMesh — CAP Field Coordination Module
 * Build 3: mission board (projectable command-post display)
 *
 * A fullscreen status board for projecting at an incident command post during a
 * CAP field exercise. Shows team status, positions WITH provenance, route
 * health, tasking/acks, receive-only airspace awareness, a Zulu mission clock,
 * and a persistent training disclaimer.
 *
 * The signature: every position shows HOW it was derived. Live GPS is green;
 * any estimate (dead reckoning, mesh, stale, manual) is amber and labeled. The
 * board never paints an estimate as a hard fix.
 *
 * HONESTY: this is situational awareness for TRAINING. It is not a certified
 * command-and-control system. The disclaimer footer is always visible.
 *
 * Sovereignty: first-party vanilla JS, zero foreign deps, system fonts only
 * (works offline on a projector). Reads from globals, all feature-detected.
 *
 * Exposes window.CAPBoard. Reads CAPMission, CAPCoordination, CAPPositioning,
 * CAPAccess, CAPRoomBridge, CommsRouter, MESH_STATE, MQTT, ADSB.
 * ==========================================================================*/

(function (global) {
  'use strict';

  var DISCLAIMER =
    'TRAINING PROTOTYPE · NOT CAP-APPROVED COMMS · SITUATIONAL AWARENESS ONLY · NOT FOR ACTUAL EMERGENCY USE';

  var CSS = '' +
  '.capboard{--bg:#0B1220;--panel:#121C2E;--panel2:#0F1828;--line:#243349;' +
  '--ink:#E8EEF6;--muted:#8A9BB4;--gps:#3FB950;--est:#E3A008;--down:#F05252;--accent:#3B82C4;' +
  'position:relative;background:var(--bg);color:var(--ink);' +
  'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
  'min-height:100vh;display:flex;flex-direction:column;letter-spacing:.01em;}' +
  '.capboard *{box-sizing:border-box;}' +
  '.cb-mono{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;}' +
  /* header */
  '.cb-head{display:flex;align-items:center;gap:18px;padding:14px 22px;' +
  'border-bottom:1px solid var(--line);background:linear-gradient(180deg,#16223a,#101a2c);}' +
  '.cb-eyebrow{font-size:11px;font-weight:700;letter-spacing:.22em;color:var(--est);' +
  'border:1px solid var(--est);border-radius:3px;padding:4px 9px;white-space:nowrap;}' +
  '.cb-mission{display:flex;flex-direction:column;line-height:1.15;}' +
  '.cb-mission b{font-size:20px;font-weight:650;}' +
  '.cb-mission span{font-size:12px;color:var(--muted);}' +
  '.cb-spacer{flex:1;}' +
  '.cb-clock{text-align:right;line-height:1.1;}' +
  '.cb-clock .z{font-size:26px;font-weight:600;}' +
  '.cb-clock .e{font-size:12px;color:var(--muted);}' +
  '.cb-badge{font-size:11px;color:var(--muted);border:1px solid var(--line);' +
  'border-radius:3px;padding:5px 9px;white-space:nowrap;}' +
  '.cb-badge b{color:var(--ink);}' +
  /* grid */
  '.cb-grid{flex:1;display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:1px;' +
  'background:var(--line);padding:1px;}' +
  '.cb-col{display:flex;flex-direction:column;gap:1px;background:var(--line);}' +
  '.cb-panel{background:var(--panel);padding:14px 16px;flex:1;min-height:0;overflow:auto;}' +
  '.cb-panel.tall{flex:2;}' +
  '.cb-ptitle{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;' +
  'letter-spacing:.16em;color:var(--muted);margin:0 0 12px;text-transform:uppercase;}' +
  '.cb-ptitle .rx{color:var(--accent);border:1px solid var(--accent);border-radius:3px;' +
  'font-size:9px;padding:2px 5px;letter-spacing:.12em;}' +
  /* team rows */
  '.cb-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;' +
  'padding:9px 0;border-bottom:1px solid var(--panel2);}' +
  '.cb-dot{width:9px;height:9px;border-radius:50%;background:var(--down);flex:none;' +
  'box-shadow:0 0 0 0 rgba(63,185,80,.5);}' +
  '.cb-dot.on{background:var(--gps);animation:cbpulse 2.6s infinite;}' +
  '@keyframes cbpulse{0%{box-shadow:0 0 0 0 rgba(63,185,80,.45);}70%{box-shadow:0 0 0 7px rgba(63,185,80,0);}100%{box-shadow:0 0 0 0 rgba(63,185,80,0);}}' +
  '.cb-id b{font-size:15px;}.cb-id span{font-size:11px;color:var(--muted);margin-left:7px;}' +
  '.cb-ci{font-size:11px;color:var(--muted);margin-top:2px;}' +
  '.cb-ci u{color:var(--ink);text-decoration:none;font-weight:600;}' +
  '.cb-pos{text-align:right;line-height:1.35;}' +
  '.cb-prov{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.06em;' +
  'border-radius:3px;padding:2px 6px;}' +
  '.cb-prov.gps{color:var(--gps);border:1px solid var(--gps);}' +
  '.cb-prov.est{color:var(--est);border:1px solid var(--est);}' +
  '.cb-prov.none{color:var(--muted);border:1px solid var(--line);}' +
  '.cb-coord{font-size:11px;color:var(--muted);margin-top:3px;}' +
  '.cb-coord.est{color:var(--est);}' +
  /* feeds */
  '.cb-feed{display:flex;flex-direction:column;gap:9px;}' +
  '.cb-item{border-left:2px solid var(--accent);padding:6px 0 6px 11px;}' +
  '.cb-item.ack{border-color:var(--gps);}' +
  '.cb-item .t{font-size:13px;}' +
  '.cb-item .m{font-size:11px;color:var(--muted);margin-top:2px;}' +
  /* routes */
  '.cb-route{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--panel2);}' +
  '.cb-rstate{font-size:10px;font-weight:700;letter-spacing:.08em;border-radius:3px;padding:2px 7px;}' +
  '.cb-rstate.up{color:var(--gps);border:1px solid var(--gps);}' +
  '.cb-rstate.down{color:var(--down);border:1px solid var(--down);}' +
  '.cb-rstate.unk{color:var(--muted);border:1px solid var(--line);}' +
  '.cb-route .nm{font-size:13px;}.cb-route .d{flex:1;}.cb-route .x{font-size:11px;color:var(--muted);}' +
  /* airspace */
  '.cb-air{display:flex;align-items:baseline;gap:10px;padding:7px 0;border-bottom:1px solid var(--panel2);}' +
  '.cb-air b{font-size:14px;}.cb-air span{font-size:11px;color:var(--muted);}' +
  '.cb-empty{font-size:12px;color:var(--muted);font-style:italic;padding:6px 0;}' +
  /* footer */
  '.cb-foot{display:flex;align-items:center;gap:14px;padding:11px 22px;' +
  'background:#1a1206;border-top:2px solid var(--est);}' +
  '.cb-foot .warn{color:var(--est);font-weight:700;font-size:12px;letter-spacing:.08em;flex:1;}' +
  '.cb-fs{background:transparent;color:var(--muted);border:1px solid var(--line);border-radius:4px;' +
  'padding:7px 13px;font-size:12px;cursor:pointer;font-family:inherit;}' +
  '.cb-fs:hover{color:var(--ink);border-color:var(--accent);}' +
  '.cb-fs:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}' +
  '@media (prefers-reduced-motion:reduce){.cb-dot.on{animation:none;}}' +
  '@media (max-width:860px){.cb-grid{grid-template-columns:1fr;}}';

  function injectCSS() {
    if (document.getElementById('capboard-css')) return;
    var s = document.createElement('style');
    s.id = 'capboard-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ---- tiny DOM helpers (textContent only; no untrusted innerHTML) --------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---- data readers (all feature-detected) --------------------------------
  function getMission() {
    var m = global.CAPMission;
    return (m && m.getMission && m.getMission()) || null;
  }
  function getTeam() {
    var c = global.CAPCoordination;
    return (c && c.getTeamStatus && c.getTeamStatus()) || [];
  }
  function getTierRole() {
    var a = global.CAPAccess;
    if (!a) return null;
    return { tier: a.getTier ? a.getTier() : null, role: a.getRole ? a.getRole() : null };
  }
  function getRoutes() {
    var routes = [];
    var ms = global.MESH_STATE;
    routes.push({ name: 'LoRa Mesh', state: ms ? (ms.connected ? 'up' : 'down') : 'unk',
                  detail: ms && ms.nodes ? (ms.nodes.length + ' nodes') : '' });
    if (global.MQTT) {
      routes.push({ name: 'MQTT Bridge',
        state: global.MQTT.isConnected ? (global.MQTT.isConnected() ? 'up' : 'down') : 'unk', detail: '' });
    }
    var rb = global.CAPRoomBridge;
    if (rb && rb.status) {
      var st = rb.status();
      routes.push({ name: 'Mission Room', state: st.bridged ? 'up' : 'down',
                    detail: st.transport || '' });
    }
    return routes;
  }
  function getQueue() {
    var r = global.CommsRouter;
    if (r && typeof r.queueStatus === 'function') return r.queueStatus();
    var q = (r && r.queue && r.queue.length) || 0;
    var f = (r && r.failed && r.failed.length) || 0;
    return { queued: q, failed: f };
  }
  function getAircraft() {
    var a = global.ADSB;
    if (a && typeof a.aircraft === 'function') return a.aircraft() || [];
    return null; // null = no receiver present
  }

  // ---- provenance badge mapping -------------------------------------------
  function provLabel(pos) {
    if (!pos || !pos.method) return { cls: 'none', label: '—', est: false };
    switch (pos.method) {
      case 'gnss':           return { cls: 'gps', label: 'GPS', est: false };
      case 'gnss_stale':     return { cls: 'est', label: 'GPS·STALE', est: true };
      case 'dead_reckoning': return { cls: 'est', label: 'EST·DR', est: true };
      case 'mesh_trilat':    return { cls: 'est', label: 'EST·MESH', est: true };
      case 'mesh_proximity': return { cls: 'est', label: 'EST·PROX', est: true };
      case 'manual':         return { cls: 'est', label: 'MANUAL', est: true };
      default:               return { cls: 'none', label: '—', est: false };
    }
  }

  // ---- time helpers --------------------------------------------------------
  function zulu(d) {
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) + 'Z';
  }
  function elapsed(startIso) {
    if (!startIso) return '--:--:--';
    var ms = Date.now() - new Date(startIso).getTime();
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(h) + ':' + p(m) + ':' + p(s % 60);
  }

  // ---- panels --------------------------------------------------------------
  function teamPanel() {
    var p = el('div', 'cb-panel tall');
    p.appendChild(el('div', 'cb-ptitle', 'Team Status'));
    var team = getTeam();
    if (!team.length) { p.appendChild(el('div', 'cb-empty', 'Awaiting team check-ins.')); return p; }
    team.forEach(function (t) {
      var row = el('div', 'cb-row');
      row.appendChild(el('span', 'cb-dot' + (t.online ? ' on' : '')));

      var mid = el('div');
      var idline = el('div', 'cb-id');
      var b = el('b'); b.textContent = t.callsign || t.nodeId; idline.appendChild(b);
      idline.appendChild(el('span', null, t.role || ''));
      mid.appendChild(idline);
      var ci = el('div', 'cb-ci');
      ci.appendChild(document.createTextNode('check-in '));
      var u = el('u'); u.textContent = t.checkinType || '—'; ci.appendChild(u);
      mid.appendChild(ci);
      row.appendChild(mid);

      var pos = el('div', 'cb-pos');
      var prov = provLabel(t.position);
      var pill = el('span', 'cb-mono cb-prov ' + prov.cls, prov.label);
      pos.appendChild(pill);
      if (t.position && t.position.lat != null) {
        var acc = t.position.accuracy != null ? (' ±' + Math.round(t.position.accuracy) + 'm') : '';
        var coord = el('div', 'cb-mono cb-coord' + (prov.est ? ' est' : ''),
          t.position.lat.toFixed(4) + ', ' + t.position.lon.toFixed(4) + acc);
        pos.appendChild(coord);
      } else {
        pos.appendChild(el('div', 'cb-coord', 'no position'));
      }
      row.appendChild(pos);
      p.appendChild(row);
    });
    return p;
  }

  function feedPanel(title, items) {
    var p = el('div', 'cb-panel');
    p.appendChild(el('div', 'cb-ptitle', title));
    if (!items.length) { p.appendChild(el('div', 'cb-empty', 'No tasking yet.')); return p; }
    var feed = el('div', 'cb-feed');
    items.slice(-6).reverse().forEach(function (it) {
      var item = el('div', 'cb-item' + (it.kind === 'ack' ? ' ack' : ''));
      item.appendChild(el('div', 't', it.text));
      item.appendChild(el('div', 'm', it.meta));
      feed.appendChild(item);
    });
    p.appendChild(feed);
    return p;
  }

  function routesPanel() {
    var p = el('div', 'cb-panel');
    p.appendChild(el('div', 'cb-ptitle', 'Link Health'));
    getRoutes().forEach(function (r) {
      var row = el('div', 'cb-route');
      row.appendChild(el('span', 'cb-mono cb-rstate ' + r.state,
        r.state === 'up' ? 'UP' : r.state === 'down' ? 'DOWN' : 'UNK'));
      var nm = el('div', 'd'); nm.appendChild(el('div', 'nm', r.name));
      if (r.detail) nm.appendChild(el('div', 'x', r.detail));
      row.appendChild(nm);
      p.appendChild(row);
    });
    var q = getQueue();
    var qrow = el('div', 'cb-route');
    qrow.appendChild(el('span', 'cb-mono x', 'QUEUE'));
    qrow.appendChild(el('div', 'd cb-mono', q.queued + ' queued · ' + q.failed + ' failed'));
    p.appendChild(qrow);
    return p;
  }

  function airspacePanel() {
    var p = el('div', 'cb-panel');
    var title = el('div', 'cb-ptitle', 'Airspace');
    title.appendChild(el('span', 'rx', 'RECEIVE ONLY'));
    p.appendChild(title);
    var air = getAircraft();
    if (air === null) {
      p.appendChild(el('div', 'cb-empty', 'No ADS-B receiver connected. Receive-only when present.'));
      return p;
    }
    if (!air.length) { p.appendChild(el('div', 'cb-empty', 'No aircraft in range.')); return p; }
    air.slice(0, 8).forEach(function (a) {
      var row = el('div', 'cb-air');
      var b = el('b', 'cb-mono'); b.textContent = a.callsign || a.icao || '----'; row.appendChild(b);
      var meta = [];
      if (a.alt != null) meta.push(a.alt + 'ft');
      if (a.dist != null) meta.push(a.dist + 'nm');
      if (a.bearing != null) meta.push(a.bearing + '\u00B0');
      row.appendChild(el('span', 'cb-mono', meta.join('  ')));
      p.appendChild(row);
    });
    return p;
  }

  // ---- board state ---------------------------------------------------------
  var root = null, clockTimer = null, pollTimer = null, unsubs = [];
  var tasking = []; // {kind, text, meta}

  function rebuild() {
    if (!root) return;
    var mission = getMission();
    root.textContent = '';

    // header
    var head = el('div', 'cb-head');
    head.appendChild(el('span', 'cb-eyebrow', 'TRAINING EXERCISE'));
    var mis = el('div', 'cb-mission');
    var mb = el('b'); mb.textContent = mission ? (mission.missionName || mission.missionId) : 'No active mission';
    mis.appendChild(mb);
    mis.appendChild(el('span', null, mission ? ('MISSION ' + mission.missionId + '  ·  ' + (mission.teamRole || '')) : 'Activate a mission profile to begin'));
    head.appendChild(mis);
    head.appendChild(el('div', 'cb-spacer'));

    var tr = getTierRole();
    if (tr) {
      var badge = el('div', 'cb-badge');
      badge.appendChild(document.createTextNode('TIER '));
      var tb = el('b'); tb.textContent = (tr.tier == null ? '—' : tr.tier); badge.appendChild(tb);
      badge.appendChild(document.createTextNode('  ·  ' + (tr.role || '—')));
      head.appendChild(badge);
    }
    var clock = el('div', 'cb-clock');
    clock.appendChild(el('div', 'z cb-mono', zulu(new Date())));
    clock.appendChild(el('div', 'e cb-mono', 'T+ ' + (mission ? elapsed(mission.missionStartTime) : '--:--:--')));
    head.appendChild(clock);
    root.appendChild(head);

    // grid
    var grid = el('div', 'cb-grid');
    grid.appendChild(teamPanel());

    var midCol = el('div', 'cb-col');
    midCol.appendChild(feedPanel('Tasking & Acks', tasking));
    midCol.appendChild(routesPanel());
    grid.appendChild(midCol);

    var rightCol = el('div', 'cb-col');
    rightCol.appendChild(airspacePanel());
    grid.appendChild(rightCol);
    root.appendChild(grid);

    // footer (persistent disclaimer)
    var foot = el('div', 'cb-foot');
    foot.appendChild(el('div', 'warn', DISCLAIMER));
    var fs = el('button', 'cb-fs', 'Fullscreen');
    fs.addEventListener('click', CAPBoard.fullscreen);
    foot.appendChild(fs);
    root.appendChild(foot);
  }

  function onTasking(env) {
    tasking.push({ kind: 'tasking',
      text: (env && env.text) || 'Tasking', meta: 'from ' + ((env && env.callsign) || '?') + ' → ' + ((env && env.to) || 'ALL') });
    rebuild();
  }
  function onAck(env) {
    tasking.push({ kind: 'ack', text: 'ACK ' + ((env && env.ref) || ''),
      meta: 'from ' + ((env && env.callsign) || '?') });
    rebuild();
  }

  // ---- public API ----------------------------------------------------------
  var CAPBoard = {
    render: function (target) {
      injectCSS();
      if (typeof target === 'string') target = document.getElementById(target);
      if (!target) { target = el('div'); document.body.appendChild(target); }
      root = el('div', 'capboard');
      target.appendChild(root);
      CAPBoard.start();
      return root;
    },

    start: function () {
      rebuild();
      if (!clockTimer) clockTimer = setInterval(function () {
        // light clock-only tick handled by full rebuild for simplicity at 1s
        rebuild();
      }, 1000);
      var c = global.CAPCoordination;
      if (c && typeof c.on === 'function' && !unsubs.length) {
        unsubs.push(c.on('tasking', onTasking));
        unsubs.push(c.on('ack', onAck));
        unsubs.push(c.on('checkin', rebuild));
        unsubs.push(c.on('position', rebuild));
        unsubs.push(c.on('node_offline', rebuild));
      }
    },

    stop: function () {
      if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      unsubs.forEach(function (u) { try { u(); } catch (e) {} });
      unsubs = [];
    },

    refresh: rebuild,

    fullscreen: function () {
      if (!root) return;
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      if (root.requestFullscreen) root.requestFullscreen();
    },

    _seedTasking: function (arr) { tasking = arr || []; rebuild(); }
  };

  global.CAPBoard = CAPBoard;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CAPBoard: CAPBoard, provLabel: provLabel, DISCLAIMER: DISCLAIMER };
  }

})(typeof window !== 'undefined' ? window : globalThis);
