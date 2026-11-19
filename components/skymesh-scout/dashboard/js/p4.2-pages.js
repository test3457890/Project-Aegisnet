/* ============================================================
   AegisNet Expansion Layer — p4.2-pages.js
   Adds: Node Status Card, NJ–AZ Test Mode panel,
   Health Check panel, AIS Diagnostics, deployment section.
   Appended to P4 page set. Does not modify existing pages.
   ============================================================ */
"use strict";

/* ── inject node status card into comms dashboard ── */
function injectNodeStatusCard() {
  const pg = document.getElementById("pg-comms"); if (!pg) return;
  // Find the grid container and prepend the status card
  const grid = pg.querySelector("div[style*='grid']"); if (!grid) return;
  // Node status panel
  const card = document.createElement("div");
  card.className = "fPanel";
  card.style.cssText = "grid-column:1/-1";
  card.innerHTML = `
    <h3>NODE STATUS
      <a href="/setup" style="float:right;font-size:10px;color:var(--cyan);text-decoration:none;letter-spacing:.1em">SETUP WIZARD →</a>
    </h3>
    <div class="fbody" id="nodeStatusCard" style="font-size:12px">
      <div style="color:var(--dim)">Loading node identity…</div>
    </div>`;
  grid.insertBefore(card, grid.firstChild);

  // AIS diagnostics panel
  const aisPnl = document.createElement("div");
  aisPnl.className = "fPanel";
  aisPnl.innerHTML = `
    <h3>AIS / MARINE DIAGNOSTICS <span class="badge-exp">EXPERIMENTAL</span></h3>
    <div class="fbody" id="aisDiagPanel" style="font-size:12px">
      <div style="color:var(--dim)">Loading…</div>
    </div>`;
  grid.appendChild(aisPnl);

  // NJ–AZ test panel
  const testPnl = document.createElement("div");
  testPnl.className = "fPanel";
  testPnl.style.cssText = "grid-column:1/-1";
  testPnl.innerHTML = `
    <h3>NJ–AZ BRIDGE TEST MODE</h3>
    <div class="fbody" id="testModePanel" style="font-size:12px">
      <div style="color:var(--dim)">Loading…</div>
    </div>
    <div class="fNote">
      Tests MQTT bridge connectivity between two distant nodes.
      Tracks latency, queueing, retries, and delivery.
      Exports a shareable test log. PROTOTYPE — not a certified test.
    </div>`;
  grid.appendChild(testPnl);

  // Health check panel
  const healthPnl = document.createElement("div");
  healthPnl.className = "fPanel";
  healthPnl.style.cssText = "grid-column:1/-1";
  healthPnl.innerHTML = `
    <h3>NODE HEALTH CHECK</h3>
    <div class="fbody" id="healthPanel" style="font-size:12px">
      <button class="btn" onclick="renderHealthPanel('healthPanel')">RUN HEALTH CHECK</button>
    </div>`;
  grid.appendChild(healthPnl);

  // Deployment notice
  const deployPnl = document.createElement("div");
  deployPnl.className = "fPanel";
  deployPnl.style.cssText = "grid-column:1/-1";
  deployPnl.innerHTML = `
    <h3>DEPLOYMENT</h3>
    <div class="fbody" style="font-size:12px;line-height:1.9;color:var(--dim)">
      <div style="color:var(--txt);margin-bottom:8px">Install a new node on a Raspberry Pi:</div>
      <code style="background:var(--panel2);border:1px solid var(--line);border-radius:3px;padding:8px 12px;display:block;color:var(--cyan);font-size:11.5px;margin-bottom:8px">chmod +x deploy/install.sh && sudo ./deploy/install.sh</code>
      Or, if running from the Pi directly:
      <code style="background:var(--panel2);border:1px solid var(--line);border-radius:3px;padding:8px 12px;display:block;color:var(--cyan);font-size:11.5px;margin-top:6px">curl -fsSL http://your-server/install.sh | sudo bash</code>
      <div style="margin-top:10px;color:var(--amber);font-size:11px;line-height:1.6">
        ⚠ Property owners must understand what this node does before installing.<br>
        See README.md, the setup wizard, and the docs/ folder.
      </div>
    </div>
    <div class="fNote">
      After install: open the Setup Wizard, configure MQTT and tracking, plug in Meshtastic node.
      See docs/pi-image-prep.md for pre-baked image preparation.
    </div>`;
  grid.appendChild(deployPnl);

  // Initial renders
  renderNodeStatusCard();
  setTimeout(() => {
    renderTestPanel();
    renderAISDiagnostics("aisDiagPanel");
  }, 600);
}

