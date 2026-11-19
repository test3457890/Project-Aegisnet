/* ============================================================
   AegisNet P4.3 — safety-education.js
   In-app safety education, contextual warnings, and
   anti-phishing reminders. AegisNet's own voice and wording.
   No proprietary branding, icons, or wording copied from
   other apps. Critical warnings cannot be permanently hidden.
   ============================================================ */
"use strict";

/* ══════════════════════════════════════════════
   SAFETY SETTINGS (configurable)
══════════════════════════════════════════════ */
window.SafetySettings = {
  showReminders:       true,
  showBeginnerTips:    true,
  showAdvancedWarnings:true,
  showAdminWarnings:   true,
  showNodeOwnerWarnings:true,
  _dismissed: new Set(),   // non-critical tips the user has closed

  load() {
    try {
      const d = JSON.parse(localStorage.getItem("aegisnet_safety") || "{}");
      this.showReminders        = d.showReminders        ?? true;
      this.showBeginnerTips     = d.showBeginnerTips     ?? true;
      this.showAdvancedWarnings = d.showAdvancedWarnings ?? true;
      this.showAdminWarnings    = d.showAdminWarnings    ?? true;
      this.showNodeOwnerWarnings= d.showNodeOwnerWarnings?? true;
      this._dismissed = new Set(d.dismissed || []);
    } catch {}
  },
  save() {
    localStorage.setItem("aegisnet_safety", JSON.stringify({
      showReminders:        this.showReminders,
      showBeginnerTips:     this.showBeginnerTips,
      showAdvancedWarnings: this.showAdvancedWarnings,
      showAdminWarnings:    this.showAdminWarnings,
      showNodeOwnerWarnings:this.showNodeOwnerWarnings,
      dismissed: [...this._dismissed]
    }));
  },
  dismiss(id) { this._dismissed.add(id); this.save(); },
  isDismissed(id) { return this._dismissed.has(id); },
  reset() { this._dismissed.clear(); this.save(); }
};
SafetySettings.load();

/* ══════════════════════════════════════════════
   SAFETY MESSAGE LIBRARY
   AegisNet's own voice. Not copied from other apps.
══════════════════════════════════════════════ */
const SAFETY_MESSAGES = {
  /* ── never ask ── */
  neverAsk: {
    id: "never_ask",
    critical: true,
    text: "AegisNet will never ask for your password, verification code, PIN, recovery key, private key, or shared secret in a chat message or support request.",
    icon: "🔒"
  },
  noSecretsInChat: {
    id: "no_secrets_chat",
    critical: true,
    text: "Never send a verification code, recovery key, API token, private config file, or shared secret to anyone — including messages that appear to be from AegisNet staff or administrators.",
    icon: "🛑"
  },
  fakeSupportWarning: {
    id: "fake_support",
    critical: false,
    text: "Be careful with messages claiming to be from support, administrators, or automated security systems. Verify through a second trusted channel before taking action.",
    icon: "⚠️"
  },
  urgencyWarning: {
    id: "urgency_warning",
    critical: false,
    text: "If a message pressures you to act quickly, move money, install software, share a code, or bypass normal approval steps — treat it as suspicious and stop.",
    icon: "⚠️"
  },
  linkWarning: {
    id: "link_warning",
    critical: false,
    text: "Do not trust links just because they appear inside a message from a contact. Verify the destination before clicking.",
    icon: "🔗"
  },
  verificationCode: {
    id: "verification_code",
    critical: true,
    text: "Never share a verification code with anyone, even if they claim to be a friend, administrator, or support agent.",
    icon: "🔢"
  },
  recoveryKey: {
    id: "recovery_key",
    critical: true,
    text: "Recovery keys are for your use only. Anyone who asks for your recovery key is attempting to take control of your account or node.",
    icon: "🗝️"
  },
  apiKeyWarning: {
    id: "api_key_warning",
    critical: true,
    text: "Store API keys only in approved local config areas. Never paste them into chats, frontend guest config, or screenshots.",
    icon: "🔑"
  },
  /* ── network settings specific ── */
  remoteAccessWarning: {
    id: "remote_access",
    critical: true,
    text: "Remote access can expose this node to outside networks if misconfigured. Only enable it if you understand the risk and have configured authentication.",
    icon: "🌐"
  },
  torWarning: {
    id: "tor_fallback",
    critical: true,
    text: "Tor fallback is optional, may be slower or unstable, and is not an anonymity guarantee. It does not route voice, video, or large media. Not intended for low-latency operations.",
    icon: "🧅"
  },
  customDnsWarning: {
    id: "custom_dns",
    critical: false,
    text: "Only use DNS servers you trust. Custom DNS settings affect all network lookups made by this node.",
    icon: "🔍"
  },
  portForwardingWarning: {
    id: "port_forwarding",
    critical: true,
    text: "Port forwarding can expose this node to outside networks if misconfigured. Review your router and firewall settings carefully.",
    icon: "📡"
  },
  mqttWarning: {
    id: "mqtt_broker",
    critical: false,
    text: "Make sure your MQTT broker, topic, and credentials are configured safely. Use authentication and TLS where possible.",
    icon: "📨"
  },
  fileShareWarning: {
    id: "file_share",
    critical: false,
    text: "Do not open files or follow links from contacts you do not trust. Media and files can carry malware.",
    icon: "📁"
  },
  nodeTransparency: {
    id: "node_transparency",
    critical: true,
    text: "Property owners must understand what services are enabled on this node before it is installed. Do not hide network services, Tor fallback, MQTT routing, or radio fallback from the owner.",
    icon: "🏠"
  },
  killSwitchInfo: {
    id: "kill_switch_info",
    critical: false,
    text: "Kill switch mode queues messages instead of sending through blocked routes. Messages will retry when an approved route becomes available.",
    icon: "🔐"
  },
  lowBandwidthInfo: {
    id: "low_bw_info",
    critical: false,
    text: "AegisNet will keep messages small and hold back images, voice, and video until a better route is available.",
    icon: "📶"
  },
  screenshotWarning: {
    id: "screenshot_warning",
    critical: false,
    text: "Avoid sharing screenshots that reveal API keys, broker credentials, tokens, private URLs, recovery keys, or shared secrets.",
    icon: "📸"
  },
  /* ── friendly release-note style messages ── */
  lowBwActive: {
    id: "rn_lowbw_active",
    critical: false,
    releaseNote: true,
    text: "Low-bandwidth mode is active. AegisNet is keeping messages small and holding back larger media until a better route is available."
  },
  routeTextOnly: {
    id: "rn_route_text_only",
    critical: false,
    releaseNote: true,
    text: "This route supports text and check-ins, but not voice or video."
  },
  messageQueued: {
    id: "rn_message_queued",
    critical: false,
    releaseNote: true,
    text: "Your message was queued because no approved route is currently available. It will retry automatically."
  },
  nodeOnlineDelayed: {
    id: "rn_node_online_delayed",
    critical: false,
    releaseNote: true,
    text: "This node is online, but some tracking sources are delayed or simulated."
  },
  torTextOnly: {
    id: "rn_tor_text_only",
    critical: false,
    releaseNote: true,
    text: "Tor fallback is available for text and status traffic, but media will stay blocked on that route."
  },
  tunnelReady: {
    id: "rn_tunnel_ready",
    critical: false,
    releaseNote: true,
    text: "Private tunnel support is ready for future setup, but still requires owner configuration."
  }
};
window.SAFETY_MESSAGES = SAFETY_MESSAGES;

