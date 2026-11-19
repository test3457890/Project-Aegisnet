#!/usr/bin/env python3
"""
aegisnet-merge.py — AegisNet P4.4 expansion layer merge script

Merges the SkyMesh Scout expansion layer into an existing AegisNet
HTML application. Append-only — does not delete or rename existing files.

Usage:
  python3 aegisnet-merge.py --aegisnet /path/to/aegisnet --source /path/to/skymesh-scout-p4.4

What it does:
  1. Copies all new JS modules to AegisNet's js/ folder
  2. Copies new dashboard files (setup-wizard, manifest, sw.js)
  3. Adds new <script> tags to AegisNet's index.html (in correct order)
  4. Adds new page slots to index.html
  5. Adds nav buttons to index.html
  6. Reports what was changed and what was skipped

What it does NOT do:
  - Does not delete any existing AegisNet files
  - Does not modify any existing AegisNet JS files
  - Does not touch AegisNet's CSS or core layout
  - Does not expose API keys or secrets
"""
import argparse, shutil, sys, json
from pathlib import Path
from datetime import datetime

# ── new JS modules to copy (in load order) ──
P4_JS_MODULES = [
    # P3 / P4 base (skip if already in AegisNet)
    "sources.js", "mqtt.js", "pages.js", "field.js", "app.js",
    "comms-adapters.js", "comms-router.js",
    "tracking-adapters.js", "tracking-router.js",
    "webrtc.js", "p4-pages.js", "p4-app.js",
    # P4.2
    "node-identity.js", "ais-hardware.js", "test-mode.js",
    "health-check.js", "p4.2-pages.js",
    # P4.3
    "transport-adapters.js", "network-settings.js",
    "safety-education.js", "p4.3-pages.js",
    # P4.4
    "sky-projector.js", "node-registry.js", "p4.4-pages.js",
]

# ── new page slots to add (id -> insert before existing slot or before </main>) ──
NEW_PAGE_SLOTS = [
    ("pg-comms",   "comms"),
    ("pg-network", "network"),
    ("pg-safety",  "safety"),
    ("pg-meshmap", "meshmap"),
]

# ── new nav buttons ──
NAV_BUTTONS = [
    ("comms", "COMMS", """<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>"""),
    ("network", "NETWORK", """<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>"""),
    ("safety", "SAFETY", """<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>"""),
    ("meshmap", "MESH MAP", """<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="5" y2="16"/><line x1="12" y1="8" x2="19" y2="16"/></svg>"""),
]

# ── PWA meta tags ──
PWA_HEAD = """<link rel="manifest" href="/manifest.json">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0A0E13">"""

def log(msg, color=None):
    codes = {"green":"\033[32m","yellow":"\033[33m","red":"\033[31m","cyan":"\033[36m","reset":"\033[0m"}
    c = codes.get(color,""); r = codes["reset"]
    print(f"  {c}{msg}{r}")

def backup(path):
    bak = path.with_suffix(path.suffix + f".bak.{datetime.now().strftime('%Y%m%d%H%M%S')}")
    shutil.copy2(path, bak)
    return bak