/* ── PWA setup ── */
function setupPWA() {
  // Register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").then(reg => {
      console.info("[PWA] Service worker registered:", reg.scope);
    }).catch(e => console.warn("[PWA] SW registration failed:", e));
  }
  // Handle ?page= query param for PWA shortcuts
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  if (page && document.getElementById("pg-" + page)) {
    setTimeout(() => window.setMode?.(page), 200);
  }
  // Notification permission placeholder
  if ("Notification" in window && Notification.permission === "default") {
    // Don't request automatically — show UI hint instead
    const notifHint = document.createElement("div");
    notifHint.id = "notifHint";
    notifHint.style.cssText = "position:fixed;bottom:70px;right:16px;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:10px 14px;font-size:12px;color:var(--dim);z-index:99;display:none";
    notifHint.innerHTML = `Enable notifications for aircraft alerts? <button style="margin-left:8px;font-family:var(--mono);font-size:11px;background:none;border:1px solid var(--cyan-dim);color:var(--cyan);padding:3px 8px;border-radius:2px;cursor:pointer" onclick="Notification.requestPermission().then(()=>document.getElementById('notifHint').remove())">ENABLE</button> <button style="margin-left:4px;font-family:var(--mono);font-size:11px;background:none;border:1px solid var(--line);color:var(--dim);padding:3px 8px;border-radius:2px;cursor:pointer" onclick="document.getElementById('notifHint').remove()">DISMISS</button>`;
    document.body.appendChild(notifHint);
    // Show after 8 seconds on first visit
    if (!localStorage.getItem("aegisnet_notif_dismissed")) {
      setTimeout(() => { notifHint.style.display = ""; }, 8000);
      notifHint.querySelector("button:last-child").addEventListener("click", () => {
        localStorage.setItem("aegisnet_notif_dismissed", "1");
      });
    }
  }
}

/* ── mobile nav improvements ── */
function setupMobileNav() {
  // Bottom nav bar for mobile (portrait)
  const mobileNav = document.createElement("div");
  mobileNav.id = "mobileNav";
  mobileNav.style.cssText = "display:none;position:fixed;bottom:0;left:0;right:0;background:var(--panel2);border-top:1px solid var(--line);z-index:100;padding:0 4px";
  mobileNav.innerHTML = `
    <div style="display:flex;justify-content:space-around;padding:6px 0">
      ${[["aircraft","✈"],["ships","⛵"],["comms","📡"],["field","⚠"],["chat","💬"]].map(([p,i])=>
        `<button onclick="setMode('${p}')" style="background:none;border:none;color:var(--dim);font-size:20px;padding:6px 10px;cursor:pointer;border-radius:4px" title="${p}">${i}</button>`
      ).join("")}
    </div>`;
  document.body.appendChild(mobileNav);

  const mq = window.matchMedia("(max-width: 480px)");
  const toggle = () => {
    mobileNav.style.display = mq.matches ? "" : "none";
    if (mq.matches) {
      // Shrink sidebar on mobile
      const sidebar = document.getElementById("sidebar");
      if (sidebar) sidebar.style.display = "none";
      const pages = document.getElementById("pages");
      if (pages) pages.style.paddingBottom = "60px";
    }
  };
  mq.addEventListener("change", toggle);
  toggle();
}

/* ── periodic refresh of new panels ── */
setInterval(() => {
  renderNodeStatusCard();
  renderAISDiagnostics("aisDiagPanel");
  renderTestPanel();
}, 10000);

/* ── init ── */
setTimeout(() => {
  injectNodeStatusCard();
  setupPWA();
  setupMobileNav();
}, 800);