/* ══════════════════════════════════════════════
   CONTEXTUAL WARNING RENDERER
   Shows a warning banner in a given container.
   Critical warnings cannot be dismissed permanently.
══════════════════════════════════════════════ */
window.showSafetyWarning = function(msgKey, containerId, opts = {}) {
  if (!SafetySettings.showReminders && !opts.force) return;
  const msg = SAFETY_MESSAGES[msgKey]; if (!msg) return;
  if (!msg.critical && SafetySettings.isDismissed(msg.id) && !opts.force) return;
  const el = document.getElementById(containerId); if (!el) return;

  const existing = el.querySelector(`[data-safety="${msg.id}"]`);
  if (existing) return;  // already shown

  const div = document.createElement("div");
  div.dataset.safety = msg.id;
  div.style.cssText = `
    display:flex;align-items:flex-start;gap:10px;
    border:1px solid ${msg.critical ? "var(--amber-dim)" : "var(--line)"};
    border-radius:4px;
    background:${msg.critical ? "#120e00" : "var(--panel2)"};
    padding:10px 12px;margin:8px 0;font-size:11.5px;
    color:${msg.critical ? "var(--amber)" : "var(--dim)"};line-height:1.6;
  `;
  div.innerHTML = `
    <span style="font-size:16px;flex-shrink:0;margin-top:1px">${msg.icon || "ℹ️"}</span>
    <div style="flex:1">${msg.text}</div>
    ${!msg.critical ? `<button onclick="SafetySettings.dismiss('${msg.id}');this.closest('[data-safety]').remove()" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:14px;flex-shrink:0;padding:0 4px" title="Dismiss">×</button>` : ""}
  `;
  el.insertBefore(div, el.firstChild);
};

/* ══════════════════════════════════════════════
   RELEASE-NOTE STYLE TOAST
══════════════════════════════════════════════ */
window.showReleaseNote = function(msgKey) {
  const msg = SAFETY_MESSAGES[msgKey];
  if (!msg || !msg.releaseNote) return;
  window.toast?.(msg.text);
};

/* ══════════════════════════════════════════════
   SAFETY TIPS PANEL RENDERER
   Renders into a container by ID.
══════════════════════════════════════════════ */
window.renderSafetyPanel = function(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  const tips = [
    { cat: "WHAT AEGISNET WILL NEVER DO", items: [
      "Ask for your password, PIN, verification code, or recovery key in chat",
      "Send automated security alerts demanding immediate action",
      "Ask you to bypass normal approval steps or share config secrets",
      "Request payment, gift cards, or wire transfers through the app"
    ]},
    { cat: "PHISHING AND FAKE MESSAGES", items: [
      "If a message claims to be from AegisNet staff but asks for secrets — it is not from AegisNet",
      "Verify unusual requests through a second channel you already trust",
      "Urgency and pressure are classic social engineering tactics — slow down",
      "Links inside messages can go to fake sites even if the text looks legitimate"
    ]},
    { cat: "SECRETS AND KEYS", items: [
      "Recovery keys, API tokens, and shared secrets are for your use only",
      "Never paste secrets into chats, guest config pages, or screenshots",
      "API keys stored in config.secrets.json never appear in the frontend",
      "If you think a key is compromised, rotate it immediately"
    ]},
    { cat: "NODE AND NETWORK SAFETY", items: [
      "Property owners must understand what this node does before installation",
      "Remote access, port forwarding, and Tor fallback increase exposure if misconfigured",
      "Never enable services you do not understand or have not reviewed",
      "Kill switch mode queues messages instead of using unapproved routes"
    ]},
    { cat: "FILE AND MEDIA SHARING", items: [
      "Do not open files or links from contacts you do not trust",
      "Avoid sharing screenshots that reveal keys, tokens, or private URLs",
      "Media blocked in field mode and low-bandwidth mode by design — not a bug"
    ]},
    { cat: "IF SOMETHING SEEMS WRONG", items: [
      "Stop, do not act on the request, and verify through a second channel",
      "Report suspicious messages to your team or node operator",
      "Check your node health and support bundle for unexpected changes",
      "Rotate any credentials you think may have been exposed"
    ]}
  ];

  el.innerHTML = `
    <div style="font-size:11px;color:var(--dim);letter-spacing:.12em;margin-bottom:14px;line-height:1.6">
      This safety information is built into AegisNet to help protect users from phishing,
      social engineering, impersonation, and unsafe network configuration.
      AegisNet uses its own voice and wording — nothing here is copied from other apps.
    </div>
    ${tips.map(section => `
      <div style="margin-bottom:16px">
        <div style="font-family:var(--disp);font-weight:600;font-size:11px;letter-spacing:.2em;color:var(--cyan);margin-bottom:8px">${section.cat}</div>
        ${section.items.map(item => `
          <div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid var(--panel2);font-size:12px;line-height:1.6;color:var(--txt)">
            <span style="color:var(--cyan);flex-shrink:0;margin-top:2px">·</span>
            <span>${item}</span>
          </div>`).join("")}
      </div>`).join("")}
    <div style="border:1px solid var(--amber-dim);border-radius:4px;background:#120e00;padding:10px 12px;color:var(--amber);font-size:11px;line-height:1.7;margin-top:8px">
      🔒 Critical warnings (remote access, port forwarding, recovery codes, API keys, Tor fallback, MQTT credentials, public node visibility) cannot be permanently dismissed. They will reappear when those settings are accessed.
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" onclick="SafetySettings.reset();renderSafetyPanel('${containerId}');toast('Safety tip history cleared','ok')">Reset dismissed tips</button>
      <button class="btn" onclick="SafetySettings.showBeginnerTips=!SafetySettings.showBeginnerTips;SafetySettings.save();toast(SafetySettings.showBeginnerTips?'Beginner tips on':'Beginner tips hidden')">Toggle beginner tips</button>
    </div>`;
};

/* ══════════════════════════════════════════════
   AUTO-WIRE CONTEXTUAL WARNINGS
   Called once the pages are built.
══════════════════════════════════════════════ */
window.wireContextualWarnings = function() {
  /* Chat page */
  const chatMsgs = document.getElementById("chatMsgs");
  if (chatMsgs && !chatMsgs.dataset.safetyWired) {
    chatMsgs.dataset.safetyWired = "1";
    const banner = document.createElement("div");
    banner.id = "chatSafetyBanner";
    banner.style.cssText = "padding:6px 12px";
    chatMsgs.parentElement?.insertBefore(banner, chatMsgs);
    showSafetyWarning("neverAsk", "chatSafetyBanner");
    showSafetyWarning("fakeSupportWarning", "chatSafetyBanner");
  }
};

/* Wire on load */
setTimeout(window.wireContextualWarnings, 1200);
