#!/usr/bin/env python3
"""
server.py — SkyMesh Scout P2 local web server
Serves multi-file dashboard, proxies aircraft.json, mesh API endpoint.
stdlib only — no framework needed on Pi OS Lite.
"""
import json, mimetypes, os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT  = Path(__file__).resolve().parent.parent
DASH  = ROOT / "dashboard"
CFG_PATH = Path(os.environ.get('SKYMESH_CONFIG', ROOT / 'config.json'))
CFG = json.loads(CFG_PATH.read_text()) if CFG_PATH.exists() else {}
AIRCRAFT_JSON = Path(CFG.get("aircraftJson", "/run/readsb/aircraft.json"))

_iface = None
def mesh():
    global _iface
    if _iface is None:
        import meshtastic.serial_interface
        _iface = meshtastic.serial_interface.SerialInterface(devPath=CFG.get("serialDev"))
    return _iface

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, body, ct="application/json"):
        try:
            self.send_response(code)
            self.send_header("Content-Type", ct)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body if isinstance(body, bytes) else body.encode())
        except (BrokenPipeError, ConnectionResetError):
            pass  # Client disconnected before response completed — safe to ignore
    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/data/aircraft.json":
            try:   return self._send(200, AIRCRAFT_JSON.read_bytes())
            except: return self._send(404, '{"error":"no local receiver"}')
        if path == "/config.json":
            safe = {k: v for k, v in CFG.items() if k not in ("apiKeys", "adminPassword", "sharedSecret", "password", "token")}
            return self._send(200, json.dumps(safe))
        if path in ("/", ""): path = "/index.html"
        f = (DASH / path.lstrip("/")).resolve()
        if DASH in f.parents and f.is_file():
            ct = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
            return self._send(200, f.read_bytes(), ct)

        if path == "/api/tor/status":
            return self._send(200, json.dumps({"running": False, "note": "Tor daemon not installed on this node. Install tor package to enable."}))
        if path == "/api/tor/send":
            return self._send(503, json.dumps({"sent": False, "error": "Tor not running"}))
        if path == "/api/tunnel/status":
            return self._send(200, json.dumps({"connected": False, "peers": 0, "localIp": None, "subnetRouting": False, "note": "No tunnel configured"}))
        if path == "/api/tunnel/send":
            return self._send(503, json.dumps({"sent": False, "error": "Tunnel not connected"}))
        # P4.2 routes
        p42 = self._p42_routes(path)
        if p42 is not None: return p42
        self._send(404, '{"error":"not found"}')

    # P4.2 new endpoints
    def _p42_routes(self, path):
        if path == "/api/ping":
            return self._send(200, '{"ok":true}')
        if path == "/setup":
            f = (DASH / "setup-wizard.html").resolve()
            if f.is_file(): return self._send(200, f.read_bytes(), "text/html")
            return self._send(404, '{"error":"setup wizard not found"}')
        if path == "/sw.js":
            f = (DASH / "sw.js").resolve()
            if f.is_file(): return self._send(200, f.read_bytes(), "text/javascript")
            return self._send(404, '{"error":"sw not found"}')
        if path == "/manifest.json":
            f = (DASH / "manifest.json").resolve()
            if f.is_file(): return self._send(200, f.read_bytes(), "application/manifest+json")
            return self._send(404, '{"error":"manifest not found"}')
        if path == "/api/ais/vessels":
            # Server-side AIS API proxy placeholder - key held server-side
            return self._send(200, '{"vessels":[],"note":"AIS API placeholder"}')
        if path == "/api/ais/local":
            # TCP bridge to local AIS decoder placeholder
            return self._send(200, '{"vessels":[],"packetCount":0,"note":"AIS local decoder placeholder"}')
        if path == "/api/health/disk":
            import shutil
            usage = shutil.disk_usage("/opt")
            free_mb = usage.free // (1024*1024)
            return self._send(200, json.dumps({"ok": free_mb > 512, "freeMB": free_mb}))
        if path == "/api/health/services":
            import subprocess
            svcs = ["aegisnet-dashboard", "aegisnet-adsb-bridge"]
            results = {}
            for s in svcs:
                try:
                    r = subprocess.run(["systemctl","is-active",s], capture_output=True, text=True, timeout=3)
                    results[s] = r.stdout.strip()
                except Exception:
                    results[s] = "unknown"
            summary = ", ".join(f"{k}:{v}" for k,v in results.items())
            return self._send(200, json.dumps({"ok": True, "summary": summary, "services": results}))
        return None

    def do_POST(self):
        if self.path == "/api/mesh/send":
            if os.environ.get("SKYMESH_ENABLE_RADIO") != "1":
                return self._send(503, '{"sent":false,"error":"Radio output is disabled"}')
            text = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode()[:120]
            try:   mesh().sendText(text); return self._send(200, '{"sent":true}')
            except Exception as e: return self._send(503, json.dumps({"sent":False,"error":str(e)}))
        if self.path == "/api/config/save":
            import secrets as _sec
            body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            try:
                incoming = json.loads(body)
                # Never accept apiKeys, passwords, or tokens from frontend
                for bad in ("apiKeys","adminPassword","sharedSecret","password","token"):
                    incoming.pop(bad, None)
                existing = json.loads(CFG_PATH.read_text()) if CFG_PATH.exists() else {}
                existing.update(incoming)
                if not existing.get("nodeId"):
                    existing["nodeId"] = "aegis-" + _sec.token_hex(4)
                CFG_PATH.write_text(json.dumps(existing, indent=2))
                return self._send(200, '{"saved":true}')
            except Exception as e:
                return self._send(400, json.dumps({"saved":False,"error":str(e)}))
        self._send(404, '{"error":"not found"}')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"SkyMesh Scout available at http://127.0.0.1:{port}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
