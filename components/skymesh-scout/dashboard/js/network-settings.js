/* ============================================================
   AegisNet P4.3 — network-settings.js
   Transport mode engine, kill switch, split tunnel,
   IPv6, DNS settings. Wired directly into CommsRouter.

   Transport modes change route priority order in CommsRouter.
   Disabling a route marks it blocked in the router.
   Kill switch queues messages instead of using blocked routes.
   ============================================================ */
"use strict";

/* ══════════════════════════════════════════════
   TRANSPORT MODE DEFINITIONS
   Priority order: index 0 = highest priority
══════════════════════════════════════════════ */
const TRANSPORT_MODES = {
  smart: {
    id: "smart",
    label: "Smart",
    description: "Auto-selects the best route based on message type, bandwidth, latency, and health.",
    priority: ["local","internet","p2p","tunnel","mesh_mqtt","mesh_local","radio","tor","satellite"],
    blockMedia: false,
    torAllowed: false,   // tor only activates if user also enables it separately
    fieldMode: false
  },
  speed: {
    id: "speed",
    label: "Speed",
    description: "Prefers fast routes. Best for voice, video, and images when bandwidth is available.",
    priority: ["local","internet","p2p","tunnel","mesh_mqtt","radio","satellite","mesh_local","tor"],
    blockMedia: false,
    torAllowed: false,
    fieldMode: false
  },
  reliability: {
    id: "reliability",
    label: "Reliability",
    description: "Prioritizes stable delivery and queue recovery. Best for unattended nodes.",
    priority: ["local","mesh_mqtt","tunnel","internet","p2p","mesh_local","radio","satellite","tor"],
    blockMedia: false,
    torAllowed: false,
    fieldMode: false
  },
  restricted: {
    id: "restricted",
    label: "Restricted Network",
    description: "For networks that block normal traffic. May use alternative ports or Tor fallback for text only.",
    priority: ["local","tunnel","tor","mesh_mqtt","mesh_local","radio","internet","p2p","satellite"],
    blockMedia: false,
    torAllowed: true,    // tor is available in this mode IF user enables it
    fieldMode: false
  },
  field: {
    id: "field",
    label: "Offline / Field",
    description: "Low-bandwidth operation. Text, check-ins, alerts, and queued messages only.",
    priority: ["local","mesh_mqtt","mesh_local","radio","tor","tunnel","satellite","internet","p2p"],
    blockMedia: true,
    torAllowed: false,
    fieldMode: true
  }
};