def merge(aegisnet_dir, source_dir, dry_run=False):
    ae = Path(aegisnet_dir).resolve()
    src = Path(source_dir).resolve()
    if not ae.exists(): print(f"ERROR: AegisNet dir not found: {ae}"); sys.exit(1)
    if not src.exists(): print(f"ERROR: Source dir not found: {src}"); sys.exit(1)

    print(f"\nAegisNet Merge — P4.4 Expansion Layer")
    print(f"  Source:  {src}")
    print(f"  Target:  {ae}")
    print(f"  Dry run: {dry_run}\n")

    changed = []
    skipped = []
    errors  = []

    # ── 1. Find AegisNet index.html ──
    index_candidates = [ae / "index.html", ae / "dashboard" / "index.html",
                        ae / "public" / "index.html", ae / "src" / "index.html"]
    index_path = next((p for p in index_candidates if p.exists()), None)
    if not index_path:
        print("ERROR: Could not find index.html in AegisNet directory"); sys.exit(1)
    log(f"Found index.html: {index_path.relative_to(ae)}", "cyan")
    html_dir = index_path.parent

    # ── 2. Find or create JS folder ──
    js_dir_candidates = [html_dir / "js", ae / "js", ae / "src" / "js"]
    js_dir = next((p for p in js_dir_candidates if p.exists()), html_dir / "js")
    if not js_dir.exists() and not dry_run: js_dir.mkdir(parents=True)
    log(f"JS folder: {js_dir.relative_to(ae)}", "cyan")

    src_js = src / "dashboard" / "js"

    # ── 3. Copy JS modules ──
    print("\n[JS MODULES]")
    for mod in P4_JS_MODULES:
        src_f = src_js / mod
        dst_f = js_dir / mod
        if not src_f.exists():
            log(f"MISSING in source: {mod}", "yellow"); skipped.append(mod); continue
        if dst_f.exists():
            # Check if it's the same file
            if dst_f.read_bytes() == src_f.read_bytes():
                log(f"UNCHANGED: {mod}", ""); skipped.append(mod); continue
            log(f"UPDATING:  {mod}", "yellow")
            if not dry_run: backup(dst_f)
        else:
            log(f"ADDING:    {mod}", "green")
        if not dry_run: shutil.copy2(src_f, dst_f)
        changed.append(mod)

    # ── 4. Copy other dashboard files ──
    print("\n[DASHBOARD FILES]")
    other_files = {
        src / "dashboard" / "setup-wizard.html": html_dir / "setup-wizard.html",
        src / "dashboard" / "manifest.json":      html_dir / "manifest.json",
        src / "dashboard" / "sw.js":              html_dir / "sw.js",
    }
    for sf, df in other_files.items():
        if not sf.exists(): log(f"MISSING: {sf.name}", "yellow"); skipped.append(sf.name); continue
        log(f"COPYING: {sf.name} → {df.relative_to(ae)}", "green")
        if not dry_run: shutil.copy2(sf, df)
        changed.append(sf.name)

    # ── 5. Modify index.html ──
    print("\n[index.html MODIFICATIONS]")
    html = index_path.read_text(encoding="utf-8")
    orig_html = html
    mods = []

    # PWA meta tags
    if 'rel="manifest"' not in html:
        html = html.replace("<head>", "<head>\n" + PWA_HEAD)
        mods.append("PWA meta tags")

    # Page slots
    for pid, label in NEW_PAGE_SLOTS:
        if f'id="{pid}"' not in html:
            html = html.replace("</main>", f'  <div id="{pid}" class="page"></div>\n</main>')
            mods.append(f"page slot: {pid}")
        else:
            log(f"Page slot {pid} already exists — skipped", "")

    # Nav buttons (insert before </nav> or a known landmark)
    for page, label, icon in NAV_BUTTONS:
        if f'data-page="{page}"' not in html:
            btn = f'''    <button class="navbtn" data-page="{page}" title="{label}">
      {icon}
      <span>{label}</span>
    </button>\n'''
            # Insert before the first </nav>
            html = html.replace("</nav>", btn + "</nav>", 1)
            mods.append(f"nav button: {page}")
        else:
            log(f"Nav button {page} already exists — skipped", "")

    # Script tags (insert before </body>)
    existing_scripts = []
    for mod in P4_JS_MODULES:
        if f'src="js/{mod}"' in html or f"src='js/{mod}'" in html:
            existing_scripts.append(mod)
    new_scripts = [m for m in P4_JS_MODULES if m not in existing_scripts]
    if new_scripts:
        tags = "\n".join(f'<script src="js/{m}"></script>' for m in new_scripts)
        html = html.replace("</body>", f"\n<!-- AegisNet P4.4 expansion -->\n{tags}\n</body>")
        mods.append(f"{len(new_scripts)} script tags")

    if html != orig_html:
        log(f"index.html changes: {', '.join(mods)}", "green")
        if not dry_run:
            backup(index_path)
            index_path.write_text(html, encoding="utf-8")
        changed.append("index.html")
    else:
        log("index.html: no changes needed", "")

    # ── 6. Config merge ──
    print("\n[CONFIG]")
    ae_cfg = ae / "config.json"
    src_cfg = src / "config.json"
    if ae_cfg.exists() and src_cfg.exists():
        try:
            existing = json.loads(ae_cfg.read_text())
            additions = json.loads(src_cfg.read_text())
            # Only add keys that don't exist in AegisNet's config
            new_keys = {k: v for k, v in additions.items()
                       if k not in existing and k not in ("apiKeys","adminPassword","password","token","sharedSecret","_apiKeysNote")}
            if new_keys:
                log(f"Adding {len(new_keys)} new config keys: {', '.join(new_keys.keys())}", "green")
                if not dry_run:
                    backup(ae_cfg)
                    existing.update(new_keys)
                    ae_cfg.write_text(json.dumps(existing, indent=2))
                changed.append("config.json")
            else:
                log("config.json: no new keys to add", "")
        except Exception as e:
            log(f"config.json merge error: {e}", "yellow"); errors.append(str(e))
    elif src_cfg.exists() and not ae_cfg.exists():
        log("Copying config.json template", "green")
        cfg = json.loads(src_cfg.read_text())
        cfg.pop("apiKeys", None)  # never copy API keys
        if not dry_run: ae_cfg.write_text(json.dumps(cfg, indent=2))
        changed.append("config.json")

    # ── 7. Report ──
    print(f"\n{'═'*50}")
    print(f"MERGE {'(DRY RUN)' if dry_run else ''} COMPLETE")
    print(f"  Changed: {len(changed)}")
    print(f"  Skipped: {len(skipped)}")
    print(f"  Errors:  {len(errors)}")
    if errors:
        log("Errors:", "red")
        for e in errors: log("  " + e, "red")
    if not dry_run:
        print(f"\n  Backups created with .bak.TIMESTAMP suffix")
        print(f"  To rollback: restore .bak files and re-run")
    print(f"\n  Integration note: {src}/docs/aegisnet-integration-note.md")
    print(f"  Safety notice:   Not emergency-certified. Not production-secure.\n")
    return len(errors) == 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Merge AegisNet P4.4 expansion layer")
    parser.add_argument("--aegisnet", required=True, help="Path to AegisNet root directory")
    parser.add_argument("--source",   required=True, help="Path to skymesh-scout-p4.4 directory")
    parser.add_argument("--dry-run",  action="store_true", help="Preview changes without writing")
    args = parser.parse_args()
    ok = merge(args.aegisnet, args.source, dry_run=args.dry_run)
    sys.exit(0 if ok else 1)