/* ══════════════════════════════════════════════
   NETWORK SETTINGS STATE
══════════════════════════════════════════════ */
window.NetworkSettings = (function() {
  let _mode         = "smart";
  let _killSwitch   = false;
  let _approvedAdapters = new Set(["local","internet","p2p","mesh_mqtt","mesh_local","radio","satellite"]);
  let _disabledAdapters = new Set();   // user-disabled routes
  let _torEnabled   = false;
  let _lanEnabled   = true;
  let _mqttEnabled  = true;
  let _tunnelEnabled = false;
  let _radioEnabled = true;
  let _satEnabled   = true;
  let _meshEnabled  = true;
  let _blockMediaOnLowBW = true;
  let _ipv6Enabled  = false;
  let _ipv6LeakProt = true;
  let _customDns    = ["", ""];
  let _splitRules   = [];   // [{adapterId, allowedTypes:[]}]
  let _listeners    = [];

  function _notify() {
    _listeners.forEach(fn => { try { fn(getState()); } catch {} });
    window.p4_3RefreshNetworkUI?.();
  }

  /* ── apply mode to CommsRouter priority ── */
  function _applyMode(modeId) {
    const mode = TRANSPORT_MODES[modeId];
    if (!mode) return;
    /* Re-order the ADAPTER_PRIORITY array in CommsRouter */
    if (window.CommsRouter && window.CommsRouter._adapters) {
      /* Override bestAdapter() to respect our priority */
      window.CommsRouter._modePriority = mode.priority;
    }
    /* Field mode auto-enables low-bandwidth */
    if (mode.fieldMode) {
      window.CommsRouter?.setLowBandwidth(true);
    }
    /* Update kill switch awareness */
    if (_killSwitch) {
      window.CommsRouter._killSwitch = true;
      window.CommsRouter._approvedAdapters = _approvedAdapters;
    }
  }

  /* ── patch CommsRouter.bestAdapter to respect mode priority ── */
  function _patchRouter() {
    const router = window.CommsRouter;
    if (!router || router._p43patched) return;
    router._p43patched = true;
    router._modePriority = TRANSPORT_MODES[_mode].priority;
    router._killSwitch   = false;
    router._approvedAdapters = _approvedAdapters;
    router._disabledAdapters = _disabledAdapters;

    const origBest = router.bestAdapter.bind(router);
    router.bestAdapter = function(msgType = "text") {
      const priority = this._modePriority || ["local","internet","p2p","mesh_mqtt","mesh_local","radio","satellite"];
      for (const id of priority) {
        if (this._disabledAdapters?.has(id)) continue;
        if (this._killSwitch && !this._approvedAdapters?.has(id)) continue;
        const a = this._adapters.get(id);
        if (!a || !a.canSend(msgType)) continue;
        /* Tor special: only if mode allows it AND user enabled it */
        if (id === "tor") {
          if (!_torEnabled) continue;
          if (!TRANSPORT_MODES[_mode].torAllowed && _mode !== "restricted") continue;
        }
        return a;
      }
      return null;
    };

    /* Patch send() to respect kill switch and media block */
    const origSend = router.send.bind(router);
    router.send = async function(message, fromQueue = false) {
      const mediaTypes = ["images","voice","video"];
      const isMedia = mediaTypes.includes(message.type);
      /* Field mode / low-BW: block media */
      if (isMedia && (this._lowBandwidth || TRANSPORT_MODES[_mode]?.blockMedia)) {
        const reason = "Media blocked: " + (_mode === "field" ? "field mode active" : "low-bandwidth mode");
        this.delivery?.update(message.id, "failed", { error: reason });
        throw new Error(reason);
      }
      /* Kill switch: if no approved route, queue immediately */
      if (this._killSwitch && !this.bestAdapter(message.type || "text")) {
        this.delivery?.update(message.id, "queued");
        if (!fromQueue) this.queue?.enqueue(message);
        return { queued: true, reason: "Kill switch: no approved route available" };
      }
      /* Split tunnel: check if this adapter is allowed for this message type */
      if (_splitRules.length) {
        const best = this.bestAdapter(message.type || "text");
        if (best) {
          const rule = _splitRules.find(r => r.adapterId === best.id);
          if (rule && rule.allowedTypes.length && !rule.allowedTypes.includes(message.type || "text")) {
            /* Skip to next adapter */
            this._disabledAdapters = new Set([...(this._disabledAdapters||[]), best.id]);
            const result = await origSend(message, fromQueue);
            this._disabledAdapters.delete(best.id);
            return result;
          }
        }
      }
      return origSend(message, fromQueue);
    };
  }

  /* ── public API ── */
  function setMode(modeId) {
    if (!TRANSPORT_MODES[modeId]) return;
    _mode = modeId;
    _patchRouter();
    _applyMode(modeId);
    _notify();
    window.INCIDENT?.add({ text: `Transport mode changed to: ${TRANSPORT_MODES[modeId].label}`, tag: "manual" });
  }

  function setAdapterEnabled(adapterId, enabled) {
    if (enabled) { _disabledAdapters.delete(adapterId); _approvedAdapters.add(adapterId); }
    else         { _disabledAdapters.add(adapterId); _approvedAdapters.delete(adapterId); }
    if (window.CommsRouter) {
      window.CommsRouter._disabledAdapters = _disabledAdapters;
      window.CommsRouter._approvedAdapters = _approvedAdapters;
    }
    /* Special handling */
    if (adapterId === "tor") {
      _torEnabled = enabled;
      const torA = window.CommsRouter?.getAdapter("tor");
      if (torA) { torA._enabled = enabled; if (enabled) torA.connect(); else torA._setState("offline"); }
    }
    if (adapterId === "local") _lanEnabled = enabled;
    if (adapterId === "mesh_mqtt") _mqttEnabled = enabled;
    if (adapterId === "tunnel")  _tunnelEnabled = enabled;
    if (adapterId === "radio")   _radioEnabled = enabled;
    if (adapterId === "satellite") _satEnabled = enabled;
    _notify();
  }

  function setKillSwitch(on) {
    _killSwitch = on;
    if (window.CommsRouter) window.CommsRouter._killSwitch = on;
    _notify();
  }

  function setIpv6(on) { _ipv6Enabled = on; _notify(); }
  function setIpv6LeakProt(on) { _ipv6LeakProt = on; _notify(); }
  function setCustomDns(primary, secondary) { _customDns = [primary, secondary]; _notify(); }
  function setBlockMediaLowBW(on) { _blockMediaOnLowBW = on; if (window.CommsRouter) window.CommsRouter._blockMediaLowBW = on; _notify(); }

  function addSplitRule(adapterId, allowedTypes) {
    _splitRules = _splitRules.filter(r => r.adapterId !== adapterId);
    if (allowedTypes && allowedTypes.length) _splitRules.push({ adapterId, allowedTypes });
    _notify();
  }
  function clearSplitRules() { _splitRules = []; _notify(); }

  function runLatencyTest() {
    const adapters = window.CommsRouter?.getAll() || [];
    adapters.forEach(a => { if (a.status === "ready") a.connect().catch(() => {}); });
    _notify();
    window.toast?.("Latency test running — refreshing adapter health", "ok");
  }

  function getState() {
    return {
      mode: _mode, modeLabel: TRANSPORT_MODES[_mode]?.label,
      killSwitch: _killSwitch,
      torEnabled: _torEnabled, lanEnabled: _lanEnabled,
      mqttEnabled: _mqttEnabled, tunnelEnabled: _tunnelEnabled,
      radioEnabled: _radioEnabled, satEnabled: _satEnabled,
      meshEnabled: _meshEnabled,
      blockMediaOnLowBW: _blockMediaOnLowBW,
      ipv6Enabled: _ipv6Enabled, ipv6LeakProt: _ipv6LeakProt,
      customDns: _customDns, splitRules: _splitRules,
      disabledAdapters: [..._disabledAdapters],
      approvedAdapters: [..._approvedAdapters],
      lowBandwidth: window.CommsRouter?.isLowBandwidth() ?? false
    };
  }

  function getModes() { return Object.values(TRANSPORT_MODES); }
  function on(fn) { _listeners.push(fn); }

  /* ── init ── */
  setTimeout(() => {
    _patchRouter();
    fetch("config.json").then(r => r.json()).then(cfg => {
      if (cfg.transportMode)  setMode(cfg.transportMode);
      if (cfg.killSwitch)     setKillSwitch(cfg.killSwitch);
      if (cfg.torEnabled)     setAdapterEnabled("tor", true);
      if (cfg.ipv6Enabled !== undefined) setIpv6(cfg.ipv6Enabled);
    }).catch(() => {});
  }, 500);

  return {
    setMode, setAdapterEnabled, setKillSwitch, setIpv6, setIpv6LeakProt,
    setCustomDns, setBlockMediaLowBW, addSplitRule, clearSplitRules,
    runLatencyTest, getState, getModes, on,
    MODES: TRANSPORT_MODES
  };
})();
